// 甘特图的时间轴底层：真实日历日期 ⇄ 列索引的换算。
//
// 一张图有 { startDate, endDate, unit } 三要素，unit ∈ {day, week, month}。
// 时间轴被切成若干「列」，每列覆盖一个 unit；任务用真实起止日期（ISO "YYYY-MM-DD"）
// 存储，渲染时再映射到列索引。所有日期都按**本地时间**解析，避开 UTC 把凌晨算成前一天。

export const UNITS = ["day", "week", "month"];

// 列数上限：防止用户选了「日」粒度 + 跨好几年导致网格爆炸。超出则截断到此数。
const MAX_COLUMNS = 260;

// ── ISO 字符串 ⇄ 本地 Date ──
export function parseISO(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function toISO(dt) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISO() {
  return toISO(new Date());
}

function addDays(dt, n) {
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + n);
}
function addMonths(dt, n) {
  return new Date(dt.getFullYear(), dt.getMonth() + n, dt.getDate());
}

// 在某个 ISO 日期上加 n 个 unit，返回新的 ISO。n 可为负。
export function addUnits(iso, n, unit) {
  const dt = parseISO(iso);
  if (!dt) return iso;
  if (unit === "month") return toISO(addMonths(dt, n));
  return toISO(addDays(dt, unit === "week" ? n * 7 : n));
}

// 两个 ISO 相差多少「天」（b - a，可为负）。
export function diffDays(a, b) {
  const da = parseISO(a);
  const db = parseISO(b);
  if (!da || !db) return 0;
  return Math.round((db - da) / 86400000);
}

// locale 映射：语言上下文的 'zh' | 'en' → Intl locale。
function intlLocale(lang) {
  return lang === "en" ? "en-US" : "zh-CN";
}

// 依据 { startDate, endDate, unit } 生成列数组。
// 每列： { index, startISO, endISO(闭区间末日), primary, secondary }
export function buildColumns(startISO, endISO, unit, lang = "zh") {
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  if (!start || !end || end < start) return [];

  const loc = intlLocale(lang);
  const weekdayFmt = new Intl.DateTimeFormat(loc, { weekday: "short" });
  const monthFmt = new Intl.DateTimeFormat(loc, { month: "short" });

  const cols = [];
  let cur = new Date(start);
  while (cur <= end && cols.length < MAX_COLUMNS) {
    const next =
      unit === "month" ? addMonths(cur, 1) : addDays(cur, unit === "week" ? 7 : 1);
    const lastDay = addDays(next, -1); // 本列闭区间的最后一天
    const m = cur.getMonth() + 1;
    const d = cur.getDate();

    let primary;
    let secondary;
    if (unit === "day") {
      primary = `${m}.${d}`;
      secondary = weekdayFmt.format(cur);
    } else if (unit === "week") {
      primary = `${m}.${d}`;
      secondary = `–${lastDay.getMonth() + 1}.${lastDay.getDate()}`;
    } else {
      primary = monthFmt.format(cur);
      secondary = String(cur.getFullYear());
    }

    cols.push({
      index: cols.length,
      startISO: toISO(cur),
      endISO: toISO(lastDay),
      primary,
      secondary,
    });
    cur = next;
  }
  return cols;
}

// 找出包含某日期的列索引：最后一个「列起始 ≤ 日期」的列。
// 日期早于时间轴 → 0；晚于时间轴 → 末列。即超范围的任务被夹到边缘列。
export function colOfDate(columns, iso) {
  if (columns.length === 0) return 0;
  const t = parseISO(iso);
  if (!t) return 0;
  let idx = 0;
  for (let i = 0; i < columns.length; i++) {
    if (parseISO(columns[i].startISO) <= t) idx = i;
    else break;
  }
  return idx;
}

// 贪心行排布（first-fit）：同一行内的任务列区间不重叠。返回带 row 的任务与总行数。
function packLane(laneTasks) {
  const rowEnds = []; // 每行当前占用到的最大 endCol
  const placed = laneTasks.map((task) => {
    let row = rowEnds.findIndex((end) => end < task.startCol);
    if (row === -1) {
      row = rowEnds.length;
      rowEnds.push(task.endCol);
    } else {
      rowEnds[row] = task.endCol;
    }
    return { ...task, row };
  });
  return { tasks: placed, rows: Math.max(rowEnds.length, 1) };
}

// 把某个项目排成带「绝对网格行号」的布局。第 1 行留给列表头，之后每条泳道占 rows 行。
// 空泳道也占 1 行，保证左侧标签与底色带都能显示。
export function buildLayout(project, columns) {
  const lanes = [];
  let cursor = 2;
  for (const lane of project.lanes) {
    const laneTasks = project.tasks
      .filter((tk) => tk.laneId === lane.id)
      .map((tk) => {
        const startCol = colOfDate(columns, tk.start);
        const endCol = Math.max(startCol, colOfDate(columns, tk.end));
        return { ...tk, startCol, endCol };
      });
    const { tasks: packed, rows } = packLane(laneTasks);
    lanes.push({ ...lane, startRow: cursor, rows, tasks: packed });
    cursor += rows;
  }
  return { lanes, totalRows: cursor - 1 };
}
