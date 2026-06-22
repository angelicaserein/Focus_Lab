import React from "react";

export default function AttrCellMultiSelect({ attrDef, value = [], onChange, onClose }) {
  const toggle = (id) => {
    const next = value.includes(id)
      ? value.filter(v => v !== id)
      : [...value, id];
    onChange(next);
  };

  return (
    <div className="attr-popup attr-multiselect-popup">
      {(attrDef.options ?? []).map(opt => (
        <button
          key={opt.id}
          className={`popup-opt${value.includes(opt.id) ? " selected" : ""}`}
          style={{ "--opt-color": opt.color }}
          onClick={() => toggle(opt.id)}
        >
          {opt.icon && <span className="opt-icon">{opt.icon}</span>}
          {opt.label}
        </button>
      ))}
      {value.length > 0 && (
        <button className="popup-opt clear-opt" onClick={() => { onChange([]); onClose(); }}>
          清除
        </button>
      )}
    </div>
  );
}
