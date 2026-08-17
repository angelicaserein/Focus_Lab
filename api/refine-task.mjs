import OpenAI from "openai";

// 「再细化」代理：浏览器把某一条任务发来，模型把它拆成 2–5 条能立刻开始的小任务。
// 返回 { tasks }（模型原始输出，前端再 parse/清洗）。

// 「今天」由浏览器按本地时区算好发过来；缺了才退回服务器时间（UTC，可能差一天）。
function normalizeToday(today) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(today?.date) ? today.date : new Date().toISOString().slice(0, 10);
  const weekday = "日一二三四五六".includes(today?.weekday)
    ? today.weekday
    : "日一二三四五六"[new Date(`${date}T00:00:00Z`).getUTCDay()];
  return { date, weekday };
}

// 与 src/utils/ai/aiTasks.js 里的 buildRefineSystemPrompt 逐字一致，改一处要改两处。
function buildSystemPrompt(schemaHint, today, rulesHint) {
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
    '- 元素形如 { "text": "任务标题", ... 可选字段 }。原任务已有的属性可以继承，不确定就省略。',
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

  const { task, schemaHint, today, rulesHint } = req.body || {};
  const text = typeof task?.text === "string" ? task.text.trim() : "";
  if (!text) {
    return res.status(400).json({ error: "Invalid task" });
  }

  try {
    const client = new OpenAI({ apiKey });
    const resp = await client.chat.completions.create({
      model: "gpt-5.5",
      max_completion_tokens: 768,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(schemaHint, normalizeToday(today), rulesHint),
        },
        { role: "user", content: JSON.stringify({ text, attrs: task?.attrs || {} }) },
      ],
    });
    return res.json({ tasks: resp.choices[0]?.message?.content ?? "" });
  } catch (e) {
    console.error("[api/refine-task]", e.message);
    return res.status(500).json({ error: "AI request failed" });
  }
}
