from datetime import datetime
from typing import Any, ClassVar

from beanie import Document
from pydantic import Field


class PublishedGraph(Document):
    graph_id: str = Field(..., index=True)
    version: int = Field(...)
    name: str = Field(...)
    nodes: list[dict[str, Any]] = Field(default_factory=list)
    edges: list[dict[str, Any]] = Field(default_factory=list)
    viewport: dict[str, Any] | None = Field(default=None)
    node_definitions: list[dict[str, Any]] = Field(default_factory=list)
    published_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(default=False)

    class Settings:
        name: ClassVar[str] = "published_graphs"
        indexes: ClassVar[list[str | list[tuple[str, int]]]] = [
            "graph_id",
            # Compound index for finding latest version
            [("graph_id", 1), ("version", -1)],
        ]

    class Config:
        json_schema_extra: ClassVar[dict[str, Any]] = {
            "example": {
                "graph_id": "01932e5f-8c7a-7890-b123-456789abcdef",
                "version": 1,
                "name": "My Graph v1",
                "nodes": [
                    {
                        "id": "node1",
                        "type": "networkNode",
                        "position": {"x": 100, "y": 100},
                    },
                ],
                "edges": [{"id": "edge1", "source": "node1", "target": "node2"}],
                "viewport": {"x": 0, "y": 0, "zoom": 1},
                "node_definitions": [],
            },
        }
