import React, { useContext, useCallback, useMemo } from "react";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import { isCorePath, parentKeyOf } from "@/pages/FunctionTree/functionTreeData";
import { isDeprecatedPath, deprecatedParentOf } from "@/pages/Deprecated/deprecatedData";

// 功能开关的单一数据源：哪些功能对用户可见可达。
// 放进 Context 而非各组件各自 useLocalStorage——因为 Sidebar、功能树页、废弃页面、路由守卫
// 必须共享同一份状态并实时联动（useLocalStorage 是每组件独立的 useState，不跨组件同步）。
//
// 两份名单，方向相反：
//   disabled（功能树）——默认全开，被关掉的才入列；
//   enabledDeprecated（废弃页面）——默认全关，被捡回来的才入列。
// 两者都随时可逆、都不删数据。核心功能（主页/设置/功能树/废弃页面）永不入内。
const FeatureContext = React.createContext(null);

export function FeatureProvider({ children }) {
  const [disabled, setDisabled] = useLocalStorage(STORAGE_KEYS.DISABLED_FEATURES, []);
  const [enabledDeprecated, setEnabledDeprecated] = useLocalStorage(
    STORAGE_KEYS.ENABLED_DEPRECATED,
    [],
  );
  const disabledSet = useMemo(() => new Set(disabled), [disabled]);
  const deprecatedSet = useMemo(() => new Set(enabledDeprecated), [enabledDeprecated]);

  // key 可以是路由（/focus）、非路由功能件（scenario:picker）或组（group:scenario）。
  // 组一关，组内子项跟着关——但子项自己的记忆不动，重开组即恢复原样。
  const isEnabled = useCallback(
    (key) => {
      if (isCorePath(key)) return true;
      // 废弃名单里的组（如情境功能）只有一个开关，组内子项没有自己的记忆，一律跟着组走。
      if (isDeprecatedPath(key)) return deprecatedSet.has(deprecatedParentOf(key) ?? key);
      const parent = parentKeyOf(key);
      if (parent && disabledSet.has(parent)) return false;
      return !disabledSet.has(key);
    },
    [disabledSet, deprecatedSet],
  );

  // 节点自身的开关记忆，无视父组。功能树里子节点要照原样显示自己的开 / 关，
  // 否则关掉组会让子项看起来「被抹平」，重开时用户无从预期恢复成什么样。
  const isSelfEnabled = useCallback(
    (key) =>
      isDeprecatedPath(key)
        ? deprecatedSet.has(deprecatedParentOf(key) ?? key)
        : !disabledSet.has(key),
    [disabledSet, deprecatedSet],
  );

  const toggle = useCallback(
    (path) => {
      if (isCorePath(path)) return; // 核心功能不可关
      const deprecated = isDeprecatedPath(path);
      // 点组内子项等于点它的组——废弃页面只列组本身，这里兜住误传子 key 的调用。
      const target = deprecated ? (deprecatedParentOf(path) ?? path) : path;
      const setList = deprecated ? setEnabledDeprecated : setDisabled;
      setList((prev) =>
        prev.includes(target) ? prev.filter((p) => p !== target) : [...prev, target],
      );
    },
    [setDisabled, setEnabledDeprecated],
  );

  // 功能树的「全部打开」：只清空自己那份名单，不去替用户捡回废弃页面。
  const enableAll = useCallback(() => setDisabled([]), [setDisabled]);
  // 废弃页面的「全部收起」：把捡回来的旧功能一次性放回废弃状态。
  const disableAllDeprecated = useCallback(
    () => setEnabledDeprecated([]),
    [setEnabledDeprecated],
  );

  const value = useMemo(
    () => ({
      disabled,
      disabledSet,
      enabledDeprecated,
      isEnabled,
      isSelfEnabled,
      toggle,
      enableAll,
      disableAllDeprecated,
    }),
    [
      disabled,
      disabledSet,
      enabledDeprecated,
      isEnabled,
      isSelfEnabled,
      toggle,
      enableAll,
      disableAllDeprecated,
    ],
  );

  return <FeatureContext.Provider value={value}>{children}</FeatureContext.Provider>;
}

export function useFeatures() {
  const ctx = useContext(FeatureContext);
  if (!ctx) throw new Error("useFeatures must be used within FeatureProvider");
  return ctx;
}
