import OpenAI from "openai";

// 任务抽取代理：浏览器把笔记文本 + 目标库字段说明发来，
// API key 留在服务器侧。返回 { tasks }（模型原始输出，前端再 parse/清洗）。

// 「今天」由浏览器按本地时区算好发过来；缺了才退回服务器时间（UTC，可能差一天）。
function normalizeToday(today) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(today?.date) ? today.date : new Date().toISOString().slice(0, 10);
  const weekday = "日一二三四五六".includes(today?.weekday)
    ? today.weekday
    : "日一二三四五六"[new Date(`${date}T00:00:00Z`).getUTCDay()];
  return { date, weekday };
}

// 调用方没给 rulesHint 时的兜底（等价于设置页的 balanced + 不猜日期）。
const DEFAULT_RULES_HINT = [
  "粒度规则：",
  "- 原文提到的一件事，若一次坐下就能做完，出一条任务。",
  "- 若那件事明显要好几步、或要跨天才做得完，拆成 2–4 条可依次执行的子任务；",
  "  这时不要再额外输出一条概括性的父任务，同一件事只在结果里出现一次。",
  "- 原文没写明死期就不要填 dueDate，别靠语气猜。",
].join("\n");

// 与 src/utils/ai/aiTasks.js 里的同名函数逐字一致，改一处要改两处。
// rulesHint（粒度档位 / 用户自定义规矩 / 本轮反问答案）由浏览器侧按拆分偏好拼好发来。
function buildSystemPrompt(schemaHint, today, rulesHint) {
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
    '- 数组每个元素形如 { "text": "任务标题", ... 可选字段 }。',
    "- 相对日期（明天 / 下周三 / 月底）按上面的今天换算成 YYYY-MM-DD；算不出确定日期就省略该字段。",
    "- 没有明确可执行事项时，返回空数组 []。",
    "",
    schemaHint || "每个任务只需输出 text。",
  ].join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "AI not configured" });
  }

  const { text, schemaHint, today, rulesHint } = req.body || {};
  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "Invalid text" });
  }

  try {
    const client = new OpenAI({ apiKey });
    const resp = await client.chat.completions.create({
      model: "gpt-5.5",
      max_completion_tokens: 1024,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(schemaHint, normalizeToday(today), rulesHint),
        },
        { role: "user", content: text.trim() },
      ],
    });
    return res.json({ tasks: resp.choices[0]?.message?.content ?? "" });
  } catch (e) {
    console.error("[api/extract-tasks]", e.message);
    return res.status(500).json({ error: "AI request failed" });
  }
}
