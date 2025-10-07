from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class AttributeType(str, Enum):
    STRING = "string"
    INT = "int"
    FLOAT = "float"
    BOOLEAN = "boolean"
    NESTED = "nested"
    LIST_STRING = "list_string"
    LIST_NESTED = "list_nested"

class PydanticAttribute(BaseModel):
    name: str
    type: AttributeType
    nullable: bool
    description: str
    default_value: str | int | float | bool | None = Field(None, alias="defaultValue")
    nested_attributes: list['PydanticAttribute'] | None = Field(None, alias="nestedAttributes")

    class Config:
        populate_by_name = True

class PydanticClassRequest(BaseModel):
    class_name: str = Field(alias="className")
    class_description: str | None = Field(None, alias="classDescription")
    attributes: list[PydanticAttribute]
    prompt: str

    class Config:
        populate_by_name = True

class GenerateResponse(BaseModel):
    result: Any
    generated_class: str = Field(alias="generatedClass")

    class Config:
        populate_by_name = True
