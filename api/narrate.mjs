import Anthropic from "@anthropic-ai/sdk";

// 游戏主持人「旅程旁白」代理：浏览器把角色状态摘要发来，API key 留在服务器侧。
// 返回 { result }（模型原始文本，前端直接展示 / 失败兜底本地模板）。
// 这是把用户真实专注数据用 GenAI 叙事化的增强层，直接服务论文 RQ2 的 GenAI 整合创新点。

function buildSystemPrompt(lang) {
  const zh = lang !== "en";
  return [
    zh
      ? "你是一个温柔的「说书人 / 旅程旁白」，把用户在一款 ADHD 友好专注 App 里的真实进展，讲成一段正在展开的冒险叙事。"
      : "You are a gentle Narrator who tells the story of a player's real progress in an ADHD-friendly focus app, as an unfolding adventure.",
    "",
    zh ? "规则：" : "Rules:",
    zh
      ? "- 用第二人称「你」，2~3 句，温暖、有画面感、像 RPG 旁白。"
      : "- Second person, 2-3 sentences, warm and vivid, like RPG narration.",
    zh
      ? "- ADHD 友好：庆祝「出现即胜利」，绝不施压、不催促、不评判、不报「还差多少」。"
      : "- ADHD-friendly: celebrate simply showing up; never pressure, nag, judge, or mention how far 'behind' they are.",
    zh
      ? "- 自然融入给到的事实（成长阶段、势头、最投入的方向等），但不要罗列数字。"
      : "- Weave in the given facts (growth stage, momentum, strongest focus, etc.) naturally, without listing numbers.",
    zh
      ? "- 只输出这段叙事本身，不要标题、不要引号、不要解释。"
      : "- Output only the narration itself — no title, no quotes, no explanation.",
    zh ? "- 全程用中文。" : "- Write entirely in English.",
  ].join("\n");
}

function buildUserPayload(ctx = {}, lang) {
  const zh = lang !== "en";
  const L = (a, b) => (zh ? a : b);
  const lines = [
    L("称号：", "Title: ") + (ctx.rankName ?? "-"),
    L("成长阶段：", "Growth stage: ") + (ctx.stageText ?? "-"),
    L("当下势头：", "Momentum: ") + (ctx.momentumText ?? "-"),
    L("累计专注：", "Total focus: ") + (ctx.totalMins ?? 0) + L(" 分钟", " min"),
    L("专注次数：", "Sessions: ") + (ctx.sessionCount ?? 0),
    L("连续天数：", "Streak days: ") + (ctx.streak ?? 0),
    ctx.topSkillName ? L("最投入的方向：", "Strongest focus: ") + ctx.topSkillName : null,
    ctx.unmetAchTitle ? L("即将靠近的成就：", "An achievement drawing near: ") + ctx.unmetAchTitle : null,
  ].filter(Boolean);
  return lines.join("\n");
}

// 厂长「播报」人设（工业页）。
function buildForemanSystem(lang) {
  const zh = lang !== "en";
  return [
    zh
      ? "你是一座自动化工厂的「厂长」，用一句话播报当前的生产态势，语气干练、带点工业浪漫，像车间广播。"
      : "You are the Foreman of an automated factory, broadcasting the current production status in one line — brisk, with a touch of industrial romance, like a shop-floor announcement.",
    zh ? "规则：" : "Rules:",
    zh ? "- 只输出 1 句，简短有力。" : "- Output exactly 1 short, punchy line.",
    zh ? "- ADHD 友好：肯定「已经产出的」，绝不催促、不施压、不报「还差多少」。"
      : "- ADHD-friendly: affirm what's already produced; never nag, pressure, or mention how far 'behind'.",
    zh ? "- 自然带入给到的事实，不罗列数字。只输出这句播报本身。"
      : "- Weave in the facts naturally, no number-listing. Output only the line itself.",
    zh ? "- 用中文。" : "- Write in English.",
  ].join("\n");
}

function buildForemanPayload(ctx = {}, lang) {
  const zh = lang !== "en";
  const L = (a, b) => (zh ? a : b);
  return [
    L("工厂规模：", "Factory scale: ") + (ctx.tierName ?? "-"),
    L("总产能：", "Total output: ") + (ctx.totalIp ?? 0) + " IP",
    L("今日产出：", "Today: ") + (ctx.todayIp ?? 0) + " IP",
    L("主力产线：", "Lead line: ") + (ctx.topLineName ?? "-"),
    L("运转状态：", "Status: ") + (ctx.running ? L("运转中", "running") : L("待开工", "idle")),
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

  const { context, lang, persona } = req.body || {};
  const isForeman = persona === "foreman";

  try {
    const client = new Anthropic({ apiKey });
    const resp = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: isForeman ? 160 : 320,
      system: isForeman ? buildForemanSystem(lang) : buildSystemPrompt(lang),
      messages: [{ role: "user", content: isForeman ? buildForemanPayload(context, lang) : buildUserPayload(context, lang) }],
    });
    return res.json({ result: resp.content.map((b) => b.text).join("") });
  } catch (e) {
    console.error("[api/narrate]", e.message);
    return res.status(500).json({ error: "AI request failed" });
  }
}
