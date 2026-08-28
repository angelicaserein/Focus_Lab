import { describe, it, expect } from "vitest";
import {
  clamp,
  scaleForPriority,
  dimForPriority,
  isPlaced,
  GUTTER,
  relaxOverlaps,
  layoutQuadrantGrid,
  minShrinkForPriority,
  monotonicShrink,
  MIN_CARD_SCALE,
  quadrantOfPos,
  quadrantBounds,
  confineToQuadrant,
  priorityByFlags,
  priorityCenter,
  PRIORITY_QUADRANTS,
  DIVIDER_X,
  DIVIDER_Y,
  PLANE_X_MIN,
  PLANE_X_MAX,
  PLANE_Y_MIN,
  PLANE_Y_MAX,
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

describe("scaleForPriority", () => {
  it("四档严格递减：重要且紧急 > 重要不紧急 > 紧急不重要 > 都不是", () => {
    expect(scaleForPriority("urgent_important")).toBeGreaterThan(scaleForPriority("important"));
    expect(scaleForPriority("important")).toBeGreaterThan(scaleForPriority("urgent"));
    expect(scaleForPriority("urgent")).toBeGreaterThan(scaleForPriority("trivial"));
  });

  it("最大档比最小档大出至少五成，肉眼能一眼分辨", () => {
    expect(scaleForPriority("urgent_important") / scaleForPriority("trivial")).toBeGreaterThan(1.5);
  });

  it("未知标签退回最小档（trivial）", () => {
    expect(scaleForPriority("nope")).toBeCloseTo(scaleForPriority("trivial"), 5);
  });
});

describe("dimForPriority", () => {
  it("越不重要越暗，重要且紧急满亮度", () => {
    expect(dimForPriority("urgent_important")).toBe(1);
    expect(dimForPriority("important")).toBeGreaterThan(dimForPriority("urgent"));
    expect(dimForPriority("urgent")).toBeGreaterThan(dimForPriority("trivial"));
  });

  it("最暗的一档仍然读得清（不低于 0.5）", () => {
    expect(dimForPriority("trivial")).toBeGreaterThanOrEqual(0.5);
  });

  it("未知标签退回最暗档（trivial）", () => {
    expect(dimForPriority("nope")).toBe(dimForPriority("trivial"));
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

describe("分界线偏置", () => {
  it("竖线右移、横线下移（左上象限最大）", () => {
    expect(DIVIDER_X).toBeGreaterThan(0.5);
    expect(DIVIDER_Y).toBeGreaterThan(0.5);
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

describe("优先级标签 ↔ 象限", () => {
  it("四方位映射到四个标签（左＝紧急、上＝重要）", () => {
    expect(priorityByFlags(true, true)).toBe("urgent_important"); // 左上
    expect(priorityByFlags(false, true)).toBe("important"); // 右上
    expect(priorityByFlags(true, false)).toBe("urgent"); // 左下
    expect(priorityByFlags(false, false)).toBe("trivial"); // 右下
  });

  it("落点按中线归象限", () => {
    expect(quadrantOfPos({ x: 0.2, y: 0.2 })).toBe("urgent_important");
    expect(quadrantOfPos({ x: 0.8, y: 0.2 })).toBe("important");
    expect(quadrantOfPos({ x: 0.2, y: 0.8 })).toBe("urgent");
    expect(quadrantOfPos({ x: 0.8, y: 0.8 })).toBe("trivial");
  });

  it("正落在分界线归右/下侧，刚过线归左/上侧", () => {
    // x = DIVIDER_X 时 x < DIVIDER_X 为假 → 右/下
    expect(quadrantOfPos({ x: DIVIDER_X, y: DIVIDER_Y })).toBe("trivial");
    expect(quadrantOfPos({ x: DIVIDER_X - 0.01, y: DIVIDER_Y - 0.01 })).toBe("urgent_important");
  });

  it("每个标签的中心点落在自己象限里", () => {
    for (const id of Object.keys(PRIORITY_QUADRANTS)) {
      expect(quadrantOfPos(priorityCenter(id))).toBe(id);
    }
  });

  it("象限范围贴分界线留 GUTTER、外沿留平面安全边距", () => {
    const tl = quadrantBounds("urgent_important");
    expect(tl.xMin).toBe(PLANE_X_MIN);
    expect(tl.xMax).toBe(DIVIDER_X - GUTTER);
    expect(tl.yMin).toBe(PLANE_Y_MIN);
    expect(tl.yMax).toBe(DIVIDER_Y - GUTTER);
    const br = quadrantBounds("trivial");
    expect(br.xMin).toBe(DIVIDER_X + GUTTER);
    expect(br.xMax).toBe(PLANE_X_MAX);
    expect(br.yMin).toBe(DIVIDER_Y + GUTTER);
    expect(br.yMax).toBe(PLANE_Y_MAX);
  });

  it("左上象限比右下象限大（分界线偏置的效果）", () => {
    const tl = quadrantBounds("urgent_important");
    const br = quadrantBounds("trivial");
    const area = (b) => (b.xMax - b.xMin) * (b.yMax - b.yMin);
    expect(area(tl)).toBeGreaterThan(area(br));
  });
});

describe("confineToQuadrant", () => {
  it("象限内的落点原样保留", () => {
    expect(confineToQuadrant({ x: 0.2, y: 0.3 }, "urgent_important")).toEqual({ x: 0.2, y: 0.3 });
  });

  it("越到别的象限会被夹回本象限（不跨分界线）", () => {
    // 标签是左上，但落点在右下 → 夹回左上象限的右下角
    const p = confineToQuadrant({ x: 0.9, y: 0.9 }, "urgent_important");
    expect(p.x).toBe(DIVIDER_X - GUTTER);
    expect(p.y).toBe(DIVIDER_Y - GUTTER);
    expect(quadrantOfPos(p)).toBe("urgent_important");
  });

  it("夹回后仍在死区之外", () => {
    const p = confineToQuadrant({ x: 0.5, y: 0.5 }, "important"); // 右上
    expect(p.x).toBeGreaterThanOrEqual(DIVIDER_X + GUTTER - 1e-9);
    expect(p.y).toBeLessThanOrEqual(DIVIDER_Y - GUTTER + 1e-9);
    expect(quadrantOfPos(p)).toBe("important");
  });
});

describe("relaxOverlaps 象限边界", () => {
  const box = (cx, cy, bounds) => ({ cx, cy, halfW: 10, halfH: 5, bounds });

  it("带 bounds 的卡片被夹在自己象限内，不越界", () => {
    // 两张卡都困在同一个窄象限里、彼此重叠 → 推开后仍不出这个矩形
    const bounds = { minX: 0, maxX: 60, minY: 0, maxY: 40 };
    const items = [box(30, 20, bounds), box(35, 20, bounds)];
    relaxOverlaps(items, 400, 400);
    for (const it of items) {
      expect(it.cx).toBeGreaterThanOrEqual(bounds.minX + it.halfW - 1e-6);
      expect(it.cx).toBeLessThanOrEqual(bounds.maxX - it.halfW + 1e-6);
      expect(it.cy).toBeGreaterThanOrEqual(bounds.minY + it.halfH - 1e-6);
      expect(it.cy).toBeLessThanOrEqual(bounds.maxY - it.halfH + 1e-6);
    }
  });

  it("不同象限的卡片各夹各的，互不越入对方区域", () => {
    // 左象限卡与右象限卡即便初始靠得很近，推开后各自留在自己那半边
    const left = { minX: 0, maxX: 100, minY: 0, maxY: 200 };
    const right = { minX: 120, maxX: 220, minY: 0, maxY: 200 };
    const items = [box(90, 100, left), box(130, 100, right)];
    relaxOverlaps(items, 400, 400);
    expect(items[0].cx).toBeLessThanOrEqual(left.maxX - items[0].halfW + 1e-6);
    expect(items[1].cx).toBeGreaterThanOrEqual(right.minX + items[1].halfW - 1e-6);
  });
});

describe("layoutQuadrantGrid", () => {
  const bounds = { minX: 0, maxX: 300, minY: 0, maxY: 300 };
  const card = (id, w = 80, h = 30) => ({ id, w, h });
  // 两张卡的槽位矩形（渲染 ≤ 槽位，故槽位不重叠即卡片不重叠）
  const overlaps = (a, b, aw, ah, bw, bh) =>
    Math.abs(a.cx - b.cx) < (aw + bw) / 2 && Math.abs(a.cy - b.cy) < (ah + bh) / 2;

  it("同一行的卡片不重叠、依次靠右排", () => {
    const { positions, shrink } = layoutQuadrantGrid(
      [card("a"), card("b"), card("c")],
      bounds
    );
    expect(shrink).toBe(1);
    expect(positions[0].cx).toBeLessThan(positions[1].cx);
    expect(positions[1].cx).toBeLessThan(positions[2].cx);
    expect(positions[0].cy).toBeCloseTo(positions[1].cy, 5); // 同一行等高
    expect(overlaps(positions[0], positions[1], 80, 30, 80, 30)).toBe(false);
  });

  it("放不下就换行：下一行更靠下", () => {
    // 每张 80 宽 + 12 间距，300 宽约放 3 张 → 第 4 张换行
    const cards = ["a", "b", "c", "d"].map((id) => card(id));
    const { positions } = layoutQuadrantGrid(cards, bounds);
    expect(positions[3].cy).toBeGreaterThan(positions[0].cy);
    expect(positions[3].cx).toBeCloseTo(positions[0].cx, 5); // 回到行首
  });

  it("象限装不下时整体等比缩小 (shrink<1) 且仍在边界内", () => {
    // 塞进远超容量的卡片，强制缩小
    const cards = Array.from({ length: 40 }, (_, i) => card(`n${i}`, 120, 40));
    const { positions, shrink } = layoutQuadrantGrid(cards, bounds);
    expect(shrink).toBeGreaterThan(0);
    expect(shrink).toBeLessThan(1);
    for (const p of positions) {
      expect(p.cx).toBeGreaterThanOrEqual(bounds.minX - 1e-6);
      expect(p.cx).toBeLessThanOrEqual(bounds.maxX + 1e-6);
      expect(p.cy).toBeGreaterThanOrEqual(bounds.minY - 1e-6);
      expect(p.cy).toBeLessThanOrEqual(bounds.maxY + 1e-6);
    }
  });

  it("空数组返回空布局", () => {
    expect(layoutQuadrantGrid([], bounds)).toEqual({ positions: [], shrink: 1, overflowIds: [] });
  });
});

describe("平面安全边距常量", () => {
  it("X 边距对称且留在 0..1 内", () => {
    expect(PLANE_X_MIN).toBeGreaterThan(0);
    expect(PLANE_X_MAX).toBeLessThan(1);
    expect(PLANE_X_MIN + PLANE_X_MAX).toBeCloseTo(1, 5);
  });
});


describe("尺寸下限与溢出（手机小屏）", () => {
  const bounds = { minX: 0, maxX: 120, minY: 0, maxY: 120 };
  const cards = Array.from({ length: 12 }, (_, i) => ({ id: `t${i}`, w: 90, h: 34 }));

  it("不给下限时会一直缩小，卡片小到读不出字", () => {
    const { shrink, overflowIds } = layoutQuadrantGrid(cards, bounds);
    expect(shrink).toBeLessThan(0.5);
    expect(overflowIds).toEqual([]);
  });

  it("给了下限就不再缩，多出来的卡片改为溢出", () => {
    const min = minShrinkForPriority("urgent_important");
    const { shrink, positions, overflowIds } = layoutQuadrantGrid(cards, bounds, 12, min);
    expect(shrink).toBeCloseTo(min, 5);
    expect(overflowIds.length).toBeGreaterThan(0);
    expect(positions.length + overflowIds.length).toBe(cards.length);
    // 溢出的是排在末尾的那几张
    expect(overflowIds).toContain("t11");
  });

  it("下限保证渲染尺寸不低于 MIN_CARD_SCALE", () => {
    for (const id of ["urgent_important", "important", "urgent", "trivial"]) {
      expect(scaleForPriority(id) * minShrinkForPriority(id)).toBeGreaterThanOrEqual(
        MIN_CARD_SCALE - 1e-9,
      );
    }
  });
});

describe("跨象限单调化", () => {
  const eff = (m) =>
    ["urgent_important", "important", "urgent", "trivial"].map(
      (id) => scaleForPriority(id) * m[id],
    );

  it("重要象限挤爆时也不会比次要象限小（密度不该决定大小）", () => {
    const m = monotonicShrink({ urgent_important: 0.5, important: 1, urgent: 1, trivial: 1 });
    const [a, b, c, d] = eff(m);
    expect(a).toBeGreaterThanOrEqual(b - 1e-9);
    expect(b).toBeGreaterThanOrEqual(c - 1e-9);
    expect(c).toBeGreaterThanOrEqual(d - 1e-9);
  });

  it("都不挤时保持四档原样", () => {
    const m = monotonicShrink({});
    expect(eff(m)).toEqual([
      scaleForPriority("urgent_important"),
      scaleForPriority("important"),
      scaleForPriority("urgent"),
      scaleForPriority("trivial"),
    ]);
  });
});
