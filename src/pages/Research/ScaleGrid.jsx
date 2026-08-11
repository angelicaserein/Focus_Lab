import React from "react";
import { useLanguage } from "@/context/LanguageContext";

// 量表 key 同时是 i18n key 的中缀：research.scale.<key>[.low|.high]。
const SCALE_KEYS = ["focusLevel", "startDifficulty", "moodState"];

function LikertRow({ scaleKey, label, low, high, value, onChange, ariaFor }) {
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
            aria-label={ariaFor(n)}
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
  const { t } = useLanguage();

  return (
    <div className="research-likert-container">
      {SCALE_KEYS.map((key) => (
        <LikertRow
          key={key}
          scaleKey={key}
          label={t(`research.scale.${key}`)}
          low={t(`research.scale.${key}.low`)}
          high={t(`research.scale.${key}.high`)}
          value={scales[key]}
          onChange={onChange}
          ariaFor={(n) =>
            t("research.scale.point", { label: t(`research.scale.${key}`), n })
          }
        />
      ))}
    </div>
  );
}
