from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from contextlib import asynccontextmanager
from typing import AsyncGenerator

MONGODB_URL = "mongodb://qops:qops@3.1.94.166:27017/"
DATABASE_NAME = "pcdnge"

class MongoDB:
    client: AsyncIOMotorClient = None

    @classmethod
    async def connect_db(cls):
        """Initialize MongoDB connection and Beanie"""
        from src.models.graph import Graph
        from src.models.published_graph import PublishedGraph

        cls.client = AsyncIOMotorClient(MONGODB_URL)
        await init_beanie(
            database=cls.client[DATABASE_NAME],
            document_models=[Graph, PublishedGraph]
        )

    @classmethod
    async def close_db(cls):
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
