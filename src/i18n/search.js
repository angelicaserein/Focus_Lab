// search.* 命名空间：侧边栏顶部的跨页搜索。
// 结果分组的名字复用 nav.* / 各页自己的词条时会漂移，故这里单独写一套「类别」名。
export default {
  "search.placeholder": { en: "Search everything", zh: "搜索全部" },
  "search.clear": { en: "Clear search", zh: "清空搜索" },
  "search.empty": { en: "Nothing found", zh: "没找到相关内容" },
  "search.more": { en: "{n} more", zh: "还有 {n} 条" },
  "search.fromFocus": { en: "Focus Notes", zh: "专注备忘" },
  "search.kind.page": { en: "Pages", zh: "页面" },
  "search.kind.task": { en: "Tasks", zh: "任务" },
  "search.kind.memo": { en: "Notes", zh: "备忘" },
  "search.kind.scenario": { en: "Scenarios", zh: "情景" },
  "search.kind.action": { en: "Actions", zh: "动作" },

  // 命令面板里的动作项。这些是「直接做一件事」，不是「打开某一页」，
  // 所以名字用动词开头，和页面名区分得开。
  "search.action.startFocus": { en: "Start a focus session", zh: "开始一次专注" },
  "search.action.newTask": { en: "Add a task", zh: "新建任务" },
  "search.action.newMemo": { en: "Jot a note", zh: "记一条随记" },
  "search.action.exportData": { en: "Export a backup", zh: "导出数据备份" },

  // 面板底部的键盘提示：已有的快捷键得有人说一声，否则只能靠碰巧撞上
  "search.hint.keys": { en: "↑↓ to move · Enter to open · Esc to close", zh: "↑↓ 选择 · 回车打开 · Esc 关闭" },
  "search.hint.hotkey": { en: "Ctrl/⌘ K", zh: "Ctrl/⌘ K" },
};
