import React from "react";
import { Button } from "@heroui/react";
import { useNavigate, useLocation } from "react-router-dom";

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="absolute top-4 right-4 z-20 bg-white/95 backdrop-blur-sm p-2 rounded-lg shadow-lg">
      <div className="flex gap-2">
        <Button
          size="sm"
          color={location.pathname === "/" ? "primary" : "default"}
          variant={location.pathname === "/" ? "solid" : "flat"}
          onPress={() => navigate("/")}
        >
          Pydantic Editor
        </Button>
        <Button
          size="sm"
          color={location.pathname === "/network-graph" ? "primary" : "default"}
          variant={location.pathname === "/network-graph" ? "solid" : "flat"}
          onPress={() => navigate("/network-graph")}
        >
          Network Graph
        </Button>
      </div>
    </div>
  );
};

export default Navigation;