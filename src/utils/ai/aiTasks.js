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
import { buildRulesHint } from "@/utils/ai/taskSplitPrefs";
import { toDateStr } from "@/utils/time";

export { hasApiKey };

// 抽取识别的约定列 id（与 taskAttrDefaults.js 一致）。
// 仅当目标库存在同 id 的列时，对应字段才会被应用。
const KNOWN_ATTR_IDS = ["priority", "tags", "dueDate", "notes"];

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
// rulesHint 由 taskSplitPrefs.buildRulesHint 生成（粒度档位 / 自定义规矩 / 本轮反问答案），
// 拆多拆少全在那一段里，这里只保留与偏好无关的保真与输出约定。
export function buildSystemPrompt(schemaHint, today = todayHint(), rulesHint = "") {
  return [
    "你是一个帮助 ADHD 用户整理思绪的助手。用户会给你一段零散的笔记或想法，",
    "你要把其中「原文已经提到」的待办事项挑出来，整理成简洁、具体、可立即行动的任务。",
    "",
    `今天是 ${today.date}（星期${today.weekday}）。`,
    "",
    rulesHint || DEFAULT_RULES_HINT,
    "",
    "保真规则：",
    "- 只处理原文提到的事，不要替用户新增他没写过的待办。",
    "- 保留原文里的人名、课程名、文件名、数字、地点、条件，不要抽象成「相关材料」「某人」。",
    "- 拆步骤时可以补出「做这件事必然要经过的动作」，但不得编造原文没有的事实（新的人、新的死期、新的文件）。",
    "- text 用动词开头、精炼可执行，不得改变原意。",
    "- 语言跟随用户输入：输入是中文就用中文，输入是英文就用英文，混合时以主要语言为准。",
    "- 情绪、感受、抱怨、自我评价，以及原文说已经做完的事，都不产生任务。",
    "",
    "输出规则：",
    "- 只输出一个 JSON 数组，不要任何额外文字或代码围栏。",
    "- 数组每个元素形如 { \"text\": \"任务标题\", ... 可选字段 }。",
    "- 相对日期（明天 / 下周三 / 月底）按上面的今天换算成 YYYY-MM-DD；算不出确定日期就省略该字段。",
    "- 没有明确可执行事项时，返回空数组 []。",
    "",
    schemaHint,
  ].join("\n");
}

// 调用方没给 rulesHint 时的兜底（等价于设置页的 balanced + 不猜日期）。
const DEFAULT_RULES_HINT = [
  "粒度规则：",
  "- 原文提到的一件事，若一次坐下就能做完，出一条任务。",
  "- 若那件事明显要好几步、或要跨天才做得完，拆成 2–4 条可依次执行的子任务；",
  "  这时不要再额外输出一条概括性的父任务，同一件事只在结果里出现一次。",
  "- 原文没写明死期就不要填 dueDate，别靠语气猜。",
].join("\n");

// ── 输出解析 ─────────────────────────────────────────────────

// 鲁棒解析模型输出：剥代码围栏、定位首个 JSON 数组、失败兜底 []。
export function parseTasksJson(raw) {
  // 已经是数组（调用方自己解析过）就跳过剥壳，但**归一化这一步不能跳**：
  // 以前这里直接把原始对象原样返回，属性还平铺在顶层、没有 attrs，
  // 与另一条分支出来的形状不是一个东西，落库时那些属性会静静消失。
  const arr = Array.isArray(raw)
    ? raw
    // 剥围栏 + 定位首个 '[' 到最后一个 ']'，容忍前后的解释性文字
    : extractJson(raw, "array");
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
    const labels = { priority: "优先级", tags: "标签", dueDate: "截止日期", notes: "备注" };
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
  return [t1, t2];
}

// ── 主入口 ───────────────────────────────────────────────────

