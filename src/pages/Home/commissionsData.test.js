import { describe, it, expect } from "vitest";
import {
  COMMISSIONS,
  todayStats,
  pickDailyCommissions,
} from "./commissionsData";

// 固定一个「今天中午」的时间戳，方便造今天/昨天的记录。
const NOON = new Date(2026, 6, 6, 12, 0, 0).getTime();
const HOUR = 3600 * 1000;
const rec = (o) => ({ id: o.id ?? Math.random().toString(36), startedAt: NOON, durationSecs: 600, distractionCount: 0, ...o });

describe("todayStats（只吃今天的记录）", () => {
  it("昨天的记录不计入今天", () => {
    const s = todayStats([rec({ startedAt: NOON - 24 * HOUR, sessionId: "y" })], NOON);
    expect(s.sessions).toBe(0);
  });

  it("同一会话多条记录按 max 去重，不叠加秒数", () => {
    const s = todayStats(
      [rec({ sessionId: "a", durationSecs: 600 }), rec({ sessionId: "a", durationSecs: 1800 })],
      NOON,
    );
    expect(s.sessions).toBe(1);
    expect(s.longestSecs).toBe(1800);
    expect(s.totalSecs).toBe(1800);
  });

  it("分心数 >0 的会话不算 clean；带 scenarioId 的算探索会话", () => {
    const s = todayStats(
      [
        rec({ sessionId: "a", distractionCount: 2, scenarioId: "sc1" }),
        rec({ sessionId: "b", distractionCount: 0 }),
      ],
      NOON,
    );
    expect(s.sessions).toBe(2);
    expect(s.cleanSessions).toBe(1);
    expect(s.scenarioSessions).toBe(1);
  });
});

describe("pickDailyCommissions（当天确定、跨天变化）", () => {
  it("同一天多次调用结果一致（不会刷新时乱跳）", () => {
    const a = pickDailyCommissions(NOON).map((c) => c.id);
    const b = pickDailyCommissions(NOON + 5 * HOUR).map((c) => c.id); // 同一天不同时刻
    expect(a).toEqual(b);
  });

  it("默认取 3 条、都来自委托池、无重复", () => {
    const picked = pickDailyCommissions(NOON);
    expect(picked).toHaveLength(3);
    const ids = picked.map((c) => c.id);
    expect(new Set(ids).size).toBe(3);
    const poolIds = new Set(COMMISSIONS.map((c) => c.id));
    ids.forEach((id) => expect(poolIds.has(id)).toBe(true));
  });

  it("不同日期会给出不同的组合（至少某天不同）", () => {
    const day1 = pickDailyCommissions(NOON).map((c) => c.id).join();
    const day2 = pickDailyCommissions(NOON + 24 * HOUR).map((c) => c.id).join();
    const day3 = pickDailyCommissions(NOON + 3 * 24 * HOUR).map((c) => c.id).join();
    expect(new Set([day1, day2, day3]).size).toBeGreaterThan(1);
  });
});
