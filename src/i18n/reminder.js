// 「今天要做的事」——原为进站弹窗，现已改成主页上的一张卡（pages/Home/TodayTasks.jsx）。
// key 名里的 modal 是历史包袱，留着是为了不动翻译；每条一行：key -> { en, zh }。
export default {
  "reminder.modal.title": { en: "What's on today", zh: "今天要做的事" },
  "reminder.modal.sub": { en: "{count} things need your attention", zh: "有 {count} 件事等你处理" },
  "reminder.modal.empty": { en: "All clear — nothing pending today 🌿", zh: "都清空啦，今天没有待办 🌿" },
  "reminder.item.focus": { en: "Focus on this now", zh: "现在专注这件事" },
  "reminder.section.overdue": { en: "Overdue", zh: "已逾期" },
  "reminder.section.dueToday": { en: "Due today", zh: "今天截止" },
  "reminder.section.soon": { en: "Due soon", zh: "即将到期" },
  "reminder.section.recurring": { en: "Today's routines", zh: "今日循环" },
  "reminder.section.highPriority": { en: "High priority", zh: "高优先级" },
  "reminder.section.others": { en: "Other to-dos", zh: "其他待办" },
};
