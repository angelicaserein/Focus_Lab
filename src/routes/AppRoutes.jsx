import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import ErrorBoundary from "../components/ErrorBoundary";

const Home = lazy(() => import("../pages/Home"));
const Focus = lazy(() => import("../pages/Focus"));
const History = lazy(() => import("../pages/History"));
const Scenario = lazy(() => import("../pages/Scenario"));
const Reward = lazy(() => import("../pages/Reward"));
const Settings = lazy(() => import("../pages/Settings"));

export default function AppRoutes() {
  return (
    <>
      <Sidebar />
      <main className="app-main">
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/focus" element={<Focus />} />
              <Route path="/history" element={<History />} />
              <Route path="/scenario" element={<Scenario />} />
              <Route path="/reward" element={<Reward />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
    </>
  );
}
