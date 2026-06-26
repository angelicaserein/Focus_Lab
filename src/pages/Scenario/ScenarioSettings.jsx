import React from "react";
import { useScenarios } from "../../context/ScenarioContext";
import {
  DEVICE_OPTIONS,
  COMM_OPTIONS,
  TASK_TYPE_OPTIONS,
} from "../../utils/scenarioConstants";

export default function ScenarioSettings({ scenario }) {
  const { updateScenarioSettings } = useScenarios();

  const settings = scenario.settings ?? { devices: [], communication: "", taskTypes: [] };

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
      ? settings.taskTypes.filter((t) => t !== id)
      : [...settings.taskTypes, id];
    updateScenarioSettings(scenario.id, { ...settings, taskTypes });
  };

  return (
    <div className="scenario-settings-panel">
      <div className="settings-section">
        <span className="settings-label">可用设备</span>
        <div className="settings-chips">
          {DEVICE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`settings-chip${settings.devices.includes(opt.id) ? " active" : ""}`}
              onClick={() => toggleDevice(opt.id)}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <span className="settings-label">交流规则</span>
        <div className="settings-chips">
          {COMM_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`settings-chip${settings.communication === opt.id ? " active" : ""}`}
              onClick={() => setComm(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <span className="settings-label">任务类型</span>
        <div className="settings-chips">
          {TASK_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`settings-chip${settings.taskTypes.includes(opt.id) ? " active" : ""}`}
              onClick={() => toggleTaskType(opt.id)}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
