// 心流任务页的纯逻辑：与任务库共用同一份数据（TodoContext / DatabaseContext），
// 这里只负责「怎么把任务分堆、排序、挑出此刻该做的一件」，方便复用与单测。

/** 今天 0 点起算，dateStr 距今天的天数（负数=已过期，0=今天）。 */
export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

/** 生效的截止日：设了日期、且没有把「截止开关」关掉时才算数（与任务库口径一致）。 */
export function activeDue(todo) {
  const due = todo.attrs?.dueDate;
  if (!due) return null;
  if (todo.attrs?.dueDateActive === false) return null;
  return due;
}

/** 优先级权重取值器：依赖 priority 列的 sortWeight；列被删掉时一律记 0。 */
export function makeWeightOf(priorityAttr) {
  const map = new Map((priorityAttr?.options ?? []).map((o) => [o.id, o.sortWeight ?? 0]));
  return (todo) => map.get(todo.attrs?.priority) ?? 0;
}

/** 截止日排序：有日期的排在无日期之前，都有则早的在前。 */
function dueSort(a, b) {
  const da = activeDue(a);
  const db = activeDue(b);
  if (da && db) return da < db ? -1 : da > db ? 1 : 0;
  if (da) return -1;
  if (db) return 1;
  return 0;
}

/** 堆内排序：先重要（权重高）、再急（截止近）、最后按创建先后。 */
export function makeImportanceSort(weightOf) {
  return (a, b) =>
    weightOf(b) - weightOf(a) ||
    dueSort(a, b) ||
    (a.createdAt ?? 0) - (b.createdAt ?? 0);
}

/**
 * 把未完成任务分成三堆（外加已完成）：
 *  - today：逾期或今天到期
 *  - upcoming：将来某天到期
 *  - anytime：没有生效截止日
 * 已完成任务单独一堆。每堆内部按 importanceSort 排。
 */
export function bucketTasks(todos, weightOf) {
  const sort = makeImportanceSort(weightOf);
  const buckets = { today: [], upcoming: [], anytime: [], done: [] };
  for (const t of todos) {
    if (t.completed) { buckets.done.push(t); continue; }
    const due = activeDue(t);
    const d = daysUntil(due);
    if (d !== null && d <= 0) buckets.today.push(t);
    else if (d !== null) buckets.upcoming.push(t);
    else buckets.anytime.push(t);
  }
  buckets.today.sort(sort);
  buckets.upcoming.sort(sort);
  buckets.anytime.sort(sort);
  // 已完成：最近创建的在前，纯粹给个稳定顺序
  buckets.done.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return buckets;
}

/**
 * 冻结卡片落位：已经露过面的任务沿用上一次的堆与次序，只有新任务按当前数据落位。
 * 这样改属性、勾完成都不会让卡片当场换堆乱跳（勾完的那张原地划掉），
 * 想收干净时把 placement 清空重新调用即可。
 *
 * @param fresh     bucketTasks() 的结果
 * @param placement Map<id, {bucket, index}>，上一次的落位；空 Map = 从头排
 * @returns { buckets, placement } 新的分堆与落位表
 */
export function stickyBuckets(fresh, placement) {
  const next = new Map();
  const out = { today: [], upcoming: [], anytime: [], done: [] };
  for (const key of Object.keys(out)) {
    (fresh[key] ?? []).forEach((t, i) => {
      const old = placement?.get(t.id);
      const slot = old && out[old.bucket] ? old : { bucket: key, index: i };
      next.set(t.id, slot);
      out[slot.bucket].push(t);
    });
  }
  for (const key of Object.keys(out)) {
    out[key].sort(
      (a, b) =>
        next.get(a.id).index - next.get(b.id).index ||
        (a.createdAt ?? 0) - (b.createdAt ?? 0),
    );
  }
  return { buckets: out, placement: next };
}

/**
 * 「现在就做这一件」的自动挑选：逾期/今天的优先，其次重要，再次紧急，最后最早创建。
 * 返回单个 todo 或 undefined。
 */
export function pickRightNow(incomplete, weightOf) {
  if (!incomplete.length) return undefined;
  const sort = makeImportanceSort(weightOf);
  const urgency = (t) => {
    const d = daysUntil(activeDue(t));
    return d !== null && d <= 0 ? 0 : 1; // 逾期/今天排最前
  };
  return [...incomplete].sort((a, b) => urgency(a) - urgency(b) || sort(a, b))[0];
}
