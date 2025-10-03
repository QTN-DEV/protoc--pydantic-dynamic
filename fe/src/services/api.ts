import {
  PydanticClassRequest,
  GenerateResponse,
  PydanticAttribute,
} from "@/types/pydantic";

const API_BASE_URL = "http://localhost:8000";

const serializeAttribute = (attr: PydanticAttribute): any => ({
  name: attr.name,
  type: attr.type,
  nullable: attr.nullable,
  description: attr.description,
  default_value: attr.defaultValue,
  nested_attributes: attr.nestedAttributes?.map(serializeAttribute),
});

export const apiService = {
  async generatePydantic(
    request: PydanticClassRequest,
  ): Promise<GenerateResponse> {
    const response = await fetch(`${API_BASE_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        class_name: request.className,
        class_description: request.classDescription,
        attributes: request.attributes.map(serializeAttribute),
        prompt: request.prompt,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();

      throw new Error(errorData.detail || "Failed to generate response");
    }

    const data = await response.json();

    return {
      result: data.result,
      generatedClass: data.generated_class,
    };
  },
};
