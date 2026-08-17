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

// 与 src/utils/ai/aiTasks.js 里的同名函数逐字一致，改一处要改两处。
function buildSystemPrompt(schemaHint, today) {
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
    '- 数组每个元素形如 { "text": "任务标题", ... 可选字段 }。',
    "- 相对日期（明天 / 下周三 / 月底）按上面的今天换算成 YYYY-MM-DD；算不出确定日期就省略该字段。",
    "- 没有明确可执行事项时，返回空数组 []。",
    "- 原文没写的字段一律省略，不要靠猜补齐。",
    "",
    "示例——",
    "输入：「明天下午之前把统计课的作业三交了，还得给王老师回邮件问答辩时间，最近好累」",
    '输出：[{"text":"提交统计课作业三"},{"text":"给王老师回邮件问答辩时间"}]',
    "（两件事各一条，不再细拆；「最近好累」是感受，不产生任务。）",
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

  const { text, schemaHint, today } = req.body || {};
  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "Invalid text" });
  }

  try {
    const client = new OpenAI({ apiKey });
    const resp = await client.chat.completions.create({
      model: "gpt-5.5",
      max_completion_tokens: 1024,
      messages: [
        { role: "system", content: buildSystemPrompt(schemaHint, normalizeToday(today)) },
        { role: "user", content: text.trim() },
      ],
    });
    return res.json({ tasks: resp.choices[0]?.message?.content ?? "" });
  } catch (e) {
    console.error("[api/extract-tasks]", e.message);
    return res.status(500).json({ error: "AI request failed" });
  }
}
