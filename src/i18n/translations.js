// 应用文案字典。新增可见文案时在此补 en / zh 两份。
// key 采用 "命名空间.名称" 的扁平结构，t() 缺失时回退到 en，再回退到 key 本身。
export const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "zh", label: "中文" },
];

export const DEFAULT_LANG = "en";

const en = {
  // 侧边栏导航
  "nav.section.daily": "Daily",
  "nav.section.review": "Review",
  "nav.section.config": "Config",
  "nav.home": "Home",
  "nav.focus": "Focus",
  "nav.tasks": "Tasks",
  "nav.memo": "Memo",
  "nav.ddl": "Deadlines",
  "nav.history": "History",
  "nav.analytics": "Analytics",
  "nav.scenarioStats": "Scenario Stats",
  "nav.scenario": "Scenarios",
  "nav.reward": "Rewards",
  "nav.settings": "Settings",
  "nav.research": "Research Log",
  "sidebar.currentScenario": "Current scenario",
  "sidebar.noScenario": "No scenario",
  "sidebar.openNav": "Open navigation",
  "sidebar.closeNav": "Close navigation",

  // 主页
  "home.quickstart": "▶ Start focusing",

  // 专注热力图
  "heatmap.title": "Focus heatmap",
  "heatmap.total": "Focused {hours}{mins}m in the past year",
  "heatmap.empty": "Log your first focus session!",
  "heatmap.cellFocus": "{date} · Focused {duration}",
  "heatmap.cellEmpty": "{date} · No records",
  "heatmap.less": "Less",
  "heatmap.more": "More",

  // 设置页
  "settings.title": "Settings",

  // 设置 - 外观主题
  "settings.theme.title": "Appearance theme",
  "settings.theme.hint": "Unlock skins in the Rewards shop, then switch them here.",
  "settings.theme.default": "Default",
  "settings.theme.defaultDesc": "Original purple tone",
  "settings.theme.current": "Active",
  "settings.theme.unlockHint": "🪙 {price} to unlock",

  // 设置 - 语言
  "settings.lang.title": "Language",
  "settings.lang.hint": "Changes apply immediately across the app.",

  // 设置 - 专注偏好
  "settings.prefs.title": "Focus preferences",
  "settings.prefs.hint": "Changes take effect immediately, applied on your next session.",
  "settings.prefs.countupFull": "Count-up flask-full length (min)",
  "settings.prefs.countdown": "Countdown length (min)",
  "settings.prefs.anim": "3D animation",
  "settings.prefs.notify": "Desktop notifications",
  "settings.prefs.on": "On",
  "settings.prefs.off": "Off",
  "settings.prefs.notifyUnsupported": "This browser does not support desktop notifications.",
  "settings.prefs.notifyDenied": "Notifications are blocked by the browser. Allow them in the site permission settings, then turn this on.",
  "settings.prefs.notifyHint": "When on, flask-full alerts and today's deadlines alert you via system notifications (even on other tabs).",
  "settings.prefs.notifyEnabledTitle": "🔔 Notifications enabled",
  "settings.prefs.notifyEnabledBody": "Flask-full alerts and deadline reminders will show up here.",

  // 设置 - 数据管理
  "settings.data.title": "Data management",
  "settings.data.hint": "All data is stored locally in your browser. Export a backup before clearing browser cache.",
  "settings.data.usage": "Used space: about {kb} KB",
  "settings.data.count": "{label} ({count})",
  "settings.data.export": "Export data",
  "settings.data.import": "Import data",
  "settings.data.importSuccess": "Imported {count} data items, reloading…",
  "settings.data.importError": "Import failed: {error}",
  "settings.data.dangerTitle": "Danger zone",
  "settings.data.confirmClear": "Confirm clear",
  "settings.data.cancel": "Cancel",
  "settings.data.clearFocus": "Clear focus records",
  "settings.data.clearChat": "Clear chat history",
  "settings.data.label.todos": "Tasks",
  "settings.data.label.scenarios": "Scenarios",
  "settings.data.label.focusRecords": "Focus records",
  "settings.data.label.notes": "Notes",
  "settings.data.label.distractions": "Distractions",
  "settings.data.label.chatHistory": "Chat",
};

