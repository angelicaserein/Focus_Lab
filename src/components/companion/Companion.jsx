import React from "react";
import { lookForOutfit } from "@/data/companion/companionData";
import "./Companion.css";

// 常驻伙伴「灯灯 / Lumi」的立绘：一枚会飘的方块灯灵，纯 SVG 手绘，不依赖任何外部图片
// （app 的 CSP / 离线场景都能用）。极简 block 造型：一个实心圆角方块 + 两只深色眼睛，
// 心情只靠眼睛形状变化。纯色平涂、无渐变、无描边，身后一层柔光暗示「它是一盏灯」。
// 色调 / 头顶饰物随佩戴的 outfit 变。纯展示组件，佩戴状态由页面通过 props 传入。
//
// props:
//   mood: "idle" | "focus" | "cheer" | "sleepy"   当前心情（决定眼睛形状）
//   outfit: outfit id | null                      佩戴的立绘皮肤（决定色调与饰物）
//   size: number                                  像素尺寸（正方形），默认 128
//   say: string                                   可选气泡台词
//   floating: boolean                             是否漂浮微动画（默认 true；reduced-motion 下 CSS 会自动停）

// 眼睛：整只灯灯的表情全靠这两只深色眼睛。
function Eyes({ mood }) {
  if (mood === "cheer") {
    // ^ ^ 弯月笑眼
    return (
      <g className="cmp-eyes" fill="none" strokeLinecap="round">
        <path d="M38 74 q7 -10 14 0" />
        <path d="M68 74 q7 -10 14 0" />
      </g>
    );
  }
  if (mood === "sleepy") {
    // 放松闭眼（微微下垂弧）
    return (
      <g className="cmp-eyes" fill="none" strokeLinecap="round">
        <path d="M38 72 q7 7 14 0" />
        <path d="M68 72 q7 7 14 0" />
      </g>
    );
  }
  if (mood === "focus") {
    // 安静专注：略小的实心眼
    return (
      <g className="cmp-eyes-solid">
        <ellipse cx="45" cy="72" rx="6" ry="7" />
        <ellipse cx="75" cy="72" rx="6" ry="7" />
      </g>
    );
  }
  // idle：又大又圆的实心眼（对齐 block 主角那种朴素点眼）
  return (
    <g className="cmp-eyes-solid">
      <ellipse cx="45" cy="72" rx="7.5" ry="8.5" />
      <ellipse cx="75" cy="72" rx="7.5" ry="8.5" />
    </g>
  );
}

export default function Companion({
  mood = "idle",
  outfit = null,
  size = 128,
  say = null,
  floating = true,
  className = "",
}) {
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
        {/* 身后一层柔光：暗示「它是一盏灯」，靠 CSS 呼吸脉动 */}
        <circle className="cmp-halo" cx="60" cy="68" r="54" />

        {/* 身体：一个实心圆角方块 block，纯色平涂 */}
        <rect className="cmp-body" x="22" y="30" width="76" height="76" rx="12" ry="12" />

        {/* 眼睛（即全部表情） */}
        <Eyes mood={mood} />

        {/* 头顶饰物（来自 outfit） */}
        {badge && (
          <text className="cmp-badge" x="60" y="22" textAnchor="middle" fontSize="18">
            {badge}
          </text>
        )}
      </svg>
    </div>
  );
}
