import { useCallback, useMemo } from "react";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import { normalizeCollection } from "@/data/aquarium/growth";
import { sealFish, unsealFish } from "@/data/specimen";

// 生态缸住客的读写。生态缸页用全套（买/喂/落档），烧瓶架页只用到封存那两下——
// 两页共用同一份 localStorage，缸里封走一只，架上那只瓶子里立刻就有了。
export default function useResidents() {
  const [raw, setRaw] = useLocalStorage(STORAGE_KEYS.AQUARIUM_COLLECTION, []);
  const entries = useMemo(() => normalizeCollection(raw), [raw]);

  // 封存/取出都走 data/specimen 里的纯函数：不合规矩时原样返回，故这里不必再校验一遍
  const seal = useCallback(
    (uid, flaskId) => setRaw((prev) => sealFish(prev, uid, flaskId)),
    [setRaw],
  );
  const unseal = useCallback((uid) => setRaw((prev) => unsealFish(prev, uid)), [setRaw]);

  return { entries, setCollection: setRaw, seal, unseal };
}
