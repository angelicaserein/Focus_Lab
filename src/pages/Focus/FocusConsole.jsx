import React, { useState } from "react";
import TodoApp from "../../components/TodoApp";
import ChatHistory from "./ChatHistory";
import SessionSummary from "./SessionSummary";
import RandomTaskDrawer from "./RandomTaskDrawer";

// 普通（非沉浸）视图：左栏=计时控制台+情境选择+AI聊天+上次回顾，右栏=任务管理。
// React.memo：计时器每 500ms tick 会让 FocusPage 重渲染，但本组件不消费 seconds，
// props 引用稳定（计时器回调已 useCallback，context 方法来自不随 tick 重渲染的祖先），
// memo 后即可在 tick 时跳过，连带跳过内部的 TodoApp 任务列表。
function FocusConsole({
  selectedTodos,
  hasSelection,
  canReset,
  scenarios = [],
  selectedScenarioId,
  scenarioDescription,
  onScenarioChange,
  onStart,
  onReset,
  onClear,
  onRemoveFocus,
  onDrawerSelect,
  chatMessages,
  onChatClear,
  notes = [],
  distractions = [],
}) {
  const [showDrawer, setShowDrawer] = useState(false);

  return (
    <div className="page-focus">
      {showDrawer && (
        <RandomTaskDrawer
          onSelect={(todo) => onDrawerSelect(todo)}
          onClose={() => setShowDrawer(false)}
        />
      )}

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
                <>
                  <div className="focus-task-placeholder">
                    从任务列表勾选要一起专注的任务（可多选）
                  </div>
                  <button
                    type="button"
                    className="focus-draw-btn"
                    onClick={() => setShowDrawer(true)}
                  >
                    ✦ 今天做什么？
                  </button>
                </>
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
                  {scenarioDescription && (
                    <div className="focus-scenario-desc">{scenarioDescription}</div>
                  )}
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

export default React.memo(FocusConsole);