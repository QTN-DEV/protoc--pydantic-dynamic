from typing import (
    Optional,
    TypeVar,
)

import instructor
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)

GPT_MODEL = "gpt-5"


async def generate(prompt: str, pydantic_model: type[T], system_prompt: str = "") -> T:
    client = instructor.from_provider(
        "openai/" + GPT_MODEL,
        mode=instructor.Mode.TOOLS_STRICT,
        async_client=True,
    )

    messages = [
        {
            "role": "user",
            "content": prompt,
        },
    ]

    if system_prompt:
        messages.insert(0, {
            "role": "system",
            "content": system_prompt,
        })

    generator = client.chat.completions.create_partial(
        model=GPT_MODEL,
        response_model=pydantic_model,
        messages=messages,
        stream=True,
    )
    result: Optional[pydantic_model] = None

    async for generated in generator:
        result = generated

    return result
