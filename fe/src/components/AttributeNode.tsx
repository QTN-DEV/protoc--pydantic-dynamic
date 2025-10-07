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
import { usePydanticFlow } from "@/contexts/PydanticFlowContext";

interface AttributeNodeData {
  attribute: PydanticAttribute;
  isNested?: boolean;
}

const AttributeNode: React.FC<NodeProps> = ({ data, id }) => {
  const nodeData = data as unknown as AttributeNodeData;
  const { attribute, isNested } = nodeData;
  const { addAttribute, updateAttribute, removeAttribute } = usePydanticFlow();

  return (
    <div className="min-w-[300px]">
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
                onPress={() => removeAttribute(id)}
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
              onChange={(e) => updateAttribute(id, "name", e.target.value)}
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

                updateAttribute(id, "type", selectedType);
              }}
            >
              <SelectItem key={AttributeType.STRING}>String</SelectItem>
              <SelectItem key={AttributeType.INT}>Integer</SelectItem>
              <SelectItem key={AttributeType.FLOAT}>Float</SelectItem>
              <SelectItem key={AttributeType.BOOLEAN}>Boolean</SelectItem>
              <SelectItem key={AttributeType.LIST_STRING}>
                List of String
              </SelectItem>
              <SelectItem key={AttributeType.NESTED}>Nested</SelectItem>
              <SelectItem key={AttributeType.LIST_NESTED}>
                List of Nested
              </SelectItem>
            </Select>

            <Input
              label="Default"
              placeholder="Optional"
              size="sm"
              value={attribute.defaultValue?.toString() || ""}
              variant="bordered"
              onChange={(e) =>
                updateAttribute(id, "defaultValue", e.target.value)
              }
            />

            <div className="flex items-center justify-start">
              <Checkbox
                isSelected={attribute.nullable}
                size="sm"
                onValueChange={(checked) =>
                  updateAttribute(id, "nullable", checked)
                }
              >
                Nullable
              </Checkbox>
            </div>

            <Textarea
              required
              label="Description"
              maxRows={5}
              minRows={2}
              placeholder="Describe this attribute"
              size="sm"
              value={attribute.description}
              variant="bordered"
              onChange={(e) =>
                updateAttribute(id, "description", e.target.value)
              }
            />

            {(attribute.type === AttributeType.NESTED ||
              attribute.type === AttributeType.LIST_NESTED) && (
              <Button
                fullWidth
                color="secondary"
                size="sm"
                variant="flat"
                onPress={() => addAttribute(id, true)}
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
