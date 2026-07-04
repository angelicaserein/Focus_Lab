import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import FocusFlask from "@/pages/Focus/FocusFlask";
import {
  FLASK_PRESETS,
  FLASK_PRESET_ORDER,
  FLASK_PARAM_DEFS,
} from "@/pages/Focus/flaskShapes";

// 烧瓶外形编辑器：三个烧瓶各自独立编辑与保存。
// 点缩略图＝选为专注页使用的烧瓶；拖滑杆／切换敞口＝只改这一个烧瓶；
// 「恢复默认形状」＝把该烧瓶还原到它的预设参数（一共 3 个，各管各的）。
export default function FlaskShapeEditor({ flaskShape, setFlaskShape }) {
  const { t } = useLanguage();
  const { preset: active, presets } = flaskShape;

  const selectPreset = (key) =>
    setFlaskShape({ ...flaskShape, preset: key });
  const setParam = (key, param, value) =>
    setFlaskShape({
      ...flaskShape,
      presets: { ...presets, [key]: { ...presets[key], [param]: value } },
    });
  const toggleOpen = (key) =>
    setFlaskShape({
      ...flaskShape,
      presets: { ...presets, [key]: { ...presets[key], open: !presets[key].open } },
    });
  const restoreDefault = (key) =>
    setFlaskShape({
      ...flaskShape,
      presets: { ...presets, [key]: { ...FLASK_PRESETS[key] } },
    });

  return (
    <div
      className="settings-flask-list"
      role="radiogroup"
      aria-label={t("settings.prefs.flaskShape")}
    >
      {FLASK_PRESET_ORDER.map((key) => {
        const params = presets[key];
        const isActive = active === key;
        return (
          <div
            key={key}
            className={`settings-flask-item${isActive ? " active" : ""}`}
          >
            <button
              type="button"
              role="radio"
              aria-checked={isActive}
              className="settings-flask-select"
              onClick={() => selectPreset(key)}
            >
              <FocusFlask progress={0.55} params={params} />
              <span className="settings-flask-name">{t(`settings.prefs.flaskShape.${key}`)}</span>
            </button>

            <div className="settings-flask-sliders">
              {FLASK_PARAM_DEFS.map(({ key: param, min, max, step }) => (
                <label key={param} className="settings-flask-slider">
                  <span className="settings-flask-slider-name">{t(`settings.prefs.flaskParam.${param}`)}</span>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={params[param]}
                    onChange={(e) => setParam(key, param, Number(e.target.value))}
                  />
                </label>
              ))}
              <div className="settings-flask-actions">
                <button
                  type="button"
                  className={`settings-toggle-btn settings-flask-open${params.open ? " active" : ""}`}
                  onClick={() => toggleOpen(key)}
                  aria-pressed={params.open}
                >
                  <span className="settings-toggle-track">
                    <span className="settings-toggle-thumb" />
                  </span>
                  {params.open ? t("settings.prefs.flaskOpen") : t("settings.prefs.flaskCapped")}
                </button>
                <button
                  type="button"
                  className="settings-flask-restore"
                  onClick={() => restoreDefault(key)}
                >
                  {t("settings.prefs.flaskRestore")}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
