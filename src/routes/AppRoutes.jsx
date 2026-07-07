import React, { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import PageSkeleton from "@/components/ui/PageSkeleton";
import { useFeatures } from "@/context/FeatureContext";

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
  () => import("@/pages/SkillTree"),
  () => import("@/pages/Industry"),
  () => import("@/pages/Gantt"),
  () => import("@/pages/Wish"),
  () => import("@/pages/World"),
  () => import("@/pages/FunctionTree"),
];

const [
  homeImp, focusImp, historyImp, scenarioImp, rewardImp, settingsImp,
  researchImp, scenarioStatsImp, analyticsImp, tasksImp, ddlImp, memoImp,
  calendarImp, characterImp, skillTreeImp, industryImp, ganttImp, wishImp, worldImp,
  functionTreeImp,
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
const SkillTree = lazy(skillTreeImp);
const Industry = lazy(industryImp);
const Gantt = lazy(ganttImp);
const Wish = lazy(wishImp);
const World = lazy(worldImp);
const FunctionTree = lazy(functionTreeImp);

// 被功能树「关掉」的功能，其路由要真正不可达：直接访问时弹回主页，
// 与侧边栏隐藏该入口保持一致。核心功能（isEnabled 恒真）不受影响。
function FeatureGate({ path, children }) {
  const { isEnabled } = useFeatures();
  return isEnabled(path) ? children : <Navigate to="/" replace />;
}

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
              {/* 核心功能：始终可达 */}
              <Route path="/" element={<Home />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/functiontree" element={<FunctionTree />} />
              {/* 可开关功能：被功能树关掉时弹回主页 */}
              <Route path="/skilltree" element={<FeatureGate path="/skilltree"><SkillTree /></FeatureGate>} />
              <Route path="/focus" element={<FeatureGate path="/focus"><Focus /></FeatureGate>} />
              <Route path="/history" element={<FeatureGate path="/history"><History /></FeatureGate>} />
              <Route path="/scenario" element={<FeatureGate path="/scenario"><Scenario /></FeatureGate>} />
              <Route path="/reward" element={<FeatureGate path="/reward"><Reward /></FeatureGate>} />
              <Route path="/research" element={<FeatureGate path="/research"><Research /></FeatureGate>} />
              <Route path="/scenario-stats" element={<FeatureGate path="/scenario-stats"><ScenarioStats /></FeatureGate>} />
              <Route path="/analytics" element={<FeatureGate path="/analytics"><Analytics /></FeatureGate>} />
              <Route path="/tasks" element={<FeatureGate path="/tasks"><Tasks /></FeatureGate>} />
              <Route path="/ddl" element={<FeatureGate path="/ddl"><DDLReminders /></FeatureGate>} />
              <Route path="/memo" element={<FeatureGate path="/memo"><Memo /></FeatureGate>} />
              <Route path="/calendar" element={<FeatureGate path="/calendar"><Calendar /></FeatureGate>} />
              <Route path="/character" element={<FeatureGate path="/character"><Character /></FeatureGate>} />
              <Route path="/industry" element={<FeatureGate path="/industry"><Industry /></FeatureGate>} />
              <Route path="/gantt" element={<FeatureGate path="/gantt"><Gantt /></FeatureGate>} />
              <Route path="/wish" element={<FeatureGate path="/wish"><Wish /></FeatureGate>} />
              <Route path="/world" element={<FeatureGate path="/world"><World /></FeatureGate>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
    </>
  );
}
