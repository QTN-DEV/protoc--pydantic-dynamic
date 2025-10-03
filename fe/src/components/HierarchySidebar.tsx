import React from "react";
import { Chip } from "@heroui/react";
import { Node, Edge } from "@xyflow/react";

import { PydanticAttribute } from "@/types/pydantic";

interface HierarchySidebarProps {
  nodes: Node[];
  edges: Edge[];
  className: string;
}

const HierarchySidebar: React.FC<HierarchySidebarProps> = ({
  nodes,
  edges,
  className,
}) => {
  const attributeNodes = nodes.filter((n) => n.type === "attribute");

  const buildHierarchy = () => {
    const mainAttributes = attributeNodes.filter((n) =>
      edges.some((e) => e.source === "class-definition" && e.target === n.id),
    );

    return mainAttributes.map((attrNode) => {
      const attribute = (attrNode.data as any).attribute as PydanticAttribute;
      const nestedAttributes = attributeNodes.filter((n) =>
        edges.some((e) => e.source === attrNode.id && e.target === n.id),
      );

      return {
        node: attrNode,
        attribute,
        nested: nestedAttributes.map((nestedNode) => ({
          node: nestedNode,
          attribute: (nestedNode.data as any).attribute as PydanticAttribute,
        })),
      };
    });
  };

  const hierarchy = buildHierarchy();

  return (
    <div className="fixed left-4 top-4 z-20 w-80 h-[80vh] overflow-y-auto border rounded-lg p-4 bg-white/80 backdrop-blur-sm">
      <div className="space-y-3">
        <div className="border-b pb-2">
          <h3 className="font-semibold text-primary-600 flex items-center gap-2">
            🏗️ Class Structure
          </h3>
        </div>

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
              {hierarchy.map((item, index) => (
                <div key={item.node.id} className="space-y-1">
                  <div className="flex items-center gap-2 justify-between">
                    <div className="text-sm font-medium text-success-700">
                      {item.attribute.name || `Attribute ${index + 1}`}
                    </div>
                    <div className="flex gap-1">
                      <Chip color="success" size="sm" variant="flat">
                        {item.attribute.type}
                      </Chip>
                      {item.attribute.nullable && (
                        <Chip color="warning" size="sm" variant="flat">
                          Nullable
                        </Chip>
                      )}
                    </div>
                  </div>

                  {/* Nested Attributes */}
                  {item.nested.length > 0 && (
                    <div className="ml-6 space-y-1">
                      {item.nested.map((nestedItem, nestedIndex) => (
                        <div
                          key={nestedItem.node.id}
                          className="flex items-center gap-2 justify-between"
                        >
                          <div className="text-xs font-medium text-secondary-700">
                            {nestedItem.attribute.name ||
                              `Nested ${nestedIndex + 1}`}
                          </div>
                          <div className="flex gap-1">
                            <Chip color="secondary" size="sm" variant="flat">
                              {nestedItem.attribute.type}
                            </Chip>
                            {nestedItem.attribute.nullable && (
                              <Chip color="warning" size="sm" variant="flat">
                                Nullable
                              </Chip>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
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
  );
};

export default HierarchySidebar;
