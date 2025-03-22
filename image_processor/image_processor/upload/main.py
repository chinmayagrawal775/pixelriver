from .consumer import initialize_image_processing_consumer
from dotenv import load_dotenv

load_dotenv()


if __name__ == "__main__":
    initialize_image_processing_consumer()
