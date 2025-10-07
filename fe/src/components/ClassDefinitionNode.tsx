import React from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";

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

      <div className="bg-white rounded-lg shadow-lg border-2 border-blue-200">
        <div className="p-4">
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-blue-600 mb-2">
                {nodeData.className || "Class Definition"}
              </h3>
              {nodeData.classDescription && (
                <p className="text-sm text-gray-600 mt-2 max-w-[400px] max-h-[200px] overflow-y-auto whitespace-pre-wrap">
                  {nodeData.classDescription}
                </p>
              )}
            </div>

            <div className="flex justify-center">
              <button
                className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors flex items-center justify-center text-2xl font-bold"
                onClick={() => addAttribute(id)}
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      <Handle position={Position.Bottom} type="source" />
    </div>
  );
};

export default ClassDefinitionNode;
