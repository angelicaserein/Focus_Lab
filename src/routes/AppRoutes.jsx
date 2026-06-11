import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";

const Home = lazy(() => import("../pages/Home"));
const Focus = lazy(() => import("../pages/Focus"));

export default function AppRoutes() {
  return (
    <>
      <Sidebar />
      <main className="app-main">
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/focus" element={<Focus />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </>
  );
}
