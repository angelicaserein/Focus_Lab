import React from "react";
import ScenarioForm from "./ScenarioForm";
import ScenarioList from "./ScenarioList";
import ScenarioStats from "./ScenarioStats";
import ScenarioToast from "./ScenarioToast";

export default function ScenarioApp() {
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

      <ScenarioToast />
    </main>
  );
}
