import React from "react";
import { Link } from "react-router-dom";
import { useScenarios } from "@/context/ScenarioContext";
import { useDatabases } from "@/context/DatabaseContext";
import { useLanguage } from "@/context/LanguageContext";
import { optionLabel } from "@/utils/task/taskAttrUtils";
import { DEFAULT_SCENARIO_SETTINGS } from "@/utils/scenario/scenarioConstants";
import ScenarioOptionEditor from "@/pages/Scenario/ScenarioOptionEditor";
import ScenarioConfigAssistant from "@/pages/Scenario/ScenarioConfigAssistant";

export default function ScenarioSettings({ scenario }) {
  const { updateScenarioSettings, scenarioOptions } = useScenarios();
  const { allTagOptions } = useDatabases();
  // 出厂标签的文案在 i18n 里（labelKey），用户自建的才有 label
  const { t } = useLanguage();

  const settings = scenario.settings ?? DEFAULT_SCENARIO_SETTINGS;

  const toggleDevice = (id) => {
    const devices = settings.devices.includes(id)
      ? settings.devices.filter((d) => d !== id)
      : [...settings.devices, id];
    updateScenarioSettings(scenario.id, { ...settings, devices });
  };

  const setComm = (id) => {
    const communication = settings.communication === id ? "" : id;
    updateScenarioSettings(scenario.id, { ...settings, communication });
  };

  const toggleTaskType = (id) => {
    const taskTypes = settings.taskTypes.includes(id)
      ? settings.taskTypes.filter((tagId) => tagId !== id)
      : [...settings.taskTypes, id];
    updateScenarioSettings(scenario.id, { ...settings, taskTypes });
  };

  return (
    <div className="scenario-settings-panel">
      <ScenarioConfigAssistant scenario={scenario} />

      <ScenarioOptionEditor
        title="可用设备"
        kind="devices"
        options={scenarioOptions.devices}
        selected={settings.devices}
        multi
        withIcon
        onToggle={toggleDevice}
      />

      <ScenarioOptionEditor
        title="交流规则"
        kind="communication"
        options={scenarioOptions.communication}
        selected={settings.communication}
        multi={false}
        onToggle={setComm}
      />

      {/* 任务类型 = 任务库「标签」的唯一映射：在任务库里增删标签，这里自动同步，
          选中后即按这些标签筛选任务库。 */}
      <div className="settings-section">
        <div className="settings-label-row">
          <span className="settings-label">任务类型</span>
          <Link to="/tasks" className="settings-manage-btn" title="去任务库编辑标签">
            ⇢ 任务库标签
          </Link>
        </div>
        <div className="settings-chips">
          {allTagOptions.length === 0 ? (
            <span className="settings-empty-hint">
              任务库还没有标签，去任务库的「标签」列添加后这里会同步出现
            </span>
          ) : (
            allTagOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`settings-chip${settings.taskTypes.includes(opt.id) ? " active" : ""}`}
                onClick={() => toggleTaskType(opt.id)}
              >
                {opt.icon ? `${opt.icon} ` : ""}{optionLabel(t, opt)}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}