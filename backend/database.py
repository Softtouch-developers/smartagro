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

if DATABASE_URL:
    engine = create_engine(
        DATABASE_URL,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_pre_ping=True,
        pool_recycle=300,  # Recycle connections every 5 mins (Aiven may drop idle connections)
        pool_timeout=10,   # Fail fast if no connection available
        echo=settings.DEBUG,
        connect_args={
            "connect_timeout": 25,  # Connection timeout in seconds
        }
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
else:
    engine = None
    SessionLocal = None


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for PostgreSQL session"""
    if SessionLocal is None:
        raise RuntimeError("Database not initialized")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==================== MONGODB ====================

mongo_client = None
mongo_db = None

if settings.MONGODB_URI:
    try:
        mongo_client = MongoClient(
            settings.MONGODB_URI,
            maxPoolSize=10,
            minPoolSize=2,
            serverSelectionTimeoutMS=5000
        )
        
        # Test connection
        # mongo_client.admin.command('ping') # Skip ping on import to avoid blocking
        
        mongo_db = mongo_client.smartagro
        logger.info("✅ MongoDB client initialized")
        
    except Exception as e:
        logger.error(f"❌ MongoDB initialization failed: {e}")
        # Don't raise here, let it fail at runtime if needed


def get_mongo_db():
    """Get MongoDB database instance"""
    if mongo_db is None:
        raise RuntimeError("MongoDB not initialized")
    return mongo_db


# ==================== REDIS ====================

redis_client = None

if settings.REDIS_URL:
    try:
        # For DO managed Redis with rediss:// (SSL), skip cert verification
        redis_kwargs = {
            "decode_responses": True,
            "socket_connect_timeout": 5,
            "socket_timeout": 5
        }
        
        if settings.REDIS_URL.startswith("rediss://"):
            redis_kwargs["ssl_cert_reqs"] = None
            
        redis_client = redis.from_url(
            settings.REDIS_URL,
            **redis_kwargs
        )
        
        # Test connection
        # redis_client.ping() # Skip ping on import
        logger.info("✅ Redis client initialized")
        
    except Exception as e:
        logger.error(f"❌ Redis initialization failed: {e}")
        # Don't raise here


def get_redis():
    """Get Redis client instance"""
    if redis_client is None:
        raise RuntimeError("Redis not initialized")
    return redis_client


# ==================== INITIALIZATION ====================

def init_databases():
    """Initialize all database connections"""
    from models import Base, init_db

    # PostgreSQL - Create tables
    if engine:
        init_db(engine)
        logger.info("✅ PostgreSQL tables initialized")

    # MongoDB - Create indexes (optional)
    if settings.MONGODB_URI:
        try:
            from mongo_models import init_mongodb
            init_mongodb(settings.MONGODB_URI, "smartagro")
            logger.info("✅ MongoDB indexes created")
        except Exception as e:
            logger.warning(f"⚠️ MongoDB initialization skipped: {e}")
    
    # Redis - Test connection
    if redis_client:
        try:
            redis_client.set("health_check", "ok", ex=60)
            logger.info("✅ Redis connection verified")
        except Exception as e:
            logger.warning(f"⚠️ Redis health check failed: {e}")


def close_databases():
    """Close all database connections"""
    if mongo_client:
        mongo_client.close()
    if redis_client:
        redis_client.close()
    logger.info("✅ Database connections closed")