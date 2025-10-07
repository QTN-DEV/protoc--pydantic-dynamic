import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  Handle,
  Position,
  EdgeMouseHandler,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Button,
  Card,
  CardBody,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import { v7 as uuidv7 } from "uuid";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

import { apiService, VersionHistory } from "@/services/api";

interface NetworkNode {
  id: string;
  name: string;
}

interface NetworkNodeData {
  node: NetworkNode;
  onNameChange: (name: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}

const NetworkNodeComponent: React.FC<{ data: NetworkNodeData }> = ({
  data,
}) => {
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

const nodeTypes = {
  networkNode: NetworkNodeComponent,
};

interface VersionHistoryListProps {
  graphId: string;
  onRestore: (version: number) => void;
}

const VersionHistoryList: React.FC<VersionHistoryListProps> = ({
  graphId,
  onRestore,
}) => {
  const [versions, setVersions] = useState<VersionHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadVersions = async () => {
      try {
        const versionHistory = await apiService.getVersionHistory(graphId, 5);

        setVersions(versionHistory);
      } catch (error) {
        console.error("Failed to load version history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadVersions();
  }, [graphId]);

  if (isLoading) {
    return <div className="text-center py-4">Loading versions...</div>;
  }

  if (versions.length === 0) {
    return (
      <div className="text-center py-4 text-gray-600">
        No published versions yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {versions.map((version) => (
        <Card key={version.version} className="border border-gray-200">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Version {version.version}
                </h3>
                <p className="text-sm text-gray-600">{version.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Published:{" "}
                  {new Date(version.published_at).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
              <Button
                color="primary"
                size="sm"
                onPress={() => onRestore(version.version)}
              >
                Restore
              </Button>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
};

type ConnectionType = "one-way" | "two-way";

// Edge color constants
const EDGE_COLORS = {
  ONE_WAY: "#1976d2", // Blue for one-way edges
  TWO_WAY: "#d32f2f", // Red for two-way edges
} as const;

interface PCDNetworkGraphEditorInnerProps {
  graphId: string;
}

const PCDNetworkGraphEditorInner: React.FC<PCDNetworkGraphEditorInnerProps> = ({
  graphId,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [connectionType, setConnectionType] =
    useState<ConnectionType>("one-way");

  setConnectionType; // Use the variable to avoid unused warning
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [graphName, setGraphName] = useState("Untitled Graph");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempGraphName, setTempGraphName] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [latestVersion, setLatestVersion] = useState<number | null>(null);
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
  const { getViewport, setViewport } = useReactFlow();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleEditNode = useCallback(
    async (nodeId: string) => {
      try {
        const viewport = getViewport();

        await apiService.saveGraph(graphId, nodes, edges, viewport);
        navigate(`/${graphId}/${nodeId}`);
      } catch (error) {
        console.error("Failed to save graph before editing:", error);
      }
    },
    [graphId, nodes, edges, getViewport, navigate],
  );

  const addNodeAtViewportCenter = useCallback(() => {
    const viewport = getViewport();
    const nodeWidth = 192; // Node is 192x96px (w-48 h-24)
    const nodeHeight = 96;
    const centerPosition = {
      x:
        -viewport.x / viewport.zoom +
        window.innerWidth / 2 / viewport.zoom -
        nodeWidth / 2,
      y:
        -viewport.y / viewport.zoom +
        window.innerHeight / 2 / viewport.zoom -
        nodeHeight / 2,
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
  }, [getViewport, setNodes, handleEditNode]);

  const addNode = useCallback(
    (
      position: { x: number; y: number } = {
        x: Math.random() * 500 + 100,
        y: Math.random() * 300 + 100,
      },
    ) => {
      const id = uuidv7();
      const newNode: Node = {
        id,
        type: "networkNode",
        position,
        data: {
          node: { id, name: "" },
          onNameChange: (name: string) => updateNodeName(id, name),
          onEdit: () => handleEditNode(id),
          onDelete: () => deleteNode(id),
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes, handleEditNode],
  );

  addNode; // Use the variable to avoid unused warning

  const updateNodeName = useCallback(
    (nodeId: string, name: string) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            const nodeData = node.data as unknown as NetworkNodeData;

            return {
              ...node,
              data: {
                ...nodeData,
                node: { ...nodeData.node, name },
                onNameChange: (newName: string) =>
                  updateNodeName(nodeId, newName),
                onEdit: () => handleEditNode(nodeId),
                onDelete: () => deleteNode(nodeId),
              },
            };
          }

          return node;
        }),
      );
    },
    [setNodes, handleEditNode],
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      );
    },
    [setNodes, setEdges],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;

      // Check if there's already a connection in the opposite direction
      const existingReverseEdge = edges.find(
        (edge) =>
          edge.source === params.target && edge.target === params.source,
      );

      if (existingReverseEdge) {
        // Convert the existing one-way edge to two-way
        setEdges((eds) =>
          eds.map((edge) => {
            if (edge.id === existingReverseEdge.id) {
              return {
                ...edge,
                animated: true,
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 20,
                  height: 20,
                  color: EDGE_COLORS.TWO_WAY,
                },
                markerStart: {
                  type: MarkerType.ArrowClosed,
                  width: 20,
                  height: 20,
                  color: EDGE_COLORS.TWO_WAY,
                },
                style: {
                  stroke: EDGE_COLORS.TWO_WAY,
                  strokeWidth: 2,
                  strokeOpacity: 1,
                  strokeDasharray: "10,5",
                  animation: "dash 1s linear infinite",
                },
              };
            }

            return edge;
          }),
        );

        return; // Don't create a new edge
      }

      const edgeId = `${params.source}-${params.target}`;

      // Remove any existing edges between these nodes (same direction)
      setEdges((eds) =>
        eds.filter(
          (edge) =>
            !(edge.source === params.source && edge.target === params.target),
        ),
      );

      let newEdge: Edge;

      switch (connectionType) {
        case "one-way":
          newEdge = {
            ...params,
            id: edgeId,
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: EDGE_COLORS.ONE_WAY,
            },
            style: {
              stroke: EDGE_COLORS.ONE_WAY,
              strokeWidth: 2,
              strokeOpacity: 1,
              strokeDasharray: "10,5",
              animation: "dash 1s linear infinite",
            },
          } as Edge;
          break;

        case "two-way":
          newEdge = {
            ...params,
            id: edgeId,
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: EDGE_COLORS.TWO_WAY,
            },
            markerStart: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: EDGE_COLORS.TWO_WAY,
            },
            style: {
              stroke: EDGE_COLORS.TWO_WAY,
              strokeWidth: 2,
              strokeOpacity: 1,
              strokeDasharray: "10,5",
              animation: "dash 1s linear infinite",
            },
          } as Edge;
          break;

        default:
          return;
      }

      setEdges((eds) => addEdge(newEdge, eds));
    },
    [connectionType, setEdges, edges],
  );

  const clearGraph = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedEdge(null);
  }, [setNodes, setEdges]);

  clearGraph; // Use the variable to avoid unused warning

  const onEdgeClick: EdgeMouseHandler = useCallback(
    (event, edge) => {
      event.stopPropagation();
      setSelectedEdge(edge);
      // Update all edges to show selection state - non-selected are dashed/animated, selected is solid
      setEdges((eds) =>
        eds.map((e) => ({
          ...e,
          animated: e.id !== edge.id, // Animate non-selected edges
          style: {
            ...e.style,
            strokeDasharray: e.id !== edge.id ? "10,5" : undefined, // Dashed border for non-selected
            animation: e.id !== edge.id ? "dash 1s linear infinite" : undefined,
            strokeWidth: e.id === edge.id ? 3 : 2, // Thicker stroke for selected
          },
        })),
      );
    },
    [setEdges],
  );

  const updateEdgeType = useCallback(
    (edgeId: string, newType: ConnectionType) => {
      setEdges((eds) =>
        eds.map((edge) => {
          if (edge.id === edgeId) {
            const updatedEdge = { ...edge };
            const isSelected = selectedEdge?.id === edgeId;

            if (newType === "one-way") {
              updatedEdge.markerEnd = {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: EDGE_COLORS.ONE_WAY,
              };
              updatedEdge.markerStart = undefined;
              updatedEdge.style = {
                stroke: EDGE_COLORS.ONE_WAY,
                strokeWidth: isSelected ? 3 : 2,
                strokeOpacity: 1,
                strokeDasharray: isSelected ? undefined : "10,5",
                animation: isSelected ? undefined : "dash 1s linear infinite",
              };
              updatedEdge.animated = !isSelected;
            } else {
              updatedEdge.markerEnd = {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: EDGE_COLORS.TWO_WAY,
              };
              updatedEdge.markerStart = {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: EDGE_COLORS.TWO_WAY,
              };
              updatedEdge.style = {
                stroke: EDGE_COLORS.TWO_WAY,
                strokeWidth: isSelected ? 3 : 2,
                strokeOpacity: 1,
                strokeDasharray: isSelected ? undefined : "10,5",
                animation: isSelected ? undefined : "dash 1s linear infinite",
              };
              updatedEdge.animated = !isSelected;
            }

            return updatedEdge;
          }

          return edge;
        }),
      );

      // Update selected edge reference with the new markers to reflect correct type
      setSelectedEdge((prev) => {
        if (prev && prev.id === edgeId) {
          const updatedSelectedEdge = { ...prev };

          if (newType === "one-way") {
            updatedSelectedEdge.markerStart = undefined;
            updatedSelectedEdge.markerEnd = {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: EDGE_COLORS.ONE_WAY,
            };
          } else {
            updatedSelectedEdge.markerEnd = {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: EDGE_COLORS.TWO_WAY,
            };
            updatedSelectedEdge.markerStart = {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: EDGE_COLORS.TWO_WAY,
            };
          }

          return updatedSelectedEdge;
        }

        return prev;
      });
    },
    [setEdges, selectedEdge],
  );

  const reverseEdge = useCallback(
    (edgeId: string) => {
      setEdges((eds) =>
        eds.map((edge) => {
          if (edge.id === edgeId) {
            const updatedEdge = {
              ...edge,
              source: edge.target,
              target: edge.source,
            };

            return updatedEdge;
          }

          return edge;
        }),
      );

      // Update selected edge reference
      setSelectedEdge((prev) => {
        if (prev && prev.id === edgeId) {
          return {
            ...prev,
            source: prev.target,
            target: prev.source,
          };
        }

        return prev;
      });
    },
    [setEdges],
  );

  const closeEdgeEditor = useCallback(() => {
    setSelectedEdge(null);
    // Reset all edges to default styling (dashed, animated)
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        animated: true,
        style: {
          ...e.style,
          strokeDasharray: "10,5",
          animation: "dash 1s linear infinite",
          strokeWidth: 2,
        },
      })),
    );
  }, [setEdges]);

  // Determine current edge type based on markers
  const getCurrentEdgeType = (edge: Edge): ConnectionType => {
    return edge.markerStart ? "two-way" : "one-way";
  };

  // Handle clicking on the pane (empty area) to deselect edges
  const onPaneClick = useCallback(() => {
    if (selectedEdge) {
      closeEdgeEditor();
    }
  }, [selectedEdge, closeEdgeEditor]);

  // Handle clicking on graph name to edit
  const handleNameClick = useCallback(() => {
    setTempGraphName(graphName);
    setIsEditingName(true);
  }, [graphName]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Handle saving graph name
  const handleSaveGraphName = useCallback(async () => {
    if (tempGraphName.trim() === "") {
      setIsEditingName(false);

      return;
    }

    try {
      setGraphName(tempGraphName);
      const viewport = getViewport();

      await apiService.saveGraph(
        graphId,
        nodes,
        edges,
        viewport,
        tempGraphName,
      );
      setIsEditingName(false);
    } catch (error) {
      console.error("Failed to save graph name:", error);
      setIsEditingName(false);
    }
  }, [tempGraphName, graphId, nodes, edges, getViewport]);

  // Handle canceling name edit
  const handleCancelNameEdit = useCallback(() => {
    setTempGraphName(graphName);
    setIsEditingName(false);
  }, [graphName]);

  // Handle restoring a version
  const handleRestoreVersion = useCallback(
    async (version: number) => {
      try {
        const result = await Swal.fire({
          icon: "warning",
          title: "Restore Version?",
          text: `Are you sure you want to restore version ${version}? This will replace your current work.`,
          showCancelButton: true,
          confirmButtonText: "Yes, restore it",
          cancelButtonText: "Cancel",
        });

        if (!result.isConfirmed) return;

        const graphState = await apiService.restoreVersion(graphId, version);

        // Restore nodes with proper callbacks
        const restoredNodes = graphState.nodes.map((node: any) => ({
          ...node,
          data: {
            node: node.data.node || { id: node.id, name: "" },
            onNameChange: (name: string) => updateNodeName(node.id, name),
            onEdit: () => handleEditNode(node.id),
            onDelete: () => deleteNode(node.id),
          },
        }));

        setNodes(restoredNodes);
        setEdges(graphState.edges);

        // Restore viewport if available
        if (graphState.viewport) {
          setViewport(graphState.viewport, { duration: 300 });
        }

        // Close the modal
        onVersionHistoryOpenChange();

        await Swal.fire({
          icon: "success",
          title: "Restored!",
          text: `Version ${version} has been restored successfully.`,
          confirmButtonText: "OK",
        });
      } catch (error) {
        console.error("Failed to restore version:", error);
        await Swal.fire({
          icon: "error",
          title: "Restore Failed",
          text: "Failed to restore version. Please try again.",
          confirmButtonText: "OK",
        });
      }
    },
    [
      graphId,
      onVersionHistoryOpenChange,
      setNodes,
      setEdges,
      setViewport,
      updateNodeName,
      handleEditNode,
      deleteNode,
    ],
  );

  // Handle publishing graph
  const handlePublish = useCallback(async () => {
    setIsPublishing(true);
    try {
      const result = await apiService.publishGraph(graphId);

      // Update latest version after successful publish
      setLatestVersion(result.version);

      await Swal.fire({
        icon: "success",
        title: "Published!",
        text: `${result.message} - Version ${result.version}`,
        confirmButtonText: "OK",
      });
    } catch (error) {
      console.error("Failed to publish graph:", error);
      await Swal.fire({
        icon: "error",
        title: "Publish Failed",
        text: "Failed to publish graph. Please try again.",
        confirmButtonText: "OK",
      });
    } finally {
      setIsPublishing(false);
    }
  }, [graphId]);

  // Check for first visit and show help modal
  useEffect(() => {
    const hasVisited = localStorage.getItem("pcdnge_visited");

    if (!hasVisited) {
      onHelpOpen();
      localStorage.setItem("pcdnge_visited", "true");
    }
  }, [onHelpOpen]);

  // Load graph state on mount
  useEffect(() => {
    const loadGraphState = async () => {
      try {
        const graphState = await apiService.loadGraph(graphId);

        // Set graph name
        setGraphName(graphState.name);
        setTempGraphName(graphState.name);

        if (graphState.nodes.length > 0 || graphState.edges.length > 0) {
          // Restore nodes with proper callbacks
          const restoredNodes = graphState.nodes.map((node: any) => ({
            ...node,
            data: {
              node: node.data.node || { id: node.id, name: "" },
              onNameChange: (name: string) => updateNodeName(node.id, name),
              onEdit: () => handleEditNode(node.id),
              onDelete: () => deleteNode(node.id),
            },
          }));

          setNodes(restoredNodes);
          setEdges(graphState.edges);

          // Restore viewport if available
          if (graphState.viewport) {
            setTimeout(() => {
              setViewport(graphState.viewport!, { duration: 300 });
            }, 100);
          }
        }

        // Load latest version
        try {
          const versionInfo = await apiService.getLatestVersion(graphId);

          setLatestVersion(versionInfo.version);
        } catch (error) {
          console.error("Failed to load version info:", error);
        }

        setIsLoaded(true);
      } catch (error) {
        console.error("Failed to load graph:", error);
        setIsLoaded(true);
      }
    };

    loadGraphState();
  }, [graphId]);

  // Autosave graph state
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isLoaded) return; // Don't save until initial load is complete

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save by 1 second
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const viewport = getViewport();

        await apiService.saveGraph(graphId, nodes, edges, viewport);
      } catch (error) {
        console.error("Failed to save graph:", error);
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [nodes, edges, isLoaded, graphId, getViewport]);

  // Save viewport changes separately with debounce
  const viewportTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const onMoveEnd = useCallback(() => {
    if (!isLoaded) return;

    if (viewportTimeoutRef.current) {
      clearTimeout(viewportTimeoutRef.current);
    }

    viewportTimeoutRef.current = setTimeout(async () => {
      try {
        const viewport = getViewport();

        await apiService.saveGraph(graphId, nodes, edges, viewport);
      } catch (error) {
        console.error("Failed to save viewport:", error);
      }
    }, 1000);
  }, [isLoaded, graphId, nodes, edges, getViewport]);

  // Don't render until graph is loaded to prevent autosave of empty canvas
  if (!isLoaded) {
    return null;
  }

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* Graph Name Display */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-gray-200">
          {isEditingName ? (
            <input
              ref={nameInputRef}
              className="text-lg font-semibold text-gray-800 bg-transparent border-none outline-none focus:ring-0"
              style={{ minWidth: "200px" }}
              type="text"
              value={tempGraphName}
              onBlur={handleSaveGraphName}
              onChange={(e) => setTempGraphName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveGraphName();
                } else if (e.key === "Escape") {
                  handleCancelNameEdit();
                }
              }}
            />
          ) : (
            <button
              className="text-lg font-semibold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors bg-transparent border-none"
              tabIndex={0}
              type="button"
              onClick={handleNameClick}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleNameClick();
                }
              }}
            >
              {graphName}
            </button>
          )}
        </div>

        {/* Latest Version Display */}
        {latestVersion !== null && (
          <Card
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            isPressable
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

      {/* Publish Button */}
      <div className="absolute top-4 right-4 z-20">
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
        <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-10 bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-lg w-80">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Edge Editor</h3>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={closeEdgeEditor}
              >
                ×
              </Button>
            </div>

            <div className="text-sm text-gray-600">
              Connection:{" "}
              <span className="font-medium">
                {
                  (
                    nodes.find((node) => node.id === selectedEdge.source)
                      ?.data as unknown as NetworkNodeData
                  )?.node.name
                }{" "}
                →{" "}
                {
                  (
                    nodes.find((node) => node.id === selectedEdge.target)
                      ?.data as unknown as NetworkNodeData
                  )?.node.name
                }
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                color={
                  getCurrentEdgeType(selectedEdge) === "two-way"
                    ? "success"
                    : "primary"
                }
                variant="flat"
                onPress={() => {
                  const currentType = getCurrentEdgeType(selectedEdge);
                  const newType =
                    currentType === "one-way" ? "two-way" : "one-way";

                  updateEdgeType(selectedEdge.id, newType);
                }}
              >
                {getCurrentEdgeType(selectedEdge) === "one-way"
                  ? "Make Two-Way (↔)"
                  : "Make One-Way (→)"}
              </Button>
            </div>

            <Button
              color="primary"
              variant="flat"
              onPress={() => reverseEdge(selectedEdge.id)}
            >
              Reverse Connection
            </Button>
          </div>
        </div>
      )}

      <ReactFlow
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        edges={edges}
        edgesReconnectable={false}
        elementsSelectable={true}
        fitView={!isLoaded}
        nodeTypes={nodeTypes}
        nodes={nodes}
        nodesConnectable={true}
        nodesDraggable={true}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onEdgesChange={onEdgesChange}
        onMoveEnd={onMoveEnd}
        onNodesChange={onNodesChange}
        onPaneClick={onPaneClick}
      >
        <Background />
        <Controls />
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
                  graphId={graphId}
                  onRestore={handleRestoreVersion}
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
      <Modal
        isOpen={isHelpOpen}
        scrollBehavior="inside"
        size="2xl"
        onOpenChange={onHelpOpenChange}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold">Welcome to PCDNGE!</h2>
                <p className="text-sm text-gray-600">
                  Pydantic Class Definition Network Graph Editor
                </p>
              </ModalHeader>
              <ModalBody className="max-h-[60vh] overflow-y-auto">
                <div className="space-y-4">
                  <section>
                    <h3 className="text-lg font-semibold mb-2">
                      🎯 How It Works
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 pl-4">
                      <li>
                        Create nodes by clicking the <strong>+</strong> button
                        at the top center
                      </li>
                      <li>
                        Each node represents a class definition in your network
                        graph
                      </li>
                      <li>
                        Click and drag nodes to reposition them on the canvas
                      </li>
                      <li>Your changes are automatically saved every second</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-2">
                      🔗 Connecting Nodes
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 pl-4">
                      <li>
                        Drag from a node&apos;s handle (blue circles on sides)
                        to another node to create a connection
                      </li>
                      <li>
                        <span className="text-blue-600 font-medium">
                          Blue arrows
                        </span>{" "}
                        = One-way connection
                      </li>
                      <li>
                        <span className="text-red-600 font-medium">
                          Red arrows
                        </span>{" "}
                        = Two-way connection
                      </li>
                      <li>
                        Click on any edge to edit it - you can change direction
                        or make it two-way
                      </li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-2">✏️ Editing</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 pl-4">
                      <li>
                        Click the graph name (top-left) to rename your project
                      </li>
                      <li>Click the node name to edit it directly</li>
                      <li>
                        Delete nodes using the × button in the top-right corner
                        of each node
                      </li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-2">
                      📤 Publishing
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 pl-4">
                      <li>
                        Click the{" "}
                        <strong className="text-green-600">Publish</strong>{" "}
                        button (top-right) to create a versioned snapshot
                      </li>
                      <li>
                        Each publish creates a new version (v1, v2, v3...)
                      </li>
                      <li>
                        Published versions are immutable - you can continue
                        editing while keeping stable snapshots
                      </li>
                      <li>
                        Use published versions in production while working on
                        the next iteration
                      </li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-2">💡 Tips</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 pl-4">
                      <li>
                        Zoom in/out using your mouse wheel or the controls
                        (bottom-left)
                      </li>
                      <li>
                        Pan around by clicking and dragging on the empty canvas
                      </li>
                      <li>
                        Your viewport position and zoom level are saved
                        automatically
                      </li>
                    </ul>
                  </section>

                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                    <p className="text-sm text-blue-700">
                      <strong>💡 Need help later?</strong> You can always reopen
                      this guide by clicking the help button (?) in the
                      bottom-right corner.
                    </p>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="primary" onPress={onClose}>
                  Got it!
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

interface PCDNetworkGraphEditorProps {
  graphId: string;
}

const PCDNetworkGraphEditor: React.FC<PCDNetworkGraphEditorProps> = ({
  graphId,
}) => {
  return (
    <ReactFlowProvider>
      <PCDNetworkGraphEditorInner graphId={graphId} />
    </ReactFlowProvider>
  );
};

export default PCDNetworkGraphEditor;
