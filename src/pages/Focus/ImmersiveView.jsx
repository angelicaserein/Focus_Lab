import React, { useState } from "react";
import PusheenScene from "./PusheenScene";
import DebugTweaks from "./DebugTweaks";
import ImmersiveChat from "./ImmersiveChat";
import ImmersiveTaskPicker from "./ImmersiveTaskPicker";
import ImmersiveUtils from "./ImmersiveUtils";
import FocusFlask from "./FocusFlask";
import useDraggable from "../../hooks/useDraggable";
import { formatClock } from "../../utils/time";

// 沉浸式专注遮罩：全屏 3D 模型 + 可拖动的液态玻璃卡片（状态、任务、操作）。
export default function ImmersiveView({
  isRunning,
  seconds,
  selectedTodos,
  availableTodos,
  scenarioTitle,
  cardVisible,
  animEnabled,
  pomodoroMins = 25,
  onSettle,
  onAddFocus,
  onCreateFocus,
  onReplaceFocus,
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
  // AI 陪伴对话
  chatMessages,
  chatSending,
  onChatSend,
  // 随记 + 记录分心
  onAddNote,
  onDistraction,
  sessionNotes = [],
  sessionDistractionCount = 0,
}) {
  const { nodeRef, handlers } = useDraggable();

  // 任务选择器：null = 收起；"add" = 添加；其它字符串 = 正在替换的那一行 todo id
  const [picker, setPicker] = useState(null);
  const [pickerClosing, setPickerClosing] = useState(false);

  const closePicker = () => {
    setPickerClosing(true);
    setTimeout(() => {
      setPicker(null);
      setPickerClosing(false);
    }, 210);
  };

  // 统一切换：开启 / 关闭（带淡出动画）/ 切换模式（先关后开，避免闪烁）
  const togglePicker = (value) => {
    if (picker === null) {
      setPicker(value);
    } else if (picker === value) {
      closePicker();
    } else {
      setPickerClosing(true);
      setTimeout(() => {
        setPickerClosing(false);
        setPicker(value);
      }, 210);
    }
  };

  // 烧瓶进度：开发模式用 debugProgress 方便调试，生产模式按 25 分钟计
  const flaskProgress = import.meta.env.DEV
    ? debugProgress
    : Math.min(seconds / (pomodoroMins * 60), 1);

  return (
    <div className="immersive-overlay">
      {/* 3D model — full screen */}
      <div className="immersive-model-area">
        <PusheenScene animEnabled={animEnabled} />
      </div>

      {/* Liquid-glass card — draggable floating overlay, hidden by default */}
      <div className={`immersive-card-wrap ${cardVisible ? "visible" : ""}`}>
        <div ref={nodeRef} className="immersive-card-drag">
          <div className="immersive-card-row">
            <div className="immersive-card">
              <div className="immersive-eyebrow" {...handlers}>
                <span className={`immersive-status-dot ${isRunning ? "running" : ""}`} />
                {isRunning ? "专注中" : "已暂停"}
                <span className="immersive-time">{formatClock(seconds)}</span>
              </div>

              {/* 情境标签 */}
              {scenarioTitle && (
                <div className="immersive-scenario">{scenarioTitle}</div>
              )}

              {/* 烧瓶进度（25 分钟满瓶） */}
              <FocusFlask progress={flaskProgress} />

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
                        onClick={() => togglePicker(todo.id)}
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

              {/* 添加任务按钮（picker 已移到右侧面板，不再内嵌） */}
              <div className="immersive-task-add">
                <button
                  type="button"
                  className={`immersive-task-add-btn ${picker === "add" ? "open" : ""}`}
                  onClick={() => togglePicker("add")}
                >
                  + 添加任务
                </button>
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

            {/* 右侧呼出任务选择面板：absolute 脱离文档流，主卡片不变形 */}
            {(picker !== null || pickerClosing) && (
              <div className={`immersive-picker-panel${pickerClosing ? " closing" : ""}`}>
                <ImmersiveTaskPicker
                  availableTodos={availableTodos}
                  mode={picker === "add" ? "add" : "replace"}
                  onPick={(id) =>
                    picker === "add" ? onAddFocus(id) : onReplaceFocus(picker, id)
                  }
                  onCreate={onCreateFocus}
                  onClose={closePicker}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 左下角极简 AI 陪伴对话（常驻隐藏，鼠标靠近才淡出） */}
      <ImmersiveChat
        messages={chatMessages}
        sending={chatSending}
        onSend={onChatSend}
      />

      {/* 右下角工具栏：随记 + 记录分心 */}
      <ImmersiveUtils
        onAddNote={onAddNote}
        onDistraction={onDistraction}
        sessionNotes={sessionNotes}
        sessionDistractionCount={sessionDistractionCount}
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
