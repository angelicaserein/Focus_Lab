// 每日研究记录页：系统自动数据、自评量表、回顾记录、主观感受、CSV 导出表头。
export default {
  "research.title": { en: "Daily research log", zh: "每日研究记录" },
  "research.prevDay": { en: "Previous day", zh: "前一天" },
  "research.nextDay": { en: "Next day", zh: "后一天" },
  "research.saved": { en: "Saved", zh: "已保存" },
  "research.unsaved": { en: "Unsaved", zh: "未保存" },

  "research.auto.title": { en: "System data", zh: "系统记录" },
  "research.auto.hint": {
    en: "Computed automatically from focus sessions — read-only",
    zh: "由专注会话自动计算，只读",
  },
  "research.auto.emptyToday": {
    en: "No focus sessions today yet — data appears here once you finish one",
    zh: "今日暂无专注记录，完成专注后数据将自动显示",
  },
  "research.auto.emptyDay": { en: "No focus sessions on this date", zh: "该日期无专注记录" },
  "research.auto.maxFocus": { en: "Longest focus session", zh: "最大专注时长" },
  "research.auto.totalFocus": { en: "Total focus today", zh: "今日总专注时长" },
  "research.auto.distractions": { en: "Live distraction count", zh: "实时分心次数" },
  "research.auto.tasksDone": { en: "Tasks completed", zh: "任务完成数" },

  "research.scale.title": { en: "Self-rating scales", zh: "自评量表" },
  "research.scale.hint": {
    en: "Tap to rate; tap again to clear",
    zh: "点击选择评分，再次点击可取消",
  },
  "research.scale.focusLevel": { en: "Overall focus", zh: "整体专注程度" },
  "research.scale.focusLevel.low": { en: "Scattered", zh: "分心" },
  "research.scale.focusLevel.high": { en: "Focused", zh: "专注" },
  "research.scale.startDifficulty": { en: "Difficulty getting started", zh: "启动困难程度" },
  "research.scale.startDifficulty.low": { en: "Hard", zh: "困难" },
  "research.scale.startDifficulty.high": { en: "Easy", zh: "容易" },
  "research.scale.moodState": { en: "Mood", zh: "心情状态" },
  "research.scale.moodState.low": { en: "Anxious", zh: "焦虑" },
  "research.scale.moodState.high": { en: "Calm", zh: "平静" },
  "research.scale.point": { en: "{label}, {n} out of 5", zh: "{label} {n}分" },

  "research.retro.title": { en: "Looking back", zh: "回顾记录" },
  "research.retro.hint": {
    en: "Fill in from memory — it may differ from the system data",
    zh: "根据主观感受填写，可与系统记录不同",
  },
  "research.retro.distractions": { en: "Distractions, in hindsight", zh: "回顾分心次数" },
  "research.retro.distractionsUnit": { en: "times", zh: "次" },
  "research.retro.procrastination": { en: "Time spent procrastinating", zh: "自感拖延时间" },
  "research.retro.procrastinationUnit": { en: "minutes", zh: "分钟" },

  "research.experience.title": { en: "How it felt", zh: "主观感受" },
  "research.experience.hint": {
    en: "Freely note down today's focus experience",
    zh: "自由记录今天的专注体验",
  },
  "research.experience.placeholder": {
    en: "How did focusing feel today? Anything you want to note down…",
    zh: "今天专注时感觉怎么样？有什么想记录的……",
  },

  "research.save": { en: "Save entry", zh: "保存记录" },
  "research.update": { en: "Update entry", zh: "更新记录" },
  "research.export": { en: "Export CSV", zh: "导出 CSV" },
  "research.savedTick": { en: "Saved ✓", zh: "已保存 ✓" },

  "research.csv.date": { en: "Date", zh: "日期" },
  "research.csv.maxFocus": { en: "Longest focus (sec)", zh: "最大专注时长(秒)" },
  "research.csv.totalFocus": { en: "Total focus today (sec)", zh: "今日总专注时长(秒)" },
  "research.csv.distractions": { en: "Live distraction count", zh: "实时分心次数" },
  "research.csv.tasksDone": { en: "Tasks completed", zh: "任务完成数" },
  "research.csv.focusLevel": { en: "Overall focus (1-5)", zh: "整体专注程度(1-5)" },
  "research.csv.startDifficulty": { en: "Difficulty starting (1-5)", zh: "启动困难程度(1-5)" },
  "research.csv.moodState": { en: "Mood (1-5)", zh: "心情状态(1-5)" },
  "research.csv.retroDistractions": { en: "Distractions in hindsight", zh: "回顾分心次数" },
  "research.csv.procrastination": { en: "Procrastination (min)", zh: "自感拖延时间(分钟)" },
  "research.csv.experience": { en: "How it felt", zh: "主观感受" },
  "research.csv.savedAt": { en: "Saved at", zh: "保存时间" },
};
