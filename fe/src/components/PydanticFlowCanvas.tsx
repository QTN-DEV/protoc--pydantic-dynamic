import React, { useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Textarea, Button } from "@heroui/react";
import Swal from "sweetalert2";
import { v7 as uuidv7 } from "uuid";

import ClassDefinitionNode from "./ClassDefinitionNode";
import AttributeNode from "./AttributeNode";
import HierarchySidebar from "./HierarchySidebar";
import ResponseSidebar from "./ResponseSidebar";

import {
  PydanticClassRequest,
  GenerateResponse,
  PydanticAttribute,
  AttributeType,
} from "@/types/pydantic";

const nodeTypes = {
  classDefinition: ClassDefinitionNode,
  attribute: AttributeNode,
};

interface PydanticFlowCanvasProps {
  onSubmit: (data: PydanticClassRequest) => Promise<GenerateResponse>;
  isLoading: boolean;
}

const PydanticFlowCanvas: React.FC<PydanticFlowCanvasProps> = ({
  onSubmit,
  isLoading,
}) => {
  const [prompt, setPrompt] = useState("");
  const [className, setClassName] = useState("");
  const [classDescription, setClassDescription] = useState("");
  const [apiResponse, setApiResponse] = useState<any>(null);

  const initialNodes: Node[] = [];
  const initialEdges: Edge[] = [];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Initialize nodes after state setup
  React.useEffect(() => {
    setNodes([
      {
        id: "class-definition",
        type: "classDefinition",
        position: { x: 400, y: 50 },
        data: {
          className,
          classDescription,
          onClassNameChange: setClassName,
          onClassDescriptionChange: setClassDescription,
          onAddAttribute: () => addAttribute(),
        },
      },
    ]);
  }, []);

  // Update class definition node data when state changes
  React.useEffect(() => {
    setNodes((prev) =>
      prev.map((node) => {
        if (node.id === "class-definition") {
          return {
            ...node,
            data: {
              ...node.data,
              className,
              classDescription,
              onClassNameChange: setClassName,
              onClassDescriptionChange: setClassDescription,
              onAddAttribute: () => addAttribute(),
            },
          };
        }

        return node;
      }),
    );
  }, [className, classDescription]);

  const addAttribute = (parentId = "class-definition", isNested = false) => {
    const newAttributeId = `attribute-${uuidv7()}`;

    const newAttribute: PydanticAttribute = {
      name: "",
      type: AttributeType.STRING,
      nullable: false,
      description: "",
      defaultValue: "",
    };

    // Get current state for calculations
    const parentNode = nodes.find((n) => n.id === parentId);
    const siblingAttributes = nodes.filter(
      (n) =>
        n.type === "attribute" &&
        edges.some((e) => e.source === parentId && e.target === n.id),
    );

    let position;

    if (parentNode) {
      if (parentId === "class-definition") {
        // For main attributes, position them in a row below the class
        const baseX = 100;
        const baseY = parentNode.position.y + 250;

        position = {
          x: baseX + siblingAttributes.length * 450,
          y: baseY,
        };
      } else {
        // For nested attributes, position them below the parent attribute
        const baseX = parentNode.position.x;
        const baseY = parentNode.position.y + 250;

        position = {
          x: baseX + siblingAttributes.length * 450,
          y: baseY,
        };
      }
    } else {
      position = { x: 200, y: 300 };
    }

    const newNode: Node = {
      id: newAttributeId,
      type: "attribute",
      position,
      data: {
        attribute: newAttribute,
        onAttributeChange: (field: keyof PydanticAttribute, value: any) =>
          updateAttribute(newAttributeId, field, value),
        onAddNestedAttribute: () => addAttribute(newAttributeId, true),
        onRemoveAttribute: () => removeAttribute(newAttributeId),
        isNested,
      },
    };

    const newEdge: Edge = {
      id: `${parentId}-${newAttributeId}`,
      source: parentId,
      target: newAttributeId,
      type: "default",
      animated: true,
      style: {
        strokeDasharray: "5,5",
        animation: "dash 1s linear infinite",
      },
    };

    // Add both node and edge
    setNodes((prev) => [...prev, newNode]);
    setEdges((prev) => [...prev, newEdge]);
  };

  const updateAttribute = (
    nodeId: string,
    field: keyof PydanticAttribute,
    value: any,
  ) => {
    setNodes((prev) =>
      prev.map((node) => {
        if (node.id === nodeId && node.type === "attribute") {
          const currentAttribute = node.data.attribute as PydanticAttribute;
          const updatedAttribute = { ...currentAttribute, [field]: value };

          // Clear nested attributes if type is no longer NESTED
          if (
            field === "type" &&
            value !== AttributeType.NESTED &&
            value !== AttributeType.LIST_NESTED
          ) {
            updatedAttribute.nestedAttributes = undefined;
          }

          return {
            ...node,
            data: {
              ...node.data,
              attribute: updatedAttribute,
            },
          };
        }

        return node;
      }),
    );
  };

  const removeAttribute = (nodeId: string) => {
    // Remove the node and all its edges
    setNodes((prev) => prev.filter((node) => node.id !== nodeId));
    setEdges((prev) =>
      prev.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
    );
  };

  const collectFormData = (): Omit<PydanticClassRequest, "prompt"> => {
    const attributeNodes = nodes.filter((n) => n.type === "attribute");
    const attributes: PydanticAttribute[] = [];

    // Process main attributes (not nested)
    const mainAttributes = attributeNodes.filter((n) => {
      const isDirectChild = edges.some(
        (e) => e.source === "class-definition" && e.target === n.id,
      );

      return isDirectChild;
    });

    mainAttributes.forEach((attributeNode) => {
      const attribute = { ...(attributeNode.data as any).attribute };

      // If this attribute has nested attributes
      if (
        attribute.type === AttributeType.NESTED ||
        attribute.type === AttributeType.LIST_NESTED
      ) {
        const nestedAttributeNodes = attributeNodes.filter((n) => {
          return edges.some(
            (e) => e.source === attributeNode.id && e.target === n.id,
          );
        });

        attribute.nestedAttributes = nestedAttributeNodes.map((nestedNode) => ({
          ...(nestedNode.data as any).attribute,
        }));
      }

      attributes.push(attribute);
    });

    return {
      className,
      classDescription: classDescription || undefined,
      attributes: attributes.map((attr) => ({
        ...attr,
        defaultValue: attr.defaultValue || null,
        nestedAttributes: attr.nestedAttributes || undefined,
      })),
    };
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Missing Prompt",
        text: "Please enter a prompt",
      });

      return;
    }

    if (!className.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Missing Class Name",
        text: "Please fill in class name",
      });

      return;
    }

    const attributeNodes = nodes.filter((n) => n.type === "attribute");
    const hasIncompleteAttributes = attributeNodes.some((node) => {
      const attr = (node.data as any).attribute;

      return !attr.name.trim() || !attr.description.trim();
    });

    if (hasIncompleteAttributes) {
      Swal.fire({
        icon: "warning",
        title: "Incomplete Attributes",
        text: "Please fill in all attribute names and descriptions",
      });

      return;
    }

    try {
      const formData = collectFormData();
      const response = await onSubmit({
        ...formData,
        prompt,
      });

      setApiResponse(response);

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

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* CSS for dashed animation */}
      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -10;
          }
        }
      `}</style>

      {/* Hierarchy Sidebar */}
      <HierarchySidebar className={className} edges={edges} nodes={nodes} />

      {/* Response Sidebar */}
      {apiResponse && (
        <ResponseSidebar
          response={apiResponse}
          onClose={() => setApiResponse(null)}
        />
      )}

      {/* Fixed Prompt Input */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-3xl px-4">
        <Textarea
          className="bg-white/95 backdrop-blur-sm shadow-lg rounded-lg"
          label="Prompt"
          minRows={3}
          placeholder="Describe what you want OpenAI to generate using your Pydantic class..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-4 right-4 z-10">
        <Button
          className="shadow-lg"
          color="primary"
          isLoading={isLoading}
          size="lg"
          onPress={handleSubmit}
        >
          {isLoading ? "Generating..." : "Generate with OpenAI"}
        </Button>
      </div>

      <ReactFlow
        fitView
        attributionPosition="bottom-left"
        defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
        edges={edges}
        edgesFocusable={false}
        edgesReconnectable={false}
        elementsSelectable={true}
        nodeTypes={nodeTypes}
        nodes={nodes}
        nodesDraggable={true}
        onEdgesChange={onEdgesChange}
        onNodesChange={onNodesChange}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default PydanticFlowCanvas;
