import { describe, it, expect } from "vitest";
import {
  clamp,
  scaleFor,
  isPlaced,
  GUTTER,
  snapOutOfGutter,
  relaxOverlaps,
  PLANE_X_MIN,
  PLANE_X_MAX,
} from "@/utils/task/matrixGeometry";

describe("clamp", () => {
  it("区间内原样返回", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("越界夹到边界", () => {
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });

  it("边界值本身不被改动", () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe("scaleFor", () => {
  it("左上角（重要且紧急）最大", () => {
    expect(scaleFor(0, 0)).toBeCloseTo(1.5, 5);
  });

  it("右下角（不重要不紧急）最小", () => {
    expect(scaleFor(1, 1)).toBeCloseTo(0.72, 5);
  });

  it("正中心取中间值", () => {
    expect(scaleFor(0.5, 0.5)).toBeCloseTo(1.11, 5);
  });

  it("x、y 权重对称：对调不改变结果", () => {
    expect(scaleFor(0.2, 0.8)).toBeCloseTo(scaleFor(0.8, 0.2), 5);
  });

  it("越靠左上越大（单调）", () => {
    expect(scaleFor(0.1, 0.1)).toBeGreaterThan(scaleFor(0.4, 0.4));
    expect(scaleFor(0.4, 0.4)).toBeGreaterThan(scaleFor(0.9, 0.9));
  });
});

describe("isPlaced", () => {
  it("没有 matrixPos 视为未落位", () => {
    expect(isPlaced({})).toBe(false);
    expect(isPlaced({ matrixPos: null })).toBe(false);
  });

  it("x、y 都是数字才算落位", () => {
    expect(isPlaced({ matrixPos: { x: 0.3, y: 0.4 } })).toBe(true);
  });

  it("坐标缺失或非数字不算落位", () => {
    expect(isPlaced({ matrixPos: { x: 0.3 } })).toBe(false);
    expect(isPlaced({ matrixPos: { x: "0.3", y: "0.4" } })).toBe(false);
  });

  it("坐标为 0 仍算落位（不被当成假值漏掉）", () => {
    expect(isPlaced({ matrixPos: { x: 0, y: 0 } })).toBe(true);
  });
});

describe("snapOutOfGutter", () => {
  it("死区外的落点原样保留", () => {
    expect(snapOutOfGutter({ x: 0.2, y: 0.9 })).toEqual({ x: 0.2, y: 0.9 });
  });

  it("死区内向较近的一侧推出", () => {
    // 0.48 在中线左侧带内 → 推到 0.5-GUTTER；0.52 在右侧带内 → 推到 0.5+GUTTER
    expect(snapOutOfGutter({ x: 0.48, y: 0.52 })).toEqual({
      x: 0.5 - GUTTER,
      y: 0.5 + GUTTER,
    });
  });

  it("正好落在中线上归到左/上侧，不悬在线上", () => {
    expect(snapOutOfGutter({ x: 0.5, y: 0.5 })).toEqual({
      x: 0.5 - GUTTER,
      y: 0.5 - GUTTER,
    });
  });

  it("死区边界本身不被推动", () => {
    const edge = snapOutOfGutter({ x: 0.5 - GUTTER, y: 0.5 + GUTTER });
    expect(edge.x).toBeCloseTo(0.5 - GUTTER, 5);
    expect(edge.y).toBeCloseTo(0.5 + GUTTER, 5);
  });

  it("推出后的落点必然在死区之外", () => {
    for (const v of [0.46, 0.48, 0.5, 0.52, 0.54]) {
      const { x } = snapOutOfGutter({ x: v, y: v });
      expect(Math.abs(x - 0.5)).toBeGreaterThanOrEqual(GUTTER - 1e-9);
    }
  });
});

describe("relaxOverlaps", () => {
  const box = (cx, cy) => ({ cx, cy, halfW: 10, halfH: 5 });

  it("互不重叠时不动，返回 false", () => {
    const items = [box(20, 20), box(200, 200)];
    const before = structuredClone(items);
    expect(relaxOverlaps(items, 400, 400)).toBe(false);
    expect(items).toEqual(before);
  });

  it("完全重叠的两张卡会被推开，返回 true", () => {
    const items = [box(100, 100), box(105, 100)];
    expect(relaxOverlaps(items, 400, 400)).toBe(true);
    const gapX = Math.abs(items[0].cx - items[1].cx);
    const gapY = Math.abs(items[0].cy - items[1].cy);
    const minX = 20 + 8; // halfW*2 + gap
    const minY = 10 + 8;
    expect(gapX >= minX - 1e-6 || gapY >= minY - 1e-6).toBe(true);
  });

  it("沿穿透较浅的轴推开：X 向仅微叠时只动 X 不动 Y", () => {
    // 两卡 cx 相差 19 → X 向穿透 9；cy 相同 → Y 向穿透 18。取浅的那根，走 X 轴。
    const items = [box(100, 100), box(119, 100)];
    relaxOverlaps(items, 400, 400);
    expect(items[0].cy).toBe(100);
    expect(items[1].cy).toBe(100);
    expect(Math.abs(items[0].cx - items[1].cx)).toBeGreaterThan(19);
  });

  it("推开后仍被夹在平面内，不溢出边界", () => {
    const items = [box(10, 10), box(12, 10), box(14, 10)];
    relaxOverlaps(items, 200, 100);
    for (const it of items) {
      expect(it.cx).toBeGreaterThanOrEqual(it.halfW - 1e-6);
      expect(it.cx).toBeLessThanOrEqual(200 - it.halfW + 1e-6);
      expect(it.cy).toBeGreaterThanOrEqual(it.halfH - 1e-6);
      expect(it.cy).toBeLessThanOrEqual(100 - it.halfH + 1e-6);
    }
  });

  it("单张卡片没有对手，直接返回 false", () => {
    expect(relaxOverlaps([box(50, 50)], 400, 400)).toBe(false);
  });

  it("空列表安全返回 false", () => {
    expect(relaxOverlaps([], 400, 400)).toBe(false);
  });

  it("gap 越大推得越开", () => {
    // 两卡 cy 相同、cx 仅差 5：Y 向穿透(10) 比 X 向(15) 浅，故沿 Y 轴推开——
    // 要看 gap 的效果就得量 Y 间距，量 cx 只会看到它原地不动。
    const near = [box(100, 100), box(105, 100)];
    const far = [box(100, 100), box(105, 100)];
    relaxOverlaps(near, 400, 400, 0);
    relaxOverlaps(far, 400, 400, 40);
    expect(Math.abs(far[0].cy - far[1].cy)).toBeGreaterThan(Math.abs(near[0].cy - near[1].cy));
  });
});

describe("平面安全边距常量", () => {
  it("X 边距对称且留在 0..1 内", () => {
    expect(PLANE_X_MIN).toBeGreaterThan(0);
    expect(PLANE_X_MAX).toBeLessThan(1);
    expect(PLANE_X_MIN + PLANE_X_MAX).toBeCloseTo(1, 5);
  });
});
