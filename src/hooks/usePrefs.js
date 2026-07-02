import useLocalStorage from "./useLocalStorage";
import { STORAGE_KEYS } from "../utils/storageKeys";

export default function usePrefs() {
  // 正计时烧瓶注满时长 / 倒计时时长（分钟），两者独立
  const [countupFullMins, setCountupFullMins] = useLocalStorage(STORAGE_KEYS.PREF_COUNTUP_FULL_MINS, 25);
  const [countdownMins, setCountdownMins] = useLocalStorage(STORAGE_KEYS.PREF_COUNTDOWN_MINS, 25);
  // 计时模式：countup（正计时）| countdown（倒计时）
  const [timerMode, setTimerMode] = useLocalStorage(STORAGE_KEYS.PREF_TIMER_MODE, "countup");
  const [animEnabled, setAnimEnabled] = useLocalStorage(STORAGE_KEYS.PREF_ANIM_ENABLED, true);
  const [cardVisible, setCardVisible] = useLocalStorage(STORAGE_KEYS.PREF_CARD_VISIBLE, true);
  // 桌面通知默认关闭：通知属打扰型能力，opt-in 才符合预期，也避免无意义的授权弹窗。
  const [notifyEnabled, setNotifyEnabled] = useLocalStorage(STORAGE_KEYS.PREF_NOTIFY_ENABLED, false);
  return {
    countupFullMins, setCountupFullMins,
    countdownMins, setCountdownMins,
    timerMode, setTimerMode,
    animEnabled, setAnimEnabled,
    cardVisible, setCardVisible,
    notifyEnabled, setNotifyEnabled,
  };
}
