import {
  PydanticClassRequest,
  GenerateResponse,
  PydanticAttribute,
} from "@/types/pydantic";
import { Node, Edge } from "@xyflow/react";

const API_BASE_URL = "http://localhost:8000";

export interface GraphState {
  graph_id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number } | null;
  updated_at: string;
}

export interface PublishResponse {
  graph_id: string;
  version: number;
  name: string;
  published_at: string;
  message: string;
}

const serializeAttribute = (attr: PydanticAttribute): any => ({
  name: attr.name,
  type: attr.type,
  nullable: attr.nullable,
  description: attr.description,
  default_value: attr.defaultValue,
  nested_attributes: attr.nestedAttributes?.map(serializeAttribute),
});

export const apiService = {
  async generatePydantic(
    request: PydanticClassRequest,
  ): Promise<GenerateResponse> {
    const response = await fetch(`${API_BASE_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        class_name: request.className,
        class_description: request.classDescription,
        attributes: request.attributes.map(serializeAttribute),
        prompt: request.prompt,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();

      throw new Error(errorData.detail || "Failed to generate response");
    }

    const data = await response.json();

    return {
      result: data.result,
      generatedClass: data.generated_class,
    };
  },

  async loadGraph(graphId: string): Promise<GraphState> {
    const response = await fetch(`${API_BASE_URL}/api/graph/${graphId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load graph");
    }

    return await response.json();
  },

  async saveGraph(
    graphId: string,
    nodes: Node[],
    edges: Edge[],
    viewport: { x: number; y: number; zoom: number } | null,
    name?: string,
  ): Promise<GraphState> {
    const response = await fetch(`${API_BASE_URL}/api/graph/${graphId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        nodes,
        edges,
        viewport,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to save graph");
    }

    return await response.json();
  },

  async publishGraph(graphId: string): Promise<PublishResponse> {
    const response = await fetch(`${API_BASE_URL}/api/graph/${graphId}/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to publish graph");
    }

    return await response.json();
  },
};
