import React, { useState } from "react";
import "./ImmersiveCard.css";
import FocusFlask from "../FocusFlask";
import DebugTweaks from "../DebugTweaks";
import ImmersiveTaskPicker from "./ImmersiveTaskPicker";
import useDraggable from "../../../hooks/useDraggable";
import { formatClock } from "../../../utils/time";
import { useFocusSession } from "../FocusSessionContext";

// 可拖拽的液态玻璃悬浮卡：包含计时状态、任务列表、操作按钮和任务选择器面板。
export default function ImmersiveCard({ flaskProgress }) {
  const {
    isRunning, seconds, selectedTodos, availableTodos,
    scenarioTitle, scenarioDescription, cardVisible, setCardVisible,
    animEnabled, setAnimEnabled,
    timerMode = "countup", setTimerMode, targetMins = 25,
    onSettle, onAddFocus, onCreateFocus, onReplaceFocus,
    onTogglePause, onReset, onStop,
  } = useFocusSession();

  // 倒计时显示剩余时间；归零后继续计时，用「+超时」表示
  const isCountdown = timerMode === "countdown";
  const remaining = targetMins * 60 - seconds;
  const clockText = isCountdown
    ? (remaining >= 0 ? formatClock(remaining) : `+${formatClock(-remaining)}`)
    : formatClock(seconds);

  const { nodeRef, handlers, position } = useDraggable({ x: 193, y: 28 });

  // picker: null = 收起；"add" = 添加；其它字符串 = 正在替换的 todo id
  const [picker, setPicker] = useState(null);
  const [pickerClosing, setPickerClosing] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [debugProgress, setDebugProgress] = useState(0.5);

  const closePicker = () => {
    setPickerClosing(true);
    setTimeout(() => { setPicker(null); setPickerClosing(false); }, 210);
  };

  const togglePicker = (value) => {
    if (picker === null) {
      setPicker(value);
    } else if (picker === value) {
      closePicker();
    } else {
      setPickerClosing(true);
      setTimeout(() => { setPickerClosing(false); setPicker(value); }, 210);
    }
  };

  return (
    <>
    <div className={`immersive-card-wrap ${cardVisible ? "visible" : ""}`}>
      <div ref={nodeRef} className="immersive-card-drag">
        <div className="immersive-card-row">
          <div className="immersive-card">
            <div className="immersive-eyebrow" {...handlers}>
              <span className={`immersive-status-dot ${isRunning ? "running" : ""}`} />
              {isRunning ? "专注中" : "已暂停"}
              <span className="immersive-time">{clockText}</span>
            </div>

            <div className="immersive-mode-toggle" role="group" aria-label="计时模式">
              <button
                type="button"
                className={`immersive-mode-btn${!isCountdown ? " active" : ""}`}
                onClick={() => setTimerMode("countup")}
                aria-pressed={!isCountdown}
              >
                正计时
              </button>
              <button
                type="button"
                className={`immersive-mode-btn${isCountdown ? " active" : ""}`}
                onClick={() => setTimerMode("countdown")}
                aria-pressed={isCountdown}
              >
                倒计时
              </button>
            </div>

            {scenarioTitle && (
              <div className="immersive-scenario">{scenarioTitle}</div>
            )}
            {scenarioDescription && (
              <div className="immersive-scenario-desc">{scenarioDescription}</div>
            )}

            <FocusFlask progress={debugMode ? debugProgress : flaskProgress} />

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
        cardPosition={position}
      />
    )}
    </>
  );
}
