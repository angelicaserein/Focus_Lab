// 使用记录（activity log）：专注之外的动作也留痕 —— 加了什么、几点直接点了完成、删了什么。
// 专注记录只覆盖「开了计时器」的那部分时间，这里补上剩下的，时间轴才是一天的全貌。
// 纯数据层，与 React 无关，便于复用与单测。

export const ACTIVITY_TYPES = ["add", "complete", "uncomplete", "delete"];

// 展示元信息（DayLog 渲染用）。labelKey 是 i18n key（见 i18n/history.js）——
// 这层是纯函数、不知道当前语言，显示时由组件 t(meta.labelKey) 出文案。
export const ACTIVITY_META = {
  add:        { labelKey: "history.activity.add", cls: "add" },
  complete:   { labelKey: "history.activity.complete", cls: "complete" },
  uncomplete: { labelKey: "history.activity.uncomplete", cls: "uncomplete" },
  delete:     { labelKey: "history.activity.delete", cls: "delete" },
};

// 保留窗口：只留近 90 天且至多 800 条，避免 localStorage 无上限增长。
const KEEP_DAYS = 90;
const MAX_ENTRIES = 800;

/** 构造一条使用记录（时间戳即「几点做了这件事」） */
export function makeActivity(type, { taskId, text } = {}) {
  return {
    id: crypto.randomUUID(),
    type,
    ts: Date.now(),
    taskId,
    text: text ?? "",
  };
}

/** 按时间升序裁剪：先掐掉过期的，再截断超量的（保留最近的） */
export function pruneActivities(list, now = Date.now()) {
  const cutoff = now - KEEP_DAYS * 86400000;
  const kept = list.filter((a) => a.ts >= cutoff);
  return kept.length > MAX_ENTRIES ? kept.slice(kept.length - MAX_ENTRIES) : kept;
}

/** 同类动作若挤在 CLUSTER_MS 内（如倒脑子一次加十条），并成一条，免得刷屏 */
export const CLUSTER_MS = 5 * 60 * 1000;

/** @returns [{ id, type, ts, text, count, texts, items }] —— 按时间升序。
 *  items 是并进来的每一条（含各自时刻），供展开卡片逐条列出。 */
export function clusterActivities(activities) {
  const sorted = [...activities].sort((a, b) => a.ts - b.ts);
  const out = [];
  for (const a of sorted) {
    const last = out[out.length - 1];
    if (last && last.type === a.type && a.ts - last.lastTs <= CLUSTER_MS) {
      last.count += 1;
      last.lastTs = a.ts;
      last.texts.push(a.text);
      last.items.push({ id: a.id, text: a.text, ts: a.ts });
      continue;
    }
    out.push({
      id: a.id, type: a.type, ts: a.ts, lastTs: a.ts, text: a.text,
      count: 1, texts: [a.text], items: [{ id: a.id, text: a.text, ts: a.ts }],
    });
  }
  return out.map(({ lastTs: _drop, ...rest }) => rest);
}

/** 各类动作的条数统计（用于当日小结） */
export function countByType(activities) {
  const counts = {};
  for (const a of activities) counts[a.type] = (counts[a.type] ?? 0) + 1;
  return counts;
}
