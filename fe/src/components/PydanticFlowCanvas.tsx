import React, { useState, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Swal from "sweetalert2";
import { v7 as uuidv7 } from "uuid";

import ClassDefinitionNode from "./ClassDefinitionNode";
import AttributeNode from "./AttributeNode";
import HierarchySidebar from "./HierarchySidebar";
import ResponseSidebar from "@/components/ui/ResponseSidebar";

import {
  PydanticClassRequest,
  GenerateResponse,
  PydanticAttribute,
  AttributeType,
} from "@/types/pydantic";
import { apiService } from "@/services/api";
import { PydanticFlowProvider } from "@/contexts/PydanticFlowContext";

const nodeTypes = {
  classDefinition: ClassDefinitionNode,
  attribute: AttributeNode,
};

/**
 * Calculate tree layout positions for nodes
 * Arranges nodes in a hierarchical tree structure with smart horizontal spacing
 */
const calculateTreeLayout = (nodes: Node[], edges: Edge[]): Node[] => {
  const NODE_WIDTH = 400; // Approximate width of a single node
  const MIN_SIBLING_GAP = 50; // Minimum gap between siblings
  const FIRST_LEVEL_SPACING = 350; // Space from root to first level
  const NESTED_LEVEL_SPACING = 500; // Space for nested levels
  const ROOT_X = 400;
  const ROOT_Y = 50;

  // Create a map to track processed nodes
  const nodesWithPosition = new Map<string, Node>();

  // Find root node (class-definition)
  const rootNode = nodes.find((n) => n.id === "class-definition");

  if (!rootNode) return nodes;

  // Build adjacency map for children
  const childrenMap = new Map<string, string[]>();

  edges.forEach((edge) => {
    const children = childrenMap.get(edge.source) || [];

    children.push(edge.target);
    childrenMap.set(edge.source, children);
  });

  // Calculate subtree width for each node (bottom-up)
  const subtreeWidths = new Map<string, number>();

  const calculateSubtreeWidth = (nodeId: string): number => {
    const childIds = childrenMap.get(nodeId) || [];

    if (childIds.length === 0) {
      // Leaf node - just its own width
      subtreeWidths.set(nodeId, NODE_WIDTH);

      return NODE_WIDTH;
    }

    // Calculate width needed for all children
    let totalChildrenWidth = 0;

    childIds.forEach((childId, index) => {
      const childWidth = calculateSubtreeWidth(childId);

      totalChildrenWidth += childWidth;

      // Add gap between siblings (but not after last child)
      if (index < childIds.length - 1) {
        totalChildrenWidth += MIN_SIBLING_GAP;
      }
    });

    // Subtree width is the max of node width and total children width
    const width = Math.max(NODE_WIDTH, totalChildrenWidth);

    subtreeWidths.set(nodeId, width);

    return width;
  };

  // Calculate all subtree widths starting from leaves
  calculateSubtreeWidth("class-definition");

  // Position root node
  nodesWithPosition.set(rootNode.id, {
    ...rootNode,
    position: { x: ROOT_X, y: ROOT_Y },
  });

  // Calculate positions recursively based on parent position and subtree widths
  const calculateLevel = (
    parentId: string,
    parentX: number,
    parentY: number,
    isFirstLevel: boolean,
  ) => {
    const childIds = childrenMap.get(parentId) || [];

    if (childIds.length === 0) return;

    // Use different spacing for first level vs nested levels
    const verticalSpacing = isFirstLevel
      ? FIRST_LEVEL_SPACING
      : NESTED_LEVEL_SPACING;

    // Position children relative to parent's Y position
    const childY = parentY + verticalSpacing;

    // Calculate total width needed for all children
    let totalChildrenWidth = 0;

    childIds.forEach((childId, index) => {
      const childWidth = subtreeWidths.get(childId) || NODE_WIDTH;

      totalChildrenWidth += childWidth;

      if (index < childIds.length - 1) {
        totalChildrenWidth += MIN_SIBLING_GAP;
      }
    });

    // Start positioning from the left edge
    let currentX = parentX - totalChildrenWidth / 2;

    childIds.forEach((childId) => {
      const childNode = nodes.find((n) => n.id === childId);

      if (!childNode) return;

      const childWidth = subtreeWidths.get(childId) || NODE_WIDTH;

      // Position child at the center of its allocated width
      const childCenterX = currentX + childWidth / 2;

      nodesWithPosition.set(childId, {
        ...childNode,
        position: { x: childCenterX, y: childY },
      });

      // Recursively position this child's children (no longer first level)
      calculateLevel(childId, childCenterX, childY, false);

      // Move to next sibling's position
      currentX += childWidth + MIN_SIBLING_GAP;
    });
  };

  // Start from root level
  calculateLevel("class-definition", ROOT_X, ROOT_Y, true);

  // Return nodes with calculated positions, preserving order
  return nodes.map((node) => nodesWithPosition.get(node.id) || node);
};

interface PydanticFlowCanvasProps {
  onSubmit: (data: PydanticClassRequest) => Promise<GenerateResponse>;
  isLoading: boolean;
  initialClassName?: string;
  initialClassDescription?: string;
  nodeId?: string;
  graphId?: string;
}

interface PydanticFlowCanvasInnerProps extends PydanticFlowCanvasProps {
  innerRef?: React.MutableRefObject<{
    addAttribute: (parentId: string, isNested?: boolean) => void;
    updateAttribute: (
      nodeId: string,
      field: keyof PydanticAttribute,
      value: any,
    ) => void;
    removeAttribute: (nodeId: string) => void;
    updateClassName: (name: string) => void;
    updateClassDescription: (description: string) => void;
  } | null>;
}

const PydanticFlowCanvasInner: React.FC<PydanticFlowCanvasInnerProps> = ({
  onSubmit,
  isLoading,
  initialClassName = "",
  initialClassDescription = "",
  nodeId,
  graphId,
  innerRef,
}) => {
  const reactFlowInstance = useReactFlow();
  const [prompt, setPrompt] = useState("");
  const [className, setClassName] = useState(initialClassName);
  const [classDescription, setClassDescription] = useState(
    initialClassDescription,
  );
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const initialNodes: Node[] = [];
  const initialEdges: Edge[] = [];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Auto-save state
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedRef = useRef(false);

  // Unified callback functions
  const addAttribute = (parentId: string, isNested = false) => {
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
        const baseY = parentNode.position.y + 350; // First level spacing

        position = {
          x: baseX + siblingAttributes.length * 450,
          y: baseY,
        };
      } else {
        // For nested attributes, position them below the parent attribute
        const baseX = parentNode.position.x;
        const baseY = parentNode.position.y + 500; // Nested level spacing

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

  const updateClassName = (name: string) => {
    setClassName(name);
  };

  const updateClassDescription = (description: string) => {
    setClassDescription(description);
  };

  // Expose functions through ref
  useEffect(() => {
    if (innerRef) {
      innerRef.current = {
        addAttribute,
        updateAttribute,
        removeAttribute,
        updateClassName,
        updateClassDescription,
      };
    }
  }, [nodes, edges, innerRef]);

  // Load existing PCD data on mount
  useEffect(() => {
    const loadPCDData = async () => {
      if (!nodeId || !graphId) {
        // No nodeId/graphId, just initialize with default nodes
        setNodes([
          {
            id: "class-definition",
            type: "classDefinition",
            position: { x: 400, y: 50 },
            data: {
              className: initialClassName,
              classDescription: initialClassDescription,
            },
          },
        ]);
        setIsInitializing(false);
        hasLoadedRef.current = true;

        return;
      }

      try {
        const pcdData = await apiService.loadPCD(nodeId);

        // Load saved nodes and edges
        if (pcdData.nodes && pcdData.nodes.length > 0) {
          // Calculate tree layout positions (backend no longer stores positions)
          const nodesWithLayout = calculateTreeLayout(
            pcdData.nodes,
            pcdData.edges || [],
          );

          setNodes(nodesWithLayout);
          setEdges(pcdData.edges || []);

          // Use fitView to center the tree layout
          setTimeout(() => {
            reactFlowInstance.fitView({ padding: 0.2 });
          }, 0);
        } else {
          // No saved data, initialize with default nodes
          setNodes([
            {
              id: "class-definition",
              type: "classDefinition",
              position: { x: 400, y: 50 },
              data: {
                className: initialClassName,
                classDescription: initialClassDescription,
              },
            },
          ]);
        }
      } catch (error: any) {
        if (error.message === "PCD_NOT_FOUND") {
          // PCD doesn't exist yet, initialize with default nodes
          setNodes([
            {
              id: "class-definition",
              type: "classDefinition",
              position: { x: 400, y: 50 },
              data: {
                className: initialClassName,
                classDescription: initialClassDescription,
              },
            },
          ]);
        } else {
          console.error("Failed to load PCD data:", error);
        }
      } finally {
        setIsInitializing(false);
        hasLoadedRef.current = true;
      }
    };

    loadPCDData();
  }, []);

  // Auto-save functionality with debouncing
  useEffect(() => {
    // Don't auto-save if we haven't loaded yet or if nodeId/graphId are missing
    if (!hasLoadedRef.current || !nodeId || !graphId || isInitializing) {
      return;
    }

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save (1 second debounce)
    autoSaveTimeoutRef.current = setTimeout(() => {
      apiService
        .savePCD(nodeId, graphId, nodes, edges, className || "Untitled PCD")
        .catch((error) => {
          console.error("Auto-save failed:", error);
        });
    }, 1000);

    // Cleanup timeout on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [nodes, edges, nodeId, graphId, className, isInitializing]);

  // Update className and classDescription when initial props change
  React.useEffect(() => {
    if (initialClassName) {
      setClassName(initialClassName);
    }
  }, [initialClassName]);

  React.useEffect(() => {
    setClassDescription(initialClassDescription);
  }, [initialClassDescription]);

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
            },
          };
        }

        return node;
      }),
    );
  }, [className, classDescription]);

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
      <HierarchySidebar
        className={className}
        edges={edges}
        nodes={nodes}
        onNodeClick={(nodeId) => {
          const node = nodes.find((n) => n.id === nodeId);

          if (node) {
            // Get node dimensions (default to typical AttributeNode size if not measured yet)
            const nodeWidth = node.measured?.width || 350;
            const nodeHeight = node.measured?.height || 400;

            // Calculate center point of the node (position is top-left corner)
            const centerX = node.position.x + nodeWidth / 2;
            const centerY = node.position.y + nodeHeight / 2;

            reactFlowInstance.setCenter(centerX, centerY, {
              zoom: 0.8,
              duration: 800,
            });
          }
        }}
      />

      {/* Response Sidebar */}
      {apiResponse && (
        <ResponseSidebar
          response={apiResponse}
          onClose={() => setApiResponse(null)}
        />
      )}

      {/* Fixed Prompt Input */}
      <div className="hidden absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-3xl px-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Prompt
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white/95 backdrop-blur-sm shadow-lg"
            placeholder="Describe what you want OpenAI to generate using your Pydantic class..."
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="hidden fixed bottom-4 right-4 z-10">
        <button
          className="px-6 py-3 rounded-lg font-medium transition-colors shadow-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
          onClick={handleSubmit}
        >
          {isLoading ? "Generating..." : "Generate with OpenAI"}
        </button>
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
        <MiniMap />
      </ReactFlow>
    </div>
  );
};

