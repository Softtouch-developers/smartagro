"""
Database connection management
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from pymongo import MongoClient
import redis
from config import settings, get_database_url
from typing import Generator
import logging

logger = logging.getLogger(__name__)

# ==================== POSTGRESQL ====================

DATABASE_URL = get_database_url()

engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=2,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=settings.DEBUG
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for PostgreSQL session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==================== MONGODB ====================

try:
    mongo_client = MongoClient(
        settings.MONGODB_URI,
        maxPoolSize=10,
        minPoolSize=2,
        serverSelectionTimeoutMS=5000
    )
    
    # Test connection
    mongo_client.admin.command('ping')
    
    mongo_db = mongo_client.smartagro
    logger.info("✅ Connected to MongoDB")
    
except Exception as e:
    logger.error(f"❌ MongoDB connection failed: {e}")
    raise


def get_mongo_db():
    """Get MongoDB database instance"""
    return mongo_db


# ==================== REDIS ====================

try:
    redis_client = redis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
        socket_connect_timeout=5,
        socket_timeout=5
    )
    
    # Test connection
    redis_client.ping()
    logger.info("✅ Connected to Redis")
    
except Exception as e:
    logger.error(f"❌ Redis connection failed: {e}")
    raise


def get_redis():
    """Get Redis client instance"""
    return redis_client


# ==================== INITIALIZATION ====================

def init_databases():
    """Initialize all database connections"""
    from models import Base, init_db
    from mongo_models import init_mongodb
    
    # PostgreSQL - Create tables
    init_db(engine)
    logger.info("✅ PostgreSQL tables initialized")
    
    # MongoDB - Create indexes
    init_mongodb(settings.MONGODB_URI, "smartagro")
    logger.info("✅ MongoDB indexes created")
    
    # Redis - Test connection
    redis_client.set("health_check", "ok", ex=60)
    logger.info("✅ Redis connection verified")


def close_databases():
    """Close all database connections"""
    mongo_client.close()
    redis_client.close()
    logger.info("✅ Database connections closed")