import React from "react";
import "./SessionSummary.css";
import { useFocus } from "../../context/FocusContext";
import { useLanguage } from "../../context/LanguageContext";
import { formatTimestamp, formatSessionDate, formatDuration } from "../../utils/time";
import { buildSessions, enrichDistractionSessions } from "../../utils/sessionSummaryUtils";

export default function SessionSummary({ notes = [], distractions = [] }) {
  const { focusRecords } = useFocus();
  const { t } = useLanguage();

  const durationBySession = {};
  focusRecords.forEach((r) => {
    if (r.sessionId) {
      durationBySession[r.sessionId] =
        Math.max(durationBySession[r.sessionId] ?? 0, r.durationSecs);
    }
  });

  const notesSessions = buildSessions(notes, (n) => ({ id: n.id, ts: n.ts, text: n.text }));

  const distractionSessions = enrichDistractionSessions(
    buildSessions(distractions, (d) => ({
      id: d.id,
      ts: d.ts,
      tag: d.tag ?? null,
      note: d.note ?? null,
      type: d.type ?? "reactive",
      durationSecs: d.durationSecs ?? null,
    })),
    durationBySession,
  );

  return (
    <>
      {notesSessions.length > 0 && (
        <div className="session-summary">
          <div className="session-summary-header">{t("focus.notes")}</div>
          <div className="session-summary-scroll">
            {notesSessions.map((session) => (
              <div key={session.firstTs} className="session-summary-group">
                <div className="session-summary-group-hd">
                  <span className="session-summary-date">
                    {formatSessionDate(session.firstTs)}
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
      )}

      {distractionSessions.length > 0 && (
        <div className="session-summary">
          <div className="session-summary-header">{t("focus.distractions")}</div>
          <div className="session-summary-scroll">
            {distractionSessions.map((session) => (
              <div key={session.firstTs} className="session-summary-group">
                <div className="session-summary-group-hd">
                  <span className="session-summary-date">
                    {formatSessionDate(session.firstTs)}
                  </span>
                  <span className="session-stat distraction">⚡ {session.items.length}</span>
                </div>

                {session.items.length > 0 && (
                  <div className="distraction-insight-row">
                    {session.distractionRate && (
                      <span className="distraction-insight-item">
                        {t("focus.distractPerHour", { rate: session.distractionRate })}
                      </span>
                    )}
                    {session.bestTag && (
                      <span className="distraction-insight-item tag">
                        {t("focus.mostly", { tag: session.bestTag })}
                      </span>
                    )}
                    {session.diffVsPrev !== null && (
                      <span
                        className={`distraction-insight-item diff${session.diffVsPrev < 0 ? " better" : session.diffVsPrev > 0 ? " worse" : ""}`}
                      >
                        {session.diffVsPrev < 0
                          ? t("focus.fewerThanLast", { n: Math.abs(session.diffVsPrev) })
                          : session.diffVsPrev > 0
                            ? t("focus.moreThanLast", { n: session.diffVsPrev })
                            : t("focus.sameAsLast")}
                      </span>
                    )}
                  </div>
                )}

                <ul className="session-summary-list">
                  {session.items.map((item) => (
                    <li key={item.id} className="session-summary-row distraction">
                      <span className="session-summary-time">{formatTimestamp(item.ts)}</span>
                      <span className="session-summary-text muted">
                        {t("focus.nthDistraction", { n: item.nth })}
                        {item.type === "proactive" && (
                          <span className="distraction-tag-inline"> · {t("focus.proactivePause")}</span>
                        )}
                        {item.tag && (
                          <span className="distraction-tag-inline"> · {item.tag}</span>
                        )}
                        {item.durationSecs != null && item.durationSecs > 0 && (
                          <span className="distraction-note-inline"> ({formatDuration(item.durationSecs)})</span>
                        )}
                        {item.note && (
                          <span className="distraction-note-inline"> {item.note}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
