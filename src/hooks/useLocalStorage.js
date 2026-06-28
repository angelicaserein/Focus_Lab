import { useState } from "react";
import { unwrapVersioned } from "../utils/storage";
import usePersistedWrite from "./usePersistedWrite";

// 封装 localStorage 读写，返回 [state, setState]；setState 与 React.useState 签名相同。
// 写入的去抖与页面关闭 flush 由 usePersistedWrite 负责；这里只处理初始读取。
//
// 存储格式统一使用 { version: 1, data: T }，由 storage.js runMigrations() 在
// app 启动时负责将旧格式（裸 JSON）升级为此格式。
export default function useLocalStorage(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? unwrapVersioned(JSON.parse(raw)) : initialValue;
    } catch {
      return initialValue;
    }
  });

  usePersistedWrite(key, state);

  return [state, setState];
}
