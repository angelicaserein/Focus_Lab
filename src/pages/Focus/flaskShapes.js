// 参数化烧瓶：形状由几个几何参数生成，而非写死的路径。
// 三个预设（圆底 / 锥形 / 烧杯）只是参数空间里的几个取样点，用户可在设置页
// 用滑杆继续微调，圆底↔锥形↔烧杯本质上是同一条连续谱。
//
// 坐标系：viewBox 80x130，瓶身中线 cx=40，
// 底部固定在 y=128（液面填充逻辑依赖这个底，勿改）。
// 瓶口顶端 y 不再写死：由 neckLen（瓶口长度）自 shoulderY 上推得到，
// 这样瓶口长度可独立于瓶肩位置自由调节。
const CX = 40;
const NECK_TOP_MIN = 10; // 瓶口顶端最高只能到这，给瓶塞留出画布空间
const BASE_Y = 128;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// 可调参数及其滑杆范围。key 对应 i18n：settings.prefs.flaskParam.<key>
export const FLASK_PARAM_DEFS = [
  { key: "neckHalf",    min: 5,  max: 30, step: 1 }, // 瓶颈半宽
  { key: "neckLen",     min: 4,  max: 70, step: 1 }, // 瓶口长度（从瓶肩上推到瓶口顶端）
  { key: "shoulderY",   min: 20, max: 96, step: 1 }, // 瓶肩位置（越大瓶身越靠下）
  { key: "bodyHalf",    min: 18, max: 37, step: 1 }, // 瓶身最大半宽
  { key: "bottomRound", min: 0,  max: 37, step: 1 }, // 底部圆角：0=平底(锥形) → 大=圆底
];

export const FLASK_PRESETS = {
  round:    { neckHalf: 14, neckLen: 28, shoulderY: 44, bodyHalf: 34, bottomRound: 30 },
  triangle: { neckHalf: 8,  neckLen: 26, shoulderY: 42, bodyHalf: 34, bottomRound: 6 },
  beaker:   { neckHalf: 26, neckLen: 8,  shoulderY: 24, bodyHalf: 28, bottomRound: 5 },
};

export const FLASK_PRESET_ORDER = ["round", "triangle", "beaker"];
export const DEFAULT_FLASK_PRESET = "round";

// 由参数生成瓶体轮廓、内壁高光、瓶塞。各参数先夹取到合法范围，
// 保证任意输入都得到不自相交的形状。
export function buildFlask(raw = {}) {
  const bodyHalf = clamp(raw.bodyHalf ?? 34, 18, 37);
  const neckHalf = clamp(Math.min(raw.neckHalf ?? 14, bodyHalf), 5, bodyHalf);
  const bottomRound = clamp(Math.min(raw.bottomRound ?? 20, bodyHalf), 0, bodyHalf);
  // 瓶肩不能低于底部圆角起点，否则轮廓翻折
  const shoulderY = clamp(raw.shoulderY ?? 44, 20, BASE_Y - bottomRound - 8);
  // 瓶口顶端 = 瓶肩上推 neckLen；夹取到 [NECK_TOP_MIN, 瓶肩上方 6px]，保证瓶口始终可见
  const neckTop = clamp(shoulderY - (raw.neckLen ?? 28), NECK_TOP_MIN, shoulderY - 6);

  const lNeck = CX - neckHalf, rNeck = CX + neckHalf;
  const lBody = CX - bodyHalf, rBody = CX + bodyHalf;
  const yCorner = BASE_Y - bottomRound;

  const path = [
    `M ${lNeck},${neckTop}`,
    `L ${lNeck},${shoulderY}`,
    `L ${lBody},${yCorner}`,
    `Q ${lBody},${BASE_Y} ${lBody + bottomRound},${BASE_Y}`,
    `L ${rBody - bottomRound},${BASE_Y}`,
    `Q ${rBody},${BASE_Y} ${rBody},${yCorner}`,
    `L ${rNeck},${shoulderY}`,
    `L ${rNeck},${neckTop}`,
    "Z",
  ].join(" ");

  const highlight = [
    `M ${lNeck + 2},${neckTop + 4}`,
    `L ${lNeck + 2},${shoulderY}`,
    `L ${lBody + 4},${Math.max(shoulderY + 4, yCorner - 6)}`,
  ].join(" ");

  // 瓶塞：一枚上宽下窄的软木塞，坐在瓶口上，明显高出瓶身。所有烧瓶一律带塞。
  const capTopHalf = neckHalf + 3;
  const capBotHalf = neckHalf + 0.5;
  const capTopY = neckTop - 9;
  const capBotY = neckTop + 4;
  const cap = [
    `M ${CX - capTopHalf + 2},${capTopY}`,
    `L ${CX + capTopHalf - 2},${capTopY}`,
    `Q ${CX + capTopHalf},${capTopY} ${CX + capTopHalf},${capTopY + 2}`,
    `L ${CX + capBotHalf},${capBotY}`,
    `L ${CX - capBotHalf},${capBotY}`,
    `L ${CX - capTopHalf},${capTopY + 2}`,
    `Q ${CX - capTopHalf},${capTopY} ${CX - capTopHalf + 2},${capTopY}`,
    "Z",
  ].join(" ");

  return { path, highlight, cap };
}

// 由「当前预设 + 各预设参数覆盖」组装规范结构。三个烧瓶各自独立保存微调，
// 互不影响；params 是当前预设参数的别名，供专注页 / 预览直接取用。
// 结构：{ preset, presets: { round, triangle, beaker }, params }
function makeFlaskShape(preset, overrides = {}) {
  const presets = {};
  for (const key of FLASK_PRESET_ORDER) {
    presets[key] = { ...FLASK_PRESETS[key], ...(overrides[key] || {}) };
  }
  return { preset, presets, params: presets[preset] };
}

// 归一化持久化值：兼容旧版（仅存预设字符串、或单个 {preset, params}），
// 新版存 { preset, presets } —— 每个预设一套参数。
export function normalizeFlaskShape(value) {
  if (typeof value === "string") {
    const preset = FLASK_PRESETS[value] ? value : DEFAULT_FLASK_PRESET;
    return makeFlaskShape(preset);
  }
  if (value && typeof value === "object") {
    const preset = FLASK_PRESETS[value.preset] ? value.preset : DEFAULT_FLASK_PRESET;
    // 新版：presets 保存各预设的独立参数
    if (value.presets && typeof value.presets === "object") {
      return makeFlaskShape(preset, value.presets);
    }
    // 旧版：params 仅是当前预设的参数，迁移为该预设的覆盖
    if (value.params && typeof value.params === "object") {
      return makeFlaskShape(preset, { [preset]: value.params });
    }
    return makeFlaskShape(preset);
  }
  return makeFlaskShape(DEFAULT_FLASK_PRESET);
}

export const DEFAULT_FLASK_SHAPE = normalizeFlaskShape(DEFAULT_FLASK_PRESET);
