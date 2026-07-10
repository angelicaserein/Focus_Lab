import { chromium } from "playwright";

const BASE = "http://localhost:5174";
const OUT = process.argv[2] || ".";
const now = Date.now();
const DAY = 86400000;
const uuid = () => crypto.randomUUID();

// ── 专注记录：近 45 天里挑一些活跃日，每天 1–3 段会话 ──
const tasks = ["写论文初稿", "读文献", "改代码", "准备答辩 PPT", "整理数据", "回邮件"];
const scenarios = [["s1", "深度工作"], ["s2", "轻度整理"], ["s3", "阅读"]];
const records = [];
for (let d = 44; d >= 0; d--) {
  if (Math.random() < 0.42 && d > 0) continue; // 约六成天数有专注
  const sessions = 1 + Math.floor(Math.random() * (d === 0 ? 3 : 2));
  for (let s = 0; s < sessions; s++) {
    const dayStart = now - d * DAY;
    const startedAt = dayStart - (dayStart % DAY) + (9 + s * 3) * 3600000 + Math.floor(Math.random() * 3600000);
    const durationSecs = (15 + Math.floor(Math.random() * 6) * 10) * 60; // 15–65 分钟
    const sessionId = uuid();
    const [scId, scTitle] = scenarios[Math.floor(Math.random() * scenarios.length)];
    records.push({
      taskId: uuid(),
      taskText: tasks[Math.floor(Math.random() * tasks.length)],
      durationSecs,
      startedAt,
      sessionId,
      outcome: "completed",
      scenarioId: scId,
      scenarioTitle: scTitle,
      coinsEarned: Math.round(durationSecs / 60),
      distractionCount: Math.floor(Math.random() * 3),
      distractionSecs: 0,
      noteCount: Math.floor(Math.random() * 2),
      events: [],
    });
  }
}

// ── 带截止日期的任务（DDL 页） ──
const todos = [
  { text: "提交伦理审查材料", due: 2 },
  { text: "完成论文第三章", due: 6 },
  { text: "预约导师会议", due: -1 },
  { text: "准备中期汇报", due: 12 },
  { text: "数据清洗与分析", due: 20 },
].map((x) => ({
  id: uuid(),
  text: x.text,
  completed: false,
  createdAt: now,
  databaseId: "default",
  attrs: { dueDate: new Date(now + x.due * DAY).toISOString().slice(0, 10) },
}));

// ── 备忘录 ──
const memos = [
  "记得把参考文献格式统一成 APA",
  "灯灯的立绘想加一个夜间皮肤",
  "专注页 3D 模型再压一下体积",
].map((text, i) => ({ id: uuid(), text, createdAt: now - i * 3600000, source: "manual" }));

const seed = {
  focus_records_v1: records,
  todos_v1: todos,
  memos_v1: memos,
  coins_v1: 320,
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript((data) => {
  for (const [k, v] of Object.entries(data)) {
    localStorage.setItem(k, JSON.stringify({ version: 1, data: v }));
  }
}, seed);
const page = await ctx.newPage();
for (const [slug, path] of [
  ["home", "/"], ["calendar", "/calendar"], ["ddl", "/ddl"],
  ["memo", "/memo"], ["history", "/history"], ["analytics", "/analytics"],
]) {
  await page.goto(BASE + "/#" + path, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/seed-${slug}.png`, fullPage: slug === "history" || slug === "analytics" });
  console.log("ok", slug);
}
await browser.close();
console.log("done, records:", records.length);
