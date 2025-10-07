import React, { useState } from "react";
import Swal from "sweetalert2";

import {
  AttributeType,
  PydanticAttribute,
  PydanticClassRequest,
  GenerateResponse,
} from "@/types/pydantic";

interface PydanticFormProps {
  onSubmit: (
    data: Omit<PydanticClassRequest, "prompt">,
  ) => Promise<GenerateResponse>;
  isLoading: boolean;
  prompt: string;
  onPromptChange: (prompt: string) => void;
}

const PydanticForm: React.FC<PydanticFormProps> = ({ onSubmit }) => {
  const [className, setClassName] = useState("");
  const [classDescription, setClassDescription] = useState("");
  const [attributes, setAttributes] = useState<PydanticAttribute[]>([
    {
      name: "",
      type: AttributeType.STRING,
      nullable: false,
      description: "",
      defaultValue: "",
    },
  ]);
  const [result, setResult] = useState<GenerateResponse | null>(null);

  const addAttribute = () => {
    setAttributes([
      ...attributes,
      {
        name: "",
        type: AttributeType.STRING,
        nullable: false,
        description: "",
        defaultValue: "",
      },
    ]);
  };

  const removeAttribute = (index: number) => {
    if (attributes.length > 1) {
      setAttributes(attributes.filter((_, i) => i !== index));
    }
  };

  const updateAttribute = (
    index: number,
    field: keyof PydanticAttribute,
    value: any,
  ) => {
    const newAttributes = [...attributes];

    newAttributes[index] = { ...newAttributes[index], [field]: value };

    if (
      field === "type" &&
      value !== AttributeType.NESTED &&
      value !== AttributeType.LIST_NESTED
    ) {
      newAttributes[index].nestedAttributes = undefined;
    }

    setAttributes(newAttributes);
  };

  const addNestedAttribute = (parentIndex: number) => {
    const newAttributes = [...attributes];

    if (!newAttributes[parentIndex].nestedAttributes) {
      newAttributes[parentIndex].nestedAttributes = [];
    }
    newAttributes[parentIndex].nestedAttributes!.push({
      name: "",
      type: AttributeType.STRING,
      nullable: false,
      description: "",
      defaultValue: "",
    });
    setAttributes(newAttributes);
  };

  const updateNestedAttribute = (
    parentIndex: number,
    nestedIndex: number,
    field: keyof PydanticAttribute,
    value: any,
  ) => {
    const newAttributes = [...attributes];

    if (newAttributes[parentIndex].nestedAttributes) {
      newAttributes[parentIndex].nestedAttributes![nestedIndex] = {
        ...newAttributes[parentIndex].nestedAttributes![nestedIndex],
        [field]: value,
      };
    }
    setAttributes(newAttributes);
  };

  const removeNestedAttribute = (parentIndex: number, nestedIndex: number) => {
    const newAttributes = [...attributes];

    if (
      newAttributes[parentIndex].nestedAttributes &&
      newAttributes[parentIndex].nestedAttributes!.length > 1
    ) {
      newAttributes[parentIndex].nestedAttributes = newAttributes[
        parentIndex
      ].nestedAttributes!.filter((_, i) => i !== nestedIndex);
    }
    setAttributes(newAttributes);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!className.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Missing Information",
        text: "Please fill in class name",
      });

      return;
    }

    if (
      attributes.some((attr) => !attr.name.trim() || !attr.description.trim())
    ) {
      Swal.fire({
        icon: "warning",
        title: "Incomplete Attributes",
        text: "Please fill in all attribute names and descriptions",
      });

      return;
    }

    try {
      const response = await onSubmit({
        className,
        classDescription: classDescription || undefined,
        attributes: attributes.map((attr) => ({
          ...attr,
          defaultValue: attr.defaultValue || null,
          nestedAttributes: attr.nestedAttributes || undefined,
        })),
      });

      setResult(response);

      // Show success message
      Swal.fire({
        icon: "success",
        title: "Success!",
        text: "OpenAI has generated your response successfully.",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error:", error);
      Swal.fire({
        icon: "error",
        title: "Generation Failed",
        text:
          error instanceof Error
            ? error.message
            : "Error generating response. Please check the backend logs.",
        footer:
          "Make sure the backend server is running and your OpenAI API key is configured.",
      });
    }
  };

  const renderAttribute = (
    attr: PydanticAttribute,
    index: number,
    isNested = false,
    parentIndex?: number,
  ) => (
    <div
      key={isNested ? `${parentIndex}-${index}` : index}
      className="border rounded-lg p-3 mb-3 bg-gray-50"
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">
          {isNested ? "Nested" : "Attribute"} {index + 1}
        </span>
        {((isNested &&
          parentIndex !== undefined &&
          attributes[parentIndex].nestedAttributes &&
          attributes[parentIndex].nestedAttributes!.length > 1) ||
          (!isNested && attributes.length > 1)) && (
          <button
            className="px-3 py-1 text-sm rounded-lg font-medium transition-colors text-red-600 hover:text-red-700"
            onClick={() =>
              isNested && parentIndex !== undefined
                ? removeNestedAttribute(parentIndex, index)
                : removeAttribute(index)
            }
          >
            ×
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Name<span className="text-red-500">*</span>
          </label>
          <input
            required
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="name"
            value={attr.name}
            onChange={(e) =>
              isNested && parentIndex !== undefined
                ? updateNestedAttribute(
                    parentIndex,
                    index,
                    "name",
                    e.target.value,
                  )
                : updateAttribute(index, "name", e.target.value)
            }
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Type
          </label>
          <select
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={attr.type}
            onChange={(e) => {
              const selectedType = e.target.value as AttributeType;

              isNested && parentIndex !== undefined
                ? updateNestedAttribute(parentIndex, index, "type", selectedType)
                : updateAttribute(index, "type", selectedType);
            }}
          >
            <option value={AttributeType.STRING}>String</option>
            <option value={AttributeType.INT}>Integer</option>
            <option value={AttributeType.LIST_STRING}>
              List of String
            </option>
            {!isNested && (
              <option value={AttributeType.NESTED}>Nested</option>
            )}
            {!isNested && (
              <option value={AttributeType.LIST_NESTED}>
                List of Nested
              </option>
            )}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Default
          </label>
          <input
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Optional"
            value={attr.defaultValue?.toString() || ""}
            onChange={(e) =>
              isNested && parentIndex !== undefined
                ? updateNestedAttribute(
                    parentIndex,
                    index,
                    "defaultValue",
                    e.target.value,
                  )
                : updateAttribute(index, "defaultValue", e.target.value)
            }
          />
        </div>

        <div className="flex items-center justify-center">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              checked={attr.nullable}
              onChange={(e) =>
                isNested && parentIndex !== undefined
                  ? updateNestedAttribute(parentIndex, index, "nullable", e.target.checked)
                  : updateAttribute(index, "nullable", e.target.checked)
              }
            />
            <span className="ml-2 text-sm text-gray-700">Nullable</span>
          </label>
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Description<span className="text-red-500">*</span>
        </label>
        <input
          required
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Describe this attribute"
          value={attr.description}
          onChange={(e) =>
            isNested && parentIndex !== undefined
              ? updateNestedAttribute(
                  parentIndex,
                  index,
                  "description",
                  e.target.value,
                )
              : updateAttribute(index, "description", e.target.value)
          }
        />
      </div>

      {!isNested &&
        (attr.type === AttributeType.NESTED ||
          attr.type === AttributeType.LIST_NESTED) && (
          <div className="mt-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">
                Nested Attributes
              </span>
              <button
                className="px-3 py-1 text-sm rounded-lg font-medium transition-colors text-blue-600 hover:text-blue-700"
                onClick={() => addNestedAttribute(index)}
              >
                + Add
              </button>
            </div>
            <div className="ml-4 border-l-2 border-blue-200 pl-3">
              {attr.nestedAttributes?.map((nestedAttr, nestedIndex) =>
                renderAttribute(nestedAttr, nestedIndex, true, index),
              )}
            </div>
          </div>
        )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        <div className="p-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Class Definition Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Class Name<span className="text-red-500">*</span>
                </label>
                <input
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., User, Product, Order"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Class Description (optional)
                </label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of this class"
                  value={classDescription}
                  onChange={(e) => setClassDescription(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Attributes</h3>
                <button
                  className="px-3 py-1 text-sm rounded-lg font-medium transition-colors text-blue-600 hover:text-blue-700"
                  type="button"
                  onClick={addAttribute}
                >
                  + Add Attribute
                </button>
              </div>

              <div className="space-y-2">
                {attributes.map((attr, index) => renderAttribute(attr, index))}
              </div>
            </div>
          </form>

          {result && (
            <div className="mt-8">
              <hr className="mb-6 border-gray-200" />
              <h2 className="text-xl font-semibold mb-4">Generated Result</h2>
              <div className="space-y-4">
                <div>
                  <span className="inline-block px-3 py-1 text-sm font-medium rounded-md bg-blue-100 text-blue-700">
                    Generated Class: {result.generatedClass}
                  </span>
                </div>
                <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                  <div className="p-4">
                    <pre className="whitespace-pre-wrap text-sm">
                      {JSON.stringify(result.result, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PydanticForm;
