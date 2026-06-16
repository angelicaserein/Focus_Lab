import React from "react";
import { useFocus } from "../../context/FocusContext";

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function fmtSessionDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (day === today) return "今天";
  if (day === yesterday) return "昨天";
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function fmtDuration(secs) {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function topTag(items) {
  const counts = {};
  items.forEach((i) => {
    if (i.tag) counts[i.tag] = (counts[i.tag] ?? 0) + 1;
  });
  const entries = Object.entries(counts);
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function buildSessions(items, keyFn) {
  const map = {};
  items.forEach((item) => {
    const key = item.sessionId ?? "unknown";
    if (!map[key]) map[key] = { firstTs: item.ts, items: [], sessionId: key };
    map[key].items.push(keyFn(item));
    if (item.ts < map[key].firstTs) map[key].firstTs = item.ts;
  });
  return Object.values(map).sort((a, b) => b.firstTs - a.firstTs);
}

export default function SessionSummary({ notes = [], distractions = [] }) {
  const { focusRecords } = useFocus();

  const durationBySession = {};
  focusRecords.forEach((r) => {
    if (r.sessionId) {
      durationBySession[r.sessionId] =
        Math.max(durationBySession[r.sessionId] ?? 0, r.durationSecs);
    }
  });

  // 随记卡
  const notesSessions = buildSessions(notes, (n) => ({
    id: n.id,
    ts: n.ts,
    text: n.text,
  }));

  // 分心记录卡
  const distractionSessions = buildSessions(distractions, (d) => ({
    id: d.id,
    ts: d.ts,
    tag: d.tag ?? null,
    note: d.note ?? null,
    type: d.type ?? "reactive",
    durationSecs: d.durationSecs ?? null,
  })).map((s, idx, arr) => {
    let nth = 0;
    const items = s.items
      .slice()
      .sort((a, b) => a.ts - b.ts)
      .map((item) => ({ ...item, nth: ++nth }));
    const durationSecs = durationBySession[s.sessionId] ?? 0;
    const prevSession = arr[idx + 1];
    const distractionRate =
      items.length > 0 && durationSecs > 0
        ? (items.length / (durationSecs / 3600)).toFixed(1)
        : null;
    const diffVsPrev =
      prevSession && items.length > 0
        ? items.length - prevSession.items.length
        : null;
    const bestTag = topTag(items);
    return { ...s, items, distractionRate, diffVsPrev, bestTag };
  });

  return (
    <>
      {notesSessions.length > 0 && (
        <div className="session-summary">
          <div className="session-summary-header">随记</div>
          <div className="session-summary-scroll">
            {notesSessions.map((session) => (
              <div key={session.firstTs} className="session-summary-group">
                <div className="session-summary-group-hd">
                  <span className="session-summary-date">
                    {fmtSessionDate(session.firstTs)}
                  </span>
                  <span className="session-stat note">✏ {session.items.length}</span>
                </div>
                <ul className="session-summary-list">
                  {session.items
                    .slice()
                    .sort((a, b) => a.ts - b.ts)
                    .map((item) => (
                      <li key={item.id} className="session-summary-row note">
                        <span className="session-summary-time">{fmtTime(item.ts)}</span>
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
          <div className="session-summary-header">分心记录</div>
          <div className="session-summary-scroll">
            {distractionSessions.map((session) => (
              <div key={session.firstTs} className="session-summary-group">
                <div className="session-summary-group-hd">
                  <span className="session-summary-date">
                    {fmtSessionDate(session.firstTs)}
                  </span>
                  <span className="session-stat distraction">⚡ {session.items.length}</span>
                </div>

                {session.items.length > 0 && (
                  <div className="distraction-insight-row">
                    {session.distractionRate && (
                      <span className="distraction-insight-item">
                        {session.distractionRate} 次/h
                      </span>
                    )}
                    {session.bestTag && (
                      <span className="distraction-insight-item tag">
                        多为 {session.bestTag}
                      </span>
                    )}
                    {session.diffVsPrev !== null && (
                      <span
                        className={`distraction-insight-item diff${session.diffVsPrev < 0 ? " better" : session.diffVsPrev > 0 ? " worse" : ""}`}
                      >
                        {session.diffVsPrev < 0
                          ? `比上次少 ${Math.abs(session.diffVsPrev)} 次`
                          : session.diffVsPrev > 0
                            ? `比上次多 ${session.diffVsPrev} 次`
                            : "与上次持平"}
                      </span>
                    )}
                  </div>
                )}

                <ul className="session-summary-list">
                  {session.items.map((item) => (
                    <li key={item.id} className="session-summary-row distraction">
                      <span className="session-summary-time">{fmtTime(item.ts)}</span>
                      <span className="session-summary-text muted">
                        第 {item.nth} 次分心
                        {item.type === "proactive" && (
                          <span className="distraction-tag-inline"> · 主动暂停</span>
                        )}
                        {item.tag && (
                          <span className="distraction-tag-inline"> · {item.tag}</span>
                        )}
                        {item.durationSecs != null && item.durationSecs > 0 && (
                          <span className="distraction-note-inline"> ({fmtDuration(item.durationSecs)})</span>
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
