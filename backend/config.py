"""
Configuration management for Ranking Checker application
"""
import os
import secrets
import logging

try:
    from dotenv import load_dotenv
    load_dotenv()
    print("Environment loaded")
except Exception:
    print("python-dotenv not found")


class Config:
    """Application configuration"""

    # Security
    SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_hex(16))

    # External APIs
    SERPER_API_KEY = os.getenv("SERPER_API_KEY")

    # Environment
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

    # Performance tuning
    REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "10"))
    MAX_WORKERS = int(os.getenv("MAX_WORKERS", "6"))
    MAX_REDIRECTS = int(os.getenv("MAX_REDIRECTS", "10"))
    CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "200"))

    # Database
    SQLALCHEMY_DATABASE_URI = "sqlite:///templates.db"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Location mapping
    LOCATION_MAP = {
        "vn": "Việt Nam",
        "hochiminh": "TP. Hồ Chí Minh",
        "hanoi": "Hà Nội",
        "danang": "Đà Nẵng",
    }

    # User Agent
    USER_AGENT = "Mozilla/5.0 (compatible; SERPChecker/0.2)"


# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%H:%M:%S'
)

logger = logging.getLogger("ranking-unlimited")
