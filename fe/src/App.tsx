import { Route, Routes } from "react-router-dom";

import LandingPage from "@/pages/landing";
import GraphPage from "@/pages/graph";
import NodeEditorPage from "@/pages/node-editor";

function App() {
  return (
    <Routes>
      <Route element={<LandingPage />} path="/" />
      <Route element={<GraphPage />} path="/:graph_id" />
      <Route element={<NodeEditorPage />} path="/:graph_id/:node_id" />
    </Routes>
  );
}

export default App;
