import React from "react";
import { addDays } from "@/utils/time";

// 截止日期编辑：快捷预设（今天/明天/+3天/+1周/清除）+ 原生日期框。
// 点预设或改日期即提交（onPick），免翻日历。渲染在 Popover 里，不挤占表格单元格。
const PRESETS = [
  { label: "今天", days: 0 },
  { label: "明天", days: 1 },
  { label: "+3天", days: 3 },
  { label: "+1周", days: 7 },
];

export default function AttrCellDate({ value, onPick }) {
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
              {p.label}
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
          清除日期
        </button>
      )}
    </div>
  );
}
