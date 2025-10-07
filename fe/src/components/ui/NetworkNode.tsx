import React from "react";
import { Handle, Position } from "@xyflow/react";
import { Button, Card, CardBody, Input } from "@heroui/react";

import { NetworkNodeData } from "@/types/node";

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

      <Card className="w-48 h-24">
        <CardBody className="p-2 h-full relative">
          {/* Edit button in top-right corner (left of delete) */}
          <Button
            isIconOnly
            className="absolute top-0 right-5 min-w-5 w-5 h-5 text-xs z-10"
            color="primary"
            size="sm"
            variant="light"
            onPress={data.onEdit}
          >
            ✎
          </Button>

          {/* Delete button in top-right corner */}
          <Button
            isIconOnly
            className="absolute top-0 right-0 min-w-5 w-5 h-5 text-xs z-10"
            color="danger"
            size="sm"
            variant="light"
            onPress={data.onDelete}
          >
            ×
          </Button>

          {/* Node name input centered */}
          <div className="flex items-center justify-center h-full pt-2">
            <Input
              classNames={{
                input: "text-center text-xs",
              }}
              placeholder="Node name"
              size="sm"
              value={data.node.name}
              onChange={(e) => data.onNameChange(e.target.value)}
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default NetworkNode;
