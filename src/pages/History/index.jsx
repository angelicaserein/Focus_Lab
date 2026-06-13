import React, { useMemo, useState, useRef, useEffect } from "react";
import { useTodos } from "../../context/TodoContext";
import "./History.css";

function fmtDuration(secs) {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function fmtDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const isYesterday = (() => {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return (
      d.getDate() === y.getDate() &&
      d.getMonth() === y.getMonth() &&
      d.getFullYear() === y.getFullYear()
    );
  })();

  const time = d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `今天 ${time}`;
  if (isYesterday) return `昨天 ${time}`;
  return d.toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function groupByDay(records) {
  const groups = {};
  for (const r of records) {
    const key = new Date(r.startedAt).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }
  return Object.entries(groups);
}

function last7DaysData(records) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const nextD = new Date(d);
    nextD.setDate(nextD.getDate() + 1);
    const label = i === 0 ? "今天" : `${d.getMonth() + 1}/${d.getDate()}`;
    const totalSecs = records
      .filter((r) => r.startedAt >= d.getTime() && r.startedAt < nextD.getTime())
      .reduce((sum, r) => sum + r.durationSecs, 0);
    days.push({ label, totalSecs });
  }
  return days;
}

export default function HistoryPage() {
  const { focusRecords, clearFocusRecords } = useTodos();
  const [confirmClear, setConfirmClear] = useState(false);
  const confirmTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);

  const totalSecs = useMemo(
    () => focusRecords.reduce((s, r) => s + r.durationSecs, 0),
    [focusRecords]
  );

  const todaySecs = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return focusRecords
      .filter((r) => r.startedAt >= now.getTime())
      .reduce((s, r) => s + r.durationSecs, 0);
  }, [focusRecords]);

  const longestSecs = useMemo(
    () => focusRecords.reduce((max, r) => Math.max(max, r.durationSecs), 0),
    [focusRecords]
  );

  const avgSecs = useMemo(
    () => (focusRecords.length > 0 ? Math.round(totalSecs / focusRecords.length) : 0),
    [totalSecs, focusRecords]
  );

  const taskBreakdown = useMemo(() => {
    const map = {};
    for (const r of focusRecords) {
      const key = r.taskText;
      if (!map[key]) map[key] = { text: r.taskText, totalSecs: 0, sessions: 0 };
      map[key].totalSecs += r.durationSecs;
      map[key].sessions += 1;
    }
    return Object.values(map).sort((a, b) => b.totalSecs - a.totalSecs).slice(0, 6);
  }, [focusRecords]);

  const taskBreakdownMax = taskBreakdown.length > 0 ? taskBreakdown[0].totalSecs : 1;

  const grouped = useMemo(() => groupByDay(focusRecords), [focusRecords]);
  const chartData = useMemo(() => last7DaysData(focusRecords), [focusRecords]);
  const chartMax = Math.max(...chartData.map((d) => d.totalSecs), 1);

  const handleClear = () => {
    if (confirmClear) {
      clearFocusRecords();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      confirmTimerRef.current = setTimeout(() => setConfirmClear(false), 3000);
    }
  };

  return (
    <div className="page-history">
      {/* Header */}
      <div className="history-headline">
        <h1>历史</h1>
      </div>

      {/* Stats cards — row 1 */}
      <div className="hist-stats">
        <div className="hist-stat-card">
          <div className="hist-stat-value">{focusRecords.length}</div>
          <div className="hist-stat-label">累计专注次数</div>
        </div>
        <div className="hist-stat-card accent">
          <div className="hist-stat-value">{fmtDuration(totalSecs)}</div>
          <div className="hist-stat-label">累计专注时长</div>
        </div>
        <div className="hist-stat-card">
          <div className="hist-stat-value">{fmtDuration(todaySecs)}</div>
          <div className="hist-stat-label">今日专注时长</div>
        </div>
      </div>

      {/* Stats cards — row 2 */}
      <div className="hist-stats hist-stats-row2">
        <div className="hist-stat-card">
          <div className="hist-stat-value">
            {longestSecs > 0 ? fmtDuration(longestSecs) : "—"}
          </div>
          <div className="hist-stat-label">最长单次专注</div>
        </div>
        <div className="hist-stat-card">
          <div className="hist-stat-value">
            {avgSecs > 0 ? fmtDuration(avgSecs) : "—"}
          </div>
          <div className="hist-stat-label">平均专注时长</div>
        </div>
      </div>

      {/* 7-day bar chart */}
      <div className="hist-section">
        <div className="hist-section-title">近 7 天专注时长</div>
        <div className="hist-chart">
          {chartData.map((d) => (
            <div key={d.label} className="hist-bar-col">
              <div className="hist-bar-top-val">
                {d.totalSecs > 0 ? fmtDuration(d.totalSecs) : ""}
              </div>
              <div className="hist-bar-wrap">
                <div
                  className="hist-bar-fill"
                  style={{ height: `${(d.totalSecs / chartMax) * 100}%` }}
                />
              </div>
              <div className="hist-bar-label">{d.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Task breakdown */}
      {taskBreakdown.length > 0 && (
        <div className="hist-section">
          <div className="hist-section-title">任务专注排行</div>
          <div className="hist-task-breakdown">
            {taskBreakdown.map((t, i) => (
              <div key={t.text} className="hist-task-row">
                <div className="hist-task-meta">
                  <span className="hist-task-rank">#{i + 1}</span>
                  <span className="hist-task-name">{t.text}</span>
                  <span className="hist-task-sessions">{t.sessions} 次</span>
                  <span className="hist-task-dur">{fmtDuration(t.totalSecs)}</span>
                </div>
                <div className="hist-task-track">
                  <div
                    className="hist-task-bar"
                    style={{ width: `${(t.totalSecs / taskBreakdownMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Record list */}
      <div className="hist-section">
        <div className="hist-section-header">
          <div className="hist-section-title">全部记录</div>
          {focusRecords.length > 0 && (
            <button
              type="button"
              className={`hist-clear-btn ${confirmClear ? "confirm" : ""}`}
              onClick={handleClear}
            >
              {confirmClear ? "确认清除？" : "清除记录"}
            </button>
          )}
        </div>

        {focusRecords.length === 0 ? (
          <div className="hist-empty">
            还没有专注记录。去 Focus 页面开始你的第一次专注吧！
          </div>
        ) : (
          grouped.map(([day, records]) => (
            <div key={day} className="hist-day-group">
              <div className="hist-day-label">{day}</div>
              <div className="hist-records">
                {records.map((r) => (
                  <div key={r.id} className="hist-record-card">
                    <div className="hist-record-left">
                      <div className="hist-record-task">{r.taskText}</div>
                      <div className="hist-record-time">{fmtDate(r.startedAt)}</div>
                    </div>
                    <div className="hist-record-duration">{fmtDuration(r.durationSecs)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
