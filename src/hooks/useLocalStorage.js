import { useState, useEffect, useRef } from "react";

// 封装 localStorage 读写，写入有去抖以减少 I/O 压力。
// 在页面隐藏/关闭时立即 flush，防止 debounce 窗口内关闭标签页丢失数据。
// 返回 [state, setState]；setState 与 React.useState 签名相同。
const STORAGE_WRITE_DELAY_MS = 300;

export default function useLocalStorage(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  // 在渲染期间同步更新 ref，确保 flush 处理器始终读到最新值，
  // 即使事件在 React commit 阶段与下次 effect 执行之间触发也不会丢数据。
  const latestRef = useRef(state);
  latestRef.current = state;

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(latestRef.current));
      } catch (e) {
        console.warn("useLocalStorage write error", e);
      }
    }, STORAGE_WRITE_DELAY_MS);

    const flush = () => {
      clearTimeout(id);
      try {
        localStorage.setItem(key, JSON.stringify(latestRef.current));
      } catch {}
    };
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
  }, [key, state]);

  return [state, setState];
}
