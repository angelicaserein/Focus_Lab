import React, { useState } from "react";
import { useDDL } from "@/context/DDLContext";

// 仅开发环境使用的调试面板：用 MOCK 数据预览各种倒计时/卡片/弹窗状态。
// 由 index.jsx 在 import.meta.env.DEV 下挂载，生产构建会被 tree-shake 掉。

const MOCK_COUNTDOWNS = [
  { days: -5,  label: "已过期 5 天",  cls: "overdue" },
  { days: 0,   label: "今天截止",     cls: "overdue" },
  { days: 1,   label: "明天截止",     cls: "urgent"  },
  { days: 3,   label: "还有 3 天",    cls: "urgent"  },
  { days: 14,  label: "还有 14 天",   cls: ""        },
];

const MOCK_TODAY = [
  { task: "期末论文",  msg: "完成初稿",   days: 2,  cls: "urgent"  },
  { task: "项目答辩",  msg: "准备 PPT",   days: -1, cls: "overdue" },
  { task: "课程作业",  msg: "整理文献",   days: 0,  cls: "overdue" },
];

const MOCK_CHECKPOINTS = [
  { label: "14天前", msg: "收集文献",     done: true,  due: false },
  { label: "7天前",  msg: "完成初稿",     done: false, due: true  },
  { label: "3天前",  msg: "修改润色",     done: false, due: false },
  { label: "1天前",  msg: "最终校对",     done: false, due: false },
];

const MOCK_CARDS = [
  { title: "期末论文",  dueStr: "6月30日截止", days: -3,  cls: "overdue", cardCls: "card-overdue" },
  { title: "项目答辩",  dueStr: "6月23日截止", days: 2,   cls: "urgent",  cardCls: "" },
  { title: "周报提交",  dueStr: "7月10日截止", days: 19,  cls: "",        cardCls: "" },
];

export default function DDLDebugPanel() {
  const [open, setOpen] = useState(false);
  const { setModalForcedOpen } = useDDL();

  return (
    <div className="ddl-debug-wrap">
      {open && (
        <div className="ddl-debug-panel">
          <div className="ddl-debug-section-label">弹窗</div>
          <button
            className="ddl-debug-modal-btn"
            onClick={() => setModalForcedOpen(true)}
          >
            预览提醒弹窗
          </button>

          <div className="ddl-debug-divider" />

          <div className="ddl-debug-section-label">倒计时标签</div>
          <div className="ddl-debug-row">
            {MOCK_COUNTDOWNS.map((c) => (
              <span key={c.days} className={`ddl-countdown ${c.cls}`}>{c.label}</span>
            ))}
          </div>

          <div className="ddl-debug-divider" />

          <div className="ddl-debug-section-label">今日提醒区块</div>
          <div className="ddl-today ddl-debug-mock-today">
            <div className="ddl-today-hd">
              <span className="ddl-today-icon">⚠</span>
              <span className="ddl-today-title">今日提醒</span>
              <span className="ddl-today-count">{MOCK_TODAY.length} 条</span>
            </div>
            <div className="ddl-today-list">
              {MOCK_TODAY.map((item, i) => (
                <div key={i} className="ddl-today-item">
                  <button className="ddl-today-check">○</button>
                  <div className="ddl-today-content">
                    <span className="ddl-today-task">{item.task}</span>
                    <span className="ddl-today-sep">→</span>
                    <span className="ddl-today-msg">{item.msg}</span>
                  </div>
                  <span className={`ddl-countdown ${item.cls}`}>
                    {item.days < 0 ? `已过期 ${-item.days} 天` : item.days === 0 ? "今天截止" : `还有 ${item.days} 天`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="ddl-debug-divider" />

          <div className="ddl-debug-section-label">提醒节点状态</div>
          <div className="ddl-checkpoints ddl-debug-mock-cps">
            {MOCK_CHECKPOINTS.map((cp, i) => (
              <div key={i} className={`ddl-cp${cp.done ? " done" : ""}${cp.due ? " due" : ""}`}>
                <button className="ddl-cp-check">{cp.done ? "✓" : "○"}</button>
                <span className="ddl-cp-days">{cp.label}</span>
                <span className="ddl-cp-msg">{cp.msg}</span>
                <span className="ddl-debug-cp-tag">
                  {cp.done ? "done" : cp.due ? "due ⚡" : "pending"}
                </span>
              </div>
            ))}
          </div>

          <div className="ddl-debug-divider" />

          <div className="ddl-debug-section-label">任务卡片状态</div>
          <div className="ddl-debug-cards">
            {MOCK_CARDS.map((c, i) => (
              <div key={i} className={`ddl-card ddl-debug-mock-card ${c.cardCls}`}>
                <div className="ddl-card-header">
                  <span className="ddl-card-title">{c.title}</span>
                  <div className="ddl-card-meta">
                    <span className="ddl-card-date">{c.dueStr}</span>
                    <span className={`ddl-countdown ${c.cls}`}>
                      {c.days < 0 ? `已过期 ${-c.days} 天` : c.days === 0 ? "今天截止" : `还有 ${c.days} 天`}
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
        调试
      </button>
    </div>
  );
}
