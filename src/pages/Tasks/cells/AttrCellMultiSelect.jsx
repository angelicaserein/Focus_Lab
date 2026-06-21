import React, { useRef } from "react";
import useOutsideClick from "../../../hooks/useOutsideClick";

export default function AttrCellMultiSelect({ attrDef, value = [], onChange, onClose }) {
  const ref = useRef(null);
  useOutsideClick(ref, onClose, true);

  const toggle = (id) => {
    const next = value.includes(id)
      ? value.filter(v => v !== id)
      : [...value, id];
    onChange(next);
  };

  return (
    <div className="attr-popup attr-multiselect-popup" ref={ref} onClick={e => e.stopPropagation()}>
      {(attrDef.options ?? []).map(opt => (
        <button
          key={opt.id}
          className={`popup-opt${value.includes(opt.id) ? " selected" : ""}`}
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
