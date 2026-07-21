export const STORAGE_KEYS = {
  // 业务数据
  TODOS:            "todos_v1",
  SCENARIOS:        "scenarios_v1",
  ACTIVE_SCENARIO:  "active_scenario_v1",
  // 情境配置的可自定义选项表（设备 / 交流规则），全局共享、跨情境
  SCENARIO_OPTIONS: "scenario_options_v1",
  FOCUS_RECORDS:    "focus_records_v1",
  // 专注会话
  CHAT:             "focus_chat_v1",
  NOTES:            "focus_notes_v1",
  DISTRACTIONS:     "focus_distractions_v1",
  // 备忘录（手动随时添加，与专注随记合并展示）
  MEMOS:            "memos_v1",
  // 研究日志
  RESEARCH_RECORDS: "research_daily_v1",
  // 项目甘特图：v1 是单张写死研究计划的任务列表（已废弃，保留仅为兼容旧数据）
  GANTT_TASKS:      "gantt_tasks_v1",
  // 通用甘特图 maker（v2 起）：多项目，每个项目含独立时间轴 / 泳道 / 任务
  GANTT_PROJECTS:       "gantt_projects_v1",
  GANTT_ACTIVE_PROJECT: "gantt_active_project_v1",
  // 奖励系统
  COINS:            "coins_v1",
  REWARD_OWNED:     "reward_owned_v1",
  REWARD_REDEEM:    "reward_redeem_v1",
  REWARD_CUSTOM:    "reward_custom_v1",
  ACTIVE_THEME:     "active_theme_v1",
  // 可解锁技能树：已解锁的节点 id 列表（游戏化试验分支，唯一新增的持久化状态）
  SKILLTREE_UNLOCKED: "skilltree_unlocked_v1",
  // 功能树：被用户「关掉」的功能路径列表。默认空数组＝全部开启；核心功能不入内。
  DISABLED_FEATURES: "disabled_features_v1",
  // 角色卡/结算卡的「语气包」：用户输入 prompt 后 AI 生成的一整套质化文案覆盖
  TONE_PACK: "tone_pack_v1",
  // 伙伴 / 祈愿（二游式无损收集）：已遇见的图鉴 id 列表、当前佩戴的立绘皮肤 id
  COMPANION_COLLECTION: "companion_collection_v1",
  COMPANION_OUTFIT:     "companion_outfit_v1",
  // 生态缸（金币换鱼的无损收集）：已入住的物种 id 列表
  AQUARIUM_COLLECTION:  "aquarium_collection_v1",
  // 任务属性定义（v6 及以前的全局 schema，v7 起折叠进 DATABASES，仅保留兼容）
  TASK_ATTRS: "task_attrs_v1",
  // 多 database（v7 起）：每个 database 含独立的列 schema
  DATABASES:  "task_databases_v1",
  ACTIVE_DB:  "active_database_v1",
  // 偏好设置
  // 正计时：烧瓶注满所需时长；倒计时：起始时长（两者独立）。
  // 这两项记录专注页「当前选中」的时长，随用户在专注页选择而变化。
  PREF_COUNTUP_FULL_MINS: "pref_countup_full_mins_v1",
  PREF_COUNTDOWN_MINS:    "pref_countdown_mins_v1",
  // 专注页时长的三档快捷预设（设置页可自定义），正/倒计时各一套
  PREF_COUNTUP_PRESETS:   "pref_countup_presets_v1",
  PREF_COUNTDOWN_PRESETS: "pref_countdown_presets_v1",
  // 计时模式：countup（正计时）| countdown（倒计时）
  PREF_TIMER_MODE:    "pref_timer_mode_v1",
  // 专注页烧瓶形状（设置页可自定义）：round | triangle | beaker
  PREF_FLASK_SHAPE:   "pref_flask_shape_v1",
  PREF_ANIM_ENABLED:  "pref_anim_enabled_v1",
  PREF_CARD_VISIBLE:  "pref_card_visible_v1",
  PREF_NOTIFY_ENABLED: "pref_notify_enabled_v1",
  PREF_LANG:          "pref_lang_v1",
  // DDL 提醒节点
  DDL_CHECKPOINTS:    "ddl_checkpoints_v1",
  DDL_MODAL_DISMISSED: "ddl_modal_dismissed_v1",
  DDL_NOTIFIED:       "ddl_notified_v1",
};
