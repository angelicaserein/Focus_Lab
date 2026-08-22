import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHandler, raw, normalizeToday, BadRequest } from "./_shared.mjs";

// 9 个端点的错误分支（405/503/400/500）在线上很难复现，也不该靠部署去试。
// 外壳抽出来之后它们只剩这一份实现，在这里一次性锁住。
const create = vi.fn();
vi.mock("openai", () => ({
  default: class {
    constructor(opts) {
      this.opts = opts;
      this.chat = { completions: { create: (...a) => create(...a) } };
    }
  },
}));

// 记录状态码与 JSON body 的假 res（形状同 Vercel 的 res）。
function fakeRes() {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

const post = (body) => ({ method: "POST", body });

const echo = createHandler({
  name: "echo",
  maxTokens: 100,
  build: ({ text }) => {
    if (!text) throw new BadRequest("Invalid text");
    return { messages: [{ role: "user", content: text }] };
  },
  format: raw("result"),
});

describe("createHandler", () => {
  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue({ choices: [{ message: { content: "嗨" } }] });
    process.env.OPENAI_API_KEY = "sk-test";
  });
  afterEach(() => { delete process.env.OPENAI_API_KEY; });

  it("非 POST 回 405，且不调用模型", async () => {
    const res = fakeRes();
    await echo({ method: "GET" }, res);
    expect(res.statusCode).toBe(405);
    expect(create).not.toHaveBeenCalled();
  });

  it("没配 key 回 503，且不调用模型", async () => {
    delete process.env.OPENAI_API_KEY;
    const res = fakeRes();
    await echo(post({ text: "写论文" }), res);
    expect(res.statusCode).toBe(503);
    expect(create).not.toHaveBeenCalled();
  });

  it("build 抛 BadRequest 时回 400，消息原样透出", async () => {
    const res = fakeRes();
    await echo(post({}), res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Invalid text" });
  });

  it("body 缺失（Vercel 没 parse 出来）当成空对象走校验，不炸成 500", async () => {
    const res = fakeRes();
    await echo({ method: "POST" }, res);
    expect(res.statusCode).toBe(400);
  });

  it("正常路径：把模型原文放进 format 指定的字段，状态码保持 200", async () => {
    const res = fakeRes();
    await echo(post({ text: "写论文" }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ result: "嗨" });
  });

  it("模型返回空 choices 时回空串，而不是抛 undefined", async () => {
    create.mockResolvedValue({ choices: [] });
    const res = fakeRes();
    await echo(post({ text: "写论文" }), res);
    expect(res.body).toEqual({ result: "" });
  });

  it("build 可覆盖默认 maxTokens（assign-matrix / narrate 靠这个动态给预算）", async () => {
    const dynamic = createHandler({
      name: "dynamic",
      maxTokens: 100,
      build: ({ n }) => ({ maxTokens: n, messages: [{ role: "user", content: "x" }] }),
      format: raw("result"),
    });
    await dynamic(post({ n: 999 }), fakeRes());
    expect(create.mock.calls[0][0].max_completion_tokens).toBe(999);
  });

  it("调模型出错回 500，且不把内部报错泄给前端", async () => {
    create.mockRejectedValue(new Error("insufficient_quota: 余额不足"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = fakeRes();
    await echo(post({ text: "写论文" }), res);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "AI request failed" });
    console.error.mockRestore();
  });

  it("format 抛 BadRequest 可指定状态码（tone 用 502 表示模型输出不可用）", async () => {
    const strict = createHandler({
      name: "strict",
      maxTokens: 100,
      build: () => ({ messages: [{ role: "user", content: "x" }] }),
      format: () => { throw new BadRequest("Bad AI output", 502); },
    });
    const res = fakeRes();
    await strict(post({}), res);
    expect(res.statusCode).toBe(502);
    expect(res.body).toEqual({ error: "Bad AI output" });
  });
});

describe("normalizeToday", () => {
  it("采信浏览器传来的合法日期与星期", () => {
    expect(normalizeToday({ date: "2026-08-17", weekday: "一" }))
      .toEqual({ date: "2026-08-17", weekday: "一" });
  });

  it("星期不合法时按日期重算（2026-08-17 是周一）", () => {
    expect(normalizeToday({ date: "2026-08-17", weekday: "X" }).weekday).toBe("一");
  });

  // "日一二三四五六".includes("") 恒为 true —— 空串曾经能一路通过校验，
  // 拼进 prompt 变成「今天是 2026-08-17（星期）」。多字符的串同理要挡掉。
  it("空串 / 多字符的星期一律按日期重算", () => {
    expect(normalizeToday({ date: "2026-08-17", weekday: "" }).weekday).toBe("一");
    expect(normalizeToday({ date: "2026-08-17", weekday: "日一" }).weekday).toBe("一");
    expect(normalizeToday({ date: "2026-08-17", weekday: 3 }).weekday).toBe("一");
  });

  it("日期不合法时退回服务器当天", () => {
    const { date } = normalizeToday({ date: "8/17/2026" });
    expect(date).toBe(new Date().toISOString().slice(0, 10));
  });

  it("完全没传也能给出一天", () => {
    expect(normalizeToday(undefined).date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
