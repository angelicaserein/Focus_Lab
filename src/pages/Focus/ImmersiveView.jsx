import React from "react";
import PusheenScene from "./PusheenScene";
import FocusFlask from "./FocusFlask";
import DebugTweaks from "./DebugTweaks";
import { formatClock } from "../../utils/time";

// 沉浸式专注遮罩：全屏 3D 模型 + 浮层毛玻璃卡片（状态、任务、烧瓶、操作）。
export default function ImmersiveView({
  isRunning,
  seconds,
  selectedTodos,
  displayProgress,
  cardVisible,
  animEnabled,
  onSettle,
  onTogglePause,
  onReset,
  onStop,
  // 调试相关（仅开发环境使用）
  debugMode,
  setDebugMode,
  debugProgress,
  setDebugProgress,
  setCardVisible,
  setAnimEnabled,
}) {
  return (
    <div className="immersive-overlay">
      {/* 3D model — full screen */}
      <div className="immersive-model-area">
        <PusheenScene animEnabled={animEnabled} />
      </div>

      {/* Frosted glass card — floating overlay, hidden by default */}
      <div className={`immersive-card-wrap ${cardVisible ? "visible" : ""}`}>
        <div className="immersive-card">
          <div className="immersive-eyebrow">
            <span className={`immersive-status-dot ${isRunning ? "running" : ""}`} />
            {isRunning ? "专注中" : "已暂停"}
            <span className="immersive-time">{formatClock(seconds)}</span>
          </div>

          {selectedTodos.length > 0 ? (
            <ul className="immersive-task-list">
              {selectedTodos.map((todo) => (
                <li key={todo.id} className="immersive-task-row">
                  <button
                    type="button"
                    className="immersive-task-check"
                    onClick={() => onSettle(todo, "completed")}
                    aria-label={`完成 ${todo.text}`}
                    title="标记完成"
                  >
                    ✓
                  </button>
                  <span className="immersive-task-text">{todo.text}</span>
                  <button
                    type="button"
                    className="immersive-task-remove"
                    onClick={() => onSettle(todo, "removed")}
                    aria-label={`从本次专注移除 ${todo.text}`}
                    title="移出本次专注"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="immersive-task">请选择一个任务</div>
          )}

          <FocusFlask progress={displayProgress} />

          <div className="immersive-actions">
            <button className="immersive-btn primary" type="button" onClick={onTogglePause}>
              {isRunning ? "暂停" : "继续"}
            </button>
            <button className="immersive-btn ghost" type="button" onClick={onReset}>
              重置
            </button>
            <button className="immersive-btn ghost" type="button" onClick={onStop}>
              结束专注
            </button>
          </div>
        </div>
      </div>

      {/* ── Debug tweaks (fixed bottom-right corner) ── */}
      {import.meta.env.DEV && (
        <DebugTweaks
          seconds={seconds}
          debugMode={debugMode}
          setDebugMode={setDebugMode}
          debugProgress={debugProgress}
          setDebugProgress={setDebugProgress}
          cardVisible={cardVisible}
          setCardVisible={setCardVisible}
          animEnabled={animEnabled}
          setAnimEnabled={setAnimEnabled}
        />
      )}
    </div>
  );
}
