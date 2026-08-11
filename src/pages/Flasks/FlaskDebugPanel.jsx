import React, { useState } from "react";
import { FlaskGraphic } from "@/pages/Focus/FocusFlask";
import { FLASK_FULL_SECS, bottlesOf } from "./flaskShelf";
import { useLanguage } from "@/context/LanguageContext";

// 水位调试面板（仅开发环境）：架上每只瓶子一行，直接填「里面有多少分钟的水」。
// 改的是覆盖表（见 flaskDebug.js），专注记录一条都不动——所以随便调，历史不会脏。
export default function FlaskDebugPanel({
  flasks,
  realFills,
  debugFills,
  onSet,
  onClear,
  onClearAll,
  onClose,
}) {
  const { t } = useLanguage();
  // 「全部恢复真实」要把每行输入框里的草稿也一并回填成现算值——
  // 换 key 让行整个重建，比逐行往下传一个「该重置了」的信号省事。
  const [resetNonce, setResetNonce] = useState(0);
  const clearAll = () => {
    onClearAll();
    setResetNonce((n) => n + 1);
  };

  return (
    <div
      className="fk-debug-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t("flasks.debug.aria")}
      onClick={onClose}
    >
      <div className="fk-debug-panel" onClick={(e) => e.stopPropagation()}>
        <div className="fk-debug-title">{t("flasks.debug.title")}</div>
        <p className="fk-debug-note">
          {t("flasks.debug.note", { mins: FLASK_FULL_SECS / 60 })}
        </p>

        {flasks.length === 0 ? (
          <p className="fk-debug-empty">{t("flasks.debug.empty")}</p>
        ) : (
          <ul className="fk-debug-list">
            {flasks.map((it) => (
              <DebugRow
                key={`${it.id}-${resetNonce}`}
                flask={it}
                realSecs={realFills[it.id] ?? 0}
                overrideSecs={debugFills[it.id]}
                onSet={(secs) => onSet(it.id, secs)}
                onClear={() => onClear(it.id)}
                t={t}
              />
            ))}
          </ul>
        )}

        <div className="fk-debug-actions">
          <button type="button" className="fk-debug-reset" onClick={clearAll}>
            {t("flasks.debug.resetAll")}
          </button>
          <button type="button" className="fk-debug-close" onClick={onClose} autoFocus>
            {t("flasks.debug.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

// 一行＝一只瓶子。输入框存的是自己的草稿字符串（不然清空输入框会被立刻回填成 "0"，
// 打不出两位数），每次改动同步写进覆盖表，架子在面板后面实时跟着变。
function DebugRow({ flask, realSecs, overrideSecs, onSet, onClear, t }) {
  const overridden = overrideSecs !== undefined;
  const shownSecs = overridden ? overrideSecs : realSecs;
  const [draft, setDraft] = useState(String(Math.round(shownSecs / 60)));
  const { full, partial } = bottlesOf(shownSecs);

  const change = (raw) => {
    setDraft(raw);
    onSet(Math.max(0, Math.round(Number(raw) || 0) * 60));
  };

  const reset = () => {
    onClear();
    setDraft(String(Math.round(realSecs / 60)));
  };

  return (
    <li className="fk-debug-row">
      <span className="fk-debug-thumb" aria-hidden="true">
        <FlaskGraphic progress={partial} params={flask.params} />
      </span>
      <span className="fk-debug-name">{flask.name || t("flasks.debug.unnamed")}</span>
      <label className="fk-debug-field">
        <input
          className="fk-debug-input"
          type="number"
          min="0"
          step="10"
          value={draft}
          aria-label={t("flasks.debug.levelAria", { name: flask.name || t("flasks.debug.unnamed") })}
          onChange={(e) => change(e.target.value)}
        />
        <span className="fk-debug-unit">{t("flasks.debug.unit")}</span>
      </label>
      <span className="fk-debug-state">
        {t("flasks.debug.state", { full, pct: Math.round(partial * 100) })}
        {overridden && <em className="fk-debug-flag">{t("flasks.debug.overridden")}</em>}
      </span>
      <button
        type="button"
        className="fk-debug-restore"
        onClick={reset}
        disabled={!overridden}
        title={t("flasks.debug.restoreTitle", { mins: Math.round(realSecs / 60) })}
      >
        {t("flasks.debug.restore")}
      </button>
    </li>
  );
}
