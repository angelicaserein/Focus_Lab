// 项目甘特图数据 —— 转写自研究计划甘特图（会议/first-meeting6.23/gantt-chart.png）。
// 13 周研究周期，三条泳道：Documentation / Development / Evaluation。
//
// 甘特逻辑说明（供后续维护）：
//   • WEEKS 是列，一列一周，start/end 用「第几周」（1..13，闭区间）定位任务条。
//   • 每条泳道（lane）内部按 row 分行；同一 row 里的任务在时间上不重叠。
//   • 一条任务 = 一个色块，块内右侧挂一个类别标签（tag）。
// 改计划只需在此增删任务、调 start/end 即可，页面会自动重排。

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

// 三条泳道。每条泳道的 rowCount 由任务里最大的 row 推出。
export const LANES = [
  {
    id: "documentation",
    label: "Documentation",
    tasks: [
      { row: 0, start: 1,  end: 1,  title: "Draft the initial proposal", tag: "Proposal" },
      { row: 0, start: 2,  end: 2,  title: "Refine the proposal", tag: "Proposal" },
      { row: 0, start: 3,  end: 4,  title: "Ethics application", tag: "Ethics" },
      { row: 0, start: 5,  end: 13, title: "Ethics review pending (FREC decision)", tag: "Ethics" },
      { row: 1, start: 1,  end: 3,  title: "Conduct literature review", tag: "Report" },
      { row: 1, start: 4,  end: 10, title: "Draft the initial report", tag: "Report" },
      { row: 1, start: 11, end: 12, title: "Analyze data and refine the report", tag: "Report" },
      { row: 1, start: 13, end: 13, title: "Final review and polishing", tag: "Report" },
    ],
  },
  {
    id: "development",
    label: "Development",
    tasks: [
      { row: 0, start: 1, end: 1,  title: "Establish collaboration with the participant", tag: "Cooperation" },
      { row: 0, start: 2, end: 2,  title: "Finalize the co-design process", tag: "Cooperation" },
      { row: 0, start: 3, end: 6,  title: "Collect feedback", tag: "Cooperation" },
      { row: 1, start: 1, end: 2,  title: "Elicit requirements", tag: "Requirements" },
      { row: 1, start: 3, end: 4,  title: "Conduct requirements analysis", tag: "Requirements" },
      { row: 2, start: 1, end: 2,  title: "Define prototype scope and technical approach", tag: "Design" },
      { row: 2, start: 3, end: 4,  title: "Complete prototype design specification", tag: "Design" },
      { row: 3, start: 3, end: 5,  title: "Features iterative development", tag: "Dev" },
      { row: 3, start: 6, end: 8,  title: "UI/UX improvement", tag: "Dev" },
      { row: 3, start: 9, end: 11, title: "Optimize and refine code", tag: "Dev" },
    ],
  },
  {
    id: "evaluation",
    label: "Evaluation",
    tasks: [
      { row: 0, start: 2,  end: 2,  title: "Design evaluation methods", tag: "Experiment" },
      { row: 0, start: 3,  end: 3,  title: "Improve the evaluation design and questionnaire", tag: "Experiment" },
      { row: 0, start: 4,  end: 5,  title: "A: Phase 1 Baseline", tag: "ABAB phases" },
      { row: 0, start: 6,  end: 7,  title: "B: Phase 2 Intervention", tag: "ABAB phases" },
      { row: 0, start: 8,  end: 9,  title: "A: Phase 3 Return to Baseline", tag: "ABAB phases" },
      { row: 0, start: 10, end: 11, title: "B: Phase 4 Re-intervention", tag: "ABAB phases" },
    ],
  },
];

// 泳道内行数 = 最大 row + 1。
export function laneRowCount(lane) {
  return lane.tasks.reduce((max, t) => Math.max(max, t.row), 0) + 1;
}
