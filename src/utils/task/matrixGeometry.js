// 艾森豪威尔优先级平面的纯几何：落点(0..1) ↔ 缩放/命中，供矩阵组件与拖拽 hook 共用。

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// 拖动开始的位移阈值（px）：小于此值视作「点击」而非「拖动」
export const DRAG_THRESHOLD = 5;

// 落点被限制在平面内的安全边距（避免卡片贴边/溢出）
export const PLANE_X_MIN = 0.045;
export const PLANE_X_MAX = 0.955;
export const PLANE_Y_MIN = 0.06;
export const PLANE_Y_MAX = 0.94;

// 十字分界线位置（0..1）：不在正中，而是竖线右移、横线下移，让左上「重要且紧急」象限最大。
//   CSS 那条十字线由同名 --divider-x/--divider-y 变量画出，必须与此保持一致。
export const DIVIDER_X = 0.58; // 竖线偏右 → 左列（紧急）更宽
export const DIVIDER_Y = 0.58; // 横线偏下 → 上行（重要）更高

export const isPlaced = (todo) =>
  !!todo.matrixPos &&
  typeof todo.matrixPos.x === "number" &&
  typeof todo.matrixPos.y === "number";

// 象限「死区」：分界线两侧各留一条窄带，落点不许停在带内，会被推到最近象限的一侧。
// 让每张卡片明确归属某象限——降低摆放自由度，配合平面上那条淡淡的十字分界线，
// 读起来就是四象限而非一片连续平面。
export const GUTTER = 0.05;

// 优先级标签 ↔ 象限：横轴左＝紧急、纵轴上＝重要，四个标签一一对应四个象限。
//   让「优先级标签」和「矩阵落点」共用同一个真相——拖到哪个象限就是哪个标签，
//   反过来打了标签的任务也只能待在对应象限里，不许跨区。
//     urgent_important 重要且紧急 → 左上（紧急+重要）
//     important        重要不紧急 → 右上（不紧急+重要）
//     urgent           紧急不重要 → 左下（紧急+不重要）
//     trivial          不重要不紧急 → 右下（不紧急+不重要）
export const PRIORITY_QUADRANTS = {
  urgent_important: { left: true, top: true },
  important: { left: false, top: true },
  urgent: { left: true, top: false },
  trivial: { left: false, top: false },
};

// 象限方位（left/top 布尔）→ 优先级标签 id
export function priorityByFlags(left, top) {
  for (const [id, q] of Object.entries(PRIORITY_QUADRANTS)) {
    if (q.left === left && q.top === top) return id;
  }
  return "trivial";
}

// 落点 → 优先级标签 id：以分界线划四象限（左＝紧急、上＝重要）
export const quadrantOfPos = ({ x, y }) => priorityByFlags(x < DIVIDER_X, y < DIVIDER_Y);

// 优先级标签 → 该象限允许的落点范围（0..1）：贴分界线留 GUTTER 死区、外沿留平面安全边距。
//   卡片被夹在这个矩形内，于是「只能在对应区域、不跨区域」。
export function quadrantBounds(priorityId) {
  const q = PRIORITY_QUADRANTS[priorityId] ?? PRIORITY_QUADRANTS.trivial;
  return {
    xMin: q.left ? PLANE_X_MIN : DIVIDER_X + GUTTER,
    xMax: q.left ? DIVIDER_X - GUTTER : PLANE_X_MAX,
    yMin: q.top ? PLANE_Y_MIN : DIVIDER_Y + GUTTER,
    yMax: q.top ? DIVIDER_Y - GUTTER : PLANE_Y_MAX,
  };
}

// 把落点夹进指定象限，保证整点落在该象限内（不跨中线）
export function confineToQuadrant({ x, y }, priorityId) {
  const b = quadrantBounds(priorityId);
  return { x: clamp(x, b.xMin, b.xMax), y: clamp(y, b.yMin, b.yMax) };
}

// 优先级标签 → 默认落点（象限中心）：供「自动归位 / 分一下 / AI 分配」起手用。
//   取象限范围的正中，随分界线自动挪动。
export function priorityCenter(priorityId) {
  const b = quadrantBounds(priorityId);
  return { x: (b.xMin + b.xMax) / 2, y: (b.yMin + b.yMax) / 2 };
}

