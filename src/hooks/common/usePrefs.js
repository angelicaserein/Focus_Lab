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
  // 启动仪式开关：开始专注前是否插入揭晓过渡层
  const [ritualEnabled, setRitualEnabled] = useLocalStorage(STORAGE_KEYS.PREF_RITUAL_ENABLED, false);
  const [cardVisible, setCardVisible] = useLocalStorage(STORAGE_KEYS.PREF_CARD_VISIBLE, true);
  // 桌面通知默认关闭：通知属打扰型能力，opt-in 才符合预期，也避免无意义的授权弹窗。
  const [notifyEnabled, setNotifyEnabled] = useLocalStorage(STORAGE_KEYS.PREF_NOTIFY_ENABLED, false);
  // 分心水位（桌面版）：默认关。这项会让 app 去看你前台开着什么程序，
  // 必须是 opt-in，跟桌面通知同一个道理——打扰型/窥探型能力不能默认生效。
  const [appWatchRaw, setAppWatch] = useLocalStorage(STORAGE_KEYS.PREF_APP_WATCH, null);
  // deny 是标题关键词：勾进白名单的程序，窗口标题里出现这些词照样算分心。
  // 浏览器只能整个勾进来，查论文和刷视频是同一个进程，靠它才分得开。
  const appWatch = {
    enabled: !!appWatchRaw?.enabled,
    allow: Array.isArray(appWatchRaw?.allow) ? appWatchRaw.allow : [],
    deny: Array.isArray(appWatchRaw?.deny) ? appWatchRaw.deny : [],
  };
  return {
    countupFullMins, setCountupFullMins,
    countdownMins, setCountdownMins,
    countupPresets, setCountupPresets,
    countdownPresets, setCountdownPresets,
    timerMode, setTimerMode,
    flaskShape, setFlaskShape,
    animEnabled, setAnimEnabled,
    ritualEnabled, setRitualEnabled,
    cardVisible, setCardVisible,
    notifyEnabled, setNotifyEnabled,
    appWatch, setAppWatch,
  };
}
