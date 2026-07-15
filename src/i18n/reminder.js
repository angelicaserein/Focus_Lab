// 进站/PWA 启动时的「今天要做什么」待办提醒弹窗
// 每条一行：key -> { en, zh }。新增可见文案时在此补齐两份。
export default {
  "reminder.modal.title": { en: "What's on today", zh: "今天要做的事" },
  "reminder.modal.sub": { en: "{count} things need your attention", zh: "有 {count} 件事等你处理" },
  "reminder.modal.debugPreview": { en: "(debug preview)", zh: "（调试预览）" },
  "reminder.modal.empty": { en: "All clear — nothing pending today 🌿", zh: "都清空啦，今天没有待办 🌿" },
  "reminder.modal.goto": { en: "Go to Focus", zh: "前往专注" },
  "reminder.modal.dismiss": { en: "Got it", zh: "知道了" },
  "reminder.section.overdue": { en: "Overdue", zh: "已逾期" },
  "reminder.section.dueToday": { en: "Due today", zh: "今天截止" },
  "reminder.section.soon": { en: "Due soon", zh: "即将到期" },
  "reminder.section.recurring": { en: "Today's routines", zh: "今日循环" },
  "reminder.section.highPriority": { en: "High priority", zh: "高优先级" },
  "reminder.section.others": { en: "Other to-dos", zh: "其他待办" },
};
