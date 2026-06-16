import React from "react";
import TodoApp from "../../components/TodoApp";
import ChatHistory from "./ChatHistory";
import SessionSummary from "./SessionSummary";

// 普通（非沉浸）视图：左栏=计时控制台+情境选择+AI聊天+上次回顾，右栏=任务管理。
export default function FocusConsole({
  selectedTodos,
  hasSelection,
  canReset,
  scenarios = [],
  selectedScenarioId,
  onScenarioChange,
  onStart,
  onReset,
  onClear,
  onRemoveFocus,
  chatMessages,
  onChatClear,
  notes = [],
  distractions = [],
}) {
  return (
    <div className="page-focus">
      <div className="focus-shell">
        <div className="focus-main">
          {/* Left column: timer console + AI chat + session summary */}
          <div className="focus-col-left">
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
                  onClick={onClear}
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
                  从任务列表勾选要一起专注的任务（可多选）
                </div>
              )}

              {/* 情境选择：有情境时才显示 */}
              {scenarios.length > 0 && (
                <div className="focus-scenario-row">
                  <label className="focus-scenario-label" htmlFor="focus-scenario-select">
                    情境
                  </label>
                  <select
                    id="focus-scenario-select"
                    className="focus-scenario-select"
                    value={selectedScenarioId ?? ""}
                    onChange={(e) => onScenarioChange(e.target.value || null)}
                  >
                    <option value="">无情境</option>
                    {scenarios.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
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

            {/* 历史随记 + 分心记录 */}
            <SessionSummary notes={notes} distractions={distractions} />

            {/* AI 陪伴聊天记录 */}
            <ChatHistory messages={chatMessages} onClear={onChatClear} />
          </div>

          {/* Right column: task management (add / filter / edit / delete) */}
          <div className="focus-col-right">
            <TodoApp />
          </div>
        </div>
      </div>
    </div>
  );
}
