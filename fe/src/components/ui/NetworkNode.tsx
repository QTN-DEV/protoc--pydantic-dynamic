import React from "react";
import { Handle, Position } from "@xyflow/react";

import { NetworkNodeData } from "../../types/node";

interface NetworkNodeProps {
  data: NetworkNodeData;
}

const NetworkNode: React.FC<NetworkNodeProps> = ({ data }) => {
  return (
    <div className="relative">
      {/* Connection Handles */}
      <Handle
        position={Position.Left}
        style={{
          width: "18px",
          height: "18px",
          backgroundColor: "#3b82f6",
          border: "2px solid white",
        }}
        type="target"
      />
      <Handle
        position={Position.Right}
        style={{
          width: "18px",
          height: "18px",
          backgroundColor: "#3b82f6",
          border: "2px solid white",
        }}
        type="source"
      />

      <div className="w-48 h-24 bg-white rounded-lg shadow-lg border border-gray-200">
        <div className="p-2 h-full relative">
          {/* Edit button in top-right corner (left of delete) */}
          <button
            className="absolute top-0 right-5 min-w-5 w-5 h-5 text-xs z-10 text-blue-600 hover:text-blue-700 transition-colors"
            onClick={data.onEdit}
          >
            ✎
          </button>

          {/* Delete button in top-right corner */}
          <button
            className="absolute top-0 right-0 min-w-5 w-5 h-5 text-xs z-10 text-red-600 hover:text-red-700 transition-colors"
            onClick={data.onDelete}
          >
            ×
          </button>

          {/* Node name input centered */}
          <div className="flex items-center justify-center h-full pt-2">
            <input
              className="w-full px-2 py-1 text-center text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Node name"
              value={data.node.name}
              onChange={(e) => data.onNameChange(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkNode;
