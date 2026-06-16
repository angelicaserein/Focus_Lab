import useLocalStorage from "./useLocalStorage";

export default function usePrefs() {
  const [pomodoroMins, setPomodoroMins] = useLocalStorage("pref_pomodoro_mins_v1", 25);
  const [animEnabled, setAnimEnabled] = useLocalStorage("pref_anim_enabled_v1", true);
  return { pomodoroMins, setPomodoroMins, animEnabled, setAnimEnabled };
}
