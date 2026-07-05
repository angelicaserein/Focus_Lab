import React, { useMemo, useState, useRef, useCallback } from "react";
import { useTodos } from "@/context/TodoContext";
import { useFocus } from "@/context/FocusContext";
import { useReward } from "@/context/RewardContext";
import { useScenarios } from "@/context/ScenarioContext";
import useFocusTimer from "@/hooks/focus/useFocusTimer";
import useFocusChat from "@/hooks/focus/useFocusChat";
import usePrefs from "@/hooks/common/usePrefs";
import useSessionEvents from "@/hooks/session/useSessionEvents";
import useDistractionTracking from "@/hooks/focus/useDistractionTracking";
import useSessionLifecycle from "@/hooks/session/useSessionLifecycle";
import useSessionNotes from "@/hooks/session/useSessionNotes";
import useFocusSelection from "@/hooks/focus/useFocusSelection";
import useScenarioFromRoute from "@/hooks/scenario/useScenarioFromRoute";
import usePruneDeletedFocus from "@/hooks/focus/usePruneDeletedFocus";
import useAutoStopOnEmpty from "@/hooks/focus/useAutoStopOnEmpty";
import useFlaskFullNotify from "@/hooks/focus/useFlaskFullNotify";
import { filterSinceSession } from "@/utils/records/focusRecords";
import { FocusSessionContext } from "@/pages/Focus/FocusSessionContext";
import ImmersiveView from "@/pages/Focus/Immersive";
import FocusConsole from "@/pages/Focus/FocusConsole";
import DistractionModal from "@/pages/Focus/DistractionModal";
import SessionRewardCard from "@/pages/Focus/SessionRewardCard";
import { computeCharacter, computeSessionReward } from "@/utils/character/characterUtils";
import "./Focus.css";

