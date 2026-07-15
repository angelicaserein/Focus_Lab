// 艾森豪威尔优先级平面的纯几何：落点(0..1) ↔ 缩放/命中，供矩阵组件与拖拽 hook 共用。

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// 落点 → 缩放：越靠左上（x、y 都小）越大。0.72（右下）→ 1.5（左上），对比更明显
export const scaleFor = (x, y) => 0.72 + ((1 - x) * 0.5 + (1 - y) * 0.5) * 0.78;

// 拖动开始的位移阈值（px）：小于此值视作「点击」而非「拖动」
export const DRAG_THRESHOLD = 5;

// 落点被限制在平面内的安全边距（避免卡片贴边/溢出）
export const PLANE_X_MIN = 0.045;
export const PLANE_X_MAX = 0.955;
export const PLANE_Y_MIN = 0.06;
export const PLANE_Y_MAX = 0.94;

export const isPlaced = (todo) =>
  !!todo.matrixPos &&
  typeof todo.matrixPos.x === "number" &&
  typeof todo.matrixPos.y === "number";

// 象限「死区」：中线（0.5）两侧各留一条窄带，落点不许停在带内，
// 会被推到最近象限的一侧。让每张卡片明确归属某象限——降低摆放自由度，
// 配合平面上那条淡淡的十字分界线，读起来就是四象限而非一片连续平面。
export const GUTTER = 0.05;

const nudgeAxis = (v) => {
  if (v > 0.5 - GUTTER && v <= 0.5) return 0.5 - GUTTER;
  if (v > 0.5 && v < 0.5 + GUTTER) return 0.5 + GUTTER;
  return v;
};

// 落点 → 推出十字死区后的落点（x、y 均 0..1）
export const snapOutOfGutter = ({ x, y }) => ({ x: nudgeAxis(x), y: nudgeAxis(y) });

// 防重叠松弛：把一组卡片矩形沿「穿透较浅」的轴相互推开，直到互不重叠或到迭代上限。
//   items: [{ cx, cy, halfW, halfH }]（平面内像素，会被原地修改）
//   width/height: 平面内容区尺寸，用于把卡片夹在平面内
//   返回是否发生过移动（供调用方决定要不要回写坐标）。
export function relaxOverlaps(items, width, height, gap = 8, iterations = 60) {
  let anyMoved = false;
  for (let iter = 0; iter < iterations; iter++) {
    let moved = false;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        const minX = a.halfW + b.halfW + gap;
        const minY = a.halfH + b.halfH + gap;
        const dx = b.cx - a.cx;
        const dy = b.cy - a.cy;
        const ox = minX - Math.abs(dx);
        const oy = minY - Math.abs(dy);
        if (ox > 0 && oy > 0) {
          if (ox <= oy) {
            const push = (ox / 2) * (dx < 0 ? -1 : 1);
            a.cx -= push;
            b.cx += push;
          } else {
            const push = (oy / 2) * (dy < 0 ? -1 : 1);
            a.cy -= push;
            b.cy += push;
          }
          moved = true;
          anyMoved = true;
        }
      }
    }
    for (const it of items) {
      it.cx = clamp(it.cx, it.halfW, width - it.halfW);
      it.cy = clamp(it.cy, it.halfH, height - it.halfH);
    }
    if (!moved) break;
  }
  return anyMoved;
}
