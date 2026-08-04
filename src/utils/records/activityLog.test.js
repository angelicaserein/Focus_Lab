import { describe, it, expect } from "vitest";
import { pruneActivities, clusterActivities, countByType, CLUSTER_MS } from "./activityLog";

const act = (type, ts, text = "任务") => ({ id: `${type}-${ts}`, type, ts, text });

describe("pruneActivities", () => {
  const now = new Date(2026, 6, 1, 12).getTime();
  const daysAgo = (d) => now - d * 86400000;

  it("掐掉 90 天以前的记录", () => {
    const kept = pruneActivities(
      [act("add", daysAgo(120)), act("add", daysAgo(89)), act("add", now)],
      now,
    );
    expect(kept.map((a) => a.ts)).toEqual([daysAgo(89), now]);
  });

  it("超过上限时只留最近的", () => {
    const many = Array.from({ length: 900 }, (_, i) => act("add", now - (900 - i) * 1000));
    const kept = pruneActivities(many, now);
    expect(kept).toHaveLength(800);
    expect(kept[kept.length - 1].ts).toBe(many[899].ts); // 末尾（最新）保留
  });
});

describe("clusterActivities", () => {
  const t0 = new Date(2026, 6, 1, 9).getTime();

  it("同类且间隔不超过阈值的合并成一条，count 累加", () => {
    const out = clusterActivities([
      act("add", t0, "A"),
      act("add", t0 + CLUSTER_MS, "B"),
      act("add", t0 + CLUSTER_MS * 3, "C"),
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].count).toBe(2);
    expect(out[0].texts).toEqual(["A", "B"]);
    expect(out[1].count).toBe(1);
  });

  it("类型不同不合并，且输出按时间升序", () => {
    const out = clusterActivities([
      act("complete", t0 + 60000, "B"),
      act("add", t0, "A"),
    ]);
    expect(out.map((c) => c.type)).toEqual(["add", "complete"]);
  });

  it("聚类窗口从最后一条算起，长串连续动作归为一条", () => {
    const out = clusterActivities(
      Array.from({ length: 5 }, (_, i) => act("add", t0 + i * CLUSTER_MS, `T${i}`)),
    );
    expect(out).toHaveLength(1);
    expect(out[0].count).toBe(5);
  });
});

describe("countByType", () => {
  it("按动作类型计数", () => {
    expect(countByType([act("add", 1), act("add", 2), act("delete", 3)]))
      .toEqual({ add: 2, delete: 1 });
  });
});
