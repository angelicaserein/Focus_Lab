// 情境相关的共享常量文案：可用设备 / 交流规则 / 任务类型，以及规则推荐给出的理由标签。
// 这些不只在情境页用——任务库的「标签」列、专注页的推荐条都读同一批 key。
export default {
  "scenario.device.computer": { en: "Computer", zh: "电脑" },
  "scenario.device.phone": { en: "Phone", zh: "手机" },
  "scenario.device.tablet": { en: "Tablet", zh: "平板" },
  "scenario.device.paper": { en: "Pen & paper", zh: "纸笔" },
  "scenario.device.headphones": { en: "Headphones", zh: "耳机" },

  "scenario.comm.talking": { en: "Can talk", zh: "可以说话" },
  "scenario.comm.textonly": { en: "Text only", zh: "只能文字" },
  "scenario.comm.silent": { en: "Keep quiet", zh: "保持安静" },

  "scenario.taskType.project": { en: "Project", zh: "项目" },
  "scenario.taskType.job": { en: "Job hunt", zh: "求职" },
  "scenario.taskType.chore": { en: "Chores", zh: "琐事" },
  "scenario.taskType.fun": { en: "Fun", zh: "玩耍" },

  "scenario.env.long": { en: "Good for deep work", zh: "适合深度工作" },
  "scenario.env.short": { en: "Good for small tasks", zh: "适合碎片任务" },
  "scenario.due.overdue": { en: "Overdue", zh: "已逾期" },
  "scenario.due.today": { en: "Due today", zh: "今天截止" },
  "scenario.due.soon": { en: "Due soon", zh: "即将截止" },
  "scenario.due.week": { en: "Due this week", zh: "本周截止" },
  "scenario.fit.deep": { en: "Fits deep focus right now", zh: "适合此刻深度投入" },
  "scenario.fit.short": { en: "A short task fits well", zh: "短任务正合适" },
  "scenario.reason.tag": { en: "Matches this scenario", zh: "契合当前情景" },
  "scenario.reason.priority": { en: "{label} priority", zh: "{label}优先级" },
};
