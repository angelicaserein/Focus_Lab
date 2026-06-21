import React from "react";

export default function AttrCellText({ value, onChange, onBlur, onKeyDown }) {
  return (
    <input
      className="cell-input"
      autoFocus
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      onClick={e => e.stopPropagation()}
    />
  );
}
