import React, { useMemo, useRef, useState, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTodos } from "@/context/TodoContext";
import { useLanguage } from "@/context/LanguageContext";
import { getDaysUntil } from "@/utils/time";
import { isActiveDeadline, countdownLabel, formatDueDate } from "@/utils/ddlUtils";
import "./DeadlineHorizon.css";

// 把「截止日」从日历上一个遥远的点，翻译成一种**空间距离感**：
// 一片向地平线退去的空间，每个 DDL 是空间里的一张卡片。
//   · 越临近 → 越靠近你（左上）、越大、越鲜明；
//   · 越遥远 → 越退向地平线（右下）、越小、越淡；
//   · 已逾期 → 撞到你脚边，红色脉动。
// 目的：让时间盲（time blindness）的大脑「看见」DDL 正在逼近。

const HORIZON_DAYS = 30; // 超过这天数的 DDL 都压在地平线附近

// 距今天数 → 卡片上的极简文案（本地化，短形式）
function pinLabel(days, t) {
  if (days < 0) return t("ddl.horizon.pin.overdue", { days: -days });
  if (days === 0) return t("ddl.horizon.pin.today");
  if (days === 1) return t("ddl.horizon.pin.tomorrow");
  return t("ddl.horizon.pin.days", { days });
}

// 距今天数 → 紧迫度类名（与 ddlUtils.countdownClass 同义，但今天也算 urgent）
function urgencyClass(days) {
  if (days < 0) return "overdue";
  if (days <= 3) return "urgent";
  if (days <= 7) return "soon";
  return "far";
}

// 把每个 DDL 映射到横轴位置（0..1）+ 透视参数
// **横轴＝时间轴，且只由天数决定**：近 → 左（脚边），远 → 右（地平线）。
// 纵轴不携带信息，只用来把同一时段的卡片错开，所以卡片永远不会横向漂移，
// 「它在哪 = 还剩几天」这条读法始终成立。
// 逾期＝已经走过去的时间，独占「今天」左边那一列（画面最左、最烫的一端），
// 不跟今天到期的混在一起，逾期越久越贴边。
const OVERDUE_FX = 0.07; // 逾期列的最左端（逾期 ≥7 天）
const OVERDUE_EDGE_FX = 0.14; // 逾期列的最右端（昨天刚过）
const TODAY_FX = 0.28; // 今天到期的位置，即未来那段时间轴的起点
const HORIZON_FX = 0.9; // 地平线（HORIZON_DAYS 及以外）

export function projectDeadline(days) {
  if (days < 0) {
    const over = Math.min(-days, 7) / 7; // 0(昨天) → 1(逾期很久)
    return {
      t: 0,
      fx: OVERDUE_EDGE_FX - over * (OVERDUE_EDGE_FX - OVERDUE_FX),
      scale: 1,
      opacity: 1,
    };
  }
  const clamped = Math.min(days, HORIZON_DAYS);
  // sqrt 让临近的几天在画面上「铺开」，拥有更多空间，远期被压缩到地平线
  const t = Math.sqrt(clamped / HORIZON_DAYS); // 0(近) → 1(远)
  return {
    t,
    fx: TODAY_FX + t * (HORIZON_FX - TODAY_FX), // 近 → 左，远 → 右
    scale: 1 - t * 0.42, // 1 → 0.58
    opacity: 1 - t * 0.38, // 1 → 0.62
  };
}

// 卡片实际宽高得先估出来才能判重叠：中日文按整宽、拉丁按约 0.58 宽计。
// 与 CSS 对应：padding 5/10、字号 0.82rem(天数) 与 0.7rem(任务名)、任务名 max-width 112。
const WIDE_CHAR = /[　-鿿＀-￯]/;

function measureText(str, charPx) {
  let w = 0;
  for (const ch of str) w += WIDE_CHAR.test(ch) ? charPx : charPx * 0.58;
  return w;
}

function estimateCard(daysText, taskText, withText) {
  const wDays = measureText(daysText, 13.1);
  const wTask = withText ? Math.min(measureText(taskText, 11.2), 112) : 0;
  return {
    w: Math.min(132, Math.max(54, Math.max(wDays, wTask) + 22)),
    h: withText ? 40 : 26,
  };
}

// 分道摆放：横坐标锁死在时间轴上不动，撞车的卡片只沿纵向让开——
// 从中线出发一上一下逐道找空位（0, -1, +1, -2, +2 …）。
// 按「越近越优先」的顺序占位，所以最紧急的那张永远待在中线上最显眼的位置，
// 被挤到边道的总是更远的。只有一整列都塞满时才允许横向让一点。
export const GAP = 6;
const BASE_Y = 0.5; // 卡片列的中线

