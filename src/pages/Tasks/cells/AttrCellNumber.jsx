import React from "react";

export default function AttrCellNumber({ value, unit, onChange, onBlur, onKeyDown }) {
  return (
    <div className="est-input-wrap" onClick={e => e.stopPropagation()}>
      <input
        className="cell-input est-input"
        type="number"
        min="1"
        autoFocus
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
      {unit && <span className="est-unit">{unit}</span>}
    </div>
  );
}
