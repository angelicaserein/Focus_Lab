import React, { useState } from "react";
import usePrefs from "../../hooks/usePrefs";
import {
  notifySupported,
  notifyPermission,
  requestNotifyPermission,
  showNotification,
} from "../../utils/notify";

export default function PrefsSection() {
  const {
    pomodoroMins, setPomodoroMins,
    animEnabled, setAnimEnabled,
    notifyEnabled, setNotifyEnabled,
  } = usePrefs();

  // 浏览器层面的授权状态（granted / denied / default / unsupported），用于展示与判断
  const [permission, setPermission] = useState(notifyPermission());

  // 实际「开」状态 = 用户开启了偏好 且 浏览器已授权
  const notifyOn = notifyEnabled && permission === "granted";
  const supported = notifySupported();

  const handleToggleNotify = async () => {
    if (notifyOn) {
      setNotifyEnabled(false);
      return;
    }
    // 开启：请求授权（必须由此用户手势触发），授权通过才真正开启并发一条确认通知
    const result = await requestNotifyPermission();
    setPermission(result);
    if (result === "granted") {
      setNotifyEnabled(true);
      showNotification("🔔 通知已开启", {
        body: "番茄到点与 DDL 提醒会在这里提醒你。",
        tag: "notify-enabled",
      });
    } else {
      setNotifyEnabled(false);
    }
  };

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

      <div className="settings-pref-row">
        <span className="settings-pref-label">桌面通知</span>
        <button
          className={`settings-toggle-btn${notifyOn ? " active" : ""}`}
          onClick={handleToggleNotify}
          aria-pressed={notifyOn}
          disabled={!supported}
        >
          <span className="settings-toggle-track">
            <span className="settings-toggle-thumb" />
          </span>
          {notifyOn ? "开启" : "关闭"}
        </button>
      </div>
      <p className="settings-section-hint">
        {!supported
          ? "当前浏览器不支持桌面通知。"
          : permission === "denied"
            ? "通知已被浏览器拦截，请在地址栏的网站权限设置中手动允许后再开启。"
            : "开启后，番茄到点和今日 DDL 会以系统通知提醒你（即使切到其它标签页）。"}
      </p>
    </div>
  );
}
