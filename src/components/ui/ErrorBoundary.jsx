import React, { Component } from "react";
import { useInRouterContext, useLocation } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";
import { PAGE_LABEL_KEYS } from "@/components/layout/navSections";

// 默认兜底界面拆成函数组件，好让文案走 i18n（类组件用不了 hook）。
//
// 三件事按用户此刻的关心顺序说：崩的是哪一页 → 数据没丢 → 怎么走出去。
// 只说一句「出错了，请刷新」的话，最要紧的那条（东西还在不在）没人回答。
function DefaultFallback() {
  // 路由外也可能用到这个兜底（useLocation 在 Router 外会抛）。分成两个组件，
  // 而不是在同一个组件里按条件调 hook。
  return useInRouterContext() ? <RoutedFallback /> : <FallbackBody pageLabelKey={null} />;
}

function RoutedFallback() {
  const { pathname } = useLocation();
  return <FallbackBody pageLabelKey={PAGE_LABEL_KEYS[pathname] ?? null} />;
}

function FallbackBody({ pageLabelKey }) {
  const { t } = useLanguage();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: "12px",
        color: "var(--text-secondary, #888)",
        fontSize: "14px",
      }}
    >
      <span style={{ fontSize: "32px" }}>⚠️</span>
      <span>
        {pageLabelKey
          ? t("common.errorOn", { page: t(pageLabelKey) })
          : t("common.error")}
      </span>
      <span style={{ maxWidth: "26em", textAlign: "center", opacity: 0.85 }}>
        {t("common.errorDataSafe")}
      </span>
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={btnStyle}
        >
          {t("common.refresh")}
        </button>
        <button
          type="button"
          onClick={() => {
            // hash 路由：直接改 hash 再整页重载，绕开已经崩掉的那棵组件树
            window.location.hash = "#/";
            window.location.reload();
          }}
          style={btnStyle}
        >
          {t("common.goHome")}
        </button>
      </div>
    </div>
  );
}

const btnStyle = {
  padding: "6px 16px",
  borderRadius: "8px",
  border: "1px solid var(--border, #ccc)",
  background: "transparent",
  cursor: "pointer",
  color: "inherit",
};

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <DefaultFallback />;
    }
    return this.props.children;
  }
}
