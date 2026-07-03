import { describe, it, expect } from "vitest";
import { reducer, initialPhaseState } from "./useDistractionTracking";

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
