import { useEffect } from "react";
import { isRecordable } from "@/utils/records/focusRecords";

// 选中集合清空时：若计时器还在跑（任务被逐一勾完），先发币再归零并退出沉浸。
// handleStop 先调 clearSession()（seconds 归零），所以此处 seconds>0 只在
// 「逐一勾完」路径下成立，不会与 handleStop 的发币重复。
//
// 发币门槛与记账门槛同一条线（isRecordable）：太短的那一下不写记录也就不发币，
// 免得金币和历史对不上账。
export default function useAutoStopOnEmpty(hasSelection, { seconds, addCoins, clearSession, onStop }) {
  useEffect(() => {
    if (!hasSelection) {
      if (isRecordable(seconds)) addCoins(seconds);
      clearSession();
      onStop?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSelection]);
}
