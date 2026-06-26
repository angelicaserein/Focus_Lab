import React from "react";

function prevDay(dateStr) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d - 1)).toISOString().slice(0, 10);
}

function nextDay(dateStr) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d + 1)).toISOString().slice(0, 10);
}

function formatDateLabel(dateStr) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, 12)).toLocaleDateString("zh-CN", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export default function DateNavigation({ dateStr, isToday, hasSavedRecord, onDateChange }) {
  return (
    <div className="research-date-nav">
      <button
        type="button"
        className="research-date-nav-btn"
        onClick={() => onDateChange(prevDay(dateStr))}
        aria-label="前一天"
      >
        ←
      </button>
      <span className="research-date-label">{formatDateLabel(dateStr)}</span>
      <button
        type="button"
        className="research-date-nav-btn"
        onClick={() => onDateChange(nextDay(dateStr))}
        disabled={isToday}
        aria-label="后一天"
      >
        →
      </button>
      <span
        className={`research-date-badge ${
          hasSavedRecord ? "research-date-badge--saved" : "research-date-badge--unsaved"
        }`}
      >
        {hasSavedRecord ? "已保存" : "未保存"}
      </span>
    </div>
  );
}
