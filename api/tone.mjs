import OpenAI from "openai";

// 语气包生成代理（镜像 api/chat.mjs）：前端传来组织好的 system / user，
// 返回一个 { key: text } 的 JSON 覆盖表。API key 仅在服务器侧。

function parsePhrases(text) {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "AI not configured" });
  }

  const { system, user } = req.body || {};
  if (typeof system !== "string" || typeof user !== "string") {
    return res.status(400).json({ error: "Invalid payload" });
  }

  try {
    const client = new OpenAI({ apiKey });
    const resp = await client.chat.completions.create({
      model: "gpt-5.5",
      max_completion_tokens: 1024,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const text = resp.choices[0]?.message?.content ?? "";
    const phrases = parsePhrases(text);
    if (!phrases) return res.status(502).json({ error: "Bad AI output" });
    return res.json({ phrases });
  } catch (e) {
    console.error("[api/tone]", e.message);
    return res.status(500).json({ error: "AI request failed" });
  }
}
