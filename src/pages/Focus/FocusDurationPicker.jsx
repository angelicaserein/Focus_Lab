import React, { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

// 烧瓶时长选择：三档快捷预设 + 自定义输入。作用于当前模式（正计时注满时长 / 倒计时起始时长）。
// 自己管理「自定义草稿」这份局部状态，把夹取/回填/预设高亮的细节从 FocusConsole 隔离出去。
const MIN_DURATION = 1;
const MAX_DURATION = 180;

export default function FocusDurationPicker({
  timerMode = "countup",
  durationMins,
  onDurationChange,
  presets = [15, 25, 45],
  canEdit = true,
}) {
  const { t } = useLanguage();

  // 当前时长是否为「自定义」（不落在预设里）——决定输入框是否高亮、是否回填数值
  const isCustomDuration = !presets.includes(durationMins);
  const [customDraft, setCustomDraft] = useState(isCustomDuration ? String(durationMins) : "");

  // durationMins 由外部改变时（切换正/倒计时会换成另一套存储值、或落到某个预设）
  // 让草稿重新对齐，避免残留上一模式的数字。用户输入中 durationMins 未变，不会打断。
  useEffect(() => {
    setCustomDraft(isCustomDuration ? String(durationMins) : "");
  }, [durationMins, isCustomDuration]);

  // 提交自定义时长：夹到 [MIN, MAX]；若落到预设值则清空草稿改由预设高亮
  const commitCustomDuration = (raw) => {
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) {
      setCustomDraft(isCustomDuration ? String(durationMins) : "");
      return;
    }
    const clamped = Math.min(MAX_DURATION, Math.max(MIN_DURATION, n));
    onDurationChange?.(clamped);
    setCustomDraft(presets.includes(clamped) ? "" : String(clamped));
  };

  const pickPreset = (mins) => {
    setCustomDraft("");
    onDurationChange?.(mins);
  };

  return (
    <div
      className="focus-duration-row"
      role="group"
      aria-label={timerMode === "countdown" ? t("focus.countdownDurationAria") : t("focus.fillDurationAria")}
    >
      <span className="focus-duration-label">
        {t("focus.durationValue", {
          label: timerMode === "countdown" ? t("focus.countdown") : t("focus.fillLabel"),
          mins: durationMins,
        })}
      </span>
      <div className="focus-duration-pills">
        {presets.map((mins) => (
          <button
            key={mins}
            type="button"
            className={`focus-duration-pill${!isCustomDuration && durationMins === mins ? " active" : ""}`}
            onClick={() => pickPreset(mins)}
            disabled={!canEdit}
            aria-pressed={!isCustomDuration && durationMins === mins}
          >
            {mins}
          </button>
        ))}
        <div className={`focus-duration-custom${isCustomDuration ? " active" : ""}`}>
          <input
            type="number"
            className="focus-duration-input"
            min={MIN_DURATION}
            max={MAX_DURATION}
            inputMode="numeric"
            value={customDraft}
            placeholder={t("focus.customDuration")}
            disabled={!canEdit}
            aria-label={t("focus.customDuration")}
            onChange={(e) => setCustomDraft(e.target.value)}
            onBlur={(e) => commitCustomDuration(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitCustomDuration(e.target.value);
              }
            }}
          />
          <span className="focus-duration-unit">{t("focus.minUnit")}</span>
        </div>
      </div>
    </div>
  );
}
