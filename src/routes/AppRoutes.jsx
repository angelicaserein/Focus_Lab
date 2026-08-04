import React, { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import PageSkeleton from "@/components/ui/PageSkeleton";
import { useFeatures } from "@/context/FeatureContext";

// 路由表：每项描述一个页面。core 为真的是核心功能，始终可达；
// 其余为可开关功能，被功能树关掉时直接访问会弹回主页。
// importer 既喂给 lazy() 拆分 chunk，也用于「空闲预取」。
const ROUTES = [
  { path: "/",               importer: () => import("@/pages/Home"),         core: true },
  { path: "/settings",       importer: () => import("@/pages/Settings"),     core: true },
  { path: "/functiontree",   importer: () => import("@/pages/FunctionTree"), core: true },
  { path: "/tutorial",       importer: () => import("@/pages/Tutorial") },
  { path: "/skilltree",      importer: () => import("@/pages/SkillTree") },
  { path: "/focus",          importer: () => import("@/pages/Focus") },
  { path: "/history",        importer: () => import("@/pages/History") },
  { path: "/scenario",       importer: () => import("@/pages/Scenario") },
  { path: "/reward",         importer: () => import("@/pages/Reward") },
  { path: "/research",       importer: () => import("@/pages/Research") },
  { path: "/scenario-stats", importer: () => import("@/pages/ScenarioStats") },
  { path: "/analytics",      importer: () => import("@/pages/Analytics") },
  { path: "/distraction",    importer: () => import("@/pages/Distraction") },
  { path: "/tasks",          importer: () => import("@/pages/Tasks") },
  { path: "/ddl",            importer: () => import("@/pages/DDLReminders") },
  { path: "/memo",           importer: () => import("@/pages/Memo") },
  { path: "/calendar",       importer: () => import("@/pages/Calendar") },
  { path: "/character",      importer: () => import("@/pages/Character") },
  { path: "/industry",       importer: () => import("@/pages/Industry") },
  { path: "/gantt",          importer: () => import("@/pages/Gantt") },
  { path: "/wish",           importer: () => import("@/pages/Wish") },
  { path: "/aquarium",       importer: () => import("@/pages/Aquarium") },
  { path: "/world",          importer: () => import("@/pages/World") },
];

// 每个路由项预先绑定好 lazy 组件，避免渲染期反复创建。
const routes = ROUTES.map((r) => ({ ...r, Component: lazy(r.importer) }));

// 被功能树「关掉」的功能，其路由要真正不可达：直接访问时弹回主页，
// 与侧边栏隐藏该入口保持一致。核心功能（core=true）不受此限制。
function FeatureGate({ path, children }) {
  const { isEnabled } = useFeatures();
  return isEnabled(path) ? children : <Navigate to="/" replace />;
}

export default function AppRoutes() {
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
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
    </>
  );
}
