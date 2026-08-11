import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  filterSinceSession,
  buildFocusRecord,
  sessionKey,
  sessionMaxSecsMap,
  totalFocusSecs,
  groupBySession,
  last7DaysData,
  computeFocusStats,
} from "@/utils/records/focusRecords";

// 聚合类用例的时间基准：2026-06-14 14:30（本地），冻结后断言字面日期标签。
const NOW = new Date(2026, 5, 14, 14, 30, 0);

// 默认落在「今天」，要别的日子就显式传 startedAt。
const rec = (over = {}) => ({
  taskId: "t1",
  taskText: "写论文",
  durationSecs: 60,
  startedAt: new Date(2026, 5, 14, 10, 0, 0).getTime(),
  sessionId: "s1",
  outcome: "completed",
  ...over,
});

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

describe("sessionKey", () => {
  it("有 sessionId 时用 sessionId", () => {
    expect(sessionKey({ id: "r1", sessionId: "s1" })).toBe("s1");
  });

  it("旧记录无 sessionId 时退化到自身 id", () => {
    expect(sessionKey({ id: "r1" })).toBe("r1");
  });
});

describe("sessionMaxSecsMap / totalFocusSecs", () => {
  it("同一会话取 max 而非 sum：多任务并行不重复累加墙钟", () => {
    // 一次 40s 的专注里挂了两个任务，累计仍是 40s，不是 80s
    const rows = [rec({ taskId: "a", durationSecs: 40 }), rec({ taskId: "b", durationSecs: 40 })];
    expect(sessionMaxSecsMap(rows).get("s1")).toBe(40);
    expect(totalFocusSecs(rows)).toBe(40);
  });

  it("不同会话之间相加", () => {
    const rows = [
      rec({ sessionId: "s1", durationSecs: 40 }),
      rec({ sessionId: "s2", durationSecs: 20 }),
    ];
    expect(totalFocusSecs(rows)).toBe(60);
  });

  it("旧记录无 sessionId 时各自独立计入", () => {
    const rows = [
      rec({ id: "r1", sessionId: undefined, durationSecs: 30 }),
      rec({ id: "r2", sessionId: undefined, durationSecs: 30 }),
    ];
    expect(totalFocusSecs(rows)).toBe(60);
  });

  it("空列表为 0", () => {
    expect(totalFocusSecs([])).toBe(0);
  });
});

describe("groupBySession", () => {
  it("同会话归成一张卡：startedAt 取最早、totalSecs 取最大", () => {
    const early = new Date(2026, 5, 14, 9, 0, 0).getTime();
    const late = new Date(2026, 5, 14, 9, 30, 0).getTime();
    const sessions = groupBySession([
      rec({ startedAt: late, durationSecs: 30 }),
      rec({ startedAt: early, durationSecs: 90 }),
    ]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].key).toBe("s1");
    expect(sessions[0].records).toHaveLength(2);
    expect(sessions[0].startedAt).toBe(early);
    expect(sessions[0].totalSecs).toBe(90);
  });

  it("不同会话各自成组，保持首次出现的顺序", () => {
    const sessions = groupBySession([rec({ sessionId: "s2" }), rec({ sessionId: "s1" })]);
    expect(sessions.map((s) => s.key)).toEqual(["s2", "s1"]);
  });

  it("无 sessionId 的旧记录各自独立成组", () => {
    const sessions = groupBySession([
      rec({ id: "r1", sessionId: undefined }),
      rec({ id: "r2", sessionId: undefined }),
    ]);
    expect(sessions).toHaveLength(2);
  });
});

describe("last7DaysData", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  // label 不含语言相关文案，「今天」由 isToday 交给页面翻译
  it("返回 7 天，今天在最右且带 isToday", () => {
    const days = last7DaysData([]);
    expect(days).toHaveLength(7);
    expect(days[6]).toMatchObject({ label: "6/14", isToday: true });
    expect(days[0]).toMatchObject({ label: "6/8", isToday: false });
  });

  it("按自然日归拢时长", () => {
    const days = last7DaysData([
      rec({ startedAt: new Date(2026, 5, 14, 8, 0, 0).getTime(), durationSecs: 50 }),
      rec({ sessionId: "s2", startedAt: new Date(2026, 5, 13, 8, 0, 0).getTime(), durationSecs: 20 }),
    ]);
    expect(days[6].totalSecs).toBe(50); // 今天
    expect(days[5].totalSecs).toBe(20); // 昨天
    expect(days[4].totalSecs).toBe(0);
  });

  it("7 天窗口外的记录不计入", () => {
    const days = last7DaysData([
      rec({ startedAt: new Date(2026, 4, 1, 8, 0, 0).getTime(), durationSecs: 999 }),
    ]);
    expect(days.every((d) => d.totalSecs === 0)).toBe(true);
  });
});

describe("computeFocusStats", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it("空记录时各项归零，平均值不出现除零 NaN", () => {
    const s = computeFocusStats([]);
    expect(s.totalSecs).toBe(0);
    expect(s.sessionCount).toBe(0);
    expect(s.avgSecs).toBe(0);
    expect(s.longestSecs).toBe(0);
    expect(s.taskBreakdown).toEqual([]);
  });

  it("会话数按 sessionId 去重，平均以会话为分母", () => {
    const s = computeFocusStats([
      rec({ sessionId: "s1", taskId: "a", durationSecs: 60 }),
      rec({ sessionId: "s1", taskId: "b", durationSecs: 60 }), // 同会话第二个任务
      rec({ sessionId: "s2", durationSecs: 30 }),
    ]);
    expect(s.sessionCount).toBe(2);
    expect(s.totalSecs).toBe(90); // 60(去重) + 30
    expect(s.avgSecs).toBe(45);
  });

  it("今日时长只含今天的记录", () => {
    const s = computeFocusStats([
      rec({ startedAt: new Date(2026, 5, 14, 8, 0, 0).getTime(), durationSecs: 60 }),
      rec({ sessionId: "s2", startedAt: new Date(2026, 5, 10, 8, 0, 0).getTime(), durationSecs: 100 }),
    ]);
    expect(s.totalSecs).toBe(160);
    expect(s.todaySecs).toBe(60);
  });

  it("最长单次取单条记录的最大时长", () => {
    const s = computeFocusStats([
      rec({ durationSecs: 10 }),
      rec({ sessionId: "s2", durationSecs: 300 }),
    ]);
    expect(s.longestSecs).toBe(300);
  });

  it("任务排行按累计时长降序，同名任务合并", () => {
    const s = computeFocusStats([
      rec({ taskText: "看文献", sessionId: "s1", durationSecs: 10 }),
      rec({ taskText: "写论文", sessionId: "s2", durationSecs: 50 }),
      rec({ taskText: "看文献", sessionId: "s3", durationSecs: 30 }),
    ]);
    // 看文献 10+30=40 < 写论文 50，故写论文排前
    expect(s.taskBreakdown.map((b) => b.text)).toEqual(["写论文", "看文献"]);
    expect(s.taskBreakdown[1].totalSecs).toBe(40); // 两条合并
    expect(s.taskBreakdown[1].sessions).toBe(2);
  });

  it("任务排行最多 6 条", () => {
    const rows = Array.from({ length: 9 }, (_, i) =>
      rec({ taskText: `任务${i}`, sessionId: `s${i}`, durationSecs: i + 1 }),
    );
    expect(computeFocusStats(rows).taskBreakdown).toHaveLength(6);
  });
});
