import React from "react";

// 图鉴里用的静态 SVG 生物图形，纯手绘、currentColor 上色（不依赖任何图片，契合 CSP/离线）。
// 与 AquariumTank 里 canvas 手绘的是同一批造型，只是换成矢量 DOM 便于图鉴排版。
// glyph 键与 aquariumData 的物种 id 一致。

const PATHS = {
  fish: (
    <>
      <path d="M2 12c4-6 12-6 16 0-4 6-12 6-16 0z" />
      <path d="M18 12l4-3v6z" />
    </>
  ),
  jelly: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path fill="currentColor" stroke="none" d="M5 11a7 7 0 0 1 14 0v1H5z" />
      <path d="M7 13v5M10 13v6M12 13v5M14 13v6M17 13v5" />
    </g>
  ),
  shell: (
    <g fill="none" stroke="currentColor" strokeWidth="1.4">
      <path fill="currentColor" stroke="none" d="M12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9z" />
      <path d="M12 3v9M7.5 4.5 6 12M16.5 4.5 18 12" />
    </g>
  ),
  star: <path d="M12 3l3 3 4-1-1 4 3 3-3 3 1 4-4-1-3 3-3-3-4 1 1-4-3-3 3-3-1-4 4 1z" />,
  crab: (
    <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <ellipse cx="12" cy="13" rx="5" ry="3.5" fill="currentColor" stroke="none" />
      <path d="M7 12 3 9M17 12l4-3M8 16l-3 3M16 16l3 3" />
    </g>
  ),
  turtle: (
    <g fill="none" stroke="currentColor" strokeWidth="1.4">
      <ellipse cx="12" cy="13" rx="6" ry="4.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <path d="M8 17l-1 2M16 17l1 2M7 11l-2-1" />
    </g>
  ),
  seahorse: (
    <path d="M14 3c2 0 3 2 2 4-1 1-2 1-2 3s2 2 2 5-2 6-5 6c1-2 1-3 0-4-2-2-3-3-3-6 0-4 3-8 6-8z" />
  ),
  coral: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      d="M12 21v-8M12 13c0-3-3-3-3-6M12 13c0-3 3-3 3-7M9 7c-2 0-2-2 0-3M15 6c2 0 2-2 0-3"
    />
  ),
};

export default function FishGlyph({ glyph, size = 30, className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
    >
      {PATHS[glyph] ?? PATHS.fish}
    </svg>
  );
}
