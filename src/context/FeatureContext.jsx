import React, { useContext, useCallback, useMemo } from "react";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import { isCorePath } from "@/pages/FunctionTree/functionTreeData";

// 功能开关的单一数据源：哪些功能被用户「关掉」了。
// 放进 Context 而非各组件各自 useLocalStorage——因为 Sidebar、功能树页、路由守卫
// 必须共享同一份状态并实时联动（useLocalStorage 是每组件独立的 useState，不跨组件同步）。
// 默认全部开启（disabled = []）；关掉＝把路径加入列表，打开＝移除，随时可逆。核心功能永不入内。
const FeatureContext = React.createContext(null);

export function FeatureProvider({ children }) {
  const [disabled, setDisabled] = useLocalStorage(STORAGE_KEYS.DISABLED_FEATURES, []);
  const disabledSet = useMemo(() => new Set(disabled), [disabled]);

  const isEnabled = useCallback(
    (path) => isCorePath(path) || !disabledSet.has(path),
    [disabledSet],
  );

  const toggle = useCallback(
    (path) => {
      if (isCorePath(path)) return; // 核心功能不可关
      setDisabled((prev) =>
        prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path],
      );
    },
    [setDisabled],
  );

  const enableAll = useCallback(() => setDisabled([]), [setDisabled]);

  const value = useMemo(
    () => ({ disabled, disabledSet, isEnabled, toggle, enableAll }),
    [disabled, disabledSet, isEnabled, toggle, enableAll],
  );

  return <FeatureContext.Provider value={value}>{children}</FeatureContext.Provider>;
}

export function useFeatures() {
  const ctx = useContext(FeatureContext);
  if (!ctx) throw new Error("useFeatures must be used within FeatureProvider");
  return ctx;
}
