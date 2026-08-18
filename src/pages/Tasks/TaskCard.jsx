import React, { useState, useRef } from "react";
import { Check, ChevronDown, ChevronRight, X } from "lucide-react";
import AttrCell from "@/pages/Tasks/cells/AttrCell";
import RecurringDayPicker, { recurringLabel } from "@/components/todo/RecurringDayPicker";
import useOutsideClick from "@/hooks/common/useOutsideClick";
import { useLanguage } from "@/context/LanguageContext";
import desktop from "@/utils/desktop/desktopBridge";

// 判断某属性在这条任务上是否已有值——空的属性折叠时不显示，避免一排「—」造成视觉噪音。
function hasValue(todo, attr) {
  const v = todo.attrs?.[attr.id];
  if (v === null || v === undefined || v === "") return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

// 一张任务卡：大圆勾选 + 可点改的标题 + 已填属性的小徽标；点「展开」才露出全部属性编辑区，
// 渐进披露、默认不铺满信息，是这套界面对「一眼看太多会瘫掉」的主要照顾。
function TaskCard({ todo, visibleAttrs, onToggle, onEditText, onSaveAttr, onDelete, onSetRecurring }) {
  const { t } = useLanguage();
  const [editingText, setEditingText] = useState(false);
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const cardRef = useRef(null);
  useOutsideClick(cardRef, () => setShowDayPicker(false), showDayPicker);

  const startEdit = () => { setDraft(todo.text); setEditingText(true); };
  const commit = () => { onEditText(todo.id, draft); setEditingText(false); };
  const onKey = (e) => {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    if (e.key === "Escape") setEditingText(false);
  };

  const saveAttr = (attrId, value) => onSaveAttr(todo.id, attrId, value);
  const filled = visibleAttrs.filter((a) => hasValue(todo, a));
  const recurringDays = todo.recurringDays ?? [];
  const recurLabel = recurringLabel(recurringDays, t);

  return (
    <div
      className={`fc-card${todo.completed ? " done" : ""}${showDayPicker ? " picker-open" : ""}`}
      data-highlight-id={todo.id}
      ref={cardRef}
    >
      <button
        type="button"
        className="fc-check"
        onClick={() => onToggle(todo.id)}
        aria-label={todo.completed ? t("tasks.markIncomplete") : t("tasks.markComplete")}
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
            <span className="fc-title" onClick={startEdit} title={t("tasks.clickToEdit")}>
              {todo.text}
            </span>
          )}

          {/* ↺ 固定任务：选中的星期几到点会自动重新变回未完成，
              所以设置入口就长在任务上，不另开一处「重复规则」页面。 */}
          <button
            type="button"
            className={`fc-recur${recurringDays.length > 0 ? " active" : ""}`}
            onClick={() => setShowDayPicker((v) => !v)}
            title={recurringDays.length > 0
              ? t("todo.form.recurringSet", { label: recurLabel })
              : t("todo.item.setRecurring")}
            aria-pressed={recurringDays.length > 0}
          >
            ↺{recurringDays.length > 0 && <span className="fc-recur-label">{recurLabel}</span>}
          </button>

          {visibleAttrs.length > 0 && (
            <button
              type="button"
              className="fc-expand"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? t("tasks.collapseAttrs") : t("tasks.expandAttrs")}
              aria-expanded={expanded}
            >
              {expanded ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
            </button>
          )}
          <button type="button" className="fc-del" onClick={() => onDelete(todo.id)} title={t("todo.deleteTitle")}>
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        {/* 拖文件进来建的任务：点一下用系统默认程序打开那个文件。
            「想到该改论文」和「真的开始改」之间隔着「找到那个文件」，
            这个按钮就是把那一步省掉。文件被移走 / 删掉时 openPath 会返回
            一句原因，用 title 交代，不弹窗打断。 */}
        {todo.filePath && (
          <button
            type="button"
            className="todo-file-open"
            title={todo.filePath}
            onClick={async (e) => {
              // 按钮引用要在 await 之前拿：事件处理函数同步返回之后 currentTarget 就是 null 了
              const btn = e.currentTarget;
              const err = await desktop.openPath(todo.filePath);
              if (err) btn.title = t("todo.item.openFileFailed");
            }}
          >
            📎 {t("todo.item.openFile")}
          </button>
        )}

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

        {showDayPicker && (
          <RecurringDayPicker
            days={recurringDays}
            onChange={(d) => onSetRecurring(todo.id, d)}
            onClose={() => setShowDayPicker(false)}
          />
        )}
      </div>
    </div>
  );
}

export default React.memo(TaskCard);