export default function FocusPage() {
  const { todos, toggleTodo, addTodo } = useTodos();
  const { focusedTodoIds, addFocusTodo, removeFocusTodo, clearFocusTodos, addFocusRecord, focusRecords } =
    useFocus();
  const { addCoins, coins } = useReward();
  const { scenarios, activeScenarioId, activeScenario, setActiveScenario } = useScenarios();

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

  // 情境取自全局「当前情景」（贯穿待办/专注/情景页，持久化，会话结束后自然保留）
  const scenarioTitle = activeScenario?.title ?? null;
  const scenarioDescription = activeScenario?.description || null;

  useScenarioFromRoute(setActiveScenario);
  usePruneDeletedFocus(todos, focusedTodoIds, removeFocusTodo);

  const { logEvent, resetEvents, getSnapshot } = useSessionEvents();
  const { seconds, isRunning, start, togglePause, resetTimer, clearSession, getSession, jumpSeconds } =
    useFocusTimer();
  const { messages, sending, sendUserMessage } = useFocusChat();
  const [isImmersive, setIsImmersive] = useState(false);

  // 专注结束的结算叙事卡：非空表示正在展示本次收益。
  const [sessionReward, setSessionReward] = useState(null);

  // 会话「结算前」的角色快照。会话开始时定格。
  // 为什么用开始时的快照而非结束时重新计算：逐一勾完任务的路径里，先完成的任务
  // 已把本次会话时长写进记录，若结束时才读 prevXp 会把本次时长算进去、经验重复计数。
  // 定格在开始时则天然是「本次会话之前」的状态，两条结束路径共用、口径一致。
  const sessionStartRef = useRef(null);

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

  const { sessionNotes, addNote } = useSessionNotes({ sessionStartTs, getSession, focusedTodoIds });

  const sessionDistractions = useMemo(
    () => filterSinceSession(distractions, sessionStartTs),
    [distractions, sessionStartTs],
  );

  const {
    countupFullMins, setCountupFullMins, countdownMins, setCountdownMins,
    countupPresets, countdownPresets,
    timerMode, setTimerMode,
    animEnabled, setAnimEnabled, cardVisible, setCardVisible, notifyEnabled,
  } = usePrefs();

  // 当前模式下的目标时长（分钟）：正计时=烧瓶注满时长；倒计时=起始时长
  const targetMins = timerMode === "countdown" ? countdownMins : countupFullMins;
  // 当前模式对应的时长 setter，供控制台就地调整烧瓶时长
  const setTargetMins = timerMode === "countdown" ? setCountdownMins : setCountupFullMins;
  // 当前模式对应的三档快捷预设
  const targetPresets = timerMode === "countdown" ? countdownPresets : countupPresets;

  // 烧瓶注满（倒计时归零）弹系统通知，仅在开启「桌面通知」偏好时生效
  useFlaskFullNotify({ seconds, targetMins, isRunning, enabled: notifyEnabled });

  // 定格「结算前」快照（会话开始时调用）。
  const captureStartSnapshot = () => {
    const before = computeCharacter({ records: focusRecords, scenarios, coins, todos });
    sessionStartRef.current = {
      prevRecords: focusRecords,
      prevXp: before.xp,
      prevLevel: before.level,
    };
  };

  // 用开始时的快照 + 本次会话事实换算收益并弹卡。两条结束路径共用。
  const showSessionReward = ({ durationSecs, distractionCount }) => {
    const snap = sessionStartRef.current ?? { prevRecords: focusRecords, prevXp: 0, prevLevel: 0 };
    setSessionReward(computeSessionReward({ durationSecs, distractionCount, ...snap }));
  };

  // useSessionLifecycle 先于 useFocusSelection：后者需要 handleStart 作为 onAutoStart 回调
  const { handleStart, settleTask, handleStop } = useSessionLifecycle({
    seconds, start, clearSession, getSession,
    logEvent, resetEvents, getSnapshot,
    flushProactiveDistraction,
    sessionDistractions,
    sessionNotes,
    addFocusRecord, addCoins, removeFocusTodo, toggleTodo,
    selectedTodos, selectedScenarioId: activeScenarioId, scenarioTitle,
    setSessionStartTs,
    onStart: () => {
      setIsImmersive(true);
      captureStartSnapshot();
    },
    onStop: () => setIsImmersive(false),
    // 「结束专注」路径：结算所有剩余任务后弹卡。
    onSessionReward: showSessionReward,
  });

  // 「逐一勾完」路径：当「完成」某任务恰好清空选中集合（真正做完本次全部任务）才弹卡。
  // 清空按钮 / 逐个移除 chip 等非完成收尾不触发（它们不是 completed）。
  const handleSettle = useCallback(
    (todo, outcome, opts) => {
      settleTask(todo, outcome, opts);
      const emptiesSelection = focusedTodoIds.filter((id) => id !== todo.id).length === 0;
      if (outcome === "completed" && seconds > 0 && emptiesSelection) {
        showSessionReward({ durationSecs: seconds, distractionCount: sessionDistractions.length });
      }
    },
    // showSessionReward / captureStartSnapshot 为事件闭包，随渲染重建但调用即取新值
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settleTask, focusedTodoIds, seconds, sessionDistractions.length],
  );

  const { addToFocus, createAndFocus, replaceFocus, handleDrawerSelect } = useFocusSelection({
    todos,
    addTodo,
    addFocusTodo,
    removeFocusTodo,
    logEvent,
    onAutoStart: handleStart,
    hasSelection,
  });

  useAutoStopOnEmpty(hasSelection, {
    seconds,
    addCoins,
    clearSession,
    onStop: () => setIsImmersive(false),
  });

  const handleTogglePause = () => {
    logEvent(isRunning ? "session_paused" : "session_resumed");
    togglePause();
  };

  const sessionCtxValue = useMemo(
    () => ({
      isRunning,
      seconds,
      selectedTodos,
      availableTodos,
      scenarioTitle,
      scenarioDescription,
      sessionStartTs,
      cardVisible,
      animEnabled,
      timerMode,
      setTimerMode,
      targetMins,
      onSettle: handleSettle,
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
    }),
    // handleTogglePause / addNote 每渲染重建但消费方为事件回调，不影响正确性
    [
      isRunning, seconds, selectedTodos, availableTodos, scenarioTitle, scenarioDescription,
      sessionStartTs, cardVisible, animEnabled, timerMode, setTimerMode, targetMins,
      handleSettle, addToFocus, createAndFocus, replaceFocus, resetTimer, handleStop,
      setCardVisible, setAnimEnabled, messages, sending, sendUserMessage,
      recordDistraction, startProactiveDistraction, endProactiveDistraction,
      isProactiveDistraction, proactiveDistractionStartTs, sessionNotes,
      sessionDistractions.length, jumpSeconds,
    ],
  );

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

      {sessionReward && (
        <SessionRewardCard reward={sessionReward} onClose={() => setSessionReward(null)} />
      )}

      <FocusConsole
        selectedTodos={selectedTodos}
        hasSelection={hasSelection}
        canReset={hasSelection && seconds > 0}
        scenarios={scenarios}
        selectedScenarioId={activeScenarioId}
        scenarioDescription={scenarioDescription}
        onScenarioChange={setActiveScenario}
        timerMode={timerMode}
        onTimerModeChange={setTimerMode}
        durationMins={targetMins}
        onDurationChange={setTargetMins}
        presets={targetPresets}
        canEditDuration={!isImmersive && seconds === 0}
        onStart={handleStart}
        onReset={resetTimer}
        onClear={clearFocusTodos}
        onRemoveFocus={removeFocusTodo}
        onDrawerSelect={handleDrawerSelect}
        availableTodos={availableTodos}
        onAddFocus={addToFocus}
      />
    </FocusSessionContext.Provider>
  );
}
