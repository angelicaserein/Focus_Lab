import { useEffect, useState } from "react";

// 通用「自动消失」提示。showToast(payload) 显示，duration 毫秒后自动清空。
// payload 由调用方决定形状（如 { message, icon }），本 hook 只负责计时与清理。
export default function useToast(duration = 2000) {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), duration);
    return () => clearTimeout(id);
  }, [toast, duration]);

  return { toast, showToast: setToast };
}
