import { useCallback, useReducer } from "react";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import { getElapsedSecs } from "@/utils/time";
import { makeSessionEntry } from "@/utils/records/focusRecords";

// 状态机定义：
//   idle              — 无进行中的分心
//   reactive-pending  — 刚记录了被动分心，弹窗等待打标签
//   proactive-running — 主动暂停中（计时器已暂停）
//   proactive-pending — 主动暂停结束，弹窗等待打标签
export const initialPhaseState = {
  phase: "idle",       // 'idle' | 'reactive-pending' | 'proactive-running' | 'proactive-pending'
  pendingId: null,     // 等待打标签的分心记录 id
  proactiveId: null,   // 当前主动分心记录 id
  proactiveStartTs: null,
};

// 分心状态机（具名导出便于单测）
export function reducer(state, action) {
  switch (action.type) {
    case "RECORD_REACTIVE":
      return { ...initialPhaseState, phase: "reactive-pending", pendingId: action.id };
    case "START_PROACTIVE":
      return { ...initialPhaseState, phase: "proactive-running", proactiveId: action.id, proactiveStartTs: action.now };
    case "END_PROACTIVE":
      return { ...initialPhaseState, phase: "proactive-pending", pendingId: action.id };
    case "TAG":
    case "UNDO":
    case "DISMISS":
    case "FLUSH":
      return initialPhaseState;
    default:
      return state;
  }
}

export default function useDistractionTracking({ getSession, focusedTodoIds, isRunning, togglePause }) {
  const [distractions, setDistractions] = useLocalStorage(STORAGE_KEYS.DISTRACTIONS, []);
  const [phaseState, dispatch] = useReducer(reducer, initialPhaseState);

  const { phase, pendingId, proactiveId, proactiveStartTs } = phaseState;

  const recordDistraction = useCallback(() => {
    const { sessionId } = getSession();
    const entry = makeSessionEntry(
      { tag: null, note: null, type: "reactive" },
      { sessionId, focusedTodoIds },
    );
    setDistractions((prev) => [...prev, entry]);
    dispatch({ type: "RECORD_REACTIVE", id: entry.id });
  }, [getSession, focusedTodoIds, setDistractions]);

  const startProactiveDistraction = useCallback(() => {
    if (!isRunning || phase === "proactive-running") return;
    const { sessionId } = getSession();
    const entry = makeSessionEntry(
      { tag: null, note: null, type: "proactive", durationSecs: null },
      { sessionId, focusedTodoIds },
    );
    setDistractions((prev) => [...prev, entry]);
    // 用条目自身 ts 作为主动分心起点，保证 filter 与时长计算口径一致
    dispatch({ type: "START_PROACTIVE", id: entry.id, now: entry.ts });
    togglePause();
  }, [isRunning, phase, getSession, focusedTodoIds, setDistractions, togglePause]);

  const endProactiveDistraction = useCallback(() => {
    if (phase !== "proactive-running" || !proactiveStartTs) return;
    const durationSecs = getElapsedSecs(proactiveStartTs);
    setDistractions((prev) =>
      prev.map((d) => (d.id === proactiveId ? { ...d, durationSecs } : d)),
    );
    dispatch({ type: "END_PROACTIVE", id: proactiveId });
    togglePause();
  }, [phase, proactiveStartTs, proactiveId, setDistractions, togglePause]);

  const handleDistractionTag = useCallback((tag, note) => {
    if (pendingId) {
      setDistractions((prev) =>
        prev.map((d) =>
          d.id === pendingId ? { ...d, tag: tag || null, note: note || null } : d,
        ),
      );
    }
    dispatch({ type: "TAG" });
  }, [pendingId, setDistractions]);

  // 「懒得记」：保留已建的空白记录、仅关闭弹窗（回到 idle，不删记录）。
  const skipDistractionTag = useCallback(() => dispatch({ type: "DISMISS" }), []);

  // 存档后的撤回入口：按 id 删掉这条分心（供「已记下 · 撤回」toast 使用）。
  const removeDistraction = useCallback(
    (id) => setDistractions((prev) => prev.filter((d) => d.id !== id)),
    [setDistractions],
  );

  // 会话结束时如果还在主动分心中，结束它并返回额外秒数
  const flushProactiveDistraction = useCallback(() => {
    if (phase !== "proactive-running" || !proactiveStartTs) return 0;
    const extraSecs = getElapsedSecs(proactiveStartTs);
    setDistractions((prev) =>
      prev.map((d) => (d.id === proactiveId ? { ...d, durationSecs: extraSecs } : d)),
    );
    dispatch({ type: "FLUSH" });
    return extraSecs;
  }, [phase, proactiveStartTs, proactiveId, setDistractions]);

  return {
    distractions,
    pendingDistractionId: pendingId,
    isProactiveDistraction: phase === "proactive-running",
    proactiveDistractionStartTs: proactiveStartTs,
    recordDistraction,
    startProactiveDistraction,
    endProactiveDistraction,
    handleDistractionTag,
    skipDistractionTag,
    removeDistraction,
    flushProactiveDistraction,
  };
}
