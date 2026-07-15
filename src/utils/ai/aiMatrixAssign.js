// ──────────────────────────────────────────────────────────────
//  AI 自动分配优先级矩阵
//
//  把「未分类」托盘里的任务连同它们的属性交给 AI，让它估计每条任务的
//  紧急度 / 重要度（各 0..1），前端据此换算成矩阵落点 matrixPos={x,y}：
//    x = 1 - 紧急度（越紧急越靠左）
//    y = 1 - 重要度（越重要越靠上）
//  与「分一下」两步问答同源，只是把两个是非题交给模型一次性批量估计。
//
//  三种模式（与 aiRecommend.js / aiTasks.js 对齐，自动切换）：
//  1. 生产环境（Vercel）→ 调用 /api/assign-matrix 代理，API key 在服务器侧
//  2. 本地开发 + 有 VITE_OPENAI_API_KEY → 直接调用 SDK
//  3. 本地开发 + 无 key → 离线示例（按优先级/截止粗估一版，便于跑通 UI）
// ──────────────────────────────────────────────────────────────
//
//  三模式的机械件（配置 / hasApiKey / delay / SDK 直连 / 代理请求 / JSON 提取）见 aiClient.js。

import { IS_PROD, hasApiKey, delay, chatComplete, postProxy, extractJson } from "@/utils/ai/aiClient";

export { hasApiKey };

// gpt-5.5 是推理模型，token 预算「推理 + 正文」共用；矩阵要为每条任务
// 吐一项 JSON，任务多了 512 会被截断成空。按任务数动态留足余量。
const budgetFor = (n) => Math.min(4096, 256 + n * 48);

// ── prompt 构建 ──────────────────────────────────────────────

export function buildSystemPrompt() {
  return [
    "你是一个帮助 ADHD 用户使用「艾森豪威尔优先级矩阵」的助手。",
    "用户会给你一组尚未分类的任务（含标题与可选属性）。",
    "请为每条任务估计它的「紧急度」和「重要度」，各是 0 到 1 之间的小数。",
    "",
    "判据：",
    "- 紧急度：越接近 1 表示越需要马上处理（临近截止、拖延会出问题）。",
    "- 重要度：越接近 1 表示越关乎用户真正在乎的目标、越只有本人能做。",
    "- 已有的优先级/截止日期属性是重要参考，但也要结合任务标题语义判断。",
    "",
    "规则：",
    "- 只输出一个 JSON 对象，不要任何额外文字或代码围栏。",
    '- 形如 { "positions": { "任务id": { "urgency": 0.0, "importance": 0.0 } } }。',
    "- 必须为每条传入任务给出一项，id 原样返回，数值保留一到两位小数。",
  ].join("\n");
}

// 把候选任务压成给模型的用户输入文本（复用 aiRecommend 的属性描述风格）。
export function buildUserPayload(tasks) {
  return [
    "未分类任务：",
    ...tasks.map((c) => {
      const a = c.attrs ?? {};
      const meta = [
        a.priority ? `优先级=${a.priority}` : null,
        a.tags?.length ? `标签=${a.tags.join("/")}` : null,
        a.dueDate ? `截止=${a.dueDate}` : null,
        a.estimatedMins != null ? `预计=${a.estimatedMins}分` : null,
      ].filter(Boolean).join(" ");
      return `- id=${c.id}｜${c.text}${meta ? "｜" + meta : ""}`;
    }),
  ].join("\n");
}

// ── 输出解析 ─────────────────────────────────────────────────

const clamp01 = (v) => Math.min(1, Math.max(0, v));

// 鲁棒解析模型输出：剥代码围栏、定位首个 JSON 对象、失败兜底空结果。
// 返回 { positions: Record<id, {urgency, importance}> }（仅保留数值合法项）。
export function parseAssignJson(raw) {
  const empty = { positions: {} };
  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? raw
      : extractJson(raw, "object");
  if (!obj) return empty;
  const src = obj.positions && typeof obj.positions === "object" ? obj.positions : obj;
  const positions = {};
  for (const [id, val] of Object.entries(src)) {
    if (!val || typeof val !== "object") continue;
    const u = Number(val.urgency);
    const i = Number(val.importance);
    if (!Number.isFinite(u) || !Number.isFinite(i)) continue;
    positions[id] = { urgency: clamp01(u), importance: clamp01(i) };
  }
  return { positions };
}

// ── 离线示例（无 key 时用，便于跑通 UI）─────────────────────
// 按已有优先级/截止粗估一版，没有线索的给个中性偏中间的值。
function samplePositions(tasks) {
  const PRIORITY = {
    urgent_important: { urgency: 0.85, importance: 0.85 },
    important: { urgency: 0.4, importance: 0.8 },
    urgent: { urgency: 0.8, importance: 0.4 },
    later: { urgency: 0.25, importance: 0.25 },
  };
  const positions = {};
  for (const c of tasks) {
    const a = c.attrs ?? {};
    const base = PRIORITY[a.priority] ?? { urgency: 0.5, importance: 0.55 };
    const bump = a.dueDate ? 0.15 : 0;
    positions[c.id] = {
      urgency: clamp01(base.urgency + bump),
      importance: base.importance,
    };
  }
  return { positions };
}

// ── 主入口 ───────────────────────────────────────────────────

// tasks: [{ id, text, attrs }]（未分类的 todo 精简而来）。
// 返回 { positions }；调用方把 urgency/importance 换算成 matrixPos 落位。
export async function assignMatrixPositions(tasks) {
  if (!tasks?.length) return { positions: {} };

  // 本地开发且无 key → 离线示例
  if (!hasApiKey()) {
    await delay(500 + Math.random() * 400);
    return samplePositions(tasks);
  }

  // 生产环境 → 服务器代理
  if (IS_PROD) {
    const { result } = await postProxy("/api/assign-matrix", { tasks });
    return parseAssignJson(result);
  }

  // 本地开发 + 有 key → 直连 SDK
  const raw = await chatComplete({
    system: buildSystemPrompt(),
    user: buildUserPayload(tasks),
    maxTokens: budgetFor(tasks.length),
  });
  return parseAssignJson(raw);
}
