import React, { useState } from "react";
import { FlaskGraphic } from "@/pages/Focus/FocusFlask";
import { FLASK_FULL_SECS, bottlesOf } from "./flaskShelf";

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
      aria-label="调试：烧瓶水位"
      onClick={onClose}
    >
      <div className="fk-debug-panel" onClick={(e) => e.stopPropagation()}>
        <div className="fk-debug-title">🛠️ 调试：烧瓶水位</div>
        <p className="fk-debug-note">
          填的是这只瓶子里一共有多少分钟的水（{FLASK_FULL_SECS / 60} 分钟注满一只，
          多出来的流进下一只）。只改显示，不写进专注记录。
        </p>

        {flasks.length === 0 ? (
          <p className="fk-debug-empty">架子上还没有瓶子，先去设置页存一只。</p>
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
              />
            ))}
          </ul>
        )}

        <div className="fk-debug-actions">
          <button type="button" className="fk-debug-reset" onClick={clearAll}>
            全部恢复真实
          </button>
          <button type="button" className="fk-debug-close" onClick={onClose} autoFocus>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

// 一行＝一只瓶子。输入框存的是自己的草稿字符串（不然清空输入框会被立刻回填成 "0"，
// 打不出两位数），每次改动同步写进覆盖表，架子在面板后面实时跟着变。
function DebugRow({ flask, realSecs, overrideSecs, onSet, onClear }) {
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
      <span className="fk-debug-name">{flask.name || "（未命名）"}</span>
      <label className="fk-debug-field">
        <input
          className="fk-debug-input"
          type="number"
          min="0"
          step="10"
          value={draft}
          aria-label={`${flask.name || "未命名"} 的水量（分钟）`}
          onChange={(e) => change(e.target.value)}
        />
        <span className="fk-debug-unit">分钟</span>
      </label>
      <span className="fk-debug-state">
        满 ×{full} · 这只 {Math.round(partial * 100)}%
        {overridden && <em className="fk-debug-flag">已覆盖</em>}
      </span>
      <button
        type="button"
        className="fk-debug-restore"
        onClick={reset}
        disabled={!overridden}
        title={`恢复成记录现算的 ${Math.round(realSecs / 60)} 分钟`}
      >
        恢复真实
      </button>
    </li>
  );
}
