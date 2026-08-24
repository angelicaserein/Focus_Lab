// 备忘录页（/memo）：时间线、标签筛选、AI 整理成任务弹窗。
export default {
  "memo.title": { en: "Memos", zh: "备忘录" },
  "memo.subtitle": {
    en: "Jot things down anytime — notes taken while focusing land here too",
    zh: "随时记下想法，专注时的备忘也会汇总到这里",
  },

  // ── 新建 ──────────────────────────────────────────────────────────────────
  "memo.composePlaceholder": {
    en: "Write something… (Enter to add, Shift+Enter for a new line)",
    zh: "写点什么…（Enter 添加，Shift+Enter 换行）",
  },
  "memo.add": { en: "Add", zh: "添加" },

  // ── 筛选 ──────────────────────────────────────────────────────────────────
  "memo.filter.all": { en: "All", zh: "全部" },
  "memo.filter.memo": { en: "General Notes", zh: "常规备忘" },
  "memo.filter.focus": { en: "Focus Notes", zh: "专注备忘" },
  "memo.clearTagFilter": { en: "Clear tag filter", zh: "清除标签筛选" },

  // ── 空状态 ────────────────────────────────────────────────────────────────
  "memo.emptyFocus": {
    en: "No focus notes yet — jot one down during an immersive session",
    zh: "还没有专注备忘，去沉浸式专注里记录一条吧",
  },
  "memo.empty": {
    en: "No memos yet — write down your first thought",
    zh: "还没有备忘，写下你的第一条想法",
  },

  // ── 单条备忘 ──────────────────────────────────────────────────────────────
  "memo.item.selectHint": { en: "Select to turn into tasks", zh: "选中以整理成任务" },
  "memo.item.badgeFocus": { en: "⛯ Focus Notes", zh: "⛯ 专注备忘" },
  "memo.item.badgeManual": { en: "✎ General Notes", zh: "✎ 常规备忘" },
  "memo.item.edit": { en: "Edit", zh: "编辑" },
  "memo.item.delete": { en: "Delete", zh: "删除" },
  "memo.item.save": { en: "Save", zh: "保存" },
  "memo.item.cancel": { en: "Cancel", zh: "取消" },
  "memo.tag.filterBy": { en: "Filter by this tag", zh: "按此标签筛选" },
  "memo.tag.remove": { en: "Remove tag", zh: "移除标签" },
  "memo.tag.placeholder": { en: "Tag name, Enter to confirm", zh: "标签名，回车确认" },
  "memo.tag.add": { en: "+ Tag", zh: "＋ 标签" },

  // ── 选中后的浮动操作条 ────────────────────────────────────────────────────
  "memo.selectedCount": { en: "{count} selected", zh: "已选 {count} 条" },
  "memo.clearSelection": { en: "Clear", zh: "清空" },
  "memo.organize": { en: "Turn into tasks", zh: "整理成任务" },
  "memo.savedToDatabase": {
    en: "Added {count} tasks to “{name}”",
    zh: "已加入 {count} 条任务到「{name}」",
  },
  "memo.defaultDatabase": { en: "Tasks", zh: "任务" },

  // ── AI 整理弹窗 ───────────────────────────────────────────────────────────
  "memo.ai.title": { en: "Turn notes into tasks", zh: "AI 整理成任务" },
  "memo.ai.close": { en: "Close", zh: "关闭" },
  "memo.ai.loading": { en: "AI is sorting this out…", zh: "AI 正在帮你整理…" },
  "memo.ai.error": { en: "Couldn't sort that out — try again later", zh: "整理失败，请稍后再试" },
  "memo.ai.noTasks": {
    en: "No actionable tasks found — try a different passage?",
    zh: "没有识别到可执行的任务，换一段话试试？",
  },
  "memo.ai.hint": {
    en: "Tick the tasks to keep — titles are editable. They go into the current database.",
    zh: "勾选要加入的任务，可直接修改标题。确认后加入当前任务库。",
  },
  "memo.ai.taskPlaceholder": { en: "Task title", zh: "任务标题" },
  // 开了「先反问」但这轮没问：模型认为不必问，或反问那步失败了（两者对用户是一回事）
  "memo.ai.noClarify": {
    en: "No questions this time — split directly.",
    zh: "本次无追问，已直接拆。",
  },
  // 逐条「再细化」：把一行原地换成它拆出来的几条（只有倒脑子给了 onRefine 才出现）
  "memo.ai.refine": { en: "Break down", zh: "再细化" },
  "memo.ai.refining": { en: "Breaking down…", zh: "拆解中…" },
  "memo.ai.refineNone": {
    en: "That one's already small enough to start.",
    zh: "这条已经够小了，可以直接上手。",
  },
  "memo.ai.refineFailed": { en: "Couldn't break that down — try again", zh: "拆解失败，再试一次" },
  "memo.ai.refineUndo": { en: "Undo break down", zh: "撤回细化" },
  "memo.ai.cancel": { en: "Cancel", zh: "取消" },
  "memo.ai.commit": { en: "Add {count} tasks", zh: "加入 {count} 条任务" },
  "memo.ai.dropped": {
    en: "The current database has no “{names}” column, so those fields won't be saved. Add the columns on the Tasks page and organize again.",
    zh: "当前任务库没有「{names}」列，这些字段不会保存。可在任务页为当前库添加这些列后再整理。",
  },
  // 列名之间的分隔符：中文顿号，英文逗号
  "memo.ai.listSep": { en: ", ", zh: "、" },
  "memo.ai.chipDue": { en: "due {date}", zh: "截止 {date}" },
  "memo.ai.chipNotes": { en: "Notes", zh: "备注" },
};