// 返回候选任务数组 [{ text, attrs }]。attrs 此时仍是「原始」值，
// 由调用方（hook）在落库时用 sanitizeTaskAttrs 针对目标库再清洗一次。
// prefs / answers：设置页的拆分偏好，与本轮反问里用户给的回答。
export async function extractTasksFromText(text, { database, t, prefs, answers } = {}) {
  const input = (text ?? "").trim();
  if (!input) return [];

  const schemaHint = buildSchemaHint(database, t);
  const rulesHint = buildRulesHint(prefs, answers);
  // 「今天」在浏览器本地时区算好再发给代理——服务器跑在 UTC，自己算会差一天。
  const today = todayHint();

  // 本地开发且无 key → 示例候选
  if (!hasApiKey()) {
    await delay(500 + Math.random() * 400);
    return sampleTasks(database, input);
  }

  // 生产环境 → 服务器代理
  if (IS_PROD) {
    const { tasks } = await postProxy("/api/extract-tasks", {
      text: input,
      schemaHint,
      today,
      rulesHint,
    });
    return parseTasksJson(tasks);
  }

  // 本地开发 + 有 key → 直连 SDK
  const raw = await chatComplete({
    system: buildSystemPrompt(schemaHint, today, rulesHint),
    user: input,
    maxTokens: 1024,
  });
  return parseTasksJson(raw);
}

// ── 反问：抽取前先确认拆法 ───────────────────────────────────
//
// 模型读一遍笔记，针对「这段内容真正含糊的地方」出 1–3 个选择题
// （比如某件事到底要不要拆到步骤、某个模糊时间算不算死期）。
// 每题自带一个默认答案，用户可以直接跳过 —— 不答就按默认走。

export function buildClarifySystemPrompt(rulesHint, today = todayHint()) {
  return [
    "你在帮一位 ADHD 用户把零散笔记整理成任务。动手之前，你要先问清楚最影响拆法的几点。",
    "",
    `今天是 ${today.date}（星期${today.weekday}）。`,
    "",
    "用户已有的偏好如下，凡是这里已经说清楚的，就不要再问：",
    rulesHint || "（无）",
    "",
    "提问规则：",
    "- 最多 3 题，最少 1 题；只问「不问就会拆错」的地方，不确定就少问。",
    "- 每题必须扣住笔记里的具体内容（点名那件事），不要问放之四海皆准的空话。",
    "- 每题给 2–4 个互斥的选项，并指定其中一个作为默认答案。",
    "- 笔记本身已经足够清楚时，返回空数组 []。",
    "- 语言跟随用户输入的主要语言。",
    "",
    "只输出一个 JSON 数组，不要任何额外文字或代码围栏。元素形如：",
    '{ "question": "「统计课作业三」要拆成步骤吗？", "options": ["不拆，一条就好", "拆成 2–4 步", "拆到最细"], "default": "拆成 2–4 步" }',
  ].join("\n");
}

// 解析反问输出：丢掉选项不足 2 个的题，default 不在 options 里就退回第一项。
export function parseQuestionsJson(raw, max = 3) {
  const arr = Array.isArray(raw) ? raw : extractJson(raw, "array");
  if (!Array.isArray(arr)) return [];
  return arr
    .map((q) => {
      const question = typeof q?.question === "string" ? q.question.trim() : "";
      const options = (Array.isArray(q?.options) ? q.options : [])
        .filter((o) => typeof o === "string" && o.trim())
        .map((o) => o.trim())
        .slice(0, 4);
      if (!question || options.length < 2) return null;
      const fallback = typeof q?.default === "string" ? q.default.trim() : "";
      return { question, options, default: options.includes(fallback) ? fallback : options[0] };
    })
    .filter(Boolean)
    .slice(0, max);
}

// 无 key 时的离线示例问题，让反问这一环在没配 key 时也能走通。
function sampleQuestions(input = "") {
  const zh = /[一-鿿]/.test(input);
  return zh
    ? [
        {
          question: "示例：这段里最大的那件事，要拆成步骤吗？",
          options: ["不拆，一条就好", "拆成 2–4 步", "拆到最细"],
          default: "拆成 2–4 步",
        },
        {
          question: "示例：没写死期的事，要我推一个日期吗？",
          options: ["不用推", "按语气推一个"],
          default: "不用推",
        },
      ]
    : [
        {
          question: "Sample: Should the biggest item here be broken into steps?",
          options: ["Keep it as one", "Break into 2–4 steps", "Break it down fully"],
          default: "Break into 2–4 steps",
        },
        {
          question: "Sample: Guess due dates for items with no deadline?",
          options: ["Don't guess", "Infer from tone"],
          default: "Don't guess",
        },
      ];
}

