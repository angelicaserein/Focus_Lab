import { describe, it, expect } from "vitest";
import {
  sessionDurationMap,
  distractionOverview,
  distractionTagRanking,
  distractionDailyTrend,
  UNTAGGED,
} from "@/utils/analytics/distractionStats";

describe("sessionDurationMap", () => {
  it("同一会话多条记录时取最长的那条（墙钟时长，不累加）", () => {
    const map = sessionDurationMap([
      { sessionId: "s1", durationSecs: 600 },
      { sessionId: "s1", durationSecs: 1800 },
      { sessionId: "s2", durationSecs: 300 },
    ]);
    expect(map).toEqual({ s1: 1800, s2: 300 });
  });

  it("忽略没有 sessionId 的记录", () => {
    expect(sessionDurationMap([{ durationSecs: 900 }])).toEqual({});
  });
});

describe("distractionOverview", () => {
  const dists = [
    { ts: 1, sessionId: "s1", type: "reactive" },
    { ts: 2, sessionId: "s1", type: "proactive", durationSecs: 120 },
    { ts: 3, sessionId: "s2", type: "reactive" },
  ];

  it("汇总总数、涉及会话数、主动暂停次数与时长", () => {
    const out = distractionOverview(dists, { s1: 1800, s2: 1800 });
    expect(out.total).toBe(3);
    expect(out.sessionCount).toBe(2);
    expect(out.proactiveCount).toBe(1);
    expect(out.proactiveSecs).toBe(120);
    expect(out.avgPerSession).toBeCloseTo(1.5);
  });

  it("分心率 = 总次数 /（有分心记录的会话总时长小时数）", () => {
    // 1800 + 1800 = 1 小时，3 次分心 → 3 次/h
    expect(distractionOverview(dists, { s1: 1800, s2: 1800 }).ratePerHour).toBeCloseTo(3);
  });

  it("没有可用时长时分心率为 null", () => {
    expect(distractionOverview(dists, {}).ratePerHour).toBeNull();
  });

  it("切去别的软件（type: app）单独成一组，不混进主动暂停", () => {
    const out = distractionOverview(
      [
        ...dists,
        { ts: 4, sessionId: "s2", type: "app", durationSecs: 240 },
        { ts: 5, sessionId: "s2", type: "app", durationSecs: 60 },
      ],
      { s1: 1800, s2: 1800 },
    );
    expect(out.appCount).toBe(2);
    expect(out.appSecs).toBe(300);
    expect(out.proactiveCount).toBe(1);
    expect(out.total).toBe(5);
  });

  it("空记录时各项归零", () => {
    const out = distractionOverview([], {});
    expect(out).toMatchObject({ total: 0, sessionCount: 0, avgPerSession: 0, ratePerHour: null });
  });
});

describe("distractionTagRanking", () => {
  it("按次数降序，未标注的并成一条", () => {
    const out = distractionTagRanking([
      { tag: "手机" },
      { tag: "走神" },
      { tag: "手机" },
      { tag: null },
      {},
    ]);
    expect(out).toEqual([
      { tag: "手机", count: 2 },
      { tag: UNTAGGED, count: 2 },
      { tag: "走神", count: 1 },
    ]);
  });

  it("次数持平时「未标注」排在有标签的后面", () => {
    const out = distractionTagRanking([{ tag: null }, { tag: "手机" }]);
    expect(out[0].tag).toBe("手机");
    expect(out[1].tag).toBe(UNTAGGED);
  });

  it("空列表返回空数组", () => {
    expect(distractionTagRanking([])).toEqual([]);
  });
});

describe("distractionDailyTrend", () => {
  const now = new Date(2026, 7, 4, 15, 0, 0).getTime(); // 2026-08-04 15:00
  const dayMs = 24 * 3600 * 1000;

  it("返回 N 天的槽位，按日期升序，末位是今天", () => {
    const out = distractionDailyTrend([], 7, now);
    expect(out).toHaveLength(7);
    expect(out[6].label).toBe("8/4");
    expect(out[0].label).toBe("7/29");
  });

  it("按自然日归并计数，超出窗口的记录不计入", () => {
    const out = distractionDailyTrend(
      [
        { ts: now },
        { ts: now - 3600 * 1000 }, // 同一天
        { ts: now - dayMs }, // 昨天
        { ts: now - 30 * dayMs }, // 窗口外
      ],
      7,
      now,
    );
    expect(out[6].count).toBe(2);
    expect(out[5].count).toBe(1);
    expect(out.reduce((s, d) => s + d.count, 0)).toBe(3);
  });
});
