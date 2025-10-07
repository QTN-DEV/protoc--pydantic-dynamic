import { useParams } from "react-router-dom";
import PCDNetworkGraphEditor from "@/components/PCDNetworkGraphEditor";

export default function GraphPage() {
  const { graph_id } = useParams<{ graph_id: string }>();

  return <PCDNetworkGraphEditor graphId={graph_id!} />;
}
