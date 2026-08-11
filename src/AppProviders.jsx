import React from "react";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { RewardProvider } from "@/context/RewardContext";
import { FocusProvider } from "@/context/FocusContext";
import { ActivityProvider } from "@/context/ActivityContext";
import { DatabaseProvider } from "@/context/DatabaseContext";
import { TodoProvider } from "@/context/TodoContext";
import { ScenarioProvider } from "@/context/ScenarioContext";
import { DDLProvider } from "@/context/DDLContext";
import { FeatureProvider } from "@/context/FeatureContext";

/**
 * 全局 Context 装配。数组顺序即嵌套层级：越靠前越外层。
 * 调整依赖关系时改这里的顺序即可，无需再手动缩进 JSX。
 *
 * 层级约定：
 * - ThemeProvider 靠外：主题写入 <html data-theme>，RewardProvider 内部可调用 useTheme().setTheme。
 * - RewardProvider 次之：金币/资产与具体业务解耦，任意页面均可消费。
 * - FocusProvider 再次：只持有专注选择 id 集合与记录，TodoProvider 可作为子级反向联动。
 * - ActivityProvider 在 TodoProvider 外层：任务的增/删/完成由 TodoContext 写入使用记录。
 * - FeatureProvider 靠外：它只依赖 localStorage，而 ScenarioProvider 需要读功能开关
 *   （情境功能被整组关掉时清空当前情景，避免留下看不见却仍在记账的隐形状态）。
 */
const providers = [
  LanguageProvider,
  FeatureProvider,
  ThemeProvider,
  RewardProvider,
  FocusProvider,
  ActivityProvider,
  DatabaseProvider,
  TodoProvider,
  ScenarioProvider,
  DDLProvider,
];

export default function AppProviders({ children }) {
  return providers.reduceRight(
    (acc, Provider) => <Provider>{acc}</Provider>,
    children,
  );
}
