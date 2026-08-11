// 数据分析页（/analytics）与情境统计页（/scenariostats）。
// 时间段 / 时长分桶的 key 与 utils/analytics/analyticsUtils.js 的 labelKey 一一对应，
// 改名请两边同步。
export default {
  // ── 页头与空状态 ──────────────────────────────────────────────────────────
  "analytics.title": { en: "Analytics", zh: "数据分析" },
  // 副标题回答「这页到底在分析什么」，正好对应下面三节的顺序
  "analytics.subtitle": {
    en: "Your focus patterns: when you do it best, how long you last, where the time goes.",
    zh: "你的专注规律：什么时候状态最好、每次能撑多久、时间都花在哪儿。",
  },
  "analytics.empty": { en: "No focus records yet.", zh: "还没有专注记录。" },
  "analytics.emptyHint": {
    en: "Finish a few focus sessions and your insights will show up here!",
    zh: "先去完成几次专注，这里就会出现洞察！",
  },
  "analytics.untitled": { en: "(untitled)", zh: "(未命名)" },

  // ── 0. 结论卡 + 近 7 天（原先是历史页顶部那 5 张等大统计卡） ───────────────
  // total 是卡上唯一放大的数字，其余三个是同一行的副指标，故标签都做短。
  "analytics.stat.total": { en: "Total focus", zh: "累计专注" },
  "analytics.stat.sessions": { en: "over {count} sessions", zh: "共 {count} 次专注" },
  "analytics.stat.today": { en: "Today", zh: "今天" },
  "analytics.stat.longest": { en: "Longest", zh: "最长一次" },
  "analytics.stat.average": { en: "Average", zh: "平均每次" },
  "analytics.chartTitle": { en: "Last 7 days", zh: "近 7 天" },

  // ── 1. 专注高峰时段 ───────────────────────────────────────────────────────
  "analytics.peak.title": { en: "When you focus best", zh: "专注高峰时段" },
  "analytics.peak.badge": { en: "Most focus in the {block}", zh: "{block}专注最多" },
  "analytics.peak.completion": { en: "{rate}% completed", zh: "完成率 {rate}%" },
  "analytics.hourTick": { en: "{hour}:00", zh: "{hour}时" },

  "analytics.block.earlyMorning": { en: "early morning", zh: "早晨" },
  "analytics.block.morning": { en: "morning", zh: "上午" },
  "analytics.block.noon": { en: "early afternoon", zh: "午后" },
  "analytics.block.afternoon": { en: "late afternoon", zh: "下午" },
  "analytics.block.evening": { en: "evening", zh: "晚上" },
  "analytics.block.lateNight": { en: "late night", zh: "深夜" },
  "analytics.block.dawn": { en: "small hours", zh: "凌晨" },

  // ── 2. 专注时长分布 ───────────────────────────────────────────────────────
  "analytics.duration.title": { en: "How long each session runs", zh: "每次专注多久" },
  "analytics.duration.badge": { en: "{avg} on average", zh: "平均 {avg}" },
  "analytics.duration.count": { en: "{count}×", zh: "{count} 次" },

  "analytics.bucket.under15": { en: "< 15 min", zh: "< 15分钟" },
  "analytics.bucket.15to30": { en: "15–30 min", zh: "15–30分" },
  "analytics.bucket.30to60": { en: "30–60 min", zh: "30–60分" },
  "analytics.bucket.1to2h": { en: "1–2 h", zh: "1–2小时" },
  "analytics.bucket.over2h": { en: "> 2 h", zh: "> 2小时" },

  // ── 3. 任务榜（投入时长 + 完成率合成一张表） ──────────────────────────────
  "analytics.tasks.title": { en: "Where your time went", zh: "时间都花在哪儿" },
  "analytics.tasks.badge": { en: "Most time on “{task}”", zh: "{task} 花时间最多" },
  "analytics.tasks.sub": { en: "{duration} · {count}×", zh: "{duration} · {count} 次" },
  // 完成率只在任务出现 ≥2 次时才有参考价值，不足 2 次这一列直接不显示
  "analytics.tasks.rate": { en: "{rate}% done", zh: "完成 {rate}%" },

  // ── 页尾出口 ──────────────────────────────────────────────────────────────
  // 本页给全局结论；细节各有专页，只放链接，不再往页里塞它们的摘要。
  "analytics.more": { en: "Go deeper", zh: "想看更细的" },

  // ── 情景统计页（/scenariostats） ──────────────────────────────────────────
  "scenarioStats.title": { en: "Scenario stats", zh: "情景统计" },
  "scenarioStats.back": { en: "← Scenarios", zh: "← 情景列表" },
  "scenarioStats.empty": {
    en: "No scenario focus records yet.",
    zh: "还没有任何情景专注记录。",
  },
  "scenarioStats.emptyHint": { en: "Go start a focus session!", zh: "去开始一次专注吧！" },

  "scenarioStats.totalSecs": { en: "Total in scenarios", zh: "情景累计时长" },
  "scenarioStats.totalSessions": { en: "Scenario sessions", zh: "情景专注次数" },
  "scenarioStats.scenarioCount": { en: "Scenarios used", zh: "使用过的情景" },

  "scenarioStats.colScenario": { en: "Scenario", zh: "情景" },
  "scenarioStats.colSessions": { en: "Sessions", zh: "次数" },
  "scenarioStats.colDuration": { en: "Time", zh: "时长" },
  "scenarioStats.colLastUsed": { en: "Last used", zh: "上次使用" },

  "scenarioStats.unclassified": { en: "(no scenario)", zh: "(未分类)" },
  "scenarioStats.sessionCount": { en: "{count}×", zh: "{count}次" },
  "scenarioStats.last7Days": { en: "Last 7 days", zh: "近 7 天" },
  "scenarioStats.topTasks": { en: "Frequent tasks", zh: "常用任务" },
  "scenarioStats.taskCount": { en: "{count}×", zh: "{count} 次" },
};
