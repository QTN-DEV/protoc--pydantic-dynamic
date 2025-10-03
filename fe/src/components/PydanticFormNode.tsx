import React from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Card, CardBody } from "@heroui/react";

import PydanticForm from "./PydanticForm";

import { PydanticClassRequest, GenerateResponse } from "@/types/pydantic";

interface PydanticFormNodeData {
  onSubmit: (
    data: Omit<PydanticClassRequest, "prompt">,
  ) => Promise<GenerateResponse>;
  isLoading: boolean;
  prompt: string;
  onPromptChange: (prompt: string) => void;
}

const PydanticFormNode: React.FC<NodeProps> = ({ data }) => {
  const nodeData = data as unknown as PydanticFormNodeData;

  return (
    <div className="min-w-[800px]">
      <Handle position={Position.Top} type="target" />

      <Card className="shadow-lg">
        <CardBody className="p-0">
          <PydanticForm
            isLoading={nodeData.isLoading}
            prompt={nodeData.prompt}
            onPromptChange={nodeData.onPromptChange}
            onSubmit={nodeData.onSubmit}
          />
        </CardBody>
      </Card>

      <Handle position={Position.Bottom} type="source" />
    </div>
  );
};

export default PydanticFormNode;
