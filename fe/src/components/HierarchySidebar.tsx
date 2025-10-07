import React, { useState } from "react";
import { Node, Edge } from "@xyflow/react";

import { PydanticAttribute } from "../types/pydantic";

interface HierarchySidebarProps {
  nodes: Node[];
  edges: Edge[];
  className: string;
  onNodeClick?: (nodeId: string) => void;
}

interface HierarchyNode {
  node: Node;
  attribute: PydanticAttribute;
  children: HierarchyNode[];
}

const HierarchySidebar: React.FC<HierarchySidebarProps> = ({
  nodes,
  edges,
  className,
  onNodeClick,
}) => {
  const [isMinimized, setIsMinimized] = useState(true);
  const attributeNodes = nodes.filter((n) => n.type === "attribute");

  const buildHierarchy = (): HierarchyNode[] => {
    // Recursive function to build hierarchy for a node
    const buildNodeHierarchy = (nodeId: string): HierarchyNode | null => {
      const node = attributeNodes.find((n) => n.id === nodeId);

      if (!node) return null;

      const attribute = (node.data as any).attribute as PydanticAttribute;

      // Find all children of this node
      const childIds = edges
        .filter((e) => e.source === nodeId)
        .map((e) => e.target);

      // Recursively build hierarchy for children
      const children = childIds
        .map((childId) => buildNodeHierarchy(childId))
        .filter((child): child is HierarchyNode => child !== null);

      return {
        node,
        attribute,
        children,
      };
    };

    // Find main attributes (children of class-definition)
    const mainAttributeIds = edges
      .filter((e) => e.source === "class-definition")
      .map((e) => e.target);

    // Build hierarchy for each main attribute
    return mainAttributeIds
      .map((id) => buildNodeHierarchy(id))
      .filter((node): node is HierarchyNode => node !== null);
  };

  const hierarchy = buildHierarchy();

  // Recursive component to render a hierarchy node and its children
  const renderHierarchyNode = (
    hierarchyNode: HierarchyNode,
    level: number,
    index: number,
  ): React.ReactNode => {
    const colors = [
      { text: "text-success-700", chip: "success" },
      { text: "text-secondary-700", chip: "secondary" },
      { text: "text-primary-700", chip: "primary" },
      { text: "text-purple-700", chip: "default" },
      { text: "text-pink-700", chip: "default" },
    ];

    const colorScheme = colors[Math.min(level, colors.length - 1)];

    const textSize = level === 0 ? "text-sm" : "text-xs";

    return (
      <div key={hierarchyNode.node.id} className="space-y-1">
        <div className="flex items-center gap-2 justify-between">
          <button
            className={`${textSize} font-medium ${colorScheme.text} hover:underline cursor-pointer bg-transparent border-none p-0 text-left`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNodeClick?.(hierarchyNode.node.id);
            }}
          >
            {hierarchyNode.attribute.name || `Attribute ${index + 1}`}
          </button>
          <div className="flex gap-1">
            <span className={`px-2 py-0.5 text-xs rounded-md ${
              colorScheme.chip === 'success' ? 'bg-green-100 text-green-700' :
              colorScheme.chip === 'secondary' ? 'bg-gray-100 text-gray-700' :
              colorScheme.chip === 'primary' ? 'bg-blue-100 text-blue-700' :
              'bg-purple-100 text-purple-700'
            }`}>
              {hierarchyNode.attribute.type}
            </span>
            {hierarchyNode.attribute.nullable && (
              <span className="px-2 py-0.5 text-xs rounded-md bg-yellow-100 text-yellow-700">
                Nullable
              </span>
            )}
          </div>
        </div>

        {/* Recursively render children */}
        {hierarchyNode.children.length > 0 && (
          <div className="ml-6 space-y-1">
            {hierarchyNode.children.map((child, childIndex) =>
              renderHierarchyNode(child, level + 1, childIndex),
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`fixed top-4 z-20 w-80 h-[80vh] border border-gray-300 rounded-lg bg-white/80 backdrop-blur-sm transition-all duration-300 ${
        isMinimized
          ? "left-[-310px] hover:left-[-305px] cursor-pointer overflow-y-hidden"
          : "left-4 overflow-y-auto"
      }`}
      onClick={isMinimized ? () => setIsMinimized(false) : undefined}
    >
      <div className="p-4 relative">
        <div className="space-y-3">
          {/* Minimize Button */}
          {!isMinimized && (
            <div className="absolute top-2 right-2">
              <button
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
                onClick={() => {
                  setIsMinimized(true);
                }}
              >
                ←
              </button>
            </div>
          )}

          {/* Class Node */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div>
                <div className="font-medium text-primary-700">
                  {className || "Untitled Class"}
                </div>
              </div>
            </div>

            {/* Main Attributes */}
            {hierarchy.length > 0 && (
              <div className="ml-4 space-y-1">
                {hierarchy.map((item, index) =>
                  renderHierarchyNode(item, 0, index),
                )}
              </div>
            )}

            {hierarchy.length === 0 && (
              <div className="ml-6 text-sm text-gray-500 italic">
                No attributes defined
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HierarchySidebar;
