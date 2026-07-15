import OpenAI from "openai";

// 情景推荐精排代理：浏览器把候选任务 + 当前情景发来，API key 留在服务器侧。
// 返回 { result }（模型原始文本，前端再 parse/兜底）。

function buildSystemPrompt() {
  return [
    "你是一个帮助 ADHD 用户「此刻该做哪件事」做决策的助手。",
    "用户会给你当前所处情景（环境、能否说话、设备、任务类型偏好）和一组候选任务。",
    "请结合情景，把候选任务按「现在最适合做」从前到后重排，并给最靠前的几条一句简短中文理由。",
    "",
    "规则：",
    "- 只输出一个 JSON 对象，不要任何额外文字或代码围栏。",
    '- 形如 { "order": ["任务id", ...], "reasons": { "任务id": "一句话理由" } }。',
    "- order 必须是传入候选 id 的重排（不增不减）。",
    "- reasons 只需给前 3 条，理由不超过 20 字，温柔、具体、可执行。",
  ].join("\n");
}

function buildUserPayload(candidates, scenario, envProfile) {
  const s = scenario?.settings ?? {};
  const lines = [
    `情景：${scenario?.title ?? "（未命名）"}${scenario?.description ? "（" + scenario.description + "）" : ""}`,
    `设备：${(s.devices ?? []).join("、") || "未设置"}`,
    `交流：${s.communication || "未设置"}`,
    `任务类型偏好：${(s.taskTypes ?? []).join("、") || "未设置"}`,
    `环境时长偏好：${envProfile?.label || "无特别偏好"}`,
    "",
    "候选任务：",
    ...candidates.map((c) => {
      const a = c.attrs ?? {};
      const meta = [
        a.priority ? `优先级=${a.priority}` : null,
        a.tags?.length ? `标签=${a.tags.join("/")}` : null,
        a.dueDate ? `截止=${a.dueDate}` : null,
        a.estimatedMins != null ? `预计=${a.estimatedMins}分` : null,
      ].filter(Boolean).join(" ");
      return `- id=${c.id}｜${c.text}${meta ? "｜" + meta : ""}`;
    }),
  ];
  return lines.join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "AI not configured" });
  }

  const { candidates, scenario, envProfile } = req.body || {};
  if (!Array.isArray(candidates) || !candidates.length) {
    return res.status(400).json({ error: "Invalid candidates" });
  }

  try {
    const client = new OpenAI({ apiKey });
    const resp = await client.chat.completions.create({
      model: "gpt-5.5",
      max_completion_tokens: 512,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPayload(candidates, scenario, envProfile) },
      ],
    });
    return res.json({ result: resp.choices[0]?.message?.content ?? "" });
  } catch (e) {
    console.error("[api/recommend]", e.message);
    return res.status(500).json({ error: "AI request failed" });
  }
}
