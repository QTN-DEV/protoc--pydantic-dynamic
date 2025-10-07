import { Node, Edge } from "@xyflow/react";

import { PydanticClassRequest } from "@/types/pydantic";
import {
  GraphState,
  PublishResponse,
  LatestVersionResponse,
  VersionHistory,
  PCDState,
} from "@/types/graph";
import { GenerateResponse, GenerateFromGraphResponse } from "@/types/api";
import { API_BASE_URL } from "@/constants/api";
import { serializeAttribute } from "@/utils/serialization";

export type { GraphState, VersionHistory, PCDState };

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
    systemPrompt?: string,
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
        system_prompt: systemPrompt,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to save graph");
    }

    return await response.json();
  },

  async publishGraph(
    graphId: string,
    setAsActive: boolean = false,
  ): Promise<PublishResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/graph/${graphId}/publish?set_as_active=${setAsActive}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to publish graph");
    }

    return await response.json();
  },

  async getLatestVersion(graphId: string): Promise<LatestVersionResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/graph/${graphId}/latest-version`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to get latest version");
    }

    return await response.json();
  },

  async getVersionHistory(
    graphId: string,
    limit: number = 5,
  ): Promise<VersionHistory[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/graph/${graphId}/versions?limit=${limit}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to get version history");
    }

    return await response.json();
  },

  async restoreVersion(graphId: string, version: number): Promise<GraphState> {
    const response = await fetch(
      `${API_BASE_URL}/api/graph/${graphId}/restore/${version}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to restore version");
    }

    return await response.json();
  },

  async deleteVersion(
    graphId: string,
    version: number,
  ): Promise<{ message: string; graph_id: string; version: number }> {
    const response = await fetch(
      `${API_BASE_URL}/api/graph/${graphId}/version/${version}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to delete version");
    }

    return await response.json();
  },

  async setActiveVersion(
    graphId: string,
    version: number,
  ): Promise<{
    message: string;
    graph_id: string;
    version: number;
    is_active: boolean;
  }> {
    const response = await fetch(
      `${API_BASE_URL}/api/graph/${graphId}/version/${version}/set-active`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to set active version");
    }

    return await response.json();
  },

  async loadPCD(nodeId: string): Promise<PCDState> {
    const response = await fetch(`${API_BASE_URL}/api/pcd/${nodeId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("PCD_NOT_FOUND");
      }
      throw new Error("Failed to load PCD");
    }

    return await response.json();
  },

  async savePCD(
    nodeId: string,
    graphId: string,
    nodes: Node[],
    edges: Edge[],
    name?: string,
  ): Promise<PCDState> {
    const response = await fetch(`${API_BASE_URL}/api/pcd/${nodeId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        graph_id: graphId,
        name,
        nodes,
        edges,
        // viewport removed - positions calculated dynamically on load
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to save PCD");
    }

    return await response.json();
  },

  async getPCDsByGraph(graphId: string): Promise<PCDState[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/pcd/by-graph/${graphId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to load PCDs for graph");
    }

    return await response.json();
  },

  async generateFromGraph(
    graphId: string,
    prompt: string,
  ): Promise<GenerateFromGraphResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/graph/${graphId}/generate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();

      throw new Error(errorData.detail || "Failed to generate data");
    }

    return await response.json();
  },
};
