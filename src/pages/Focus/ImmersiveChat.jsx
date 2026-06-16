import React, { useState, useEffect } from "react";
import { hasApiKey } from "../../utils/aiChat";

// 沉浸式专注页左下角的极简 AI 陪伴对话：无框 / 无气泡 / 无背景，
// 只有文字和一个输入框。默认隐藏，鼠标靠近左下角（hover）或正在
// 打字（focus-within）时淡出现身。仅显示最近几条消息。
const RECENT_COUNT = 4;

export default function ImmersiveChat({ messages, sending, onSend }) {
  const [draft, setDraft] = useState("");
  const [showPulse, setShowPulse] = useState(true);
  const isDemo = !hasApiKey();

  useEffect(() => {
    const id = setTimeout(() => setShowPulse(false), 1800);
    return () => clearTimeout(id);
  }, []);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const recent = messages.slice(-RECENT_COUNT);

  return (
    <div className={`immersive-chat${showPulse ? " pulsing" : ""}`}>
      <div className="immersive-chat-log">
        {isDemo && <span className="immersive-chat-demo-badge">演示模式</span>}
        {recent.map((m) => (
          <p key={m.id} className={`immersive-chat-line ${m.role}`}>
            {m.text}
          </p>
        ))}
        {sending && <p className="immersive-chat-line ai typing">…</p>}
      </div>
      <input
        className="immersive-chat-input"
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isDemo ? "和我说点什么…（示例回复）" : "和我说点什么…"}
        aria-label="AI 对话输入"
      />
    </div>
  );
}
