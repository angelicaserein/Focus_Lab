import { describe, it, expect } from "vitest";
import { reducer, initialPhaseState } from "@/hooks/focus/useDistractionTracking";

describe("分心状态机 reducer", () => {
  it("初始为 idle", () => {
    expect(initialPhaseState.phase).toBe("idle");
  });

  it("RECORD_REACTIVE：进入 reactive-pending 并记下 pendingId", () => {
    const s = reducer(initialPhaseState, { type: "RECORD_REACTIVE", id: "d1" });
    expect(s.phase).toBe("reactive-pending");
    expect(s.pendingId).toBe("d1");
  });

  it("START_PROACTIVE：进入 proactive-running 并记下 proactiveId/起点", () => {
    const s = reducer(initialPhaseState, { type: "START_PROACTIVE", id: "p1", now: 1234 });
    expect(s.phase).toBe("proactive-running");
    expect(s.proactiveId).toBe("p1");
    expect(s.proactiveStartTs).toBe(1234);
  });

  it("END_PROACTIVE：从 running 转 proactive-pending 等待打标签", () => {
    const running = reducer(initialPhaseState, { type: "START_PROACTIVE", id: "p1", now: 1 });
    const ended = reducer(running, { type: "END_PROACTIVE", id: "p1" });
    expect(ended.phase).toBe("proactive-pending");
    expect(ended.pendingId).toBe("p1");
    expect(ended.proactiveId).toBeNull();
  });

  it("TAG/UNDO/DISMISS/FLUSH 均归位到初始 idle 状态", () => {
    const pending = reducer(initialPhaseState, { type: "RECORD_REACTIVE", id: "d1" });
    for (const type of ["TAG", "UNDO", "DISMISS", "FLUSH"]) {
      expect(reducer(pending, { type })).toEqual(initialPhaseState);
    }
  });

  it("未知 action 返回原状态", () => {
    const pending = reducer(initialPhaseState, { type: "RECORD_REACTIVE", id: "d1" });
    expect(reducer(pending, { type: "UNKNOWN" })).toBe(pending);
  });
});

// ── 以下为独立审查补充的边界用例（2026-09-01）─────────────────────────────
// 「极短时间内来回切换」在这一层的表现：reducer 本身不做任何合法性校验，
// 拦截全在 hook 的回调里（isRunning / phase 判断）。把这条分工钉住，
// 免得以后有人把守卫从 hook 挪走却以为 reducer 兜得住。

describe("分心状态机的来回切换", () => {
  const running = (now = 1000) =>
    reducer(initialPhaseState, { type: "START_PROACTIVE", id: "p1", now });

  it("重复 START_PROACTIVE 会顶掉上一次的 id 与起点（reducer 不拦，靠 hook 守卫）", () => {
    const s = reducer(running(1000), { type: "START_PROACTIVE", id: "p2", now: 1005 });
    expect(s.proactiveId).toBe("p2");
    expect(s.proactiveStartTs).toBe(1005); // 上一段的起点丢了 → 计时会短算
  });

  it("主动分心进行中记一次被动分心，会把主动那一段的状态冲掉", () => {
    const s = reducer(running(), { type: "RECORD_REACTIVE", id: "d1" });
    expect(s.phase).toBe("reactive-pending");
    expect(s.proactiveId).toBeNull();
    expect(s.proactiveStartTs).toBeNull();
  });

  it("END_PROACTIVE 会清空起点，重复 END 不会再算出第二段时长", () => {
    const ended = reducer(running(), { type: "END_PROACTIVE", id: "p1" });
    expect(ended.proactiveStartTs).toBeNull();
    const again = reducer(ended, { type: "END_PROACTIVE", id: "p1" });
    expect(again.proactiveStartTs).toBeNull();
  });

  it("start → end → start → end 连打两轮，末态是干净的 pending", () => {
    let s = initialPhaseState;
    for (const [id, now] of [["p1", 1000], ["p2", 1002]]) {
      s = reducer(s, { type: "START_PROACTIVE", id, now });
      expect(s.phase).toBe("proactive-running");
      s = reducer(s, { type: "END_PROACTIVE", id });
    }
    expect(s).toEqual({ ...initialPhaseState, phase: "proactive-pending", pendingId: "p2" });
  });

  it("action 缺 id / now 时不崩，字段就是 undefined（reducer 不做兜底）", () => {
    const s = reducer(initialPhaseState, { type: "START_PROACTIVE" });
    expect(s.phase).toBe("proactive-running");
    expect(s.proactiveStartTs).toBeUndefined();
  });
});
