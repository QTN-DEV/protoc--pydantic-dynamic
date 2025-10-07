import { Node, Edge } from "@xyflow/react";

export interface GraphState {
  graph_id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number } | null;
  system_prompt: string;
  updated_at: string;
}

export interface PublishResponse {
  graph_id: string;
  version: number;
  name: string;
  published_at: string;
  message: string;
}

export interface LatestVersionResponse {
  version: number | null;
  published_at: string | null;
}

export interface VersionHistory {
  version: number;
  published_at: string;
  name: string;
  is_active: boolean;
}

export interface PCDState {
  node_id: string;
  graph_id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  updated_at: string;
}
