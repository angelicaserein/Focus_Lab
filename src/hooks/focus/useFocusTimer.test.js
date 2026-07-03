import { describe, it, expect } from "vitest";
import { calcSeconds } from "@/hooks/focus/useFocusTimer";

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
