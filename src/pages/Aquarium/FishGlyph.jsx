import React from "react";
import { shapeOf } from "@/data/aquarium/creatureShapes";
import { speciesById } from "@/data/aquarium/aquariumData";

// 图鉴/收集卡里的生物图形。造型与缸里是同一份数据（creatureShapes），这里渲染成 SVG DOM。
//
// 上色：各部件用 currentColor 派生（color-mix，见 Aquarium.css 的 .cg-* 类），
// 再整体 hue-rotate 到物种自己的色相——于是图鉴里的颜色和缸里那只对得上，
// 而且照样跟随主题主色，不需要在 React 里做颜色计算。
// 顺带 saturate 一档：canvas 那边算色时抬过饱和度，不抬这里会灰一截、像另一个物种。

export default function FishGlyph({ glyph, size = 30, className }) {
  const sp = speciesById(glyph);
  const hue = sp?.hue ?? 0;
  return (
    <svg
      className={`cg${className ? ` ${className}` : ""}`}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      style={{ filter: `saturate(1.6) hue-rotate(${hue}deg)` }}
      aria-hidden="true"
    >
      {shapeOf(glyph).map((p, i) => {
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
      })}
    </svg>
  );
}
