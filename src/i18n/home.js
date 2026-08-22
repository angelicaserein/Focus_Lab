// 主页：快速开始 + 今日委托 + 专注热力图
// 每条一行：key -> { en, zh }。新增可见文案时在此补齐两份。
export default {
  "home.quickstart": { en: "▶ Start focusing", zh: "▶ 开始专注" },

  // 今日委托：数据层 pages/Home/commissionsData.js，UI 在 pages/Home/TodayQuests.jsx。
  // commission.* 的 key 是按委托 id 动态拼的（`commission.${id}`），grep 搜不到字面量，
  // 别当无引用清掉——加/删委托要同步改 COMMISSIONS 池。
  "home.quests.title": { en: "Today, gently", zh: "今天，慢慢来" },
  "home.quests.lumiDone": { en: "You've already been kind to today. 💛", zh: "今天，你已经对自己挺好了。💛" },
  "home.quests.lumiOpen": { en: "No pressure — here are a few gentle ideas.", zh: "别有压力——这里有几个温柔的小点子。" },
  "home.quests.note": { en: "Ideas, not obligations — do any, skip any. They quietly tick themselves when you've done them.", zh: "一些点子，不是任务——做哪个、跳哪个都行。做到了它会自己悄悄打上勾。" },
  "home.quests.doneLabel": { en: "done today", zh: "今天已做到" },
  "commission.showUp": { en: "Show up for one small focus", zh: "来一次小小的专注" },
  "commission.clean": { en: "One calm, distraction-free stretch", zh: "一段安安静静、不被打扰的时光" },
  "commission.explore": { en: "Spend some time in one of your scenarios", zh: "在你的某个情景里待一会儿" },
  "commission.settle": { en: "Settle in for fifteen unhurried minutes", zh: "从容地坐上十五分钟" },
  "commission.gather": { en: "Let a little focus add up today", zh: "让今天的专注一点点攒起来" },
  "heatmap.title": { en: "Focus heatmap", zh: "专注热力图" },
  "heatmap.total": { en: "Focused {hours}{mins}m in the past year", zh: "过去一年共专注 {hours}{mins}m" },
  "heatmap.empty": { en: "Log your first focus session!", zh: "快去记录你的第一次专注吧！" },
  "heatmap.cellFocus": { en: "{date} · Focused {duration}", zh: "{date} · 专注 {duration}" },
  "heatmap.cellEmpty": { en: "{date} · No records", zh: "{date} · 无记录" },
  "heatmap.less": { en: "Less", zh: "少" },
  "heatmap.more": { en: "More", zh: "多" },
};
