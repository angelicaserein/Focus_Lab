import { useEffect, useRef } from "react";
import { wrapVersioned } from "@/utils/storage/storage";

// 把 value 持久化到 localStorage[key]，写入有去抖以减少 I/O 压力。
// 在页面隐藏/关闭时立即 flush，防止 debounce 窗口内关闭标签页丢失数据。
//
// 只负责「写」：初始读取由调用方（useState / useReducer 的初始化）自行完成。
// 统一使用 { version, data } 包装格式（见 storage.js）。
const STORAGE_WRITE_DELAY_MS = 300;

export default function usePersistedWrite(key, value) {
  // 在渲染期间同步更新 ref，确保 flush 处理器始终读到最新值，
  // 即使事件在 React commit 阶段与下次 effect 执行之间触发也不会丢数据。
  const latestRef = useRef(value);
  latestRef.current = value;

  useEffect(() => {
    const write = () => {
      try {
        localStorage.setItem(key, JSON.stringify(wrapVersioned(latestRef.current)));
      } catch (e) {
        console.warn("usePersistedWrite error", e);
      }
    };

    const id = setTimeout(write, STORAGE_WRITE_DELAY_MS);
    const flush = () => { clearTimeout(id); write(); };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearTimeout(id);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [key, value]);
}
