export const STORAGE_KEYS = {
  // 业务数据
  TODOS:            "todos_v1",
  SCENARIOS:        "scenarios_v1",
  ACTIVE_SCENARIO:  "active_scenario_v1",
  FOCUS_RECORDS:    "focus_records_v1",
  // 专注会话
  CHAT:             "focus_chat_v1",
  NOTES:            "focus_notes_v1",
  DISTRACTIONS:     "focus_distractions_v1",
  // 备忘录（手动随时添加，与专注随记合并展示）
  MEMOS:            "memos_v1",
  // 研究日志
  RESEARCH_RECORDS: "research_daily_v1",
  // 奖励系统
  COINS:            "coins_v1",
  REWARD_OWNED:     "reward_owned_v1",
  REWARD_REDEEM:    "reward_redeem_v1",
  REWARD_CUSTOM:    "reward_custom_v1",
  ACTIVE_THEME:     "active_theme_v1",
  // 任务属性定义（v6 及以前的全局 schema，v7 起折叠进 DATABASES，仅保留兼容）
  TASK_ATTRS: "task_attrs_v1",
  // 多 database（v7 起）：每个 database 含独立的列 schema
  DATABASES:  "task_databases_v1",
  ACTIVE_DB:  "active_database_v1",
  // 偏好设置
  PREF_POMODORO_MINS: "pref_pomodoro_mins_v1",
  PREF_ANIM_ENABLED:  "pref_anim_enabled_v1",
  PREF_CARD_VISIBLE:  "pref_card_visible_v1",
  PREF_NOTIFY_ENABLED: "pref_notify_enabled_v1",
  // DDL 提醒节点
  DDL_CHECKPOINTS:    "ddl_checkpoints_v1",
  DDL_MODAL_DISMISSED: "ddl_modal_dismissed_v1",
  DDL_NOTIFIED:       "ddl_notified_v1",
};
