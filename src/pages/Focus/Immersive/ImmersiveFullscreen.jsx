import React, { useCallback, useEffect, useState } from "react";
import "./ImmersiveFullscreen.css";
import { useLanguage } from "@/context/LanguageContext";

// 是否正在输入：避免在聊天/随记框打字时误触快捷键
function isTyping() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}

// 沉浸模式右上角全屏开关：按钮 + F 快捷键提示。
// 用浏览器原生 Fullscreen API 隐藏系统/浏览器边框，强化专注。
// 手机 / PWA 无物理键盘、且 PWA 本就全屏，此开关无意义，直接不渲染。
const isMobile =
  typeof window !== "undefined" &&
  window.matchMedia?.("(max-width: 600px)").matches;

export default function ImmersiveFullscreen() {
  const { t } = useLanguage();
  const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }, []);

  // 跟随真实全屏状态（含按 Esc / F11 退出的情况）
  useEffect(() => {
    const sync = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  // F 键切换全屏（输入时不拦截）
  useEffect(() => {
    if (isMobile) return undefined;
    const onKey = (e) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.toLowerCase() !== "f") return;
      if (isTyping()) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  if (isMobile) return null;

  return (
    <button
      type="button"
      className="immersive-fullscreen-btn"
      onClick={toggle}
      title={t(isFullscreen ? "focus.imm.fullscreenExit" : "focus.imm.fullscreenEnter")}
      aria-label={t(isFullscreen ? "focus.imm.fullscreenExit" : "focus.imm.fullscreenEnter")}
      aria-pressed={isFullscreen}
    >
      {isFullscreen ? (
        // 收缩（退出全屏）
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
          <path
            d="M9 3v4a2 2 0 0 1-2 2H3M21 9h-4a2 2 0 0 1-2-2V3M3 15h4a2 2 0 0 1 2 2v4M15 21v-4a2 2 0 0 1 2-2h4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        // 展开（进入全屏）
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
          <path
            d="M3 9V5a2 2 0 0 1 2-2h4M21 9V5a2 2 0 0 0-2-2h-4M3 15v4a2 2 0 0 0 2 2h4M21 15v4a2 2 0 0 1-2 2h-4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      <kbd className="immersive-fullscreen-key">F</kbd>
    </button>
  );
}
