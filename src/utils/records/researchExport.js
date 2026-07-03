// CSV 导出逻辑 —— 与记录数据结构分离，便于独立修改格式。
import { todayDateStr } from "./researchRecords";

function csvField(val) {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function exportResearchCSV(records) {
  const headers = [
    "日期",
    "最大专注时长(秒)",
    "今日总专注时长(秒)",
    "实时分心次数",
    "任务完成数",
    "整体专注程度(1-5)",
    "启动困难程度(1-5)",
    "心情状态(1-5)",
    "回顾分心次数",
    "自感拖延时间(分钟)",
    "主观感受",
    "保存时间",
  ];

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
