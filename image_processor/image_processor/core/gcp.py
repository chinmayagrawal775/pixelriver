from google.cloud import storage
from google.api_core.client_options import ClientOptions
from google.auth.credentials import AnonymousCredentials  # Bypass auth
from pathlib import Path
from io import BytesIO
import logging
import os


class GCPStorageManager:
    def __init__(self, logger: logging.Logger):
        self.logger = logger
        self.client = None
        self.base_path = os.path.join(os.getcwd(), "image_processor")

        self.project_id = os.getenv("GCP_PROJECT_ID")
        self.endpoint = os.getenv("GCP_ENDPOINT")

        self.bucket_name = os.getenv("GCP_IMAGE_DATA_CSV_BUCKET_NAME")
        self.public_file_path = os.getenv("GCP_IMAGE_DATA_FILE_PUBLIC_URL")

        self.csv_download_path = os.getenv("GCP_IMAGE_DATA_CSV_DOWNLOAD_PATH")
        self.csv_upload_path = os.getenv("GCP_IMAGE_DATA_CSV_UPLOAD_PATH")
        self.image_upload_path = os.getenv("GCP_IMAGE_DATA_IMG_UPLOAD_PATH")

        self._validate_envs()
        self._initialize_storage()

    def _validate_envs(self):
        required_envs = ["GCP_PROJECT_ID", "GCP_ENDPOINT",
                         "GCP_IMAGE_DATA_CSV_BUCKET_NAME", "GCP_IMAGE_DATA_FILE_PUBLIC_URL",
                         "GCP_IMAGE_DATA_CSV_DOWNLOAD_PATH", "GCP_IMAGE_DATA_CSV_UPLOAD_PATH", "GCP_IMAGE_DATA_IMG_UPLOAD_PATH",]
        for env in required_envs:
            if not os.getenv(env):
                self.logger.error(f"{env} is not defined")
                raise ValueError(f"{env} is not defined")

    def _initialize_storage(self):
        """ this will initialize the GCP storage client and set it in the class instance """
        try:
            self.client = storage.Client(project=self.project_id, client_options=ClientOptions(api_endpoint=self.endpoint), credentials=AnonymousCredentials())
            self.logger.info("GCP storage initialized successfully")
        except Exception as e:
            self.logger.error(f"Failed to initialize GCP storage: {e}")
            raise

    def _upload_file_by_path(self, source_file_path: str, dest_file_path: str, delete_file: bool = True) -> str:
        """ 
        this will take the path of source file and upload it to dest_file_path in GCP bucket
        this also deletes the file if delete_file is true
        """
        try:
            bucket = self.client.bucket(self.bucket_name)

            blob = bucket.blob(dest_file_path)
            blob.upload_from_filename(source_file_path)

            if delete_file:
                try:
                    Path(source_file_path).unlink()
                except Exception as e:
                    # do not throw error.
                    self.logger.critical(f"Error in deleting file: {source_file_path}")

            return f"{self.public_file_path}{dest_file_path}"
        except Exception as e:
            self.logger.error(f"Error uploading file to GCP: {e}")
            raise

    def _upload_file_by_buffer(self, source_file_buffer: BytesIO, dest_file_path: str, content_type=f"image/img") -> str:
        """ this will take the buffer of source file and upload it to dest_file_path in GCP bucket """

        try:
            bucket = self.client.bucket(self.bucket_name)
            blob = bucket.blob(dest_file_path)

            blob.upload_from_file(
                file_obj=source_file_buffer,
                content_type=content_type
            )

            return f"{self.public_file_path}{dest_file_path}"
        except Exception as e:
            self.logger.error(f"Error uploading file to GCP: {e}")
            raise

    def _download_from_filename(self, source_file_path: str, dest_file_path: str) -> str:
        """ this will download the file from source_file_path in GCP bucket and store it in dest_file_path """

        try:
            bucket = self.client.bucket(self.bucket_name)
            blob = bucket.blob(source_file_path)
            blob.download_to_filename(dest_file_path)

            return dest_file_path
        except Exception as e:
            self.logger.error(
                f"Error downloading file from path: {source_file_path}. Error: {e}")
            raise e

    def upload_csv(self, file_buffer: BytesIO, filename: str) -> str:
        """ this will upload the csv file to GCP bucket """

        return self._upload_file_by_buffer(
            source_file_buffer=file_buffer,
            dest_file_path=f"{self.csv_upload_path}/{filename}",
            content_type="text/csv"
        )

    def upload_image(self, file_buffer: BytesIO, filename: str) -> str:
        """ this will upload the image file to GCP bucket """

        return self._upload_file_by_buffer(
            source_file_buffer=file_buffer,
            dest_file_path=f"{self.image_upload_path}/{filename}",
            content_type="image/img"
        )

    def download_csv(self, filename: str) -> str:
        """ this will download the csv file from GCP bucket and save to to tmp directory """

        return self._download_from_filename(
            source_file_path=f"{self.csv_download_path}/{filename}",
            dest_file_path=os.path.join(
                self.base_path, "tmp", "unprocessed", filename)
        )
