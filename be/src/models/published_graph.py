from beanie import Document
from pydantic import Field
from typing import Any, Optional
from datetime import datetime


class PublishedGraph(Document):
    graph_id: str = Field(..., index=True)
    version: int = Field(...)
    name: str = Field(...)
    nodes: list[dict[str, Any]] = Field(default_factory=list)
    edges: list[dict[str, Any]] = Field(default_factory=list)
    viewport: Optional[dict[str, Any]] = Field(default=None)
    published_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "published_graphs"
        indexes = [
            "graph_id",
            [("graph_id", 1), ("version", -1)]  # Compound index for finding latest version
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "graph_id": "01932e5f-8c7a-7890-b123-456789abcdef",
                "version": 1,
                "name": "My Graph v1",
                "nodes": [{"id": "node1", "type": "networkNode", "position": {"x": 100, "y": 100}}],
                "edges": [{"id": "edge1", "source": "node1", "target": "node2"}],
                "viewport": {"x": 0, "y": 0, "zoom": 1}
            }
        }
