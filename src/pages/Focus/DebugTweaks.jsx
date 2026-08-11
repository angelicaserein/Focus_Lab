import React, { useState } from "react";
import "./DebugTweaks.css";
import { formatClock } from "@/utils/time";
import { useFocusSession } from "@/pages/Focus/FocusSessionContext";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import { useLanguage } from "@/context/LanguageContext";

const ALL_STORAGE_KEYS = Object.values(STORAGE_KEYS);

function getStorageStats() {
  const rows = ALL_STORAGE_KEYS.map((key) => {
    const val = localStorage.getItem(key);
    return { key, size: val ? val.length : 0, exists: val !== null };
  });
  const totalBytes = rows.reduce((s, r) => s + r.size, 0);
  const activeCount = rows.filter((r) => r.exists).length;
  return { rows, totalBytes, activeCount };
}

// 仅在开发环境出现的调试面板（右上角），用于微调液体进度、卡片显隐、模型动画、快速加时、触发调试事件。
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
  const { t, lang } = useLanguage();
  const {
    isRunning,
    selectedTodos,
    sessionNotes,
    sessionDistractionCount,
    onDistraction,
    onAddNote,
    jumpSeconds,
    targetMins = 25,
  } = useFocusSession();

  const [copied, setCopied] = useState(false);
  const [noteFeedback, setNoteFeedback] = useState(false);
  const [distrFeedback, setDistrFeedback] = useState(false);
  const [storageOpen, setStorageOpen] = useState(false);

  // 调试面板仅在开发环境出现；生产构建里不渲染（与本文件注释意图一致）
  if (!import.meta.env.DEV) return null;

  const ANCHOR = { x: 40, y: 40 };
  const absX = ANCHOR.x + Math.round(cardPosition.x);
  const absY = ANCHOR.y + Math.round(cardPosition.y);

  const copyPosition = () => {
    navigator.clipboard.writeText(
      `x: ${Math.round(cardPosition.x)}, y: ${Math.round(cardPosition.y)}`
    ).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleTestDistraction = () => {
    onDistraction();
    setDistrFeedback(true);
    setTimeout(() => setDistrFeedback(false), 1200);
  };

  const handleTestNote = () => {
    const time = new Date().toLocaleTimeString(lang === "en" ? "en-GB" : "zh-CN", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    onAddNote(t("focus.debug.debugNote", { time }));
    setNoteFeedback(true);
    setTimeout(() => setNoteFeedback(false), 1200);
  };

  // 仅在调试面板展开时扫描 localStorage，避免每次渲染都遍历所有 key
  const storageStats = debugMode ? getStorageStats() : null;

  return (
    <div className="immersive-tweaks">
      {debugMode && (
        <div className="tweaks-panel">
          {/* ── Session 实时状态 ── */}
          <div className="tweaks-section-label">Session</div>
          <div className="tweaks-label">
            <span className="tweaks-label-left">
              <span className={`tweaks-status-dot${isRunning ? " running" : ""}`} />
              {t(isRunning ? "focus.debug.running" : "focus.debug.paused")}
            </span>
            <span className="tweaks-val">{formatClock(seconds)}</span>
          </div>
          <div className="tweaks-stat-row">
            <span className="tweaks-stat">{t("focus.debug.tasks")} <b>{selectedTodos.length}</b></span>
            <span className="tweaks-stat">{t("focus.debug.notes")} <b>{sessionNotes.length}</b></span>
            <span className="tweaks-stat">{t("focus.debug.distractions")} <b>{sessionDistractionCount}</b></span>
          </div>

          <div className="tweaks-divider" />

          {/* ── 快速加时 ── */}
          <div className="tweaks-section-label">{t("focus.debug.addTime")}</div>
          <div className="tweaks-btn-row">
            <button type="button" className="tweaks-sm-btn" onClick={() => jumpSeconds(60)}>{t("focus.debug.plus1m")}</button>
            <button type="button" className="tweaks-sm-btn" onClick={() => jumpSeconds(300)}>{t("focus.debug.plus5m")}</button>
            <button type="button" className="tweaks-sm-btn" onClick={() => jumpSeconds(1200)}>{t("focus.debug.plus20m")}</button>
            <button type="button" className="tweaks-sm-btn accent" onClick={() => jumpSeconds(targetMins * 60)}>{t("focus.debug.fill")}</button>
          </div>

          <div className="tweaks-divider" />

          {/* ── 快捷触发 ── */}
          <div className="tweaks-section-label">{t("focus.debug.triggers")}</div>
          <div className="tweaks-btn-row">
            <button
              type="button"
              className={`tweaks-sm-btn${distrFeedback ? " success" : ""}`}
              onClick={handleTestDistraction}
            >
              {t(distrFeedback ? "focus.debug.logged" : "focus.debug.logDistraction")}
            </button>
            <button
              type="button"
              className={`tweaks-sm-btn${noteFeedback ? " success" : ""}`}
              onClick={handleTestNote}
            >
              {t(noteFeedback ? "focus.debug.added" : "focus.debug.addNote")}
            </button>
          </div>

          <div className="tweaks-divider" />

          {/* ── 液体进度 ── */}
          <div className="tweaks-section-label">{t("focus.debug.liquid")}</div>
          <div className="tweaks-label">
            <span>{t("focus.debug.flask")}</span>
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

          {/* ── 视图控制 ── */}
          <div className="tweaks-section-label">{t("focus.debug.view")}</div>
          <button
            type="button"
            className={`tweaks-anim-toggle${cardVisible ? " active" : ""}`}
            onClick={() => setCardVisible((v) => !v)}
          >
            <span className="tweaks-anim-dot" />
            {t(cardVisible ? "focus.debug.hideCard" : "focus.debug.showCard")}
          </button>
          <button
            type="button"
            className={`tweaks-anim-toggle${animEnabled ? " active" : ""}`}
            onClick={() => setAnimEnabled((v) => !v)}
          >
            <span className="tweaks-anim-dot" />
            {t("focus.debug.modelAnim", { state: t(animEnabled ? "focus.debug.on" : "focus.debug.off") })}
          </button>

          <div className="tweaks-divider" />

          {/* ── 卡片位置 ── */}
          <div className="tweaks-section-label">{t("focus.debug.cardPos")}</div>
          <div className="tweaks-label">
            <span>{t("focus.debug.offset")}</span>
            <span className="tweaks-val">{Math.round(cardPosition.x)}, {Math.round(cardPosition.y)}</span>
          </div>
          <div className="tweaks-label" style={{ opacity: 0.55 }}>
            <span>{t("focus.debug.windowCoords")}</span>
            <span className="tweaks-val">{absX}, {absY}</span>
          </div>
          <button
            type="button"
            className={`tweaks-anim-toggle${copied ? " active" : ""}`}
            onClick={copyPosition}
          >
            <span className="tweaks-anim-dot" />
            {t(copied ? "focus.debug.copied" : "focus.debug.copyOffset")}
          </button>

          <div className="tweaks-divider" />

          {/* ── localStorage ── */}
          <div className="tweaks-section-label">{t("focus.debug.storage")}</div>
          <button
            type="button"
            className={`tweaks-anim-toggle${storageOpen ? " active" : ""}`}
            onClick={() => setStorageOpen((o) => !o)}
          >
            <span className="tweaks-anim-dot" />
            {t("focus.debug.storageStat", {
              keys: storageStats.activeCount,
              kb: (storageStats.totalBytes / 1024).toFixed(1),
            })}
          </button>
          {storageOpen && (
            <div className="tweaks-storage-list">
              {storageStats.rows.map(({ key, size, exists }) => (
                <div key={key} className={`tweaks-storage-row${exists ? "" : " empty"}`}>
                  <span className="tweaks-storage-key">{key.replace(/_v\d+$/, "")}</span>
                  <span className="tweaks-storage-size">{exists ? `${(size / 1024).toFixed(1)}K` : "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <button
        type="button"
        className={`tweaks-toggle${debugMode ? " active" : ""}`}
        onClick={() => setDebugMode((d) => !d)}
      >
        {t("focus.debug.toggle")}
      </button>
    </div>
  );
}
