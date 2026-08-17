import { describe, it, expect } from "vitest";
import { trayBitmap, iconKey, SIZE } from "./trayIcon.cjs";

// 位图是 BGRA，每像素 4 字节。取某个点的 alpha / 颜色来验几何。
const at = (bmp, x, y) => {
  const i = (y * SIZE + x) * 4;
  return { b: bmp.buffer[i], g: bmp.buffer[i + 1], r: bmp.buffer[i + 2], a: bmp.buffer[i + 3] };
};
const mid = SIZE / 2;
// 水面附近有抗锯齿的过渡带，验「有没有水」时避开圆心上下两像素
const nearBottom = SIZE - 6;
const nearTop = 6;

describe("trayBitmap", () => {
  it("尺寸是 32×32 的 BGRA（逻辑 16px × scaleFactor 2）", () => {
    const bmp = trayBitmap(0.5);
    expect(bmp.width).toBe(32);
    expect(bmp.height).toBe(32);
    expect(bmp.scaleFactor).toBe(2);
    expect(bmp.buffer).toHaveLength(32 * 32 * 4);
  });

  it("四个角在圆外，是透明的", () => {
    const bmp = trayBitmap(1);
    expect(at(bmp, 0, 0).a).toBe(0);
    expect(at(bmp, SIZE - 1, 0).a).toBe(0);
    expect(at(bmp, 0, SIZE - 1).a).toBe(0);
    expect(at(bmp, SIZE - 1, SIZE - 1).a).toBe(0);
  });

  it("空瓶：圆里没有水，但轮廓还在（托盘里不能什么都看不见）", () => {
    const bmp = trayBitmap(0);
    expect(at(bmp, mid, nearBottom).a).toBe(0); // 底部无水
    // 圆心在 (16,16)、半径 15，所以上缘的环落在 y≈1~4；y=0 已经在圆外了
    expect(at(bmp, mid, 2).a).toBeGreaterThan(0);
  });

  it("半满：下半有水、上半没有", () => {
    const bmp = trayBitmap(0.5);
    expect(at(bmp, mid, nearBottom).a).toBeGreaterThan(0);
    expect(at(bmp, mid, nearTop).a).toBe(0);
  });

  it("满瓶：上半也有水了", () => {
    const bmp = trayBitmap(1);
    expect(at(bmp, mid, nearTop).a).toBeGreaterThan(0);
  });

  it("越界的进度按 0/1 夹取，不越出圆", () => {
    expect(at(trayBitmap(-3), mid, nearBottom).a).toBe(0);
    expect(at(trayBitmap(9), mid, nearTop).a).toBeGreaterThan(0);
    expect(at(trayBitmap(NaN), mid, nearBottom).a).toBe(0);
  });

  it("暂停时水是灰的，跟在跑时不是同一个颜色", () => {
    const run = at(trayBitmap(0.6, true), mid, nearBottom);
    const stop = at(trayBitmap(0.6, false), mid, nearBottom);
    expect(run.a).toBeGreaterThan(0);
    expect(stop.a).toBeGreaterThan(0);
    expect([run.r, run.g, run.b]).not.toEqual([stop.r, stop.g, stop.b]);
  });
});

describe("iconKey", () => {
  it("差得太小的进度归成同一个 key（省掉每秒一次的重画）", () => {
    expect(iconKey(0.5, true)).toBe(iconKey(0.505, true));
  });

  it("跨了一档就是不同的 key", () => {
    expect(iconKey(0.5, true)).not.toBe(iconKey(0.56, true));
  });

  it("跑/停是不同的 key（进度一样也要换图）", () => {
    expect(iconKey(0.5, true)).not.toBe(iconKey(0.5, false));
  });

  it("越界的进度夹到两端，不会算出额外的档", () => {
    expect(iconKey(5, true)).toBe(iconKey(1, true));
    expect(iconKey(-5, true)).toBe(iconKey(0, true));
  });
});
