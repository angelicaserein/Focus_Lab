import React, { useId } from "react";
import { lookForOutfit } from "@/data/companion/companionData";
import "./Companion.css";

// 常驻伙伴「灯灯 / Lumi」的立绘：一盏会飘的暖灯灵，纯 SVG 手绘，不依赖任何外部图片
// （app 的 CSP / 离线场景都能用）。表情随 mood 变化，身体色调 / 头顶饰物随佩戴的 outfit 变化。
// 纯展示组件：collection / 佩戴状态由页面持有并通过 props 传入，方便在结算卡、祈愿页等处复用。
//
// props:
//   mood: "idle" | "focus" | "cheer" | "sleepy"   当前心情（决定表情）
//   outfit: outfit id | null                      佩戴的立绘皮肤（决定色调与饰物）
//   size: number                                  像素尺寸（正方形），默认 128
//   say: string                                   可选气泡台词
//   floating: boolean                             是否漂浮微动画（默认 true；reduced-motion 下 CSS 会自动停）

// 眼睛：不同心情用不同形状（睁眼 / 放松弧 / 弯月笑 / 闭眼）。
function Eyes({ mood }) {
  if (mood === "cheer") {
    // ^ ^ 弯月笑眼
    return (
      <g className="cmp-eyes" fill="none" strokeLinecap="round">
        <path d="M40 68 q6 -9 12 0" />
        <path d="M68 68 q6 -9 12 0" />
      </g>
    );
  }
  if (mood === "sleepy") {
    // 闭眼横线
    return (
      <g className="cmp-eyes" fill="none" strokeLinecap="round">
        <path d="M40 70 q6 4 12 0" />
        <path d="M68 70 q6 4 12 0" />
      </g>
    );
  }
  if (mood === "focus") {
    // 放松的下垂弧（安静专注）
    return (
      <g className="cmp-eyes-solid">
        <ellipse cx="46" cy="70" rx="4.5" ry="5.5" />
        <ellipse cx="74" cy="70" rx="4.5" ry="5.5" />
        <circle className="cmp-glint" cx="47.6" cy="68" r="1.5" />
        <circle className="cmp-glint" cx="75.6" cy="68" r="1.5" />
      </g>
    );
  }
  // idle：圆睁大眼 + 高光
  return (
    <g className="cmp-eyes-solid">
      <ellipse cx="46" cy="69" rx="5" ry="6.5" />
      <ellipse cx="74" cy="69" rx="5" ry="6.5" />
      <circle className="cmp-glint" cx="48" cy="66.5" r="1.8" />
      <circle className="cmp-glint" cx="76" cy="66.5" r="1.8" />
    </g>
  );
}

// 嘴：cheer 张口笑，其余小弧。
function Mouth({ mood }) {
  if (mood === "cheer") {
    return <path className="cmp-mouth-open" d="M54 80 q6 9 12 0 q-6 4 -12 0 z" />;
  }
  if (mood === "sleepy") {
    return <path className="cmp-mouth" d="M57 82 q3 2 6 0" fill="none" strokeLinecap="round" />;
  }
  return <path className="cmp-mouth" d="M55 81 q5 5 10 0" fill="none" strokeLinecap="round" />;
}

export default function Companion({
  mood = "idle",
  outfit = null,
  size = 128,
  say = null,
  floating = true,
  className = "",
}) {
  const uid = useId().replace(/[:]/g, "");
  const look = lookForOutfit(outfit);
  const { hue, badge } = look;

  return (
    <div
      className={`cmp${floating ? " cmp-float" : ""} cmp-mood-${mood} ${className}`}
      style={{ width: size, height: size, "--cmp-hue": hue }}
    >
      {say && <div className="cmp-bubble" role="status">{say}</div>}
      <svg
        className="cmp-svg"
        viewBox="0 0 120 130"
        width={size}
        height={size}
        role="img"
        aria-label="Lumi"
      >
        <defs>
          <radialGradient id={`body-${uid}`} cx="42%" cy="34%" r="72%">
            <stop offset="0%" stopColor={`hsl(${hue} 95% 82%)`} />
            <stop offset="55%" stopColor={`hsl(${hue} 88% 66%)`} />
            <stop offset="100%" stopColor={`hsl(${hue} 72% 52%)`} />
          </radialGradient>
          <radialGradient id={`glow-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={`hsl(${hue} 95% 72%)`} stopOpacity="0.55" />
            <stop offset="100%" stopColor={`hsl(${hue} 95% 72%)`} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 光晕：呼吸脉动 */}
        <circle className="cmp-halo" cx="60" cy="72" r="52" fill={`url(#glow-${uid})`} />

        {/* 头顶小火苗 / 灯芯：轻微摇曳 */}
        <path
          className="cmp-flame"
          d="M60 20 c7 8 5 16 -1 20 c-6 -3 -8 -12 1 -20 z"
          fill={`hsl(${hue} 95% 70%)`}
        />
        <circle className="cmp-flame-core" cx="60" cy="34" r="3.2" fill="#fff" opacity="0.85" />

        {/* 身体 */}
        <circle className="cmp-body" cx="60" cy="72" r="38" fill={`url(#body-${uid})`} />
        {/* 顶部高光 */}
        <ellipse className="cmp-shine" cx="47" cy="56" rx="12" ry="8" fill="#fff" opacity="0.35" />

        {/* 腮红 */}
        <ellipse className="cmp-cheek" cx="38" cy="80" rx="5" ry="3.4" />
        <ellipse className="cmp-cheek" cx="82" cy="80" rx="5" ry="3.4" />

        {/* 表情 */}
        <Eyes mood={mood} />
        <Mouth mood={mood} />

        {/* 头顶饰物（来自 outfit） */}
        {badge && (
          <text className="cmp-badge" x="60" y="16" textAnchor="middle" fontSize="20">
            {badge}
          </text>
        )}

        {/* cheer 时的小星火 */}
        {mood === "cheer" && (
          <g className="cmp-sparks" aria-hidden="true">
            <text x="22" y="40" fontSize="14">✦</text>
            <text x="92" y="52" fontSize="12">✧</text>
            <text x="30" y="104" fontSize="11">✧</text>
          </g>
        )}
        {/* sleepy 时的 zzZ */}
        {mood === "sleepy" && (
          <text className="cmp-zzz" x="92" y="40" fontSize="14" aria-hidden="true">
            z
          </text>
        )}
      </svg>
    </div>
  );
}
