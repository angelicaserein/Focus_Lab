import useLocalStorage from "@/hooks/common/useLocalStorage";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import { DEFAULT_FLASK_SHAPE, normalizeFlaskShape } from "@/pages/Focus/flaskShapes";

export default function usePrefs() {
  // 正计时烧瓶注满时长 / 倒计时时长（分钟），两者独立；记录专注页当前选中的时长
  const [countupFullMins, setCountupFullMins] = useLocalStorage(STORAGE_KEYS.PREF_COUNTUP_FULL_MINS, 25);
  const [countdownMins, setCountdownMins] = useLocalStorage(STORAGE_KEYS.PREF_COUNTDOWN_MINS, 25);
  // 专注页时长三档快捷预设（设置页自定义），正/倒计时各一套
  const [countupPresets, setCountupPresets] = useLocalStorage(STORAGE_KEYS.PREF_COUNTUP_PRESETS, [15, 25, 45]);
  const [countdownPresets, setCountdownPresets] = useLocalStorage(STORAGE_KEYS.PREF_COUNTDOWN_PRESETS, [15, 25, 45]);
  // 计时模式：countup（正计时）| countdown（倒计时）
  const [timerMode, setTimerMode] = useLocalStorage(STORAGE_KEYS.PREF_TIMER_MODE, "countup");
  // 专注页烧瓶形状：{ preset, params }，由参数生成路径；normalize 兼容旧版字符串
  const [flaskShapeRaw, setFlaskShape] = useLocalStorage(STORAGE_KEYS.PREF_FLASK_SHAPE, DEFAULT_FLASK_SHAPE);
  const flaskShape = normalizeFlaskShape(flaskShapeRaw);
  const [animEnabled, setAnimEnabled] = useLocalStorage(STORAGE_KEYS.PREF_ANIM_ENABLED, true);
  const [cardVisible, setCardVisible] = useLocalStorage(STORAGE_KEYS.PREF_CARD_VISIBLE, true);
  // 桌面通知默认关闭：通知属打扰型能力，opt-in 才符合预期，也避免无意义的授权弹窗。
  const [notifyEnabled, setNotifyEnabled] = useLocalStorage(STORAGE_KEYS.PREF_NOTIFY_ENABLED, false);
  return {
    countupFullMins, setCountupFullMins,
    countdownMins, setCountdownMins,
    countupPresets, setCountupPresets,
    countdownPresets, setCountdownPresets,
    timerMode, setTimerMode,
    flaskShape, setFlaskShape,
    animEnabled, setAnimEnabled,
    cardVisible, setCardVisible,
    notifyEnabled, setNotifyEnabled,
  };
}
