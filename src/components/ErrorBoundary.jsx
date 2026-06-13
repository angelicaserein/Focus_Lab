import { Component } from "react";

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
      return (
        this.props.fallback ?? (
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
            <span>出错了，请刷新页面</span>
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
              刷新
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
