import { useCallback, useEffect, useReducer, useRef } from "react";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import { getElapsedSecs } from "@/utils/time";
import { makeSessionEntry } from "@/utils/records/focusRecords";
import desktop, { isDesktop } from "@/utils/desktop/desktopBridge";

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

export default function useDistractionTracking({ getSession, focusedTodoIds, isRunning, isRunningNow, togglePause }) {
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

  // ── 桌面端：切去别的软件 ────────────────────────────────────────────
  // 主进程判定前台程序不在白名单时，桌宠的瓶子会翻过来往外倒水（见 main.cjs）。
  // 那一下和用户自己按「我分心了」是同一件事，所以这里做两件事：
  //   1. 把计时器按下暂停——人在别的软件里的时间不该算进专注。
  //      只恢复我们自己按下的那一次（autoPausedRef），用户手动按的暂停不去动它。
  //   2. 把用完的每一段写成一条分心记录：几点到几点、用的哪个程序。
  // 不弹打标签的弹窗：用户此刻人在别的软件里，弹窗只会在他回来时糊一脸，
  // 而「用的哪个程序」本身已经是比手打的标签更准的那个答案了。
  //
  // 订阅只建一次（IPC 事件不该因为回调换了引用就反复解绑重绑），
  // 需要的最新值统一从这份 ref 里取。
  const autoPausedRef = useRef(false);
  // 切走那一刻是哪次会话。结账发生在回来的时候，而这中间会话可能已经结束
  // （切走期间从桌宠点了「结束」，或者主进程在闸门关闭时补的那次结账），
  // 那时再读 getSession() 只会拿到 null，这条记录就无家可归了。
  const awaySessionRef = useRef(null);
  const liveRef = useRef({});
  liveRef.current = { isRunningNow, getSession, focusedTodoIds, togglePause };

  useEffect(() => {
    if (!isDesktop) return undefined;
    return desktop.onDistraction((evt) => {
      const live = liveRef.current;
      if (evt?.type === "enter") {
        awaySessionRef.current = live.getSession().sessionId;
        if (live.isRunningNow()) {
          autoPausedRef.current = true;
          // 按主进程判定的那一刻暂停，不是消息到达的这一刻：机器睡着时这条消息
          // 可能到第二天醒来才被处理，按到达时刻停就把一整夜算进专注了。
          live.togglePause(evt.ts);
        }
        return;
      }
      if (evt?.type === "leave") {
        // leave 一定排在这一段的 segment 之后（见 main.cjs 的 applyVerdict），
        // 到这里那条记录已经落好了，会话归属可以扔了
        awaySessionRef.current = null;
        if (!autoPausedRef.current) return;
        autoPausedRef.current = false;
        // 会话可能在切走期间就被结束了，那就没有可恢复的计时器——
        // 此时 togglePause 会凭空把一次已结束的会话又跑起来。
        //
        // 「在不在跑」必须实时读（isRunningNow），不能读 isRunning 那个 state：
        // 合上盖子的场景里 enter 与 leave 是醒来时一前一后连着送达的，中间来不及
        // 重渲染一次，读 state 会读到「还在跑」，于是这一句被跳过——睡醒后计时器
        // 停在那儿再也不动，正是要修的那个 bug。
        if (!live.isRunningNow() && live.getSession().sessionId) live.togglePause();
        return;
      }
      if (evt?.type !== "segment") return;
      const entry = makeSessionEntry(
        {
          // 记录的时间戳是「切走的那一刻」，不是回来的那一刻
          ts: evt.startTs,
          endTs: evt.endTs,
          type: "app",
          // 用程序名当标签：分心原因排行就直接排出「是哪个软件把人拽走的」
          tag: evt.label || evt.name,
          note: null,
          durationSecs: evt.durationSecs,
          appName: evt.name,
          appLabel: evt.label || evt.name,
        },
        {
          sessionId: awaySessionRef.current ?? live.getSession().sessionId,
          focusedTodoIds: live.focusedTodoIds,
        },
      );
      setDistractions((prev) => [...prev, entry]);
    });
  }, [setDistractions]);

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
