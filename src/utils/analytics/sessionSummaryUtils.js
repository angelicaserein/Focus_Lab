// 纯函数：SessionSummary 的统计计算，与 UI 渲染解耦，便于独立测试。

export function topTag(items) {
  const counts = {};
  items.forEach((i) => {
    if (i.tag) counts[i.tag] = (counts[i.tag] ?? 0) + 1;
  });
  const entries = Object.entries(counts);
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

// 按 sessionId 对 items 分组，返回按 firstTs 降序排列的数组。
export function buildSessions(items, keyFn) {
  const map = {};
  items.forEach((item) => {
    const key = item.sessionId ?? "unknown";
    if (!map[key]) map[key] = { firstTs: item.ts, items: [], sessionId: key };
    map[key].items.push(keyFn(item));
    if (item.ts < map[key].firstTs) map[key].firstTs = item.ts;
  });
  return Object.values(map).sort((a, b) => b.firstTs - a.firstTs);
}

// 为分心会话列表附加统计字段：distractionRate、diffVsPrev、bestTag、每条 nth 序号。
export function enrichDistractionSessions(sessions, durationBySession) {
  return sessions.map((s, idx, arr) => {
    let nth = 0;
    const items = s.items
      .slice()
      .sort((a, b) => a.ts - b.ts)
      .map((item) => ({ ...item, nth: ++nth }));
    const durationSecs = durationBySession[s.sessionId] ?? 0;
    const prevSession = arr[idx + 1];
    const distractionRate =
      items.length > 0 && durationSecs > 0
        ? (items.length / (durationSecs / 3600)).toFixed(1)
        : null;
    const diffVsPrev =
      prevSession && items.length > 0
        ? items.length - prevSession.items.length
        : null;
    const bestTag = topTag(items);
    return { ...s, items, distractionRate, diffVsPrev, bestTag };
  });
}

// 一条原始分心记录 → 明细行要用的那几个字段（分心统计页与时间轴共用）。
export function toDistractionItem(d) {
  return {
    id: d.id,
    ts: d.ts,
    tag: d.tag ?? null,
    note: d.note ?? null,
    type: d.type ?? "reactive",
    durationSecs: d.durationSecs ?? null,
    // 桌面端自动记的那种：明细行要显示「几点到几点 · 哪个程序」
    endTs: d.endTs ?? null,
    appLabel: d.appLabel ?? null,
    // 沉浸层里翻的应用内页面：存的是路径，展示时再按当前语言取页面名
    pagePath: d.pagePath ?? null,
    pageLabel: d.pageLabel ?? null,
  };
}
