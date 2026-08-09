import { useCallback, useMemo } from "react";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import { makeShelfFlask, normalizeShelf, MAX_SHELF } from "@/pages/Flasks/flaskShelf";

// 烧瓶架的读写。专注页只用得上 activeId（结算时写进记录），
// 烧瓶架页用全套；两处共用同一份 localStorage，改完即时同步。
export default function useFlaskShelf() {
  const [raw, setRaw] = useLocalStorage(STORAGE_KEYS.FLASK_SHELF, null);
  const shelf = useMemo(() => normalizeShelf(raw), [raw]);

  // 存一只新烧瓶。架子空着时顺手把它设为当前专注的那只——
  // 存下第一只后不必再点一次「选它」。
  const saveFlask = useCallback(
    ({ name, preset, params }) => {
      const flask = makeShelfFlask({ name, preset, params });
      setRaw((prev) => {
        const cur = normalizeShelf(prev);
        if (cur.items.length >= MAX_SHELF) return cur;
        return {
          items: [...cur.items, flask],
          activeId: cur.activeId ?? flask.id,
        };
      });
      return flask;
    },
    [setRaw],
  );

  const removeFlask = useCallback(
    (id) =>
      setRaw((prev) => {
        const cur = normalizeShelf(prev);
        const items = cur.items.filter((it) => it.id !== id);
        return { items, activeId: cur.activeId === id ? items[0]?.id ?? null : cur.activeId };
      }),
    [setRaw],
  );

  const renameFlask = useCallback(
    (id, name) =>
      setRaw((prev) => {
        const cur = normalizeShelf(prev);
        return {
          ...cur,
          items: cur.items.map((it) => (it.id === id ? { ...it, name } : it)),
        };
      }),
    [setRaw],
  );

  const setActiveFlask = useCallback(
    (id) => setRaw((prev) => ({ ...normalizeShelf(prev), activeId: id })),
    [setRaw],
  );

  // 选中那只的形状：专注页 / 桌宠画的就是它，架子空着时为 null（退回设置页调的形状）
  const activeParams = useMemo(
    () => shelf.items.find((it) => it.id === shelf.activeId)?.params ?? null,
    [shelf],
  );

  return {
    items: shelf.items,
    activeId: shelf.activeId,
    activeParams,
    isFull: shelf.items.length >= MAX_SHELF,
    saveFlask,
    removeFlask,
    renameFlask,
    setActiveFlask,
  };
}
