import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  EdgeMouseHandler,
  ReactFlowProvider,
  MiniMap,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Button,
  Card,
  CardBody,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import { useNavigate } from "react-router-dom";
import { v7 as uuidv7 } from "uuid";

import NetworkNode from "@/components/ui/NetworkNode";
import ResponseSidebar from "@/components/ui/ResponseSidebar";
import { AIGeneratorCard } from "@/features/ai-generator/AIGeneratorCard";
import VersionHistoryList from "@/features/version-history/VersionHistoryList";
import EdgeEditorSidebar from "@/features/graph-editor/components/EdgeEditorSidebar";
import GraphNameEditor from "@/features/graph-editor/components/GraphNameEditor";
import HelpModal from "@/features/graph-editor/components/HelpModal";
import { apiService, GraphState } from "@/services/api";
import { NetworkNodeData } from "@/types/node";
import { getEdgeType, createEdgeConfig } from "@/utils/edge";
import { useGraphVersion } from "@/hooks/useGraphVersion";
import {
  NODE_DIMENSIONS,
  AUTOSAVE_DELAY_MS,
  STORAGE_KEYS,
} from "@/constants/graph";

const nodeTypes = {
  networkNode: NetworkNode,
};

interface GraphEditorInnerProps {
  graph: GraphState;
  onSave: (
    nodes: Node[],
    edges: Edge[],
    name?: string,
    systemPrompt?: string,
  ) => Promise<void>;
}

