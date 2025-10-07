import json
import logging
import os
from typing import Optional

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ValidationError, create_model

from src.models.pydantic_form import (
    AttributeType,
    GenerateResponse,
    PydanticAttribute,
    PydanticClassRequest,
)
from src.utils.openai import generate


class NestedAttributeRequiredError(ValueError):
    """Raised when nested attributes are required but not provided."""

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)

router = APIRouter()


def _sanitize_to_camel_case(name: str) -> str:
    """Convert a name to camelCase, removing spaces and special characters."""
    # Remove or replace special characters, keep alphanumeric and spaces
    cleaned = "".join(c if c.isalnum() or c.isspace() else "" for c in name)

    # Split by spaces and convert to camelCase
    words = cleaned.split()
    if not words:
        return "UnnamedField"

    # First word lowercase (or keep as-is if already has capitals)
    # Remaining words capitalize first letter
    result = words[0]
    for word in words[1:]:
        result += word.capitalize()

    # Ensure it starts with a letter
    if result and not result[0].isalpha():
        result = "Field" + result

    return result or "UnnamedField"


def _get_field_type_and_default(attr: PydanticAttribute) -> tuple[type, object]:
    """Helper function to determine field type and default value for an attribute."""
    if attr.type == AttributeType.STRING:
        return _handle_string_type(attr)
    if attr.type == AttributeType.INT:
        return _handle_int_type(attr)
    if attr.type == AttributeType.FLOAT:
        return _handle_float_type(attr)
    if attr.type == AttributeType.BOOLEAN:
        return _handle_boolean_type(attr)
    if attr.type == AttributeType.NESTED:
        return _handle_nested_type(attr)
    if attr.type == AttributeType.LIST_STRING:
        return _handle_list_string_type(attr)
    if attr.type == AttributeType.LIST_NESTED:
        return _handle_list_nested_type(attr)

    # Default case if no type matches (should not happen with enum)
    return str, ...

def _handle_string_type(attr: PydanticAttribute) -> tuple[type, object]:
    field_type = str
    default_value = ...

    if attr.nullable:
        field_type = Optional[str]
    if attr.default_value is not None:
        default_value = str(attr.default_value)
    elif attr.nullable:
        default_value = None

    return field_type, default_value

def _handle_int_type(attr: PydanticAttribute) -> tuple[type, object]:
    field_type = int
    default_value = ...

    if attr.nullable:
        field_type = Optional[int]
    if attr.default_value:
        default_value = int(attr.default_value)
    elif attr.nullable:
        default_value = None

    return field_type, default_value

def _handle_float_type(attr: PydanticAttribute) -> tuple[type, object]:
    field_type = float
    default_value = ...

    if attr.nullable:
        field_type = Optional[float]
    if attr.default_value:
        default_value = float(attr.default_value)
    elif attr.nullable:
        default_value = None

    return field_type, default_value

def _handle_boolean_type(attr: PydanticAttribute) -> tuple[type, object]:
    field_type = bool
    default_value = ...

    if attr.nullable:
        field_type = Optional[bool]
    if attr.default_value is not None:
        # Handle string representations of boolean
        if isinstance(attr.default_value, str):
            default_value = attr.default_value.lower() in ('true', '1', 'yes')
        else:
            default_value = bool(attr.default_value)
    elif attr.nullable:
        default_value = None

    return field_type, default_value

def _handle_nested_type(attr: PydanticAttribute) -> tuple[type, object]:
    if not attr.nested_attributes:
        raise NestedAttributeRequiredError()

    # Sanitize nested class name
    nested_class_name = _sanitize_to_camel_case(attr.name)
    # Capitalize first letter for class name
    nested_class_name = nested_class_name[0].upper() + nested_class_name[1:] if nested_class_name else "NestedClass"

    nested_model = create_pydantic_model_from_attributes(
        nested_class_name, attr.nested_attributes,
    )

    if attr.nullable:
        return Optional[nested_model], None
    return nested_model, ...

def _handle_list_string_type(attr: PydanticAttribute) -> tuple[type, object]:
    if attr.nullable:
        return Optional[list[str]], None
    return list[str], []

def _handle_list_nested_type(attr: PydanticAttribute) -> tuple[type, object]:
    if not attr.nested_attributes:
        raise NestedAttributeRequiredError()

    # Sanitize nested class name
    nested_class_name = _sanitize_to_camel_case(attr.name)
    # Capitalize first letter and add "Item" suffix for class name
    nested_class_name = nested_class_name[0].upper() + nested_class_name[1:] if nested_class_name else "ListItem"
    nested_class_name += "Item"

    nested_model = create_pydantic_model_from_attributes(
        nested_class_name, attr.nested_attributes,
    )

    if attr.nullable:
        return Optional[list[nested_model]], None
    return list[nested_model], []


def raise_api_key_error() -> None:
    """Helper function to raise HTTPException for missing API key."""
    raise HTTPException(
        status_code=500,
        detail="OPENAI_API_KEY not found in environment",
    )


def create_pydantic_model_from_attributes(
    class_name: str,
    attributes: list[PydanticAttribute],
) -> type[BaseModel]:
    fields = {}

    # Sanitize class name
    sanitized_class_name = _sanitize_to_camel_case(class_name)
    # Ensure first letter is capitalized for class names
    sanitized_class_name = sanitized_class_name[0].upper() + sanitized_class_name[1:] if sanitized_class_name else "DynamicModel"

    for attr in attributes:
        field_type, default_value = _get_field_type_and_default(attr)
        # Sanitize attribute name
        sanitized_attr_name = _sanitize_to_camel_case(attr.name)
        # TODO: no default value for now
        fields[sanitized_attr_name] = field_type, default_value

    return create_model(sanitized_class_name, **fields)

@router.post("/generate", response_model=GenerateResponse)
async def generate_pydantic(request: Request) -> GenerateResponse:
    try:
        # Get raw body for debugging
        body = await request.body()
        logger.info("Raw request body: %s", body.decode())

        # Parse JSON manually first
        try:
            json_data = json.loads(body.decode())
            logger.info("Parsed JSON data: %s", json_data)
        except json.JSONDecodeError as e:
            logger.exception("JSON decode error:")
            error_msg = f"Invalid JSON: {e!s}"
            raise HTTPException(status_code=400, detail=error_msg) from None

        # Try to validate with Pydantic model
        try:
            pydantic_request = PydanticClassRequest(**json_data)
            logger.info("Parsed PydanticClassRequest: %s", pydantic_request)
        except ValidationError as e:
            logger.exception("Pydantic validation error:")
            error_msg = f"Validation error: {e!s}"
            raise HTTPException(status_code=400, detail=error_msg) from None

        if not os.getenv("OPENAI_API_KEY"):
            logger.error("OPENAI_API_KEY not found in environment")
            raise_api_key_error()

        logger.info("Creating dynamic model for class: %s", pydantic_request.class_name)

        logger.info("Creating dynamic model for class: %s", pydantic_request.class_name)
        dynamic_model = create_pydantic_model_from_attributes(
            pydantic_request.class_name, pydantic_request.attributes,
        )
        logger.info("Dynamic model created successfully: %s", dynamic_model)

        logger.info("Calling OpenAI with prompt: %s", pydantic_request.prompt)
        result = await generate(pydantic_request.prompt, dynamic_model)
        logger.info("OpenAI result: %s", result)

        response = GenerateResponse(
            result=result.model_dump() if result else None,
            generated_class=pydantic_request.class_name,
        )
        logger.info("Returning response: %s", response)
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unexpected error:")
        raise HTTPException(status_code=500, detail=str(e)) from e
