import { describe, it, expect } from "vitest";
import {
  hourlyFocusData,
  timeBlockStats,
  sessionDurationBuckets,
  taskDifficultyRanking,
  distractionByHour,
  TIME_BLOCKS,
  DURATION_BUCKETS,
} from "@/utils/analytics/analyticsUtils";

// 用本地时间构造 startedAt，getHours() 才能拿到确定的小时，避免时区抖动。
const at = (hour, over = {}) => ({
  startedAt: new Date(2026, 0, 1, hour, 0, 0).getTime(),
  sessionId: "s",
  id: "i",
  durationSecs: 0,
  outcome: "ended",
  taskText: "t",
  ...over,
});

describe("hourlyFocusData", () => {
  it("同会话同小时按 max 去重时长，但 totalCount 记全部条目", () => {
    const rows = hourlyFocusData([
      at(9, { sessionId: "s1", durationSecs: 40, outcome: "completed" }),
      at(9, { sessionId: "s1", durationSecs: 30, outcome: "ended" }),
    ]);
    const nine = rows[9];
    expect(nine.sessionCount).toBe(1); // 同一会话只算一次
    expect(nine.totalSecs).toBe(40); // 取 max，不是 40+30
    expect(nine.totalCount).toBe(2);
    expect(nine.completedCount).toBe(1);
    expect(nine.completionRate).toBe(0.5);
  });

  it("同小时不同会话各自计入，时长相加", () => {
    const nine = hourlyFocusData([
      at(9, { sessionId: "s1", durationSecs: 40 }),
      at(9, { sessionId: "s2", durationSecs: 20 }),
    ])[9];
    expect(nine.sessionCount).toBe(2);
    expect(nine.totalSecs).toBe(60);
  });

  it("返回定长 24 槽，无数据的小时 completionRate 为 0", () => {
    const rows = hourlyFocusData([]);
    expect(rows).toHaveLength(24);
    expect(rows[3]).toMatchObject({ hour: 3, sessionCount: 0, totalSecs: 0, completionRate: 0 });
  });

  it("旧记录无 sessionId 时退化用记录自身 id 作会话键", () => {
    const nine = hourlyFocusData([
      at(9, { sessionId: undefined, id: "a", durationSecs: 10 }),
      at(9, { sessionId: undefined, id: "b", durationSecs: 15 }),
    ])[9];
    expect(nine.sessionCount).toBe(2);
    expect(nine.totalSecs).toBe(25);
  });
});

describe("timeBlockStats", () => {
  // 构造 24 长度的 hourlyData，只在指定小时填值。
  const blank = () =>
    Array.from({ length: 24 }, (_, hour) => ({
      hour,
      sessionCount: 0,
      totalSecs: 0,
      completedCount: 0,
      totalCount: 0,
      completionRate: 0,
    }));

  it("只保留有会话的时间段，并按 totalSecs 降序", () => {
    const data = blank();
    Object.assign(data[9], { sessionCount: 1, totalSecs: 100, completedCount: 1, totalCount: 2 }); // 上午
    Object.assign(data[20], { sessionCount: 1, totalSecs: 300, completedCount: 0, totalCount: 1 }); // 晚上
    const out = timeBlockStats(data);
    expect(out.map((b) => b.label)).toEqual(["晚上", "上午"]);
    expect(out[0].totalSecs).toBe(300);
  });

  it("sessions 为 0 的时间段被过滤掉", () => {
    const out = timeBlockStats(blank());
    expect(out).toEqual([]);
  });

  it("completionRate 按段内完成/总任务聚合", () => {
    // 早晨 range [6,9) → 小时 6,7,8
    const data = blank();
    Object.assign(data[7], { sessionCount: 1, totalSecs: 60, completedCount: 3, totalCount: 4 });
    const morning = timeBlockStats(data).find((b) => b.label === "早晨");
    expect(morning.completionRate).toBe(0.75);
  });
});

describe("sessionDurationBuckets", () => {
  const rec = (sessionId, durationSecs) => ({ sessionId, id: sessionId, durationSecs });

  it("按会话墙钟时长落桶，边界取左闭右开", () => {
    const out = sessionDurationBuckets([
      rec("a", 899), // < 15分钟
      rec("b", 900), // 15–30分（下界包含）
      rec("c", 1800), // 30–60分
      rec("d", 7200), // > 2小时（上界 Infinity）
    ]);
    const byLabel = Object.fromEntries(out.map((b) => [b.label, b.count]));
    expect(byLabel["< 15分钟"]).toBe(1);
    expect(byLabel["15–30分"]).toBe(1);
    expect(byLabel["30–60分"]).toBe(1);
    expect(byLabel["> 2小时"]).toBe(1);
  });

  it("同会话多条记录按 max 去重后再落桶", () => {
    const out = sessionDurationBuckets([rec("a", 1000), rec("a", 5000)]);
    // max=5000 → 1–2小时，那一桶计 1，其它为 0
    const oneToTwo = out.find((b) => b.label === "1–2小时");
    expect(oneToTwo.count).toBe(1);
    expect(out.reduce((s, b) => s + b.count, 0)).toBe(1);
  });
});

describe("taskDifficultyRanking", () => {
  const rec = (taskText, outcome) => ({ taskText, outcome });

  it("按未完成率降序，且过滤掉出现次数 < minN 的任务", () => {
    const out = taskDifficultyRanking(
      [
        rec("难", "ended"),
        rec("难", "ended"),
        rec("难", "completed"), // 难：3 次完成 1 → failRate 2/3
        rec("易", "completed"),
        rec("易", "completed"), // 易：2 次全完成 → failRate 0
        rec("偶尔", "ended"), // 只 1 次 → 被过滤
      ],
      2,
    );
    expect(out.map((t) => t.text)).toEqual(["难", "易"]);
    expect(out[0].failRate).toBeCloseTo(2 / 3);
    expect(out[1].failRate).toBe(0);
  });

  it("无 taskText 归为「(未命名)」", () => {
    const out = taskDifficultyRanking([rec(undefined, "ended"), rec(undefined, "ended")], 2);
    expect(out[0].text).toBe("(未命名)");
  });
});

describe("distractionByHour", () => {
  const at = (hour, tag) => ({ ts: new Date(2026, 0, 1, hour, 0, 0).getTime(), tag });

  it("按小时计数、汇总总数并取最高频标签", () => {
    const out = distractionByHour([
      at(10, "手机"),
      at(10, "手机"),
      at(14, "走神"),
    ]);
    expect(out.total).toBe(3);
    expect(out.topTag).toBe("手机");
    expect(out.hourly[10].count).toBe(2);
    expect(out.hourly[14].count).toBe(1);
    expect(out.hourly).toHaveLength(24);
  });

  it("无分心记录时 topTag 为 null、total 为 0", () => {
    const out = distractionByHour([]);
    expect(out.topTag).toBeNull();
    expect(out.total).toBe(0);
  });
});

describe("常量结构", () => {
  it("TIME_BLOCKS 覆盖全天 24 小时且不重叠", () => {
    const covered = new Array(24).fill(0);
    for (const { range } of TIME_BLOCKS) {
      for (let h = range[0]; h < range[1]; h++) covered[h]++;
    }
    expect(covered.every((c) => c === 1)).toBe(true);
  });

  it("DURATION_BUCKETS 首尾相接、最后一桶到 Infinity", () => {
    for (let i = 1; i < DURATION_BUCKETS.length; i++) {
      expect(DURATION_BUCKETS[i].min).toBe(DURATION_BUCKETS[i - 1].max);
    }
    expect(DURATION_BUCKETS.at(-1).max).toBe(Infinity);
  });
});
