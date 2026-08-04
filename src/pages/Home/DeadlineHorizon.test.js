import { describe, it, expect } from "vitest";
import { layoutCards, GAP } from "./DeadlineHorizon.jsx";

// 造一批横轴位置故意撞在一起的卡片（同一天数 → 同一列）
function makeItems(n, { w = 120, h = 40, fx = 0.3, scale = 1 } = {}) {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    days: i,
    fx,
    scale,
    card: { w, h },
  }));
}

function overlaps(items) {
  const pairs = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      const aw = a.card.w * a.scale;
      const ah = a.card.h * a.scale;
      const bw = b.card.w * b.scale;
      const bh = b.card.h * b.scale;
      if (
        Math.abs(a.x - b.x) < (aw + bw) / 2 &&
        Math.abs(a.y - b.y) < (ah + bh) / 2
      ) {
        pairs.push([i, j]);
      }
    }
  }
  return pairs;
}

describe("layoutCards", () => {
  it("同一列的卡片沿纵向摊开，互不重叠", () => {
    const items = layoutCards(makeItems(6), 900, 340);
    expect(overlaps(items)).toEqual([]);
  });

  it("最近的那张（第一个）落在中线上的本位", () => {
    const items = layoutCards(makeItems(6), 900, 340);
    expect(items[0].x).toBeCloseTo(0.3 * 900);
    expect(items[0].y).toBeCloseTo(0.5 * 340);
  });

  it("一列放得下时，横坐标锁死在时间轴上不漂移", () => {
    const items = layoutCards(makeItems(5, { h: 30 }), 900, 340);
    for (const it of items) expect(it.x).toBeCloseTo(0.3 * 900);
  });

  it("卡片整体留在画面内", () => {
    const items = layoutCards(makeItems(10, { fx: 0.02 }), 600, 300);
    for (const it of items) {
      expect(it.x - it.card.w / 2).toBeGreaterThanOrEqual(0);
      expect(it.x + it.card.w / 2).toBeLessThanOrEqual(600);
      expect(it.y - it.card.h / 2).toBeGreaterThanOrEqual(0);
      expect(it.y + it.card.h / 2).toBeLessThanOrEqual(300);
    }
  });

  it("摊开时相互之间还留着 GAP 的呼吸间隙", () => {
    const items = layoutCards(makeItems(4), 900, 340);
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        const apartX = Math.abs(a.x - b.x) >= (a.card.w + b.card.w) / 2 + GAP;
        const apartY = Math.abs(a.y - b.y) >= (a.card.h + b.card.h) / 2 + GAP;
        expect(apartX || apartY).toBe(true);
      }
    }
  });

  it("不同深度的卡片（各自缩放）也不重叠，且横向保持近左远右", () => {
    const items = Array.from({ length: 12 }, (_, i) => {
      const t = i / 11;
      return {
        id: i,
        days: i,
        fx: 0.1 + t * 0.8,
        scale: 1 - t * 0.42,
        card: { w: 132, h: 40 },
      };
    });
    layoutCards(items, 900, 340);
    expect(overlaps(items)).toEqual([]);
    for (let i = 1; i < items.length; i++) {
      expect(items[i].x).toBeGreaterThan(items[i - 1].x);
    }
  });
});
