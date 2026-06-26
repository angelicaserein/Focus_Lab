import React, { useState, useRef } from "react";
import { formatDate, formatMins, isDuePast } from "../../../utils/taskAttrUtils";
import Popover from "../../../components/Popover";
import AttrCellSelect from "./AttrCellSelect";
import AttrCellMultiSelect from "./AttrCellMultiSelect";
import AttrCellText from "./AttrCellText";
import AttrCellDate from "./AttrCellDate";
import AttrCellNumber from "./AttrCellNumber";

export default function AttrCell({ attrDef, todo, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const displayRef = useRef(null);

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

  // Inline editors (text / date / number) replace the cell content in place.
  if (isEditing && !isPopup) {
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

  // Popup editors (select / multiselect) render in a portal anchored to the cell.
  return (
    <>
      <div className="attr-cell-display" ref={displayRef} onClick={startEdit}>
        {renderValue(attrId, type, value, options, unit, todo.completed)}
      </div>
      {isEditing && type === "select" && (
        <Popover anchorEl={displayRef.current} onClose={() => setIsEditing(false)}>
          <AttrCellSelect attrDef={attrDef} value={value} onSelect={(v) => commit(v)} />
        </Popover>
      )}
      {isEditing && type === "multiselect" && (
        <Popover anchorEl={displayRef.current} onClose={() => setIsEditing(false)}>
          <AttrCellMultiSelect
            attrDef={attrDef}
            value={value ?? []}
            onChange={(v) => onSave(attrId, v)}
            onClose={() => setIsEditing(false)}
          />
        </Popover>
      )}
    </>
  );
}

function renderValue(attrId, type, value, options, unit, completed) {
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
          if (!opt) return null;
          // 有颜色的自定义多选 → 彩色药丸；只有图标的内置标签 → 图标
          if (opt.color) {
            return (
              <span key={id} className="attr-ms-pill" style={{ "--badge-color": opt.color }} title={opt.label}>
                {opt.icon ? `${opt.icon} ${opt.label}` : opt.label}
              </span>
            );
          }
          return (
            <span key={id} className="attr-multiselect-chip" title={opt.label}>
              {opt.icon ?? opt.label}
            </span>
          );
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
    // 仅内置「预计时长」(或单位为分钟) 按 时:分 格式化；其余按 数值 + 单位 展示。
    const isMinutes = attrId === "estimatedMins" || unit === "分" || unit === "分钟";
    return (
      <span className="est-value">
        {isMinutes ? formatMins(value) : `${value}${unit ? ` ${unit}` : ""}`}
      </span>
    );
  }
  // text
  return value
    ? <span className="notes-text" title={value}>{value}</span>
    : <span className="cell-empty">—</span>;
}
