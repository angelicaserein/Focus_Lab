import { describe, it, expect, afterEach, vi } from "vitest";
import {
  todayDateStr,
  buildEmptyRecord,
  computeAutoData,
} from "@/utils/records/researchRecords";

// 这份数据是要进论文的，「哪些记录算今天」必须钉死在英国时间（Europe/London）而非
// 本机时区，否则参与者在别的时区填表、或英国自己在 3 月/10 月切夏令时那两天，
// 当日汇总会整体错一格。下面几个用例全部围绕这条边界。
//
// 冬令时 GMT+0：2026-01-15 的当地 00:00 == 该日 00:00 UTC
const WINTER_MIDNIGHT = Date.UTC(2026, 0, 15, 0, 0, 0);
// 夏令时 BST+1：2026-07-15 的当地 00:00 == 前一日 23:00 UTC
const SUMMER_MIDNIGHT = Date.UTC(2026, 6, 14, 23, 0, 0);

const rec = (over = {}) => ({
  taskId: "t1",
  durationSecs: 600,
  startedAt: WINTER_MIDNIGHT + 3600000,
  outcome: "completed",
  ...over,
});

const dist = (ts) => ({ id: "d1", ts, type: "internal" });

afterEach(() => {
  vi.useRealTimers();
});

describe("todayDateStr", () => {
  it("给出 YYYY-MM-DD", () => {
    expect(todayDateStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("按英国时间划日，不跟本机时区走", () => {
    // 2026-07-15 01:30 UTC = 伦敦 02:30（BST），仍是 15 号
    vi.setSystemTime(new Date(Date.UTC(2026, 6, 15, 1, 30)));
    expect(todayDateStr()).toBe("2026-07-15");

    // 2026-07-14 23:30 UTC = 伦敦 00:30（BST），已经是 15 号了
    vi.setSystemTime(new Date(Date.UTC(2026, 6, 14, 23, 30)));
    expect(todayDateStr()).toBe("2026-07-15");
  });
});

describe("buildEmptyRecord", () => {
  it("每条都有独立 id", () => {
    expect(buildEmptyRecord("2026-01-15").id).not.toBe(
      buildEmptyRecord("2026-01-15").id,
    );
  });

  it("量表初值是 null（「没填」），不是 0（「填了个 0 分」）", () => {
    const r = buildEmptyRecord("2026-01-15");
    expect(r.scales).toEqual({
      focusLevel: null,
      startDifficulty: null,
      moodState: null,
    });
    expect(r.savedAt).toBeNull();
  });

  it("自动统计初值为 0，回顾/体验为空串（直接喂给受控输入框）", () => {
    const r = buildEmptyRecord("2026-01-15");
    expect(r.date).toBe("2026-01-15");
    expect(r.autoData).toEqual({
      maxFocusDurationSecs: 0,
      totalFocusDurationSecs: 0,
      realtimeDistractionCount: 0,
      taskCompletedCount: 0,
    });
    expect(r.retrospective).toEqual({ distractionCount: "", procrastinationMins: "" });
    expect(r.experience).toBe("");
  });
});

describe("computeAutoData", () => {
  it("最长/总时长/分心数/完成数四项一起算出来", () => {
    const auto = computeAutoData(
      [
        rec({ durationSecs: 600, outcome: "completed" }),
        rec({ durationSecs: 1500, outcome: "ended" }),
        rec({ durationSecs: 300, outcome: "completed" }),
      ],
      [dist(WINTER_MIDNIGHT + 100), dist(WINTER_MIDNIGHT + 200)],
      "2026-01-15",
    );
    expect(auto).toEqual({
      maxFocusDurationSecs: 1500,
      totalFocusDurationSecs: 2400,
      realtimeDistractionCount: 2,
      taskCompletedCount: 2,
    });
  });

  it("当天没记录时四项全 0（Math.max 不会退化成 -Infinity）", () => {
    expect(computeAutoData([], [], "2026-01-15")).toEqual({
      maxFocusDurationSecs: 0,
      totalFocusDurationSecs: 0,
      realtimeDistractionCount: 0,
      taskCompletedCount: 0,
    });
  });

  it("冬令时（GMT+0）：当地 00:00 算进来，前一毫秒算不进来", () => {
    const inDay = computeAutoData([rec({ startedAt: WINTER_MIDNIGHT })], [], "2026-01-15");
    expect(inDay.totalFocusDurationSecs).toBe(600);

    const before = computeAutoData(
      [rec({ startedAt: WINTER_MIDNIGHT - 1 })],
      [],
      "2026-01-15",
    );
    expect(before.totalFocusDurationSecs).toBe(0);
  });

  it("冬令时：次日 00:00 整属于第二天，不算进来", () => {
    const auto = computeAutoData(
      [rec({ startedAt: WINTER_MIDNIGHT + 86400000 })],
      [],
      "2026-01-15",
    );
    expect(auto.totalFocusDurationSecs).toBe(0);
  });

  it("夏令时（BST+1）：日界比 UTC 早一小时，23:00 UTC 那条属于第二天", () => {
    // 2026-07-14 23:00 UTC 已经是伦敦 15 号 00:00
    const auto = computeAutoData([rec({ startedAt: SUMMER_MIDNIGHT })], [], "2026-07-15");
    expect(auto.totalFocusDurationSecs).toBe(600);

    // 早一毫秒还在 14 号
    const before = computeAutoData(
      [rec({ startedAt: SUMMER_MIDNIGHT - 1 })],
      [],
      "2026-07-15",
    );
    expect(before.totalFocusDurationSecs).toBe(0);
  });

  it("夏令时的日界确实和冬令时不同（偏移是探测出来的，不是写死 0）", () => {
    // 若把伦敦当成常年 GMT+0，这条 22:30 UTC 的记录会被算进 15 号；
    // 实际伦敦此刻是 23:30 BST，仍属 14 号。
    const auto = computeAutoData(
      [rec({ startedAt: Date.UTC(2026, 6, 14, 22, 30) })],
      [],
      "2026-07-15",
    );
    expect(auto.totalFocusDurationSecs).toBe(0);
  });

  it("分心与专注各按各的时间戳字段筛（d.ts / r.startedAt）", () => {
    const auto = computeAutoData(
      [rec({ startedAt: WINTER_MIDNIGHT + 3600000 })],
      [dist(WINTER_MIDNIGHT - 1), dist(WINTER_MIDNIGHT), dist(WINTER_MIDNIGHT + 86400000)],
      "2026-01-15",
    );
    expect(auto.realtimeDistractionCount).toBe(1);
  });

  it("只有 completed 记完成数，ended / removed 不算", () => {
    const auto = computeAutoData(
      [
        rec({ outcome: "completed" }),
        rec({ outcome: "ended" }),
        rec({ outcome: "removed" }),
      ],
      [],
      "2026-01-15",
    );
    expect(auto.taskCompletedCount).toBe(1);
  });
});