const GraphEditorInner: React.FC<GraphEditorInnerProps> = ({
  graph,
  onSave,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(graph.edges);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [graphName, setGraphName] = useState(graph.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempGraphName, setTempGraphName] = useState(graph.name);
  const [systemPrompt, setSystemPrompt] = useState(graph.system_prompt || "");
  const [generationResponse, setGenerationResponse] = useState<any>(null);

  const {
    isOpen: isHelpOpen,
    onOpen: onHelpOpen,
    onOpenChange: onHelpOpenChange,
  } = useDisclosure();
  const {
    isOpen: isVersionHistoryOpen,
    onOpen: onVersionHistoryOpen,
    onOpenChange: onVersionHistoryOpenChange,
  } = useDisclosure();
  const {
    isOpen: isAIGeneratorOpen,
    onOpen: onAIGeneratorOpen,
    onOpenChange: onAIGeneratorOpenChange,
  } = useDisclosure();

  const { getViewport } = useReactFlow();
  const navigate = useNavigate();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Graph version management
  const onRestoreNodes = useCallback(
    (
      restoredNodes: Node[],
      restoredEdges: Edge[],
      updateNodeName: (id: string, name: string) => void,
      onEditNode: (id: string) => void,
      onDeleteNode: (id: string) => void,
    ) => {
      const nodesWithCallbacks = restoredNodes.map((node: any) => ({
        ...node,
        data: {
          node: node.data.node || { id: node.id, name: "" },
          onNameChange: (name: string) => updateNodeName(node.id, name),
          onEdit: () => onEditNode(node.id),
          onDelete: () => onDeleteNode(node.id),
        },
      }));

      setNodes(nodesWithCallbacks);
      setEdges(restoredEdges);
      onVersionHistoryOpenChange();
    },
    [setNodes, setEdges, onVersionHistoryOpenChange],
  );

  const {
    latestVersion,
    isPublishing,
    handlePublish,
    handleRestoreVersion,
    handleDeleteVersion,
    handleSetActiveVersion,
  } = useGraphVersion({
    graphId: graph.graph_id,
    onRestoreNodes,
  });

  // Node management
  const handleEditNode = useCallback(
    async (nodeId: string) => {
      try {
        navigate(`/${graph.graph_id}/${nodeId}`);
      } catch (error) {
        console.error("Failed to save graph before editing:", error);
      }
    },
    [graph, navigate],
  );

  const updateNodeName = useCallback((nodeId: string, name: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          const nodeData = node.data as unknown as NetworkNodeData;

          return {
            ...node,
            data: {
              ...nodeData,
              node: { ...nodeData.node, name },
            },
          };
        }

        return node;
      }),
    );
  }, [setNodes]);

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      );
    },
    [setNodes, setEdges],
  );

  const addNodeAtViewportCenter = useCallback(() => {
    const viewport = getViewport();
    const centerPosition = {
      x:
        -viewport.x / viewport.zoom +
        window.innerWidth / 2 / viewport.zoom -
        NODE_DIMENSIONS.WIDTH / 2,
      y:
        -viewport.y / viewport.zoom +
        window.innerHeight / 2 / viewport.zoom -
        NODE_DIMENSIONS.HEIGHT / 2,
    };

    const id = uuidv7();
    const newNode: Node = {
      id,
      type: "networkNode",
      position: centerPosition,
      data: {
        node: { id, name: "" },
        onNameChange: (name: string) => updateNodeName(id, name),
        onEdit: () => handleEditNode(id),
        onDelete: () => deleteNode(id),
      },
    };

    setNodes((nds) => [...nds, newNode]);
  }, [getViewport, updateNodeName, handleEditNode, deleteNode, setNodes]);

  // Edge management
  const onConnect = useCallback(
    (params: any) => {
      if (!params.source || !params.target) return;

      const existingReverseEdge = edges.find(
        (edge) =>
          edge.source === params.target && edge.target === params.source,
      );

      if (existingReverseEdge) {
        setEdges((eds) =>
          eds.map((edge) => {
            if (edge.id === existingReverseEdge.id) {
              return {
                ...edge,
                ...createEdgeConfig("two-way", false),
              };
            }

            return edge;
          }),
        );

        return;
      }

      const edgeId = `${params.source}-${params.target}`;

      setEdges((eds) =>
        eds.filter(
          (edge) =>
            !(edge.source === params.source && edge.target === params.target),
        ),
      );

      const newEdge: Edge = {
        ...params,
        id: edgeId,
        ...createEdgeConfig("one-way", false),
      } as Edge;

      setEdges((eds) => [...eds, newEdge]);
    },
    [edges, setEdges],
  );

  const onEdgeClick: EdgeMouseHandler = useCallback(
    (event, edge) => {
      event.stopPropagation();
      setSelectedEdge(edge);
      setEdges((eds) =>
        eds.map((e) => ({
          ...e,
          ...createEdgeConfig(getEdgeType(e), e.id === edge.id),
        })),
      );
    },
    [setEdges],
  );

  const closeEdgeEditor = useCallback(() => {
    setSelectedEdge(null);
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        ...createEdgeConfig(getEdgeType(e), false),
      })),
    );
  }, [setEdges]);

  const toggleEdgeType = useCallback(() => {
    if (!selectedEdge) return;

    const currentType = getEdgeType(selectedEdge);
    const newType = currentType === "one-way" ? "two-way" : "one-way";

    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === selectedEdge.id) {
          return {
            ...edge,
            ...createEdgeConfig(newType, true),
          };
        }

        return edge;
      }),
    );

    setSelectedEdge({
      ...selectedEdge,
      ...createEdgeConfig(newType, true),
    });
  }, [selectedEdge, setEdges]);

  const reverseEdge = useCallback(() => {
    if (!selectedEdge) return;

    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === selectedEdge.id) {
          return {
            ...edge,
            source: edge.target,
            target: edge.source,
          };
        }

        return edge;
      }),
    );

    setSelectedEdge({
      ...selectedEdge,
      source: selectedEdge.target,
      target: selectedEdge.source,
    });
  }, [selectedEdge, setEdges]);

  const onPaneClick = useCallback(() => {
    if (selectedEdge) {
      closeEdgeEditor();
    }
  }, [selectedEdge, closeEdgeEditor]);

  // Graph name management
  const handleNameClick = useCallback(() => {
    setTempGraphName(graphName);
    setIsEditingName(true);
  }, [graphName]);

  const handleSaveGraphName = useCallback(async () => {
    if (tempGraphName.trim() === "") {
      setIsEditingName(false);

      return;
    }

    try {
      setGraphName(tempGraphName);
      await onSave(nodes, edges, tempGraphName, systemPrompt);
      setIsEditingName(false);
    } catch (error) {
      console.error("Failed to save graph name:", error);
      setIsEditingName(false);
    }
  }, [tempGraphName, nodes, edges, systemPrompt, onSave]);

  const handleCancelNameEdit = useCallback(() => {
    setTempGraphName(graphName);
    setIsEditingName(false);
  }, [graphName]);

  // Check for first visit
  useEffect(() => {
    const hasVisited = localStorage.getItem(STORAGE_KEYS.HAS_VISITED);

    if (!hasVisited) {
      onHelpOpen();
      localStorage.setItem(STORAGE_KEYS.HAS_VISITED, "true");
    }
  }, [onHelpOpen]);

  // Load graph state on mount
  useEffect(() => {
    const loadGraphState = async () => {
      try {
        if (graph.nodes.length > 0 || graph.edges.length > 0) {
          const restoredNodes = graph.nodes.map((node: any) => ({
            ...node,
            data: {
              node: node.data.node || { id: node.id, name: "" },
              onNameChange: (name: string) => updateNodeName(node.id, name),
              onEdit: () => handleEditNode(node.id),
              onDelete: () => deleteNode(node.id),
            },
          }));

          setNodes(restoredNodes);
        }

        setIsLoaded(true);
      } catch (error) {
        console.error("Failed to load graph:", error);
        setIsLoaded(true);
      }
    };

    loadGraphState();
  }, [graph.graph_id]);

  // Autosave
  useEffect(() => {
    if (!isLoaded) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await onSave(nodes, edges, graphName, systemPrompt);
      } catch (error) {
        console.error("Failed to save graph:", error);
      }
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [nodes, edges, graphName, systemPrompt, isLoaded, onSave]);

  if (!isLoaded) {
    return null;
  }

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* Graph Name Display */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <GraphNameEditor
          isEditing={isEditingName}
          name={isEditingName ? tempGraphName : graphName}
          onCancel={handleCancelNameEdit}
          onNameChange={setTempGraphName}
          onNameClick={handleNameClick}
          onSave={handleSaveGraphName}
        />

        {/* Latest Version Display */}
        {latestVersion !== null && (
          <Card
            isPressable
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onPress={onVersionHistoryOpen}
          >
            <CardBody className="px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Latest Version:</span>
                <span className="text-sm font-semibold text-blue-600">
                  v{latestVersion}
                </span>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Floating Add Node Button */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
        <Button
          isIconOnly
          className="shadow-lg"
          color="primary"
          size="lg"
          onPress={addNodeAtViewportCenter}
        >
          +
        </Button>
      </div>

      {/* AI Generator and Publish Buttons */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <Button
          isIconOnly
          className="shadow-lg bg-purple-500 text-white h-10 w-10"
          onPress={onAIGeneratorOpen}
        >
          ✨
        </Button>
        <Button
          className="shadow-lg text-white px-8"
          color="success"
          isDisabled={isPublishing}
          isLoading={isPublishing}
          onPress={handlePublish}
        >
          Publish
        </Button>
      </div>

      {/* Edge Editor Sidebar */}
      {selectedEdge && (
        <EdgeEditorSidebar
          edge={selectedEdge}
          nodes={nodes}
          onClose={closeEdgeEditor}
          onReverse={reverseEdge}
          onToggleType={toggleEdgeType}
        />
      )}

      <ReactFlow
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        edges={edges}
        edgesReconnectable={false}
        elementsSelectable={true}
        fitView={true}
        nodeTypes={nodeTypes}
        nodes={nodes}
        nodesConnectable={true}
        nodesDraggable={true}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onEdgesChange={onEdgesChange}
        onNodesChange={onNodesChange}
        onPaneClick={onPaneClick}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>

      {/* Help Button */}
      <div className="absolute bottom-4 right-4 z-20">
        <Button
          isIconOnly
          className="shadow-lg bg-blue-500 text-white"
          size="lg"
          onPress={onHelpOpen}
        >
          ?
        </Button>
      </div>

      {/* AI Generator Modal */}
      <AIGeneratorCard
        graphId={graph.graph_id}
        isOpen={isAIGeneratorOpen}
        systemPrompt={systemPrompt}
        onBeforeGenerate={async () => {
          await onSave(nodes, edges, graphName, systemPrompt);
        }}
        onGenerate={async (prompt) => {
          const result = await apiService.generateFromGraph(
            graph.graph_id,
            prompt,
          );

          setGenerationResponse(result);
          onAIGeneratorOpenChange();
        }}
        onOpenChange={onAIGeneratorOpenChange}
        onSystemPromptChange={setSystemPrompt}
      />

      {/* Response Sidebar */}
      {generationResponse && (
        <ResponseSidebar
          response={generationResponse}
          onClose={() => setGenerationResponse(null)}
        />
      )}

      {/* Version History Modal */}
      <Modal
        isOpen={isVersionHistoryOpen}
        scrollBehavior="inside"
        size="xl"
        onOpenChange={onVersionHistoryOpenChange}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Version History</ModalHeader>
              <ModalBody>
                <VersionHistoryList
                  graphId={graph.graph_id}
                  onDelete={handleDeleteVersion}
                  onRestore={(version) =>
                    handleRestoreVersion(
                      version,
                      updateNodeName,
                      handleEditNode,
                      deleteNode,
                    )
                  }
                  onSetActive={handleSetActiveVersion}
                />
              </ModalBody>
              <ModalFooter>
                <Button color="primary" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Help Modal */}
      <HelpModal isOpen={isHelpOpen} onOpenChange={onHelpOpenChange} />
    </div>
  );
};

interface GraphEditorProps {
  graph: GraphState;
  onSave: (
    nodes: Node[],
    edges: Edge[],
    name?: string,
    systemPrompt?: string,
  ) => Promise<void>;
}

const GraphEditor: React.FC<GraphEditorProps> = ({ graph, onSave }) => {
  return (
    <ReactFlowProvider>
      <GraphEditorInner graph={graph} onSave={onSave} />
    </ReactFlowProvider>
  );
};

export default GraphEditor;
