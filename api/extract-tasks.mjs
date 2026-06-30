import Anthropic from "@anthropic-ai/sdk";

// 任务抽取代理：浏览器把笔记文本 + 目标库字段说明发来，
// API key 留在服务器侧。返回 { tasks }（模型原始输出，前端再 parse/清洗）。

function buildSystemPrompt(schemaHint) {
  return [
    "你是一个帮助 ADHD 用户整理思绪的助手。用户会给你一段零散的笔记或想法，",
    "你要把其中可执行的事项拆解成一组简洁、具体、可立即行动的任务。",
    "",
    "规则：",
    "- 只输出一个 JSON 数组，不要任何额外文字或代码围栏。",
    '- 数组每个元素形如 { "text": "任务标题", ... 可选字段 }。',
    "- text 要精炼可执行（动词开头更好），不要照抄整段原文。",
    "- 没有明确可执行事项时，返回空数组 []。",
    "- 不确定的字段一律省略，不要瞎填。",
    "",
    schemaHint || "每个任务只需输出 text。",
  ].join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "AI not configured" });
  }

  const { text, schemaHint } = req.body || {};
  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "Invalid text" });
  }

  try {
    const client = new Anthropic({ apiKey });
    const resp = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: buildSystemPrompt(schemaHint),
      messages: [{ role: "user", content: text.trim() }],
    });
    return res.json({ tasks: resp.content.map((b) => b.text).join("") });
  } catch (e) {
    console.error("[api/extract-tasks]", e.message);
    return res.status(500).json({ error: "AI request failed" });
  }
}
