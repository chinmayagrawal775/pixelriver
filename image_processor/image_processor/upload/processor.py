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
    def __init__(self, logr: Logger, mongo_db_client: Database, redis_client: Redis, gcp_bucket_mgr: GCPStorageManager):
        self.logr = logr
        self.mongo_db_client = mongo_db_client
        self.upload_collection: Collection[UploadSchema] = mongo_db_client.get_collection("uploads")
        self.redis_client = redis_client
        self.gcp_bucket_mgr = gcp_bucket_mgr

    def start_processing(self, upload_id: str):
        self.upload_id = upload_id
        try:
            self._process()
        except Exception as e:
            # do not raise error
            self.logr.exception(e)

    def _process(self):
        upload_doc = self.upload_collection.find_one({"_id": ObjectId(self.upload_id)})
        if upload_doc is None:
            raise Exception(f"Upload with id {self.upload_id} not found")

        self.update_status_in_redis("in_progess", 10)

        original_data = self._get_original_data(upload_doc)

        original_data_flatten = self._transform_csv(original_data)

        self.update_status_in_redis("in_progess", 20)

        processed_data_flatten = self._process_images_async(original_data_flatten)

        self.update_status_in_redis("in_progess", 80)

        processed_data: pandas.DataFrame = self._inverse_transform_csv(processed_data_flatten)

        self._save_processed_data_to_gcs(processed_data, upload_doc)

        self.update_status_in_redis("in_progess", 99)

        self.upload_collection.find_one_and_update(
            {"_id": ObjectId(self.upload_id)},
            {"$set": {"status": "completed", "progress": 100, "updatedAt": datetime.now()}}
        )

        self.redis_client.delete(self.upload_id)

        if upload_doc["webhookUrl"] is not None:
            self.redis_client.publish("webhook", f"{upload_doc['_id']}|||{upload_doc['webhookUrl']}")

    def _get_original_data(self, upload_doc: UploadSchema) -> pandas.DataFrame:
        original_file_path = self.gcp_bucket_mgr.download_csv(filename=upload_doc["fileName"])

        original_data = pandas.read_csv(original_file_path)

        try:
            Path(original_file_path).unlink()
        except Exception as e:
            # do not raise error for this
            self.logger.error(f"Error in deleting file: {original_file_path}"+e)

        return original_data

    def _transform_csv(self, df: pandas.DataFrame) -> pandas.DataFrame:
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
                executor.submit(
                    process_and_store,
                    index,
                    row["Input Image Urls"]
                )

        df["Output Image Urls"] = results
        return df

    def _process_and_upload(self, url):
        try:

            raw_img_buffer = self._download_image(url)
            if raw_img_buffer is None:
                raise Exception("Failed to download image")

            processed_img_buffer = self._process_image(raw_img_buffer)
            if processed_img_buffer is None:
                raise Exception("Failed to process image")

            new_url = self.gcp_bucket_mgr.upload_image(file_buffer=processed_img_buffer, filename=f"{uuid4()}.jpg")
            if new_url is None:
                raise Exception("Failed to upload image")

            return new_url
        except Exception as e:
            return str(e)

    def _download_image(self, url: str):
        response = requests.get(url)

        if response.status_code != 200:
            raise Exception(f"Failed to download image. Reason: {response.reason}")

        return BytesIO(response.content)

    def _process_image(self, image_data: BytesIO):
        img = Image.open(image_data)
        img_format = img.format
        img = img.convert("RGB")
        output_buffer = BytesIO()
        img.save(output_buffer, format=img_format, quality=50)
        output_buffer.seek(0)
        return output_buffer

    def _save_processed_data_to_gcs(self, processed_data: pandas.DataFrame, upload_doc: UploadSchema):
        csv_buffer = BytesIO()
        processed_data.to_csv(path_or_buf=csv_buffer, index=False)
        csv_buffer.seek(0)

        self.gcp_bucket_mgr.upload_csv(
            file_buffer=csv_buffer,
            # using the same name, because upload folder be different
            filename=upload_doc["fileName"]
        )

    def update_status_in_redis(self, status: str, progress: float):
        try:
            self.redis_client.set(
                name=self.upload_id,
                value=f"{status}:{progress}"
            )
        except Exception as e:
            # do not raise error for this case
            self.logr.critical("Error while updating progress in redis"+e)
