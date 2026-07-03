import React from "react";

// 调试弹窗：修改金币数量。受控于 useCoinsDebug。
export default function RewardDebugPanel({ value, setValue, onClose, onApply }) {
  return (
    <div
      className="reward-debug-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="调试面板"
      onClick={onClose}
    >
      <form
        className="reward-debug-panel"
        onClick={(e) => e.stopPropagation()}
        onSubmit={onApply}
      >
        <div className="reward-debug-title">🛠️ 调试：修改金币</div>
        <input
          className="reward-debug-input"
          type="number"
          min="0"
          value={value}
          aria-label="金币数量"
          autoFocus
          onChange={(e) => setValue(e.target.value)}
        />
        <div className="reward-debug-actions">
          <button type="button" className="reward-debug-cancel" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="reward-debug-apply">
            应用
          </button>
        </div>
      </form>
    </div>
  );
}
