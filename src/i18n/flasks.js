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
  "flasks.fullCount": { en: "{n} filled", zh: "{n} 只已注满" },
  "flasks.nextIn": { en: "{v} to go on the one in progress", zh: "正在接的这只还差 {v}" },
  "flasks.justStarted": { en: "Nothing poured in yet", zh: "还没往里注过" },
  "flasks.shelfCount": { en: "{n} / {total} on the shelf", zh: "架上 {n} / {total} 只" },
  // 时长：小时/分钟并置，避免两套语言各写一套格式化
  "flasks.hm": { en: "{h}h {m}m", zh: "{h} 小时 {m} 分" },
  "flasks.h": { en: "{h}h", zh: "{h} 小时" },
  "flasks.m": { en: "{m}m", zh: "{m} 分钟" },
};
