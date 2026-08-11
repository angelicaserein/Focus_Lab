import React, { Component } from "react";
import { useLanguage } from "@/context/LanguageContext";

// 默认兜底界面拆成函数组件，好让文案走 i18n（类组件用不了 hook）。
function DefaultFallback() {
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
      <span>{t("common.error")}</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          padding: "6px 16px",
          borderRadius: "8px",
          border: "1px solid var(--border, #ccc)",
          background: "transparent",
          cursor: "pointer",
          color: "inherit",
        }}
      >
        {t("common.refresh")}
      </button>
    </div>
  );
}

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
