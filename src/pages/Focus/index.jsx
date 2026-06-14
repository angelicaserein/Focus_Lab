import React, { useEffect, useMemo, useState } from "react";
import { useTodos } from "../../context/TodoContext";
import { useFocus } from "../../context/FocusContext";
import useFocusTimer from "../../hooks/useFocusTimer";
import ImmersiveView from "./ImmersiveView";
import FocusConsole from "./FocusConsole";
import "./Focus.css";

const MAX_SECS = 25 * 60;

export default function FocusPage() {
  const { todos, toggleTodo } = useTodos();
  const { focusedTodoIds, removeFocusTodo, clearFocusTodos, addFocusRecord } = useFocus();

  const selectedTodos = useMemo(
    () => todos.filter((t) => focusedTodoIds.includes(t.id)),
    [todos, focusedTodoIds],
  );
  const hasSelection = selectedTodos.length > 0;

  const { seconds, isRunning, start, togglePause, resetTimer, clearSession, getSession } =
    useFocusTimer();
  const [isImmersive, setIsImmersive] = useState(false);

  // 调试 / 视图微调状态（仅开发环境用到调试面板）
  const [debugMode, setDebugMode] = useState(false);
  const [debugProgress, setDebugProgress] = useState(0.5);
  const [animEnabled, setAnimEnabled] = useState(true);
  const [cardVisible, setCardVisible] = useState(true);

  // 选中集合清空时（手动清除 / 任务都被结算）：归零并退出沉浸
  useEffect(() => {
    if (!hasSelection) {
      clearSession();
      setIsImmersive(false);
    }
    // clearSession 每次渲染都是新引用；这里只关心 hasSelection 的变化
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSelection]);

  const handleStart = () => {
    if (!hasSelection) return;
    start();
    setIsImmersive(true);
  };

  // 就地结算单个任务：记一条带结果的记录并移出本次专注
  const settleTask = (todo, outcome) => {
    const { startedAt, sessionId } = getSession();
    addFocusRecord({
      taskId: todo.id,
      taskText: todo.text,
      durationSecs: seconds,
      startedAt: startedAt ?? Date.now() - seconds * 1000,
      sessionId,
      outcome,
    });
    if (outcome === "completed" && !todo.completed) toggleTodo(todo.id);
    removeFocusTodo(todo.id);
  };

  const handleStop = () => {
    // 对仍在集合中的任务统一以「结束」结算（settleTask 内部依赖当前 seconds）
    selectedTodos.forEach((t) => settleTask(t, "ended"));
    clearSession();
    setIsImmersive(false);
    clearFocusTodos();
  };

  const progress = Math.min(seconds / MAX_SECS, 1);
  const displayProgress = debugMode ? debugProgress : progress;

  return (
    <>
      {isImmersive && (
        <ImmersiveView
          isRunning={isRunning}
          seconds={seconds}
          selectedTodos={selectedTodos}
          displayProgress={displayProgress}
          cardVisible={cardVisible}
          animEnabled={animEnabled}
          onSettle={settleTask}
          onTogglePause={togglePause}
          onReset={resetTimer}
          onStop={handleStop}
          debugMode={debugMode}
          setDebugMode={setDebugMode}
          debugProgress={debugProgress}
          setDebugProgress={setDebugProgress}
          setCardVisible={setCardVisible}
          setAnimEnabled={setAnimEnabled}
        />
      )}

      <FocusConsole
        selectedTodos={selectedTodos}
        hasSelection={hasSelection}
        canReset={hasSelection && seconds > 0}
        onStart={handleStart}
        onReset={resetTimer}
        onStop={handleStop}
        onRemoveFocus={removeFocusTodo}
      />
    </>
  );
}
