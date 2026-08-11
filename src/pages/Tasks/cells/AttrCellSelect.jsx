import React from "react";
import { optionLabel } from "@/utils/task/taskAttrUtils";
import { useLanguage } from "@/context/LanguageContext";

export default function AttrCellSelect({ attrDef, value, onSelect }) {
  const { t } = useLanguage();

  return (
    <div className="attr-popup attr-select-popup">
      {(attrDef.options ?? []).map(opt => (
        <button
          key={opt.id}
          className={`popup-opt${value === opt.id ? " selected" : ""}`}
          style={{ "--opt-color": opt.color }}
          onClick={() => onSelect(opt.id)}
        >
          {opt.icon && <span className="opt-icon">{opt.icon}</span>}
          {optionLabel(t, opt)}
        </button>
      ))}
      {value && (
        <button className="popup-opt clear-opt" onClick={() => onSelect(null)}>{t("tasks.clear")}</button>
      )}
    </div>
  );
}
