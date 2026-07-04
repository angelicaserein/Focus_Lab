import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import {
  notifySupported,
  notifyPermission,
  requestNotifyPermission,
  showNotification,
} from "@/utils/notify";

// 桌面通知开关：聚合浏览器授权态与用户偏好。
//   supported  — 浏览器是否支持通知
//   permission — 授权态（granted / denied / default / unsupported）
//   notifyOn   — 实际「开」= 偏好开启 且 已授权
//   toggle     — 开启时请求授权（须由用户手势触发），通过才真正开启并发一条确认通知
export default function useNotifyToggle({ notifyEnabled, setNotifyEnabled }) {
  const { t } = useLanguage();
  const [permission, setPermission] = useState(notifyPermission());

  const supported = notifySupported();
  const notifyOn = notifyEnabled && permission === "granted";

  const toggle = async () => {
    if (notifyOn) {
      setNotifyEnabled(false);
      return;
    }
    const result = await requestNotifyPermission();
    setPermission(result);
    if (result === "granted") {
      setNotifyEnabled(true);
      showNotification(t("settings.prefs.notifyEnabledTitle"), {
        body: t("settings.prefs.notifyEnabledBody"),
        tag: "notify-enabled",
      });
    } else {
      setNotifyEnabled(false);
    }
  };

  return { supported, permission, notifyOn, toggle };
}
