import React, { useState } from "react";
import {
  Card,
  CardBody,
  Input,
  Button,
  Select,
  SelectItem,
  Checkbox,
  Divider,
  Chip,
} from "@heroui/react";
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

    if (field === "type" && value !== AttributeType.NESTED) {
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
          <Button
            color="danger"
            size="sm"
            variant="light"
            onClick={() =>
              isNested && parentIndex !== undefined
                ? removeNestedAttribute(parentIndex, index)
                : removeAttribute(index)
            }
          >
            ×
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <Input
          required
          label="Name"
          placeholder="name"
          size="sm"
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

        <Select
          label="Type"
          placeholder="Select type"
          selectedKeys={[attr.type]}
          size="sm"
          onSelectionChange={(keys) => {
            const selectedType = Array.from(keys)[0] as AttributeType;

            isNested && parentIndex !== undefined
              ? updateNestedAttribute(parentIndex, index, "type", selectedType)
              : updateAttribute(index, "type", selectedType);
          }}
        >
          <SelectItem key={AttributeType.STRING}>String</SelectItem>
          <SelectItem key={AttributeType.INT}>Integer</SelectItem>
          {!isNested ? (
            <SelectItem key={AttributeType.NESTED}>Nested</SelectItem>
          ) : null}
        </Select>

        <Input
          label="Default"
          placeholder="Optional"
          size="sm"
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

        <div className="flex items-center justify-center">
          <Checkbox
            isSelected={attr.nullable}
            size="sm"
            onValueChange={(checked) =>
              isNested && parentIndex !== undefined
                ? updateNestedAttribute(parentIndex, index, "nullable", checked)
                : updateAttribute(index, "nullable", checked)
            }
          >
            Nullable
          </Checkbox>
        </div>
      </div>

      <Input
        required
        label="Description"
        placeholder="Describe this attribute"
        size="sm"
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

      {!isNested && attr.type === AttributeType.NESTED && (
        <div className="mt-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">
              Nested Attributes
            </span>
            <Button
              color="primary"
              size="sm"
              variant="light"
              onClick={() => addNestedAttribute(index)}
            >
              + Add
            </Button>
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
      <Card>
        <CardBody>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Class Definition Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                required
                label="Class Name"
                placeholder="e.g., User, Product, Order"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
              />

              <Input
                label="Class Description (optional)"
                placeholder="Brief description of this class"
                value={classDescription}
                onChange={(e) => setClassDescription(e.target.value)}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Attributes</h3>
                <Button
                  color="primary"
                  size="sm"
                  type="button"
                  variant="light"
                  onClick={addAttribute}
                >
                  + Add Attribute
                </Button>
              </div>

              <div className="space-y-2">
                {attributes.map((attr, index) => renderAttribute(attr, index))}
              </div>
            </div>
          </form>

          {result && (
            <div className="mt-8">
              <Divider className="mb-6" />
              <h2 className="text-xl font-semibold mb-4">Generated Result</h2>
              <div className="space-y-4">
                <div>
                  <Chip color="primary" variant="flat">
                    Generated Class: {result.generatedClass}
                  </Chip>
                </div>
                <Card>
                  <CardBody>
                    <pre className="whitespace-pre-wrap text-sm">
                      {JSON.stringify(result.result, null, 2)}
                    </pre>
                  </CardBody>
                </Card>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default PydanticForm;
