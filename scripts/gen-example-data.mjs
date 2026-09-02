// 生成一份「最近一周」的示例备份（全部内容都是 example*），
// 输出 .tmp/focuslab-example-week.json，可在 设置 → 数据 里导入。
//
// 只是造数据，不改任何业务代码。日期以运行当天为最后一天，往前铺 7 天。
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "..", ".tmp", "focuslab-example-week.json");
const SCHEMA_VERSION = 10;

// ── 时间轴：今天为第 6 天（0..6 = 一周前 → 今天）──────────────
const now = new Date();
const midnight = (offsetDays) => {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - offsetDays));
  return d.getTime();
};
const at = (day, h, m = 0) => midnight(day) + h * 3600000 + m * 60000;
const iso = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const dayISO = (offsetDays) => iso(midnight(offsetDays));
const futureISO = (n) => iso(midnight(6) + n * 86400000);

// 确定性 id（不用随机数，重跑生成同一份文件，便于比对）
const uid = (p, i) => `${p}-example-${String(i).padStart(4, "0")}`;

// ── 任务库列定义（出厂四列，否则示例任务的属性在界面上看不见）──
const databases = [{
  id: "default",
  nameKey: "tasks.db.defaultName",
  order: 0,
  attrs: [
    {
      id: "priority", nameKey: "tasks.attr.priority", type: "select",
      system: true, visible: true, order: 0,
      options: [
        { id: "urgent_important", labelKey: "tasks.priority.urgentImportant", color: "#ef4444", sortWeight: 4 },
        { id: "important",        labelKey: "tasks.priority.important",       color: "#3b82f6", sortWeight: 3 },
        { id: "urgent",           labelKey: "tasks.priority.urgent",          color: "#f97316", sortWeight: 2 },
        { id: "trivial",          labelKey: "tasks.priority.trivial",         color: "#9ca3af", sortWeight: 1 },
      ],
    },
    {
      id: "tags", nameKey: "tasks.attr.tags", type: "multiselect",
      system: true, visible: true, order: 1,
      options: [
        { id: "project", labelKey: "scenario.taskType.project", icon: "📁" },
        { id: "job",     labelKey: "scenario.taskType.job",     icon: "💼" },
        { id: "chore",   labelKey: "scenario.taskType.chore",   icon: "🧺" },
        { id: "fun",     labelKey: "scenario.taskType.fun",     icon: "🎮" },
      ],
    },
    { id: "dueDate", nameKey: "tasks.attr.dueDate", type: "date", system: true, visible: true, order: 2 },
    { id: "notes",   nameKey: "tasks.attr.notes",   type: "text", system: true, visible: true, order: 3 },
  ],
}];

// ── 待办 example1 … example14 ────────────────────────────────
const PRIO = ["urgent_important", "important", "urgent", "trivial"];
const TAGS = [["project"], ["job"], ["chore"], ["fun"], ["project", "job"]];
const todos = Array.from({ length: 14 }, (_, i) => {
  const n = i + 1;
  const completed = n <= 6;                 // 前 6 条已完成
  const createdDay = Math.min(6, Math.floor(i / 2));
  const todo = {
    id: uid("todo", n),
    text: `example${n}`,
    completed,
    createdAt: at(createdDay, 9, i * 7),
    databaseId: "default",
    attrs: {
      priority: PRIO[i % 4],
      tags: TAGS[i % 5],
      notes: `example note ${n}`,
      // 截止日：一部分已过期、一部分就在这两天、其余往后铺
      dueDate: futureISO(n - 4),
    },
  };
  if (n === 13) { todo.recurringDays = [1, 3, 5]; todo.lastResetDate = dayISO(6); }
  if (n === 14) { todo.recurringDays = [0, 1, 2, 3, 4, 5, 6]; todo.lastResetDate = dayISO(6); }
  return todo;
});

// ── DDL 提醒节点：给前 5 条未完成任务各配两个 ──────────────────
const ddlCheckpoints = {};
todos.filter((t) => !t.completed).slice(0, 5).forEach((t, i) => {
  ddlCheckpoints[t.id] = [
    { id: uid("cp", i * 2 + 1), daysBeforeDeadline: 3, message: `example checkpoint ${i * 2 + 1}`, done: i === 0 },
    { id: uid("cp", i * 2 + 2), daysBeforeDeadline: 1, message: `example checkpoint ${i * 2 + 2}`, done: false },
  ];
});

