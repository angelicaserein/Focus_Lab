import React, { useMemo, useState } from "react";
import { Plus, Check, Trash2, RotateCcw, Coins, Zap, Clock3, ChevronDown } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { OUTCOME_META } from "@/utils/records/focusRecords";
import { ACTIVITY_META, countByType } from "@/utils/records/activityLog";
import { buildDayEntries, ACTIVITY_ORDER } from "@/utils/records/dayLog";
import useSessionDistractions from "@/hooks/focus/useSessionDistractions";
import DistractionDetail from "./DistractionDetail";
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
  // 会话卡上的 ⚡ 点开后要铺的那份明细，按 sessionId 取
  const distractionsBySession = useSessionDistractions();

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
            <SessionCard
              key={e.key}
              entry={e}
              t={t}
              distractionDetail={distractionsBySession.get(e.key)}
            />
          ) : (
            <ActivityRow key={e.key} entry={e} t={t} />
          ),
        )}
      </div>
    </div>
  );
}

// 一次专注（可能多任务）：头部是时刻与整段小结，下面逐任务列结果徽章
function SessionCard({ entry, t, distractionDetail }) {
  const { records, quality, distractionCount, distractionSecs, netSecs } = entry;
  const [showDistractions, setShowDistractions] = useState(false);
  // 有明细才让 ⚡ 变成可点的；旧记录（没 sessionId 那批）只留静态徽章
  const canExpand = (distractionDetail?.items.length ?? 0) > 0;

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
            {canExpand ? (
              <button
                type="button"
                className={`daylog-chip warn daylog-chip-btn${showDistractions ? " open" : ""}`}
                onClick={() => setShowDistractions((v) => !v)}
                aria-expanded={showDistractions}
                title={t("history.toggleDistractions")}
              >
                <Zap size={12} aria-hidden="true" />
                {distractionCount}
                <ChevronDown size={11} className="daylog-chip-caret" aria-hidden="true" />
              </button>
            ) : (
              <span className="daylog-chip warn">
                <Zap size={12} aria-hidden="true" />
                {distractionCount}
              </span>
            )}
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

      {showDistractions && canExpand && (
        <div className="daylog-distractions">
          <DistractionDetail session={distractionDetail} />
        </div>
      )}

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
// 并起来的那条可以点开，逐条列出被折进去的全部动作与各自时刻。
function ActivityRow({ entry, t }) {
  const { mark } = entry;
  const meta = ACTIVITY_META[mark.type] ?? { labelKey: "history.activity.add", cls: "add" };
  const Icon = ACTIVITY_ICONS[mark.type] ?? Check;
  const [open, setOpen] = useState(false);
  const clustered = mark.count > 1;

  const head = (
    <>
      <span className="daylog-time">{formatTimestamp(entry.ts)}</span>
      <span className="daylog-mark-label">
        <Icon size={12} aria-hidden="true" />
        {t(meta.labelKey)}
      </span>
      <span className="daylog-mark-text">
        {mark.text}
        {clustered && (
          <span className="daylog-mark-count">
            {t("history.activityMore", { count: mark.count })}
          </span>
        )}
      </span>
      {clustered && (
        <ChevronDown size={14} className="daylog-mark-caret" aria-hidden="true" />
      )}
    </>
  );

  if (!clustered) {
    return (
      <div className={`daylog-mark ${meta.cls}`} title={mark.text}>
        {head}
      </div>
    );
  }

  return (
    <div className={`daylog-mark ${meta.cls} clustered${open ? " open" : ""}`}>
      <button
        type="button"
        className="daylog-mark-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title={t(open ? "history.activityCollapse" : "history.activityExpand")}
      >
        {head}
      </button>

      {open && (
        <ul className="daylog-mark-list">
          {(mark.items ?? mark.texts.map((text, i) => ({ id: i, text, ts: entry.ts }))).map(
            (item) => (
              <li key={item.id} className="daylog-mark-item">
                <span className="daylog-time">{formatTimestamp(item.ts)}</span>
                <span className="daylog-mark-item-text">{item.text}</span>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
