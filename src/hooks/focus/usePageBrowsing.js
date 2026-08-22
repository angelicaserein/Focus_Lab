import { useCallback, useRef, useState } from "react";

// 一次浏览短于这个秒数就不记账：点两下路过某页，那不是「去看了那一页」，只是路过。
// 全都记下来只会把分心明细刷成一堆 0 秒的噪音。
const MIN_VISIT_SECS = 3;

/**
 * 沉浸专注里「看看别的页面」的状态与记账。
 *
 * 三件事，和桌面版「切去别的软件」是同一个道理（见 useDistractionTracking 的 app 分支）：
 *   1. 打开浮层就把计时器按停——人在翻别的页面的时间不该算进专注；
 *      只恢复我们自己按下的那一次（autoPausedRef），用户手动按的暂停不去动它。
 *   2. 在浮层里每换一页就结一段账：从几点到几点、看的哪一页。
 *   3. 关掉浮层时结掉最后一段，并把计时器放回去。
 *
 * 不弹打标签的弹窗：用户是自己按按钮走的，「看的哪一页」本身比手打的标签更准。
 *
 * host 是个 ref，装着专注页那一侧的四件事（计时器读写 + 落记录），
 * 由 FocusPage 注册进来（见 PageBrowsingContext）。用 ref 而不是参数，
 * 是因为这套状态住在路由之上的 Provider 里，而计时器住在专注页里——
 * 两边挂载顺序相反，只能由下面那层把自己登记上来。
 */
export default function usePageBrowsing(host) {
  // null = 没在浏览；否则是浮层当前所在的路径
  const [browsingPath, setBrowsingPath] = useState(null);
  // 整段浏览（不是当前这一页）的起点，浮层上的「已离开 xx:xx」用它
  const [browsingStartTs, setBrowsingStartTs] = useState(null);

  const autoPausedRef = useRef(false);
  // 当前这一页的起止：{ path, startTs }
  const currentRef = useRef(null);
  // 打开浮层那一刻是哪次会话。结账可能发生在会话结束之后（结束专注会先 clearSession
  // 再回调过来），那时再读 getSession() 只会拿到 null，这些记录就无家可归了。
  const sessionIdRef = useRef(null);

  // 结掉当前这一页，返回它的秒数（不够 MIN_VISIT_SECS 的不记账，但秒数照算）
  const closeVisit = useCallback((endTs) => {
    const cur = currentRef.current;
    currentRef.current = null;
    if (!cur) return 0;
    const durationSecs = Math.max(0, Math.round((endTs - cur.startTs) / 1000));
    if (durationSecs >= MIN_VISIT_SECS) {
      host.current?.onRecordVisit({
        path: cur.path,
        startTs: cur.startTs,
        endTs,
        durationSecs,
        sessionId: sessionIdRef.current,
      });
    }
    return durationSecs;
  }, [host]);

  const openBrowser = useCallback((path = "/") => {
    const h = host.current;
    if (!h || currentRef.current) return;   // 已经开着，别重复按停计时器
    const now = Date.now();
    sessionIdRef.current = h.getSession().sessionId;
    if (h.isRunningNow()) {
      autoPausedRef.current = true;
      h.togglePause();
    }
    currentRef.current = { path, startTs: now };
    setBrowsingPath(path);
    setBrowsingStartTs(now);
  }, [host]);

  // 浮层内换页：上一页结账，新一页开表
  const visitPage = useCallback((path) => {
    const cur = currentRef.current;
    if (!cur || cur.path === path) return;
    const now = Date.now();
    closeVisit(now);
    currentRef.current = { path, startTs: now };
    setBrowsingPath(path);
  }, [closeVisit]);

  // 只结账、不动计时器。给「结束专注」用：会话都没了，没有可恢复的表。
  // 返回本段离开专注的总秒数，与 flushProactiveDistraction 同一口径。
  const flushBrowsing = useCallback(() => {
    if (!currentRef.current) return 0;
    const secs = closeVisit(Date.now());
    autoPausedRef.current = false;
    setBrowsingPath(null);
    setBrowsingStartTs(null);
    return secs;
  }, [closeVisit]);

  // 回到专注：结掉最后一段，把我们按下的那次暂停放回去
  const closeBrowser = useCallback(() => {
    if (!currentRef.current) return;
    closeVisit(Date.now());
    setBrowsingPath(null);
    setBrowsingStartTs(null);
    if (autoPausedRef.current) {
      autoPausedRef.current = false;
      const h = host.current;
      // 会话可能在浏览期间就被结束了（比如从桌宠点了「结束」），
      // 那就没有可恢复的计时器——此时 togglePause 会凭空把它又跑起来。
      if (h && !h.isRunningNow() && h.getSession().sessionId) h.togglePause();
    }
  }, [closeVisit, host]);

  return { browsingPath, browsingStartTs, openBrowser, visitPage, closeBrowser, flushBrowsing };
}
