// ──────────────────────────────────────────────────────────────
//  AI 对话调用封装
//
//  逻辑：填了 API 钥匙就走 AI 分支，没填就走「示例对话」。
//  钥匙放在项目根目录的 .env 文件里（和 package.json 同层）：
//      VITE_ANTHROPIC_API_KEY=你的钥匙
//  改完 .env 需要重启 `npm run dev` 才生效。空着 / 没建 .env，
//  这里自动用示例回复，不影响使用。
// ──────────────────────────────────────────────────────────────

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";

// UI 用它来判断当前是「AI 模式」还是「示例模式」（可用于显示提示文案）。
export const hasApiKey = () => Boolean(API_KEY);

// 没钥匙时轮换的示例回复 —— ADHD 友好的轻陪伴语气。
const SAMPLE_REPLIES = [
  "先深呼吸一下，挑最小的一步开始就好 🌱",
  "卡住很正常，把任务再拆小一点试试？",
  "你已经坐下来开始了，这就很棒了。",
  "走神了也没关系，轻轻把注意力拉回来就行。",
  "要不要先做 2 分钟？常常做着做着就进入状态了。",
  "累了就停一下，喝口水再继续也可以。",
];

// 模拟「正在输入」的小延迟，让示例回复不要瞬间弹出。
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// messages: [{ role: 'user' | 'ai', text }]
// 返回 AI（或示例）的回复字符串。
export async function getAiReply(messages) {
  if (!hasApiKey()) {
    await delay(500 + Math.random() * 400);
    // 按已有的用户消息条数轮换，让多轮对话不至于每次都同一句。
    const userCount = messages.filter((m) => m.role === "user").length;
    return SAMPLE_REPLIES[userCount % SAMPLE_REPLIES.length];
  }

  // ── AI 接入点（暂未联网）────────────────────────────────────
  // 将来要真正调用 Claude 时，在这里补上 @anthropic-ai/sdk 的请求即可，
  // 项目已安装该依赖（package.json: @anthropic-ai/sdk）。大致如下：
  //
  //   import Anthropic from "@anthropic-ai/sdk";
  //   const client = new Anthropic({
  //     apiKey: API_KEY,
  //     dangerouslyAllowBrowser: true, // 浏览器直连需要此项；正式上线建议改走后端代理
  //   });
  //   const resp = await client.messages.create({
  //     model: "claude-opus-4-8",
  //     max_tokens: 512,
  //     system: "你是一个温柔、简洁的 ADHD 专注陪伴助手。",
  //     messages: messages.map((m) => ({
  //       role: m.role === "ai" ? "assistant" : "user",
  //       content: m.text,
  //     })),
  //   });
  //   return resp.content.map((b) => b.text).join("");
  //
  // 现阶段先返回占位回复，保证「先别接 API」。
  await delay(400);
  return "（AI 已就绪，待接入）";
}
