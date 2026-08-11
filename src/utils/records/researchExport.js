// CSV 导出逻辑 —— 与记录数据结构分离，便于独立修改格式。
import { todayDateStr } from "@/utils/records/researchRecords";

function csvField(val) {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// 表头随当前语言导出；t 由调用方（研究记录页）传入。
export function exportResearchCSV(records, t) {
  const headers = [
    "research.csv.date",
    "research.csv.maxFocus",
    "research.csv.totalFocus",
    "research.csv.distractions",
    "research.csv.tasksDone",
    "research.csv.focusLevel",
    "research.csv.startDifficulty",
    "research.csv.moodState",
    "research.csv.retroDistractions",
    "research.csv.procrastination",
    "research.csv.experience",
    "research.csv.savedAt",
  ].map((k) => csvField(t(k)));

  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));

  const rows = sorted.map((r) => [
    csvField(r.date),
    csvField(r.autoData?.maxFocusDurationSecs ?? ""),
    csvField(r.autoData?.totalFocusDurationSecs ?? ""),
    csvField(r.autoData?.realtimeDistractionCount ?? ""),
    csvField(r.autoData?.taskCompletedCount ?? ""),
    csvField(r.scales?.focusLevel ?? ""),
    csvField(r.scales?.startDifficulty ?? ""),
    csvField(r.scales?.moodState ?? ""),
    csvField(r.retrospective?.distractionCount ?? ""),
    csvField(r.retrospective?.procrastinationMins ?? ""),
    csvField(r.experience ?? ""),
    csvField(r.savedAt ? new Date(r.savedAt).toISOString() : ""),
  ]);

  const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  const bom = "﻿"; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: `research-export-${todayDateStr()}.csv`,
  });
  a.click();
  URL.revokeObjectURL(url);
}
