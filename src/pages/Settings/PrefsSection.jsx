import React, { useState } from "react";
import usePrefs from "@/hooks/common/usePrefs";
import { useLanguage } from "@/context/LanguageContext";
import FocusFlask from "@/pages/Focus/FocusFlask";
import {
  FLASK_PRESETS,
  FLASK_PRESET_ORDER,
  FLASK_PARAM_DEFS,
} from "@/pages/Focus/flaskShapes";
import {
  notifySupported,
  notifyPermission,
  requestNotifyPermission,
  showNotification,
} from "@/utils/notify";

const PRESET_MIN = 1;
const PRESET_MAX = 180;

export default function PrefsSection() {
  const {
    countupPresets, setCountupPresets,
    countdownPresets, setCountdownPresets,
    flaskShape, setFlaskShape,
    animEnabled, setAnimEnabled,
    notifyEnabled, setNotifyEnabled,
  } = usePrefs();
  const { t } = useLanguage();

  // 预设时长草稿：正/倒计时各一套。允许中途输入非法值，失焦/回车时才夹取并写回
  const [countupDrafts, setCountupDrafts] = useState(() => countupPresets.map(String));
  const [countdownDrafts, setCountdownDrafts] = useState(() => countdownPresets.map(String));

  // 提交某一档预设：夹到 [MIN, MAX]；非数字则回滚草稿到当前生效值
  const commitPreset = (presets, setPresets, setDrafts, idx, raw) => {
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) {
      setDrafts((d) => d.map((v, i) => (i === idx ? String(presets[idx]) : v)));
      return;
    }
    const clamped = Math.min(PRESET_MAX, Math.max(PRESET_MIN, n));
    setPresets(presets.map((v, i) => (i === idx ? clamped : v)));
    setDrafts((d) => d.map((v, i) => (i === idx ? String(clamped) : v)));
  };

  // 一行三档时长预设编辑器（正/倒计时各渲染一行）
  const renderPresetRow = (labelKey, presets, setPresets, drafts, setDrafts) => (
    <div className="settings-pref-row">
      <span className="settings-pref-label">{t(labelKey)}</span>
      <div className="settings-preset-group">
        {drafts.map((draft, idx) => (
          <div key={idx} className="settings-preset-item">
            <input
              type="number"
              className="settings-preset-input"
              min={PRESET_MIN}
              max={PRESET_MAX}
              inputMode="numeric"
              value={draft}
              aria-label={t("settings.prefs.presetSlot", { label: t(labelKey), n: idx + 1 })}
              onChange={(e) =>
                setDrafts((d) => d.map((v, i) => (i === idx ? e.target.value : v)))
              }
              onBlur={(e) => commitPreset(presets, setPresets, setDrafts, idx, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitPreset(presets, setPresets, setDrafts, idx, e.target.value);
                }
              }}
            />
            <span className="settings-preset-unit">{t("settings.prefs.minUnit")}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // 烧瓶：选预设＝载入其默认参数；拖滑杆＝在当前参数上覆盖单项；切换敞口/瓶塞
  const selectFlaskPreset = (key) =>
    setFlaskShape({ preset: key, params: { ...FLASK_PRESETS[key] } });
  const setFlaskParam = (key, value) =>
    setFlaskShape({ preset: flaskShape.preset, params: { ...flaskShape.params, [key]: value } });
  const toggleFlaskOpen = () =>
    setFlaskShape({ preset: flaskShape.preset, params: { ...flaskShape.params, open: !flaskShape.params.open } });

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

      {renderPresetRow("settings.prefs.presetsCountup", countupPresets, setCountupPresets, countupDrafts, setCountupDrafts)}
      {renderPresetRow("settings.prefs.presetsCountdown", countdownPresets, setCountdownPresets, countdownDrafts, setCountdownDrafts)}
      <p className="settings-section-hint">{t("settings.prefs.presetsHint")}</p>

      <div className="settings-pref-row settings-pref-row-block">
        <span className="settings-pref-label">{t("settings.prefs.flaskShape")}</span>

        <div className="settings-flask-group" role="radiogroup" aria-label={t("settings.prefs.flaskShape")}>
          {FLASK_PRESET_ORDER.map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={flaskShape.preset === key}
              className={`settings-flask-option${flaskShape.preset === key ? " active" : ""}`}
              onClick={() => selectFlaskPreset(key)}
            >
              <FocusFlask progress={0.6} params={FLASK_PRESETS[key]} />
              <span className="settings-flask-name">{t(`settings.prefs.flaskShape.${key}`)}</span>
            </button>
          ))}
        </div>

        <div className="settings-flask-editor">
          <div className="settings-flask-preview">
            <FocusFlask progress={0.55} params={flaskShape.params} />
          </div>
          <div className="settings-flask-sliders">
            {FLASK_PARAM_DEFS.map(({ key, min, max, step }) => (
              <label key={key} className="settings-flask-slider">
                <span className="settings-flask-slider-name">{t(`settings.prefs.flaskParam.${key}`)}</span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={flaskShape.params[key]}
                  onChange={(e) => setFlaskParam(key, Number(e.target.value))}
                />
              </label>
            ))}
            <button
              type="button"
              className={`settings-toggle-btn settings-flask-open${flaskShape.params.open ? " active" : ""}`}
              onClick={toggleFlaskOpen}
              aria-pressed={flaskShape.params.open}
            >
              <span className="settings-toggle-track">
                <span className="settings-toggle-thumb" />
              </span>
              {flaskShape.params.open ? t("settings.prefs.flaskOpen") : t("settings.prefs.flaskCapped")}
            </button>
          </div>
        </div>
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
