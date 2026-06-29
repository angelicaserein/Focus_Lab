export const DEVICE_OPTIONS = [
  { id: "computer",   label: "电脑",  icon: "💻" },
  { id: "phone",      label: "手机",  icon: "📱" },
  { id: "tablet",     label: "平板",  icon: "🖥" },
  { id: "paper",      label: "纸笔",  icon: "📝" },
  { id: "headphones", label: "耳机",  icon: "🎧" },
];

export const COMM_OPTIONS = [
  { id: "talking",  label: "可以说话" },
  { id: "textonly", label: "只能文字" },
  { id: "silent",   label: "保持安静" },
];

export const TASK_TYPE_OPTIONS = [
  { id: "deep_work",     label: "深度工作", icon: "🧠" },
  { id: "admin",         label: "事务处理", icon: "📋" },
  { id: "creative",      label: "创意思考", icon: "💡" },
  { id: "communication", label: "沟通协作", icon: "💬" },
  { id: "reading",       label: "阅读学习", icon: "📖" },
];

// 情景设置的单一默认值与判定逻辑，避免各处内联默认对象与形状判断。
export const DEFAULT_SCENARIO_SETTINGS = {
  devices: [],
  communication: "",
  taskTypes: [],
};

// 是否填写过任何一项情景设置（用于设置按钮的 active 高亮）。
export function hasScenarioSettings(scenario) {
  const s = scenario?.settings;
  if (!s) return false;
  return (
    (s.devices?.length ?? 0) > 0 ||
    !!s.communication ||
    (s.taskTypes?.length ?? 0) > 0
  );
}
