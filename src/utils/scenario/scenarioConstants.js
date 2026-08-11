// 设备 / 交流规则的「出厂默认」选项。它们只作为种子：首次使用时灌入
// 可自定义的选项表（见 ScenarioContext 的 scenarioOptions），此后用户增删改
// 都作用在那份持久化副本上，不再回头读这里。
export const DEVICE_OPTIONS = [
  { id: "computer",   labelKey: "scenario.device.computer",   icon: "💻" },
  { id: "phone",      labelKey: "scenario.device.phone",      icon: "📱" },
  { id: "tablet",     labelKey: "scenario.device.tablet",     icon: "🖥" },
  { id: "paper",      labelKey: "scenario.device.paper",      icon: "📝" },
  { id: "headphones", labelKey: "scenario.device.headphones", icon: "🎧" },
];

export const COMM_OPTIONS = [
  { id: "talking",  labelKey: "scenario.comm.talking" },
  { id: "textonly", labelKey: "scenario.comm.textonly" },
  { id: "silent",   labelKey: "scenario.comm.silent" },
];

// 可自定义选项表的初始形状（设备 / 交流规则均为种子默认）。
export const DEFAULT_SCENARIO_OPTIONS = {
  devices: DEVICE_OPTIONS,
  communication: COMM_OPTIONS,
};

export const TASK_TYPE_OPTIONS = [
  { id: "project", labelKey: "scenario.taskType.project", icon: "📁" }, // 做项目、开发、写论文
  { id: "job",     labelKey: "scenario.taskType.job",     icon: "💼" }, // 找工作、面试、投简历
  { id: "chore",   labelKey: "scenario.taskType.chore",   icon: "🧺" }, // 买菜、洗衣服、日常杂事
  { id: "fun",     labelKey: "scenario.taskType.fun",     icon: "🎮" }, // 看电影、聚餐、看动漫
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
