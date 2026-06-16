import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTodos } from "../../context/TodoContext";
import { useFocus } from "../../context/FocusContext";
import { useReward } from "../../context/RewardContext";
import { useScenarios } from "../../context/ScenarioContext";
import useFocusTimer from "../../hooks/useFocusTimer";
import useFocusChat from "../../hooks/useFocusChat";
import useLocalStorage from "../../hooks/useLocalStorage";
import usePrefs from "../../hooks/usePrefs";
import ImmersiveView from "./ImmersiveView";
import FocusConsole from "./FocusConsole";
import "./Focus.css";

export default function FocusPage() {
  const { todos, toggleTodo, addTodo } = useTodos();
  const { focusedTodoIds, addFocusTodo, removeFocusTodo, clearFocusTodos, addFocusRecord } =
    useFocus();
  const { addCoins } = useReward();
  const { scenarios } = useScenarios();

  const selectedTodos = useMemo(
    () => todos.filter((t) => focusedTodoIds.includes(t.id)),
    [todos, focusedTodoIds],
  );
  const hasSelection = selectedTodos.length > 0;

  // 沉浸页候选任务：未在本次专注且未完成
  const availableTodos = useMemo(
    () => todos.filter((t) => !focusedTodoIds.includes(t.id) && !t.completed),
    [todos, focusedTodoIds],
  );

  // 情境选择（会话结束后保留，方便连续专注同一情境）
  const [selectedScenarioId, setSelectedScenarioId] = useState(null);
  const selectedScenario = useMemo(
    () => scenarios.find((s) => s.id === selectedScenarioId) ?? null,
    [scenarios, selectedScenarioId],
  );
  const scenarioTitle = selectedScenario?.title ?? null;

  // 会话事件日志：记录本次专注中所有操作的精确时间戳
  const sessionEventsRef = useRef([]);
  const logEvent = (type, data = {}) => {
    sessionEventsRef.current.push({ type, ts: Date.now(), ...data });
  };

  // 沉浸页任务编辑：加入 / 新建加入 / 替换
  const addToFocus = (id) => {
    addFocusTodo(id);
    const todo = todos.find((t) => t.id === id);
    logEvent("task_added", { taskId: id, taskText: todo?.text });
  };
  const createAndFocus = (text) => {
    const t = text.trim();
    if (!t) return;
    const item = addTodo(t);
    if (item) {
      addFocusTodo(item.id);
      logEvent("task_added", { taskId: item.id, taskText: item.text });
    }
  };
  const replaceFocus = (oldId, newId) => {
    const oldTodo = todos.find((t) => t.id === oldId);
    const newTodo = todos.find((t) => t.id === newId);
    // React 18 批量提交，两次 setState 同步，集合不会瞬空触发退出
    removeFocusTodo(oldId);
    addFocusTodo(newId);
    logEvent("task_replaced", {
      oldTaskId: oldId,
      oldTaskText: oldTodo?.text,
      newTaskId: newId,
      newTaskText: newTodo?.text,
    });
  };

  const { seconds, isRunning, start, togglePause, resetTimer, clearSession, getSession } =
    useFocusTimer();
  const { messages, sending, sendUserMessage, clearChat } = useFocusChat();
  const [isImmersive, setIsImmersive] = useState(false);

  const [notes, setNotes] = useLocalStorage("focus_notes_v1", []);
  const [distractions, setDistractions] = useLocalStorage("focus_distractions_v1", []);

  // 记录本次沉浸会话的起始时间，用于筛选「本次」的随记和分心条目
  const [sessionStartTs, setSessionStartTs] = useState(null);

  const sessionNotes = notes.filter((n) => sessionStartTs && n.ts >= sessionStartTs);
  const sessionDistractions = distractions.filter((d) => sessionStartTs && d.ts >= sessionStartTs);

  const addNote = (text) => {
    const { sessionId } = getSession();
    setNotes((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text, ts: Date.now(), sessionId, taskIds: [...focusedTodoIds] },
    ]);
  };

  const recordDistraction = () => {
    const { sessionId } = getSession();
    setDistractions((prev) => [
      ...prev,
      { id: crypto.randomUUID(), ts: Date.now(), sessionId, taskIds: [...focusedTodoIds] },
    ]);
  };

  const { pomodoroMins, animEnabled, setAnimEnabled } = usePrefs();

  // 调试 / 视图微调状态（仅开发环境调试面板使用）
  const [debugMode, setDebugMode] = useState(false);
  const [debugProgress, setDebugProgress] = useState(0.5);
  const [cardVisible, setCardVisible] = useState(true);

  // 选中集合清空时：若计时器还在跑（任务被逐一勾完），先发币再归零并退出沉浸。
  // handleStop 先调 clearSession()（seconds 归零），所以此处 seconds>0 只在
  // 「逐一勾完」路径下成立，不会与 handleStop 的发币重复。
  useEffect(() => {
    if (!hasSelection) {
      if (seconds > 0) addCoins(seconds);
      clearSession();
      setIsImmersive(false);
    }
    // addCoins / clearSession 每次渲染都是新引用；这里只关心 hasSelection 变化
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSelection]);

  const handleTogglePause = () => {
    logEvent(isRunning ? "session_paused" : "session_resumed");
    togglePause();
  };

  const handleStart = () => {
    if (!hasSelection) return;
    sessionEventsRef.current = [];
    const nowTs = Date.now();
    setSessionStartTs(nowTs);
    logEvent("session_start", {
      tasks: selectedTodos.map((t) => ({ taskId: t.id, taskText: t.text })),
    });
    start();
    setIsImmersive(true);
  };

  // 抽卡选中后自动开始：addFocusTodo 是异步 setState，需等 hasSelection 变 true 再触发
  const [pendingAutoStart, setPendingAutoStart] = useState(false);
  useEffect(() => {
    if (pendingAutoStart && hasSelection) {
      handleStart();
      setPendingAutoStart(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAutoStart, hasSelection]);

  const handleDrawerSelect = (todo) => {
    addFocusTodo(todo.id);
    setPendingAutoStart(true);
  };

  // 结算单个任务：写记录 + 打勾（如需） + 移出专注集合。不发币——统一在 handleStop
  // 或 hasSelection effect 里一次性发放整场金币，避免多任务时重复累加。
  // overrideSecs / overrideSess 供 handleStop 传入归零前的快照，防止 clearSession
  // 先于本函数执行时读到 seconds=0 / sessionId=null。
  // eventsSnapshot: 由 handleStop 传入已截取的快照，单任务完成/移除时为 undefined（自动取当前）
  const settleTask = (
    todo,
    outcome,
    overrideSecs = seconds,
    overrideSess = getSession(),
    coinsEarned,
    distractionCount,
    noteCount,
    eventsSnapshot,
  ) => {
    if (!eventsSnapshot) {
      logEvent(`task_${outcome}`, { taskId: todo.id, taskText: todo.text });
    }
    addFocusRecord({
      taskId: todo.id,
      taskText: todo.text,
      durationSecs: overrideSecs,
      startedAt: overrideSess.startedAt ?? Date.now() - overrideSecs * 1000,
      sessionId: overrideSess.sessionId,
      outcome,
      scenarioId: selectedScenarioId ?? undefined,
      scenarioTitle: scenarioTitle ?? undefined,
      coinsEarned,
      distractionCount,
      noteCount,
      events: eventsSnapshot ?? [...sessionEventsRef.current],
    });
    if (outcome === "completed" && !todo.completed) toggleTodo(todo.id);
    removeFocusTodo(todo.id);
  };

  const handleStop = () => {
    // 先捕获当前计时状态，再归零——确保 hasSelection effect 读到 seconds=0 不重复发币
    const finalSecs = seconds;
    const finalSession = getSession();
    const finalDistractionCount = sessionDistractions.length;
    const finalNoteCount = sessionNotes.length;
    if (finalSecs > 0) addCoins(finalSecs);
    // 先把所有任务结束事件 + 会话结束写入日志，再截取快照
    selectedTodos.forEach((t) =>
      logEvent("task_ended", { taskId: t.id, taskText: t.text })
    );
    logEvent("session_end");
    const finalEvents = [...sessionEventsRef.current];
    clearSession();
    selectedTodos.forEach((t) =>
      settleTask(t, "ended", finalSecs, finalSession, finalSecs, finalDistractionCount, finalNoteCount, finalEvents)
    );
    setIsImmersive(false);
    setSessionStartTs(null);
  };

  return (
    <>
      {isImmersive && (
        <ImmersiveView
          isRunning={isRunning}
          seconds={seconds}
          selectedTodos={selectedTodos}
          availableTodos={availableTodos}
          scenarioTitle={scenarioTitle}
          cardVisible={cardVisible}
          animEnabled={animEnabled}
          pomodoroMins={pomodoroMins}
          onSettle={settleTask}
          onAddFocus={addToFocus}
          onCreateFocus={createAndFocus}
          onReplaceFocus={replaceFocus}
          onTogglePause={handleTogglePause}
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
          onAddNote={addNote}
          onDistraction={recordDistraction}
          sessionNotes={sessionNotes}
          sessionDistractionCount={sessionDistractions.length}
        />
      )}

      <FocusConsole
        selectedTodos={selectedTodos}
        hasSelection={hasSelection}
        canReset={hasSelection && seconds > 0}
        scenarios={scenarios}
        selectedScenarioId={selectedScenarioId}
        onScenarioChange={setSelectedScenarioId}
        onStart={handleStart}
        onReset={resetTimer}
        onClear={clearFocusTodos}
        onRemoveFocus={removeFocusTodo}
        onDrawerSelect={handleDrawerSelect}
        chatMessages={messages}
        onChatClear={clearChat}
        notes={notes}
        distractions={distractions}
      />
    </>
  );
}
