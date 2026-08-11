// 历史页（/history）。
// 注意：history.chatTitle / history.notes 等聊天与随记区的 key 早先落在 focus.js，
// 那边是专注页共用的，别在这里重复定义。
// outcome.* 与 utils/records/focusRecords.js 的 OUTCOME_META.labelKey 一一对应。
export default {
  "history.title": { en: "History", zh: "历史记录" },
  // 统计卡与图表已整体归口到 /analytics，这里只剩原始流水，副标题指路过去。
  "history.subtitle": {
    en: "Every session and note, as written. Numbers and charts live in Analytics.",
    zh: "每一次专注、每一条随记的原文。统计与图表在「数据分析」。",
  },

  // ── 全部记录 ──────────────────────────────────────────────────────────────
  "history.allRecords": { en: "All records", zh: "全部记录" },
  "history.clear": { en: "Clear records", zh: "清除记录" },
  "history.clearConfirm": { en: "Clear for real?", zh: "确认清除？" },
  "history.empty": {
    en: "No focus records yet. Head to Focus and start your first session!",
    zh: "还没有专注记录。去 Focus 页面开始你的第一次专注吧！",
  },
  "history.taskCount": { en: "{count} tasks", zh: "{count} 个任务" },
  "history.netFocus": { en: "net {duration}", zh: "净 {duration}" },
  "history.netFocusTitle": {
    en: "Proactive distractions {duration} — this is the net focus time",
    zh: "主动分心 {duration}，净专注时间",
  },

  "history.outcome.completed": { en: "Done", zh: "完成" },
  "history.outcome.removed": { en: "Removed", zh: "移除" },
  "history.outcome.ended": { en: "Ended", zh: "结束" },

  // ── 当日流水（DayLog）─────────────────────────────────────────────────────
  // activity.* 与 utils/records/activityLog.js 的 ACTIVITY_META.labelKey 一一对应。
  "history.activity.add": { en: "Added", zh: "添加" },
  "history.activity.complete": { en: "Done", zh: "完成" },
  "history.activity.uncomplete": { en: "Undone", zh: "取消完成" },
  "history.activity.delete": { en: "Deleted", zh: "删除" },
  // 同类动作挤在 5 分钟内会并成一条，这是并起来的条数后缀（前导空格是与正文的间隔）
  "history.activityMore": { en: " +{count} more", zh: " 等 {count} 项" },
  "history.dayEmpty": { en: "Nothing recorded on this day", zh: "这一天还没有记录" },

  // 分心密度评价（次/小时）
  "history.quality.deep": { en: "Deep focus", zh: "深度专注" },
  "history.quality.good": { en: "Focused", zh: "专注良好" },
  "history.quality.scattered": { en: "Scattered", zh: "容易分心" },
};
