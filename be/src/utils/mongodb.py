from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

# Import models at the top to avoid local imports in class methods
from src.models.graph import Graph
from src.models.published_graph import PublishedGraph

MONGODB_URL = "mongodb://qops:qops@3.1.94.166:27017/"
DATABASE_NAME = "pcdnge"

class MongoDB:
    client: AsyncIOMotorClient = None

    @classmethod
    async def connect_db(cls) -> None:
        """Initialize MongoDB connection and Beanie"""

        cls.client = AsyncIOMotorClient(MONGODB_URL)
        await init_beanie(
            database=cls.client[DATABASE_NAME],
            document_models=[Graph, PublishedGraph],
        )

    @classmethod
    async def close_db(cls) -> None:
        """Close MongoDB connection"""
        if cls.client:
            cls.client.close()

@asynccontextmanager
async def get_db() -> AsyncGenerator:
    """Database lifecycle manager for FastAPI"""
    await MongoDB.connect_db()
    try:
        yield
    finally:
        await MongoDB.close_db()
