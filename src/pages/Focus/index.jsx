import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTodos } from "../../context/TodoContext";
import { useFocus } from "../../context/FocusContext";
import { useReward } from "../../context/RewardContext";
import { useScenarios } from "../../context/ScenarioContext";
import useFocusTimer from "../../hooks/useFocusTimer";
import useFocusChat from "../../hooks/useFocusChat";
import usePrefs from "../../hooks/usePrefs";
import useSessionEvents from "../../hooks/useSessionEvents";
import useDistractionTracking from "../../hooks/useDistractionTracking";
import useSessionLifecycle from "../../hooks/useSessionLifecycle";
import useSessionNotes from "../../hooks/useSessionNotes";
import useFocusSelection from "../../hooks/useFocusSelection";
import { FocusSessionContext } from "./FocusSessionContext";
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

  // 当前专注任务列表
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // todos 变化时清理已不存在的 focusedTodoId（todo 被删除后同步移出 focus 列表）
  useEffect(() => {
    const todoIdSet = new Set(todos.map((t) => t.id));
    focusedTodoIds.forEach((id) => {
      if (!todoIdSet.has(id)) removeFocusTodo(id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todos]);

  const { logEvent, resetEvents, getSnapshot } = useSessionEvents();
  const { seconds, isRunning, start, togglePause, resetTimer, clearSession, getSession, jumpSeconds } =
    useFocusTimer();
  const { messages, sending, sendUserMessage, clearChat } = useFocusChat();
  const [isImmersive, setIsImmersive] = useState(false);

  // 本次会话起始时间戳，用于筛选「本次」的随记和分心条目
  // 留在 FocusPage：同时被 useSessionLifecycle 消费（setSessionStartTs），不能下沉
  const [sessionStartTs, setSessionStartTs] = useState(null);

  const {
    distractions,
    pendingDistractionId,
    isProactiveDistraction,
    proactiveDistractionStartTs,
    recordDistraction,
    startProactiveDistraction,
    endProactiveDistraction,
    handleDistractionTag,
    handleDistractionUndo,
    dismissPendingDistraction,
    flushProactiveDistraction,
  } = useDistractionTracking({ getSession, focusedTodoIds, isRunning, togglePause });

  const { notes, sessionNotes, addNote } = useSessionNotes({ sessionStartTs, getSession, focusedTodoIds });

  const sessionDistractions = useMemo(
    () => distractions.filter((d) => sessionStartTs && d.ts >= sessionStartTs),
    [distractions, sessionStartTs],
  );

  const { pomodoroMins, animEnabled, setAnimEnabled, cardVisible, setCardVisible } = usePrefs();

  // useSessionLifecycle 先于 useFocusSelection：后者需要 handleStart 作为 onAutoStart 回调
  const { handleStart, settleTask, handleStop } = useSessionLifecycle({
    seconds, start, clearSession, getSession,
    logEvent, resetEvents, getSnapshot,
    flushProactiveDistraction,
    sessionDistractions,
    sessionNotes,
    addFocusRecord, addCoins, removeFocusTodo, toggleTodo,
    selectedTodos, selectedScenarioId, scenarioTitle,
    setSessionStartTs,
    onStart: () => setIsImmersive(true),
    onStop: () => setIsImmersive(false),
  });

  const { addToFocus, createAndFocus, replaceFocus, handleDrawerSelect } = useFocusSelection({
    todos,
    addTodo,
    addFocusTodo,
    removeFocusTodo,
    logEvent,
    onAutoStart: handleStart,
    hasSelection,
  });

  // 选中集合清空时：若计时器还在跑（任务被逐一勾完），先发币再归零并退出沉浸。
  // handleStop 先调 clearSession()（seconds 归零），所以此处 seconds>0 只在
  // 「逐一勾完」路径下成立，不会与 handleStop 的发币重复。
  useEffect(() => {
    if (!hasSelection) {
      if (seconds > 0) addCoins(seconds);
      clearSession();
      setIsImmersive(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSelection]);

  const handleTogglePause = () => {
    logEvent(isRunning ? "session_paused" : "session_resumed");
    togglePause();
  };

  const sessionCtxValue = {
    isRunning,
    seconds,
    selectedTodos,
    availableTodos,
    scenarioTitle,
    scenarioDescription,
    sessionStartTs,
    cardVisible,
    animEnabled,
    pomodoroMins,
    onSettle: settleTask,
    onAddFocus: addToFocus,
    onCreateFocus: createAndFocus,
    onReplaceFocus: replaceFocus,
    onTogglePause: handleTogglePause,
    onReset: resetTimer,
    onStop: handleStop,
    setCardVisible,
    setAnimEnabled,
    chatMessages: messages,
    chatSending: sending,
    onChatSend: sendUserMessage,
    onAddNote: addNote,
    onDistraction: recordDistraction,
    onProactiveDistraction: startProactiveDistraction,
    onReturnFromDistraction: endProactiveDistraction,
    isProactiveDistraction,
    proactiveDistractionStartTs,
    sessionNotes,
    sessionDistractionCount: sessionDistractions.length,
    jumpSeconds,
  };

  return (
    <FocusSessionContext.Provider value={sessionCtxValue}>
      {pendingDistractionId && (
        <DistractionModal
          onTag={handleDistractionTag}
          onUndo={handleDistractionUndo}
          onClose={dismissPendingDistraction}
        />
      )}
      {isImmersive && <ImmersiveView />}

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
    </FocusSessionContext.Provider>
  );
}
