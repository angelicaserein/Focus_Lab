import React from "react";

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

// 历史随记 & 分心记录：所有会话按时间倒序分组展示
export default function SessionSummary({ notes = [], distractions = [] }) {
  if (!notes.length && !distractions.length) return null;

  // 按 sessionId 归并，合并后按时间排序
  const sessionsMap = {};
  const add = (key, item) => {
    if (!sessionsMap[key]) sessionsMap[key] = { firstTs: item.ts, items: [] };
    sessionsMap[key].items.push(item);
    if (item.ts < sessionsMap[key].firstTs) sessionsMap[key].firstTs = item.ts;
  };
  notes.forEach((n) => add(n.sessionId ?? "unknown", { type: "note", id: n.id, ts: n.ts, text: n.text }));
  distractions.forEach((d) => add(d.sessionId ?? "unknown", { type: "distraction", id: d.id, ts: d.ts }));

  // 会话按首条记录时间倒序；会话内条目按时间正序，且分心计第几次
  const sessions = Object.values(sessionsMap)
    .sort((a, b) => b.firstTs - a.firstTs)
    .map((s) => {
      let dCount = 0;
      const items = s.items
        .slice()
        .sort((a, b) => a.ts - b.ts)
        .map((item) => {
          if (item.type === "distraction") dCount += 1;
          return item.type === "distraction" ? { ...item, nth: dCount } : item;
        });
      const noteCount = items.filter((i) => i.type === "note").length;
      const distractionCount = items.filter((i) => i.type === "distraction").length;
      return { firstTs: s.firstTs, items, noteCount, distractionCount };
    });

  return (
    <div className="session-summary">
      <div className="session-summary-header">随记 & 分心记录</div>
      <div className="session-summary-scroll">
        {sessions.map((session) => (
          <div key={session.firstTs} className="session-summary-group">
            <div className="session-summary-group-hd">
              <span className="session-summary-date">{fmtSessionDate(session.firstTs)}</span>
              {session.noteCount > 0 && (
                <span className="session-stat note">✏ {session.noteCount}</span>
              )}
              {session.distractionCount > 0 && (
                <span className="session-stat distraction">⚡ {session.distractionCount}</span>
              )}
            </div>
            <ul className="session-summary-list">
              {session.items.map((item) => (
                <li key={item.id} className={`session-summary-row ${item.type}`}>
                  <span className="session-summary-time">{fmtTime(item.ts)}</span>
                  {item.type === "note" ? (
                    <span className="session-summary-text">{item.text}</span>
                  ) : (
                    <span className="session-summary-text muted">第 {item.nth} 次分心</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
