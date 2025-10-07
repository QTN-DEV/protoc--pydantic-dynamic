from datetime import datetime
from typing import Any, ClassVar

from beanie import Document
from pydantic import Field


class PydanticDynamicClass(Document):
    node_id: str = Field(..., index=True, unique=True)
    graph_id: str = Field(..., index=True)
    name: str = Field(default="Untitled PCD")
    nodes: list[dict[str, Any]] = Field(default_factory=list)
    edges: list[dict[str, Any]] = Field(default_factory=list)
    viewport: dict[str, Any] | None = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name: ClassVar[str] = "pydantic_dynamic_classes"
        indexes: ClassVar[list[str | list[tuple[str, int]]]] = [
            "node_id",
            "graph_id",
            [("graph_id", 1), ("node_id", 1)],  # Compound index for joins
        ]

    class Config:
        json_schema_extra: ClassVar[dict[str, Any]] = {
            "example": {
                "node_id": "01932e5f-8c7a-7890-b123-456789abcdef",
                "graph_id": "01932e5f-8c7a-7890-b123-456789abcdef",
                "name": "My PCD",
                "nodes": [
                    {
                        "id": "attr1",
                        "type": "attributeNode",
                        "position": {"x": 100, "y": 100},
                    }
                ],
                "edges": [{"id": "edge1", "source": "attr1", "target": "attr2"}],
                "viewport": {"x": 0, "y": 0, "zoom": 1},
            },
        }
