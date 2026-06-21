import React, { useState } from "react";
import { formatDate, formatMins, isDuePast } from "../../../utils/taskAttrUtils";
import AttrCellSelect from "./AttrCellSelect";
import AttrCellMultiSelect from "./AttrCellMultiSelect";
import AttrCellText from "./AttrCellText";
import AttrCellDate from "./AttrCellDate";
import AttrCellNumber from "./AttrCellNumber";

export default function AttrCell({ attrDef, todo, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const value = todo.attrs?.[attrDef.id];
  const { id: attrId, type, options = [], unit } = attrDef;

  const isPopup = type === "select" || type === "multiselect";

  const startEdit = (e) => {
    e.stopPropagation();
    if (isEditing) return;
    if (!isPopup) setDraft(value ?? "");
    setIsEditing(true);
  };

  const commit = (val) => {
    onSave(attrId, val);
    setIsEditing(false);
  };

  const handleInlineBlur = () => {
    if (type === "number") {
      const n = parseInt(draft, 10);
      commit(!isNaN(n) && n > 0 ? n : null);
    } else {
      commit(draft.trim() || null);
    }
  };

  const handleInlineKey = (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleInlineBlur(); }
    if (e.key === "Escape") setIsEditing(false);
  };

  if (isEditing) {
    if (type === "select") {
      return (
        <AttrCellSelect
          attrDef={attrDef}
          value={value}
          onSelect={(v) => commit(v)}
          onClose={() => setIsEditing(false)}
        />
      );
    }
    if (type === "multiselect") {
      return (
        <AttrCellMultiSelect
          attrDef={attrDef}
          value={value ?? []}
          onChange={(v) => onSave(attrId, v)}
          onClose={() => setIsEditing(false)}
        />
      );
    }
    if (type === "date") {
      return (
        <AttrCellDate
          value={draft}
          onChange={setDraft}
          onBlur={handleInlineBlur}
          onKeyDown={handleInlineKey}
        />
      );
    }
    if (type === "number") {
      return (
        <AttrCellNumber
          value={draft}
          unit={unit}
          onChange={setDraft}
          onBlur={handleInlineBlur}
          onKeyDown={handleInlineKey}
        />
      );
    }
    return (
      <AttrCellText
        value={draft}
        onChange={setDraft}
        onBlur={handleInlineBlur}
        onKeyDown={handleInlineKey}
      />
    );
  }

  return (
    <div className="attr-cell-display" onClick={startEdit}>
      {renderValue(type, value, options, unit, todo.completed)}
    </div>
  );
}

function renderValue(type, value, options, unit, completed) {
  if (type === "select") {
    const opt = options.find(o => o.id === value);
    return opt
      ? <span className="attr-select-badge" style={{ "--badge-color": opt.color }}>{opt.label}</span>
      : <span className="cell-empty">—</span>;
  }
  if (type === "multiselect") {
    const vals = value ?? [];
    if (!vals.length) return <span className="cell-empty">—</span>;
    return (
      <div className="attr-multiselect-chips">
        {vals.map(id => {
          const opt = options.find(o => o.id === id);
          return opt
            ? <span key={id} className="attr-multiselect-chip" title={opt.label}>
                {opt.icon ?? opt.label}
              </span>
            : null;
        })}
      </div>
    );
  }
  if (type === "date") {
    if (!value) return <span className="cell-empty">—</span>;
    const past = isDuePast(value) && !completed;
    return <span className={`due-badge${past ? " overdue" : ""}`}>{formatDate(value)}</span>;
  }
  if (type === "number") {
    if (!value) return <span className="cell-empty">—</span>;
    return <span className="est-value">{formatMins(value)}</span>;
  }
  // text
  return value
    ? <span className="notes-text" title={value}>{value}</span>
    : <span className="cell-empty">—</span>;
}
