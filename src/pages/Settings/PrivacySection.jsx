import React, { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import PrivacyNotice from "@/components/privacy/PrivacyNotice";
import { writeAck } from "@/utils/privacy/privacyNotice";

// 设置 → 隐私。只有一个动作：把首次启动看过的那份说明再看一遍。
export default function PrivacySection() {
  const { t } = useLanguage();
  const [viewing, setViewing] = useState(false);

  return (
    <div className="settings-section">
      <span className="settings-section-title">{t("privacy.settings.title")}</span>
      <div className="settings-data-actions">
        <button
          type="button"
          className="settings-data-btn"
          onClick={() => setViewing(true)}
        >
          {t("privacy.settings.view")}
        </button>
      </div>

      {/* 从设置页看的这一遍照样记一次「已看过」：用户确实刚读完，
          没道理因为入口不同就在下次启动时再拦他一回。 */}
      {viewing && (
        <PrivacyNotice
          onAck={() => {
            writeAck();
            setViewing(false);
          }}
        />
      )}
    </div>
  );
}
