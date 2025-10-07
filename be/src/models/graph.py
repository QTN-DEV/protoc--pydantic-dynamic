from beanie import Document
from pydantic import Field
from typing import Any, Optional
from datetime import datetime


class Graph(Document):
    graph_id: str = Field(..., index=True, unique=True)
    name: str = Field(default="Untitled Graph")
    nodes: list[dict[str, Any]] = Field(default_factory=list)
    edges: list[dict[str, Any]] = Field(default_factory=list)
    viewport: Optional[dict[str, Any]] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "graphs"
        indexes = ["graph_id"]

    class Config:
        json_schema_extra = {
            "example": {
                "graph_id": "01932e5f-8c7a-7890-b123-456789abcdef",
                "nodes": [{"id": "node1", "type": "networkNode", "position": {"x": 100, "y": 100}}],
                "edges": [{"id": "edge1", "source": "node1", "target": "node2"}],
                "viewport": {"x": 0, "y": 0, "zoom": 1}
            }
        }
