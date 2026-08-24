import { useCallback, useState } from "react";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import { getAiReply } from "@/utils/ai/aiChat";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import { useLanguage } from "@/context/LanguageContext";

// 专注页 AI 陪伴对话的状态。消息持久化到 localStorage，
// 沉浸式左下角对话框与 Focus 页「聊天记录」共用同一份数据。
// 消息结构：{ id, role: 'user' | 'ai', text, ts, degraded?, errorKind? }
// degraded 的那条是「AI 没连上、垫的离线示例」，两个显示端都要标出来
// （见 ImmersiveChat / ChatHistory）——不标的话用户会当成伙伴的真回答。
export default function useFocusChat() {
  const [messages, setMessages] = useLocalStorage(STORAGE_KEYS.CHAT, []);
  const [sending, setSending] = useState(false);
  const { lang } = useLanguage();

  const sendUserMessage = useCallback(
    async (input) => {
      const text = input.trim();
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
        const { text: reply, degraded, errorKind } = await getAiReply(history, lang);
        const aiMsg = {
          id: `a-${Date.now()}`,
          role: "ai",
          text: reply,
          ts: Date.now(),
          ...(degraded ? { degraded: true, errorKind } : {}),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } finally {
        setSending(false);
      }
    },
    [sending, setMessages, lang],
  );

  const clearChat = useCallback(() => setMessages([]), [setMessages]);

  return { messages, sending, sendUserMessage, clearChat };
}
