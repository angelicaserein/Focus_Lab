import React, { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import PageSkeleton from "@/components/ui/PageSkeleton";

// 各页面的动态 import 单独抽出来：既给 lazy() 用，也用于「空闲预取」。
const importers = [
  () => import("@/pages/Home"),
  () => import("@/pages/Focus"),
  () => import("@/pages/History"),
  () => import("@/pages/Scenario"),
  () => import("@/pages/Reward"),
  () => import("@/pages/Settings"),
  () => import("@/pages/Research"),
  () => import("@/pages/ScenarioStats"),
  () => import("@/pages/Analytics"),
  () => import("@/pages/Tasks"),
  () => import("@/pages/DDLReminders"),
  () => import("@/pages/Memo"),
  () => import("@/pages/Calendar"),
  () => import("@/pages/Character"),
];

const [
  homeImp, focusImp, historyImp, scenarioImp, rewardImp, settingsImp,
  researchImp, scenarioStatsImp, analyticsImp, tasksImp, ddlImp, memoImp,
  calendarImp, characterImp,
] = importers;

const Home = lazy(homeImp);
const Focus = lazy(focusImp);
const History = lazy(historyImp);
const Scenario = lazy(scenarioImp);
const Reward = lazy(rewardImp);
const Settings = lazy(settingsImp);
const Research = lazy(researchImp);
const ScenarioStats = lazy(scenarioStatsImp);
const Analytics = lazy(analyticsImp);
const Tasks = lazy(tasksImp);
const DDLReminders = lazy(ddlImp);
const Memo = lazy(memoImp);
const Calendar = lazy(calendarImp);
const Character = lazy(characterImp);

export default function AppRoutes() {
  // 首屏渲染完后，趁浏览器空闲把其余页面的 chunk 预取下来。
  // 这样大多数导航在点击时 chunk 已就绪、Suspense 根本不触发，
  // 也就不会出现骨架屏「闪一下」。预取失败无所谓，静默忽略。
  useEffect(() => {
    const prefetch = () => importers.forEach((imp) => imp().catch(() => {}));
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
              <Route path="/" element={<Home />} />
              <Route path="/focus" element={<Focus />} />
              <Route path="/history" element={<History />} />
              <Route path="/scenario" element={<Scenario />} />
              <Route path="/reward" element={<Reward />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/research" element={<Research />} />
              <Route path="/scenario-stats" element={<ScenarioStats />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/ddl" element={<DDLReminders />} />
              <Route path="/memo" element={<Memo />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/character" element={<Character />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
    </>
  );
}
