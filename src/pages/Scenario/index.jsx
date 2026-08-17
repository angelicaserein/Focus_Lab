import React from "react";
import ScenarioList from "@/pages/Scenario/ScenarioList";
import Toast from "@/components/ui/Toast";
import { useScenarios } from "@/context/ScenarioContext";
import { useLanguage } from "@/context/LanguageContext";

export default function Scenario() {
  const { pendingDelete, undoDelete } = useScenarios();
  const { t } = useLanguage();

  return (
    <main
      className="scenario-page"
      role="application"
      aria-label={t("scenario.page.aria")}
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
