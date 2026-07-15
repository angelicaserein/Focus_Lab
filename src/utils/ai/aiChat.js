// ──────────────────────────────────────────────────────────────
//  AI 对话调用封装
//
//  三种模式（自动切换）：
//  1. 生产环境（Vercel）→ 调用 /api/chat 代理，API key 在服务器侧
//  2. 本地开发 + 有 VITE_OPENAI_API_KEY → 直接调用 SDK
//  3. 本地开发 + 无 key → 轮换示例回复
//
//  本地配置：项目根目录建 .env 文件：
//      VITE_OPENAI_API_KEY=sk-...
//  改完 .env 需要重启 `npm run dev` 才生效。
//
//  三模式的机械件（配置 / hasApiKey / delay / SDK 直连 / 代理请求）见 aiClient.js。
// ──────────────────────────────────────────────────────────────
import { IS_PROD, hasApiKey, delay, chatComplete, postProxy } from "@/utils/ai/aiClient";

const SYSTEM_PROMPT =
  "你是一个温柔、简洁的 ADHD 专注陪伴助手。每次回复不超过 2 句话，用中文，语气轻松鼓励。";

const SAMPLE_REPLIES = [
  "先深呼吸一下，挑最小的一步开始就好 🌱",
  "卡住很正常，把任务再拆小一点试试？",
  "你已经坐下来开始了，这就很棒了。",
  "走神了也没关系，轻轻把注意力拉回来就行。",
  "要不要先做 2 分钟？常常做着做着就进入状态了。",
  "累了就停一下，喝口水再继续也可以。",
];

export { hasApiKey };

// 把 UI 的 {role:'user'|'ai', text} 转成 OpenAI 的 {role, content}。
const toChatMsgs = (messages) =>
  messages.map((m) => ({
    role: m.role === "ai" ? "assistant" : "user",
    content: m.text,
  }));

// messages: [{ role: 'user' | 'ai', text }]
export async function getAiReply(messages) {
  const userCount = messages.filter((m) => m.role === "user").length;
  const sampleReply = async () => {
    await delay(500 + Math.random() * 400);
    return SAMPLE_REPLIES[userCount % SAMPLE_REPLIES.length];
  };

  // 本地开发且无 API key → 示例回复
  if (!hasApiKey()) return sampleReply();

  // 生产环境 → 调用服务器代理（API key 不暴露给浏览器）
  if (IS_PROD) {
    try {
      const { text } = await postProxy("/api/chat", { messages: toChatMsgs(messages) });
      return text;
    } catch {
      return sampleReply();
    }
  }

  // 本地开发 + 有 API key → 直接调用 SDK
  try {
    return await chatComplete({
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...toChatMsgs(messages)],
      maxTokens: 256,
    });
  } catch {
    return sampleReply();
  }
}
