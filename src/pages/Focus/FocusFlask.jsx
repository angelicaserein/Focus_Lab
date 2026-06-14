import React from "react";

// 烧瓶进度图：液面高度随 progress（0~1）上升。
export default function FocusFlask({ progress }) {
  return (
    <div className="immersive-flask">
      <svg viewBox="0 0 80 130" width="100" height="163" aria-hidden="true">
        <defs>
          <clipPath id="imm-clip">
            <path d="M 26,16 L 26,44 L 6,112 Q 6,128 40,128 Q 74,128 74,112 L 54,44 L 54,16 Z" />
          </clipPath>
        </defs>
        <rect
          x="0" y={128 * (1 - progress)} width="80" height="128"
          clipPath="url(#imm-clip)" fill="var(--accent)"
        />
        <path
          d="M 26,16 L 26,44 L 6,112 Q 6,128 40,128 Q 74,128 74,112 L 54,44 L 54,16 Z"
          fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"
        />
        <path
          d="M 28,20 L 28,44 L 10,106"
          fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round"
        />
        <rect
          x="24" y="0" width="32" height="17" rx="5"
          fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"
        />
      </svg>
    </div>
  );
}
