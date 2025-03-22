from .subscriber import initialize_webhook_subscriber
from dotenv import load_dotenv

load_dotenv()


if __name__ == "__main__":
    initialize_webhook_subscriber()