const PydanticFlowCanvas: React.FC<PydanticFlowCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <PydanticFlowCanvasWithContext {...props} />
    </ReactFlowProvider>
  );
};

const PydanticFlowCanvasWithContext: React.FC<PydanticFlowCanvasProps> = (
  props,
) => {
  // This intermediate component has access to the inner component's functions
  // We need to expose them through context
  const innerRef = useRef<{
    addAttribute: (parentId: string, isNested?: boolean) => void;
    updateAttribute: (
      nodeId: string,
      field: keyof PydanticAttribute,
      value: any,
    ) => void;
    removeAttribute: (nodeId: string) => void;
    updateClassName: (name: string) => void;
    updateClassDescription: (description: string) => void;
  } | null>(null);

  return (
    <PydanticFlowProvider
      value={{
        addAttribute: (parentId, isNested) =>
          innerRef.current?.addAttribute(parentId, isNested),
        updateAttribute: (nodeId, field, value) =>
          innerRef.current?.updateAttribute(nodeId, field, value),
        removeAttribute: (nodeId) => innerRef.current?.removeAttribute(nodeId),
        updateClassName: (name) => innerRef.current?.updateClassName(name),
        updateClassDescription: (description) =>
          innerRef.current?.updateClassDescription(description),
      }}
    >
      <PydanticFlowCanvasInner {...props} innerRef={innerRef} />
    </PydanticFlowProvider>
  );
};

export default PydanticFlowCanvas;
