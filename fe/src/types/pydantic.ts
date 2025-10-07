export enum AttributeType {
  STRING = "string",
  INT = "int",
  FLOAT = "float",
  BOOLEAN = "boolean",
  NESTED = "nested",
  LIST_STRING = "list_string",
  LIST_NESTED = "list_nested",
}

export interface PydanticAttribute {
  name: string;
  type: AttributeType;
  nullable: boolean;
  description: string;
  defaultValue?: string | number | boolean | null;
  nestedAttributes?: PydanticAttribute[];
}

export interface PydanticClassRequest {
  className: string;
  classDescription?: string;
  attributes: PydanticAttribute[];
  prompt: string;
}

export interface GenerateResponse {
  result: any;
  generatedClass: string;
}
