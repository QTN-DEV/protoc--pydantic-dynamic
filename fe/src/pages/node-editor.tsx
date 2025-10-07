import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";

import PydanticFlowCanvas from "@/components/PydanticFlowCanvas";
import { apiService } from "@/services/api";
import { PydanticClassRequest, GenerateResponse } from "@/types/pydantic";

export default function NodeEditorPage() {
  const { graph_id, node_id } = useParams<{
    graph_id: string;
    node_id: string;
  }>();
  const [isLoading, setIsLoading] = useState(false);
  const [graphName, setGraphName] = useState("");
  const [nodeName, setNodeName] = useState("");
  const [nodeDescription, setNodeDescription] = useState("");
  const [isEditingNodeName, setIsEditingNodeName] = useState(false);
  const [tempNodeName, setTempNodeName] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [tempDescription, setTempDescription] = useState("");
  const nodeNameInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const loadGraphData = async () => {
      if (!graph_id || !node_id) return;

      try {
        const graphState = await apiService.loadGraph(graph_id);

        setGraphName(graphState.name);

        const node = graphState.nodes.find((n) => n.id === node_id);

        if (node?.data?.node) {
          const nodeData = node.data as any;

          setNodeName(nodeData.node.name || "");
          setNodeDescription(nodeData.node.description || "");
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to load graph data:", error);
      }
    };

    loadGraphData();
  }, [graph_id, node_id]);

  const handleNodeNameClick = () => {
    setTempNodeName(nodeName);
    setIsEditingNodeName(true);
    setTimeout(() => nodeNameInputRef.current?.focus(), 0);
  };

  const handleSaveNodeName = async () => {
    const newName = tempNodeName.trim();

    if (newName && newName !== nodeName) {
      setNodeName(newName);

      if (!graph_id || !node_id) return;

      try {
        const graphState = await apiService.loadGraph(graph_id);
        const nodeIndex = graphState.nodes.findIndex((n) => n.id === node_id);

        if (nodeIndex !== -1) {
          const nodeData = graphState.nodes[nodeIndex].data as any;

          nodeData.node.name = newName;
          await apiService.saveGraph(
            graph_id,
            graphState.nodes,
            graphState.edges,
            graphState.viewport,
            graphState.name,
          );
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to save node name:", error);
      }
    }
    setIsEditingNodeName(false);
  };

  const handleCancelNodeNameEdit = () => {
    setIsEditingNodeName(false);
    setTempNodeName(nodeName);
  };

  const handleDescriptionClick = () => {
    setTempDescription(nodeDescription);
    setIsEditingDescription(true);
    setTimeout(() => descriptionInputRef.current?.focus(), 0);
  };

  const handleSaveDescription = async () => {
    const newDescription = tempDescription.trim();

    if (newDescription !== nodeDescription) {
      setNodeDescription(newDescription);

      if (!graph_id || !node_id) return;

      try {
        const graphState = await apiService.loadGraph(graph_id);
        const nodeIndex = graphState.nodes.findIndex((n) => n.id === node_id);

        if (nodeIndex !== -1) {
          const nodeData = graphState.nodes[nodeIndex].data as any;

          nodeData.node.description = newDescription;
          await apiService.saveGraph(
            graph_id,
            graphState.nodes,
            graphState.edges,
            graphState.viewport,
            graphState.name,
          );
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to save node description:", error);
      }
    }
    setIsEditingDescription(false);
  };

  const handleCancelDescriptionEdit = () => {
    setIsEditingDescription(false);
    setTempDescription(nodeDescription);
  };

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

  if (isLoading || !graphName) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* Breadcrumb - Graph Name */}
      <div className="absolute top-4 right-4 z-20 items-center w-fit bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full shadow border border-blue-200">
        <Link
          className="hover:text-blue-600 transition-colors"
          to={`/${graph_id}`}
        >
          {graphName}
        </Link>
      </div>

      {/* Top left header section */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        {/* Node Name */}
        <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-gray-200 w-fit min-w-[100px]">
          {isEditingNodeName ? (
            <input
              ref={nodeNameInputRef}
              className="text-lg font-semibold text-gray-800 bg-transparent border-none outline-none focus:ring-0 w-full"
              style={{ minWidth: "200px" }}
              type="text"
              value={tempNodeName}
              onBlur={handleSaveNodeName}
              onChange={(e) => setTempNodeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveNodeName();
                } else if (e.key === "Escape") {
                  handleCancelNodeNameEdit();
                }
              }}
            />
          ) : (
            <button
              className="text-lg font-semibold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors bg-transparent border-none w-full text-left"
              tabIndex={0}
              type="button"
              onClick={handleNodeNameClick}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleNodeNameClick();
                }
              }}
            >
              {nodeName || "Click to add name"}
            </button>
          )}
        </div>

        {/* Node Description */}
        <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-gray-200 max-w-[400px] max-h-[200px] overflow-y-auto">
          {isEditingDescription ? (
            <textarea
              ref={descriptionInputRef}
              className="text-sm text-gray-800 bg-transparent border-none outline-none focus:ring-0 resize-none w-[calc(400px-(var(--spacing)*4*3))] h-[calc(200px-(var(--spacing)*4*2))]"
              value={tempDescription}
              onBlur={handleSaveDescription}
              onChange={(e) => setTempDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  handleCancelDescriptionEdit();
                }
              }}
            />
          ) : (
            <button
              className="text-sm text-gray-800 cursor-pointer hover:text-blue-600 transition-colors bg-transparent border-none w-full text-left whitespace-pre-wrap"
              tabIndex={0}
              type="button"
              onClick={handleDescriptionClick}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleDescriptionClick();
                }
              }}
            >
              {nodeDescription || "Click to add description"}
            </button>
          )}
        </div>
      </div>

      <PydanticFlowCanvas
        graphId={graph_id}
        initialClassDescription={nodeDescription}
        initialClassName={nodeName}
        isLoading={isLoading}
        nodeId={node_id}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
