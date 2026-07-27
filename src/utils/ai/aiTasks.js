// ──────────────────────────────────────────────────────────────
//  AI 笔记 → 任务 抽取
//
//  把一段自由文本（专注随记 / 备忘录 / 随手倒出来的话）交给 AI，
//  拆解成结构化任务：{ text, attrs: { priority, tags, dueDate, ... } }。
//
//  三种模式（与 aiChat.js 对齐，自动切换）：
//  1. 生产环境（Vercel）→ 调用 /api/extract-tasks 代理，API key 在服务器侧
//  2. 本地开发 + 有 VITE_OPENAI_API_KEY → 直接调用 SDK
//  3. 本地开发 + 无 key → 返回示例候选（便于离线跑通 UI）
//
//  结构化字段只映射到「目标库真实存在的同名列」，缺列的字段自动跳过。
// ──────────────────────────────────────────────────────────────
//
//  三模式的机械件（配置 / hasApiKey / delay / SDK 直连 / 代理请求 / JSON 提取）见 aiClient.js。

import { IS_PROD, hasApiKey, delay, chatComplete, postProxy, extractJson } from "@/utils/ai/aiClient";

export { hasApiKey };

// 抽取识别的约定列 id（与 taskAttrDefaults.js 一致）。
// 仅当目标库存在同 id 的列时，对应字段才会被应用。
const KNOWN_ATTR_IDS = ["priority", "tags", "dueDate", "estimatedMins", "notes"];

// ── prompt 构建 ──────────────────────────────────────────────

// 描述某个属性列可填的值，供模型参考（select/multiselect 给出合法 option）。
function describeAttr(attr) {
  if (attr.type === "select" || attr.type === "multiselect") {
    const opts = (attr.options ?? [])
      .map((o) => `"${o.id}"(${o.label})`)
      .join(" / ");
    const kind = attr.type === "multiselect" ? "字符串数组，取值仅限" : "字符串，取值仅限";
    return `${attr.id}（${attr.name}）：${kind} ${opts}`;
  }
  if (attr.type === "date") return `${attr.id}（${attr.name}）：字符串，格式 YYYY-MM-DD`;
  if (attr.type === "number") {
    const unit = attr.unit ? `，单位「${attr.unit}」` : "";
    return `${attr.id}（${attr.name}）：数字${unit}`;
  }
  return `${attr.id}（${attr.name}）：字符串`;
}

// 从目标库的列 schema 生成「可用字段」说明。空库时只剩标题。
// 仅列出 KNOWN_ATTR_IDS 中、且目标库确实拥有的列，避免让模型给自定义列瞎填。
export function buildSchemaHint(database) {
  const attrs = (database?.attrs ?? []).filter((a) => KNOWN_ATTR_IDS.includes(a.id));
  if (!attrs.length) {
    return "该任务库只有任务标题，没有其它字段，因此每个任务只需输出 text。";
  }
  const lines = attrs.map((a) => `- ${describeAttr(a)}`);
  return [
    "每个任务可附带以下可选字段（不确定就省略，不要编造）：",
    ...lines,
  ].join("\n");
}

function buildSystemPrompt(schemaHint) {
  return [
    "你是一个帮助 ADHD 用户整理思绪的助手。用户会给你一段零散的笔记或想法，",
    "你要把其中可执行的事项拆解成一组简洁、具体、可立即行动的任务。",
    "",
    "规则：",
    "- 只输出一个 JSON 数组，不要任何额外文字或代码围栏。",
    "- 数组每个元素形如 { \"text\": \"任务标题\", ... 可选字段 }。",
    "- text 要精炼可执行（动词开头更好），不要照抄整段原文。",
    "- 语言跟随用户输入：输入是中文就用中文，输入是英文就用英文，混合时以主要语言为准。",
    "- 若某件事明显体量较大或含多个步骤，可拆成 2–4 个更小、能立刻上手的子任务；简单的一句话不要硬拆，避免碎片化。",
    "- 没有明确可执行事项时，返回空数组 []。",
    "- 不确定的字段一律省略，不要瞎填。",
    "",
    schemaHint,
  ].join("\n");
}

// ── 输出解析 ─────────────────────────────────────────────────

// 鲁棒解析模型输出：剥代码围栏、定位首个 JSON 数组、失败兜底 []。
export function parseTasksJson(raw) {
  if (Array.isArray(raw)) return raw.filter((t) => t && typeof t.text === "string");
  // 剥围栏 + 定位首个 '[' 到最后一个 ']'，容忍前后的解释性文字
  const arr = extractJson(raw, "array");
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((t) => t && typeof t.text === "string" && t.text.trim())
    .map((t) => ({ text: t.text.trim(), attrs: extractRawAttrs(t) }));
}

