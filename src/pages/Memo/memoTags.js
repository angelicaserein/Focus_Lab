// 备忘标签的纯逻辑：规范化、增删、去重、汇总、筛选。
// 不依赖 React / DOM，可直接单测（见 memoTags.test.js）。

// 规范化单个标签：去首尾空白、去掉前导 #、压缩内部空白。无效返回 ""。
export function normalizeTag(raw) {
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/^#+/, "").replace(/\s+/g, " ").trim();
}

// 向标签数组追加一个标签：规范化后按大小写不敏感去重。返回新数组（不改原数组）。
export function addTag(tags, raw) {
  const list = Array.isArray(tags) ? tags : [];
  const tag = normalizeTag(raw);
  if (!tag) return list;
  const exists = list.some((t) => t.toLowerCase() === tag.toLowerCase());
  return exists ? list : [...list, tag];
}

// 从标签数组移除一个标签（大小写不敏感）。返回新数组。
export function removeTag(tags, tag) {
  const list = Array.isArray(tags) ? tags : [];
  const key = normalizeTag(tag).toLowerCase();
  return list.filter((t) => t.toLowerCase() !== key);
}

// 汇总条目里出现过的标签，按频次降序、同频按名称升序。返回 [{ tag, count }]。
export function collectTags(items) {
  const counts = new Map();
  for (const item of items || []) {
    for (const t of item?.tags || []) {
      counts.set(t, (counts.get(t) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

// 条目是否带指定标签（大小写不敏感）。用于按标签筛选。
export function itemHasTag(item, tag) {
  const key = (tag || "").toLowerCase();
  return (item?.tags || []).some((t) => t.toLowerCase() === key);
}
