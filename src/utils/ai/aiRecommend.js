// ──────────────────────────────────────────────────────────────
//  AI 推荐精排 / 解释（可选增强层）
//
//  规则打分器（scenarioRecommend.js）先给出候选与初排，本模块把候选连同
//  当前情景交给 AI，做一次「重排 + 一句话理由」。属于锦上添花：任何失败 /
//  无 key 都回退到规则顺序，不阻塞主流程。
//
//  三种模式（与 aiChat.js / aiTasks.js 对齐，自动切换）：
//  1. 生产环境（Vercel）→ 调用 /api/recommend 代理，API key 在服务器侧
//  2. 本地开发 + 有 VITE_OPENAI_API_KEY → 直接调用 SDK
//  3. 本地开发 + 无 key → 离线示例（给规则 Top1 套一句通用理由，便于跑通 UI）
// ──────────────────────────────────────────────────────────────
//
//  注意：openai SDK 只在「本地开发 + 有 key」这一分支用得到，且它是
//  面向服务端的重依赖。这里用动态 import() 按需加载，避免把它静态打进浏览器
//  懒加载 chunk —— 否则首次进入本页会触发 Vite 运行时重新优化依赖、整页刷新，
//  期间新旧两份 React 并存导致「Invalid hook call / dispatcher is null」。
//  三模式的机械件（配置 / hasApiKey / delay / SDK 直连 / 代理请求 / JSON 提取）见 aiClient.js。

import { IS_PROD, hasApiKey, delay, chatComplete, postProxy, extractJson } from "@/utils/ai/aiClient";

export { hasApiKey };

// ── prompt 构建 ──────────────────────────────────────────────

function buildSystemPrompt() {
  return [
    "你是一个帮助 ADHD 用户「此刻该做哪件事」做决策的助手。",
    "用户会给你当前所处情景（环境、能否说话、设备、任务类型偏好）和一组候选任务。",
    "请结合情景，把候选任务按「现在最适合做」从前到后重排，并给最靠前的几条一句简短中文理由。",
    "",
    "规则：",
    "- 只输出一个 JSON 对象，不要任何额外文字或代码围栏。",
    '- 形如 { "order": ["任务id", ...], "reasons": { "任务id": "一句话理由" } }。',
    "- order 必须是传入候选 id 的重排（不增不减）。",
    "- reasons 只需给前 3 条，理由不超过 20 字，温柔、具体、可执行。",
  ].join("\n");
}

// 把情景 + 候选压成给模型的用户输入文本。
export function buildUserPayload(candidates, { scenario, envProfile } = {}) {
  const s = scenario?.settings ?? {};
  const lines = [
    `情景：${scenario?.title ?? "（未命名）"}${scenario?.description ? "（" + scenario.description + "）" : ""}`,
    `设备：${(s.devices ?? []).join("、") || "未设置"}`,
    `交流：${s.communication || "未设置"}`,
    `任务类型偏好：${(s.taskTypes ?? []).join("、") || "未设置"}`,
    `环境时长偏好：${envProfile?.label || "无特别偏好"}`,
    "",
    "候选任务：",
    ...candidates.map((c) => {
      const a = c.attrs ?? {};
      const meta = [
        a.priority ? `优先级=${a.priority}` : null,
        a.tags?.length ? `标签=${a.tags.join("/")}` : null,
        a.dueDate ? `截止=${a.dueDate}` : null,
        a.estimatedMins != null ? `预计=${a.estimatedMins}分` : null,
      ].filter(Boolean).join(" ");
      return `- id=${c.id}｜${c.text}${meta ? "｜" + meta : ""}`;
    }),
  ];
  return lines.join("\n");
}

// ── 输出解析 ─────────────────────────────────────────────────

// 鲁棒解析模型输出：剥代码围栏、定位首个 JSON 对象、失败兜底空结果。
// 返回 { order: string[], reasons: Record<id,string> }。
export function parseRecommendJson(raw) {
  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw) ? raw : extractJson(raw, "object");
  return obj ? normalizeResult(obj) : { order: [], reasons: {} };
}

function normalizeResult(obj) {
  const order = Array.isArray(obj.order) ? obj.order.filter((x) => typeof x === "string") : [];
  const reasons = {};
  if (obj.reasons && typeof obj.reasons === "object") {
    for (const [k, v] of Object.entries(obj.reasons)) {
      if (typeof v === "string" && v.trim()) reasons[k] = v.trim();
    }
  }
  return { order, reasons };
}

// ── 主入口 ───────────────────────────────────────────────────

// candidates: [{ id, text, attrs }]（由规则层的 todo 精简而来）。
// 返回 { order, reasons }；调用方据 order 重排、把 reasons 合并进条目。
export async function rerankRecommendations(candidates, { scenario, envProfile, lang = "zh" } = {}) {
  if (!candidates?.length) return { order: [], reasons: {} };

  // 本地开发且无 key → 离线示例：保持规则顺序，给 Top1 一句通用理由。
  if (!hasApiKey()) {
    await delay(400 + Math.random() * 300);
    const order = candidates.map((c) => c.id);
    const top = candidates[0];
    return {
      order,
      reasons: top
        ? {
            [top.id]:
              lang === "en"
                ? "Sample: fits your current scenario — start here 🌱"
                : "示例：契合当前情景，建议先从这件开始 🌱",
          }
        : {},
    };
  }

  // 生产环境 → 服务器代理
  if (IS_PROD) {
    const { result } = await postProxy("/api/recommend", { candidates, scenario, envProfile });
    return parseRecommendJson(result);
  }

  // 本地开发 + 有 key → 直连 SDK
  const raw = await chatComplete({
    system: buildSystemPrompt(),
    user: buildUserPayload(candidates, { scenario, envProfile }),
    maxTokens: 512,
  });
  return parseRecommendJson(raw);
}
