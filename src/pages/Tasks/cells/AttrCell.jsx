import React, { useState, useRef } from "react";
import {
  formatDate, formatMins, isDuePast, attrUnit, optionLabel,
} from "@/utils/task/taskAttrUtils";
import { useLanguage } from "@/context/LanguageContext";
import Popover from "@/components/ui/Popover";
import AttrCellSelect from "@/pages/Tasks/cells/AttrCellSelect";
import AttrCellMultiSelect from "@/pages/Tasks/cells/AttrCellMultiSelect";
import AttrCellText from "@/pages/Tasks/cells/AttrCellText";
import AttrCellDate from "@/pages/Tasks/cells/AttrCellDate";
import AttrCellNumber from "@/pages/Tasks/cells/AttrCellNumber";

export default function AttrCell({ attrDef, todo, onSave }) {
  const { t, lang } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const displayRef = useRef(null);

  const value = todo.attrs?.[attrDef.id];
  const { id: attrId, type, options = [] } = attrDef;
  const unit = attrUnit(t, attrDef);

  // date 也走 Popover（预设按钮 + 日期框），避免在窄单元格里内联展开挤破布局
  const isPopup = type === "select" || type === "multiselect" || type === "date";

  // 系统「截止日期」列：日期旁带一个开关，决定它是否算真正的 DDL
  // （联动主页截止图 + 提醒）。dueDateActive 缺省视为开启。
  const isDeadlineCell = attrId === "dueDate";
  const deadlineActive = todo.attrs?.dueDateActive !== false;

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

  // Inline editors (text / number) replace the cell content in place.
  if (isEditing && !isPopup) {
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
        {renderValue({
          attrId, type, value, options, unit,
          completed: todo.completed, deadlineActive, t, lang,
        })}
        {isDeadlineCell && value && (
          <button
            type="button"
            className={`ddl-toggle${deadlineActive ? " active" : ""}`}
            title={t(deadlineActive ? "tasks.ddl.on" : "tasks.ddl.off")}
            onClick={(e) => { e.stopPropagation(); onSave("dueDateActive", !deadlineActive); }}
          >
            {deadlineActive ? "⚑" : "⚐"}
          </button>
        )}
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
      {isEditing && type === "date" && (
        <Popover anchorEl={displayRef.current} onClose={() => setIsEditing(false)}>
          <AttrCellDate
            value={value ?? ""}
            onPick={(v) => commit(v)}
          />
        </Popover>
      )}
    </>
  );
}

function renderValue({
  attrId, type, value, options, unit, completed, deadlineActive = true, t, lang,
}) {
  if (type === "select") {
    const opt = options.find(o => o.id === value);
    return opt
      ? <span className="attr-select-badge" style={{ "--badge-color": opt.color }}>{optionLabel(t, opt)}</span>
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
              <span key={id} className="attr-ms-pill" style={{ "--badge-color": opt.color }} title={optionLabel(t, opt)}>
                {opt.icon ? `${opt.icon} ${optionLabel(t, opt)}` : optionLabel(t, opt)}
              </span>
            );
          }
          return (
            <span key={id} className="attr-multiselect-chip" title={optionLabel(t, opt)}>
              {opt.icon ?? optionLabel(t, opt)}
            </span>
          );
        })}
      </div>
    );
  }
  if (type === "date") {
    if (!value) return <span className="cell-empty">—</span>;
    // 「截止日期」列关掉开关后，只当普通日期展示：不标逾期红、整体淡化。
    const isDeadlineCol = attrId === "dueDate";
    const past = isDuePast(value) && !completed && (!isDeadlineCol || deadlineActive);
    const inactive = isDeadlineCol && !deadlineActive;
    return (
      <span className={`due-badge${past ? " overdue" : ""}${inactive ? " inactive" : ""}`}>
        {formatDate(value)}
      </span>
    );
  }
  if (type === "number") {
    if (!value) return <span className="cell-empty">—</span>;
    // 单位为分钟的列按 时:分 格式化；其余按 数值 + 单位 展示。
    const isMinutes = ["分", "分钟", "min", "mins"].includes(unit);
    return (
      <span className="est-value">
        {isMinutes ? formatMins(value, lang) : `${value}${unit ? ` ${unit}` : ""}`}
      </span>
    );
  }
  // text
  return value
    ? <span className="notes-text" title={value}>{value}</span>
    : <span className="cell-empty">—</span>;
}
