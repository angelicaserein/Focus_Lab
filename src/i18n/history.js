// history.* 命名空间：记录流水（时间轴页 /calendar 的「全部记录」视图、DayLog、
// 会话详情里的聊天/随记/分心区、分心与情景统计共用）。
// outcome.* 与 utils/records/focusRecords.js 的 OUTCOME_META.labelKey 一一对应。
export default {
  // ── 全部记录 ──────────────────────────────────────────────────────────────
  "history.allRecords": { en: "All records", zh: "全部记录" },
  // 时间轴页顶部的视图切换：日历 / 全部记录（后者复用 allRecords）
  "history.viewCalendar": { en: "Calendar", zh: "日历" },
  "history.viewSwitchAria": { en: "Record view", zh: "记录视图" },
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
  "history.activityExpand": { en: "Show all", zh: "展开全部" },
  "history.activityCollapse": { en: "Collapse", zh: "收起" },
  "history.dayEmpty": { en: "Nothing recorded on this day", zh: "这一天还没有记录" },

  // ── 会话详情：聊天与随记 ──────────────────────────────────────────────────
  "history.chatTitle": { en: "Chat", zh: "聊天记录" },
  "history.aiDemoNote": { en: "AI offline · demo replies", zh: "AI 未连接 · 演示回复" },
  "history.clearChat": { en: "Clear", zh: "清空" },
  "history.noChat": { en: "No conversation yet", zh: "还没有对话" },
  "history.notes": { en: "Notes", zh: "随记" },

  // ── 会话详情：分心 ────────────────────────────────────────────────────────
  // 分心密度评价（次/小时）
  "history.quality.deep": { en: "Deep focus", zh: "深度专注" },
  "history.quality.good": { en: "Focused", zh: "专注良好" },
  "history.quality.scattered": { en: "Scattered", zh: "容易分心" },
  "history.distractPerHour": { en: "{rate}/h", zh: "{rate} 次/h" },
  "history.mostly": { en: "Mostly {tag}", zh: "多为 {tag}" },
  "history.fewerThanLast": { en: "{n} fewer than last time", zh: "比上次少 {n} 次" },
  "history.moreThanLast": { en: "{n} more than last time", zh: "比上次多 {n} 次" },
  "history.sameAsLast": { en: "Same as last time", zh: "与上次持平" },
  "history.nthDistraction": { en: "Distraction #{n}", zh: "第 {n} 次分心" },
  "history.proactivePause": { en: "proactive pause", zh: "主动暂停" },
  "history.toggleDistractions": { en: "Show distractions in this session", zh: "看这次专注的分心记录" },
};
