# backend/modules/agent/mongo_connection.py
"""
MongoDB connection helper for the agent module.
Provides access to the MongoDB database instance.
"""

from pymongo.database import Database
from mongo_models import mongo_db, init_mongodb
import os


def get_mongo_db() -> Database:
    """
    Get the MongoDB database instance.
    Initializes the connection if not already connected.
    """
    if mongo_db.db is None:
        # Initialize MongoDB connection
        mongodb_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
        database_name = os.getenv('MONGODB_DATABASE', 'smartagro')
        init_mongodb(mongodb_uri, database_name)

    return mongo_db.db


def get_mongo_collection(name: str):
    """
    Get a specific MongoDB collection by name.
    """
    db = get_mongo_db()
    return db[name]
