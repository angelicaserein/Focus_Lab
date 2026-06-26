import React from "react";
import { TASK_TYPE_OPTIONS } from "../utils/scenarioConstants";

const TAG_MAP = Object.fromEntries(TASK_TYPE_OPTIONS.map((o) => [o.id, o]));

/**
 * 非编辑态的任务展示层：复选框 + 文本 + 标签 + 焦点样式。
 * 所有状态和回调由父组件 TodoItem 传入。
 */
export default function TodoItemDisplay({ todo, recurringDays, todoTags, onToggle }) {
  return (
    <>
      <label className="checkbox-wrap">
        <input
          className="native-checkbox"
          type="checkbox"
          checked={!!todo.completed}
          onChange={onToggle}
          aria-label={`标记 ${todo.text} 为完成`}
        />
        <span className={`custom-checkbox ${todo.completed ? "checked" : ""}`} />
      </label>

      <div className="todo-text-wrap">
        <div className={`todo-text ${todo.completed ? "completed" : ""}`}>
          {recurringDays.length > 0 && (
            <span className="recurring-icon" title={`固定：${recurringDays.join(",")}`}>↺</span>
          )}
          {todo.text}
        </div>
        {todoTags.length > 0 && (
          <div className="todo-tags">
            {todoTags.map((id) => TAG_MAP[id] && (
              <span key={id} className="todo-tag-chip">
                {TAG_MAP[id].icon} {TAG_MAP[id].label}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
