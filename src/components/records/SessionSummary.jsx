import React from "react";
import "./SessionSummary.css";
import { useLanguage } from "@/context/LanguageContext";
import { formatTimestamp, formatSessionDate } from "@/utils/time";
import { buildSessions } from "@/utils/analytics/sessionSummaryUtils";

// 时间轴页的随记回顾。分心记录不在这里——它有自己的一面：/distraction。
export default function SessionSummary({ notes = [] }) {
  const { t, lang } = useLanguage();

  const notesSessions = buildSessions(notes, (n) => ({ id: n.id, ts: n.ts, text: n.text }));

  if (notesSessions.length === 0) return null;

  return (
    <div className="session-summary">
      <div className="session-summary-header">{t("history.notes")}</div>
      <div className="session-summary-scroll">
        {notesSessions.map((session) => (
          <div key={session.firstTs} className="session-summary-group">
            <div className="session-summary-group-hd">
              <span className="session-summary-date">
                {formatSessionDate(session.firstTs, lang)}
              </span>
              <span className="session-stat note">✏ {session.items.length}</span>
            </div>
            <ul className="session-summary-list">
              {session.items
                .slice()
                .sort((a, b) => a.ts - b.ts)
                .map((item) => (
                  <li key={item.id} className="session-summary-row note">
                    <span className="session-summary-time">{formatTimestamp(item.ts)}</span>
                    <span className="session-summary-text">{item.text}</span>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
