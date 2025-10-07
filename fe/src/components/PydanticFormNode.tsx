import React from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";

import { PydanticClassRequest, GenerateResponse } from "../types/pydantic";

import PydanticForm from "./PydanticForm";


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

      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-0">
          <PydanticForm
            isLoading={nodeData.isLoading}
            prompt={nodeData.prompt}
            onPromptChange={nodeData.onPromptChange}
            onSubmit={nodeData.onSubmit}
          />
        </div>
      </div>

      <Handle position={Position.Bottom} type="source" />
    </div>
  );
};

export default PydanticFormNode;
