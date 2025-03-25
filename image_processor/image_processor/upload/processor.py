from logging import Logger
from pymongo.database import Database, Collection
from bson import ObjectId
from redis import Redis
from core.gcp import GCPStorageManager
from typing import TypedDict
from datetime import datetime
import pandas
from concurrent.futures import ThreadPoolExecutor
from multiprocessing import Value
from threading import Lock
from uuid import uuid4
from PIL import Image
from io import BytesIO
import requests
from pathlib import Path
import os


class UploadSchema(TypedDict):
    oFileName: str
    fileName: str
    status: str
    progress: float
    webhookUrl: str
    createdAt: datetime
    updatedAt: datetime


class ProcessUploadId:
    """
    This class will process the upload id and do all the processing for the given upload id.
    It will do following things:
    1. Download the original csv file from gcs
    2. Transform the csv file to flatten format
    3. Process each image in the flatten csv file(this processing will be done in parallel for multiple images)
        a. Download the image
        b. Process the image
        c. Upload the processed image to gcs
    4. Inverse transform the csv file to original format
    5. Upload the processed csv file to gcs
    6. Update the status in redis
    7. Update the status in mongo
    8. Send webhook if webhook url is present
    9. Delete the upload id from redis
    """

    def __init__(self, logr: Logger, mongo_db_client: Database, redis_client: Redis, gcp_bucket_mgr: GCPStorageManager):

        # add services in object instance
        self.logr = logr
        self.mongo_db_client = mongo_db_client
        self.upload_collection: Collection[UploadSchema] = mongo_db_client.get_collection("uploads")
        self.redis_client = redis_client
        self.gcp_bucket_mgr = gcp_bucket_mgr

    def start_processing(self, upload_id: str):
        """ This will start processing  for the given upload id """
        self.upload_id = upload_id
        try:
            self._process()
        except Exception as e:
            # do not raise error
            self.logr.exception(e)

    def _process(self):
        # find the uploadId from Database
        upload_doc = self.upload_collection.find_one({"_id": ObjectId(self.upload_id)})
        if upload_doc is None:
            raise Exception(f"Upload with id {self.upload_id} not found")

        # update the progress in redis
        self.update_status_in_redis("in_progess", 10)

        # download the original parsed data of csv file from gcs in dataframe format
        original_data = self._get_original_data(upload_doc)

        # this will flatten the CSV for multiple images in single row to single image in one row
        original_data_flatten = self._transform_csv(original_data)

        # update the progress in redis
        self.update_status_in_redis("in_progess", 20)

        # this will do the actual processing of images in parallel via multi-threading
        processed_data_flatten = self._process_images_async(original_data_flatten)

        # update the progress in redis
        self.update_status_in_redis("in_progess", 80)

        # this will againg convert CSV struture from single image in one row to multiple images in single row
        processed_data: pandas.DataFrame = self._inverse_transform_csv(processed_data_flatten)

        # save the final file to GCP cloud storage
        self._save_processed_data_to_gcs(processed_data, upload_doc)

        # update the progress in redis
        self.update_status_in_redis("in_progess", 99)

        # finally update the database
        self.upload_collection.find_one_and_update(
            {"_id": ObjectId(self.upload_id)},
            {"$set": {"status": "completed", "progress": 100, "updatedAt": datetime.now()}}
        )

        # delete the key from redis, as upload is completed, & user can get the actual upload status
        self.redis_client.delete(self.upload_id)

        # send the event to pub/sub is webhook url is there
        if upload_doc["webhookUrl"] is not None:
            self.redis_client.publish("webhook", f"{upload_doc['_id']}|||{upload_doc['webhookUrl']}")

    def _get_original_data(self, upload_doc: UploadSchema) -> pandas.DataFrame:
        """
        This will download the original csv file from gcs 
        parse the CSV to build dataframe
        and delete the file from local storage
        """

        original_file_path = self.gcp_bucket_mgr.download_csv(filename=upload_doc["fileName"])

        original_data = pandas.read_csv(original_file_path)

        try:
            Path(original_file_path).unlink()
        except Exception as e:
            # do not raise error for this
            self.logger.error(f"Error in deleting file: {original_file_path}"+e)

        return original_data

    def _transform_csv(self, df: pandas.DataFrame) -> pandas.DataFrame:
        """
        This will transform the CSV from multiple images in single row to single image in one row
        each image url will have one row, to process them further
        this will return the parsed dataframe
        """

        rows = []

        for index, row in df.iterrows():
            image_urls = str(row["Input Image Urls"]).split(",")
            for url in image_urls:
                rows.append({
                    "row_id": index + 1,
                    "Serial Number": row["Serial Number"],
                    "Product Name": row["Product Name"],
                    "Input Image Urls": url,
                    "Output Image Urls": "yet_to_process"
                })

        return pandas.DataFrame(rows)

    def _inverse_transform_csv(self, df: pandas.DataFrame) -> pandas.DataFrame:
        """
        This will transform the CSV from single image in one row to  multiple images in single row 
        this will return the parsed dataframe
        """

        grouped = df.groupby("row_id")

        rows = []
        for row_id, group in grouped:
            image_urls = ",".join(group["Input Image Urls"].astype(str))
            output_urls = ",".join(group["Output Image Urls"].astype(str))

            rows.append({
                "Serial Number": group["Serial Number"].iloc[0],
                "Product Name": group["Product Name"].iloc[0],
                "Input Image Urls": image_urls,
                "Output Image Urls": output_urls
            })

        return pandas.DataFrame(rows)

    def _process_images_async(self, df: pandas.DataFrame) -> pandas.DataFrame:
        """
        This will process the images in parallel via multi-threading
        this will return the parsed dataframe
        this will also update the progress in redis
        """
        total_rows = len(df)
        progress_start = 20  # Starting progress from 20 as few progress steps happended before as well
        progress_end = 80    # Ending progress value at 80 as few progress steps are still left after thi
        progress_range = progress_end - progress_start
        worker_count = os.cpu_count()*2

        # Lock for thread-safe progress updates
        progress_lock = Lock()

        # Shared counter using multiprocessing.Value
        completed_tasks_counter = Value('i', 0)  # 'i' stands for integer type

        results = [None] * total_rows

        def process_and_store(index, url):
            results[index] = self._process_and_upload(url)

            # Increment the completed task counter
            with progress_lock:
                completed_tasks_counter.value += 1
                # Calculate and update the progress
                progress = progress_start + (progress_range * completed_tasks_counter.value) / total_rows
                self.update_status_in_redis("in_progess", progress)

        with ThreadPoolExecutor(max_workers=worker_count) as executor:
            for index, row in df.iterrows():
                executor.submit(process_and_store, index, row["Input Image Urls"])

        # add the coloumn in dataframe
        df["Output Image Urls"] = results

        # return the final output
        return df

    def _process_and_upload(self, url):
        """
        This will download the image from the given url, load it in memory
        then it will process the image(reduce its quality)
        and then upload it to the GCP cloud storage
        And will return the url of the processed image
        """

        try:
            # download original image, save in memory
            raw_img_buffer = self._download_image(url)
            if raw_img_buffer is None:
                raise Exception("Failed to download image")

            # process the image
            processed_img_buffer = self._process_image(raw_img_buffer)
            if processed_img_buffer is None:
                raise Exception("Failed to process image")

            # upload the image to GCp
            new_url = self.gcp_bucket_mgr.upload_image(file_buffer=processed_img_buffer, filename=f"{uuid4()}.jpg")
            if new_url is None:
                raise Exception("Failed to upload image")

            # return the new url
            return new_url
        except Exception as e:
            return str(e)

    def _download_image(self, url: str):
        """
        download the image from the url, and return the image buffer
        """

        response = requests.get(url)

        if response.status_code != 200:
            raise Exception(f"Failed to download image. Reason: {response.reason}")

        return BytesIO(response.content)

    def _process_image(self, image_data: BytesIO):
        """
        this will open the given image buffer and reduce the quality by 50%
        and will return the processed image buffer
        """
        img = Image.open(image_data)
        img_format = img.format
        img = img.convert("RGB")
        output_buffer = BytesIO()
        img.save(output_buffer, format=img_format, quality=50)
        output_buffer.seek(0)
        return output_buffer

    def _save_processed_data_to_gcs(self, processed_data: pandas.DataFrame, upload_doc: UploadSchema):
        """
            This will save the processed data to gcs
            save the processed data to gcs
            convert the dataframe to csv
            upload the csv to gcs
        """

        csv_buffer = BytesIO()
        processed_data.to_csv(path_or_buf=csv_buffer, index=False)
        csv_buffer.seek(0)

        self.gcp_bucket_mgr.upload_csv(
            file_buffer=csv_buffer,
            # using the same name, because upload folder be different
            filename=upload_doc["fileName"]
        )

    def update_status_in_redis(self, status: str, progress: float):
        """
        update the status of the upload id in redis.
        this will not raise exception even in case of error
        """
        try:
            self.redis_client.set(
                name=self.upload_id,
                value=f"{status}:{progress}"
            )
        except Exception as e:
            # do not raise error for this case
            self.logr.critical("Error while updating progress in redis"+e)
