import { describe, it, expect } from "vitest";
import {
  IP_PER_TASK,
  IP_PER_ACTIVE_DAY,
  IP_PER_SCENARIO,
  INDUSTRY_TIERS,
  tierForPoints,
  computeIndustry,
} from "@/pages/Industry/industryData";

const DAY = 86400000;
// 造一条专注记录（会话去重按 sessionId 取 max，测「今日产出」时用不同 sessionId）。
const rec = (startedAt, durationSecs, sessionId) => ({
  id: `r-${sessionId}`,
  sessionId: `s-${sessionId}`,
  taskId: `t-${sessionId}`,
  startedAt,
  durationSecs,
});

describe("tierForPoints", () => {
  it("0 点 → 前哨（首档），进度从 0 起算", () => {
    const t = tierForPoints(0);
    expect(t.key).toBe("outpost");
    expect(t.index).toBe(0);
    expect(t.progress).toBe(0);
    expect(t.next.key).toBe("worksite");
  });

  it("跨过门槛即进下一档（299 仍前哨，300 进作业区）", () => {
    expect(tierForPoints(299).key).toBe("outpost");
    expect(tierForPoints(300).key).toBe("worksite");
  });

  it("档内进度按 [min, next.min) 线性归一", () => {
    // worksite[300] → line[1200]，750 恰好走一半
    expect(tierForPoints(750).progress).toBeCloseTo((750 - 300) / (1200 - 300), 5);
  });

  it("满级档：next 为 null，进度恒为 1", () => {
    const top = INDUSTRY_TIERS[INDUSTRY_TIERS.length - 1];
    const t = tierForPoints(top.min + 999999);
    expect(t.key).toBe(top.key);
    expect(t.next).toBeNull();
    expect(t.progress).toBe(1);
  });
});

describe("computeIndustry", () => {
  const metrics = {
    totalSecs: 15000, // 250 分钟
    cleanSessionSecs: 9000, // 150 分钟
    completedTasks: 6,
    focusDays: 4,
    distinctScenarios: 2,
  };

  it("五条产线各自按单价折算工业点数", () => {
    const { lines } = computeIndustry({ metrics, records: [], now: 0 });
    const byKey = Object.fromEntries(lines.map((l) => [l.key, l.ip]));
    expect(byKey.extract).toBe(250); // floor(15000/60)*1
    expect(byKey.refine).toBe(150); // floor(9000/60)*1
    expect(byKey.assembly).toBe(6 * IP_PER_TASK);
    expect(byKey.power).toBe(4 * IP_PER_ACTIVE_DAY);
    expect(byKey.logistics).toBe(2 * IP_PER_SCENARIO);
  });

  it("总产能 = 各产线之和，并据此定档", () => {
    const ind = computeIndustry({ metrics, records: [], now: 0 });
    expect(ind.total).toBe(250 + 150 + 30 + 32 + 24); // 486
    expect(ind.tier.key).toBe("worksite");
  });

  it("share 相对最强产线归一（最强线 share=1）", () => {
    const { lines } = computeIndustry({ metrics, records: [], now: 0 });
    const extract = lines.find((l) => l.key === "extract");
    expect(extract.share).toBe(1); // extract=250 为最大
  });

  it("今日产出只计当天记录（按会话去重）；日均 = 总/专注天数", () => {
    const now = 3 * DAY + 5000;
    const records = [
      rec(now, 1500, "a"), // 今天
      rec(now, 3000, "b"), // 今天，另一会话
      rec(now - 2 * DAY, 9999, "c"), // 非今天，不计入今日
    ];
    const ind = computeIndustry({ metrics, records, now });
    expect(ind.throughput.today).toBe(Math.floor((1500 + 3000) / 60)); // 75
    expect(ind.throughput.perDay).toBe(Math.round(486 / 4)); // 122
  });

  it("空数据：总为 0、停在前哨、各产线与节流均为 0", () => {
    const empty = { totalSecs: 0, cleanSessionSecs: 0, completedTasks: 0, focusDays: 0, distinctScenarios: 0 };
    const ind = computeIndustry({ metrics: empty, records: [], now: 0 });
    expect(ind.total).toBe(0);
    expect(ind.tier.key).toBe("outpost");
    expect(ind.throughput).toEqual({ today: 0, perDay: 0 });
    expect(ind.lines.every((l) => l.ip === 0)).toBe(true);
  });
});
