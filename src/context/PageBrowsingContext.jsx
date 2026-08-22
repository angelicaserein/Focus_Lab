import React, { createContext, useContext, useEffect, useMemo, useRef } from "react";
import usePageBrowsing from "@/hooks/focus/usePageBrowsing";

const PageBrowsingContext = createContext(null);

/**
 * 沉浸专注的「看看别的页面」浮层，其状态住在这里——路由之上。
 *
 * 为什么不住在专注页里：浮层内要把应用里的其它页面渲染出来，那需要一个自己的
 * MemoryRouter，而 react-router 不允许 Router 套 Router。所以浮层必须挂在
 * HashRouter 外面，状态也就只能提到它上面这层来。
 *
 * 计时器那一侧（暂停/恢复/当前会话）仍住在专注页里，由它调 registerHost 登记进来。
 */
export function PageBrowsingProvider({ children }) {
  const hostRef = useRef(null);
  const browsing = usePageBrowsing(hostRef);

  const { browsingPath, browsingStartTs, openBrowser, visitPage, closeBrowser, flushBrowsing } = browsing;
  const value = useMemo(
    () => ({ browsingPath, browsingStartTs, openBrowser, visitPage, closeBrowser, flushBrowsing, hostRef }),
    [browsingPath, browsingStartTs, openBrowser, visitPage, closeBrowser, flushBrowsing],
  );

  return <PageBrowsingContext.Provider value={value}>{children}</PageBrowsingContext.Provider>;
}

export function usePageBrowsingState() {
  return useContext(PageBrowsingContext);
}

// 专注页用它把「怎么暂停计时器 / 当前是哪次会话 / 记录往哪写」登记上来。
// 专注页卸载时自动摘掉，并把还开着的那段账结掉。
export function useRegisterBrowsingHost(host) {
  const { hostRef, flushBrowsing } = usePageBrowsingState();

  useEffect(() => {
    hostRef.current = host;
  });

  useEffect(() => () => {
    flushBrowsing();
    hostRef.current = null;
  }, [hostRef, flushBrowsing]);
}
