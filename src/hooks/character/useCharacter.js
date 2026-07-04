import { useMemo } from "react";
import { useFocus } from "@/context/FocusContext";
import { useScenarios } from "@/context/ScenarioContext";
import { useReward } from "@/context/RewardContext";
import { useTodos } from "@/context/TodoContext";
import { computeCharacter } from "@/utils/character/characterUtils";

// 角色卡数据源：把专注记录 / 场景 / 金币 / 任务四处已有状态推导成 RPG 角色数值。
// 不引入新的 Provider —— 页面渲染时各 context 均已就绪，直接消费即可。
export default function useCharacter() {
  const { focusRecords } = useFocus();
  const { scenarios } = useScenarios();
  const { coins } = useReward();
  const { todos } = useTodos();

  return useMemo(
    () => computeCharacter({ records: focusRecords, scenarios, coins, todos }),
    [focusRecords, scenarios, coins, todos],
  );
}
