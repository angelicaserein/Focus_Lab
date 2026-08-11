import React, { useMemo } from "react";
import { Plus, Check, Trash2, RotateCcw, Coins, Zap, Clock3 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { OUTCOME_META } from "@/utils/records/focusRecords";
import { ACTIVITY_META, countByType } from "@/utils/records/activityLog";
import { buildDayEntries, ACTIVITY_ORDER } from "@/utils/records/dayLog";
import { formatDuration, formatTimestamp } from "@/utils/time";
import "./DayLog.css";

// 一天的流水（唯一一套渲染）：时间轴页的「全部记录」视图按天铺开全部，「日历」视图只铺选中的那天。
// 顶部是当日动作小结（完成 / 添加 / 删除各几条），下面按时刻从新到旧混排会话卡与使用记录。

const ACTIVITY_ICONS = {
  add: Plus,
  complete: Check,
  uncomplete: RotateCcw,
  delete: Trash2,
};

export default function DayLog({ records = [], activities = [] }) {
  const { t } = useLanguage();

  const entries = useMemo(
    () => buildDayEntries(records, activities),
    [records, activities],
  );
  const counts = useMemo(() => countByType(activities), [activities]);

  if (entries.length === 0) {
    return (
      <div className="daylog-empty">
        <Clock3 size={26} aria-hidden="true" />
        <span>{t("history.dayEmpty")}</span>
      </div>
    );
  }

  return (
    <div className="daylog">
      {activities.length > 0 && (
        <div className="daylog-counts">
          {ACTIVITY_ORDER.filter((type) => counts[type] > 0).map((type) => {
            const Icon = ACTIVITY_ICONS[type];
            return (
              <span key={type} className={`daylog-count-chip ${ACTIVITY_META[type].cls}`}>
                <Icon size={12} aria-hidden="true" />
                {t(ACTIVITY_META[type].labelKey)} {counts[type]}
              </span>
            );
          })}
        </div>
      )}

      <div className="daylog-entries">
        {entries.map((e) =>
          e.kind === "session" ? (
            <SessionCard key={e.key} entry={e} t={t} />
          ) : (
            <ActivityRow key={e.key} entry={e} t={t} />
          ),
        )}
      </div>
    </div>
  );
}

// 一次专注（可能多任务）：头部是时刻与整段小结，下面逐任务列结果徽章
function SessionCard({ entry, t }) {
  const { records, quality, distractionCount, distractionSecs, netSecs } = entry;

  return (
    <div className="daylog-session">
      <div className="daylog-session-head">
        <span className="daylog-time">
          {formatTimestamp(entry.ts)}
          {/* 几点开始 → 几点结束；跨度不足一分钟时两头同形，只留开始 */}
          {formatTimestamp(entry.endedAt) !== formatTimestamp(entry.ts) && (
            <>
              <span className="daylog-time-sep">–</span>
              {formatTimestamp(entry.endedAt)}
            </>
          )}
        </span>

        {entry.scenarioTitle && (
          <span className="daylog-scenario">{entry.scenarioTitle}</span>
        )}

        {records.length > 1 && (
          <span className="daylog-taskcount">
            {t("history.taskCount", { count: records.length })}
          </span>
        )}

        {distractionCount > 0 && (
          <>
            <span className="daylog-chip warn">
              <Zap size={12} aria-hidden="true" />
              {distractionCount}
            </span>
            {quality && (
              <span className={`daylog-quality ${quality.cls}`}>{t(quality.labelKey)}</span>
            )}
            {distractionSecs > 0 && (
              <span
                className="daylog-net"
                title={t("history.netFocusTitle", {
                  duration: formatDuration(distractionSecs),
                })}
              >
                {t("history.netFocus", { duration: formatDuration(netSecs) })}
              </span>
            )}
          </>
        )}

        {entry.coins > 0 && (
          <span className="daylog-chip coin">
            <Coins size={12} aria-hidden="true" />+{entry.coins}
          </span>
        )}

        <span className="daylog-total">{formatDuration(entry.totalSecs)}</span>
      </div>

      <div className="daylog-tasks">
        {records.map((r) => {
          const meta = OUTCOME_META[r.outcome];
          return (
            <div key={r.id} className="daylog-task">
              {meta && (
                <span className={`daylog-outcome ${meta.cls}`}>{t(meta.labelKey)}</span>
              )}
              <span className="daylog-task-name">{r.taskText}</span>
              <span className="daylog-task-dur">{formatDuration(r.durationSecs)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 使用记录：没开计时器也发生过的事，一行一条（同类挤在 5 分钟内的已并成一条）
function ActivityRow({ entry, t }) {
  const { mark } = entry;
  const meta = ACTIVITY_META[mark.type] ?? { labelKey: "history.activity.add", cls: "add" };
  const Icon = ACTIVITY_ICONS[mark.type] ?? Check;

  return (
    <div className={`daylog-mark ${meta.cls}`} title={mark.texts.join("\n")}>
      <span className="daylog-time">{formatTimestamp(entry.ts)}</span>
      <span className="daylog-mark-label">
        <Icon size={12} aria-hidden="true" />
        {t(meta.labelKey)}
      </span>
      <span className="daylog-mark-text">
        {mark.text}
        {mark.count > 1 && (
          <span className="daylog-mark-count">
            {t("history.activityMore", { count: mark.count })}
          </span>
        )}
      </span>
    </div>
  );
}
