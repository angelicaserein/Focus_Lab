import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT =
  "你是一个温柔、简洁的 ADHD 专注陪伴助手。每次回复不超过 2 句话，用中文，语气轻松鼓励。";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "AI not configured" });
  }

  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Invalid messages" });
  }

  try {
    const client = new Anthropic({ apiKey });
    const resp = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages,
    });
    return res.json({ text: resp.content.map((b) => b.text).join("") });
  } catch (e) {
    console.error("[api/chat]", e.message);
    return res.status(500).json({ error: "AI request failed" });
  }
}