// ── 情景 ─────────────────────────────────────────────────────
const scenarios = [
  { id: "scenario-example-1", title: "example scenario 1", description: "example description 1",
    createdAt: at(0, 8), settings: { devices: ["computer", "headphones"], communication: "silent", taskTypes: ["project"] } },
  { id: "scenario-example-2", title: "example scenario 2", description: "example description 2",
    createdAt: at(1, 8), settings: { devices: ["phone"], communication: "textonly", taskTypes: ["job", "chore"] } },
  { id: "scenario-example-3", title: "example scenario 3", description: "example description 3",
    createdAt: at(2, 8), settings: { devices: ["paper"], communication: "talking", taskTypes: ["fun"] } },
];
const activeScenario = scenarios[0].id;

// ── 烧瓶架 ───────────────────────────────────────────────────
const FLASK_PRESETS = {
  round:    { neckHalf: 14, neckLen: 28, shoulderY: 44, bodyHalf: 34, bottomRound: 30 },
  triangle: { neckHalf: 8,  neckLen: 26, shoulderY: 42, bodyHalf: 34, bottomRound: 6 },
  beaker:   { neckHalf: 26, neckLen: 8,  shoulderY: 24, bodyHalf: 28, bottomRound: 5 },
};
const flasks = ["round", "triangle", "beaker"].map((preset, i) => ({
  id: uid("flask", i + 1),
  name: `example flask ${i + 1}`,
  preset,
  params: { ...FLASK_PRESETS[preset] },
  savedAt: at(0, 9, i * 20),
}));
const flaskShelf = { items: flasks, activeId: flasks[0].id };

// ── 一周的专注会话 ───────────────────────────────────────────
// 每天 2–3 段，每段挂 1 个任务；分心 / 随记 / 使用记录都由这里派生。
const focusRecords = [];
const distractions = [];
const notes = [];
let seq = 0;

const SESSION_PLAN = [
  // [第几天, 起始小时, 分钟数, 任务下标, 结果]
  [0, 9, 25, 0, "completed"], [0, 14, 45, 1, "ended"],
  [1, 10, 25, 2, "completed"], [1, 16, 15, 3, "ended"], [1, 20, 50, 4, "completed"],
  [2, 9, 45, 5, "completed"], [2, 15, 25, 6, "ended"],
  [3, 11, 30, 7, "removed"], [3, 19, 60, 8, "completed"],
  [4, 9, 25, 9, "ended"], [4, 13, 45, 10, "completed"], [4, 21, 20, 11, "ended"],
  [5, 10, 50, 12, "completed"], [5, 17, 25, 13, "ended"],
  [6, 9, 30, 6, "ended"], [6, 14, 40, 7, "ended"],
];

SESSION_PLAN.forEach(([day, hour, mins, taskIdx, outcome], i) => {
  seq += 1;
  const todo = todos[taskIdx];
  const startedAt = at(day, hour);
  const durationSecs = mins * 60;
  const endedAt = startedAt + durationSecs * 1000;
  const sessionId = uid("session", seq);
  const scenario = scenarios[i % scenarios.length];
  const flask = flasks[i % flasks.length];

  // 分心：反应式 1 条 + 主动式 1 条 + 桌面版程序切换 1 条
  const dTags = ["example distraction tag 1", "example distraction tag 2", "example distraction tag 3"];
  const base = { sessionId, taskIds: [todo.id] };
  distractions.push({
    ...base, id: uid("dist", seq * 3 - 2), ts: startedAt + 5 * 60000,
    type: "reactive", tag: dTags[i % 3], note: `example distraction note ${seq}`,
  });
  distractions.push({
    ...base, id: uid("dist", seq * 3 - 1), ts: startedAt + 12 * 60000,
    type: "proactive", tag: dTags[(i + 1) % 3], note: null, durationSecs: 120,
  });
  distractions.push({
    ...base, id: uid("dist", seq * 3), ts: startedAt + 18 * 60000, endTs: startedAt + 19 * 60000,
    type: "app", tag: `example-app-${(i % 3) + 1}.exe`, note: null,
    durationSecs: 60, appName: `example-app-${(i % 3) + 1}.exe`,
  });

  // 随记（专注页写的，备忘录里合并展示）
  notes.push({
    ...base, id: uid("note", seq), ts: startedAt + 8 * 60000,
    text: `example focus note ${seq}`,
  });

  focusRecords.push({
    id: uid("rec", seq),
    taskId: todo.id,
    taskText: todo.text,
    durationSecs,
    startedAt,
    endedAt,
    sessionId,
    outcome,
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    flaskId: flask.id,
    coinsEarned: durationSecs,
    distractionCount: 3,
    distractionSecs: 180,
    noteCount: 1,
    events: [
      { type: "session_start", ts: startedAt },
      { type: "distraction", ts: startedAt + 5 * 60000 },
      { type: "note_added", ts: startedAt + 8 * 60000 },
      { type: `task_${outcome}`, ts: endedAt, taskId: todo.id, taskText: todo.text },
    ],
  });
});
focusRecords.reverse(); // 新的在前（与应用写入顺序一致）

