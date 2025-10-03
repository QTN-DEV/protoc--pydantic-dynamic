import instructor
from pydantic import BaseModel
from typing import (
    TypeVar,
)

T = TypeVar("T", bound=BaseModel)

GPT_MODEL = "gpt-5"


async def generate(prompt: str, pydantic_model: type[T]) -> T:
    client = instructor.from_provider(
        "openai/" + GPT_MODEL,
        mode=instructor.Mode.TOOLS_STRICT,
        async_client=True,
    )
    generator = client.chat.completions.create_partial(
        model=GPT_MODEL,
        response_model=pydantic_model,
        messages=[
            {
                "role": "user",
                "content": prompt,
            },
        ],
        stream=True,
    )
    result: pydantic_model | None = None

    async for generated in generator:
        result = generated

    return result
