// ──────────────────────────────────────────────────────────────
//  AI 情境配置助手
//
//  用户用一句自然语言描述所处情境（「在图书馆戴耳机安静写论文」），AI 就把它
//  翻译成一份情境配置：该选哪些设备、用哪条交流规则、偏好哪些任务类型。
//  为了「自由度高一点」，AI 输出的是 label 而非固定 id——既能命中现有选项，也能
//  提出全新选项（落地时按需新建，见 scenarioConfigPlan.js）。
//
//  三种模式（与 aiRecommend.js / aiTasks.js 对齐，自动切换）：
//  1. 生产环境（Vercel）→ 调用 /api/scenario-config 代理，API key 在服务器侧
//  2. 本地开发 + 有 VITE_OPENAI_API_KEY → 动态 import SDK 直连
//  3. 本地开发 + 无 key → 离线示例（按关键词做一次朴素解析，便于跑通 UI）
// ──────────────────────────────────────────────────────────────

import { IS_PROD, hasApiKey, delay, chatComplete, postProxy, extractJson } from "@/utils/ai/aiClient";

export { hasApiKey };

// ── prompt 构建 ──────────────────────────────────────────────

export function buildSystemPrompt() {
  return [
    "你在帮 ADHD 用户把一句情境描述整理成一份「情境配置」。",
    "配置有三个维度：可用设备（可多选）、交流规则（单选）、任务类型偏好（可多选）。",
    "用户会给出他的描述，以及各维度现有的可选项清单。",
    "",
    "规则：",
    "- 现有清单里能对上的，直接沿用清单里的原文，不要改写。",
    "- 描述里出现清单没有的合理项，可以大胆新增一个简短中文词（如设备「录音笔」、交流规则「戴降噪」）。",
    "- 任务类型只能从给定清单里挑，挑不到就不填，别硬凑。",
    "- 交流规则只给一个最贴切的。",
    "- 只输出一个 JSON 对象，不要任何额外文字或代码围栏。",
    '- 形如 { "devices": ["电脑","耳机"], "communication": "保持安静", "taskTypes": ["深度工作"], "note": "一句话说明这套配置" }。',
    "- note 不超过 25 字，温柔、具体。",
  ].join("\n");
}

// 把用户描述 + 现有选项清单压成给模型的输入文本。
export function buildUserPayload(prompt, { deviceOptions = [], commOptions = [], tagOptions = [] } = {}) {
  const labels = (arr) => (arr.map((o) => o.label).filter(Boolean).join("、") || "（无）");
  return [
    `情境描述：${(prompt ?? "").trim() || "（未填写）"}`,
    "",
    "现有可选项：",
    `- 设备：${labels(deviceOptions)}`,
    `- 交流规则：${labels(commOptions)}`,
    `- 任务类型（只能从这里选）：${labels(tagOptions)}`,
  ].join("\n");
}

// ── 输出解析 ─────────────────────────────────────────────────

// 鲁棒解析模型输出为 { devices:string[], communication:string, taskTypes:string[], note:string }。
export function parseConfigJson(raw) {
  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw) ? raw : extractJson(raw, "object");
  if (!obj) return { devices: [], communication: "", taskTypes: [], note: "" };
  const strList = (v) =>
    Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim()) : [];
  return {
    devices: strList(obj.devices),
    communication: typeof obj.communication === "string" ? obj.communication.trim() : "",
    taskTypes: strList(obj.taskTypes),
    note: typeof obj.note === "string" ? obj.note.trim() : "",
  };
}

// ── 无 key 离线示例：朴素关键词解析，够跑通 UI ────────────────
const DEVICE_HINTS = [
  ["电脑", ["电脑", "笔记本", "电脑上", "computer", "laptop", "代码", "编程", "写论文", "文档"]],
  ["手机", ["手机", "phone"]],
  ["平板", ["平板", "ipad", "tablet"]],
  ["纸笔", ["纸笔", "纸", "笔记本子", "手写", "本子"]],
  ["耳机", ["耳机", "降噪", "音乐", "headphone"]],
];
const COMM_HINTS = [
  ["保持安静", ["安静", "图书馆", "自习", "别说话", "silent"]],
  ["只能文字", ["文字", "打字", "聊天", "消息", "text"]],
  ["可以说话", ["开会", "讨论", "语音", "打电话", "说话", "talk"]],
];

function localSuggest(prompt, { deviceOptions = [], commOptions = [], tagOptions = [] } = {}) {
  const text = (prompt ?? "").toLowerCase();
  const hit = (kws) => kws.some((k) => text.includes(k.toLowerCase()));

  const devices = DEVICE_HINTS.filter(([, kws]) => hit(kws)).map(([label]) => label);
  const commEntry = COMM_HINTS.find(([, kws]) => hit(kws));
  const communication = commEntry ? commEntry[0] : "";

  // 任务类型只能命中现有标签：标签词出现在描述里就选上。
  const taskTypes = tagOptions
    .filter((o) => o.label && text.includes(o.label.toLowerCase()))
    .map((o) => o.label);

  return {
    devices: devices.length ? devices : deviceOptions.slice(0, 1).map((o) => o.label),
    communication,
    taskTypes,
    note: "示例：已按描述里的关键词粗略配置，可再手动微调 🌱",
  };
}

// ── 主入口 ───────────────────────────────────────────────────

// prompt: 用户的自然语言描述；options: { deviceOptions, commOptions, tagOptions }。
// 返回 { devices, communication, taskTypes, note }（均为 label）。
export async function suggestScenarioConfig(prompt, options = {}) {
  if (!(prompt ?? "").trim()) {
    return { devices: [], communication: "", taskTypes: [], note: "" };
  }

  // 模式 3：本地开发且无 key → 离线示例。
  if (!hasApiKey()) {
    await delay(400 + Math.random() * 300);
    return localSuggest(prompt, options);
  }

  // 模式 1：生产环境 → 服务器代理。
  if (IS_PROD) {
    const { result } = await postProxy("/api/scenario-config", { prompt, options });
    return parseConfigJson(result);
  }

  // 模式 2：本地开发 + 有 key → 直连 SDK。
  const raw = await chatComplete({
    system: buildSystemPrompt(),
    user: buildUserPayload(prompt, options),
    maxTokens: 300,
  });
  return parseConfigJson(raw);
}
