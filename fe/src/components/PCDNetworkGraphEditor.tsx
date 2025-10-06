import React, { useState, useCallback } from "react";
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
import { Button, Card, CardBody, Input } from "@heroui/react";
import { v7 as uuidv7 } from "uuid";
import Navigation from "./Navigation";

interface NetworkNode {
  id: string;
  name: string;
}

interface NetworkNodeData {
  node: NetworkNode;
  onNameChange: (name: string) => void;
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

      <Card className="w-32 h-32">
        <CardBody className="p-2 h-full relative">
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
              className="text-center"
              classNames={{
                input: "text-center text-xs",
                inputWrapper: "min-h-6 h-6"
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

const PCDNetworkGraphEditorInner: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [connectionType, setConnectionType] = useState<ConnectionType>("one-way");
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const { getViewport } = useReactFlow();

  const addNodeAtViewportCenter = useCallback(() => {
    const viewport = getViewport();
    const nodeSize = 128; // Node is 128x128px (w-32 h-32)
    const centerPosition = {
      x: -viewport.x / viewport.zoom + (window.innerWidth / 2) / viewport.zoom - nodeSize / 2,
      y: -viewport.y / viewport.zoom + (window.innerHeight / 2) / viewport.zoom - nodeSize / 2,
    };

    const id = uuidv7();
    const newNode: Node = {
      id,
      type: "networkNode",
      position: centerPosition,
      data: {
        node: { id, name: "" },
        onNameChange: (name: string) => updateNodeName(id, name),
        onDelete: () => deleteNode(id),
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [getViewport, setNodes]);

  const addNode = useCallback((position: { x: number; y: number } = { x: Math.random() * 500 + 100, y: Math.random() * 300 + 100 }) => {
    const id = uuidv7();
    const newNode: Node = {
      id,
      type: "networkNode",
      position,
      data: {
        node: { id, name: "" },
        onNameChange: (name: string) => updateNodeName(id, name),
        onDelete: () => deleteNode(id),
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  const updateNodeName = useCallback((nodeId: string, name: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              node: { ...node.data.node, name },
            },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

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


  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* Navigation */}
      <Navigation />

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
        nodeTypes={nodeTypes}
        fitView
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        edgesReconnectable={false}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
};

const PCDNetworkGraphEditor: React.FC = () => {
  return (
    <ReactFlowProvider>
      <PCDNetworkGraphEditorInner />
    </ReactFlowProvider>
  );
};

export default PCDNetworkGraphEditor;