import React, { useEffect, useMemo, useState } from "react";
import { useTodos } from "../../context/TodoContext";
import focusBg from "../../../assets/focus-bg.png";
import "./Focus.css";

const MAX_SECS = 25 * 60;

export default function FocusPage() {
  const { todos, focusedTodoId, setFocusTodo, clearFocusTodo } = useTodos();
  const selectedTodo = useMemo(
    () => todos.find((t) => t.id === focusedTodoId),
    [todos, focusedTodoId],
  );

  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isImmersive, setIsImmersive] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [debugProgress, setDebugProgress] = useState(0.5);
  const [taskVisible, setTaskVisible] = useState(false);
  const hideTaskTimer = React.useRef(null);

  const handleMouseMove = () => {
    setTaskVisible(true);
    clearTimeout(hideTaskTimer.current);
    hideTaskTimer.current = setTimeout(() => setTaskVisible(false), 2000);
  };

  useEffect(() => {
    if (!selectedTodo) {
      setSeconds(0);
      setIsRunning(false);
      setIsImmersive(false);
    }
  }, [selectedTodo]);

  useEffect(() => {
    if (!isRunning) return undefined;
    const id = window.setInterval(() => setSeconds((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [isRunning]);

  const handleSelect = (id) => {
    setFocusTodo(id);
    setSeconds(0);
    setIsRunning(false);
    setIsImmersive(false);
  };

  const handleStart = () => {
    if (!selectedTodo) return;
    setIsRunning(true);
    setIsImmersive(true);
  };

  const handleTogglePause = () => {
    setIsRunning((r) => !r);
  };

  const handleReset = () => {
    setSeconds(0);
    setIsRunning(false);
  };

  const handleStop = () => {
    setIsRunning(false);
    setSeconds(0);
    setIsImmersive(false);
    clearFocusTodo();
  };

  const progress = Math.min(seconds / MAX_SECS, 1);
  const displayProgress = debugMode ? debugProgress : progress;

  return (
    <>
      {/* ── Immersive overlay (fixed, covers everything incl. sidebar) ── */}
      {isImmersive && (
        <div
          className="immersive-overlay"
          style={{
            backgroundImage: `linear-gradient(rgba(10,6,28,0.72), rgba(10,6,28,0.72)), url(${focusBg})`,
          }}
          onMouseMove={handleMouseMove}
        >
          <div className="immersive-card">
            <div className={`imm-ui ${taskVisible ? "visible" : ""}`}>
              <div className="immersive-eyebrow">
                <span className={`immersive-status-dot ${isRunning ? "running" : ""}`} />
                {isRunning ? "专注中" : "已暂停"}
              </div>
              <div className="immersive-task">
                {selectedTodo?.text ?? "请选择一个任务"}
              </div>
            </div>

            <div className="immersive-flask">
              <svg viewBox="0 0 80 130" width="100" height="163" aria-hidden="true">
                <defs>
                  <clipPath id="imm-clip">
                    <path d="M 26,16 L 26,44 L 6,112 Q 6,128 40,128 Q 74,128 74,112 L 54,44 L 54,16 Z" />
                  </clipPath>
                  <linearGradient id="imm-liq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e9d5ff" />
                    <stop offset="100%" stopColor="#6d28d9" />
                  </linearGradient>
                </defs>
                <rect
                  x="0" y={128 * (1 - displayProgress)} width="80" height="128"
                  clipPath="url(#imm-clip)" fill="url(#imm-liq)"
                />
                <path
                  d="M 26,16 L 26,44 L 6,112 Q 6,128 40,128 Q 74,128 74,112 L 54,44 L 54,16 Z"
                  fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"
                />
                <path
                  d="M 28,20 L 28,44 L 10,106"
                  fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round"
                />
                <rect
                  x="24" y="0" width="32" height="17" rx="5"
                  fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"
                />
              </svg>
            </div>

            <div className={`imm-ui ${taskVisible ? "visible" : ""}`}>
              <div className="immersive-actions">
                <button
                  className="immersive-btn primary"
                  type="button"
                  onClick={handleTogglePause}
                >
                  {isRunning ? "暂停" : "继续"}
                </button>
                <button
                  className="immersive-btn ghost"
                  type="button"
                  onClick={handleReset}
                >
                  重置
                </button>
                <button
                  className="immersive-btn ghost"
                  type="button"
                  onClick={handleStop}
                >
                  结束专注
                </button>
              </div>
            </div>
          </div>

          {/* ── Debug tweaks (fixed bottom-right corner) ── */}
          <div className="immersive-tweaks">
            {debugMode && (
              <div className="tweaks-panel">
                <div className="tweaks-label">
                  <span>液体进度</span>
                  <span className="tweaks-val">{Math.round(debugProgress * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0" max="1" step="0.01"
                  value={debugProgress}
                  onChange={(e) => setDebugProgress(Number(e.target.value))}
                  className="tweaks-slider"
                />
              </div>
            )}
            <button
              type="button"
              className={`tweaks-toggle ${debugMode ? "active" : ""}`}
              onClick={() => setDebugMode((d) => !d)}
            >
              调试
            </button>
          </div>
        </div>
      )}

      {/* ── Normal view ── */}
      <div className="page-focus">
        <div className="focus-shell">
          {/* Left: task picker */}
          <div className="focus-left">
            <div className="focus-headline">
              <span className="eyebrow">沉浸专注</span>
              <h1>选择任务，进入心流</h1>
              <p>
                点击下方任务卡片选定当前目标，然后在右侧开始计时。
                点击「开始专注」后将进入全屏沉浸模式。
              </p>
            </div>

            <div className="task-selector">
              {todos.length === 0 ? (
                <div className="empty-state-card">
                  还没有任务，请先返回 Home 添加你要专注的内容。
                </div>
              ) : (
                todos.map((todo) => (
                  <button
                    key={todo.id}
                    type="button"
                    className={`task-pill ${todo.id === focusedTodoId ? "selected" : ""}`}
                    onClick={() => handleSelect(todo.id)}
                  >
                    <div className="task-pill-title">{todo.text}</div>
                    <div className="task-pill-meta">
                      {todo.completed ? "✓ 已完成" : "待处理"}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right: timer console */}
          <div className="focus-right">
            <div className="focus-card">
              <div className="focus-card-header">
                <span className="card-label">当前任务</span>
                <button
                  type="button"
                  className="clear-focus"
                  onClick={handleStop}
                  disabled={!selectedTodo}
                >
                  清除
                </button>
              </div>

              {selectedTodo ? (
                <div className="focus-task-name">{selectedTodo.text}</div>
              ) : (
                <div className="focus-task-placeholder">
                  尚未选择任务 — 请从左侧选择一个开始专注
                </div>
              )}


              <div className="focus-actions">
                <button
                  className="focus-action-btn primary"
                  type="button"
                  onClick={handleStart}
                  disabled={!selectedTodo}
                >
                  ▶ 开始专注
                </button>
                <button
                  className="focus-action-btn secondary"
                  type="button"
                  onClick={handleReset}
                  disabled={!selectedTodo || seconds === 0}
                >
                  重置
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
