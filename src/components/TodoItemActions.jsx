import React from "react";
import { recurringLabel } from "./RecurringDayPicker";

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
  const recurringDays = todo.recurringDays ?? [];
  const label = recurringLabel(recurringDays);
  const todoTags = todo.attrs?.tags ?? [];

  return (
    <>
      <button
        className={`recurring-item-btn${recurringDays.length > 0 ? " active" : ""}`}
        onClick={(e) => { e.stopPropagation(); onToggleDayPicker(); }}
        title={recurringDays.length > 0 ? `固定：${label}` : "设为固定任务"}
        aria-pressed={recurringDays.length > 0}
      >
        ↺{recurringDays.length > 0 && (
          <span className="recurring-btn-label">{label}</span>
        )}
      </button>

      <button
        className={`tag-item-btn${todoTags.length > 0 ? " active" : ""}`}
        onClick={(e) => { e.stopPropagation(); onToggleTagPicker(); }}
        title="任务标签"
        aria-pressed={showTagPicker}
      >
        🏷
      </button>

      <button
        className="edit-btn"
        onClick={onStartEdit}
        aria-label={`编辑 ${todo.text}`}
        title="编辑任务"
      >
        ✎
      </button>
    </>
  );
}
