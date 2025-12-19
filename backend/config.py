"""
Configuration management for SmartAgro backend
"""
from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings"""
    
    # App Config
    APP_NAME: str = "SmartAgro"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    SECRET_KEY: Optional[str] = None
    
    # Database URLs
    DATABASE_URL: Optional[str] = None
    MONGODB_URI: Optional[str] = None
    PROD_MONGODB_URI: Optional[str] = None
    REDIS_URL: Optional[str] = None

    # External APIs
    PAYSTACK_SECRET_KEY: Optional[str] = None
    PAYSTACK_PUBLIC_KEY: Optional[str] = None
    PAYSTACK_CALLBACK_URL: Optional[str] = None  # Will be set dynamically based on environment
    MNOTIFY_API_KEY: Optional[str] = None
    MNOTIFY_GATEWAY_URL: str = "https://api.mnotify.com/api/sms/quick"
    MNOTIFY_DEFAULT_SENDER: str = "SmartAgro"
    OPENROUTER_API_KEY: Optional[str] = None
    OPENWEATHER_API_KEY: Optional[str] = None
 
    # Storage configuration
    STORAGE_TYPE: str = "local"  # or "spaces" for production
    
    # Local storage
    LOCAL_STORAGE_PATH: str = "./uploads"  # Relative to backend folder
    
    # DO Spaces
    SPACES_ACCESS_KEY: Optional[str] = None
    SPACES_SECRET_KEY: Optional[str] = None
    SPACES_BUCKET: Optional[str] = None
    SPACES_REGION: str = "sgp1"
    SPACES_ENDPOINT: Optional[str] = None
    SPACES_CDN_URL: Optional[str] = None
    
    # JWT
    JWT_SECRET_KEY: Optional[str] = None
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    RESET_PASSWORD_TOKEN_EXPIRE_MINUTES: int = 15
    
    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 100
    AUTH_RATE_LIMIT_PER_MINUTE: int = 30
    
    # Escrow
    PLATFORM_FEE_PERCENTAGE: float = 5.0
    AUTO_RELEASE_DAYS: int = 7
    DISPUTE_DEADLINE_DAYS: int = 3
    
    # OTP
    OTP_EXPIRY_MINUTES: int = 10
    OTP_MAX_ATTEMPTS: int = 3
    OTP_LENGTH: int = 6
    
    # File Uploads
    MAX_IMAGE_SIZE_MB: int = 5
    MAX_VOICE_NOTE_SIZE_MB: int = 10
    MAX_DOCUMENT_SIZE_MB: int = 20
    
    # AI Agent
    AGENT_MODEL: str = "google/gemini-2.5-flash-preview-09-2025"
    AGENT_TEMPERATURE: float = 0.7
    AGENT_MAX_TOKENS: int = 2000
    
    # Embedding Model
    EMBEDDING_MODEL: str = "openai/text-embedding-3-small"
    EMBEDDING_DIMENSION: int = 1536

    # OpenRouter
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"

    # Knowledge Base
    KNOWLEDGEBASE_PATH: str = "./knowledgebase"
    CHUNK_SIZE: int = 1000  # Characters per chunk
    CHUNK_OVERLAP: int = 200  # Overlap between chunks
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "app.log"
    
    # Background Jobs
    ENABLE_BACKGROUND_JOBS: bool = True
    AUTO_RELEASE_JOB_INTERVAL_HOURS: int = 6
    CLEANUP_JOB_HOUR: int = 3
    
    # Development Flags
    MOCK_SMS: bool = False
    MOCK_PAYMENTS: bool = False
    SEED_DATABASE: bool = False
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Initialize settings
settings = Settings()


# Computed values
def get_database_url() -> str:
    """Get database URL with modifications if needed"""
    url = settings.DATABASE_URL
    # Fix for SQLAlchemy 2.0 compatibility
    if url and url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url or ""


def is_production() -> bool:
    """Check if running in production"""
    return settings.ENVIRONMENT == "production"


def get_paystack_callback_url() -> str:
    """Get Paystack callback URL based on environment"""
    if settings.PAYSTACK_CALLBACK_URL:
        return settings.PAYSTACK_CALLBACK_URL

    if is_production():
        # In production, use your DigitalOcean App Platform URL
        # Example: https://smartagro-backend-xxxxx.ondigitalocean.app/api/v1/escrow/callback
        return "https://your-production-url.ondigitalocean.app/api/v1/escrow/callback"
    else:
        # In development, use localhost
        return "http://localhost:8000/api/v1/escrow/callback"


def get_cors_origins() -> list:
    """Get allowed CORS origins"""
    origins = [settings.FRONTEND_URL]

    if settings.DEBUG:
        # Allow localhost variations in development
        origins.extend([
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3000",
        ])
    
    return origins