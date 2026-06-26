import React, { useContext } from "react";

// 专注会话上下文：仅在 Focus 页面树内使用，非全局。
// 将 FocusPage 中所有与沉浸模式相关的状态和操作下沉到此 context，
// 避免通过 ImmersiveView 传递 22 个 props。
export const FocusSessionContext = React.createContext(null);

export function useFocusSession() {
  const ctx = useContext(FocusSessionContext);
  if (!ctx) throw new Error("useFocusSession must be used within FocusSessionContext.Provider");
  return ctx;
}
