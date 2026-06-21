import React, { useState } from "react";
import { formatClock } from "../../utils/time";

// 仅在开发环境出现的调试面板（右下角），用于微调液体进度、卡片显隐与模型动画。
export default function DebugTweaks({
  seconds,
  debugMode,
  setDebugMode,
  debugProgress,
  setDebugProgress,
  cardVisible,
  setCardVisible,
  animEnabled,
  setAnimEnabled,
  cardPosition = { x: 0, y: 0 },
}) {
  const [copied, setCopied] = useState(false);

  // 卡片初始锚点由 .immersive-card-wrap 的 padding 决定：top=40, left=40
  const ANCHOR = { x: 40, y: 40 };
  const absX = ANCHOR.x + Math.round(cardPosition.x);
  const absY = ANCHOR.y + Math.round(cardPosition.y);

  const copyPosition = () => {
    const text = `x: ${Math.round(cardPosition.x)}, y: ${Math.round(cardPosition.y)}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="immersive-tweaks">
      {debugMode && (
        <div className="tweaks-panel">
          <div className="tweaks-label">
            <span>专注时长</span>
            <span className="tweaks-val">{formatClock(seconds)}</span>
          </div>
          <div className="tweaks-divider" />
          <div className="tweaks-label">
            <span>液体进度</span>
            <span className="tweaks-val">{Math.round(debugProgress * 100)}%</span>
          </div>
          <input
            type="range"
            min="0" max="1" step="0.01"
            value={debugProgress}
            onChange={(e) => setDebugProgress(Number(e.target.value))}
            className="tweaks-slider"
          />
          <div className="tweaks-divider" />
          <button
            type="button"
            className={`tweaks-anim-toggle ${cardVisible ? "active" : ""}`}
            onClick={() => setCardVisible((v) => !v)}
          >
            <span className="tweaks-anim-dot" />
            {cardVisible ? "关闭卡片" : "打开卡片"}
          </button>
          <button
            type="button"
            className={`tweaks-anim-toggle ${animEnabled ? "active" : ""}`}
            onClick={() => setAnimEnabled((v) => !v)}
          >
            <span className="tweaks-anim-dot" />
            模型动画：{animEnabled ? "开" : "关"}
          </button>
          <div className="tweaks-divider" />
          <div className="tweaks-label">
            <span>拖拽偏移</span>
            <span className="tweaks-val">
              {Math.round(cardPosition.x)}, {Math.round(cardPosition.y)}
            </span>
          </div>
          <div className="tweaks-label" style={{ opacity: 0.6 }}>
            <span>窗口坐标</span>
            <span className="tweaks-val">{absX}, {absY}</span>
          </div>
          <button
            type="button"
            className={`tweaks-anim-toggle ${copied ? "active" : ""}`}
            onClick={copyPosition}
          >
            <span className="tweaks-anim-dot" />
            {copied ? "已复制 ✓" : "复制偏移量"}
          </button>
        </div>
      )}
      <button
        type="button"
        className={`tweaks-toggle ${debugMode ? "active" : ""}`}
        onClick={() => setDebugMode((d) => !d)}
      >
        调试
      </button>
    </div>
  );
}
