import React, { useId } from "react";
import usePrefs from "@/hooks/common/usePrefs";
import { buildFlask } from "@/pages/Focus/flaskShapes";

// 烧瓶进度图：液面高度随 progress（0~1）上升。
// 形状默认取用户在设置页保存的参数；传入 params 可覆盖（用于设置页预览）。
export default function FocusFlask({ progress, params }) {
  const { flaskShape } = usePrefs();
  const { path, highlight, cap, rim } = buildFlask(params ?? flaskShape.params);
  // 每个实例独立的裁剪 id：设置页会同时渲染多个烧瓶，共用 id 会互相错切
  const clipId = useId();

  return (
    <div className="immersive-flask">
      <svg viewBox="0 0 80 130" width="100" height="163" aria-hidden="true">
        <defs>
          <clipPath id={clipId}>
            <path d={path} />
          </clipPath>
        </defs>
        <rect
          x="0" y={128 * (1 - progress)} width="80" height="128"
          clipPath={`url(#${clipId})`} fill="var(--accent)"
        />
        <path
          d={path}
          fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"
        />
        <path
          d={highlight}
          fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round"
        />
        {cap && (
          // 软木塞：暖棕色实心塞子，明显区别于半透明玻璃瓶身
          <path
            d={cap}
            fill="rgba(198,150,96,0.85)" stroke="rgba(120,84,44,0.6)" strokeWidth="1"
          />
        )}
        {rim && (
          // 敞口：深色椭圆开口，像俯视看进空瓶
          <ellipse
            cx={rim.cx} cy={rim.cy} rx={rim.rx} ry={rim.ry}
            fill="rgba(0,0,0,0.28)" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2"
          />
        )}
      </svg>
    </div>
  );
}
