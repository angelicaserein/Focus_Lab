import { describe, it, expect, vi } from "vitest";
import { filterSinceSession, buildFocusRecord } from "@/utils/records/focusRecords";

describe("filterSinceSession", () => {
  const items = [
    { id: "a", ts: 100 },
    { id: "b", ts: 200 },
    { id: "c", ts: 300 },
  ];

  it("sessionStartTs 为空时返回空数组（避免误算历史条目）", () => {
    expect(filterSinceSession(items, null)).toEqual([]);
    expect(filterSinceSession(items, 0)).toEqual([]);
    expect(filterSinceSession(items, undefined)).toEqual([]);
  });

  it("只保留 ts >= sessionStartTs 的条目", () => {
    expect(filterSinceSession(items, 200).map((x) => x.id)).toEqual(["b", "c"]);
  });

  it("边界：ts === sessionStartTs 命中", () => {
    expect(filterSinceSession(items, 300).map((x) => x.id)).toEqual(["c"]);
  });
});

describe("buildFocusRecord", () => {
  const todo = { id: "t1", text: "写报告", completed: false };
  const base = {
    durationSecs: 120,
    startedAt: 1000,
    sessionId: "s1",
    coinsEarned: 120,
    distractionCount: 2,
    distractionSecs: 30,
    noteCount: 1,
    events: [{ type: "session_start" }],
  };

  it("透传 taskId/taskText/outcome 与会话字段", () => {
    const r = buildFocusRecord(todo, "completed", base);
    expect(r).toMatchObject({
      taskId: "t1",
      taskText: "写报告",
      outcome: "completed",
      durationSecs: 120,
      startedAt: 1000,
      sessionId: "s1",
      coinsEarned: 120,
      distractionCount: 2,
      distractionSecs: 30,
      noteCount: 1,
    });
  });

  it("ended outcome 与 completed 仅 outcome 不同", () => {
    expect(buildFocusRecord(todo, "ended", base).outcome).toBe("ended");
  });

  it("scenario 字段缺省为 undefined，提供时透传", () => {
    expect(buildFocusRecord(todo, "ended", base).scenarioId).toBeUndefined();
    const withScenario = buildFocusRecord(todo, "ended", {
      ...base,
      scenarioId: "sc1",
      scenarioTitle: "图书馆",
    });
    expect(withScenario.scenarioId).toBe("sc1");
    expect(withScenario.scenarioTitle).toBe("图书馆");
  });

  it("startedAt 缺省时按 durationSecs 反推", () => {
    const now = 5_000_000;
    const spy = vi.spyOn(Date, "now").mockReturnValue(now);
    const r = buildFocusRecord(todo, "ended", { ...base, startedAt: undefined });
    expect(r.startedAt).toBe(now - 120 * 1000);
    spy.mockRestore();
  });
});
