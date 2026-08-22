import React, { useEffect, useRef, useState } from "react";
import "./ImmersiveCard.css";
import FocusFlask from "@/pages/Focus/FocusFlask";
import DebugTweaks from "@/pages/Focus/DebugTweaks";
import ImmersiveTaskPicker from "@/pages/Focus/Immersive/ImmersiveTaskPicker";
import useDraggable from "@/hooks/common/useDraggable";
import { formatClock } from "@/utils/time";
import { useFocusSession } from "@/pages/Focus/FocusSessionContext";
import { useLanguage } from "@/context/LanguageContext";

// 可拖拽的液态玻璃悬浮卡：包含计时状态、任务列表、操作按钮和任务选择器面板。
export default function ImmersiveCard({ flaskProgress }) {
  const { t } = useLanguage();
  const {
    isRunning, seconds, selectedTodos, availableTodos,
    scenarioTitle, scenarioDescription, cardVisible, setCardVisible,
    animEnabled, setAnimEnabled,
    timerMode = "countup", targetMins = 25,
    onSettle, onAddFocus, onCreateFocus, onReplaceFocus,
    onTogglePause, onReset, onStop, onDone,
  } = useFocusSession();

  // 倒计时显示剩余时间；归零后继续计时，用「+超时」表示
  const isCountdown = timerMode === "countdown";
  const remaining = targetMins * 60 - seconds;
  const clockText = isCountdown
    ? (remaining >= 0 ? formatClock(remaining) : `+${formatClock(-remaining)}`)
    : formatClock(seconds);

  // 桌面：卡片默认偏到左上侧、给 3D 模型让出画面中央。
  // 手机（窄屏）：不加初始偏移，配合 CSS 让卡片居中显示在屏幕中央。
  const initialCardOffset =
    typeof window !== "undefined" && window.innerWidth <= 600
      ? { x: 0, y: 0 }
      : { x: 193, y: 28 };
  const { nodeRef, handlers, position } = useDraggable(initialCardOffset);

  // picker: null = 收起；"add" = 添加；其它字符串 = 正在替换的 todo id
  const [picker, setPicker] = useState(null);
  const [pickerClosing, setPickerClosing] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [debugProgress, setDebugProgress] = useState(0.5);

  // 收起动画那 210ms 的定时器。结束专注会把整个沉浸层卸掉，动画很容易横跨这一下，
  // 故存进 ref 并在卸载时清掉——否则是往已卸载的组件里写 state。
  // 同时也保证同一时刻只有一个在跑：连点两下切换器不会让两次收起动画抢着改 picker。
  const pickerTimerRef = useRef(null);
  const schedulePicker = (fn) => {
    clearTimeout(pickerTimerRef.current);
    pickerTimerRef.current = setTimeout(fn, 210);
  };
  useEffect(() => () => clearTimeout(pickerTimerRef.current), []);

  const closePicker = () => {
    setPickerClosing(true);
    schedulePicker(() => { setPicker(null); setPickerClosing(false); });
  };

  const togglePicker = (value) => {
    if (picker === null) {
      setPicker(value);
    } else if (picker === value) {
      closePicker();
    } else {
      setPickerClosing(true);
      schedulePicker(() => { setPickerClosing(false); setPicker(value); });
    }
  };

  return (
    <>
    {!cardVisible && (
      <button
        type="button"
        className="immersive-card-reopen"
        onClick={() => setCardVisible(true)}
        title={t("focus.imm.reopenCardAria")}
        aria-label={t("focus.imm.reopenCardAria")}
      >
        <span className="immersive-card-reopen-dot" />
        {t("focus.imm.reopenCard")}
      </button>
    )}
    <div className={`immersive-card-wrap ${cardVisible ? "visible" : ""}`}>
      <div ref={nodeRef} className="immersive-card-drag">
        <div className="immersive-card-row">
          <div className="immersive-card">
            <button
              type="button"
              className="immersive-card-close"
              onClick={() => setCardVisible(false)}
              title={t("focus.imm.closeCard")}
              aria-label={t("focus.imm.closeCard")}
            >
              ×
            </button>
            <div className="immersive-eyebrow" {...handlers}>
              <span className={`immersive-status-dot ${isRunning ? "running" : ""}`} />
              {isRunning ? t("focus.imm.running") : t("focus.imm.paused")}
              <span className="immersive-time">{clockText}</span>
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
                      aria-label={t("focus.imm.completeAria", { text: todo.text })}
                      title={t("focus.imm.completeTitle")}
                    >
                      ✓
                    </button>
                    <span className="immersive-task-text">{todo.text}</span>
                    <button
                      type="button"
                      className="immersive-task-replace"
                      onClick={() => togglePicker(todo.id)}
                      aria-label={t("focus.imm.replaceAria", { text: todo.text })}
                      title={t("focus.imm.replaceTitle")}
                    >
                      ⇄
                    </button>
                    <button
                      type="button"
                      className="immersive-task-remove"
                      onClick={() => onSettle(todo, "removed")}
                      aria-label={t("focus.imm.removeAria", { text: todo.text })}
                      title={t("focus.imm.removeTitle")}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="immersive-task">{t("focus.imm.noTask")}</div>
            )}

            <div className="immersive-task-add">
              <button
                type="button"
                className={`immersive-task-add-btn ${picker === "add" ? "open" : ""}`}
                onClick={() => togglePicker("add")}
              >
                {t("focus.imm.addTask")}
              </button>
            </div>

            <div className="immersive-actions">
              <button className="immersive-btn primary" type="button" onClick={onTogglePause}>
                {isRunning ? t("focus.imm.pause") : t("focus.imm.resume")}
              </button>
              <button className="immersive-btn ghost" type="button" onClick={onReset}>
                {t("focus.imm.reset")}
              </button>
              <button className="immersive-btn ghost" type="button" onClick={onStop}>
                {t("focus.imm.stop")}
              </button>
              <button
                className="immersive-btn done"
                type="button"
                onClick={onDone}
                disabled={selectedTodos.length === 0}
                title={t("focus.imm.doneTitle")}
              >
                {t("focus.imm.done")}
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
