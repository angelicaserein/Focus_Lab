// ──────────────────────────────────────────────────────────────
//  AI 封装共用底座
//
//  五个 AI 模块（aiChat / aiTasks / aiRecommend / aiMatrixAssign /
//  aiNarrate）都照搬同一套「三模式分流」：
//    1. 生产环境（Vercel）→ 调用 /api/* 代理，API key 在服务器侧
//    2. 本地开发 + 有 VITE_OPENAI_API_KEY → 动态 import SDK 直连
//    3. 本地开发 + 无 key → 各自的离线示例
//
//  各文件仍保留自己的三模式骨架——因为「无 key 兜底」与「失败回退」
//  策略各不相同，读起来更清楚。这里只抽掉三处和业务无关、逐字重复的机械件：
//    · 配置 / hasApiKey / delay
//    · chatComplete —— 模式 2 的 SDK 直连
//    · postProxy    —— 模式 1 的服务器代理请求
//    · extractJson  —— 从模型文本里稳妥取出 JSON 对象 / 数组
// ──────────────────────────────────────────────────────────────

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || "";

// 是否处于生产环境（Vercel）。模式判断用。
export const IS_PROD = import.meta.env.PROD;

const AI_MODEL = "gpt-5.5";

// UI 用它来判断「AI 模式」还是「示例模式」。
// 无 key 兜底（模式 3）的判据 `!API_KEY && !IS_PROD` 恰好是 `!hasApiKey()`。
export const hasApiKey = () => Boolean(API_KEY) || IS_PROD;

export const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// 模式 2：本地开发 + 有 key → 直连 SDK，返回正文文本。
//  openai SDK 仅这一分支用到，按需动态 import()，不静态打进浏览器懒加载
//  chunk（否则首次进页会触发 Vite 运行时重优化 + 整页刷新，期间新旧两份
//  React 并存 → 「Invalid hook call / dispatcher is null」）。
//  传 messages 用整段对话；或传 system/user 由这里拼成两条。
export async function chatComplete({ messages, system, user, maxTokens }) {
  const msgs =
    messages ?? [
      { role: "system", content: system },
      { role: "user", content: user },
    ];
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: API_KEY, dangerouslyAllowBrowser: true });
  let resp;
  try {
    resp = await client.chat.completions.create({
      model: AI_MODEL,
      max_completion_tokens: maxTokens,
      messages: msgs,
    });
  } catch (err) {
    // 和代理那条路合流到同一套分类上：调用方只认 err.kind，不必分辨是 SDK 还是 fetch。
    throw toAiError(err);
  }
  return resp.choices[0]?.message?.content ?? "";
}

// 代理的根地址。网页版留空即可——/api/* 和页面同源。
// Electron 桌面版页面跑在 app:// 下，没有同源的服务端，必须指向已部署的站点：
// 打包前设 VITE_API_BASE=https://<你的 vercel 域名>（见 package.json 的 desktop:build）。
const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

// AI 调用失败的分类。界面上四种情况用户该做的事完全不同：
//   auth    key 失效 → 去设置检查
//   rate    限流     → 等一会儿再试
//   server  服务端挂 → 不是你的问题，稍后再来
//   network 断网     → 检查网络
// 一律只抛 `HTTP ${status}` 的话，这四种在界面上长得一模一样。
export const AI_ERROR_KINDS = ["auth", "rate", "server", "network", "unknown"];

// i18n 里对应的可执行文案（common.aiError.*，见 i18n/common.js）。
export const aiErrorMessageKey = (kind) =>
  `common.aiError.${AI_ERROR_KINDS.includes(kind) ? kind : "unknown"}`;

// 界面上一句话：认得出的失败给「该怎么办」，认不出的就用调用方自己的兜底文案。
// 各处 catch 都是这一行，不必各写一遍 kind 判断。
export const aiErrorText = (t, err, fallbackKey) => {
  const kind = err?.kind;
  return kind ? t(aiErrorMessageKey(kind)) : t(fallbackKey);
};

// 带分类的 AI 错误。catch 到之后读 err.kind 即可映射文案。
export class AiError extends Error {
  constructor(kind, message) {
    super(message || `AI error: ${kind}`);
    this.name = "AiError";
    this.kind = kind;
  }
}

// HTTP 状态码 → 分类。401/403 是 key 的问题，429 是频率，5xx 是服务端。
export function classifyStatus(status) {
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate";
  if (status >= 500) return "server";
  return "unknown";
}

// 把任意异常（fetch 抛的 TypeError、SDK 的 status 字段…）归到同一套分类上。
export function toAiError(err) {
  if (err instanceof AiError) return err;
  const status = err?.status ?? err?.response?.status;
  if (Number.isFinite(status)) return new AiError(classifyStatus(status), err?.message);
  // fetch 只在网络层失败时抛 TypeError；SDK 断网也走到这里。
  return new AiError("network", err?.message);
}

// 模式 1：POST 到服务器代理，返回已解析的响应 JSON。
//  失败抛 AiError（带 kind），由调用方决定兜底（有的回退示例、有的直接向上抛）。
export async function postProxy(endpoint, body) {
  let resp;
  try {
    resp = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    // 连请求都没发出去 —— 断网 / DNS / 被拦截，与「服务器回了个错」不是一回事。
    throw new AiError("network", err?.message);
  }
  if (!resp.ok) throw new AiError(classifyStatus(resp.status), `HTTP ${resp.status}`);
  return resp.json();
}

// 从模型文本里稳妥取出第一个 JSON 值：剥代码围栏 → 定位首尾括号 → 解析。
//  kind: "object"（默认，取 {…}）| "array"（取 […]）。失败返回 null。
export function extractJson(raw, kind = "object") {
  if (typeof raw !== "string") return null;
  const s = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const [open, close] = kind === "array" ? ["[", "]"] : ["{", "}"];
  const start = s.indexOf(open);
  const end = s.lastIndexOf(close);
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }
}
