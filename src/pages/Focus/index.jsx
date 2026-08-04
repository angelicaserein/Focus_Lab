import React, { Suspense, lazy, useMemo, useState, useRef, useEffect, useCallback } from "react";
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
import useDesktopFocusSync from "@/hooks/desktop/useDesktopFocusSync";
import { filterSinceSession } from "@/utils/records/focusRecords";
import { FocusSessionContext } from "@/pages/Focus/FocusSessionContext";
// 沉浸层里挂着 three.js + 16MB 模型（约 1MB JS chunk）。懒加载后：进专注页只加载控制台，
// three 的 chunk 不再被打进 Focus 页 chunk、也不随路由空闲预取拉取，真正开专注才下载。
// importImmersive 抽成具名函数：lazy 与「选中任务后预取」共用同一次动态 import，
// 模块只会真正加载一次（后续调用命中模块缓存），预取只是把这次加载提前到用户点开始之前。
const importImmersive = () => import("@/pages/Focus/Immersive");
const ImmersiveView = lazy(importImmersive);
import FocusConsole from "@/pages/Focus/FocusConsole";
import RitualLaunch from "@/pages/Focus/RitualLaunch";
import DistractionModal from "@/pages/Focus/DistractionModal";
import DistractionUndoToast from "@/pages/Focus/DistractionUndoToast";
import SessionRewardCard from "@/pages/Focus/SessionRewardCard";
import { computeCharacter, computeSessionReward } from "@/utils/character/characterUtils";
import "./Focus.css";

// 沉浸层 chunk 若在交棒时仍未就绪的兜底：一层与沉浸/仪式同调的暖色背景 + 呼吸光点，
// 顶替原来的 fallback={null}（空屏）。正常情况下选中任务已预取到、几乎不会看到它。
function ImmersiveLoading() {
  return (
    <div className="immersive-loading" role="status" aria-live="polite">
      <span className="immersive-loading-dot" />
    </div>
  );
}

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

  // 一旦有选中任务（＝用户有开专注的意图），就提前把沉浸层 chunk 拉下来。
  // 这样点「开始吧」交棒时 three chunk 通常已就绪，避免出现「仪式淡出后空窗 2~3 秒才见沉浸画面」。
  // 仍不在「进专注页」时无脑预取，保留「没选任务就不下载 three」的原优化。
  useEffect(() => {
    if (hasSelection) importImmersive();
  }, [hasSelection]);

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
    skipDistractionTag,
    removeDistraction,
    flushProactiveDistraction,
  } = useDistractionTracking({ getSession, focusedTodoIds, isRunning, togglePause });

  // 分心存档后的撤回 toast：{ id, blank }。id 供撤回删除，blank 决定文案。
  const [distractionUndo, setDistractionUndo] = useState(null);
  const clearDistractionUndo = useCallback(() => setDistractionUndo(null), []);

  // 「完成」：写入 tag/note 后弹撤回 toast。捕获当前 pendingId 供撤回删除。
  const handleDistractionDone = useCallback(
    (tag, note) => {
      const id = pendingDistractionId;
      handleDistractionTag(tag, note);
      if (id) setDistractionUndo({ id, blank: false });
    },
    [pendingDistractionId, handleDistractionTag],
  );

  // 「懒得记」：保留空白记录，同样弹撤回 toast。
  const handleDistractionSkip = useCallback(() => {
    const id = pendingDistractionId;
    skipDistractionTag();
    if (id) setDistractionUndo({ id, blank: true });
  }, [pendingDistractionId, skipDistractionTag]);

  const handleDistractionUndoToast = useCallback(() => {
    if (distractionUndo) removeDistraction(distractionUndo.id);
    setDistractionUndo(null);
  }, [distractionUndo, removeDistraction]);

  const { sessionNotes, addNote } = useSessionNotes({ sessionStartTs, getSession, focusedTodoIds });

  const sessionDistractions = useMemo(
    () => filterSinceSession(distractions, sessionStartTs),
    [distractions, sessionStartTs],
  );

  const {
    countupFullMins, setCountupFullMins, countdownMins, setCountdownMins,
    countupPresets, countdownPresets,
    timerMode, setTimerMode,
    animEnabled, setAnimEnabled, ritualEnabled, cardVisible, setCardVisible, notifyEnabled,
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

  // 启动仪式：点「开始专注」按钮时先播揭晓过渡，用户点「开始吧」才真正 handleStart。
  // 只拦截显式按钮这条路；双击任务直达专注的 onAutoStart 保持顺手启动、不走仪式。
  // 关闭仪式偏好时 beginRitual 直连 handleStart，连挂载都省。
  const [ritualPending, setRitualPending] = useState(false);
  const beginRitual = useCallback(() => {
    if (!selectedTodos.length) return;
    if (ritualEnabled) setRitualPending(true);
    else handleStart();
  }, [selectedTodos.length, ritualEnabled, handleStart]);

  const finishRitual = useCallback(() => {
    setRitualPending(false);
    handleStart();
  }, [handleStart]);

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

  // 桌面版：把计时状态推给桌宠悬浮窗，并接住它发回的开始 / 暂停 / 结束。
  // 「开始」走 beginRitual 而不是 handleStart，和页面上那颗按钮保持同一条路径
  // （包括启动仪式）。浏览器里这个 hook 整个是空转。
  useDesktopFocusSync({
    seconds, isRunning, isImmersive, targetMins, timerMode, hasSelection,
    onStart: beginRitual,
    onTogglePause: handleTogglePause,
    onStop: handleStop,
  });

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
          onTag={handleDistractionDone}
          onSkip={handleDistractionSkip}
        />
      )}

      <DistractionUndoToast
        pending={distractionUndo}
        onUndo={handleDistractionUndoToast}
        onDismiss={clearDistractionUndo}
      />
      {isImmersive && (
        <Suspense fallback={<ImmersiveLoading />}>
          <ImmersiveView />
        </Suspense>
      )}

      {sessionReward && (
        <SessionRewardCard reward={sessionReward} onClose={() => setSessionReward(null)} />
      )}

      {ritualPending && (
        <RitualLaunch
          selectedTodos={selectedTodos}
          scenarioTitle={scenarioTitle}
          animEnabled={animEnabled}
          onComplete={finishRitual}
          onSkip={finishRitual}
        />
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
        onStart={beginRitual}
        onReset={resetTimer}
        onClear={clearFocusTodos}
        onRemoveFocus={removeFocusTodo}
        onDrawerSelect={handleDrawerSelect}
        availableTodos={availableTodos}
        onAddFocus={addToFocus}
        onStartImmersive={handleDrawerSelect}
      />
    </FocusSessionContext.Provider>
  );
}
