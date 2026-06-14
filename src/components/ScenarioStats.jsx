import React from "react";
import { useScenarios } from "../context/ScenarioContext";

export default function ScenarioStats() {
  const { scenarios } = useScenarios();
  return (
    <div className="stats" aria-live="polite">
      共 {scenarios.length} 个情景
    </div>
  );
}
