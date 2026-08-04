import React from "react";
import { lookForOutfit } from "@/data/companion/companionData";
import "./Companion.css";

// 专注陪伴的「一盏暖光」：一枚无脸的抽象光球，纯 SVG（不依赖任何外部图片，
// 满足 app 的 CSP / 离线场景）。刻意不做成有五官的角色形象——只是一团会呼吸的光，
// 色调随佩戴的 outfit 变（收集/祈愿系统仍靠 hue + 头顶饰物 badge 区分皮肤）。
// 纯展示组件，佩戴状态由页面通过 props 传入。
//
// props:
//   mood: "idle" | "focus" | "cheer" | "sleepy"   当前状态（只影响柔光的强弱/节奏）
//   outfit: outfit id | null                      佩戴的皮肤（决定色调与饰物）
//   size: number                                  像素尺寸（正方形），默认 128
//   say: string                                   可选气泡台词
//   floating: boolean                             是否漂浮微动画（默认 true；reduced-motion 下 CSS 会自动停）
//   ariaLabel: string                             无障碍标签，默认「光」

export default function Companion({
  mood = "idle",
  outfit = null,
  size = 128,
  say = null,
  floating = true,
  className = "",
  ariaLabel = "focus light",
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
        aria-label={ariaLabel}
      >
        {/* 最外层柔光：靠 CSS 呼吸脉动，暗示「这是一团光」 */}
        <circle className="cmp-halo" cx="60" cy="68" r="54" />

        {/* 光核：一枚圆形暖光，平涂主色 */}
        <circle className="cmp-core" cx="60" cy="68" r="30" />

        {/* 内层高光：更亮的小圆，给光一点中心的通透感 */}
        <circle className="cmp-glow" cx="60" cy="68" r="15" />

        {/* 头顶饰物（来自 outfit）：收集/祈愿的皮肤仍靠它区分 */}
        {badge && (
          <text className="cmp-badge" x="60" y="22" textAnchor="middle" fontSize="18">
            {badge}
          </text>
        )}
      </svg>
    </div>
  );
}
