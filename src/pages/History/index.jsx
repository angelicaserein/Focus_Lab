import React, { useMemo, useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useFocus } from "@/context/FocusContext";
import { useFeatures } from "@/context/FeatureContext";
import { useLanguage } from "@/context/LanguageContext";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import useFocusChat from "@/hooks/focus/useFocusChat";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import { computeFocusStats } from "@/utils/records/focusRecords";
import StatsOverview from "@/pages/History/StatsOverview";
import RecordList from "@/pages/History/RecordList";
import SessionSummary from "@/pages/History/SessionSummary";
import ChatHistory from "@/pages/History/ChatHistory";
import "./History.css";

export default function HistoryPage() {
  const { focusRecords, clearFocusRecords } = useFocus();
  // 随记 / 聊天：与专注页共用同一份持久化数据，历史页只读展示。
  const [notes] = useLocalStorage(STORAGE_KEYS.NOTES, []);
  const { messages: chatMessages, clearChat } = useFocusChat();
  const { isEnabled } = useFeatures();
  const { t } = useLanguage();
  const [confirmClear, setConfirmClear] = useState(false);
  const confirmTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);

  const stats = useMemo(() => computeFocusStats(focusRecords), [focusRecords]);

  const handleClear = () => {
    if (confirmClear) {
      clearFocusRecords();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      confirmTimerRef.current = setTimeout(() => setConfirmClear(false), 3000);
    }
  };

  return (
    <div className="page-history">
      <div className="history-headline hist-headline-row">
        <h1>历史</h1>
        {/* 分心统计已独立成页，这里只留一个入口 */}
        {isEnabled("/distraction") && (
          <Link to="/distraction" className="hist-cross-link">
            {t("distraction.fromHistory")}
          </Link>
        )}
      </div>

      <StatsOverview stats={stats} />

      <RecordList
        records={focusRecords}
        confirmClear={confirmClear}
        onClear={handleClear}
      />

      {/* 历史随记（分心记录见 /distraction） */}
      <SessionSummary notes={notes} />

      {/* AI 陪伴聊天记录 */}
      <ChatHistory messages={chatMessages} onClear={clearChat} />
    </div>
  );
}
