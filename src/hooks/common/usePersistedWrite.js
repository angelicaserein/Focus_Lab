import { useCallback, useEffect, useRef } from "react";
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
  // key 同样走 ref：卸载时的兜底写入是在所有 effect 之外触发的，
  // 那时候只能从 ref 拿到「最后用的是哪个 key」。
  const keyRef = useRef(key);
  keyRef.current = key;

  const write = useCallback(() => {
    // 导入 / 清空历史这类整库覆写已经把盘上的数据换掉了，正等着 reload 生效。
    // 这时候我们手里这份内存值是「覆写之前」的，写回去就是把新数据盖没
    // ——而且最后那一下发生在 pagehide，用户看到的是「导入成功」然后什么都没变。
    if (writesAreFrozen()) return;
    try {
      localStorage.setItem(keyRef.current, JSON.stringify(wrapVersioned(latestRef.current)));
    } catch (e) {
      // 配额满了要摆到用户脸上：这条写入没成功，界面上那份值只活在内存里，
      // 关掉页面就没了。只往控制台打 warn 等于让用户在不知情的情况下丢数据。
      if (!reportStorageError(e, keyRef.current)) console.warn("usePersistedWrite error", e);
    }
  }, []);

  useEffect(() => {
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
  }, [key, value, write]);

  // 卸载时补一次写入。
  //
  // 上面那个 effect 的清理函数只清定时器 —— 它每次 value 变都要跑一遍，
  // 在那里写盘等于取消去抖。但卸载走的也是同一个清理函数，于是「改完立刻切页」
  // 的最后一次修改就在去抖窗口里被静静丢掉了：祈愿抽到的立绘、生态缸买的鱼、
  // 刚解锁的技能树节点，都是花过金币、丢了就回不来的东西。
  //
  // 单独一个只在卸载时清理的 effect 才分得清这两种情况。React 按定义顺序执行
  // 清理函数，所以这一下必定发生在上面清掉定时器之后，不会重复写。
  useEffect(() => write, [write]);
}
