import { useMemo } from "react";
import useLocalStorage from "./useLocalStorage";
import { STORAGE_KEYS } from "../utils/storageKeys";

// 备忘录数据层：
//  - 手动备忘存于独立的 MEMOS（可增改删）
//  - 专注随记来自 NOTES（沉浸式专注页写入），在此只读合并展示
// 两类条目带 source 标记以便页面做区分。专注随记归属于会话，这里不允许编辑/删除。
export default function useMemos() {
  const [memos, setMemos] = useLocalStorage(STORAGE_KEYS.MEMOS, []);
  // 仅读取专注随记用于合并展示；NOTES 的写入由专注页负责。
  // 备忘录页与专注页是不同路由，不会同时挂载，重复写回同一份数据无副作用。
  const [focusNotes] = useLocalStorage(STORAGE_KEYS.NOTES, []);

  const addMemo = (text) => {
    const t = text.trim();
    if (!t) return;
    setMemos((prev) => [{ id: crypto.randomUUID(), ts: Date.now(), text: t }, ...prev]);
  };

  const updateMemo = (id, text) => {
    const t = text.trim();
    if (!t) return;
    setMemos((prev) => prev.map((m) => (m.id === id ? { ...m, text: t } : m)));
  };

  const removeMemo = (id) => {
    setMemos((prev) => prev.filter((m) => m.id !== id));
  };

  // 合并时间线：手动备忘（source="memo"）+ 专注随记（source="focus"），按时间倒序。
  const timeline = useMemo(() => {
    const manual = memos.map((m) => ({ ...m, source: "memo" }));
    const fromFocus = focusNotes.map((n) => ({ ...n, source: "focus" }));
    return [...manual, ...fromFocus].sort((a, b) => b.ts - a.ts);
  }, [memos, focusNotes]);

  const counts = useMemo(
    () => ({ all: timeline.length, memo: memos.length, focus: focusNotes.length }),
    [timeline.length, memos.length, focusNotes.length],
  );

  return { timeline, counts, addMemo, updateMemo, removeMemo };
}
