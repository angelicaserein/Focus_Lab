import React, { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { exportAllData } from "@/utils/storage/storage";
import { getQuotaState, subscribeQuota } from "@/utils/storage/quotaAlert";
import "./StorageQuotaBanner.css";

// localStorage 写满的警报条。挂在 App 根上，任何页面写失败都会弹出来。
//
// 不自动消失：这不是「操作成功」那类可以飘过去的提示，而是「你现在做的事情没有被保存」。
// 用户不导出备份就点掉的话，丢的是真数据，所以只给一个明确的出口——导出。
export default function StorageQuotaBanner() {
  const { t } = useLanguage();
  const [state, setState] = useState(getQuotaState);
  // 记住关闭时的失败次数：关掉之后再失败一次，count 就对不上了，警报重新出现。
  // 否则「关闭」等于永久静音，后面丢的数据照样无声无息。
  const [dismissedAt, setDismissedAt] = useState(0);

  useEffect(() => subscribeQuota(setState), []);

  if (!state.failed || state.count === dismissedAt) return null;

  return (
    <div className="storage-quota-banner" role="alert" aria-live="assertive">
      <span className="sqb-icon" aria-hidden="true">⚠️</span>
      <div className="sqb-text">
        <strong className="sqb-title">{t("storage.quota.title")}</strong>
        <span className="sqb-detail">{t("storage.quota.detail")}</span>
      </div>
      <button type="button" className="sqb-export" onClick={() => exportAllData()}>
        {t("storage.quota.export")}
      </button>
      <button
        type="button"
        className="sqb-dismiss"
        aria-label={t("common.close")}
        onClick={() => setDismissedAt(state.count)}
      >
        ×
      </button>
    </div>
  );
}
