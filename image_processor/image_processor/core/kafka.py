from kafka import KafkaConsumer
import logging
import os

UPLOAD_PROCESSING_TOPIC = "pixelriver-new-upload"


def initialize_kafka_consumer(logr: logging.Logger) -> KafkaConsumer:
    """ This will initialize kafka consumer and return the consumer instance """
    try:
        # ensure kafka brokers are there
        kafka_brokers = os.getenv("KAFKA_BROKERS")
        if not kafka_brokers:
            logr.error("KAFKA_BROKERS is not defined")
            raise ValueError("KAFKA_BROKERS is not defined")

        kafka_brokers = kafka_brokers.split(",")

        # create kafka consumer for topic
        consumer = KafkaConsumer(
            UPLOAD_PROCESSING_TOPIC,
            bootstrap_servers=kafka_brokers,
            auto_offset_reset="earliest",
            enable_auto_commit=True,
        )

        logr.info("Kafka consumer connected")

        return consumer
    except Exception as error:
        logr.error(error)
        raise error
