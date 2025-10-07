import { useState, useCallback } from "react";
import { Node, Edge, Connection, useReactFlow } from "@xyflow/react";
import { v7 as uuidv7 } from "uuid";

import { NetworkNodeData, ConnectionType } from "../types/node";
import { createEdgeConfig, getEdgeType } from "../utils/edge";
import { NODE_DIMENSIONS } from "../constants/graph";

interface UseGraphEditorProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  onEditNode: (nodeId: string) => void;
}

export const useGraphEditor = ({
  initialNodes,
  initialEdges,
  onEditNode,
}: UseGraphEditorProps) => {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const { getViewport } = useReactFlow();

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
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) =>
      eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
    );
  }, []);

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
        onEdit: () => onEditNode(id),
        onDelete: () => deleteNode(id),
      },
    };

    setNodes((nds) => [...nds, newNode]);
  }, [getViewport, updateNodeName, onEditNode, deleteNode]);

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
                ...createEdgeConfig("two-way", false),
              };
            }

            return edge;
          }),
        );

        return;
      }

      const edgeId = `${params.source}-${params.target}`;

      // Remove any existing edges between these nodes (same direction)
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
    [edges],
  );

  const selectEdge = useCallback((edge: Edge) => {
    setSelectedEdge(edge);
    // Update all edges to show selection state
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        ...createEdgeConfig(getEdgeType(e), e.id === edge.id),
      })),
    );
  }, []);

  const deselectEdge = useCallback(() => {
    setSelectedEdge(null);
    // Reset all edges to default styling
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        ...createEdgeConfig(getEdgeType(e), false),
      })),
    );
  }, []);

  const updateEdgeType = useCallback(
    (edgeId: string, newType: ConnectionType) => {
      setEdges((eds) =>
        eds.map((edge) => {
          if (edge.id === edgeId) {
            const isSelected = selectedEdge?.id === edgeId;

            return {
              ...edge,
              ...createEdgeConfig(newType, isSelected),
            };
          }

          return edge;
        }),
      );

      // Update selected edge reference
      if (selectedEdge && selectedEdge.id === edgeId) {
        const updatedEdge = {
          ...selectedEdge,
          ...createEdgeConfig(newType, true),
        };

        setSelectedEdge(updatedEdge);
      }
    },
    [selectedEdge],
  );

  const reverseEdge = useCallback(
    (edgeId: string) => {
      setEdges((eds) =>
        eds.map((edge) => {
          if (edge.id === edgeId) {
            return {
              ...edge,
              source: edge.target,
              target: edge.source,
            };
          }

          return edge;
        }),
      );

      // Update selected edge reference
      if (selectedEdge && selectedEdge.id === edgeId) {
        setSelectedEdge({
          ...selectedEdge,
          source: selectedEdge.target,
          target: selectedEdge.source,
        });
      }
    },
    [selectedEdge],
  );

  return {
    nodes,
    edges,
    selectedEdge,
    setNodes,
    setEdges,
    addNodeAtViewportCenter,
    updateNodeName,
    deleteNode,
    onConnect,
    selectEdge,
    deselectEdge,
    updateEdgeType,
    reverseEdge,
  };
};
