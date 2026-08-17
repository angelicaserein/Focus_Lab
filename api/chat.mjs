import { createHandler, raw, BadRequest } from "./_shared.mjs";

const SYSTEM_PROMPT =
  "你是一个温柔、简洁的 ADHD 专注陪伴助手。每次回复不超过 2 句话，用中文，语气轻松鼓励。";

export default createHandler({
  name: "chat",
  maxTokens: 256,
  build: ({ messages }) => {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new BadRequest("Invalid messages");
    }
    return { messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages] };
  },
  format: raw("text"),
});
