from datetime import datetime
from typing import Any, ClassVar

from beanie import Document
from pydantic import BaseModel, Field


class PydanticDynamicClass(Document):
    node_id: str = Field(..., index=True, unique=True)
    graph_id: str = Field(..., index=True)
    name: str = Field(default="Untitled PCD")
    nodes: list[dict[str, Any]] = Field(default_factory=list)
    edges: list[dict[str, Any]] = Field(default_factory=list)
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
                    },
                ],
                "edges": [{"id": "edge1", "source": "attr1", "target": "attr2"}],
            },
        }

    def _convert_node_to_attribute(
        self,
        node: dict[str, Any],
        edges: list[dict[str, Any]],
        all_nodes: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Convert a node to a PydanticAttribute dictionary."""
        # Import at runtime to avoid circular imports
        from src.models.pydantic_form import (  # noqa: PLC0415
            AttributeType,
        )

        node_data = node.get("data", {})
        attribute_data = node_data.get("attribute", {})

        # Get nested attributes if this is a nested type
        nested_attrs = None
        attr_type = attribute_data.get("type")
        if attr_type in [AttributeType.NESTED, AttributeType.LIST_NESTED]:
            # Find child nodes connected to this node
            child_node_ids = [
                edge["target"]
                for edge in edges
                if edge["source"] == node["id"]
            ]
            child_nodes = [n for n in all_nodes if n["id"] in child_node_ids]

            # Recursively convert child nodes
            nested_attrs = [
                self._convert_node_to_attribute(child, edges, all_nodes)
                for child in child_nodes
            ]

        return {
            "name": attribute_data.get("name", ""),
            "type": attr_type,
            "nullable": attribute_data.get("nullable", False),
            "description": attribute_data.get("description", ""),
            "defaultValue": attribute_data.get("defaultValue"),
            "nestedAttributes": nested_attrs,
        }

    def get_pydantic_class(self) -> type[BaseModel]:
        """
        Generate a Pydantic class from the stored nodes and edges.

        Returns:
            A dynamically created Pydantic model class based on the
            stored attribute definitions.

        Raises:
            ValueError: If the class definition node is not found or
                       if required nested attributes are missing.
        """
        # Import at runtime to avoid circular imports
        from src.controllers.pydantic_generator import (  # noqa: PLC0415
            create_pydantic_model_from_attributes,
        )
        from src.models.pydantic_form import (  # noqa: PLC0415
            PydanticAttribute,
        )

        # Find the class definition node (root node)
        class_def_node = None
        for node in self.nodes:
            if node.get("type") == "classDefinition":
                class_def_node = node
                break

        if not class_def_node:
            msg = "Class definition node not found"
            raise ValueError(msg)

        # Get class name from the class definition node
        class_name = class_def_node.get("data", {}).get("className", self.name)

        # Find main attribute nodes (directly connected to class definition)
        main_attr_node_ids = [
            edge["target"]
            for edge in self.edges
            if edge["source"] == "class-definition"
        ]

        # Get main attribute nodes
        main_attr_nodes = [n for n in self.nodes if n["id"] in main_attr_node_ids]

        # Convert nodes to PydanticAttribute objects
        attributes = []
        for node in main_attr_nodes:
            attr_dict = self._convert_node_to_attribute(node, self.edges, self.nodes)
            # Create PydanticAttribute from dict
            attributes.append(PydanticAttribute(**attr_dict))

        # Generate the Pydantic model
        return create_pydantic_model_from_attributes(class_name, attributes)
