import { useCallback, useState } from "react";
import useLocalStorage from "./useLocalStorage";
import { getAiReply } from "../utils/aiChat";

// 专注页 AI 陪伴对话的状态。消息持久化到 localStorage，
// 沉浸式左下角对话框与 Focus 页「聊天记录」共用同一份数据。
// 消息结构：{ id, role: 'user' | 'ai', text, ts }
export default function useFocusChat() {
  const [messages, setMessages] = useLocalStorage("focus_chat_v1", []);
  const [sending, setSending] = useState(false);

  const sendUserMessage = useCallback(
    async (raw) => {
      const text = raw.trim();
      if (!text || sending) return;

      const userMsg = { id: `u-${Date.now()}`, role: "user", text, ts: Date.now() };
      // 用函数式更新拿到含本条用户消息的最新列表，再交给 AI。
      let history = [];
      setMessages((prev) => {
        history = [...prev, userMsg];
        return history;
      });

      setSending(true);
      try {
        const reply = await getAiReply(history);
        const aiMsg = { id: `a-${Date.now()}`, role: "ai", text: reply, ts: Date.now() };
        setMessages((prev) => [...prev, aiMsg]);
      } finally {
        setSending(false);
      }
    },
    [sending, setMessages],
  );

  const clearChat = useCallback(() => setMessages([]), [setMessages]);

  return { messages, sending, sendUserMessage, clearChat };
}
