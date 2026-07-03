import { describe, it, expect } from "vitest";
import { shouldFireFlaskFull } from "./useFlaskFullNotify";

const T = 25 * 60; // 目标：25 分钟 = 1500 秒

describe("shouldFireFlaskFull 烧瓶注满决策", () => {
  it("未到目标：不触发，并重新武装（fired 复位）", () => {
    expect(shouldFireFlaskFull({ seconds: T - 1, target: T, fired: true, active: true }))
      .toEqual({ fire: false, fired: false });
  });

  it("刚到达目标且激活：触发一次并标记 fired", () => {
    expect(shouldFireFlaskFull({ seconds: T, target: T, fired: false, active: true }))
      .toEqual({ fire: true, fired: true });
  });

  it("超过目标且激活：同样触发（处理跨秒一次跳过阈值的情况）", () => {
    expect(shouldFireFlaskFull({ seconds: T + 30, target: T, fired: false, active: true }))
      .toEqual({ fire: true, fired: true });
  });

  it("已触发过：到点后不再重复（暂停/恢复保持 fired 不重触发）", () => {
    expect(shouldFireFlaskFull({ seconds: T + 5, target: T, fired: true, active: true }))
      .toEqual({ fire: false, fired: true });
  });

  it("未激活（关闭通知或未运行）：到点也不触发，但保持 fired 不变", () => {
    expect(shouldFireFlaskFull({ seconds: T, target: T, fired: false, active: false }))
      .toEqual({ fire: false, fired: false });
  });

  it("目标无效（target<=0）：永不触发", () => {
    expect(shouldFireFlaskFull({ seconds: 100, target: 0, fired: false, active: true }))
      .toEqual({ fire: false, fired: false });
  });

  it("会话重启路径：先到点触发，再归零重新武装，可二次触发", () => {
    // 第一次到点
    const first = shouldFireFlaskFull({ seconds: T, target: T, fired: false, active: true });
    expect(first).toEqual({ fire: true, fired: true });
    // 新会话秒数归零 → 重新武装
    const rearmed = shouldFireFlaskFull({ seconds: 0, target: T, fired: first.fired, active: true });
    expect(rearmed).toEqual({ fire: false, fired: false });
    // 第二次到点可再次触发
    const second = shouldFireFlaskFull({ seconds: T, target: T, fired: rearmed.fired, active: true });
    expect(second).toEqual({ fire: true, fired: true });
  });
});
