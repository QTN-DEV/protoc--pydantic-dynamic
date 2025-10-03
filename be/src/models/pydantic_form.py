from pydantic import BaseModel, Field
from typing import Optional, List, Union, Any
from enum import Enum

class AttributeType(str, Enum):
    STRING = "string"
    INT = "int"
    NESTED = "nested"

class PydanticAttribute(BaseModel):
    name: str
    type: AttributeType
    nullable: bool
    description: str
    default_value: Optional[Union[str, int]] = Field(None, alias="defaultValue")
    nested_attributes: Optional[List['PydanticAttribute']] = Field(None, alias="nestedAttributes")

    class Config:
        populate_by_name = True

class PydanticClassRequest(BaseModel):
    class_name: str = Field(alias="className")
    class_description: Optional[str] = Field(None, alias="classDescription")
    attributes: List[PydanticAttribute]
    prompt: str

    class Config:
        populate_by_name = True

class GenerateResponse(BaseModel):
    result: Any
    generated_class: str = Field(alias="generatedClass")

    class Config:
        populate_by_name = True