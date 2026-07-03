import React from "react";
import { recurringLabel } from "./RecurringDayPicker";
import { useLanguage } from "../context/LanguageContext";

// 任务行操作按钮区（固定任务切换 + 标签切换 + 编辑）。
// Picker 面板由父组件 TodoItem 渲染，保持 .todo-item-wrap 层级不变。
export default function TodoItemActions({
  todo,
  showDayPicker,
  showTagPicker,
  onToggleDayPicker,
  onToggleTagPicker,
  onStartEdit,
}) {
  const { t } = useLanguage();
  const recurringDays = todo.recurringDays ?? [];
  const label = recurringLabel(recurringDays, t);
  const todoTags = todo.attrs?.tags ?? [];

  return (
    <>
      <button
        className={`recurring-item-btn${recurringDays.length > 0 ? " active" : ""}`}
        onClick={(e) => { e.stopPropagation(); onToggleDayPicker(); }}
        title={recurringDays.length > 0 ? t("todo.form.recurringSet", { label }) : t("todo.item.setRecurring")}
        aria-pressed={recurringDays.length > 0}
      >
        ↺{recurringDays.length > 0 && (
          <span className="recurring-btn-label">{label}</span>
        )}
      </button>

      <button
        className={`tag-item-btn${todoTags.length > 0 ? " active" : ""}`}
        onClick={(e) => { e.stopPropagation(); onToggleTagPicker(); }}
        title={t("todo.item.tags")}
        aria-pressed={showTagPicker}
      >
        🏷
      </button>

      <button
        className="edit-btn"
        onClick={onStartEdit}
        aria-label={t("todo.item.editAria", { text: todo.text })}
        title={t("todo.item.editTitle")}
      >
        ✎
      </button>
    </>
  );
}
