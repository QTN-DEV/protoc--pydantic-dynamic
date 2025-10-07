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
import { Button, Card, CardBody, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/react";
import { v7 as uuidv7 } from "uuid";
import Swal from "sweetalert2";
import { apiService } from "@/services/api";
import { useNavigate } from "react-router-dom";

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

const NetworkNodeComponent: React.FC<{ data: NetworkNodeData }> = ({ data }) => {
  return (
    <div className="relative">
      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: '18px',
          height: '18px',
          backgroundColor: '#3b82f6',
          border: '2px solid white'
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: '18px',
          height: '18px',
          backgroundColor: '#3b82f6',
          border: '2px solid white'
        }}
      />

      <Card className="w-48 h-24">
        <CardBody className="p-2 h-full relative">
          {/* Edit button in top-right corner (left of delete) */}
          <Button
            isIconOnly
            size="sm"
            color="primary"
            variant="light"
            className="absolute top-0 right-5 min-w-5 w-5 h-5 text-xs z-10"
            onPress={data.onEdit}
          >
            ✎
          </Button>

          {/* Delete button in top-right corner */}
          <Button
            isIconOnly
            size="sm"
            color="danger"
            variant="light"
            className="absolute top-0 right-0 min-w-5 w-5 h-5 text-xs z-10"
            onPress={data.onDelete}
          >
            ×
          </Button>

          {/* Node name input centered */}
          <div className="flex items-center justify-center h-full pt-2">
            <Input
              size="sm"
              placeholder="Node name"
              value={data.node.name}
              onChange={(e) => data.onNameChange(e.target.value)}
              classNames={{
                input: "text-center text-xs"
              }}
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

type ConnectionType = "one-way" | "two-way";

// Edge color constants
const EDGE_COLORS = {
  ONE_WAY: '#1976d2', // Blue for one-way edges
  TWO_WAY: '#d32f2f', // Red for two-way edges
} as const;

interface PCDNetworkGraphEditorInnerProps {
  graphId: string;
}

const PCDNetworkGraphEditorInner: React.FC<PCDNetworkGraphEditorInnerProps> = ({ graphId }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [connectionType, setConnectionType] = useState<ConnectionType>("one-way");
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [graphName, setGraphName] = useState("Untitled Graph");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempGraphName, setTempGraphName] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const { isOpen: isHelpOpen, onOpen: onHelpOpen, onOpenChange: onHelpOpenChange } = useDisclosure();
  const { getViewport, setViewport } = useReactFlow();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleEditNode = useCallback(async (nodeId: string) => {
    try {
      const viewport = getViewport();
      await apiService.saveGraph(graphId, nodes, edges, viewport);
      navigate(`/${graphId}/${nodeId}`);
    } catch (error) {
      console.error("Failed to save graph before editing:", error);
    }
  }, [graphId, nodes, edges, getViewport, navigate]);

  const addNodeAtViewportCenter = useCallback(() => {
    const viewport = getViewport();
    const nodeWidth = 192; // Node is 192x96px (w-48 h-24)
    const nodeHeight = 96;
    const centerPosition = {
      x: -viewport.x / viewport.zoom + (window.innerWidth / 2) / viewport.zoom - nodeWidth / 2,
      y: -viewport.y / viewport.zoom + (window.innerHeight / 2) / viewport.zoom - nodeHeight / 2,
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

  const addNode = useCallback((position: { x: number; y: number } = { x: Math.random() * 500 + 100, y: Math.random() * 300 + 100 }) => {
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
  }, [setNodes, handleEditNode]);

  const updateNodeName = useCallback((nodeId: string, name: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              node: { ...node.data.node, name },
              onNameChange: (newName: string) => updateNodeName(nodeId, newName),
              onEdit: () => handleEditNode(nodeId),
              onDelete: () => deleteNode(nodeId),
            },
          };
        }
        return node;
      })
    );
  }, [setNodes, handleEditNode]);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) =>
      edge.source !== nodeId && edge.target !== nodeId
    ));
  }, [setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;

      // Check if there's already a connection in the opposite direction
      const existingReverseEdge = edges.find(edge =>
        edge.source === params.target && edge.target === params.source
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
                  color: EDGE_COLORS.TWO_WAY
                },
                markerStart: {
                  type: MarkerType.ArrowClosed,
                  width: 20,
                  height: 20,
                  color: EDGE_COLORS.TWO_WAY
                },
                style: {
                  stroke: EDGE_COLORS.TWO_WAY,
                  strokeWidth: 2,
                  strokeOpacity: 1,
                  strokeDasharray: '10,5',
                  animation: 'dash 1s linear infinite'
                },
              };
            }
            return edge;
          })
        );
        return; // Don't create a new edge
      }

      const edgeId = `${params.source}-${params.target}`;

      // Remove any existing edges between these nodes (same direction)
      setEdges((eds) => eds.filter((edge) =>
        !(edge.source === params.source && edge.target === params.target)
      ));

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
              color: EDGE_COLORS.ONE_WAY
            },
            style: {
              stroke: EDGE_COLORS.ONE_WAY,
              strokeWidth: 2,
              strokeOpacity: 1,
              strokeDasharray: '10,5',
              animation: 'dash 1s linear infinite'
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
              color: EDGE_COLORS.TWO_WAY
            },
            markerStart: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: EDGE_COLORS.TWO_WAY
            },
            style: {
              stroke: EDGE_COLORS.TWO_WAY,
              strokeWidth: 2,
              strokeOpacity: 1,
              strokeDasharray: '10,5',
              animation: 'dash 1s linear infinite'
            },
          } as Edge;
          break;

        default:
          return;
      }

      setEdges((eds) => addEdge(newEdge, eds));
    },
    [connectionType, setEdges, edges]
  );

  const clearGraph = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedEdge(null);
  }, [setNodes, setEdges]);

  const onEdgeClick: EdgeMouseHandler = useCallback((event, edge) => {
    event.stopPropagation();
    setSelectedEdge(edge);
    // Update all edges to show selection state - non-selected are dashed/animated, selected is solid
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        animated: e.id !== edge.id, // Animate non-selected edges
        style: {
          ...e.style,
          strokeDasharray: e.id !== edge.id ? '10,5' : undefined, // Dashed border for non-selected
          animation: e.id !== edge.id ? 'dash 1s linear infinite' : undefined,
          strokeWidth: e.id === edge.id ? 3 : 2, // Thicker stroke for selected
        },
      }))
    );
  }, [setEdges]);

  const updateEdgeType = useCallback((edgeId: string, newType: ConnectionType) => {
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
              color: EDGE_COLORS.ONE_WAY
            };
            updatedEdge.markerStart = undefined;
            updatedEdge.style = {
              stroke: EDGE_COLORS.ONE_WAY,
              strokeWidth: isSelected ? 3 : 2,
              strokeOpacity: 1,
              strokeDasharray: isSelected ? undefined : '10,5',
              animation: isSelected ? undefined : 'dash 1s linear infinite',
            };
            updatedEdge.animated = !isSelected;
          } else {
            updatedEdge.markerEnd = {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: EDGE_COLORS.TWO_WAY
            };
            updatedEdge.markerStart = {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: EDGE_COLORS.TWO_WAY
            };
            updatedEdge.style = {
              stroke: EDGE_COLORS.TWO_WAY,
              strokeWidth: isSelected ? 3 : 2,
              strokeOpacity: 1,
              strokeDasharray: isSelected ? undefined : '10,5',
              animation: isSelected ? undefined : 'dash 1s linear infinite',
            };
            updatedEdge.animated = !isSelected;
          }

          return updatedEdge;
        }
        return edge;
      })
    );

    // Update selected edge reference with the new markers to reflect correct type
    setSelectedEdge(prev => {
      if (prev && prev.id === edgeId) {
        const updatedSelectedEdge = { ...prev };
        if (newType === "one-way") {
          updatedSelectedEdge.markerStart = undefined;
          updatedSelectedEdge.markerEnd = {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: EDGE_COLORS.ONE_WAY
          };
        } else {
          updatedSelectedEdge.markerEnd = {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: EDGE_COLORS.TWO_WAY
          };
          updatedSelectedEdge.markerStart = {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: EDGE_COLORS.TWO_WAY
          };
        }
        return updatedSelectedEdge;
      }
      return prev;
    });
  }, [setEdges, selectedEdge]);

  const reverseEdge = useCallback((edgeId: string) => {
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
      })
    );

    // Update selected edge reference
    setSelectedEdge(prev => {
      if (prev && prev.id === edgeId) {
        return {
          ...prev,
          source: prev.target,
          target: prev.source,
        };
      }
      return prev;
    });
  }, [setEdges]);

  const closeEdgeEditor = useCallback(() => {
    setSelectedEdge(null);
    // Reset all edges to default styling (dashed, animated)
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        animated: true,
        style: {
          ...e.style,
          strokeDasharray: '10,5',
          animation: 'dash 1s linear infinite',
          strokeWidth: 2,
        },
      }))
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
      await apiService.saveGraph(graphId, nodes, edges, viewport, tempGraphName);
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

  // Handle publishing graph
  const handlePublish = useCallback(async () => {
    setIsPublishing(true);
    try {
      const result = await apiService.publishGraph(graphId);

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
    const hasVisited = localStorage.getItem('pcdnge_visited');
    if (!hasVisited) {
      onHelpOpen();
      localStorage.setItem('pcdnge_visited', 'true');
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
              ...node.data,
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

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* Graph Name Display */}
      <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-gray-200">
        {isEditingName ? (
          <input
            ref={nameInputRef}
            type="text"
            value={tempGraphName}
            onChange={(e) => setTempGraphName(e.target.value)}
            onBlur={handleSaveGraphName}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSaveGraphName();
              } else if (e.key === "Escape") {
                handleCancelNameEdit();
              }
            }}
            className="text-lg font-semibold text-gray-800 bg-transparent border-none outline-none focus:ring-0"
            style={{ minWidth: "200px" }}
          />
        ) : (
          <h2
            className="text-lg font-semibold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors"
            onClick={handleNameClick}
          >
            {graphName}
          </h2>
        )}
      </div>

      {/* Floating Add Node Button */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
        <Button
          color="primary"
          isIconOnly
          size="lg"
          className="shadow-lg"
          onPress={addNodeAtViewportCenter}
        >
          +
        </Button>
      </div>

      {/* Publish Button */}
      <div className="absolute top-4 right-4 z-20">
        <Button
          color="success"
          className="shadow-lg text-white px-8"
          onPress={handlePublish}
          isLoading={isPublishing}
          isDisabled={isPublishing}
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
              Connection: <span className="font-medium">{nodes.find(node => node.id === selectedEdge.source)?.data.node.name} → {nodes.find(node => node.id === selectedEdge.target)?.data.node.name}</span>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                color={getCurrentEdgeType(selectedEdge) === "two-way" ? "success" : "primary"}
                variant="flat"
                onPress={() => {
                  const currentType = getCurrentEdgeType(selectedEdge);
                  const newType = currentType === "one-way" ? "two-way" : "one-way";
                  updateEdgeType(selectedEdge.id, newType);
                }}
              >
                {getCurrentEdgeType(selectedEdge) === "one-way" ? "Make Two-Way (↔)" : "Make One-Way (→)"}
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
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onMoveEnd={onMoveEnd}
        nodeTypes={nodeTypes}
        fitView={!isLoaded}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        edgesReconnectable={false}
      >
        <Background />
        <Controls />
      </ReactFlow>

      {/* Help Button */}
      <div className="absolute bottom-4 right-4 z-20">
        <Button
          isIconOnly
          size="lg"
          className="shadow-lg bg-blue-500 text-white"
          onPress={onHelpOpen}
        >
          ?
        </Button>
      </div>

      {/* Help Modal */}
      <Modal isOpen={isHelpOpen} onOpenChange={onHelpOpenChange} size="2xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold">Welcome to PCDNGE!</h2>
                <p className="text-sm text-gray-600">Pydantic Class Definition Network Graph Editor</p>
              </ModalHeader>
              <ModalBody className="max-h-[60vh] overflow-y-auto">
                <div className="space-y-4">
                  <section>
                    <h3 className="text-lg font-semibold mb-2">🎯 How It Works</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 pl-4">
                      <li>Create nodes by clicking the <strong>+</strong> button at the top center</li>
                      <li>Each node represents a class definition in your network graph</li>
                      <li>Click and drag nodes to reposition them on the canvas</li>
                      <li>Your changes are automatically saved every second</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-2">🔗 Connecting Nodes</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 pl-4">
                      <li>Drag from a node's handle (blue circles on sides) to another node to create a connection</li>
                      <li><span className="text-blue-600 font-medium">Blue arrows</span> = One-way connection</li>
                      <li><span className="text-red-600 font-medium">Red arrows</span> = Two-way connection</li>
                      <li>Click on any edge to edit it - you can change direction or make it two-way</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-2">✏️ Editing</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 pl-4">
                      <li>Click the graph name (top-left) to rename your project</li>
                      <li>Click the node name to edit it directly</li>
                      <li>Delete nodes using the × button in the top-right corner of each node</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-2">📤 Publishing</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 pl-4">
                      <li>Click the <strong className="text-green-600">Publish</strong> button (top-right) to create a versioned snapshot</li>
                      <li>Each publish creates a new version (v1, v2, v3...)</li>
                      <li>Published versions are immutable - you can continue editing while keeping stable snapshots</li>
                      <li>Use published versions in production while working on the next iteration</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-2">💡 Tips</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 pl-4">
                      <li>Zoom in/out using your mouse wheel or the controls (bottom-left)</li>
                      <li>Pan around by clicking and dragging on the empty canvas</li>
                      <li>Your viewport position and zoom level are saved automatically</li>
                    </ul>
                  </section>

                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                    <p className="text-sm text-blue-700">
                      <strong>💡 Need help later?</strong> You can always reopen this guide by clicking the help button (?) in the bottom-right corner.
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

const PCDNetworkGraphEditor: React.FC<PCDNetworkGraphEditorProps> = ({ graphId }) => {
  return (
    <ReactFlowProvider>
      <PCDNetworkGraphEditorInner graphId={graphId} />
    </ReactFlowProvider>
  );
};

export default PCDNetworkGraphEditor;