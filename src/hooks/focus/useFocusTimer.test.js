import { describe, it, expect } from "vitest";
import { calcSeconds, clampPauseAt } from "@/hooks/focus/useFocusTimer";

describe("calcSeconds", () => {
  it("暂停态（runStart 为 null）直接返回累计秒数", () => {
    expect(calcSeconds(42, null, 9_999_999)).toBe(42);
  });

  it("运行态按 (now - runStart) 累加到 accSecs", () => {
    // 已累计 10s，本段从 t=1000ms 起跑到 now=4000ms（3s）
    expect(calcSeconds(10, 1000, 4000)).toBe(13);
  });

  it("跨秒按向下取整（避免抖动）", () => {
    // 本段跑了 2900ms → 向下取整为 2s
    expect(calcSeconds(0, 1000, 3900)).toBe(2);
  });

  it("accSecs 为 0 且刚开始（now == runStart）返回 0", () => {
    expect(calcSeconds(0, 5000, 5000)).toBe(0);
  });
});

describe("clampPauseAt", () => {
  it("没给补记时刻就是「现在」", () => {
    expect(clampPauseAt(undefined, 1000, 9000)).toBe(9000);
  });

  it("事件对象之类的非数字一律当没给（togglePause 也直接当事件回调用）", () => {
    expect(clampPauseAt({ type: "click" }, 1000, 9000)).toBe(9000);
    expect(clampPauseAt(NaN, 1000, 9000)).toBe(9000);
  });

  it("给了就按给的那一刻暂停", () => {
    // 睡了一夜才被处理：暂停要补记在睡着的 3000，而不是醒来的 9000
    expect(clampPauseAt(3000, 1000, 9000)).toBe(3000);
  });

  it("早于本段起点的夹到起点（否则秒数会倒退）", () => {
    expect(clampPauseAt(500, 1000, 9000)).toBe(1000);
  });

  it("晚于现在的夹到现在（否则秒数凭空暴涨）", () => {
    expect(clampPauseAt(99_999, 1000, 9000)).toBe(9000);
  });
});
