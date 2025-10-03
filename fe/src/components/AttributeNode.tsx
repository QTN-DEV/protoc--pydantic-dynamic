import React from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import {
  Card,
  CardBody,
  Input,
  Select,
  SelectItem,
  Checkbox,
  Button,
  Textarea,
} from "@heroui/react";

import { AttributeType, PydanticAttribute } from "@/types/pydantic";

interface AttributeNodeData {
  attribute: PydanticAttribute;
  onAttributeChange: (field: keyof PydanticAttribute, value: any) => void;
  onAddNestedAttribute?: () => void;
  onRemoveAttribute: () => void;
  isNested?: boolean;
}

const AttributeNode: React.FC<NodeProps> = ({ data }) => {
  const nodeData = data as unknown as AttributeNodeData;
  const {
    attribute,
    onAttributeChange,
    onAddNestedAttribute,
    onRemoveAttribute,
    isNested,
  } = nodeData;

  return (
    <div className="min-w-[263px]">
      <Handle position={Position.Top} type="target" />

      <Card
        className={`shadow-lg ${isNested ? "border-2 border-secondary-200" : "border-2 border-success-200"}`}
      >
        <CardBody className="p-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4
                className={`font-medium ${isNested ? "text-secondary-600" : "text-success-600"}`}
              >
                {isNested ? "Nested Attribute" : "Attribute"}
              </h4>
              <Button
                isIconOnly
                color="danger"
                size="sm"
                variant="light"
                onPress={onRemoveAttribute}
              >
                ×
              </Button>
            </div>

            <Input
              required
              label="Name"
              placeholder="attribute name"
              size="sm"
              value={attribute.name}
              variant="bordered"
              onChange={(e) => onAttributeChange("name", e.target.value)}
            />

            <Select
              isClearable={false}
              label="Type"
              placeholder="Select type"
              selectedKeys={[attribute.type]}
              size="sm"
              variant="bordered"
              onSelectionChange={(keys) => {
                const selectedType = Array.from(keys)[0] as AttributeType;

                onAttributeChange("type", selectedType);
              }}
            >
              <SelectItem key={AttributeType.STRING}>String</SelectItem>
              <SelectItem key={AttributeType.INT}>Integer</SelectItem>
              <SelectItem key={AttributeType.NESTED}>Nested</SelectItem>
            </Select>

            <Input
              label="Default"
              placeholder="Optional"
              size="sm"
              value={attribute.defaultValue?.toString() || ""}
              variant="bordered"
              onChange={(e) =>
                onAttributeChange("defaultValue", e.target.value)
              }
            />

            <div className="flex items-center justify-start">
              <Checkbox
                isSelected={attribute.nullable}
                size="sm"
                onValueChange={(checked) =>
                  onAttributeChange("nullable", checked)
                }
              >
                Nullable
              </Checkbox>
            </div>

            <Textarea
              required
              label="Description"
              minRows={2}
              placeholder="Describe this attribute"
              size="sm"
              value={attribute.description}
              variant="bordered"
              onChange={(e) => onAttributeChange("description", e.target.value)}
            />

            {attribute.type === AttributeType.NESTED &&
              onAddNestedAttribute && (
                <Button
                  fullWidth
                  color="secondary"
                  size="sm"
                  variant="flat"
                  onPress={onAddNestedAttribute}
                >
                  + Add Nested Attribute
                </Button>
              )}
          </div>
        </CardBody>
      </Card>

      <Handle position={Position.Bottom} type="source" />
    </div>
  );
};

export default AttributeNode;
