import { useEffect, useRef } from "react";
import { wrapVersioned, writesAreFrozen } from "@/utils/storage/storage";
import { reportStorageError } from "@/utils/storage/quotaAlert";

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
      // 导入 / 清空历史这类整库覆写已经把盘上的数据换掉了，正等着 reload 生效。
      // 这时候我们手里这份内存值是「覆写之前」的，写回去就是把新数据盖没
      // ——而且最后那一下发生在 pagehide，用户看到的是「导入成功」然后什么都没变。
      if (writesAreFrozen()) return;
      try {
        localStorage.setItem(key, JSON.stringify(wrapVersioned(latestRef.current)));
      } catch (e) {
        // 配额满了要摆到用户脸上：这条写入没成功，界面上那份值只活在内存里，
        // 关掉页面就没了。只往控制台打 warn 等于让用户在不知情的情况下丢数据。
        if (!reportStorageError(e, key)) console.warn("usePersistedWrite error", e);
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
