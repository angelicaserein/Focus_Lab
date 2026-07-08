import React from "react";
import usePrefs from "@/hooks/common/usePrefs";
import { useLanguage } from "@/context/LanguageContext";
import PresetRow from "@/pages/Settings/PresetRow";
import FlaskShapeEditor from "@/pages/Settings/FlaskShapeEditor";
import useNotifyToggle from "@/pages/Settings/useNotifyToggle";

// 偏好设置拆成两组，分别落在设置页的两个 tab：
//   group="appearance" → 烧瓶外形 + 3D 动画（跟主题一起归「外观」）
//   group="timing"     → 计时预设 + 桌面通知（归「计时」）
export default function PrefsSection({ group = "timing" }) {
  const {
    countupPresets, setCountupPresets,
    countdownPresets, setCountdownPresets,
    flaskShape, setFlaskShape,
    animEnabled, setAnimEnabled,
    notifyEnabled, setNotifyEnabled,
  } = usePrefs();
  const { t } = useLanguage();
  const notify = useNotifyToggle({ notifyEnabled, setNotifyEnabled });

  if (group === "appearance") {
    return (
      <div className="settings-section">
        <div className="settings-section-title">{t("settings.prefs.appearanceTitle")}</div>
        <p className="settings-section-hint">{t("settings.prefs.hint")}</p>

        <div className="settings-pref-row settings-pref-row-block">
          <span className="settings-pref-label">{t("settings.prefs.flaskShape")}</span>
          <FlaskShapeEditor flaskShape={flaskShape} setFlaskShape={setFlaskShape} />
        </div>
        <p className="settings-section-hint">{t("settings.prefs.flaskShapeHint")}</p>

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
      </div>
    );
  }

  // group === "timing"
  return (
    <div className="settings-section">
      <div className="settings-section-title">{t("settings.prefs.title")}</div>
      <p className="settings-section-hint">{t("settings.prefs.hint")}</p>

      <PresetRow
        labelKey="settings.prefs.presetsCountup"
        presets={countupPresets}
        setPresets={setCountupPresets}
      />
      <PresetRow
        labelKey="settings.prefs.presetsCountdown"
        presets={countdownPresets}
        setPresets={setCountdownPresets}
      />
      <p className="settings-section-hint">{t("settings.prefs.presetsHint")}</p>

      <div className="settings-pref-row">
        <span className="settings-pref-label">{t("settings.prefs.notify")}</span>
        <button
          className={`settings-toggle-btn${notify.notifyOn ? " active" : ""}`}
          onClick={notify.toggle}
          aria-pressed={notify.notifyOn}
          disabled={!notify.supported}
        >
          <span className="settings-toggle-track">
            <span className="settings-toggle-thumb" />
          </span>
          {notify.notifyOn ? t("settings.prefs.on") : t("settings.prefs.off")}
        </button>
      </div>
      <p className="settings-section-hint">
        {!notify.supported
          ? t("settings.prefs.notifyUnsupported")
          : notify.permission === "denied"
            ? t("settings.prefs.notifyDenied")
            : t("settings.prefs.notifyHint")}
      </p>
    </div>
  );
}
