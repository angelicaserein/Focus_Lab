// 生物配色：把主题主色 + 物种色相偏移，算成一只生物身上的几种颜色。
//
// 为什么不写死颜色：整站有八套皮肤加暗夜，写死的鱼在哪套里都突兀。改成「主色转个色相」后，
// 一缸鱼彼此分得开，却仍和当前皮肤是一家人，换主题时整缸一起变。
//
// 亮度/饱和度会夹到一个可读区间：暗夜里的 --accent-mid 本身很浅，不夹住会在水里发白看不清。
//
// 色相偏移不直接用：物种表里的 hue 拉到 ±190°（鲸、魟、蓝吊…）已经转到主色的补色去了，
// 一缸鱼看着像另一套配色。故这里把它压进主色附近的邻近色带（±HUE_MAX），
// 被压掉的那部分转成明度差——邻近色 + 深浅分层，既是一家人又彼此分得清。

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// 支持 #rgb / #rrggbb / rgb(...) / rgba(...)，认不出来就返回 null 交给调用方兜底。
export function parseColor(str) {
  if (!str) return null;
  const s = String(str).trim();
  if (s[0] === "#") {
    const h = s.slice(1);
    if (h.length === 3) {
      return [0, 1, 2].map((i) => parseInt(h[i] + h[i], 16));
    }
    if (h.length >= 6) {
      return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    }
    return null;
  }
  const m = s.match(/-?[\d.]+/g);
  return m && m.length >= 3 ? m.slice(0, 3).map(Number) : null;
}

function rgbToHsl([r, g, b]) {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === R) h = ((G - B) / d + (G < B ? 6 : 0)) / 6;
  else if (max === G) h = ((B - R) / d + 2) / 6;
  else h = ((R - G) / d + 4) / 6;
  return [h * 360, s * 100, l * 100];
}

function hsl(h, s, l, a = 1) {
  const hh = ((h % 360) + 360) % 360;
  return a >= 1
    ? `hsl(${hh.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%)`
    : `hsl(${hh.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}% / ${a})`;
}

const HUE_SCALE = 0.3;  // 物种表里的原始偏移压缩比
const HUE_MAX = 54;     // 压缩后仍不许越过的邻近色边界（度）
const HUE_RAW = 190;    // 物种表里最大的原始偏移，用来把余量归一成 -1~1

// 物种 → 实际用的色偏。canvas 与图鉴（FishGlyph）共用这一份，两边颜色才对得上。
//   hue:  相对主题主色的色相偏移（度，已压进邻近色带）
//   tone: 明度倾向 -1~1，承接被压掉的那部分色相差
export function speciesShift(species) {
  const raw = species?.hue ?? 0;
  const hue = clamp(raw * HUE_SCALE, -HUE_MAX, HUE_MAX);
  return { hue, tone: clamp((raw - hue) / HUE_RAW, -1, 1) };
}

// base: 主题主色（任意可解析的颜色字符串）；species: 取它的 hue / rarity。
// 返回 creatureShapes 里各 role 对应的颜色。
export function creaturePalette(base, species) {
  const rgb = parseColor(base) ?? [135, 69, 121]; // 默认皮肤的 --accent-mid
  const [h0, s0, l0] = rgbToHsl(rgb);
  const shift = speciesShift(species);
  const h = h0 + shift.hue;
  // 史诗略艳一点，看得出「这只不一样」，但不靠额外颜色语言，仍是同一支色。
  const s = clamp(s0 * 1.15 + (species?.rarity === 3 ? 12 : 0), 34, 76);
  const l = clamp(clamp(l0, 44, 62) + shift.tone * 9, 40, 68);
  return {
    body: hsl(h, s, l),
    deep: hsl(h, s * 0.95, l - 13),
    fin: hsl(h + 6, s * 0.9, l + 14),
    mark: hsl(h, s * 0.5, clamp(l + 32, 0, 92)),
    eye: hsl(h, 30, 17),
  };
}
