import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useScenarios } from "../../context/ScenarioContext";
import ScenarioForm from "./ScenarioForm";
import ScenarioItem from "./ScenarioItem";
import ScenarioSettings from "./ScenarioSettings";
import ScenarioStats from "./ScenarioStats";

export default function ScenarioList() {
  const { scenarios } = useScenarios();
  const [settingsId, setSettingsId] = useState(null);

  const toggleSettings = (id) =>
    setSettingsId((cur) => (cur === id ? null : id));

  const settingsScenario = scenarios.find((s) => s.id === settingsId) || null;

  return (
    <>
      {/* 白底卡片一：情境列表 */}
      <section className="scenario-card">
        <div className="header">
          <div className="title">情境列表</div>
          <Link to="/scenario-stats" className="scenario-stats-link">查看统计 →</Link>
        </div>

        <ScenarioForm />

        {scenarios.length === 0 ? (
          <div className="empty-state" style={{ padding: 12 }}>
            <div className="empty-emoji">✨</div>
            <div className="empty-text">还没有情景，添加第一个吧</div>
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

      {/* 白底卡片二：情境配置（⚙ 选中的情境在此配置） */}
      <section className="scenario-card scenario-config-card" aria-live="polite">
        <div className="scenario-config-head">
          <span className="scenario-config-title">情境配置</span>
          {settingsScenario && (
            <button
              type="button"
              className="scenario-config-close"
              onClick={() => setSettingsId(null)}
              aria-label="收起配置"
              title="收起配置"
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
          <div className="scenario-config-empty">
            点击情境右侧的 ⚙ 选择要配置的情境
          </div>
        )}
      </section>
    </>
  );
}
