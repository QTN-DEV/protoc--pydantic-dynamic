export enum AttributeType {
  STRING = "string",
  INT = "int",
  NESTED = "nested",
}

export interface PydanticAttribute {
  name: string;
  type: AttributeType;
  nullable: boolean;
  description: string;
  defaultValue?: string | number | null;
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