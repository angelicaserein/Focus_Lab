import useSessionStart from "@/hooks/session/useSessionStart";
import useTaskSettlement from "@/hooks/task/useTaskSettlement";
import useSessionStop from "@/hooks/session/useSessionStop";

// 组合层：将会话生命周期的三个阶段聚合为统一对外 API。
// 各子 hook 各司其职（Start=启动/Stop=结算发币/Settlement=单任务打勾），
// 此层仅做组合，不添加逻辑，保持外部签名稳定以隔离内部实现变化。
export default function useSessionLifecycle(params) {
  const { handleStart } = useSessionStart(params);
  const { settleTask } = useTaskSettlement(params);
  const { handleStop } = useSessionStop({ ...params, settleTask });

  return { handleStart, settleTask, handleStop };
}
