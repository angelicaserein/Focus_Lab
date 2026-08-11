// 烧瓶架页文案。每条 key -> { en, zh }。
export default {
  "flasks.title": { en: "Flask shelf", zh: "烧瓶架" },
  "flasks.lead": {
    en: "One hour of focus fills one flask. Whatever overflows pours into the next flask of the same shape.",
    zh: "一小时专注注满一只烧瓶。溢出的部分自动流进下一只同样形状的瓶子。",
  },
  "flasks.empty": { en: "The shelf is empty.", zh: "架子还空着。" },
  "flasks.emptyHint": {
    en: "Shape a flask in Settings, then hit “Save to shelf” — it lands here, and you can pick it as the one you're filling.",
    zh: "先在设置页把烧瓶调成你想要的样子，点「存进烧瓶架」，它就会出现在这里，然后就能选它来接水了。",
  },
  "flasks.goSettings": { en: "Shape a flask", zh: "去调形状" },
  "flasks.active": { en: "Filling this one", zh: "正在往这只里注" },
  "flasks.setActive": { en: "Fill this one", zh: "选它来接水" },
  "flasks.remove": { en: "Take off the shelf", zh: "移出架子" },
  "flasks.removeHint": {
    en: "Takes it off the shelf. Its poured hours stay in your history but won't show here any more.",
    zh: "把这只从架子上拿走。已注入的时长仍在历史记录里，只是不再显示在这。",
  },
  // 移出确认：盖在那张卡上问一句，别让一次手滑就把调好的形状弄丢
  "flasks.confirmTitle": { en: "Take this one off?", zh: "把这只拿走？" },
  "flasks.confirmNote": {
    en: "Its shape isn't saved anywhere else — you'd have to shape it again in Settings.",
    zh: "这只的形状没有别的备份，拿走后想要就得回设置页重新调一次。",
  },
  "flasks.confirmYes": { en: "Take it off", zh: "拿走" },
  "flasks.confirmNo": { en: "Keep it", zh: "留着" },
  "flasks.namePlaceholder": { en: "Name this flask", zh: "给这只起个名" },
  "flasks.total": { en: "{v} poured in", zh: "已注入 {v}" },
  // 注满的瓶子各自成卡，卡上就这一句
  "flasks.filled": { en: "Filled", zh: "已注满" },
  "flasks.nextIn": { en: "{v} to go on the one in progress", zh: "正在接的这只还差 {v}" },
  "flasks.justStarted": { en: "Nothing poured in yet", zh: "还没往里注过" },
  // 这只瓶子的来历：几次专注注出来的、最近一次是什么时候
  "flasks.sessions": { en: "{n} sessions", zh: "{n} 次专注" },
  "flasks.sessions_one": { en: "1 session", zh: "1 次专注" },
  "flasks.lastPour": { en: "last {v}", zh: "最近 {v}" },
  "flasks.agoToday": { en: "today", zh: "今天" },
  "flasks.agoYesterday": { en: "yesterday", zh: "昨天" },
  "flasks.agoDays": { en: "{n}d ago", zh: "{n} 天前" },
  "flasks.agoWeeks": { en: "{n}w ago", zh: "{n} 周前" },
  "flasks.agoLong": { en: "a while back", zh: "很久以前" },
  "flasks.shelfCount": { en: "{n} on the shelf", zh: "架上 {n} 只" },
  // —— 两个板块的标题 ——
  // 上面那层是操作台（随时会变），下面那层是收藏（只增不减）。
  "flasks.sectionShelf": { en: "On the shelf", zh: "架上" },
  "flasks.sectionShelfCount": { en: "{n} shapes", zh: "{n} 只" },
  "flasks.sectionShelfNote": {
    en: "Each saved shape gets a flask. Pick the one you're pouring into.",
    zh: "每个存下来的形状一只瓶子。挑一只作为现在往里注水的那只。",
  },
  "flasks.sectionFilled": { en: "Filled up", zh: "注满的" },
  "flasks.sectionFilledCount": { en: "{n} bottles", zh: "{n} 只" },
  "flasks.sectionFilledNote": {
    en: "One hour of focus each, kept as they are.",
    zh: "每只都是一小时专注，就这么摆着。",
  },
  "flasks.filledEmpty": {
    en: "None yet — the first one lands here once a flask above fills up.",
    zh: "还没有。上面哪只注满了，第一只就会落在这里。",
  },
  // 排法：只是看的顺序，不动架子本身
  "flasks.sortBy": { en: "Order", zh: "排法" },
  "flasks.sort.saved": { en: "As saved", zh: "存入顺序" },
  "flasks.sort.fullest": { en: "Most poured", zh: "注得最多" },
  "flasks.sort.recent": { en: "Recently used", zh: "最近用过" },
  "flasks.sort.name": { en: "By name", zh: "按名字" },
  // —— 标本（烧瓶架 × 生态缸，见 data/specimen）——
  // 注满一小时的瓶子可以封一只养成的鱼进去。文案只在真有得封的时候才露出来。
  "flasks.sealBtn": { en: "Seal a specimen", zh: "封一只标本" },
  "flasks.sealTitle": { en: "Pick one to seal", zh: "挑一只做成标本" },
  "flasks.sealNote": {
    en: "Only fully grown ones can be sealed. It leaves the tank and keeps its place in the log — you can take it out again any time.",
    zh: "只有长成的才能封。它会离开水缸住进瓶里，图鉴照旧算它一份，随时可以再取出来。",
  },
  "flasks.sealNone": {
    en: "Nothing in the tank has finished growing yet.",
    zh: "缸里还没有长成的。",
  },
  "flasks.sealCancel": { en: "Not now", zh: "先不封" },
  "flasks.sealLocked": {
    en: "{v} more to go before this one can hold a specimen",
    zh: "再注 {v} 就能往这只里封标本",
  },
  "flasks.sealedOf": { en: "{v} sealed inside", zh: "里面封着 {v}" },
  "flasks.unseal": { en: "Back to the tank", zh: "放回缸里" },
  // 时长：小时/分钟并置，避免两套语言各写一套格式化
  "flasks.hm": { en: "{h}h {m}m", zh: "{h} 小时 {m} 分" },
  "flasks.h": { en: "{h}h", zh: "{h} 小时" },
  "flasks.m": { en: "{m}m", zh: "{m} 分钟" },
};
