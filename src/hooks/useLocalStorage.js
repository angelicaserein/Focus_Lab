import { useState, useEffect, useRef } from "react";

// 封装 localStorage 读写，写入有去抖以减少 I/O 压力。
// 在页面隐藏/关闭时立即 flush，防止 debounce 窗口内关闭标签页丢失数据。
// 返回 [state, setState]；setState 与 React.useState 签名相同。
//
// 存储格式统一使用 { version: 1, data: T }，由 storage.js runMigrations() 在
// app 启动时负责将旧格式（裸 JSON）升级为此格式。
const STORAGE_WRITE_DELAY_MS = 300;
const WRAPPER_VERSION = 1;

// 检测并解包 { version: N, data: T } 格式；否则原样返回（兼容迁移前的裸数据）。
function unwrapValue(parsed) {
  if (
    parsed !== null &&
    typeof parsed === "object" &&
    typeof parsed.version === "number" &&
    "data" in parsed
  ) {
    return parsed.data;
  }
  return parsed;
}

export default function useLocalStorage(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? unwrapValue(JSON.parse(raw)) : initialValue;
    } catch {
      return initialValue;
    }
  });

  // 在渲染期间同步更新 ref，确保 flush 处理器始终读到最新值，
  // 即使事件在 React commit 阶段与下次 effect 执行之间触发也不会丢数据。
  const latestRef = useRef(state);
  latestRef.current = state;

  useEffect(() => {
    const serialize = () =>
      JSON.stringify({ version: WRAPPER_VERSION, data: latestRef.current });

    const id = setTimeout(() => {
      try {
        localStorage.setItem(key, serialize());
      } catch (e) {
        console.warn("useLocalStorage write error", e);
      }
    }, STORAGE_WRITE_DELAY_MS);

    const flush = () => {
      clearTimeout(id);
      try {
        localStorage.setItem(key, serialize());
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
