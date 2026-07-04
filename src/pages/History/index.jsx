import React, { useMemo, useState, useRef, useEffect } from "react";
import { useFocus } from "@/context/FocusContext";
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
  // 随记 / 分心 / 聊天：与专注页共用同一份持久化数据，历史页只读展示。
  const [notes] = useLocalStorage(STORAGE_KEYS.NOTES, []);
  const [distractions] = useLocalStorage(STORAGE_KEYS.DISTRACTIONS, []);
  const { messages: chatMessages, clearChat } = useFocusChat();
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
      <div className="history-headline">
        <h1>历史</h1>
      </div>

      <StatsOverview stats={stats} />

      <RecordList
        records={focusRecords}
        confirmClear={confirmClear}
        onClear={handleClear}
      />

      {/* 历史随记 + 分心记录 */}
      <SessionSummary notes={notes} distractions={distractions} />

      {/* AI 陪伴聊天记录 */}
      <ChatHistory messages={chatMessages} onClear={clearChat} />
    </div>
  );
}
