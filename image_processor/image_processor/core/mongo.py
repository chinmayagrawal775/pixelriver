from pymongo import MongoClient
import os
import logging
from pymongo import MongoClient
from pymongo.database import Database
import os


def initialize_mongo_db(logr: logging.Logger, db_url: str, db_name: str) -> Database:
    """ This function initializes the MongoDB client and returns the database instance """
    try:
        client = MongoClient(db_url)
        db = client.get_database(db_name)

        logr.info("Connected successfully to MongoDB server")

        return db
    except Exception as error:
        logr.error(f"MongoDB Connection Failure: {error}")
        raise error


def get_mongo_db(logr: logging.Logger) -> Database:
    """ This function returns the connected MongoDB instance """

    db_url = os.getenv("MONGO_DB_URI")
    if not db_url:
        logr.error("MONGO_DB_URI is not defined")
        raise ValueError("MONGO_DB_URI is not defined")

    db_name = os.getenv("MONGO_DB_NAME")
    if not db_url:
        logr.error("MONGO_DB_NAME is not defined")
        raise ValueError("MONGO_DB_NAME is not defined")

    return initialize_mongo_db(logr, db_url, db_name)
