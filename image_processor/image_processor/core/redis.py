import os
import redis
import logging
import time


def initialize_redis(logger: logging.Logger, redis_uri: str) -> redis.Redis:
    """ this function will initialize the redis client and returns the redis instance """
    try:
        client = redis.Redis.from_url(redis_uri)
        client.ping()

        logger.info("Connected successfully to Redis server")

        # Set a dummy key in Redis with a 600-second expiration
        client.set(
            name="pixelriver-image-processor",
            value=f"service-initialized-{int(time.time())}",
            ex=600
        )

        return client
    except Exception as e:
        logger.error(f"Error connecting to Redis: {e}")
        raise


def get_redis(logger: logging.Logger) -> redis.Redis:
    redis_uri = os.getenv("REDIS_URI")
    if not redis_uri:
        logger.error("REDIS_URI is not defined")
        raise ValueError("REDIS_URI is not defined")

    return initialize_redis(logger, redis_uri)
