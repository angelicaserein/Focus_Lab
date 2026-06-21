import React from "react";

export default function AttrCellDate({ value, onChange, onBlur, onKeyDown }) {
  return (
    <input
      className="cell-input date-input"
      type="date"
      autoFocus
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      onClick={e => e.stopPropagation()}
    />
  );
}
