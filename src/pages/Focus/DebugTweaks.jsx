import React from "react";
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
}) {
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
