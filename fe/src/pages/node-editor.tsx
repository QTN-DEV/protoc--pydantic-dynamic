import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

import PydanticFlowCanvas from "@/components/PydanticFlowCanvas";
import { apiService } from "@/services/api";
import { PydanticClassRequest, GenerateResponse } from "@/types/pydantic";

export default function NodeEditorPage() {
  const { graph_id, node_id } = useParams<{
    graph_id: string;
    node_id: string;
  }>();
  const [isLoading, setIsLoading] = useState(false);
  const [nodeName, setNodeName] = useState("");

  useEffect(() => {
    const loadNodeName = async () => {
      if (!graph_id || !node_id) return;

      try {
        const graphState = await apiService.loadGraph(graph_id);
        const node = graphState.nodes.find((n) => n.id === node_id);

        if (node?.data?.node?.name) {
          setNodeName(node.data.node.name);
        }
      } catch (error) {
        console.error("Failed to load node name:", error);
      }
    };

    loadNodeName();
  }, [graph_id, node_id]);

  const handleFormSubmit = async (
    data: PydanticClassRequest,
  ): Promise<GenerateResponse> => {
    setIsLoading(true);
    try {
      const response = await apiService.generatePydantic(data);

      return response;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="absolute top-4 left-4 z-20 text-sm text-gray-600">
        Graph: <span className="font-semibold">{graph_id}</span> | Node:{" "}
        <span className="font-semibold">{node_id}</span>
      </div>
      <PydanticFlowCanvas
        initialClassName={nodeName}
        isLoading={isLoading}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
