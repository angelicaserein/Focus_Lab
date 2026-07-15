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
