import { useMemo } from "react";
import { useFocus } from "../context/FocusContext";
import { useScenarios } from "../context/ScenarioContext";
import { totalFocusSecs, last7DaysData, sessionKey } from "../utils/focusRecords";

function buildScenarioStats(records, scenarioId) {
  const recs = scenarioId
    ? records.filter((r) => r.scenarioId === scenarioId)
    : records.filter((r) => !r.scenarioId);
  if (!recs.length) return null;

  const sessions = new Set(recs.map((r) => sessionKey(r))).size;
  const secs = totalFocusSecs(recs);
  const lastUsed = Math.max(...recs.map((r) => r.endedAt ?? r.startedAt));

  const taskMap = {};
  for (const r of recs) {
    const key = r.taskText || "(未命名)";
    if (!taskMap[key]) taskMap[key] = { text: key, totalSecs: 0, count: 0 };
    taskMap[key].totalSecs += r.durationSecs;
    taskMap[key].count += 1;
  }
  const topTasks = Object.values(taskMap)
    .sort((a, b) => b.totalSecs - a.totalSecs)
    .slice(0, 5);

  const chartData = last7DaysData(recs);

  return { sessions, secs, lastUsed, topTasks, chartData };
}

/**
 * ScenarioStats 页的只读数据层。
 * 整合 FocusContext + ScenarioContext 的跨域查询，
 * 页面组件只负责渲染。
 */
export default function useScenarioAnalytics() {
  const { focusRecords } = useFocus();
  const { scenarios } = useScenarios();

  const rows = useMemo(() => {
    const result = [];
    for (const s of scenarios) {
      const st = buildScenarioStats(focusRecords, s.id);
      if (!st) continue;
      result.push({ id: s.id, title: s.title, ...st });
    }
    const unclassified = buildScenarioStats(focusRecords, null);
    if (unclassified) {
      result.push({ id: "__unclassified__", title: "(未分类)", ...unclassified });
    }
    return result.sort((a, b) => b.secs - a.secs);
  }, [scenarios, focusRecords]);

  const totals = useMemo(() => {
    const allWithScenario = focusRecords.filter((r) => r.scenarioId);
    return {
      secs: totalFocusSecs(allWithScenario),
      sessions: new Set(allWithScenario.map((r) => sessionKey(r))).size,
      scenarioCount: rows.filter((r) => r.id !== "__unclassified__").length,
    };
  }, [focusRecords, rows]);

  return { rows, totals };
}
