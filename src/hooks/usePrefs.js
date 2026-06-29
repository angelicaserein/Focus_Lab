import useLocalStorage from "./useLocalStorage";
import { STORAGE_KEYS } from "../utils/storageKeys";

export default function usePrefs() {
  const [pomodoroMins, setPomodoroMins] = useLocalStorage(STORAGE_KEYS.PREF_POMODORO_MINS, 25);
  const [animEnabled, setAnimEnabled] = useLocalStorage(STORAGE_KEYS.PREF_ANIM_ENABLED, true);
  const [cardVisible, setCardVisible] = useLocalStorage(STORAGE_KEYS.PREF_CARD_VISIBLE, true);
  // 桌面通知默认关闭：通知属打扰型能力，opt-in 才符合预期，也避免无意义的授权弹窗。
  const [notifyEnabled, setNotifyEnabled] = useLocalStorage(STORAGE_KEYS.PREF_NOTIFY_ENABLED, false);
  return {
    pomodoroMins, setPomodoroMins,
    animEnabled, setAnimEnabled,
    cardVisible, setCardVisible,
    notifyEnabled, setNotifyEnabled,
  };
}