// 从模型给的任务对象里挑出已知属性字段（其余忽略）。校验留给 sanitizeTaskAttrs。
function extractRawAttrs(task) {
  const out = {};
  for (const id of KNOWN_ATTR_IDS) {
    if (task[id] !== undefined && task[id] !== null) out[id] = task[id];
  }
  return out;
}

// ── 属性清洗 ─────────────────────────────────────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// 把模型给的原始属性映射到目标库：
//  - 只保留库里真实存在的列（按约定 id 匹配）
//  - select/multiselect 校验 option id 合法
//  - date 校验 YYYY-MM-DD；number 转数字
// 返回 { attrs, dropped }，dropped 为「模型给了值但目标库没这列」的列名（供 UI 提示）。
export function sanitizeTaskAttrs(proposedAttrs = {}, database) {
  const schema = database?.attrs ?? [];
  const byId = new Map(schema.map((a) => [a.id, a]));
  const attrs = {};
  const dropped = [];

  for (const [id, rawVal] of Object.entries(proposedAttrs)) {
    if (!KNOWN_ATTR_IDS.includes(id)) continue;
    const attr = byId.get(id);
    const labels = { priority: "优先级", tags: "标签", dueDate: "截止日期", estimatedMins: "预计时长", notes: "备注" };
    if (!attr) {
      if (!dropped.includes(labels[id])) dropped.push(labels[id]);
      continue;
    }
    const cleaned = cleanValue(attr, rawVal);
    if (cleaned !== undefined) attrs[id] = cleaned;
  }
  return { attrs, dropped };
}

function cleanValue(attr, val) {
  switch (attr.type) {
    case "select": {
      const ok = (attr.options ?? []).some((o) => o.id === val);
      return ok ? val : undefined;
    }
    case "multiselect": {
      const valid = new Set((attr.options ?? []).map((o) => o.id));
      const arr = (Array.isArray(val) ? val : [val]).filter((v) => valid.has(v));
      return arr.length ? arr : undefined;
    }
    case "date":
      return typeof val === "string" && DATE_RE.test(val) ? val : undefined;
    case "number": {
      const n = Number(val);
      return Number.isFinite(n) ? n : undefined;
    }
    default: {
      const s = String(val).trim();
      return s || undefined;
    }
  }
}

// ── 离线示例候选（无 key 时用，便于跑通 UI）──────────────────

// 无 key 的离线示例：也跟随输入语言（中文输入给中文样例，英文给英文），
// 好让「输入什么语言就出什么语言」的行为在没配 key 时也能演示。
function sampleTasks(database, input = "") {
  const has = (id) => (database?.attrs ?? []).some((a) => a.id === id);
  const zh = /[一-鿿]/.test(input);
  const t1 = { text: zh ? "示例：给下周的报告列个大纲" : "Sample: Outline next week's report", attrs: {} };
  const t2 = { text: zh ? "示例：回复导师的邮件" : "Sample: Reply to advisor's email", attrs: {} };
  if (has("priority")) t2.attrs.priority = "urgent_important";
  if (has("tags")) t1.attrs.tags = ["project"];
  if (has("estimatedMins")) t1.attrs.estimatedMins = 25;
  return [t1, t2];
}

// ── 主入口 ───────────────────────────────────────────────────

// 返回候选任务数组 [{ text, attrs }]。attrs 此时仍是「原始」值，
// 由调用方（hook）在落库时用 sanitizeTaskAttrs 针对目标库再清洗一次。
export async function extractTasksFromText(text, { database } = {}) {
  const input = (text ?? "").trim();
  if (!input) return [];

  const schemaHint = buildSchemaHint(database);

  // 本地开发且无 key → 示例候选
  if (!hasApiKey()) {
    await delay(500 + Math.random() * 400);
    return sampleTasks(database, input);
  }

  // 生产环境 → 服务器代理
  if (IS_PROD) {
    const { tasks } = await postProxy("/api/extract-tasks", { text: input, schemaHint });
    return parseTasksJson(tasks);
  }

  // 本地开发 + 有 key → 直连 SDK
  const raw = await chatComplete({
    system: buildSystemPrompt(schemaHint),
    user: input,
    maxTokens: 1024,
  });
  return parseTasksJson(raw);
}
