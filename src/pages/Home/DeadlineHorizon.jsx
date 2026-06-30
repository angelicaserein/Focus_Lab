import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTodos } from "../../context/TodoContext";
import { getDaysUntil } from "../../utils/time";
import { countdownLabel, formatDueDate, isActiveDeadline } from "../../utils/ddlUtils";
import "./DeadlineHorizon.css";

// 把「截止日」从日历上一个遥远的点，翻译成一种**空间距离感**：
// 一条向地平线退去的路，每个 DDL 是路上的一块路牌。
//   · 越临近 → 越靠近你（左下）、越大、越鲜明；
//   · 越遥远 → 越退向地平线（右上）、越小、越淡；
//   · 已逾期 → 撞到你脚边，红色脉动。
// 目的：让时间盲（time blindness）的大脑「看见」DDL 正在逼近。

const HORIZON_DAYS = 30; // 超过这天数的 DDL 都压在地平线附近

// 距今天数 → 路牌上的极简文案
function pinLabel(days) {
  if (days < 0) return `逾期${-days}天`;
  if (days === 0) return "今天";
  if (days === 1) return "明天";
  return `${days}天`;
}

// 距今天数 → 紧迫度类名（与 ddlUtils.countdownClass 同义，但今天也算 urgent）
function urgencyClass(days) {
  if (days < 0) return "overdue";
  if (days <= 3) return "urgent";
  if (days <= 7) return "soon";
  return "far";
}

// 把每个 DDL 映射到路面坐标 + 透视参数
function projectDeadline(days) {
  const clamped = Math.min(Math.max(days, 0), HORIZON_DAYS);
  // sqrt 让临近的几天在画面上「铺开」，拥有更多空间，远期被压缩到地平线
  const t = Math.sqrt(clamped / HORIZON_DAYS); // 0(近) → 1(远)
  return {
    t,
    left: 6 + t * 86, // 6% → 92%
    top: 80 - t * 40, // 80%(脚边) → 40%(地平线)
    scale: 1 - t * 0.55, // 1 → 0.45
    opacity: 1 - t * 0.45, // 1 → 0.55
  };
}

export default function DeadlineHorizon() {
  const { todos } = useTodos();
  const navigate = useNavigate();

  const pins = useMemo(() => {
    const list = todos
      .filter((t) => !t.completed && isActiveDeadline(t))
      .map((t) => {
        const days = getDaysUntil(t.attrs.dueDate);
        return {
          id: t.id,
          text: t.text,
          dueDate: t.attrs.dueDate,
          days,
          ...projectDeadline(days),
          klass: urgencyClass(days),
        };
      })
      // 远的先画、近的后画 → 近的盖在上层
      .sort((a, b) => b.days - a.days);

    // 同一深度的路牌做微小竖直错位，减少重叠
    const seen = new Map();
    for (const p of list) {
      const bucket = Math.round(p.left / 7);
      const n = seen.get(bucket) ?? 0;
      seen.set(bucket, n + 1);
      p.top -= n * 9 * p.scale;
    }
    return list;
  }, [todos]);

  const nearest = pins.length
    ? pins.reduce((a, b) => (b.days < a.days ? b : a))
    : null;

  return (
    <div className="ddl-horizon-wrap">
      <div className="ddl-horizon-header">
        <span className="ddl-horizon-title">截止临近感</span>
        <span className="ddl-horizon-sub">
          {nearest
            ? `最近一个 · ${countdownLabel(nearest.days)}`
            : "前方一片开阔"}
        </span>
      </div>

      <div className="ddl-horizon-road" role="img" aria-label="截止日期距离感">
        {/* 退向地平线的路面 */}
        <div className="ddl-road-floor" />

        {/* 你所在的位置 */}
        <div className="ddl-road-you">
          <span className="ddl-you-dot" />
          <span className="ddl-you-label">现在</span>
        </div>
        <span className="ddl-road-far-label">远期</span>

        {pins.length === 0 ? (
          <p className="ddl-horizon-empty">没有临近的截止日，路上很空旷 🌿</p>
        ) : (
          pins.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`ddl-pin ${p.klass}`}
              style={{
                left: `${p.left}%`,
                top: `${p.top}%`,
                "--pin-scale": p.scale,
                "--pin-opacity": p.opacity,
                zIndex: Math.round(p.scale * 100),
              }}
              title={`${p.text} · ${formatDueDate(p.dueDate)}（${countdownLabel(p.days)}）`}
              onClick={() => navigate("/ddl")}
            >
              <span className="ddl-pin-flag">
                <span className="ddl-pin-days">{pinLabel(p.days)}</span>
                <span className="ddl-pin-text">{p.text}</span>
              </span>
              <span className="ddl-pin-post" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
