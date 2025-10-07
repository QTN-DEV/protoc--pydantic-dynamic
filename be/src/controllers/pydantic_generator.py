import json
import logging
import os

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

def _get_field_type_and_default(attr: PydanticAttribute) -> tuple[type, object]:
    """Helper function to determine field type and default value for an attribute."""
    if attr.type == AttributeType.STRING:
        return _handle_string_type(attr)
    if attr.type == AttributeType.INT:
        return _handle_int_type(attr)
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
        field_type = str | None
    if attr.default_value is not None:
        default_value = str(attr.default_value)
    elif attr.nullable:
        default_value = None

    return field_type, default_value

def _handle_int_type(attr: PydanticAttribute) -> tuple[type, object]:
    field_type = int
    default_value = ...

    if attr.nullable:
        field_type = int | None
    if attr.default_value:
        default_value = int(attr.default_value)
    elif attr.nullable:
        default_value = None

    return field_type, default_value

def _handle_nested_type(attr: PydanticAttribute) -> tuple[type, object]:
    if not attr.nested_attributes:
        raise NestedAttributeRequiredError()

    nested_class_name = f"{attr.name.capitalize()}"
    nested_model = create_pydantic_model_from_attributes(
        nested_class_name, attr.nested_attributes,
    )

    if attr.nullable:
        return nested_model | None, None
    return nested_model, ...

def _handle_list_string_type(attr: PydanticAttribute) -> tuple[type, object]:
    if attr.nullable:
        return list[str] | None, None
    return list[str], []

def _handle_list_nested_type(attr: PydanticAttribute) -> tuple[type, object]:
    if not attr.nested_attributes:
        raise NestedAttributeRequiredError()

    nested_class_name = f"{attr.name.capitalize()}Item"
    nested_model = create_pydantic_model_from_attributes(
        nested_class_name, attr.nested_attributes,
    )

    if attr.nullable:
        return list[nested_model] | None, None
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

    for attr in attributes:
        field_type, default_value = _get_field_type_and_default(attr)
        fields[attr.name] = (field_type, default_value)

    return create_model(class_name, **fields)

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
