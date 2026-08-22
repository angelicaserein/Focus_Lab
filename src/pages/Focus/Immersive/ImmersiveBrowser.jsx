import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { MemoryRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import "./ImmersiveBrowser.css";
import ROUTES from "@/routes/routeTable";
import NAV_SECTIONS, { PAGE_LABEL_KEYS } from "@/components/layout/navSections";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import PageSkeleton from "@/components/ui/PageSkeleton";
import { useFeatures } from "@/context/FeatureContext";
import { useLanguage } from "@/context/LanguageContext";
import { usePageBrowsingState } from "@/context/PageBrowsingContext";
import { formatClock } from "@/utils/time";

// 专注页自己不进这个浮层：把 FocusPage 套进自己的沉浸层里只会是一团乱麻。
const EXCLUDED = new Set(["/focus"]);

// 与主路由共用同一份路由表，浮层里的页面也是各自的 chunk（点开哪页才下载哪页）。
const browsableRoutes = ROUTES
  .filter((r) => !EXCLUDED.has(r.path))
  .map((r) => ({ ...r, Component: lazy(r.importer) }));

// 浮层左侧的导航：沿用侧栏分区顺序，末尾补上设置页
// （它在侧栏是底部图标区，不在 NAV_SECTIONS 里，但这里正是要给它一格）。
const BROWSE_SECTIONS = [
  ...NAV_SECTIONS,
  { id: "settings", items: [{ to: "/settings", labelKey: "nav.settings" }] },
];

// 把浮层内的路由（MemoryRouter）和外部记账状态接起来：
// 内部跳转（页面里的 Link）→ 上报换页；外部改路径（点左侧导航）→ 驱动内部跳转。
function BrowserBridge({ path, onVisit, onClose }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // 页面里那些「去专注」的入口（比如主页的一键开专注）在这儿的含义就是「回去接着专注」，
    // 本来就没别处可去——直接收起浮层，而不是弹回主页。
    if (EXCLUDED.has(pathname)) onClose();
    else onVisit(pathname);
  }, [pathname, onVisit, onClose]);

  useEffect(() => {
    if (path && path !== pathname) navigate(path);
    // pathname 不进依赖：它变化时该由上面那个 effect 去对齐 path，不是反过来
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, navigate]);

  return null;
}

// 沉浸专注里的「看看别的页面」浮层：整页应用内页面浏览器。
// 打开时计时器已被按停（见 usePageBrowsing），这里只负责渲染与导航。
export default function ImmersiveBrowser() {
  const { t } = useLanguage();
  const { isEnabled } = useFeatures();
  const { browsingPath, browsingStartTs, visitPage, closeBrowser } = usePageBrowsingState();

  // 已离开多久：和「去分心一下」那个计时同一套读数
  const [awaySecs, setAwaySecs] = useState(0);
  useEffect(() => {
    if (!browsingStartTs) return undefined;
    const tick = () => setAwaySecs(Math.floor((Date.now() - browsingStartTs) / 1000));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [browsingStartTs]);

  // Esc 回到专注
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") closeBrowser();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeBrowser]);

  // 功能树关掉的页面在这儿也不该出现，和侧栏保持一致
  const sections = useMemo(
    () =>
      BROWSE_SECTIONS.map((s) => ({
        ...s,
        items: s.items.filter((i) => !EXCLUDED.has(i.to) && isEnabled(i.to)),
      })).filter((s) => s.items.length > 0),
    [isEnabled],
  );

  // MemoryRouter 只在挂载时读 initialEntries，之后由 BrowserBridge 驱动跳转
  const [initialPath] = useState(browsingPath || "/");
  const currentLabelKey = PAGE_LABEL_KEYS[browsingPath];

  return (
    <div className="immersive-browser" role="dialog" aria-modal="true" aria-label={t("focus.imm.browse.title")}>
      <header className="imm-browser-bar">
        <button type="button" className="imm-browser-back" onClick={closeBrowser}>
          ← {t("focus.imm.browse.back")}
        </button>
        <div className="imm-browser-status">
          <span className="imm-browser-paused-dot" />
          {t("focus.imm.browse.paused")}
          <span className="imm-browser-away">{formatClock(awaySecs)}</span>
        </div>
        <div className="imm-browser-here">
          {currentLabelKey ? t(currentLabelKey) : browsingPath}
        </div>
      </header>

      <div className="imm-browser-body">
        <nav className="imm-browser-nav" aria-label={t("focus.imm.browse.title")}>
          {sections.map((section) => (
            <div key={section.id} className="imm-browser-nav-section">
              {section.titleKey && (
                <div className="imm-browser-nav-title">{t(section.titleKey)}</div>
              )}
              {section.items.map(({ to, labelKey, Icon }) => (
                <button
                  key={to}
                  type="button"
                  className={`imm-browser-nav-item${browsingPath === to ? " active" : ""}`}
                  onClick={() => visitPage(to)}
                  aria-current={browsingPath === to ? "page" : undefined}
                >
                  {Icon && <Icon size={15} aria-hidden="true" />}
                  <span>{t(labelKey)}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="imm-browser-content">
          <MemoryRouter initialEntries={[initialPath]}>
            <BrowserBridge path={browsingPath} onVisit={visitPage} onClose={closeBrowser} />
            <ErrorBoundary>
              <Suspense fallback={<PageSkeleton />}>
                <Routes>
                  {browsableRoutes.map(({ path, Component }) => (
                    <Route key={path} path={path} element={<Component />} />
                  ))}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </MemoryRouter>
        </div>
      </div>

      <div className="imm-browser-hint">{t("focus.imm.browse.hint")}</div>
    </div>
  );
}
