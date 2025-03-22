from core.mongo import get_mongo_db
from core.redis import get_redis
from core.gcp import GCPStorageManager
from core.kafka import initialize_kafka_consumer
from core.logger import get_logger
from .processor import ProcessUploadId


def initialize_image_processing_consumer():
    """ This will initialize the image processing consumer and process the each msg"""

    # intialze various services
    logr = get_logger("image-processor")
    mongoDbClient = get_mongo_db(logr)
    redisClient = get_redis(logr)
    storageManager = GCPStorageManager(logr)
    uploadConsumer = initialize_kafka_consumer(logr)

    logr.info("Image processor started...")
    print("Image processor started...")

    # start consuming messages
    try:
        for message in uploadConsumer:
            ProcessUploadId(logr, mongoDbClient, redisClient, storageManager).start_processing(message.value.decode())
    except KeyboardInterrupt:
        uploadConsumer.close()
        redisClient.close()
        print("Shutting down kafka gracefully...")
