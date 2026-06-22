import React from "react";

export default function AttrCellSelect({ attrDef, value, onSelect }) {
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
          {opt.label}
        </button>
      ))}
      {value && (
        <button className="popup-opt clear-opt" onClick={() => onSelect(null)}>清除</button>
      )}
    </div>
  );
}
