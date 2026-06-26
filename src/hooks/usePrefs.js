import useLocalStorage from "./useLocalStorage";
import { STORAGE_KEYS } from "../utils/storageKeys";

export default function usePrefs() {
  const [pomodoroMins, setPomodoroMins] = useLocalStorage(STORAGE_KEYS.PREF_POMODORO_MINS, 25);
  const [animEnabled, setAnimEnabled] = useLocalStorage(STORAGE_KEYS.PREF_ANIM_ENABLED, true);
  const [cardVisible, setCardVisible] = useLocalStorage(STORAGE_KEYS.PREF_CARD_VISIBLE, true);
  return { pomodoroMins, setPomodoroMins, animEnabled, setAnimEnabled, cardVisible, setCardVisible };
}
