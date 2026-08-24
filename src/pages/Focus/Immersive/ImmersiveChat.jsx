import React, { useState, useEffect } from "react";
import "./ImmersiveChat.css";
import { hasApiKey } from "@/utils/ai/aiChat";
import { aiErrorMessageKey } from "@/utils/ai/aiClient";
import { useLanguage } from "@/context/LanguageContext";

// 沉浸式专注页左下角的极简 AI 陪伴对话：无框 / 无气泡 / 无背景，
// 只有文字和一个输入框。默认隐藏，鼠标靠近左下角（hover）或正在
// 打字（focus-within）时淡出现身。仅显示最近几条消息。
const RECENT_COUNT = 4;

export default function ImmersiveChat({ messages, sending, onSend }) {
  const { t } = useLanguage();
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
        {isDemo && <span className="immersive-chat-demo-badge">{t("focus.imm.chat.demoBadge")}</span>}
        {recent.map((m) => (
          <p key={m.id} className={`immersive-chat-line ${m.role}`}>
            {/* 这条是 AI 没连上时垫的离线示例，标一下——复用演示模式那枚角标 */}
            {m.degraded && (
              <span className="immersive-chat-demo-badge inline">
                {t(m.errorKind ? aiErrorMessageKey(m.errorKind) : "common.aiDegraded")}
              </span>
            )}
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
        placeholder={t(isDemo ? "focus.imm.chat.placeholderDemo" : "focus.imm.chat.placeholder")}
        aria-label={t("focus.imm.chat.inputAria")}
      />
    </div>
  );
}
