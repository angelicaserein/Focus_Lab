import React from "react";
import ScenarioForm from "./ScenarioForm";
import ScenarioList from "./ScenarioList";
import ScenarioStats from "./ScenarioStats";
import Toast from "./Toast";
import { useScenarios } from "../context/ScenarioContext";

export default function ScenarioApp() {
  const { pendingDelete, undoDelete } = useScenarios();

  return (
    <main
      className="scenario-container"
      role="application"
      aria-label="情景模式"
    >
      <div className="header">
        <div className="title">情景模式</div>
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
