import OpenAI from "openai";

// 情境配置助手代理：浏览器把用户的自然语言描述 + 现有选项清单发来，
// API key 留在服务器侧。返回 { result }（模型原始文本，前端再 parse/兜底）。

function buildSystemPrompt() {
  return [
    "你在帮 ADHD 用户把一句情境描述整理成一份「情境配置」。",
    "配置有三个维度：可用设备（可多选）、交流规则（单选）、任务类型偏好（可多选）。",
    "用户会给出他的描述，以及各维度现有的可选项清单。",
    "",
    "规则：",
    "- 现有清单里能对上的，直接沿用清单里的原文，不要改写。",
    "- 描述里出现清单没有的合理项，可以大胆新增一个简短中文词（如设备「录音笔」、交流规则「戴降噪」）。",
    "- 任务类型只能从给定清单里挑，挑不到就不填，别硬凑。",
    "- 交流规则只给一个最贴切的。",
    "- 只输出一个 JSON 对象，不要任何额外文字或代码围栏。",
    '- 形如 { "devices": ["电脑","耳机"], "communication": "保持安静", "taskTypes": ["深度工作"], "note": "一句话说明这套配置" }。',
    "- note 不超过 25 字，温柔、具体。",
  ].join("\n");
}

function buildUserPayload(prompt, options) {
  const { deviceOptions = [], commOptions = [], tagOptions = [] } = options || {};
  const labels = (arr) => (arr.map((o) => o.label).filter(Boolean).join("、") || "（无）");
  return [
    `情境描述：${(prompt ?? "").trim() || "（未填写）"}`,
    "",
    "现有可选项：",
    `- 设备：${labels(deviceOptions)}`,
    `- 交流规则：${labels(commOptions)}`,
    `- 任务类型（只能从这里选）：${labels(tagOptions)}`,
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

  const { prompt, options } = req.body || {};
  if (typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ error: "Invalid prompt" });
  }

  try {
    const client = new OpenAI({ apiKey });
    const resp = await client.chat.completions.create({
      model: "gpt-5.5",
      max_completion_tokens: 300,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPayload(prompt, options) },
      ],
    });
    return res.json({ result: resp.choices[0]?.message?.content ?? "" });
  } catch (e) {
    console.error("[api/scenario-config]", e.message);
    return res.status(500).json({ error: "AI request failed" });
  }
}
