from typing import Generator

from pymongo import MongoClient
from pymongo.database import Database

from backend.app.core.config import settings

# Singleton Mongo client for the app process
_client: MongoClient = MongoClient(settings.get_mongo_uri())
_database: Database = _client[settings.MONGODB_DB]


def get_db() -> Generator[Database, None, None]:
    """
    FastAPI dependency that yields the shared Mongo database.
    """
    try:
        yield _database
    finally:
        # MongoClient maintains its own pool; nothing to clean per-request.
        pass


def get_collection(name: str):
    return _database[name]


def close_db_client() -> None:
    """
    Close the Mongo client; useful for tests or shutdown hooks.
    """
    _client.close()
