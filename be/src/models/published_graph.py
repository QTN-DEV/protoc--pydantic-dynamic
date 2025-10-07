from datetime import datetime
from typing import Any, ClassVar

from beanie import Document
from pydantic import BaseModel, Field


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

    def get_pydantic_class(self) -> type[BaseModel]:
        """
        Generate a Pydantic class from the published graph's node definitions.

        Each node definition contains a stored PydanticDynamicClass definition,
        which becomes a nested attribute in the resulting Pydantic model.

        Returns:
            A dynamically created Pydantic model class where each node definition
            becomes a nested attribute.

        Raises:
            ValueError: If node definitions are invalid.
        """
        # Import at runtime to avoid circular imports
        from src.models.pydantic_dynamic_class import (  # noqa: PLC0415
            PydanticDynamicClass,
        )

        # Create attributes from each node definition
        fields = {}
        for node_def in self.node_definitions:
            # Reconstruct PydanticDynamicClass from node definition
            try:
                pdc = PydanticDynamicClass(**node_def)
            except Exception as e:
                msg = f"Invalid node definition: {e}"
                raise ValueError(msg) from e

            # Get the Pydantic class for this node definition
            node_class = pdc.get_pydantic_class()

            # Use the PydanticDynamicClass name as attribute name
            attr_name = pdc.name
            # Sanitize attribute name (replace spaces/special chars with underscores)
            attr_name = "".join(c if c.isalnum() or c == "_" else "_" for c in attr_name)

            # Add as optional nested field
            fields[attr_name] = (node_class | None, None)

        # Create the Pydantic model dynamically
        return type(self.name, (BaseModel,), {"__annotations__": fields})
