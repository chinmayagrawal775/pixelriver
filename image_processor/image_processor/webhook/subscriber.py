from core.mongo import get_mongo_db
from core.redis import get_redis
from core.logger import get_logger
from .notifier import WebhookNotification


def initialize_webhook_subscriber():
    """
    This will initialize the webhook subscriber and process the each msg
    send notification to the webhook url
    """

    # intialize various services
    logr = get_logger("webhook-subscriber")
    redisClientForPubSub = get_redis(logr)
    mongoDbClient = get_mongo_db(logr)

    # subscribe to channel
    redisPubSub = redisClientForPubSub.pubsub()
    redisPubSub.subscribe("webhook")

    logr.info("Webhook Subscriber started...")
    print("Webhook Subscriber started...")

    # start consuming messages
    try:
        for message in redisPubSub.listen():
            if message["type"] == 'message':
                msg = message["data"].decode("utf-8")
                WebhookNotification(logr, mongoDbClient).send_notification(msg)
    except KeyboardInterrupt:
        # unsubscribe to channel first
        redisPubSub.unsubscribe()

        # then close the redis connection
        redisPubSub.close()

        print("Shutting down webhook gracefully...")
