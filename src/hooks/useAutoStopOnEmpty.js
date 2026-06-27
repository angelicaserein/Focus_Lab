import { useEffect } from "react";

// 选中集合清空时：若计时器还在跑（任务被逐一勾完），先发币再归零并退出沉浸。
// handleStop 先调 clearSession()（seconds 归零），所以此处 seconds>0 只在
// 「逐一勾完」路径下成立，不会与 handleStop 的发币重复。
export default function useAutoStopOnEmpty(hasSelection, { seconds, addCoins, clearSession, onStop }) {
  useEffect(() => {
    if (!hasSelection) {
      if (seconds > 0) addCoins(seconds);
      clearSession();
      onStop?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSelection]);
}
