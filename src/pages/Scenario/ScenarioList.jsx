import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useScenarios } from "@/context/ScenarioContext";
import { useLanguage } from "@/context/LanguageContext";
import ScenarioForm from "@/pages/Scenario/ScenarioForm";
import ScenarioItem from "@/pages/Scenario/ScenarioItem";
import ScenarioSettings from "@/pages/Scenario/ScenarioSettings";
import ScenarioStats from "@/pages/Scenario/ScenarioStats";
import ScenarioRecommend from "@/pages/Scenario/ScenarioRecommend";

export default function ScenarioList() {
  const { scenarios } = useScenarios();
  const { t } = useLanguage();
  const [settingsId, setSettingsId] = useState(null);

  const toggleSettings = (id) =>
    setSettingsId((cur) => (cur === id ? null : id));

  const settingsScenario = scenarios.find((s) => s.id === settingsId) || null;

  return (
    <>
      {/* 白底卡片一：情境列表 */}
      <section className="scenario-card">
        <div className="header">
          <div className="title">{t("scenario.list.title")}</div>
          <Link to="/scenario-stats" className="scenario-stats-link">{t("scenario.list.statsLink")}</Link>
        </div>

        <ScenarioForm />

        {scenarios.length === 0 ? (
          <div className="empty-state" style={{ padding: 12 }}>
            <div className="empty-emoji">✨</div>
            <div className="empty-text">{t("scenario.list.empty")}</div>
          </div>
        ) : (
          <div className="scenario-list" aria-live="polite">
            {scenarios.map((scenario) => (
              <ScenarioItem
                key={scenario.id}
                scenario={scenario}
                settingsOpen={scenario.id === settingsId}
                onToggleSettings={() => toggleSettings(scenario.id)}
              />
            ))}
          </div>
        )}

        <ScenarioStats />
      </section>

      {/* 白底卡片二：情景智能推荐（基于「当前情景」主动排序任务） */}
      <ScenarioRecommend />

      {/* 白底卡片三：情境配置（⚙ 选中的情境在此配置） */}
      <section className="scenario-card scenario-config-card" aria-live="polite">
        <div className="scenario-config-head">
          <span className="scenario-config-title">{t("scenario.config.title")}</span>
          {settingsScenario && (
            <button
              type="button"
              className="scenario-config-close"
              onClick={() => setSettingsId(null)}
              aria-label={t("scenario.config.collapse")}
              title={t("scenario.config.collapse")}
            >
              ×
            </button>
          )}
        </div>

        {settingsScenario ? (
          <>
            <div className="scenario-config-subtitle">{settingsScenario.title}</div>
            <ScenarioSettings scenario={settingsScenario} />
          </>
        ) : (
          <div className="scenario-config-empty">{t("scenario.config.pick")}</div>
        )}
      </section>
    </>
  );
}
