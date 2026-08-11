import React from "react";
import "./ChatHistory.css";
import { hasApiKey } from "@/utils/ai/aiChat";
import { useLanguage } from "@/context/LanguageContext";

// 历史页的 AI 陪伴聊天记录区：展示与 AI 陪伴的全部对话，
// 与沉浸式左下角对话框共用同一份持久化数据。
export default function ChatHistory({ messages, onClear }) {
  const { t } = useLanguage();
  const hasMessages = messages.length > 0;
  const isDemo = !hasApiKey();

  return (
    <div className="chat-history">
      <div className="chat-history-header">
        <div className="chat-history-header-left">
          <span className="chat-history-title">{t("history.chatTitle")}</span>
          {isDemo && <span className="chat-history-demo">{t("history.aiDemoNote")}</span>}
        </div>
        <button
          type="button"
          className="chat-history-clear"
          onClick={onClear}
          disabled={!hasMessages}
        >
          {t("history.clearChat")}
        </button>
      </div>

      {hasMessages ? (
        <div className="chat-history-list">
          {messages.map((m) => (
            <p key={m.id} className={`chat-history-line ${m.role}`}>
              {m.text}
            </p>
          ))}
        </div>
      ) : (
        <div className="chat-history-empty">{t("history.noChat")}</div>
      )}
    </div>
  );
}
