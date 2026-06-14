import React from "react";
import TodoApp from "../../components/TodoApp";

// 普通（非沉浸）视图：上方计时控制台（已选任务 chips + 开始/重置），下方任务管理。
export default function FocusConsole({
  selectedTodos,
  hasSelection,
  canReset,
  onStart,
  onReset,
  onStop,
  onRemoveFocus,
}) {
  return (
    <div className="page-focus">
      <div className="focus-shell">
        {/* Top: timer console */}
        <div className="focus-card">
          <div className="focus-card-header">
            <span className="card-label">
              已选任务
              {hasSelection && <span className="focus-count">{selectedTodos.length}</span>}
            </span>
            <button
              type="button"
              className="clear-focus"
              onClick={onStop}
              disabled={!hasSelection}
            >
              清除
            </button>
          </div>

          {hasSelection ? (
            <div className="focus-chip-list">
              {selectedTodos.map((todo) => (
                <span key={todo.id} className="focus-chip">
                  <span className="focus-chip-text">{todo.text}</span>
                  <button
                    type="button"
                    className="focus-chip-remove"
                    onClick={() => onRemoveFocus(todo.id)}
                    aria-label={`移除 ${todo.text}`}
                    title="移除"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div className="focus-task-placeholder">
              请从下方任务列表勾选要一起专注的任务（可多选）
            </div>
          )}

          <div className="focus-actions">
            <button
              className="focus-action-btn primary"
              type="button"
              onClick={onStart}
              disabled={!hasSelection}
            >
              ▶ 开始专注
            </button>
            <button
              className="focus-action-btn secondary"
              type="button"
              onClick={onReset}
              disabled={!canReset}
            >
              重置
            </button>
          </div>
        </div>

        {/* Bottom: task management (add / filter / edit / delete) */}
        <div className="focus-todos">
          <TodoApp />
        </div>
      </div>
    </div>
  );
}
