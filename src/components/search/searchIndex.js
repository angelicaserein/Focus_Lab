// 跨页搜索的纯逻辑层：把各处的数据摊平成统一的「条目」，再按关键词打分排序。
// 只做匹配与排序，不碰 React、不读 localStorage —— 数据由调用方（useGlobalSearch）喂进来，
// 这样这一层可以单测，也方便以后接更多数据源。

// 一条搜索结果的形状：
//   kind   分组（action / page / task / memo / scenario），决定结果面板里归到哪一栏
//   id     该组内唯一
//   title  主文本，命中高亮就打在这上面
//   sub    副文本（所属库、日期、页面分区…），可缺省
//   to     点击后去哪个路由
//   state  随导航带过去的 router state（用于目标页高亮定位）
//   haystack  实际参与匹配的全部文本，已小写

const norm = (s) => (typeof s === "string" ? s.toLowerCase().trim() : "");

// 打分：越靠前、越完整的匹配分越高。
//   3 = 标题从头命中     2 = 标题中间命中
//   1 = 只在附属文本里命中（备注 / 标签 / 描述）
// 同分再按 recency（createdAt / ts）倒序，让新东西浮上来。
function scoreOf(title, haystack, q) {
  const t = norm(title);
  if (t.startsWith(q)) return 3;
  if (t.includes(q)) return 2;
  return haystack.includes(q) ? 1 : 0;
}

/**
 * @param {string} raw 用户输入
 * @param {{actions?:any[],pages?:any[],tasks?:any[],memos?:any[],scenarios?:any[]}} sources
 * @param {{limitPerKind?:number}} [opts]
 * @returns {{kind:string,items:object[]}[]} 只含有命中项的分组，顺序固定
 */
export function searchAll(raw, sources = {}, opts = {}) {
  const q = norm(raw);
  if (!q) return [];
  const limit = opts.limitPerKind ?? 5;

  const buckets = [
    // 动作排最前：它们是「做一件事」而不是「找一样东西」，输入 "专注" 时
    // 用户多半是想开一次专注，而不是想读专注页。
    ["action", sources.actions ?? []],
    ["page", sources.pages ?? []],
    ["task", sources.tasks ?? []],
    ["memo", sources.memos ?? []],
    ["scenario", sources.scenarios ?? []],
  ];

  const out = [];
  for (const [kind, entries] of buckets) {
    const hits = [];
    for (const e of entries) {
      const score = scoreOf(e.title, e.haystack ?? norm(e.title), q);
      if (score > 0) hits.push({ ...e, kind, score });
    }
    if (!hits.length) continue;
    hits.sort((a, b) => b.score - a.score || (b.at ?? 0) - (a.at ?? 0));
    out.push({ kind, items: hits.slice(0, limit), total: hits.length });
  }
  return out;
}

// ── 各数据源 → 统一条目 ──────────────────────────────────────────────────────
// 每个 toXxxEntries 只负责「这类数据里哪些字段该被搜到」，形状统一后交给 searchAll。

// 动作：命令面板那几条「直接做点什么」。由调用方（useGlobalSearch）用当前语言拼好，
// 每条要么带 to（去某页做），要么带 run（就地执行）。keywords 让中英两种输入都能命中。
export function toActionEntries(actions) {
  return actions.map((a) => ({
    id: a.id,
    title: a.title,
    sub: a.sub ?? "",
    to: a.to,
    state: a.state,
    run: a.run,
    haystack: [a.title, a.sub, ...(a.keywords ?? [])].map(norm).join(" "),
  }));
}

// 页面：title 是 nav.* 译名，sub 是所属分区译名。两种语言的名字都塞进 haystack——
// 界面切到中文时输 "focus" 也该找得到专注页，反之亦然。
export function toPageEntries(navItems, t, tAll) {
  return navItems.map(({ to, labelKey, sectionKey }) => {
    const title = t(labelKey);
    const alts = tAll ? tAll(labelKey) : [title];
    return {
      id: to,
      title,
      sub: sectionKey ? t(sectionKey) : "",
      to,
      haystack: [...alts, to].map(norm).join(" "),
    };
  });
}

// 任务：正文 + 备注 + 标签都可搜。sub 显示所属 database 名，
// 因为同名任务散在不同库里时，光看标题分不出是哪条。
export function toTaskEntries(todos, dbNameOf) {
  return todos.map((todo) => {
    const attrs = todo.attrs ?? {};
    const tags = Array.isArray(attrs.tags) ? attrs.tags : [];
    return {
      id: todo.id,
      title: todo.text ?? "",
      sub: dbNameOf?.(todo) ?? "",
      done: !!todo.completed,
      at: todo.createdAt ?? 0,
      to: "/tasks",
      state: { highlight: todo.id },
      haystack: [todo.text, attrs.notes, ...tags].map(norm).join(" "),
    };
  });
}

// 备忘 / 专注随记：两者在备忘录页是同一条时间线，这里也不分家，
// 只把 source 记在条目上，面板里用它标一下出处。
export function toMemoEntries(timeline) {
  return timeline.map((m) => {
    const tags = Array.isArray(m.tags) ? m.tags : [];
    return {
      id: m.id,
      title: m.text ?? "",
      source: m.source,
      at: m.ts ?? 0,
      to: "/memo",
      state: { highlight: m.id },
      haystack: [m.text, ...tags].map(norm).join(" "),
    };
  });
}

// 情景：标题 + 描述。
export function toScenarioEntries(scenarios) {
  return scenarios.map((s) => ({
    id: s.id,
    title: s.title ?? "",
    sub: s.description ?? "",
    at: s.createdAt ?? 0,
    to: "/scenario",
    state: { highlight: s.id },
    haystack: [s.title, s.description].map(norm).join(" "),
  }));
}

// 把标题按命中处切成 [前, 命中, 后] 三段，供面板加粗中间那段。
// 没命中（只在备注里匹配到）时返回 null，由面板原样显示标题。
export function splitHighlight(title, raw) {
  const q = norm(raw);
  if (!q) return null;
  const i = norm(title).indexOf(q);
  if (i < 0) return null;
  return [title.slice(0, i), title.slice(i, i + q.length), title.slice(i + q.length)];
}
