// 分心统计页（/distraction）
// 每条一行：key -> { en, zh }。会话明细行复用历史页已有的 history.* 文案。
export default {
  "distraction.title": { en: "Distraction stats", zh: "分心统计" },
  "distraction.subtitle": {
    en: "{total} distractions logged across {sessions} focus sessions",
    zh: "共记录 {total} 次分心，涉及 {sessions} 次专注",
  },
  "distraction.empty": {
    en: "No distractions logged yet.\nTap the distraction button while focusing, and the stats show up here.",
    zh: "还没有分心记录。\n专注时点一下分心按钮，这里就会长出统计。",
  },
  "distraction.stat.total": { en: "Distractions logged", zh: "分心总次数" },
  "distraction.stat.rate": { en: "Per focused hour", zh: "每专注小时" },
  "distraction.stat.avg": { en: "Per session (avg)", zh: "平均每次专注" },
  "distraction.stat.proactive": { en: "Proactive pauses", zh: "主动暂停" },
  "distraction.stat.times": { en: "{n}×", zh: "{n} 次" },
  "distraction.stat.noRate": { en: "—", zh: "—" },
  "distraction.trend.title": { en: "Last 7 days", zh: "近 7 天" },
  "distraction.trend.badge": { en: "{n} in the last 7 days", zh: "近 7 天共 {n} 次" },
  "distraction.peak.title": { en: "When distraction hits", zh: "分心高峰时段" },
  "distraction.peak.badge": { en: "Peaks around {hour}:00", zh: "{hour} 时最易分心" },
  "distraction.peak.tooltip": { en: "{hour}:00 — {n} distractions", zh: "{hour}:00 — {n} 次分心" },
  "distraction.reasons.title": { en: "What pulls you away", zh: "分心原因排行" },
  "distraction.reasons.badge": { en: "Mostly {tag}", zh: "多为 {tag}" },
  "distraction.reasons.untagged": { en: "Untagged", zh: "未标注" },
  "distraction.sessions.title": { en: "Session by session", zh: "按会话明细" },
  "distraction.fromHistory": { en: "Distraction stats →", zh: "分心统计 →" },
};
