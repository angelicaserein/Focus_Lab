import { useCallback, useState } from "react";

/**
 * 沉浸专注里「看看别的页面」的状态。
 *
 * 只管浮层开在哪一页。**翻应用内的页面不算离开专注**：计时器照跑，也不落分心记录。
 * 理由是这些页面本来就是本次专注的一部分（去任务库改任务、去备忘录记一笔），
 * 把它们记成「分心」只会让分心明细全是自家页面的噪音，还平白把计时按停。
 * 真正离开（去别的软件 / 自己按「去分心一下」）另有两条路，见 useDistractionTracking。
 *
 * 状态住在路由之上的 Provider 里（见 PageBrowsingContext），因为浮层要自带
 * MemoryRouter，只能挂在 HashRouter 外面。
 */
export default function usePageBrowsing() {
  // null = 没在浏览；否则是浮层当前所在的路径
  const [browsingPath, setBrowsingPath] = useState(null);

  const openBrowser = useCallback((path = "/") => setBrowsingPath(path), []);
  const visitPage = useCallback((path) => setBrowsingPath(path), []);
  const closeBrowser = useCallback(() => setBrowsingPath(null), []);

  return { browsingPath, openBrowser, visitPage, closeBrowser };
}
