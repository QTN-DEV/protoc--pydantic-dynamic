import React from "react";
import { Edge, Node } from "@xyflow/react";
import { Button } from "@heroui/react";

import { NetworkNodeData } from "@/types/node";
import { getEdgeType } from "@/utils/edge";

interface EdgeEditorSidebarProps {
  edge: Edge;
  nodes: Node[];
  onClose: () => void;
  onToggleType: () => void;
  onReverse: () => void;
}

const EdgeEditorSidebar: React.FC<EdgeEditorSidebarProps> = ({
  edge,
  nodes,
  onClose,
  onToggleType,
  onReverse,
}) => {
  const edgeType = getEdgeType(edge);
  const sourceNode = nodes.find((node) => node.id === edge.source);
  const targetNode = nodes.find((node) => node.id === edge.target);

  return (
    <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-10 bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-lg w-80">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Edge Editor</h3>
          <Button isIconOnly size="sm" variant="light" onPress={onClose}>
            ×
          </Button>
        </div>

        <div className="text-sm text-gray-600">
          Connection:{" "}
          <span className="font-medium">
            {(sourceNode?.data as unknown as NetworkNodeData)?.node.name} →{" "}
            {(targetNode?.data as unknown as NetworkNodeData)?.node.name}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            color={edgeType === "two-way" ? "success" : "primary"}
            variant="flat"
            onPress={onToggleType}
          >
            {edgeType === "one-way"
              ? "Make Two-Way (↔)"
              : "Make One-Way (→)"}
          </Button>
        </div>

        <Button color="primary" variant="flat" onPress={onReverse}>
          Reverse Connection
        </Button>
      </div>
    </div>
  );
};

export default EdgeEditorSidebar;
