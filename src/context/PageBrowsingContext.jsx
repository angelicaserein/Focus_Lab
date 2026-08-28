import React, { createContext, useContext, useMemo } from "react";
import usePageBrowsing from "@/hooks/focus/usePageBrowsing";

const PageBrowsingContext = createContext(null);

/**
 * 沉浸专注的「看看别的页面」浮层，其状态住在这里——路由之上。
 *
 * 为什么不住在专注页里：浮层内要把应用里的其它页面渲染出来，那需要一个自己的
 * MemoryRouter，而 react-router 不允许 Router 套 Router。所以浮层必须挂在
 * HashRouter 外面，状态也就只能提到它上面这层来。
 *
 * 浮层不碰计时器也不落记录（翻应用内页面不算分心，见 usePageBrowsing），
 * 所以这里除了「开在哪一页」没有别的东西要和专注页打通。
 */
export function PageBrowsingProvider({ children }) {
  const { browsingPath, openBrowser, visitPage, closeBrowser } = usePageBrowsing();
  const value = useMemo(
    () => ({ browsingPath, openBrowser, visitPage, closeBrowser }),
    [browsingPath, openBrowser, visitPage, closeBrowser],
  );

  return <PageBrowsingContext.Provider value={value}>{children}</PageBrowsingContext.Provider>;
}

export function usePageBrowsingState() {
  return useContext(PageBrowsingContext);
}
