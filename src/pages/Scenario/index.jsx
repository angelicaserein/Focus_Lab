import React from "react";
import { Link } from "react-router-dom";
import ScenarioForm from "./ScenarioForm";
import ScenarioList from "./ScenarioList";
import ScenarioStats from "./ScenarioStats";
import Toast from "../../components/Toast";
import { useScenarios } from "../../context/ScenarioContext";

export default function Scenario() {
  const { pendingDelete, undoDelete } = useScenarios();

  return (
    <main
      className="scenario-container"
      role="application"
      aria-label="情景模式"
    >
      <div className="header">
        <div className="title">情景模式</div>
        <Link to="/scenario-stats" className="scenario-stats-link">查看统计 →</Link>
      </div>

      <ScenarioForm />

      <ScenarioList />

      <ScenarioStats />

      <Toast
        pendingDelete={pendingDelete}
        undoDelete={undoDelete}
        getText={(item) => item.title}
      />
    </main>
  );
}
