import React, { useState } from "react";
import { useDDL } from "@/context/DDLContext";
import { useLanguage } from "@/context/LanguageContext";

// 仅开发环境使用的调试面板：用 MOCK 数据预览各种倒计时/卡片/弹窗状态。
// 由 index.jsx 在 import.meta.env.DEV 下挂载，生产构建会被 tree-shake 掉。

const MOCK_COUNTDOWNS = [-5, 0, 1, 3, 14].map((days) => ({
  days,
  cls: days <= 0 ? "overdue" : days <= 3 ? "urgent" : "",
}));

const MOCK_TODAY = [
  { task: "ddl.mock.thesis",   msg: "ddl.mock.draft",  days: 2,  cls: "urgent"  },
  { task: "ddl.mock.defense",  msg: "ddl.mock.slides", days: -1, cls: "overdue" },
  { task: "ddl.mock.homework", msg: "ddl.mock.refs",   days: 0,  cls: "overdue" },
];

const MOCK_CHECKPOINTS = [
  { days: 14, msg: "ddl.mock.collect",   done: true,  due: false },
  { days: 7,  msg: "ddl.mock.draft",     done: false, due: true  },
  { days: 3,  msg: "ddl.mock.polish",    done: false, due: false },
  { days: 1,  msg: "ddl.mock.proofread", done: false, due: false },
];

const MOCK_CARDS = [
  { title: "ddl.mock.thesis",  due: [6, 30], days: -3, cls: "overdue", cardCls: "card-overdue" },
  { title: "ddl.mock.defense", due: [6, 23], days: 2,  cls: "urgent",  cardCls: "" },
  { title: "ddl.mock.weekly",  due: [7, 10], days: 19, cls: "",        cardCls: "" },
];

// 倒计时文案与真实卡片同源，别在这儿另写一套。
const countdown = (t, days) =>
  days < 0
    ? t("ddl.countdown.overdue", { days: -days })
    : days === 0
      ? t("ddl.countdown.today")
      : t("ddl.countdown.days", { days });

export default function DDLDebugPanel() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const { setModalForcedOpen } = useDDL();

  return (
    <div className="ddl-debug-wrap">
      {open && (
        <div className="ddl-debug-panel">
          <div className="ddl-debug-section-label">{t("ddl.debug.modal")}</div>
          <button
            className="ddl-debug-modal-btn"
            onClick={() => setModalForcedOpen(true)}
          >
            {t("ddl.debug.previewModal")}
          </button>

          <div className="ddl-debug-divider" />

          <div className="ddl-debug-section-label">{t("ddl.debug.countdowns")}</div>
          <div className="ddl-debug-row">
            {MOCK_COUNTDOWNS.map((c) => (
              <span key={c.days} className={`ddl-countdown ${c.cls}`}>{countdown(t, c.days)}</span>
            ))}
          </div>

          <div className="ddl-debug-divider" />

          <div className="ddl-debug-section-label">{t("ddl.debug.today")}</div>
          <div className="ddl-today ddl-debug-mock-today">
            <div className="ddl-today-hd">
              <span className="ddl-today-icon">⚠</span>
              <span className="ddl-today-title">{t("ddl.today.title")}</span>
              <span className="ddl-today-count">{t("ddl.today.count", { count: MOCK_TODAY.length })}</span>
            </div>
            <div className="ddl-today-list">
              {MOCK_TODAY.map((item, i) => (
                <div key={i} className="ddl-today-item">
                  <button className="ddl-today-check">○</button>
                  <div className="ddl-today-content">
                    <span className="ddl-today-task">{t(item.task)}</span>
                    <span className="ddl-today-sep">→</span>
                    <span className="ddl-today-msg">{t(item.msg)}</span>
                  </div>
                  <span className={`ddl-countdown ${item.cls}`}>
                    {countdown(t, item.days)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="ddl-debug-divider" />

          <div className="ddl-debug-section-label">{t("ddl.debug.checkpoints")}</div>
          <div className="ddl-checkpoints ddl-debug-mock-cps">
            {MOCK_CHECKPOINTS.map((cp, i) => (
              <div key={i} className={`ddl-cp${cp.done ? " done" : ""}${cp.due ? " due" : ""}`}>
                <button className="ddl-cp-check">{cp.done ? "✓" : "○"}</button>
                <span className="ddl-cp-days">{t("ddl.card.daysBefore", { days: cp.days })}</span>
                <span className="ddl-cp-msg">{t(cp.msg)}</span>
                <span className="ddl-debug-cp-tag">
                  {cp.done ? "done" : cp.due ? "due ⚡" : "pending"}
                </span>
              </div>
            ))}
          </div>

          <div className="ddl-debug-divider" />

          <div className="ddl-debug-section-label">{t("ddl.debug.cards")}</div>
          <div className="ddl-debug-cards">
            {MOCK_CARDS.map((c, i) => (
              <div key={i} className={`ddl-card ddl-debug-mock-card ${c.cardCls}`}>
                <div className="ddl-card-header">
                  <span className="ddl-card-title">{t(c.title)}</span>
                  <div className="ddl-card-meta">
                    <span className="ddl-card-date">{t("ddl.due", { m: c.due[0], d: c.due[1] })}</span>
                    <span className={`ddl-countdown ${c.cls}`}>
                      {countdown(t, c.days)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <button
        className={`ddl-debug-toggle${open ? " active" : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        {t("ddl.debug.toggle")}
      </button>
    </div>
  );
}
