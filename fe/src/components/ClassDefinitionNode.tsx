import React from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Card, CardBody, Button } from "@heroui/react";

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
    <div className="min-w-[300px]">
      <Handle position={Position.Top} style={{ opacity: 0 }} type="target" />

      <Card className="shadow-lg border-2 border-primary-200">
        <CardBody className="p-4">
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-primary-600 mb-2">
                {nodeData.className || "Class Definition"}
              </h3>
              {nodeData.classDescription && (
                <p className="text-sm text-gray-600 mt-2">
                  {nodeData.classDescription}
                </p>
              )}
            </div>

            <div className="flex justify-center">
              <Button
                isIconOnly
                color="primary"
                radius="full"
                size="lg"
                variant="flat"
                onPress={nodeData.onAddAttribute}
              >
                +
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Handle position={Position.Bottom} type="source" />
    </div>
  );
};

export default ClassDefinitionNode;
