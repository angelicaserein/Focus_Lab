import { useMemo } from "react";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import { useFocus } from "@/context/FocusContext";
import { fillsOf, shelfStats } from "@/pages/Flasks/flaskShelf";
import { mergeDebugFills, normalizeDebugFills } from "@/pages/Flasks/flaskDebug";

// 每只烧瓶眼下有多少水。烧瓶架页与生态缸页都要用：前者画进度、后者据此判定
// 「封着标本的那只瓶子还在不在」（见 data/specimen 的槽位）。
//
// 必须是同一份，否则两页对「有几只满瓶」的看法会打架：架上封得进去、缸里却认为
// 那个槽位不存在，于是封好的鱼被当成孤儿标本放回缸里游——两边都各自算过一遍水位，
// 只有烧瓶架页记得盖调试覆盖，这个 bug 就是这么来的。
const DEBUG_ENABLED = import.meta.env.DEV;

export default function useFlaskFills() {
  const { focusRecords } = useFocus();
  const stats = useMemo(() => shelfStats(focusRecords), [focusRecords]);
  const realFills = useMemo(() => fillsOf(stats), [stats]);

  // 调试覆盖：只有开发环境读得到，正式构建里 fills 就是现算值本身
  const [rawDebug, setRawDebug] = useLocalStorage(STORAGE_KEYS.FLASK_DEBUG_FILL, null);
  const debugFills = useMemo(
    () => (DEBUG_ENABLED ? normalizeDebugFills(rawDebug) : {}),
    [rawDebug],
  );
  const fills = useMemo(
    () => (DEBUG_ENABLED ? mergeDebugFills(realFills, debugFills) : realFills),
    [realFills, debugFills],
  );

  return { stats, fills, realFills, debugFills, setRawDebug };
}