// 返回 [{ question, options, default }]，空数组表示「不用问，直接拆」。
export async function askClarifyingQuestions(text, { prefs } = {}) {
  const input = (text ?? "").trim();
  if (!input) return [];

  const rulesHint = buildRulesHint(prefs);
  const today = todayHint();

  if (!hasApiKey()) {
    await delay(400 + Math.random() * 300);
    return sampleQuestions(input);
  }

  if (IS_PROD) {
    const { questions } = await postProxy("/api/clarify-tasks", { text: input, rulesHint, today });
    return parseQuestionsJson(questions);
  }

  const raw = await chatComplete({
    system: buildClarifySystemPrompt(rulesHint, today),
    user: input,
    maxTokens: 512,
  });
  return parseQuestionsJson(raw);
}

// ── 逐条细化：把评审列表里的某一条再拆开 ─────────────────────

export function buildRefineSystemPrompt(schemaHint, today = todayHint(), rulesHint = "") {
  return [
    "用户手上有一条待办，觉得它太大、下不去手。把它拆成几条能立刻开始的小任务。",
    "",
    `今天是 ${today.date}（星期${today.weekday}）。`,
    "",
    rulesHint || "（无额外偏好）",
    "",
    "拆解规则：",
    "- 拆成 2–5 条，按执行顺序排列。",
    "- 第一条必须是个小到「几乎不需要下决心」的启动动作。",
    "- 每条都是具体动作，不要出现「准备一下」「整理相关材料」这种还得再想一层的说法。",
    "- 保留原任务里的人名、课程名、文件名、数字、地点。",
    "- 不要输出概括性的父任务，也不要重复原任务本身。",
    "- 原任务已经足够小、再拆没有意义时，返回空数组 []。",
    "- 语言跟随原任务。",
    "",
    "输出规则：",
    "- 只输出一个 JSON 数组，不要任何额外文字或代码围栏。",
    "- 元素形如 { \"text\": \"任务标题\", ... 可选字段 }。原任务已有的属性可以继承，不确定就省略。",
    "",
    schemaHint,
  ].join("\n");
}

// 无 key 时的离线示例细化。
function sampleRefined(text = "") {
  const zh = /[一-鿿]/.test(text);
  const head = text.trim().slice(0, 12);
  return zh
    ? [
        { text: `示例：打开「${head}」相关的文件，只看不写`, attrs: {} },
        { text: `示例：给「${head}」列出要做的三点`, attrs: {} },
        { text: `示例：先做其中最容易的一点`, attrs: {} },
      ]
    : [
        { text: `Sample: Open the file for “${head}”, just read`, attrs: {} },
        { text: `Sample: List three things “${head}” needs`, attrs: {} },
        { text: "Sample: Do the easiest one first", attrs: {} },
      ];
}

// 把一条任务拆成 2–5 条，返回 [{ text, attrs }]；空数组表示「已经够小了」。
export async function refineTask(task, { database, t, prefs } = {}) {
  const text = (task?.text ?? "").trim();
  if (!text) return [];

  const schemaHint = buildSchemaHint(database, t);
  const rulesHint = buildRulesHint(prefs);
  const today = todayHint();
  // 把原任务已有的属性一并交代，好让子任务继承截止 / 标签
  const payload = JSON.stringify({ text, attrs: task.attrs || {} });

  if (!hasApiKey()) {
    await delay(400 + Math.random() * 300);
    return sampleRefined(text);
  }

  if (IS_PROD) {
    const { tasks } = await postProxy("/api/refine-task", {
      task: { text, attrs: task.attrs || {} },
      schemaHint,
      today,
      rulesHint,
    });
    return parseTasksJson(tasks);
  }

  const raw = await chatComplete({
    system: buildRefineSystemPrompt(schemaHint, today, rulesHint),
    user: payload,
    maxTokens: 768,
  });
  return parseTasksJson(raw);
}
