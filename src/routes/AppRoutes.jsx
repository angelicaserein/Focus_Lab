import React, { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import PageSkeleton from "@/components/ui/PageSkeleton";
import { useFeatures } from "@/context/FeatureContext";
import useComposeFocus from "@/hooks/common/useComposeFocus";
import ROUTES from "@/routes/routeTable";

// 每个路由项预先绑定好 lazy 组件，避免渲染期反复创建。
const routes = ROUTES.map((r) => ({ ...r, Component: lazy(r.importer) }));

// 被功能树「关掉」的功能，其路由要真正不可达：直接访问时弹回主页，
// 与侧边栏隐藏该入口保持一致。核心功能（core=true）不受此限制。
function FeatureGate({ path, children }) {
  const { isEnabled } = useFeatures();
  return isEnabled(path) ? children : <Navigate to="/" replace />;
}

export default function AppRoutes() {
  // 命令面板的「新建任务 / 记一条随记」跳过来之后，把光标送进目标页的输入框。
  // 挂在这里而不是各页各挂一次：它只认 data-compose-target，与具体是哪一页无关。
  useComposeFocus();

  // 首屏渲染完后，趁浏览器空闲把其余页面的 chunk 预取下来。
  // 这样大多数导航在点击时 chunk 已就绪、Suspense 根本不触发，
  // 也就不会出现骨架屏「闪一下」。预取失败无所谓，静默忽略。
  useEffect(() => {
    const prefetch = () => routes.forEach((r) => r.importer().catch(() => {}));
    const ric = window.requestIdleCallback;
    if (ric) {
      const id = ric(prefetch, { timeout: 3000 });
      return () => window.cancelIdleCallback?.(id);
    }
    const t = setTimeout(prefetch, 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <Sidebar />
      <main className="app-main">
        <ErrorBoundary>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              {routes.map(({ path, core, Component }) => (
                <Route
                  key={path}
                  path={path}
                  element={
                    core ? (
                      <Component />
                    ) : (
                      <FeatureGate path={path}>
                        <Component />
                      </FeatureGate>
                    )
                  }
                />
              ))}
              {/* 心流任务已并入任务库（成为其中一个视图），老链接直接接过去 */}
              <Route path="/flow-tasks" element={<Navigate to="/tasks" replace />} />
              {/* 历史记录已并入时间轴（成为其中一个视图），老链接直接接过去 */}
              <Route path="/history" element={<Navigate to="/calendar" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
    </>
  );
}
