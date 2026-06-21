import React from "react";

const SCALES = [
  { key: "focusLevel",      label: "整体专注程度", low: "分心", high: "专注" },
  { key: "startDifficulty", label: "启动困难程度", low: "困难", high: "容易" },
  { key: "moodState",       label: "心情状态",     low: "焦虑", high: "平静" },
];

function LikertRow({ scaleKey, label, low, high, value, onChange }) {
  return (
    <div className="research-likert-row">
      <span className="research-likert-label">{label}</span>
      <div className="research-likert-circles">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`research-likert-btn${value === n ? " selected" : ""}`}
            onClick={() => onChange(scaleKey, value === n ? null : n)}
            aria-label={`${label} ${n}分`}
            aria-pressed={value === n}
          >
            {n}
          </button>
        ))}
      </div>
      <span className="research-likert-anchors">
        <span>{low}</span>
        <span className="research-likert-anchor-sep">→</span>
        <span>{high}</span>
      </span>
    </div>
  );
}

// 自评量表网格：渲染全部 Likert 量表行。
export default function ScaleGrid({ scales, onChange }) {
  return (
    <div className="research-likert-container">
      {SCALES.map((s) => (
        <LikertRow
          key={s.key}
          scaleKey={s.key}
          label={s.label}
          low={s.low}
          high={s.high}
          value={scales[s.key]}
          onChange={onChange}
        />
      ))}
    </div>
  );
}
