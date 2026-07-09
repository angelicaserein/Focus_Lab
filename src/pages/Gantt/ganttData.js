// 项目甘特图数据模型（可编辑）。
//
// 甘特逻辑：
//   • WEEKS 是列，一列一周；任务用 start/end（第几周，1..13，闭区间）定位。
//   • 泳道（lane）固定三条：Documentation / Development / Evaluation。
//   • 任务是扁平列表，每条 { id, lane, start, end, title, tag }。
//   • 「行号」不落库 —— 渲染时用 packLane() 贪心排布，保证同一行的任务时间不重叠，
//     用户增删改后永远不会撞车。
//
// 首次进入时 DEFAULT_TASKS 会写入 localStorage 作为种子（转写自
// 会议/first-meeting6.23/gantt-chart.png），之后完全以用户编辑后的数据为准。

export const TOTAL_WEEKS = 13;

// 每周表头：主标题 + 日期区间副标题。
export const WEEKS = [
  { label: "Week01", range: "6.4–6.10" },
  { label: "Week02", range: "6.11–6.17" },
  { label: "Week03", range: "6.18–6.24" },
  { label: "Week04", range: "6.25–7.1" },
  { label: "Week05", range: "7.2–7.8" },
  { label: "Week06", range: "7.9–7.15" },
  { label: "Week07", range: "7.16–7.22" },
  { label: "Week08", range: "7.23–7.29" },
  { label: "Week09", range: "7.30–8.5" },
  { label: "Week10", range: "8.6–8.12" },
  { label: "Week11", range: "8.13–8.19" },
  { label: "Week12", range: "8.20–8.26" },
  { label: "Week13", range: "8.27–9.2" },
];

// 三条泳道（顺序即上下排布顺序）。
export const LANES = [
  { id: "documentation", label: "Documentation" },
  { id: "development",   label: "Development" },
  { id: "evaluation",    label: "Evaluation" },
];

// 类别标签建议值（编辑表单里做 datalist，用户也可自由输入其它文本）。
export const TAG_SUGGESTIONS = [
  "Proposal", "Ethics", "Report", "Cooperation",
  "Requirements", "Design", "Dev", "Experiment", "ABAB phases",
];

// 种子数据 —— 13 周研究计划。
export const DEFAULT_TASKS = [
  { id: "d1", lane: "documentation", start: 1,  end: 1,  title: "Draft the initial proposal", tag: "Proposal" },
  { id: "d2", lane: "documentation", start: 2,  end: 2,  title: "Refine the proposal", tag: "Proposal" },
  { id: "d3", lane: "documentation", start: 3,  end: 4,  title: "Ethics application", tag: "Ethics" },
  { id: "d4", lane: "documentation", start: 5,  end: 13, title: "Ethics review pending (FREC decision)", tag: "Ethics" },
  { id: "d5", lane: "documentation", start: 1,  end: 3,  title: "Conduct literature review", tag: "Report" },
  { id: "d6", lane: "documentation", start: 4,  end: 10, title: "Draft the initial report", tag: "Report" },
  { id: "d7", lane: "documentation", start: 11, end: 12, title: "Analyze data and refine the report", tag: "Report" },
  { id: "d8", lane: "documentation", start: 13, end: 13, title: "Final review and polishing", tag: "Report" },

  { id: "v1", lane: "development", start: 1, end: 1,  title: "Establish collaboration with the participant", tag: "Cooperation" },
  { id: "v2", lane: "development", start: 2, end: 2,  title: "Finalize the co-design process", tag: "Cooperation" },
  { id: "v3", lane: "development", start: 3, end: 6,  title: "Collect feedback", tag: "Cooperation" },
  { id: "v4", lane: "development", start: 1, end: 2,  title: "Elicit requirements", tag: "Requirements" },
  { id: "v5", lane: "development", start: 3, end: 4,  title: "Conduct requirements analysis", tag: "Requirements" },
  { id: "v6", lane: "development", start: 1, end: 2,  title: "Define prototype scope and technical approach", tag: "Design" },
  { id: "v7", lane: "development", start: 3, end: 4,  title: "Complete prototype design specification", tag: "Design" },
  { id: "v8", lane: "development", start: 3, end: 5,  title: "Features iterative development", tag: "Dev" },
  { id: "v9", lane: "development", start: 6, end: 8,  title: "UI/UX improvement", tag: "Dev" },
  { id: "v10", lane: "development", start: 9, end: 11, title: "Optimize and refine code", tag: "Dev" },

  { id: "e1", lane: "evaluation", start: 2,  end: 2,  title: "Design evaluation methods", tag: "Experiment" },
  { id: "e2", lane: "evaluation", start: 3,  end: 3,  title: "Improve the evaluation design and questionnaire", tag: "Experiment" },
  { id: "e3", lane: "evaluation", start: 4,  end: 5,  title: "A: Phase 1 Baseline", tag: "ABAB phases" },
  { id: "e4", lane: "evaluation", start: 6,  end: 7,  title: "B: Phase 2 Intervention", tag: "ABAB phases" },
  { id: "e5", lane: "evaluation", start: 8,  end: 9,  title: "A: Phase 3 Return to Baseline", tag: "ABAB phases" },
  { id: "e6", lane: "evaluation", start: 10, end: 11, title: "B: Phase 4 Re-intervention", tag: "ABAB phases" },
];

// 贪心行排布（first-fit，按输入顺序）：把一条泳道内的任务放进「起始周晚于该行现有
// 最晚结束周」的第一行，放不下就开新行。保证同一行内时间不重叠。
//
// 特意「不排序」而保留声明/添加顺序：DEFAULT_TASKS 是按语义分行（同类任务写在一起）
// 编排的，按原顺序 first-fit 恰好还原那份整洁排布；用户新增的任务追加在末尾，
// 会自动回填到合适的空位。rowEnds[r] 恒为该行最大结束周，故判据充分、任意顺序都不重叠。
export function packLane(laneTasks) {
  const rowEnds = []; // 每一行当前已占用到的最晚结束周
  const placed = laneTasks.map((t) => {
    let row = rowEnds.findIndex((end) => end < t.start);
    if (row === -1) {
      row = rowEnds.length;
      rowEnds.push(t.end);
    } else {
      rowEnds[row] = t.end;
    }
    return { ...t, row };
  });
  return { tasks: placed, rows: Math.max(rowEnds.length, 1) };
}

// 把扁平任务列表按 LANES 顺序排成带「绝对网格行号」的布局。
// 第 1 行留给周表头，之后每条泳道占 rows 行。
export function buildLayout(tasks) {
  const lanes = [];
  let cursor = 2;
  for (const meta of LANES) {
    const { tasks: packed, rows } = packLane(tasks.filter((t) => t.lane === meta.id));
    lanes.push({ ...meta, startRow: cursor, rows, tasks: packed });
    cursor += rows;
  }
  return { lanes, totalRows: cursor - 1 };
}
