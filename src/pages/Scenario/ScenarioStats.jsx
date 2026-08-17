import React from "react";
import { useScenarios } from "@/context/ScenarioContext";
import { useLanguage } from "@/context/LanguageContext";

export default function ScenarioStats() {
  const { scenarios } = useScenarios();
  const { t } = useLanguage();
  return (
    <div className="stats" aria-live="polite">
      {t("scenario.list.count", { count: scenarios.length })}
    </div>
  );
}
