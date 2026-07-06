import { useCallback, useState } from "react";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import { generateTonePack, hasApiKey } from "@/utils/ai/aiTone";

// 语气包状态：持久化到 localStorage。角色卡 / 结算卡读它做质化文案覆盖，
// 设置页用它写入（输入一段 prompt → AI 生成整套文案）。
// tonePack = { prompt, lang, phrases: {<i18nKey>: text}, mode: 'ai'|'example', ts } | null
export default function useTonePack() {
  const [tonePack, setTonePack] = useLocalStorage(STORAGE_KEYS.TONE_PACK, null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const generate = useCallback(
    async (prompt, lang) => {
      const clean = (prompt || "").trim();
      if (!clean || generating) return;
      setGenerating(true);
      setError(null);
      try {
        const { phrases, mode } = await generateTonePack(clean, lang);
        setTonePack({ prompt: clean, lang, phrases, mode, ts: Date.now() });
      } catch (e) {
        setError(e?.message || "failed");
      } finally {
        setGenerating(false);
      }
    },
    [generating, setTonePack],
  );

  const reset = useCallback(() => {
    setTonePack(null);
    setError(null);
  }, [setTonePack]);

  return { tonePack, generating, error, generate, reset, isExampleMode: !hasApiKey() };
}
