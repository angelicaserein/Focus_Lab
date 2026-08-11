import React, { useState, useRef, useEffect } from "react";
import { useFocus } from "@/context/FocusContext";
import { useActivityLog } from "@/context/ActivityContext";
import { useLanguage } from "@/context/LanguageContext";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import useFocusChat from "@/hooks/focus/useFocusChat";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import RecordList from "@/pages/History/RecordList";
import SessionSummary from "@/pages/History/SessionSummary";
import ChatHistory from "@/pages/History/ChatHistory";
import "./History.css";

// 历史记录 = 原始流水档案：一条条记录、随记、聊天的原文。
// 任何汇总数字与图表都归 /analytics，这里不重复摆一遍。
export default function HistoryPage() {
  const { focusRecords, clearFocusRecords } = useFocus();
  // 使用记录：没开计时器也发生过的加/完成/删，总记录里也得有，否则那天的事只剩一半
  const { activities } = useActivityLog();
  // 随记 / 聊天：与专注页共用同一份持久化数据，历史页只读展示。
  const [notes] = useLocalStorage(STORAGE_KEYS.NOTES, []);
  const { messages: chatMessages, clearChat } = useFocusChat();
  const { t } = useLanguage();
  const [confirmClear, setConfirmClear] = useState(false);
  const confirmTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);

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
        <h1>{t("history.title")}</h1>
        <p>{t("history.subtitle")}</p>
      </div>

      <RecordList
        records={focusRecords}
        activities={activities}
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
