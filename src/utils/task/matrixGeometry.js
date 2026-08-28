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

// 优先级标签 → 卡片缩放：按象限离散取值，同象限一个大小，不随象限内落点变化。
//   四档拉开，让「一眼看出谁重要」不必读文字：重要的两档明显更大，
//   且「重要」比「紧急」更抬尺寸（重要不紧急 > 紧急不重要），符合矩阵本意。
export const PRIORITY_SCALES = {
  urgent_important: 1.34,
  important: 1.16,
  urgent: 0.98,
  trivial: 0.84,
};

// 优先级标签 → 卡片明度（0..1，乘在整张卡的 opacity 上）：越不重要越暗、越往后退。
//   与尺寸一起构成「大而亮 ↔ 小而暗」的双通道对比；悬停时 CSS 会恢复满亮度，
//   所以暗下去只是视觉排序，不影响读取。
export const PRIORITY_DIMS = {
  urgent_important: 1,
  important: 0.9,
  urgent: 0.72,
  trivial: 0.55,
};

export function scaleForPriority(priorityId) {
  return PRIORITY_SCALES[priorityId] ?? PRIORITY_SCALES.trivial;
}

// 卡片渲染缩放的下限：低于这个倍率，卡片上的字在手机上就小到读不出来了。
//   象限挤不下时宁可让多出来的卡片溢出（改成角落里的「+N」计数），也不再无限缩小——
//   否则「哪个象限任务多哪个象限的卡就小」，尺寸编码的就成了密度而不是轻重缓急。
export const MIN_CARD_SCALE = 0.78;

// 某象限允许的最大缩小系数（0..1）：保证 档位缩放 × 系数 ≥ MIN_CARD_SCALE
export function minShrinkForPriority(priorityId) {
  return Math.min(1, MIN_CARD_SCALE / scaleForPriority(priorityId));
}

// 跨象限单调化：保证渲染尺寸严格按「重要且紧急 > 重要 > 紧急 > 都不」排下来。
//   每个象限自己算出的 shrink 只看本象限挤不挤，四个象限放到一起就可能出现
//   「任务多的重要象限反而比空荡荡的次要象限小」。这里按优先级顺序逐个封顶：
//   下一档的渲染尺寸不得超过上一档，同时不低于各自的下限（并列可以，倒挂不行）。
const PRIORITY_ORDER = ["urgent_important", "important", "urgent", "trivial"];

export function monotonicShrink(shrinkByPriority) {
  const out = {};
  let prevEff = Infinity;
  for (const id of PRIORITY_ORDER) {
    const base = scaleForPriority(id);
    const floor = Math.min(base, MIN_CARD_SCALE); // ＝ base × minShrinkForPriority(id)，直接算避免浮点误差
    const raw = base * clamp(shrinkByPriority[id] ?? 1, 0, 1);
    const eff = Math.max(floor, Math.min(raw, prevEff));
    out[id] = eff / base;
    prevEff = eff;
  }
  return out;
}

export function dimForPriority(priorityId) {
  return PRIORITY_DIMS[priorityId] ?? PRIORITY_DIMS.trivial;
}

// 象限内「整齐网格」布局：把一个象限里的卡片按行流式排布（满行换行），必要时整体等比缩小刚好放下。
//   这是「伪自由落点」的骨架——你把卡片拖到象限里任意位置，只决定它在网格里的先后（越靠上/左越靠前），
//   最终由这里吸附成互不重叠的整齐行列。
//   cards:  [{ id, w, h }] 已按期望顺序排好；w、h 是卡片在「该象限最大缩放」下的槽位像素尺寸。
//           渲染时各卡片按自身落点缩放，只会 ≤ 槽位 → 卡片永远待在自己的槽位内，绝不重叠。
//   bounds: { minX, maxX, minY, maxY } 象限像素范围
//   gap:    卡片最小间距（未缩小时，像素）
//   minShrink: 缩小系数的下限（见 minShrinkForPriority），0 表示不限。
//   返回 { positions: [{ id, cx, cy }], shrink, overflowIds }：
//     positions 各卡片中心像素坐标；shrink∈(0,1] 为放下而对整个象限施加的缩小系数——
//     调用方须把它同乘到卡片渲染缩放上（槽位与渲染同比缩小，故仍不重叠）；
//     overflowIds 是压到下限仍塞不下、被挤出平面的卡片（排在末尾的那几张）。
export function layoutQuadrantGrid(cards, bounds, gap = 12, minShrink = 0) {
  const availW = bounds.maxX - bounds.minX;
  const availH = bounds.maxY - bounds.minY;
  // 以系数 k 缩放所有卡片与间距后走一遍流式换行，返回槽位与占用高度
  const flow = (k, list) => {
    const g = gap * k;
    const rowH = list.reduce((m, c) => Math.max(m, c.h * k), 0);
    const slots = [];
    let x = 0;
    let y = 0;
    let rows = list.length ? 1 : 0;
    for (const c of list) {
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
  let list = cards;
  let laid = flow(k, list);
  if (laid.usedH > availH && laid.usedH > 0) {
    k *= availH / laid.usedH;
    laid = flow(k, list);
  }
  // 缩到读不出字了就不再缩：把 k 抬回下限，末尾放不下的卡片改为「溢出」，
  //   由调用方在象限角上收成一个 +N 计数（任务本身仍在右侧清单里）。
  const overflowIds = [];
  if (minShrink > 0 && k < minShrink) {
    k = Math.min(1, minShrink);
    list = cards.slice();
    laid = flow(k, list);
    while (list.length > 1 && laid.usedH > availH) {
      overflowIds.push(list.pop().id);
      laid = flow(k, list);
    }
  }
  const positions = laid.slots.map((s) => ({
    id: s.id,
    cx: bounds.minX + s.x + s.w / 2,
    cy: bounds.minY + s.y + s.rowH / 2,
  }));
  return { positions, shrink: k, overflowIds };
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
