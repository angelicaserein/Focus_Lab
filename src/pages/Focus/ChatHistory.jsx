import React from "react";
import { hasApiKey } from "../../utils/aiChat";

// Focus 页面（非沉浸）上的聊天历史区：展示与 AI 陪伴的全部对话，
// 与沉浸式左下角对话框共用同一份持久化数据。
export default function ChatHistory({ messages, onClear }) {
  const hasMessages = messages.length > 0;
  const isDemo = !hasApiKey();

  return (
    <div className="focus-card chat-history">
      <div className="focus-card-header">
        <div className="focus-card-header-left">
          <span className="card-label">聊天记录</span>
          {isDemo && <span className="chat-demo-note">AI 未连接 · 演示回复</span>}
        </div>
        <button
          type="button"
          className="clear-focus"
          onClick={onClear}
          disabled={!hasMessages}
        >
          清空
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
        <div className="focus-task-placeholder">还没有对话</div>
      )}
    </div>
  );
}
