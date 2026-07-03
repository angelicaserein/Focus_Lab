import React from "react";
import { formatDuration, formatRecordDate } from "@/utils/time";
import { groupByDay, groupBySession, OUTCOME_META } from "@/utils/records/focusRecords";

// 全部记录区：按天分组，组内再按会话归组；含清除记录的二次确认按钮。
export default function RecordList({ records, confirmClear, onClear }) {
  const grouped = groupByDay(records);

  return (
    <div className="hist-section">
      <div className="hist-section-header">
        <div className="hist-section-title">全部记录</div>
        {records.length > 0 && (
          <button
            type="button"
            className={`hist-clear-btn ${confirmClear ? "confirm" : ""}`}
            onClick={onClear}
          >
            {confirmClear ? "确认清除？" : "清除记录"}
          </button>
        )}
      </div>

      {records.length === 0 ? (
        <div className="hist-empty">
          还没有专注记录。去 Focus 页面开始你的第一次专注吧！
        </div>
      ) : (
        grouped.map(([day, dayRecords]) => (
          <div key={day} className="hist-day-group">
            <div className="hist-day-label">{day}</div>
            <div className="hist-records">
              {groupBySession(dayRecords).map((session) =>
                session.records.length === 1 && !session.records[0].outcome ? (
                  // 单任务且无结果（旧记录）：保持原来的紧凑卡
                  <div key={session.key} className="hist-record-card">
                    <div className="hist-record-left">
                      <div className="hist-record-task">
                        {session.records[0].taskText}
                      </div>
                      <div className="hist-record-time">
                        {formatRecordDate(session.records[0].startedAt)}
                      </div>
                    </div>
                    <div className="hist-record-duration">
                      {formatDuration(session.records[0].durationSecs)}
                    </div>
                  </div>
                ) : (
                  // 一次专注（可能多任务）：归组卡，逐任务列结果徽章
                  <div key={session.key} className="hist-session-card">
                    <div className="hist-session-head">
                      <span className="hist-session-time">
                        {formatRecordDate(session.startedAt)}
                      </span>
                      {session.records[0]?.scenarioTitle && (
                        <span className="hist-session-scenario">
                          {session.records[0].scenarioTitle}
                        </span>
                      )}
                      {session.records.length > 1 && (
                        <span className="hist-session-count">
                          {session.records.length} 个任务
                        </span>
                      )}
                      {(() => {
                        const dCount = session.records[0]?.distractionCount;
                        if (!dCount) return null;
                        const distSecs = session.records[0]?.distractionSecs ?? 0;
                        const netSecs = Math.max(0, session.totalSecs - distSecs);
                        const rate = netSecs > 0
                          ? dCount / (netSecs / 3600)
                          : null;
                        const quality = rate === null ? null
                          : rate <= 1 ? { label: "深度专注", cls: "deep" }
                          : rate <= 3 ? { label: "专注良好", cls: "good" }
                          : { label: "容易分心", cls: "scattered" };
                        return (
                          <>
                            <span className="hist-distraction-badge">⚡ {dCount}</span>
                            {quality && (
                              <span className={`hist-quality-badge ${quality.cls}`}>
                                {quality.label}
                              </span>
                            )}
                            {distSecs > 0 && (
                              <span className="hist-net-focus" title={`主动分心 ${formatDuration(distSecs)}，净专注时间`}>
                                净 {formatDuration(netSecs)}
                              </span>
                            )}
                          </>
                        );
                      })()}
                      <span className="hist-session-total">
                        {formatDuration(session.totalSecs)}
                      </span>
                    </div>
                    <div className="hist-session-tasks">
                      {session.records.map((r) => {
                        const meta = OUTCOME_META[r.outcome];
                        return (
                          <div key={r.id} className="hist-session-task">
                            {meta && (
                              <span className={`hist-outcome-badge ${meta.cls}`}>
                                {meta.label}
                              </span>
                            )}
                            <span className="hist-session-task-name">{r.taskText}</span>
                            <span className="hist-session-task-dur">
                              {formatDuration(r.durationSecs)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
