import React, { useState } from "react";
import { Check, ChevronDown, ChevronRight, X } from "lucide-react";
import AttrCell from "@/pages/Tasks/cells/AttrCell";

// 判断某属性在这条任务上是否已有值——空的属性折叠时不显示，避免一排「—」造成视觉噪音。
function hasValue(todo, attr) {
  const v = todo.attrs?.[attr.id];
  if (v === null || v === undefined || v === "") return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

// 一张任务卡：大圆勾选 + 可点改的标题 + 已填属性的小徽标；点「展开」才露出全部属性编辑区，
// 渐进披露、默认不铺满信息，是这套界面对「一眼看太多会瘫掉」的主要照顾。
function TaskCard({ todo, visibleAttrs, onToggle, onEditText, onSaveAttr, onDelete }) {
  const [editingText, setEditingText] = useState(false);
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState(false);

  const startEdit = () => { setDraft(todo.text); setEditingText(true); };
  const commit = () => { onEditText(todo.id, draft); setEditingText(false); };
  const onKey = (e) => {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    if (e.key === "Escape") setEditingText(false);
  };

  const saveAttr = (attrId, value) => onSaveAttr(todo.id, attrId, value);
  const filled = visibleAttrs.filter((a) => hasValue(todo, a));

  return (
    <div className={`fc-card${todo.completed ? " done" : ""}`}>
      <button
        type="button"
        className="fc-check"
        onClick={() => onToggle(todo.id)}
        aria-label={todo.completed ? "标记为未完成" : "标记为已完成"}
      >
        {todo.completed && <Check size={16} strokeWidth={3} aria-hidden="true" />}
      </button>

      <div className="fc-body">
        <div className="fc-title-row">
          {editingText ? (
            <input
              className="fc-title-input"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={onKey}
            />
          ) : (
            <span className="fc-title" onClick={startEdit} title="点击修改">
              {todo.text}
              {todo.recurringDays?.length > 0 && <span className="fc-recur" title="重复任务">↺</span>}
            </span>
          )}

          {visibleAttrs.length > 0 && (
            <button
              type="button"
              className="fc-expand"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? "收起属性" : "展开属性"}
              aria-expanded={expanded}
            >
              {expanded ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
            </button>
          )}
          <button type="button" className="fc-del" onClick={() => onDelete(todo.id)} title="删除任务">
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        {/* 折叠态：只把已填的属性以徽标形式露出来，点一下就能就地改（复用任务库的编辑弹层） */}
        {!expanded && filled.length > 0 && (
          <div className="fc-chips">
            {filled.map((attr) => (
              <AttrCell key={attr.id} attrDef={attr} todo={todo} onSave={saveAttr} />
            ))}
          </div>
        )}

        {/* 展开态：全部属性带标签逐行列出，空属性也能点开填写 —— 功能与任务库完全一致 */}
        {expanded && (
          <div className="fc-editor">
            {visibleAttrs.map((attr) => (
              <div key={attr.id} className="fc-editor-row">
                <span className="fc-editor-label">{attr.name}</span>
                <div className="fc-editor-cell">
                  <AttrCell attrDef={attr} todo={todo} onSave={saveAttr} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(TaskCard);