// ── 使用记录（专注之外的动作）──────────────────────────────
const activityLog = [];
todos.forEach((t, i) => {
  activityLog.push({ id: uid("act", i * 2 + 1), type: "add", ts: t.createdAt, taskId: t.id, text: t.text });
  if (t.completed) {
    activityLog.push({ id: uid("act", i * 2 + 2), type: "complete", ts: t.createdAt + 3 * 3600000, taskId: t.id, text: t.text });
  }
});
activityLog.push({ id: uid("act", 900), type: "delete", ts: at(3, 18), taskId: uid("todo", 99), text: "example deleted task" });
activityLog.push({ id: uid("act", 901), type: "uncomplete", ts: at(5, 12), taskId: todos[2].id, text: todos[2].text });
activityLog.sort((a, b) => a.ts - b.ts);

// ── 备忘录（手动添加的那一半）────────────────────────────────
const memos = Array.from({ length: 8 }, (_, i) => ({
  id: uid("memo", i + 1),
  ts: at(i % 7, 21, i * 3),
  text: `example memo ${i + 1}`,
  tags: [`example tag ${(i % 3) + 1}`],
})).reverse();

// ── 金币 / 商城 ──────────────────────────────────────────────
const coinsEarned = focusRecords.reduce((s, r) => s + r.coinsEarned, 0);
const customRewards = Array.from({ length: 4 }, (_, i) => ({
  id: `custom-example-${i + 1}`,
  name: `example reward ${i + 1}`,
  icon: ["🎁", "🍩", "🎬", "🛏"][i],
  price: [20, 35, 60, 90][i],
  type: "consumable",
  desc: `example reward description ${i + 1}`,
  custom: true,
}));
const ownedRewards = ["theme-ocean", "theme-pink"];
const redeemCounts = {
  "milk-tea": 3, coffee: 5, dessert: 1,
  "custom-example-1": 2, "custom-example-3": 1,
};
const spent = 40 + 30 + 15 * 3 + 12 * 5 + 20 + 20 * 2 + 60;
const coins = Math.max(0, coinsEarned - spent);

// ── 收集品 ───────────────────────────────────────────────────
const aquariumCollection = [
  { uid: "fish#example#0001", id: "fish", born: at(0, 10), sealedIn: null, sealedAt: null },
  { uid: "guppy#example#0002", id: "guppy", born: at(1, 11), sealedIn: null, sealedAt: null },
  { uid: "crab#example#0003", id: "crab", born: at(2, 12), sealedIn: null, sealedAt: null },
  { uid: "jelly#example#0004", id: "jelly", born: at(3, 13), sealedIn: null, sealedAt: null },
  { uid: "seahorse#example#0005", id: "seahorse", born: at(4, 14), sealedIn: null, sealedAt: null },
  { uid: "koi#example#0006", id: "koi", born: at(5, 15), sealedIn: null, sealedAt: null },
  { uid: "axolotl#example#0007", id: "axolotl", born: at(6, 9), sealedIn: null, sealedAt: null },
];
const companionCollection = ["outfit_leaf", "outfit_moon", "outfit_star", "lore_lab", "lore_lumi"];
const companionOutfit = "outfit_moon";
const skilltreeUnlocked = ["foc_root", "foc_l", "foc_r", "exe_root", "exe_l", "exp_root"];

