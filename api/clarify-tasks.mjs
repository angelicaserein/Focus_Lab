import { createHandler, raw, normalizeToday, BadRequest } from "./_shared.mjs";

// 拆分前的「反问」代理：浏览器把笔记 + 已有拆分偏好发来，
// 模型针对这段内容出 1–3 个选择题。返回 { questions }（模型原始输出，前端再 parse）。

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

export default createHandler({
  name: "clarify-tasks",
  maxTokens: 512,
  build: ({ text, rulesHint, today }) => {
    if (typeof text !== "string" || !text.trim()) {
      throw new BadRequest("Invalid text");
    }
    return {
      messages: [
        { role: "system", content: buildSystemPrompt(rulesHint, normalizeToday(today)) },
        { role: "user", content: text.trim() },
      ],
    };
  },
  format: raw("questions"),
});
