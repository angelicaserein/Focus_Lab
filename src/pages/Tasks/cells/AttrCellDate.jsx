import React from "react";
import { addDays } from "@/utils/time";
import { useLanguage } from "@/context/LanguageContext";

// 截止日期编辑：快捷预设（今天/明天/+3天/+1周/清除）+ 原生日期框。
// 点预设或改日期即提交（onPick），免翻日历。渲染在 Popover 里，不挤占卡片。
const PRESETS = [
  { labelKey: "common.today", days: 0 },
  { labelKey: "tasks.due.tomorrow", days: 1 },
  { labelKey: "tasks.due.plus3d", days: 3 },
  { labelKey: "tasks.due.plus1w", days: 7 },
];

export default function AttrCellDate({ value, onPick }) {
  const { t } = useLanguage();

  return (
    <div className="date-picker-pop" onClick={(e) => e.stopPropagation()}>
      <div className="date-preset-row">
        {PRESETS.map((p) => {
          const d = addDays(p.days);
          return (
            <button
              key={p.days}
              type="button"
              className={`date-preset-btn${value === d ? " active" : ""}`}
              onClick={() => onPick(d)}
            >
              {t(p.labelKey)}
            </button>
          );
        })}
      </div>
      <input
        className="cell-input date-input"
        type="date"
        autoFocus
        value={value || ""}
        onChange={(e) => onPick(e.target.value || null)}
      />
      {value && (
        <button type="button" className="date-clear-btn" onClick={() => onPick(null)}>
          {t("tasks.due.clearDate")}
        </button>
      )}
    </div>
  );
}
