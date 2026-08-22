import React, { Suspense, lazy } from "react";
import { usePageBrowsingState } from "@/context/PageBrowsingContext";

// 浮层里要挂一个自己的 MemoryRouter，只能待在 HashRouter 外面（Router 不能套 Router），
// 于是这个挂载点住在 App 顶层而不是沉浸层里。平时什么都不渲染，也不下载它的 chunk。
const ImmersiveBrowser = lazy(() => import("@/pages/Focus/Immersive/ImmersiveBrowser"));

export default function ImmersiveBrowserHost() {
  const { browsingPath } = usePageBrowsingState();
  if (!browsingPath) return null;
  return (
    <Suspense fallback={null}>
      <ImmersiveBrowser />
    </Suspense>
  );
}
