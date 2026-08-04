import { useCallback, useEffect, useState } from "react";
import { unwrapVersioned } from "@/utils/storage/storage";
import usePersistedWrite from "@/hooks/common/usePersistedWrite";

// 封装 localStorage 读写，返回 [state, setState]；setState 与 React.useState 签名相同。
// 写入的去抖与页面关闭 flush 由 usePersistedWrite 负责；这里处理初始读取与实例间同步。
//
// 存储格式统一使用 { version: 1, data: T }，由 storage.js runMigrations() 在
// app 启动时负责将旧格式（裸 JSON）升级为此格式。
//
// 同一个 key 的多个实例共享一份值：只读一次 localStorage 的话，常驻组件
// （DesktopHost）会一直捏着挂载那一刻的旧值，设置页改完它不知道，
// 依赖它的 effect 也就不会重跑——分心白名单勾了不生效就是这么来的。
// 页面级组件感觉不到这个 bug，是因为切路由会重挂载、顺带重读了一次。
//
// 只管本窗口内：桌宠是另一个 BrowserWindow，跨窗口同步走 IPC，不在这里凑热闹。
const subscribers = new Map(); // key → Set<setState>
const shared = new Map(); // key → 最新值，函数式 setState 以它为准

function readInitial(key, initialValue) {
  if (shared.has(key)) return shared.get(key);
  try {
    const raw = localStorage.getItem(key);
    return raw ? unwrapVersioned(JSON.parse(raw)) : initialValue;
  } catch {
    return initialValue;
  }
}

export default function useLocalStorage(key, initialValue) {
  const [state, setState] = useState(() => readInitial(key, initialValue));

  useEffect(() => {
    let set = subscribers.get(key);
    if (!set) { set = new Set(); subscribers.set(key, set); }
    set.add(setState);
    // 后挂载的实例可能带来更新的值（比如换了 key），以它为准
    shared.set(key, state);
    return () => {
      set.delete(setState);
      // 没人用了就清干净：留着的话，下次挂载会读到一份可能已经过期的缓存
      if (set.size === 0) { subscribers.delete(key); shared.delete(key); }
    };
    // state 只用于初始登记，不该每次变都重订阅
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // 同步更新 shared，这样同一个 tick 里连着调用的函数式 setState 也能接上上一次的结果
  const setShared = useCallback((next) => {
    const value = typeof next === "function" ? next(shared.get(key)) : next;
    shared.set(key, value);
    const set = subscribers.get(key);
    if (set) for (const fn of set) fn(value);
    else setState(value); // 还没跑过 effect（首屏同步调用），至少把自己更新了
  }, [key]);

  usePersistedWrite(key, state);

  return [state, setShared];
}
