import React from "react";
import { shapeOf } from "@/data/aquarium/creatureShapes";
import { speciesById } from "@/data/aquarium/aquariumData";
import { speciesShift } from "@/data/aquarium/creaturePalette";
import { STAGE } from "@/data/aquarium/growth";
import "./creatureGlyph.css";

// 图鉴/收集卡里的生物图形。造型与缸里是同一份数据（creatureShapes），这里渲染成 SVG DOM。
//
// 上色：各部件用 currentColor 派生（color-mix，见 Aquarium.css 的 .cg-* 类），
// 再整体 hue-rotate 到物种自己的色相——于是图鉴里的颜色和缸里那只对得上，
// 而且照样跟随主题主色，不需要在 React 里做颜色计算。
// 顺带 saturate 一档：canvas 那边算色时抬过饱和度，不抬这里会灰一截、像另一个物种。
// 色偏取 speciesShift（与 canvas 同一份）：色相压在邻近色带内，余量落到 brightness 上。
//
// stage/scale：卵画的是通用卵造型，幼体是同一份造型绕中心缩小，成体才是原尺寸。
// scale 由调用方从 growthOf 取，故幼体在图鉴里也是一天天变大的，和缸里那只走同一份规则。
//
// 卵一律中性色（不取物种色偏）：破膜前不该看得出是哪一种——颜色一漏，猜也猜到了。

export default function FishGlyph({ glyph, size = 30, className, stage = STAGE.ADULT, scale = 1 }) {
  const egg = stage === STAGE.EGG;
  const sp = egg ? null : speciesById(glyph);
  const { hue, tone } = speciesShift(sp);
  // 卵有自己的造型，大小已画在造型里，不再缩；幼体缩的是成体造型。
  const k = egg ? 1 : Math.max(0.3, Math.min(1, scale));
  const parts = shapeOf(egg ? "egg" : glyph).map((p, i) => {
    const common = {
      key: i,
      className: `cg-${p.role}`,
      opacity: p.op,
      // 描边部件的 fill:none 必须走内联样式：类里的 fill 会盖掉 fill 表现属性
      ...(p.s
        ? {
            style: { fill: "none" },
            strokeWidth: p.s,
            strokeLinecap: "round",
            strokeLinejoin: "round",
          }
        : null),
    };
    return p.c ? (
      <circle {...common} cx={p.c[0]} cy={p.c[1]} r={p.c[2]} />
    ) : (
      <path {...common} d={p.d} />
    );
  });
  return (
    <svg
      className={`cg${className ? ` ${className}` : ""}`}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      style={{
        filter: `saturate(1.6) hue-rotate(${hue}deg) brightness(${(1 + tone * 0.1).toFixed(3)})`,
      }}
      aria-hidden="true"
    >
      {k === 1 ? parts : <g transform={`translate(12 12) scale(${k.toFixed(3)}) translate(-12 -12)`}>{parts}</g>}
    </svg>
  );
}
