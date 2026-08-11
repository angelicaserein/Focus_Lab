import React from "react";
import { useLanguage } from "@/context/LanguageContext";

function prevDay(dateStr) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d - 1)).toISOString().slice(0, 10);
}

function nextDay(dateStr) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d + 1)).toISOString().slice(0, 10);
}

function formatDateLabel(dateStr, lang) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, 12)).toLocaleDateString(lang === "en" ? "en-GB" : "zh-CN", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export default function DateNavigation({ dateStr, isToday, hasSavedRecord, onDateChange }) {
  const { t, lang } = useLanguage();

  return (
    <div className="research-date-nav">
      <button
        type="button"
        className="research-date-nav-btn"
        onClick={() => onDateChange(prevDay(dateStr))}
        aria-label={t("research.prevDay")}
      >
        ←
      </button>
      <span className="research-date-label">{formatDateLabel(dateStr, lang)}</span>
      <button
        type="button"
        className="research-date-nav-btn"
        onClick={() => onDateChange(nextDay(dateStr))}
        disabled={isToday}
        aria-label={t("research.nextDay")}
      >
        →
      </button>
      <span
        className={`research-date-badge ${
          hasSavedRecord ? "research-date-badge--saved" : "research-date-badge--unsaved"
        }`}
      >
        {hasSavedRecord ? t("research.saved") : t("research.unsaved")}
      </span>
    </div>
  );
}
