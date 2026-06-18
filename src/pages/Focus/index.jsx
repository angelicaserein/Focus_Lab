import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTodos } from "../../context/TodoContext";
import { useFocus } from "../../context/FocusContext";
import { useReward } from "../../context/RewardContext";
import { useScenarios } from "../../context/ScenarioContext";
import useFocusTimer from "../../hooks/useFocusTimer";
import useFocusChat from "../../hooks/useFocusChat";
import useLocalStorage from "../../hooks/useLocalStorage";
import usePrefs from "../../hooks/usePrefs";
import ImmersiveView from "./Immersive";
import FocusConsole from "./FocusConsole";
import DistractionModal from "./DistractionModal";
import "./Focus.css";

export default function FocusPage() {
  const location = useLocation();
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
  const scenarioDescription = selectedScenario?.description || null;

  // 从情景页快速启动时，通过 router state 预选情境
  useEffect(() => {
    const sid = location.state?.scenarioId;
    if (sid) {
      setSelectedScenarioId(sid);
      window.history.replaceState({}, document.title);
    }
    // 仅在挂载时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 当 todos 变化时，清理已不存在的 focusedTodoId（todo 被删除后同步移出 focus 列表）
  useEffect(() => {
    const todoIdSet = new Set(todos.map((t) => t.id));
    focusedTodoIds.forEach((id) => {
      if (!todoIdSet.has(id)) removeFocusTodo(id);
    });
  }, [todos]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const [pendingDistractionId, setPendingDistractionId] = useState(null);

  // 主动分心模式状态
  const [isProactiveDistraction, setIsProactiveDistraction] = useState(false);
  const [proactiveDistractionStartTs, setProactiveDistractionStartTs] = useState(null);
  const [proactiveDistractionId, setProactiveDistractionId] = useState(null);

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
    const id = crypto.randomUUID();
    setDistractions((prev) => [
      ...prev,
      { id, ts: Date.now(), sessionId, taskIds: [...focusedTodoIds], tag: null, note: null, type: "reactive" },
    ]);
    setPendingDistractionId(id);
  };

  const startProactiveDistraction = () => {
    if (!isRunning || isProactiveDistraction) return;
    const { sessionId } = getSession();
    const id = crypto.randomUUID();
    const now = Date.now();
    setDistractions((prev) => [
      ...prev,
      { id, ts: now, sessionId, taskIds: [...focusedTodoIds], tag: null, note: null, type: "proactive", durationSecs: null },
    ]);
    setProactiveDistractionId(id);
    setProactiveDistractionStartTs(now);
    setIsProactiveDistraction(true);
    togglePause();
  };

  const endProactiveDistraction = () => {
    const durationSecs = Math.round((Date.now() - proactiveDistractionStartTs) / 1000);
    setDistractions((prev) =>
      prev.map((d) => (d.id === proactiveDistractionId ? { ...d, durationSecs } : d)),
    );
    setPendingDistractionId(proactiveDistractionId);
    setIsProactiveDistraction(false);
    setProactiveDistractionStartTs(null);
    setProactiveDistractionId(null);
    togglePause();
  };

  const handleDistractionTag = (tag, note) => {
    if (pendingDistractionId) {
      setDistractions((prev) =>
        prev.map((d) =>
          d.id === pendingDistractionId ? { ...d, tag: tag || null, note: note || null } : d,
        ),
      );
    }
    setPendingDistractionId(null);
  };

  const handleDistractionUndo = () => {
    if (pendingDistractionId) {
      setDistractions((prev) => prev.filter((d) => d.id !== pendingDistractionId));
    }
    setPendingDistractionId(null);
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
    distractionSecs,
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
      distractionSecs,
      noteCount,
      events: eventsSnapshot ?? [...sessionEventsRef.current],
    });
    if (outcome === "completed" && !todo.completed) toggleTodo(todo.id);
    removeFocusTodo(todo.id);
  };

  const handleStop = () => {
    // 若处于主动分心中，先结束分心计时（不弹 Modal）
    let extraDistSecs = 0;
    if (isProactiveDistraction && proactiveDistractionStartTs) {
      extraDistSecs = Math.round((Date.now() - proactiveDistractionStartTs) / 1000);
      const pdId = proactiveDistractionId;
      setDistractions((prev) =>
        prev.map((d) => (d.id === pdId ? { ...d, durationSecs: extraDistSecs } : d)),
      );
      setIsProactiveDistraction(false);
      setProactiveDistractionStartTs(null);
      setProactiveDistractionId(null);
    }

    // 先捕获当前计时状态，再归零——确保 hasSelection effect 读到 seconds=0 不重复发币
    const finalSecs = seconds;
    const finalSession = getSession();
    const finalDistractionCount = sessionDistractions.length;
    const finalNoteCount = sessionNotes.length;
    // 计算主动分心总时长（已完成的 + 本次中断的）
    const finalDistractionSecs =
      sessionDistractions
        .filter((d) => d.type === "proactive" && d.durationSecs != null)
        .reduce((sum, d) => sum + d.durationSecs, 0) + extraDistSecs;

    if (finalSecs > 0) addCoins(finalSecs);
    // 先把所有任务结束事件 + 会话结束写入日志，再截取快照
    selectedTodos.forEach((t) =>
      logEvent("task_ended", { taskId: t.id, taskText: t.text })
    );
    logEvent("session_end");
    const finalEvents = [...sessionEventsRef.current];
    clearSession();
    selectedTodos.forEach((t) =>
      settleTask(t, "ended", finalSecs, finalSession, finalSecs, finalDistractionCount, finalNoteCount, finalEvents, finalDistractionSecs)
    );
    setIsImmersive(false);
    setSessionStartTs(null);
  };

  return (
    <>
      {pendingDistractionId && (
        <DistractionModal
          onTag={handleDistractionTag}
          onUndo={handleDistractionUndo}
          onClose={() => setPendingDistractionId(null)}
        />
      )}
      {isImmersive && (
        <ImmersiveView
          isRunning={isRunning}
          seconds={seconds}
          selectedTodos={selectedTodos}
          availableTodos={availableTodos}
          scenarioTitle={scenarioTitle}
          scenarioDescription={scenarioDescription}
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
          onProactiveDistraction={startProactiveDistraction}
          onReturnFromDistraction={endProactiveDistraction}
          isProactiveDistraction={isProactiveDistraction}
          proactiveDistractionStartTs={proactiveDistractionStartTs}
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
        scenarioDescription={scenarioDescription}
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
