import React from "react";
import { useScenarios } from "../../context/ScenarioContext";
import ScenarioItem from "./ScenarioItem";

export default function ScenarioList() {
  const { scenarios } = useScenarios();

  if (!scenarios || scenarios.length === 0) {
    return (
      <div className="empty-state" style={{ padding: 12 }}>
        <div className="empty-emoji">✨</div>
        <div className="empty-text">还没有情景，添加第一个吧</div>
      </div>
    );
  }

  return (
    <section className="scenario-list" aria-live="polite">
      {scenarios.map((scenario) => (
        <ScenarioItem key={scenario.id} scenario={scenario} />
      ))}
    </section>
  );
}
