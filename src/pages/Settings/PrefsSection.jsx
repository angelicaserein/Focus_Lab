import React, { useState } from "react";
import usePrefs from "../../hooks/usePrefs";
import { useLanguage } from "../../context/LanguageContext";
import {
  notifySupported,
  notifyPermission,
  requestNotifyPermission,
  showNotification,
} from "../../utils/notify";

export default function PrefsSection() {
  const {
    countupFullMins, setCountupFullMins,
    countdownMins, setCountdownMins,
    animEnabled, setAnimEnabled,
    notifyEnabled, setNotifyEnabled,
  } = usePrefs();
  const { t } = useLanguage();

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
      showNotification(t("settings.prefs.notifyEnabledTitle"), {
        body: t("settings.prefs.notifyEnabledBody"),
        tag: "notify-enabled",
      });
    } else {
      setNotifyEnabled(false);
    }
  };

  return (
    <div className="settings-section">
      <div className="settings-section-title">{t("settings.prefs.title")}</div>
      <p className="settings-section-hint">{t("settings.prefs.hint")}</p>

      <div className="settings-pref-row">
        <span className="settings-pref-label">{t("settings.prefs.countupFull")}</span>
        <div className="settings-pill-group">
          {[15, 20, 25, 30, 45, 60].map((mins) => (
            <button
              key={mins}
              className={`settings-pill${countupFullMins === mins ? " active" : ""}`}
              onClick={() => setCountupFullMins(mins)}
              aria-pressed={countupFullMins === mins}
            >
              {mins}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-pref-row">
        <span className="settings-pref-label">{t("settings.prefs.countdown")}</span>
        <div className="settings-pill-group">
          {[15, 20, 25, 30, 45, 60].map((mins) => (
            <button
              key={mins}
              className={`settings-pill${countdownMins === mins ? " active" : ""}`}
              onClick={() => setCountdownMins(mins)}
              aria-pressed={countdownMins === mins}
            >
              {mins}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-pref-row">
        <span className="settings-pref-label">{t("settings.prefs.anim")}</span>
        <button
          className={`settings-toggle-btn${animEnabled ? " active" : ""}`}
          onClick={() => setAnimEnabled((v) => !v)}
          aria-pressed={animEnabled}
        >
          <span className="settings-toggle-track">
            <span className="settings-toggle-thumb" />
          </span>
          {animEnabled ? t("settings.prefs.on") : t("settings.prefs.off")}
        </button>
      </div>

      <div className="settings-pref-row">
        <span className="settings-pref-label">{t("settings.prefs.notify")}</span>
        <button
          className={`settings-toggle-btn${notifyOn ? " active" : ""}`}
          onClick={handleToggleNotify}
          aria-pressed={notifyOn}
          disabled={!supported}
        >
          <span className="settings-toggle-track">
            <span className="settings-toggle-thumb" />
          </span>
          {notifyOn ? t("settings.prefs.on") : t("settings.prefs.off")}
        </button>
      </div>
      <p className="settings-section-hint">
        {!supported
          ? t("settings.prefs.notifyUnsupported")
          : permission === "denied"
            ? t("settings.prefs.notifyDenied")
            : t("settings.prefs.notifyHint")}
      </p>
    </div>
  );
}
