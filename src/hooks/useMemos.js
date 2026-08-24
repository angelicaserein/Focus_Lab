import { useMemo } from "react";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import useUndoDelete from "@/hooks/common/useUndoDelete";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";

// 备忘录数据层：
//  - 手动备忘存于独立的 MEMOS（可增改删）
//  - 专注随记来自 NOTES（沉浸式专注页写入），在备忘录里合并展示
// 两类条目带 source 标记以便页面做区分。两者都支持在备忘录里编辑 / 删除 / 打标签：
// 改写按 source 路由到对应存储（专注随记写回 NOTES，手动备忘写回 MEMOS）。
// 备忘录页与专注页是不同路由、不会同时挂载，写回同一份数据无并发副作用。
export default function useMemos() {
  const [memos, setMemos] = useLocalStorage(STORAGE_KEYS.MEMOS, []);
  const [focusNotes, setFocusNotes] = useLocalStorage(STORAGE_KEYS.NOTES, []);

  // 按条目来源选择对应存储的 setter（focus → NOTES，其余 → MEMOS）。
  const setterFor = (source) => (source === "focus" ? setFocusNotes : setMemos);

  const addMemo = (text) => {
    const t = text.trim();
    if (!t) return;
    setMemos((prev) => [{ id: crypto.randomUUID(), ts: Date.now(), text: t }, ...prev]);
  };

  const updateMemo = (id, text, source = "memo") => {
    const t = text.trim();
    if (!t) return;
    setterFor(source)((prev) => prev.map((m) => (m.id === id ? { ...m, text: t } : m)));
  };

  // 合并时间线：手动备忘（source="memo"）+ 专注随记（source="focus"），按时间倒序。
  const timeline = useMemo(() => {
    const manual = memos.map((m) => ({ ...m, source: "memo" }));
    const fromFocus = focusNotes.map((n) => ({ ...n, source: "focus" }));
    return [...manual, ...fromFocus].sort((a, b) => b.ts - a.ts);
  }, [memos, focusNotes]);

  // 删除可撤销：同一个「删」在任务库能反悔、在备忘录不能的话，
  // 用户没法凭页面之外的东西预判后果。走通用 hook，与任务 / 情景同一套 toast。
  //
  // 撤销不必记住数组下标：时间线是按 ts 排的，放回哪一格由时间戳决定，
  // 塞回队首即可。source 是合并时间线时贴上的，写回存储前摘掉。
  const undo = useUndoDelete({
    items: timeline,
    remove: (id, item) => {
      setterFor(item.source)((prev) => prev.filter((m) => m.id !== id));
    },
    restore: (item) => {
      const { source, ...stored } = item;
      setterFor(source)((prev) => [stored, ...prev]);
    },
  });

  const removeMemo = (id) => undo.deleteFn(id);

  // 覆写某条备忘的标签数组（增删标签由页面用 memoTags 纯函数算好后写入）。
  const setMemoTags = (id, tags, source = "memo") => {
    setterFor(source)((prev) => prev.map((m) => (m.id === id ? { ...m, tags } : m)));
  };

  const counts = useMemo(
    () => ({ all: timeline.length, memo: memos.length, focus: focusNotes.length }),
    [timeline.length, memos.length, focusNotes.length],
  );

  return {
    timeline,
    counts,
    addMemo,
    updateMemo,
    removeMemo,
    setMemoTags,
    pendingUndo: undo.pendingDelete,
    undoLast: undo.undoDelete,
  };
}
