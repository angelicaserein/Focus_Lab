import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import ErrorBoundary from "../components/ErrorBoundary";

const Home = lazy(() => import("../pages/Home"));
const Focus = lazy(() => import("../pages/Focus"));
const History = lazy(() => import("../pages/History"));

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
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
    </>
  );
}
