import { Route, Routes } from "react-router-dom";

import IndexPage from "@/pages/index";
import NetworkGraphPage from "@/pages/network-graph";

function App() {
  return (
    <Routes>
      <Route element={<IndexPage />} path="/" />
      <Route element={<NetworkGraphPage />} path="/network-graph" />
    </Routes>
  );
}

export default App;
