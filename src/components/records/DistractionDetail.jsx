import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import { distractionTagLabel } from "@/pages/Focus/DistractionModal";
import { PAGE_LABEL_KEYS } from "@/components/layout/navSections";
import { formatTimestamp, formatDuration } from "@/utils/time";
import "./SessionSummary.css";

// 一次会话的分心明细（唯一一套渲染）：顶上一行洞察（次/h、多为、与上次比），
// 下面按时刻列每一条。分心统计页整页铺开用它，时间轴的会话卡点开也用它。

// 沉浸层里翻过的页面：记录存的是路径，按当前语言重新取名；
// 页面后来被改名/移出侧栏时退回记录里那份译文，再退回路径。
function pageName(t, item) {
  const key = PAGE_LABEL_KEYS[item.pagePath];
  return key ? t(key) : item.pageLabel || item.tag || item.pagePath;
}

export default function DistractionDetail({ session }) {
  const { t } = useLanguage();
  if (!session) return null;

  return (
    <>
      <div className="distraction-insight-row">
        {session.distractionRate && (
          <span className="distraction-insight-item">
            {t("history.distractPerHour", { rate: session.distractionRate })}
          </span>
        )}
        {session.bestTag && (
          <span className="distraction-insight-item tag">
            {t("history.mostly", { tag: distractionTagLabel(t, session.bestTag) })}
          </span>
        )}
        {session.diffVsPrev !== null && (
          <span
            className={`distraction-insight-item diff${session.diffVsPrev < 0 ? " better" : session.diffVsPrev > 0 ? " worse" : ""}`}
          >
            {session.diffVsPrev < 0
              ? t("history.fewerThanLast", { n: Math.abs(session.diffVsPrev) })
              : session.diffVsPrev > 0
                ? t("history.moreThanLast", { n: session.diffVsPrev })
                : t("history.sameAsLast")}
          </span>
        )}
      </div>

      <ul className="session-summary-list">
        {session.items.map((item) => (
          <li key={item.id} className="session-summary-row distraction">
            {/* 切去别的软件那种是一段时间，不是一个瞬间：时间列直接写成起止 */}
            <span className="session-summary-time">
              {formatTimestamp(item.ts)}
              {(item.type === "app" || item.type === "page") && item.endTs && (
                <span className="dst-time-end">–{formatTimestamp(item.endTs)}</span>
              )}
            </span>
            <span className="session-summary-text muted">
              {item.type === "app" ? (
                <span className="dst-app-name">
                  {t("distraction.away.row", { app: item.appLabel || item.tag })}
                </span>
              ) : item.type === "page" ? (
                <span className="dst-app-name">
                  {t("distraction.away.page", { page: pageName(t, item) })}
                </span>
              ) : (
                <>
                  {t("history.nthDistraction", { n: item.nth })}
                  {item.type === "proactive" && (
                    <span className="distraction-tag-inline"> · {t("history.proactivePause")}</span>
                  )}
                  {item.tag && (
                    <span className="distraction-tag-inline">
                      {" "}· {distractionTagLabel(t, item.tag)}
                    </span>
                  )}
                </>
              )}
              {item.durationSecs != null && item.durationSecs > 0 && (
                <span className="distraction-note-inline"> ({formatDuration(item.durationSecs)})</span>
              )}
              {item.note && <span className="distraction-note-inline"> {item.note}</span>}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