// 优先级标签 → 卡片缩放：按象限「档位」离散取值，同象限一个大小，不随象限内落点变化。
//   重要且紧急最大、不重要不紧急最小，两个中间象限（重要不紧急 / 紧急不重要）同档居中。
//   档距收窄、只拉开一点点：以中间象限 1.11 为基准，重要且紧急略大（1.22）、不重要不紧急略小（1.00）。
export function scaleForPriority(priorityId) {
  const q = PRIORITY_QUADRANTS[priorityId] ?? PRIORITY_QUADRANTS.trivial;
  const tier = (q.left ? 1 : 0) + (q.top ? 1 : 0);
  return [1.0, 1.11, 1.22][tier];
}

// 象限内「整齐网格」布局：把一个象限里的卡片按行流式排布（满行换行），必要时整体等比缩小刚好放下。
//   这是「伪自由落点」的骨架——你把卡片拖到象限里任意位置，只决定它在网格里的先后（越靠上/左越靠前），
//   最终由这里吸附成互不重叠的整齐行列。
//   cards:  [{ id, w, h }] 已按期望顺序排好；w、h 是卡片在「该象限最大缩放」下的槽位像素尺寸。
//           渲染时各卡片按自身落点缩放，只会 ≤ 槽位 → 卡片永远待在自己的槽位内，绝不重叠。
//   bounds: { minX, maxX, minY, maxY } 象限像素范围
//   gap:    卡片最小间距（未缩小时，像素）
//   返回 { positions: [{ id, cx, cy }], shrink }：
//     positions 各卡片中心像素坐标；shrink∈(0,1] 为放下而对整个象限施加的缩小系数——
//     调用方须把它同乘到卡片渲染缩放上（槽位与渲染同比缩小，故仍不重叠）。
export function layoutQuadrantGrid(cards, bounds, gap = 12) {
  const availW = bounds.maxX - bounds.minX;
  const availH = bounds.maxY - bounds.minY;
  // 以系数 k 缩放所有卡片与间距后走一遍流式换行，返回槽位与占用高度
  const flow = (k) => {
    const g = gap * k;
    const rowH = cards.reduce((m, c) => Math.max(m, c.h * k), 0);
    const slots = [];
    let x = 0;
    let y = 0;
    let rows = cards.length ? 1 : 0;
    for (const c of cards) {
      const w = c.w * k;
      // 放不下就换行；行首那张再宽也先放（避免空行）
      if (x > 0 && x + w > availW) {
        x = 0;
        y += rowH + g;
        rows++;
      }
      slots.push({ id: c.id, x, y, w, rowH });
      x += w + g;
    }
    const usedH = rows ? rows * rowH + (rows - 1) * g : 0;
    return { slots, usedH };
  };
  // ① 先压到最宽的卡片能塞进象限宽度 ② 再压到所有行能塞进象限高度
  const maxW = cards.reduce((m, c) => Math.max(m, c.w), 0);
  let k = maxW > availW && maxW > 0 ? availW / maxW : 1;
  let laid = flow(k);
  if (laid.usedH > availH && laid.usedH > 0) {
    k *= availH / laid.usedH;
    laid = flow(k);
  }
  const positions = laid.slots.map((s) => ({
    id: s.id,
    cx: bounds.minX + s.x + s.w / 2,
    cy: bounds.minY + s.y + s.rowH / 2,
  }));
  return { positions, shrink: k };
}

// 防重叠松弛：把一组卡片矩形沿「穿透较浅」的轴相互推开，直到互不重叠或到迭代上限。
//   items: [{ cx, cy, halfW, halfH, bounds? }]（平面内像素，会被原地修改）
//     bounds: 可选的 { minX, maxX, minY, maxY }（像素），把该卡片夹在自己的象限内——
//             不给则退回整块平面。有了它，推挤也不会把卡片顶出所属象限（不跨区）。
//   width/height: 平面内容区尺寸，用于把没给 bounds 的卡片夹在平面内
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
      const bx0 = it.bounds ? it.bounds.minX : 0;
      const bx1 = it.bounds ? it.bounds.maxX : width;
      const by0 = it.bounds ? it.bounds.minY : 0;
      const by1 = it.bounds ? it.bounds.maxY : height;
      it.cx = clamp(it.cx, bx0 + it.halfW, bx1 - it.halfW);
      it.cy = clamp(it.cy, by0 + it.halfH, by1 - it.halfH);
    }
    if (!moved) break;
  }
  return anyMoved;
}
