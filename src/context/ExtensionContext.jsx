import React from "react";

// ExtensionContext 是一个空壳，作为未来扩展点（如优先级、标签、插件系统等）的宿主。
// 目前返回基础的 provider，后续可在 value 中添加注册接口或状态。
export const ExtensionContext = React.createContext(null);

export function ExtensionProvider({ children }) {
  const extensions = {}; // 未来可放置扩展注册表或 API

  const value = {
    // 未来扩展点: registerExtension, getExtensions, ...
    extensions,
  };

  return (
    <ExtensionContext.Provider value={value}>
      {children}
    </ExtensionContext.Provider>
  );
}

// 方便后续使用的 Hook
export function useExtensions() {
  const ctx = React.useContext(ExtensionContext);
  return ctx;
}
