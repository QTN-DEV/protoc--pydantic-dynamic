import React from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";

import { AttributeType, PydanticAttribute } from "../types/pydantic";
import { usePydanticFlow } from "../contexts/PydanticFlowContext";

interface AttributeNodeData {
  attribute: PydanticAttribute;
  isNested?: boolean;
}

const AttributeNode: React.FC<NodeProps> = ({ data, id }) => {
  const nodeData = data as unknown as AttributeNodeData;
  const { attribute, isNested } = nodeData;
  const { addAttribute, updateAttribute, removeAttribute } = usePydanticFlow();

  return (
    <div className="min-w-[300px]">
      <Handle position={Position.Top} type="target" />

      <div
        className={`shadow-lg bg-white rounded-lg ${isNested ? "border-2 border-purple-200" : "border-2 border-green-200"}`}
      >
        <div className="p-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4
                className={`font-medium ${isNested ? "text-purple-600" : "text-green-600"}`}
              >
                {isNested ? "Nested Attribute" : "Attribute"}
              </h4>
              <button
                className="w-6 h-6 text-sm text-red-600 hover:text-red-700 transition-colors"
                onClick={() => removeAttribute(id)}
              >
                ×
              </button>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Name<span className="text-red-500">*</span>
              </label>
              <input
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="attribute name"
                value={attribute.name}
                onChange={(e) => updateAttribute(id, "name", e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Type
              </label>
              <select
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={attribute.type}
                onChange={(e) => {
                  const selectedType = e.target.value as AttributeType;
                  updateAttribute(id, "type", selectedType);
                }}
              >
                <option value={AttributeType.STRING}>String</option>
                <option value={AttributeType.INT}>Integer</option>
                <option value={AttributeType.FLOAT}>Float</option>
                <option value={AttributeType.BOOLEAN}>Boolean</option>
                <option value={AttributeType.LIST_STRING}>
                  List of String
                </option>
                <option value={AttributeType.NESTED}>Nested</option>
                <option value={AttributeType.LIST_NESTED}>
                  List of Nested
                </option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Default
              </label>
              <input
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Optional"
                value={attribute.defaultValue?.toString() || ""}
                onChange={(e) =>
                  updateAttribute(id, "defaultValue", e.target.value)
                }
              />
            </div>

            <div className="flex items-center justify-start">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  checked={attribute.nullable}
                  onChange={(e) =>
                    updateAttribute(id, "nullable", e.target.checked)
                  }
                />
                <span className="ml-2 text-sm text-gray-700">Nullable</span>
              </label>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Description<span className="text-red-500">*</span>
              </label>
              <textarea
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Describe this attribute"
                rows={2}
                value={attribute.description}
                onChange={(e) =>
                  updateAttribute(id, "description", e.target.value)
                }
              />
            </div>

            {(attribute.type === AttributeType.NESTED ||
              attribute.type === AttributeType.LIST_NESTED) && (
              <button
                className="w-full px-4 py-2 text-sm rounded-lg font-medium transition-colors bg-purple-100 text-purple-700 hover:bg-purple-200"
                onClick={() => addAttribute(id, true)}
              >
                + Add Nested Attribute
              </button>
            )}
          </div>
        </div>
      </div>

      <Handle position={Position.Bottom} type="source" />
    </div>
  );
};

export default AttributeNode;
