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
          <rect
            x={cap.x} y={cap.y} width={cap.w} height={cap.h} rx={cap.rx}
            fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"
          />
        )}
        {rim && (
          <rect
            x={rim.x} y={rim.y} width={rim.w} height={rim.h} rx={rim.rx}
            fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"
          />
        )}
      </svg>
    </div>
  );
}
