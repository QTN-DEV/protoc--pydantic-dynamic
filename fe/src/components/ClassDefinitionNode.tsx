import React from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Card, CardBody, Input, Button, Textarea } from "@heroui/react";

interface ClassDefinitionNodeData {
  className: string;
  classDescription: string;
  onClassNameChange: (name: string) => void;
  onClassDescriptionChange: (description: string) => void;
  onAddAttribute: () => void;
}

const ClassDefinitionNode: React.FC<NodeProps> = ({ data }) => {
  const nodeData = data as unknown as ClassDefinitionNodeData;

  return (
    <div className="min-w-[400px]">
      <Handle position={Position.Top} style={{ opacity: 0 }} type="target" />

      <Card className="shadow-lg border-2 border-primary-200">
        <CardBody className="p-4">
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-primary-600 mb-2">
                Class Definition
              </h3>
            </div>

            <Input
              required
              label="Class Name"
              placeholder="e.g., User, Product, Order"
              value={nodeData.className}
              variant="bordered"
              onChange={(e) => nodeData.onClassNameChange(e.target.value)}
            />

            <Textarea
              label="Class Description (optional)"
              minRows={2}
              placeholder="Brief description of this class"
              value={nodeData.classDescription}
              variant="bordered"
              onChange={(e) =>
                nodeData.onClassDescriptionChange(e.target.value)
              }
            />

            <Button
              fullWidth
              color="primary"
              variant="flat"
              onPress={nodeData.onAddAttribute}
            >
              + Add Attribute
            </Button>
          </div>
        </CardBody>
      </Card>

      <Handle position={Position.Bottom} type="source" />
    </div>
  );
};

export default ClassDefinitionNode;
