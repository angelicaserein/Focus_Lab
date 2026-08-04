// ──────────────────────────────────────────────────────────────
//  AI 封装共用底座
//
//  六个 AI 模块（aiChat / aiTasks / aiRecommend / aiMatrixAssign /
//  aiTone / aiNarrate）都照搬同一套「三模式分流」：
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
  const resp = await client.chat.completions.create({
    model: AI_MODEL,
    max_completion_tokens: maxTokens,
    messages: msgs,
  });
  return resp.choices[0]?.message?.content ?? "";
}

// 代理的根地址。网页版留空即可——/api/* 和页面同源。
// Electron 桌面版页面跑在 app:// 下，没有同源的服务端，必须指向已部署的站点：
// 打包前设 VITE_API_BASE=https://<你的 vercel 域名>（见 package.json 的 desktop:build）。
const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

// 模式 1：POST 到服务器代理，返回已解析的响应 JSON。
//  失败抛错，由调用方决定兜底（有的回退示例、有的直接向上抛）。
export async function postProxy(endpoint, body) {
  const resp = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
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
