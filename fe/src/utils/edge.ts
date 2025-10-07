import { Edge, MarkerType } from "@xyflow/react";

import { ConnectionType } from "@/types/node";
import { EDGE_COLORS } from "@/constants/graph";

/**
 * Determines the connection type based on edge markers
 */
export const getEdgeType = (edge: Edge): ConnectionType => {
  return edge.markerStart ? "two-way" : "one-way";
};

/**
 * Creates edge styling for a given connection type
 */
export const createEdgeStyle = (
  type: ConnectionType,
  isSelected: boolean = false,
) => {
  const color = type === "one-way" ? EDGE_COLORS.ONE_WAY : EDGE_COLORS.TWO_WAY;

  return {
    stroke: color,
    strokeWidth: isSelected ? 3 : 2,
    strokeOpacity: 1,
    strokeDasharray: isSelected ? undefined : "10,5",
    animation: isSelected ? undefined : "dash 1s linear infinite",
  };
};

/**
 * Creates marker configuration for edges
 */
export const createEdgeMarker = (color: string) => ({
  type: MarkerType.ArrowClosed,
  width: 20,
  height: 20,
  color,
});

/**
 * Creates a complete edge configuration
 */
export const createEdgeConfig = (
  type: ConnectionType,
  isSelected: boolean = false,
) => {
  const color = type === "one-way" ? EDGE_COLORS.ONE_WAY : EDGE_COLORS.TWO_WAY;

  return {
    animated: !isSelected,
    style: createEdgeStyle(type, isSelected),
    markerEnd: createEdgeMarker(color),
    markerStart: type === "two-way" ? createEdgeMarker(color) : undefined,
  };
};
