import React from "react";
import { useLanguage } from "@/context/LanguageContext";

// 调试弹窗：修改金币数量。受控于 useCoinsDebug。
export default function RewardDebugPanel({ value, setValue, onClose, onApply }) {
  const { t } = useLanguage();

  return (
    <div
      className="reward-debug-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t("reward.debug.panel")}
      onClick={onClose}
    >
      <form
        className="reward-debug-panel"
        onClick={(e) => e.stopPropagation()}
        onSubmit={onApply}
      >
        <div className="reward-debug-title">{t("reward.debug.title")}</div>
        <input
          className="reward-debug-input"
          type="number"
          min="0"
          value={value}
          aria-label={t("reward.debug.coinsAria")}
          autoFocus
          onChange={(e) => setValue(e.target.value)}
        />
        <div className="reward-debug-actions">
          <button type="button" className="reward-debug-cancel" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" className="reward-debug-apply">
            {t("reward.debug.apply")}
          </button>
        </div>
      </form>
    </div>
  );
}
