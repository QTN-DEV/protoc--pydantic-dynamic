import React from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Card, CardBody, Button } from "@heroui/react";

import { usePydanticFlow } from "@/contexts/PydanticFlowContext";

interface ClassDefinitionNodeData {
  className: string;
  classDescription: string;
}

const ClassDefinitionNode: React.FC<NodeProps> = ({ data, id }) => {
  const nodeData = data as unknown as ClassDefinitionNodeData;
  const { addAttribute } = usePydanticFlow();

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
                <p className="text-sm text-gray-600 mt-2 max-w-[400px] whitespace-pre-wrap">
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
                onPress={() => addAttribute(id)}
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
