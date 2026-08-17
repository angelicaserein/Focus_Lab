import OpenAI from "openai";

// 拆分前的「反问」代理：浏览器把笔记 + 已有拆分偏好发来，
// 模型针对这段内容出 1–3 个选择题。返回 { questions }（模型原始输出，前端再 parse）。

// 「今天」由浏览器按本地时区算好发过来；缺了才退回服务器时间（UTC，可能差一天）。
function normalizeToday(today) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(today?.date) ? today.date : new Date().toISOString().slice(0, 10);
  const weekday = "日一二三四五六".includes(today?.weekday)
    ? today.weekday
    : "日一二三四五六"[new Date(`${date}T00:00:00Z`).getUTCDay()];
  return { date, weekday };
}

// 与 src/utils/ai/aiTasks.js 里的 buildClarifySystemPrompt 逐字一致，改一处要改两处。
function buildSystemPrompt(rulesHint, today) {
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "AI not configured" });
  }

  const { text, rulesHint, today } = req.body || {};
  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "Invalid text" });
  }

  try {
    const client = new OpenAI({ apiKey });
    const resp = await client.chat.completions.create({
      model: "gpt-5.5",
      max_completion_tokens: 512,
      messages: [
        { role: "system", content: buildSystemPrompt(rulesHint, normalizeToday(today)) },
        { role: "user", content: text.trim() },
      ],
    });
    return res.json({ questions: resp.choices[0]?.message?.content ?? "" });
  } catch (e) {
    console.error("[api/clarify-tasks]", e.message);
    return res.status(500).json({ error: "AI request failed" });
  }
}
