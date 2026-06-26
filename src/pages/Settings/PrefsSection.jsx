import React from "react";
import usePrefs from "../../hooks/usePrefs";

export default function PrefsSection() {
  const { pomodoroMins, setPomodoroMins, animEnabled, setAnimEnabled } = usePrefs();

  return (
    <div className="settings-section">
      <div className="settings-section-title">专注偏好</div>
      <p className="settings-section-hint">更改即时生效，下次进入沉浸模式时应用。</p>

      <div className="settings-pref-row">
        <span className="settings-pref-label">番茄时长（分钟）</span>
        <div className="settings-pill-group">
          {[15, 20, 25, 30, 45, 60].map((mins) => (
            <button
              key={mins}
              className={`settings-pill${pomodoroMins === mins ? " active" : ""}`}
              onClick={() => setPomodoroMins(mins)}
              aria-pressed={pomodoroMins === mins}
            >
              {mins}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-pref-row">
        <span className="settings-pref-label">3D 动画</span>
        <button
          className={`settings-toggle-btn${animEnabled ? " active" : ""}`}
          onClick={() => setAnimEnabled((v) => !v)}
          aria-pressed={animEnabled}
        >
          <span className="settings-toggle-track">
            <span className="settings-toggle-thumb" />
          </span>
          {animEnabled ? "开启" : "关闭"}
        </button>
      </div>
    </div>
  );
}
