from datetime import datetime
from typing import Any, ClassVar

from beanie import Document
from pydantic import BaseModel, Field


class Graph(Document):
    graph_id: str = Field(..., index=True, unique=True)
    name: str = Field(default="Untitled Graph")
    nodes: list[dict[str, Any]] = Field(default_factory=list)
    edges: list[dict[str, Any]] = Field(default_factory=list)
    viewport: dict[str, Any] | None = Field(default=None)
    system_prompt: str = Field(default="")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name: ClassVar[str] = "graphs"
        indexes: ClassVar[list[str]] = ["graph_id"]

    class Config:
        json_schema_extra: ClassVar[dict[str, Any]] = {
            "example": {
                "graph_id": "01932e5f-8c7a-7890-b123-456789abcdef",
                "nodes": [{"id": "node1", "type": "networkNode", "position": {"x": 100, "y": 100}}],
                "edges": [{"id": "edge1", "source": "node1", "target": "node2"}],
                "viewport": {"x": 0, "y": 0, "zoom": 1},
            },
        }

    def _sanitize_to_camel_case(self, name: str) -> str:
        """Convert a name to camelCase, removing spaces and special characters."""
        # Remove or replace special characters, keep alphanumeric and spaces
        cleaned = "".join(c if c.isalnum() or c.isspace() else "" for c in name)

        # Split by spaces and convert to camelCase
        words = cleaned.split()
        if not words:
            return "UnnamedClass"

        # First word lowercase (or keep as-is if already has capitals)
        # Remaining words capitalize first letter
        result = words[0]
        for word in words[1:]:
            result += word.capitalize()

        # Ensure it starts with a letter
        if result and not result[0].isalpha():
            result = "Class" + result

        return result or "UnnamedClass"

    async def get_pydantic_class(self) -> type[BaseModel]:
        """
        Generate a Pydantic class from the graph's nodes.

        Each node in the graph represents a PydanticDynamicClass instance,
        which becomes a nested attribute in the resulting Pydantic model.

        Returns:
            A dynamically created Pydantic model class where each graph node
            becomes a nested attribute.

        Raises:
            ValueError: If a referenced PydanticDynamicClass is not found.
        """
        # Import at runtime to avoid circular imports
        from src.models.pydantic_dynamic_class import (  # noqa: PLC0415
            PydanticDynamicClass,
        )

        # Create attributes from each node
        fields = {}
        for node in self.nodes:
            node_id = node.get("data", {}).get("node_id")
            if not node_id:
                continue

            # Fetch the PydanticDynamicClass for this node
            pdc = await PydanticDynamicClass.find_one(
                PydanticDynamicClass.node_id == node_id
            )
            if not pdc:
                msg = f"PydanticDynamicClass with node_id {node_id} not found"
                raise ValueError(msg)

            # Get the Pydantic class for this node
            node_class = pdc.get_pydantic_class()

            # Use the node's name or PydanticDynamicClass name as attribute name
            attr_name = node.get("data", {}).get("label", pdc.name)
            # Sanitize attribute name to camelCase
            attr_name = self._sanitize_to_camel_case(attr_name)

            # Add as optional nested field
            fields[attr_name] = (node_class | None, None)

        # Sanitize class name to camelCase
        class_name = self._sanitize_to_camel_case(self.name)

        # Create the Pydantic model dynamically
        return type(class_name, (BaseModel,), {"__annotations__": fields})
