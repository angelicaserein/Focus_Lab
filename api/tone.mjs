import { createHandler, BadRequest } from "./_shared.mjs";

// 语气包生成代理：前端传来组织好的 system / user，
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

export default createHandler({
  name: "tone",
  maxTokens: 1024,
  build: ({ system, user }) => {
    if (typeof system !== "string" || typeof user !== "string") {
      throw new BadRequest("Invalid payload");
    }
    return {
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    };
  },
  // 这一支不把原文丢给前端，服务端就要 parse 出覆盖表；parse 不出是模型的问题，回 502。
  format: (text) => {
    const phrases = parsePhrases(text);
    if (!phrases) throw new BadRequest("Bad AI output", 502);
    return { phrases };
  },
});
