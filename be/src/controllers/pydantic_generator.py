from fastapi import APIRouter, HTTPException, Request
from typing import Optional, List
from pydantic import BaseModel, create_model, ValidationError
from src.models.pydantic_form import PydanticClassRequest, GenerateResponse, PydanticAttribute, AttributeType
from src.utils.openai import generate
import os
import logging
import json
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

router = APIRouter()

def create_pydantic_model_from_attributes(class_name: str, attributes: List[PydanticAttribute]) -> type[BaseModel]:
    fields = {}

    for attr in attributes:
        field_type = None
        default_value = ...

        if attr.type == AttributeType.STRING:
            field_type = str
            if attr.nullable:
                field_type = Optional[str]
            if attr.default_value is not None:
                default_value = str(attr.default_value)
            elif attr.nullable:
                default_value = None

        elif attr.type == AttributeType.INT:
            field_type = int
            if attr.nullable:
                field_type = Optional[int]
            if attr.default_value:
                default_value = int(attr.default_value)
            elif attr.nullable:
                default_value = None

        elif attr.type == AttributeType.NESTED:
            if not attr.nested_attributes:
                raise ValueError(f"Nested attribute {attr.name} must have nested_attributes")

            nested_class_name = f"{attr.name.capitalize()}"
            nested_model = create_pydantic_model_from_attributes(nested_class_name, attr.nested_attributes)
            field_type = nested_model

            if attr.nullable:
                field_type = Optional[nested_model]
                default_value = None
            else:
                default_value = ...

        elif attr.type == AttributeType.LIST_STRING:
            field_type = List[str]
            if attr.nullable:
                field_type = Optional[List[str]]
                default_value = None
            else:
                default_value = []

        elif attr.type == AttributeType.LIST_NESTED:
            if not attr.nested_attributes:
                raise ValueError(f"List nested attribute {attr.name} must have nested_attributes")

            nested_class_name = f"{attr.name.capitalize()}Item"
            nested_model = create_pydantic_model_from_attributes(nested_class_name, attr.nested_attributes)
            field_type = List[nested_model]

            if attr.nullable:
                field_type = Optional[List[nested_model]]
                default_value = None
            else:
                default_value = []

        fields[attr.name] = (field_type, default_value)

    return create_model(class_name, **fields)

@router.post("/generate", response_model=GenerateResponse)
async def generate_pydantic(request: Request):
    try:
        # Get raw body for debugging
        body = await request.body()
        logger.info(f"Raw request body: {body.decode()}")

        # Parse JSON manually first
        try:
            json_data = json.loads(body.decode())
            logger.info(f"Parsed JSON data: {json_data}")
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")

        # Try to validate with Pydantic model
        try:
            pydantic_request = PydanticClassRequest(**json_data)
            logger.info(f"Successfully parsed PydanticClassRequest: {pydantic_request}")
        except ValidationError as e:
            logger.error(f"Pydantic validation error: {e}")
            raise HTTPException(status_code=400, detail=f"Validation error: {str(e)}")

        if not os.getenv("OPENAI_API_KEY"):
            logger.error("OPENAI_API_KEY not found in environment")
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY not found in environment")

        logger.info(f"Creating dynamic model for class: {pydantic_request.class_name}")
        dynamic_model = create_pydantic_model_from_attributes(pydantic_request.class_name, pydantic_request.attributes)
        logger.info(f"Dynamic model created successfully: {dynamic_model}")

        logger.info(f"Calling OpenAI with prompt: {pydantic_request.prompt}")
        result = await generate(pydantic_request.prompt, dynamic_model)
        logger.info(f"OpenAI result: {result}")

        response = GenerateResponse(
            result=result.model_dump() if result else None,
            generated_class=pydantic_request.class_name
        )
        logger.info(f"Returning response: {response}")
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))