import React, { useEffect, useMemo, useState } from "react";
import { useTodos } from "../../context/TodoContext";
import { useFocus } from "../../context/FocusContext";
import useFocusTimer from "../../hooks/useFocusTimer";
import useFocusChat from "../../hooks/useFocusChat";
import ImmersiveView from "./ImmersiveView";
import FocusConsole from "./FocusConsole";
import "./Focus.css";

export default function FocusPage() {
  const { todos, toggleTodo, addTodo } = useTodos();
  const { focusedTodoIds, addFocusTodo, removeFocusTodo, clearFocusTodos, addFocusRecord } =
    useFocus();

  const selectedTodos = useMemo(
    () => todos.filter((t) => focusedTodoIds.includes(t.id)),
    [todos, focusedTodoIds],
  );
  const hasSelection = selectedTodos.length > 0;

  // 沉浸页可挑进来的候选任务：尚未在本次专注、且未完成
  const availableTodos = useMemo(
    () => todos.filter((t) => !focusedTodoIds.includes(t.id) && !t.completed),
    [todos, focusedTodoIds],
  );

  // 沉浸页任务编辑：加入已有 / 新建并加入 / 用另一个替换
  const addToFocus = (id) => addFocusTodo(id);
  const createAndFocus = (text) => {
    const t = text.trim();
    if (!t) return;
    const item = addTodo(t);
    if (item) addFocusTodo(item.id);
  };
  const replaceFocus = (oldId, newId) => {
    // 纯交换：移出旧的、加入新的。两次 setState 同批提交，集合不会瞬空触发退出
    removeFocusTodo(oldId);
    addFocusTodo(newId);
  };

  const { seconds, isRunning, start, togglePause, resetTimer, clearSession, getSession } =
    useFocusTimer();
  const { messages, sending, sendUserMessage, clearChat } = useFocusChat();
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

  return (
    <>
      {isImmersive && (
        <ImmersiveView
          isRunning={isRunning}
          seconds={seconds}
          selectedTodos={selectedTodos}
          availableTodos={availableTodos}
          cardVisible={cardVisible}
          animEnabled={animEnabled}
          onSettle={settleTask}
          onAddFocus={addToFocus}
          onCreateFocus={createAndFocus}
          onReplaceFocus={replaceFocus}
          onTogglePause={togglePause}
          onReset={resetTimer}
          onStop={handleStop}
          debugMode={debugMode}
          setDebugMode={setDebugMode}
          debugProgress={debugProgress}
          setDebugProgress={setDebugProgress}
          setCardVisible={setCardVisible}
          setAnimEnabled={setAnimEnabled}
          chatMessages={messages}
          chatSending={sending}
          onChatSend={sendUserMessage}
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
        chatMessages={messages}
        onChatClear={clearChat}
      />
    </>
  );
}