export function layoutCards(items, width, height) {
  const placed = [];
  const hits = (r) =>
    placed.some(
      (p) =>
        Math.abs(p.x - r.x) < (p.w + r.w) / 2 + GAP &&
        Math.abs(p.y - r.y) < (p.h + r.h) / 2 + GAP,
    );

  for (const it of items) {
    const w = it.card.w * it.scale;
    const h = it.card.h * it.scale;
    // 中心可落的范围：卡片整体不出画面
    const clampX = (v) => Math.min(Math.max(v, w / 2 + 4), Math.max(w / 2 + 4, width - w / 2 - 4));
    const clampY = (v) => Math.min(Math.max(v, h / 2 + 4), Math.max(h / 2 + 4, height - h / 2 - 4));
    const homeX = clampX(it.fx * width);
    const homeY = clampY(BASE_Y * height);
    const step = h + GAP;

    let spot = null;
    // 先试本列（dx=0）的各道，塞不下再整列左右挪半张卡
    for (const dx of [0, w * 0.72, -w * 0.72, w * 1.44, -w * 1.44]) {
      for (let lane = 0; lane < 16 && !spot; lane++) {
        const k = Math.ceil(lane / 2);
        const dy = (lane % 2 === 1 ? -1 : 1) * k * step;
        const r = { x: clampX(homeX + dx), y: clampY(homeY + dy), w, h };
        if (!hits(r)) spot = r;
      }
      if (spot) break;
    }
    // 实在塞不下（画面已满）就回到本位，此时重叠已无法避免
    const rect = spot ?? { x: homeX, y: homeY, w, h };

    placed.push(rect);
    it.x = rect.x;
    it.y = rect.y;
  }
  return items;
}

export default function DeadlineHorizon() {
  const { todos } = useTodos();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const roadRef = useRef(null);
  // 摆放要按真实像素算才能保证不重叠，所以得盯着路面的实际尺寸
  const [size, setSize] = useState({ w: 0, h: 0 });
  // 窄屏下 CSS 会隐去任务名（只剩天数），估算卡片尺寸时要跟同一个断点走
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 600px)").matches,
  );

  useLayoutEffect(() => {
    const mq = window.matchMedia("(max-width: 600px)");
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useLayoutEffect(() => {
    const el = roadRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((s) => (s.w === width && s.h === height ? s : { w: width, h: height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pins = useMemo(() => {
    const withText = !narrow;
    const list = todos
      .filter((todo) => !todo.completed && isActiveDeadline(todo))
      .map((todo) => {
        const days = getDaysUntil(todo.attrs.dueDate);
        return {
          id: todo.id,
          text: todo.text,
          dueDate: todo.attrs.dueDate,
          days,
          ...projectDeadline(days),
          klass: urgencyClass(days),
          card: estimateCard(pinLabel(days, t), todo.text, withText),
        };
      })
      // 近的先占位（拿到理想位置），远的被挤开
      .sort((a, b) => a.days - b.days);

    if (size.w > 0 && size.h > 0) layoutCards(list, size.w, size.h);
    // 远的先画、近的后画 → 近的盖在上层
    return list.slice().sort((a, b) => b.days - a.days);
  }, [todos, size, narrow, t]);

  const nearest = pins.length
    ? pins.reduce((a, b) => (b.days < a.days ? b : a))
    : null;

  return (
    <div className="ddl-horizon-wrap">
      <div className="ddl-horizon-header">
        <span className="ddl-horizon-title">{t("ddl.horizon.title")}</span>
        <span className="ddl-horizon-sub">
          {nearest
            ? t("ddl.horizon.nearest", { countdown: countdownLabel(nearest.days, t) })
            : t("ddl.horizon.clear")}
        </span>
      </div>

      <div
        className="ddl-horizon-road"
        ref={roadRef}
        role="img"
        aria-label={t("ddl.horizon.aria")}
      >
        {pins.length === 0 ? (
          <p className="ddl-horizon-empty">{t("ddl.horizon.empty")}</p>
        ) : (
          // 量到路面尺寸后才摆卡片，免得首帧全挤在左上角再跳开
          size.w > 0 &&
          pins.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`ddl-pin ${p.klass}`}
              style={{
                left: `${p.x}px`,
                top: `${p.y}px`,
                "--pin-scale": p.scale,
                "--pin-opacity": p.opacity,
                zIndex: Math.round(p.scale * 100),
              }}
              title={t("ddl.horizon.pinTitle", {
                text: p.text,
                due: formatDueDate(p.dueDate, t),
                countdown: countdownLabel(p.days, t),
              })}
              onClick={() => navigate("/ddl")}
            >
              <span className="ddl-pin-flag">
                <span className="ddl-pin-days">{pinLabel(p.days, t)}</span>
                <span className="ddl-pin-text">{p.text}</span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