// ── 甘特图：一个 example 项目 ────────────────────────────────
const ganttProjects = [{
  id: "gantt-example-1",
  name: "example project",
  unit: "day",
  startDate: dayISO(0),
  endDate: futureISO(7),
  lanes: [
    { id: "lane-example-1", label: "example lane 1" },
    { id: "lane-example-2", label: "example lane 2" },
  ],
  tasks: [
    { id: "gtask-example-1", laneId: "lane-example-1", title: "example gantt task 1", tag: "Design", start: dayISO(0), end: dayISO(2) },
    { id: "gtask-example-2", laneId: "lane-example-1", title: "example gantt task 2", tag: "Dev", start: dayISO(2), end: dayISO(5) },
    { id: "gtask-example-3", laneId: "lane-example-2", title: "example gantt task 3", tag: "Experiment", start: dayISO(3), end: dayISO(6) },
    { id: "gtask-example-4", laneId: "lane-example-2", title: "example gantt task 4", tag: "Report", start: dayISO(6), end: futureISO(4) },
  ],
}];

// ── 与伙伴的对话 ────────────────────────────────────────────
const chatHistory = Array.from({ length: 6 }, (_, i) => {
  const t = at(6 - Math.floor(i / 2), 15, i * 4);
  return i % 2 === 0
    ? { id: `u-example-${i}`, role: "user", text: `example message ${i + 1}`, ts: t }
    : { id: `a-example-${i}`, role: "ai", text: `example reply ${i + 1}`, ts: t + 20000 };
});

// ── 汇总 ─────────────────────────────────────────────────────
const data = {
  todos,
  databases,
  activeDatabase: "default",
  scenarios,
  activeScenario,
  scenarioOptions: {
    devices: [
      { id: "computer", labelKey: "scenario.device.computer", label: "", icon: "💻" },
      { id: "phone", labelKey: "scenario.device.phone", label: "", icon: "📱" },
      { id: "tablet", labelKey: "scenario.device.tablet", label: "", icon: "🖥" },
      { id: "paper", labelKey: "scenario.device.paper", label: "", icon: "📝" },
      { id: "headphones", labelKey: "scenario.device.headphones", label: "", icon: "🎧" },
      { id: "device-example-1", label: "example device", icon: "🔌" },
    ],
    communication: [
      { id: "talking", labelKey: "scenario.comm.talking", label: "" },
      { id: "textonly", labelKey: "scenario.comm.textonly", label: "" },
      { id: "silent", labelKey: "scenario.comm.silent", label: "" },
      { id: "comm-example-1", label: "example comm rule" },
    ],
  },
  focusRecords,
  activityLog,
  distractions,
  notes,
  memos,
  chatHistory,
  ddlCheckpoints,
  coins,
  ownedRewards,
  redeemCounts,
  customRewards,
  activeTheme: "theme-ocean",
  flaskShelf,
  flaskShelfSort: "saved",
  aquariumCollection,
  companionCollection,
  companionOutfit,
  skilltreeUnlocked,
  ganttProjects,
  ganttActiveProject: ganttProjects[0].id,
  disabledFeatures: [],
  enabledDeprecated: [],
  taskSplitPrefs: {
    granularity: "balanced",
    askFirst: true,
    guessDates: false,
    customRules: "example custom rule",
  },
  prefCountupFullMins: 25,
  prefCountdownMins: 25,
  prefCountupPresets: [15, 25, 45],
  prefCountdownPresets: [10, 25, 50],
  prefTimerMode: "countup",
  prefFlaskShape: { preset: "round", params: { ...FLASK_PRESETS.round } },
  prefAnimEnabled: true,
  prefRitualEnabled: true,
  prefCardVisible: true,
  prefNotifyEnabled: false,
  prefAppWatch: { enabled: false, allow: ["example-allowed-app.exe"] },
  prefLang: "zh",
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ schemaVersion: SCHEMA_VERSION, exportedAt: Date.now(), data }, null, 2), "utf8");
console.log(`wrote ${OUT}`);
console.log(`  todos ${todos.length} / focusRecords ${focusRecords.length} / distractions ${distractions.length} / memos ${memos.length} / coins ${coins}`);
