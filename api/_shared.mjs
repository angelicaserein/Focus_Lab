/*
 * 9 个 AI 代理端点的公共外壳。
 *
 * 每个端点原本都要重复同一套：判 POST → 读 env key → 校验 req.body → new OpenAI
 * → chat.completions.create → 取 choices[0] → try/catch 打日志回 500。模型号也
 * 抄了 9 遍。这里把这套流程收成 createHandler，端点文件只剩「这次要发什么 prompt、
 * 收到的 body 合不合法、回给前端哪个字段」三件真正各不相同的事。
 *
 * 文件名以 _ 开头：Vercel 只把 api/ 下不以 _ 开头的文件当成 serverless 路由，
 * 所以这个模块只会被同目录的 handler import，不会自己变成一个可访问端点。
 */

import OpenAI from "openai";

// 换模型只改这一处。注意 gpt-5.5 是推理模型，max_completion_tokens 由推理与正文
// 共用——调小之前先确认最长的那个端点（extract-tasks / tone，1024）还够用。
export const MODEL = "gpt-5.5";

/**
 * 校验失败。build() 或 format() 抛出它，createHandler 转成对应状态码；
 * 其余异常一律当作「调用模型出错」回 500。
 * message 会原样回给前端，别把内部细节写进去。
 */
export class BadRequest extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "BadRequest";
    this.status = status;
  }
}

/**
 * 「今天」由浏览器按本地时区算好发过来；缺了才退回服务器时间（UTC，可能差一天）。
 * extract-tasks / clarify-tasks / refine-task 三处共用。
 */
const WEEKDAYS = "日一二三四五六";

export function normalizeToday(today) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(today?.date)
    ? today.date
    : new Date().toISOString().slice(0, 10);
  // 必须先判长度为 1：String.prototype.includes("") 恒为 true，
  // 空串会一路通过校验被拼进 prompt，模型读到的是「今天是 …（星期）」。
  const weekday =
    typeof today?.weekday === "string" && today.weekday.length === 1 &&
    WEEKDAYS.includes(today.weekday)
      ? today.weekday
      : WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
  return { date, weekday };
}

/** 最常见的 format：把模型原文原样放进某个字段，交给前端 parse/兜底。 */
export const raw = (key) => (text) => ({ [key]: text });

/**
 * 造一个 Vercel serverless handler。
 *
 * @param {object}   spec
 * @param {string}   spec.name       日志前缀，写成端点名（对应 api/<name>.mjs）
 * @param {number}   [spec.maxTokens] 默认 token 上限；build 返回的同名字段可覆盖
 * @param {function} spec.build      (body) => { messages, maxTokens? }
 *                                   body 不合法时 throw new BadRequest(...)
 * @param {function} spec.format     (text) => 回给前端的 JSON 对象
 *                                   模型输出没法用时 throw new BadRequest(..., 502)
 */
export function createHandler({ name, maxTokens, build, format }) {
  return async function handler(req, res) {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "AI not configured" });
    }

    try {
      const spec = build(req.body || {});
      const client = new OpenAI({ apiKey });
      const resp = await client.chat.completions.create({
        model: MODEL,
        max_completion_tokens: spec.maxTokens ?? maxTokens,
        messages: spec.messages,
      });
      return res.json(format(resp.choices[0]?.message?.content ?? ""));
    } catch (e) {
      // 校验类错误（含 format 判定模型输出不可用）走各自的状态码，不算服务端故障。
      if (e instanceof BadRequest) {
        return res.status(e.status).json({ error: e.message });
      }
      console.error(`[api/${name}]`, e.message);
      return res.status(500).json({ error: "AI request failed" });
    }
  };
}
