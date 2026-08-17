import { createHandler, raw, BadRequest } from "./_shared.mjs";

// 优先级矩阵自动分配代理：浏览器把未分类任务发来，API key 留在服务器侧。
// 返回 { result }（模型原始文本，前端再 parse/兜底）。

function buildSystemPrompt() {
  return [
    "你是一个帮助 ADHD 用户使用「艾森豪威尔优先级矩阵」的助手。",
    "用户会给你一组尚未分类的任务（含标题与可选属性）。",
    "请为每条任务估计它的「紧急度」和「重要度」，各是 0 到 1 之间的小数。",
    "",
    "判据：",
    "- 紧急度：越接近 1 表示越需要马上处理（临近截止、拖延会出问题）。",
    "- 重要度：越接近 1 表示越关乎用户真正在乎的目标、越只有本人能做。",
    "- 已有的优先级/截止日期属性是重要参考，但也要结合任务标题语义判断。",
    "",
    "规则：",
    "- 只输出一个 JSON 对象，不要任何额外文字或代码围栏。",
    '- 形如 { "positions": { "任务id": { "urgency": 0.0, "importance": 0.0 } } }。',
    "- 必须为每条传入任务给出一项，id 原样返回，数值保留一到两位小数。",
  ].join("\n");
}

function buildUserPayload(tasks) {
  return [
    "未分类任务：",
    ...tasks.map((c) => {
      const a = c.attrs ?? {};
      const meta = [
        a.priority ? `优先级=${a.priority}` : null,
        a.tags?.length ? `标签=${a.tags.join("/")}` : null,
        a.dueDate ? `截止=${a.dueDate}` : null,
        a.estimatedMins != null ? `预计=${a.estimatedMins}分` : null,
      ].filter(Boolean).join(" ");
      return `- id=${c.id}｜${c.text}${meta ? "｜" + meta : ""}`;
    }),
  ].join("\n");
}

export default createHandler({
  name: "assign-matrix",
  build: ({ tasks }) => {
    if (!Array.isArray(tasks) || !tasks.length) {
      throw new BadRequest("Invalid tasks");
    }
    return {
      // gpt-5.5 推理模型：token 预算推理与正文共用，矩阵需为每条任务吐一项
      // JSON，任务多了 512 会被截断成空。按任务数动态留足余量。
      maxTokens: Math.min(4096, 256 + tasks.length * 48),
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPayload(tasks) },
      ],
    };
  },
  format: raw("result"),
});
