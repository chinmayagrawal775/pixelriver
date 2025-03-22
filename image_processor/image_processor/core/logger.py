import logging
import os
from logging import Logger


def initialize_logger(service_name: str) -> Logger:
    """
    This function will initialize the Python logger
    Logs will be stored in logs/error.log & logs/combined.log files
    It also checks if console logging is enabled or not. If enabled, it will log to the console as well.
    """

    logs_path = os.path.join(os.getcwd(), "logs", service_name)

    # Ensure the logs directory exists
    os.makedirs(logs_path, exist_ok=True)

    # Create logger instance
    logger = logging.getLogger("pixelriver")
    logger.setLevel(logging.INFO)

    # Create log format
    formatter = logging.Formatter("%(asctime)s %(name)s %(levelname)s: %(message)s")

    # File handler for error logs
    error_handler = logging.FileHandler(f"{logs_path}/error.log")
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(formatter)

    # File handler for combined logs
    combined_handler = logging.FileHandler(f"{logs_path}/combined.log")
    combined_handler.setLevel(logging.INFO)
    combined_handler.setFormatter(formatter)

    # Add handlers to logger
    logger.addHandler(error_handler)
    logger.addHandler(combined_handler)

    # Log to console if enabled
    if os.getenv("CONSOLE_LOGGING") == "enable":
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

    logger.info(
        "Logger initialized. Please check the logs dir for further logging info.")

    return logger


def get_logger(service_name: str) -> Logger:
    """ Initialize and return the new logger instance """
    return initialize_logger(service_name)
