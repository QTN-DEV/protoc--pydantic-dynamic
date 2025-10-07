import { PydanticAttribute } from "../types/pydantic";

export const serializeAttribute = (attr: PydanticAttribute): any => ({
  name: attr.name,
  type: attr.type,
  nullable: attr.nullable,
  description: attr.description,
  default_value: attr.defaultValue,
  nested_attributes: attr.nestedAttributes?.map(serializeAttribute),
});
