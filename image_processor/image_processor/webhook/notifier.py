from logging import Logger
from pymongo.database import Database
from bson import ObjectId
from redis import Redis
from datetime import datetime
import requests


class WebhookNotification:
    """ This class will send the notification to the webhook url """

    def __init__(self, logr: Logger, mongo_db_client: Database):
        # set the services in object instance
        self.logr = logr
        self.mongo_db_client = mongo_db_client
        self.upload_collection = mongo_db_client.get_collection("uploads")

    def send_notification(self, msg: str):
        """
        This function will send the notification to the webhook url
        expects the msg to be <upload_id>|||<webhook_url> format
        where ||| is the seperator
        """

        self.msg = msg
        try:
            self._notify()
        except Exception as e:
            # do not raise error
            self.logr.exception(e)

    def _notify(self):
        """
        this will:
            - parse the incoming msg
            - make the webhook request
            - save the webhook response in database
        """
        upload_id, url = self._parse_msg()
        webhook_reponse = self._make_webhook_request(url)
        self._save_webhook_repsonse(upload_id, webhook_reponse)

    def _parse_msg(self) -> tuple[str, str]:
        """ this function will parse the incoming msg and return the upload_id and webhook_url """

        messages = self.msg.split("|||")
        if len(messages) != 2:
            raise Exception("Invalid message format")

        upload_id, webhook_url = messages

        if upload_id is None or webhook_url is None:
            raise Exception("Invalid message format")

        return upload_id, webhook_url

    def _make_webhook_request(self, url: str) -> str:
        """
        this function will make the webhook request and return the response 
        this will return response in
        "Respone Status Code:<response_code>, Response reason:<response_reason_only_in_case_of_non_200"
        """

        response = requests.get(url)
        if response.status_code == 200:
            return f"Respone Status Code:{response.status_code}"
        else:
            return f"Respone Status Code:{response.status_code}, Response reason:{response.reason}"

    def _save_webhook_repsonse(self, upload_id: str, response: str) -> None:
        self.upload_collection.find_one_and_update(
            {"_id": ObjectId(upload_id)},
            {"$set": {"updatedAt": datetime.now(), "whkResponse": response}}
        )
