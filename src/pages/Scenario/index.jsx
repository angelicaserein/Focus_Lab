import React from "react";
import ScenarioList from "./ScenarioList";
import Toast from "../../components/Toast";
import { useScenarios } from "../../context/ScenarioContext";

export default function Scenario() {
  const { pendingDelete, undoDelete } = useScenarios();

  return (
    <main
      className="scenario-page"
      role="application"
      aria-label="情境配置"
    >
      <ScenarioList />

      <Toast
        pendingDelete={pendingDelete}
        undoDelete={undoDelete}
        getText={(item) => item.title}
      />
    </main>
  );
}
