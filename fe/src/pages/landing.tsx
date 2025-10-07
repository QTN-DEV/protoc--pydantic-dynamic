import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { v7 as uuidv7 } from "uuid";

export default function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const graphId = uuidv7();
    navigate(`/${graphId}`);
  }, [navigate]);

  return null;
}
