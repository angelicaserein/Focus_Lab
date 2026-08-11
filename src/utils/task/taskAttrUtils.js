export function formatDate(s) {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return new Date().getFullYear() === Number(y) ? `${m}/${d}` : `${y}/${m}/${d}`;
}

// @param {number} n - 分钟数（注意：非秒数。time.js 的 formatDuration 接收秒数）
export function formatMins(n, lang = "zh") {
  if (!n) return "";
  if (n < 60) return lang === "en" ? `${n}m` : `${n}分`;
  const h = Math.floor(n / 60), m = n % 60;
  return m ? `${h}h${m}m` : `${h}h`;
}

export function isDuePast(s) {
  if (!s) return false;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return new Date(s) < t;
}

// 内置属性 / 内置选项带 labelKey（或 nameKey / unitKey），显示时查 i18n；
// 用户自建的列与选项只有 label，原样显示。以下三个辅助统一这条分叉。
export function attrName(t, attr) {
  return attr?.nameKey ? t(attr.nameKey) : attr?.name ?? "";
}

export function attrUnit(t, attr) {
  return attr?.unitKey ? t(attr.unitKey) : attr?.unit ?? "";
}

export function optionLabel(t, opt) {
  return opt?.labelKey ? t(opt.labelKey) : opt?.label ?? "";
}

/** 从属性定义的 options 派生排序权重 map：{ optionId -> sortWeight } */
export function buildSortWeightMap(attrDef) {
  if (!attrDef?.options) return {};
  return Object.fromEntries(
    attrDef.options.map(o => [o.id, o.sortWeight ?? 0])
  );
}
