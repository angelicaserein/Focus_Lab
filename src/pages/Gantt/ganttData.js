// 通用甘特图 maker 的数据模型（可编辑、多项目）。
//
// 结构：
//   project = { id, name, unit, startDate, endDate, lanes[], tasks[] }
//     • unit ∈ {day, week, month} —— 时间轴一列覆盖一个 unit
//     • startDate / endDate —— 真实 ISO 日期，决定时间轴范围
//     • lanes = [{ id, label }] —— 用户完全自定义的分组（泳道），顺序即上下排布顺序
//     • tasks = [{ id, laneId, title, tag, start, end }] —— start/end 为真实 ISO 日期
//   「行号」不落库：渲染时由 buildLayout() 贪心排布（见 ganttDate.js）。
//
// 首次进入时 DEFAULT_PROJECTS 作为种子写入 localStorage，之后完全以用户数据为准。
// 默认项目是那份 13 周研究计划（转写自会议 gantt-chart.png），既留作示例、也不丢原数据。

import { addUnits } from "./ganttDate";

// 类别标签的建议值（编辑表单里做 datalist，用户仍可自由输入其它文本）。
export const TAG_SUGGESTIONS = [
  "Proposal", "Ethics", "Report", "Cooperation",
  "Requirements", "Design", "Dev", "Experiment", "ABAB phases",
];

export function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── 研究计划种子：用「第几周」描述，转成真实日期 ──
const PLAN_START = "2025-06-04"; // Week01 起始日
const week = (n) => addUnits(PLAN_START, n - 1, "week"); // 第 n 周（1 起）的起始 ISO
const weekEnd = (n) => addUnits(week(n), 6, "day"); // 第 n 周的最后一天

// 泳道 id 用稳定短串，方便种子任务引用。
const L_DOC = "lane-documentation";
const L_DEV = "lane-development";
const L_EVAL = "lane-evaluation";

const PLAN_TASKS = [
  [L_DOC, 1, 1, "Draft the initial proposal", "Proposal"],
  [L_DOC, 2, 2, "Refine the proposal", "Proposal"],
  [L_DOC, 3, 4, "Ethics application", "Ethics"],
  [L_DOC, 5, 13, "Ethics review pending (FREC decision)", "Ethics"],
  [L_DOC, 1, 3, "Conduct literature review", "Report"],
  [L_DOC, 4, 10, "Draft the initial report", "Report"],
  [L_DOC, 11, 12, "Analyze data and refine the report", "Report"],
  [L_DOC, 13, 13, "Final review and polishing", "Report"],

  [L_DEV, 1, 1, "Establish collaboration with the participant", "Cooperation"],
  [L_DEV, 2, 2, "Finalize the co-design process", "Cooperation"],
  [L_DEV, 3, 6, "Collect feedback", "Cooperation"],
  [L_DEV, 1, 2, "Elicit requirements", "Requirements"],
  [L_DEV, 3, 4, "Conduct requirements analysis", "Requirements"],
  [L_DEV, 1, 2, "Define prototype scope and technical approach", "Design"],
  [L_DEV, 3, 4, "Complete prototype design specification", "Design"],
  [L_DEV, 3, 5, "Features iterative development", "Dev"],
  [L_DEV, 6, 8, "UI/UX improvement", "Dev"],
  [L_DEV, 9, 11, "Optimize and refine code", "Dev"],

  [L_EVAL, 2, 2, "Design evaluation methods", "Experiment"],
  [L_EVAL, 3, 3, "Improve the evaluation design and questionnaire", "Experiment"],
  [L_EVAL, 4, 5, "A: Phase 1 Baseline", "ABAB phases"],
  [L_EVAL, 6, 7, "B: Phase 2 Intervention", "ABAB phases"],
  [L_EVAL, 8, 9, "A: Phase 3 Return to Baseline", "ABAB phases"],
  [L_EVAL, 10, 11, "B: Phase 4 Re-intervention", "ABAB phases"],
].map(([laneId, s, e, title, tag], i) => ({
  id: `seed-${i}`,
  laneId,
  title,
  tag,
  start: week(s),
  end: weekEnd(e),
}));

export const DEFAULT_PROJECTS = [
  {
    id: "project-research-plan",
    name: "Research Plan",
    unit: "week",
    startDate: PLAN_START,
    endDate: weekEnd(13),
    lanes: [
      { id: L_DOC, label: "Documentation" },
      { id: L_DEV, label: "Development" },
      { id: L_EVAL, label: "Evaluation" },
    ],
    tasks: PLAN_TASKS,
  },
];

// 新建一张空图：默认「周」粒度、今天起 8 周、一条空泳道。
export function makeEmptyProject(name, todayISO) {
  return {
    id: newId(),
    name: name || "New chart",
    unit: "week",
    startDate: todayISO,
    endDate: addUnits(todayISO, 8, "week"),
    lanes: [{ id: newId(), label: "Group 1" }],
    tasks: [],
  };
}
