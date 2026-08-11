import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import { groupDays } from "@/utils/records/dayLog";
import DayLog from "@/components/records/DayLog";

// 全部记录区 = 总记录：按天分组，每天交给共用的 DayLog 渲染
//（同页的「日历」视图用同一个组件只渲染选中的那天）。
export default function RecordList({ records, activities = [], confirmClear, onClear }) {
  const { t, lang } = useLanguage();
  // 天分组的标题是本地化日期串，跟着语言走
  const days = groupDays(records, activities, lang);

  return (
    <div className="hist-section">
      <div className="hist-section-header">
        <div className="hist-section-title">{t("history.allRecords")}</div>
        {records.length > 0 && (
          <button
            type="button"
            className={`hist-clear-btn ${confirmClear ? "confirm" : ""}`}
            onClick={onClear}
          >
            {confirmClear ? t("history.clearConfirm") : t("history.clear")}
          </button>
        )}
      </div>

      {days.length === 0 ? (
        <div className="hist-empty">{t("history.empty")}</div>
      ) : (
        days.map((day) => (
          <div key={day.key} className="hist-day-group">
            <div className="hist-day-label">{day.label}</div>
            <DayLog records={day.records} activities={day.activities} />
          </div>
        ))
      )}
    </div>
  );
}
