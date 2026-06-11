import { useState, useEffect } from "react";

// 简单封装 localStorage 读写。返回 [state, setState].
// 未来可扩展为支持版本迁移、加密或远程同步。
export default function useLocalStorage(key, initialValue) {
  const read = () => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch (e) {
      console.warn("useLocalStorage read error", e);
      return initialValue;
    }
  };

  const [state, setState] = useState(() => read());

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.warn("useLocalStorage write error", e);
    }
  }, [key, state]);

  return [state, setState];
}
