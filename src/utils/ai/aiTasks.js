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
import { attrName, attrUnit, optionLabel } from "@/utils/task/taskAttrUtils";
import { toDateStr } from "@/utils/time";

export { hasApiKey };

// 抽取识别的约定列 id（与 taskAttrDefaults.js 一致）。
// 仅当目标库存在同 id 的列时，对应字段才会被应用。
const KNOWN_ATTR_IDS = ["priority", "tags", "dueDate", "estimatedMins", "notes"];

// ── prompt 构建 ──────────────────────────────────────────────

// 描述某个属性列可填的值，供模型参考（select/multiselect 给出合法 option）。
// 出厂列与出厂选项的文案在 i18n 里（nameKey / labelKey / unitKey），所以要过 t——
// 直接读 attr.name 的话，喂给模型的是一串 undefined，它就只能瞎猜列的含义。
function describeAttr(attr, t) {
  const name = attrName(t, attr);
  if (attr.type === "select" || attr.type === "multiselect") {
    const opts = (attr.options ?? [])
      .map((o) => `"${o.id}"(${optionLabel(t, o)})`)
      .join(" / ");
    const kind = attr.type === "multiselect" ? "字符串数组，取值仅限" : "字符串，取值仅限";
    return `${attr.id}（${name}）：${kind} ${opts}`;
  }
  if (attr.type === "date") return `${attr.id}（${name}）：字符串，格式 YYYY-MM-DD`;
  if (attr.type === "number") {
    const unit = attrUnit(t, attr);
    return `${attr.id}（${name}）：数字${unit ? `，单位「${unit}」` : ""}`;
  }
  return `${attr.id}（${name}）：字符串`;
}

// 从目标库的列 schema 生成「可用字段」说明。空库时只剩标题。
// 仅列出 KNOWN_ATTR_IDS 中、且目标库确实拥有的列，避免让模型给自定义列瞎填。
// t 由调用方（hook）传入，默认回退成「key 原样返回」，测试与无语言上下文的调用不至于崩。
export function buildSchemaHint(database, t = (k) => k) {
  const attrs = (database?.attrs ?? []).filter((a) => KNOWN_ATTR_IDS.includes(a.id));
  if (!attrs.length) {
    return "该任务库只有任务标题，没有其它字段，因此每个任务只需输出 text。";
  }
  const lines = attrs.map((a) => `- ${describeAttr(a, t)}`);
  return [
    "每个任务可附带以下可选字段（不确定就省略，不要编造）：",
    ...lines,
  ].join("\n");
}

// 今天的日期（本地时区）+ 中文星期。模型不知道「今天」是哪天，
// 不给它就只能瞎猜，「下周三交」之类的相对表述必然算错。
export function todayHint(now = new Date()) {
  return { date: toDateStr(now), weekday: "日一二三四五六"[now.getDay()] };
}

// 拆任务的 prompt。与 api/extract-tasks.mjs 里的同名函数逐字一致，改一处要改两处。
export function buildSystemPrompt(schemaHint, today = todayHint()) {
  return [
    "你是一个帮助 ADHD 用户整理思绪的助手。用户会给你一段零散的笔记或想法，",
    "你要把其中「原文已经提到」的待办事项挑出来，整理成简洁、具体、可立即行动的任务。",
    "",
    `今天是 ${today.date}（星期${today.weekday}）。`,
    "",
    "粒度规则（最重要，宁可少拆也不要多拆）：",
    "- 默认「原文提到的一件事 = 一条任务」。不要替用户设计他没写过的步骤。",
    "- 只有当原文自己写明了多个步骤、或那件事明显要跨多天才做得完时，才拆成 2–4 条子任务；",
    "  这时不要再额外输出一条概括性的父任务，同一件事只在结果里出现一次。",
    "- 一句话只讲了一件事，就只出一条任务，绝不拆。",
    "- 情绪、感受、抱怨、自我评价，以及原文说已经做完的事，都不产生任务。",
    "",
    "保真规则：",
    "- 保留原文里的人名、课程名、文件名、数字、地点、条件，不要抽象成「相关材料」「某人」。",
    "- text 用动词开头、精炼可执行，但不得改变原意，也不得补充原文没有的信息。",
    "- 语言跟随用户输入：输入是中文就用中文，输入是英文就用英文，混合时以主要语言为准。",
    "",
    "输出规则：",
    "- 只输出一个 JSON 数组，不要任何额外文字或代码围栏。",
    "- 数组每个元素形如 { \"text\": \"任务标题\", ... 可选字段 }。",
    "- 相对日期（明天 / 下周三 / 月底）按上面的今天换算成 YYYY-MM-DD；算不出确定日期就省略该字段。",
    "- 没有明确可执行事项时，返回空数组 []。",
    "- 原文没写的字段一律省略，不要靠猜补齐。",
    "",
    "示例——",
    "输入：「明天下午之前把统计课的作业三交了，还得给王老师回邮件问答辩时间，最近好累」",
    "输出：[{\"text\":\"提交统计课作业三\"},{\"text\":\"给王老师回邮件问答辩时间\"}]",
    "（两件事各一条，不再细拆；「最近好累」是感受，不产生任务。）",
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
export async function extractTasksFromText(text, { database, t } = {}) {
  const input = (text ?? "").trim();
  if (!input) return [];

  const schemaHint = buildSchemaHint(database, t);
  // 「今天」在浏览器本地时区算好再发给代理——服务器跑在 UTC，自己算会差一天。
  const today = todayHint();

  // 本地开发且无 key → 示例候选
  if (!hasApiKey()) {
    await delay(500 + Math.random() * 400);
    return sampleTasks(database, input);
  }

  // 生产环境 → 服务器代理
  if (IS_PROD) {
    const { tasks } = await postProxy("/api/extract-tasks", { text: input, schemaHint, today });
    return parseTasksJson(tasks);
  }

  // 本地开发 + 有 key → 直连 SDK
  const raw = await chatComplete({
    system: buildSystemPrompt(schemaHint, today),
    user: input,
    maxTokens: 1024,
  });
  return parseTasksJson(raw);
}
