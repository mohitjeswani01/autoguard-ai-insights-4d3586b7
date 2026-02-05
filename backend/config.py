# backend/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # API
    API_TITLE: str = "AutoGuard AI"
    API_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./autoguard_ai.db")
    
    # CORS
    ALLOWED_ORIGINS: list = [
        "http://localhost:5173",
        "http://localhost:8080",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
    ]
    
    # AI Services
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Debug
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    
    # File uploads
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    TEMP_DIR: str = "temp_uploads"

settings = Settings()