const zh = {
  "nav.section.daily": "每日",
  "nav.section.review": "回顾",
  "nav.section.config": "配置",
  "nav.home": "主页",
  "nav.focus": "专注",
  "nav.tasks": "任务库",
  "nav.memo": "备忘录",
  "nav.ddl": "DDL 提醒",
  "nav.history": "历史记录",
  "nav.analytics": "数据分析",
  "nav.scenarioStats": "情景统计",
  "nav.scenario": "情境配置",
  "nav.reward": "奖励",
  "nav.settings": "设置",
  "nav.research": "研究记录",
  "sidebar.currentScenario": "当前情景",
  "sidebar.noScenario": "无情景",

  "home.quickstart": "▶ 开始专注",

  "heatmap.title": "专注热力图",
  "heatmap.total": "过去一年共专注 {hours}{mins}m",
  "heatmap.empty": "快去记录你的第一次专注吧！",
  "heatmap.cellFocus": "{date} · 专注 {duration}",
  "heatmap.cellEmpty": "{date} · 无记录",
  "heatmap.less": "少",
  "heatmap.more": "多",

  "settings.title": "设置",

  "settings.theme.title": "外观主题",
  "settings.theme.hint": "在「奖励」商城解锁皮肤后即可在此切换",
  "settings.theme.default": "默认",
  "settings.theme.defaultDesc": "原始紫色调",
  "settings.theme.current": "当前",
  "settings.theme.unlockHint": "🪙 {price} 可解锁",

  "settings.lang.title": "语言",
  "settings.lang.hint": "切换后立即在全应用生效。",

  "settings.prefs.title": "专注偏好",
  "settings.prefs.hint": "更改即时生效，下次进入沉浸模式时应用。",
  "settings.prefs.countupFull": "正计时·烧瓶注满时长（分钟）",
  "settings.prefs.countdown": "倒计时时长（分钟）",
  "settings.prefs.anim": "3D 动画",
  "settings.prefs.notify": "桌面通知",
  "settings.prefs.on": "开启",
  "settings.prefs.off": "关闭",
  "settings.prefs.notifyUnsupported": "当前浏览器不支持桌面通知。",
  "settings.prefs.notifyDenied": "通知已被浏览器拦截，请在地址栏的网站权限设置中手动允许后再开启。",
  "settings.prefs.notifyHint": "开启后，烧瓶注满和今日 DDL 会以系统通知提醒你（即使切到其它标签页）。",
  "settings.prefs.notifyEnabledTitle": "🔔 通知已开启",
  "settings.prefs.notifyEnabledBody": "烧瓶注满与 DDL 提醒会在这里提醒你。",

  "settings.data.title": "数据管理",
  "settings.data.hint": "所有数据保存在本地浏览器中。清除浏览器缓存前请先导出备份。",
  "settings.data.usage": "占用空间：约 {kb} KB",
  "settings.data.count": "{label}（{count}条）",
  "settings.data.export": "导出数据",
  "settings.data.import": "导入数据",
  "settings.data.importSuccess": "已成功导入 {count} 项数据，即将重新加载…",
  "settings.data.importError": "导入失败：{error}",
  "settings.data.dangerTitle": "危险操作",
  "settings.data.confirmClear": "确认清除",
  "settings.data.cancel": "取消",
  "settings.data.clearFocus": "清除专注记录",
  "settings.data.clearChat": "清除聊天记录",
  "settings.data.label.todos": "待办",
  "settings.data.label.scenarios": "情境",
  "settings.data.label.focusRecords": "专注记录",
  "settings.data.label.notes": "随记",
  "settings.data.label.distractions": "分心",
  "settings.data.label.chatHistory": "聊天",
};

export const TRANSLATIONS = { en, zh };
