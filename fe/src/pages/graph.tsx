import { useParams } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { Edge, Node } from "@xyflow/react";

import GraphEditor from "@/features/graph-editor/GraphEditor";
import { apiService, GraphState } from "@/services/api";

export default function GraphPage() {
  const { graph_id } = useParams<{ graph_id: string }>();
  const [graph, setGraph] = useState<GraphState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get graph here
  useEffect(() => {
    apiService.loadGraph(graph_id!).then((initialGraph) => {
      setGraph(initialGraph);
      setIsLoading(false);
    });
  }, [graph_id]);

  const onSave = useCallback(
    async (
      nodes: Node[],
      edges: Edge[],
      name?: string,
      systemPrompt?: string,
    ) => {
      await apiService.saveGraph(
        graph_id!,
        nodes,
        edges,
        null,
        name,
        systemPrompt,
      );
    },
    [graph_id],
  );

  if (isLoading || !graph) {
    return <div>Loading...</div>;
  }

  return <GraphEditor graph={graph} onSave={onSave} />;
}
