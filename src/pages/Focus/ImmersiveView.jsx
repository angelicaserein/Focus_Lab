import React, { useState } from "react";
import PusheenScene from "./PusheenScene";
import DebugTweaks from "./DebugTweaks";
import ImmersiveChat from "./ImmersiveChat";
import ImmersiveTaskPicker from "./ImmersiveTaskPicker";
import useDraggable from "../../hooks/useDraggable";
import { formatClock } from "../../utils/time";
import { useImmersive } from "./ImmersiveContext";

// 沉浸式专注遮罩：全屏 3D 模型 + 可拖动的液态玻璃卡片（状态、任务、操作）。
// 所有数据来自 ImmersiveContext，子组件按现状以 props 接收（保持其纯粹/可复用）。
export default function ImmersiveView() {
  const {
    isRunning,
    seconds,
    selectedTodos,
    availableTodos,
    cardVisible,
    animEnabled,
    onSettle,
    onAddFocus,
    onCreateFocus,
    onReplaceFocus,
    onTogglePause,
    onReset,
    onStop,
    debugMode,
    setDebugMode,
    debugProgress,
    setDebugProgress,
    setCardVisible,
    setAnimEnabled,
    chatMessages,
    chatSending,
    onChatSend,
  } = useImmersive();

  const { nodeRef, handlers } = useDraggable();

  // 任务选择器：null = 收起；"add" = 添加；其它字符串 = 正在替换的那一行 todo id
  const [picker, setPicker] = useState(null);
  const closePicker = () => setPicker(null);

  return (
    <div className="immersive-overlay">
      {/* 3D model — full screen */}
      <div className="immersive-model-area">
        <PusheenScene animEnabled={animEnabled} />
      </div>

      {/* Liquid-glass card — draggable floating overlay, hidden by default */}
      <div className={`immersive-card-wrap ${cardVisible ? "visible" : ""}`}>
        <div ref={nodeRef} className="immersive-card-drag">
          <div className="immersive-card">
            <div className="immersive-eyebrow" {...handlers}>
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
                      className="immersive-task-replace"
                      onClick={() => setPicker((p) => (p === todo.id ? null : todo.id))}
                      aria-label={`替换 ${todo.text}`}
                      title="替换为其他任务"
                    >
                      ⇄
                    </button>
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

            {/* 添加 / 替换任务区 */}
            <div className="immersive-task-add">
              <button
                type="button"
                className={`immersive-task-add-btn ${picker === "add" ? "open" : ""}`}
                onClick={() => setPicker((p) => (p === "add" ? null : "add"))}
              >
                + 添加任务
              </button>

              {picker !== null && (
                <ImmersiveTaskPicker
                  availableTodos={availableTodos}
                  mode={picker === "add" ? "add" : "replace"}
                  onPick={(id) =>
                    picker === "add" ? onAddFocus(id) : onReplaceFocus(picker, id)
                  }
                  onCreate={onCreateFocus}
                  onClose={closePicker}
                />
              )}
            </div>

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
      </div>

      {/* 左下角极简 AI 陪伴对话（常驻隐藏，鼠标靠近才淡出） */}
      <ImmersiveChat
        messages={chatMessages}
        sending={chatSending}
        onSend={onChatSend}
      />

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
