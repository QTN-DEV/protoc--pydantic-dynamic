from datetime import datetime
from typing import Any, ClassVar

from beanie import Document
from pydantic import Field


class GenerationGraphSnapshot(Document):
    graph_id: str = Field(..., index=True)
    name: str = Field(...)
    nodes: list[dict[str, Any]] = Field(default_factory=list)
    edges: list[dict[str, Any]] = Field(default_factory=list)
    viewport: dict[str, Any] | None = Field(default=None)
    system_prompt: str = Field(default="")
    user_prompt: str = Field(...)
    pydantic_model_schema: dict[str, Any] = Field(...)
    generation_result: dict[str, Any] | None = Field(default=None)
    error_message: str | None = Field(default=None)
    success: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name: ClassVar[str] = "generation_graph_snapshots"
        indexes: ClassVar[list[str | list[tuple[str, int]]]] = [
            "graph_id",
            "created_at",
            [("graph_id", 1), ("created_at", -1)],  # For latest generations
        ]

    class Config:
        json_schema_extra: ClassVar[dict[str, Any]] = {
            "example": {
                "graph_id": "01932e5f-8c7a-7890-b123-456789abcdef",
                "name": "My Graph",
                "nodes": [
                    {
                        "id": "node1",
                        "type": "networkNode",
                        "position": {"x": 100, "y": 100},
                    },
                ],
                "edges": [{"id": "edge1", "source": "node1", "target": "node2"}],
                "viewport": {"x": 0, "y": 0, "zoom": 1},
                "system_prompt": "You are a helpful assistant.",
                "user_prompt": "Generate a user profile",
                "pydantic_model_schema": {
                    "type": "object",
                    "properties": {},
                },
                "generation_result": {
                    "name": "John Doe",
                    "age": 30,
                },
                "error_message": None,
                "success": True,
            },
        }
