import React, { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

const PRESET_MIN = 1;
const PRESET_MAX = 180;

// 把输入解析并夹到 [MIN, MAX]；非数字返回 null（表示保持当前值）。
export function clampPreset(raw) {
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return null;
  return Math.min(PRESET_MAX, Math.max(PRESET_MIN, n));
}

// 一行三档时长预设编辑器。允许中途输入非法值，失焦 / 回车时才夹取并写回。
// 草稿态内聚在本组件；提交时同步更新 presets（生效值）与 drafts（显示值）。
export default function PresetRow({ labelKey, presets, setPresets }) {
  const { t } = useLanguage();
  const [drafts, setDrafts] = useState(() => presets.map(String));

  const commit = (idx, raw) => {
    const clamped = clampPreset(raw);
    if (clamped === null) {
      setDrafts((d) => d.map((v, i) => (i === idx ? String(presets[idx]) : v)));
      return;
    }
    setPresets(presets.map((v, i) => (i === idx ? clamped : v)));
    setDrafts((d) => d.map((v, i) => (i === idx ? String(clamped) : v)));
  };

  return (
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
              onBlur={(e) => commit(idx, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commit(idx, e.target.value);
                }
              }}
            />
            <span className="settings-preset-unit">{t("settings.prefs.minUnit")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
