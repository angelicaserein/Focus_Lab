import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// 从主页「今天要做的事」一键开专注：那边把任务塞进选中集合后带着 router state 跳过来，
// 这里挂载即开会话、直接进沉浸层，省掉「到了专注页还要再按一次开始」这一步。
// 走的是和「双击任务直达专注」同一条路——顺手启动，不播启动仪式。
// 读后清掉 history state，防止返回 / 刷新时又自己开一次。
export default function useAutoStartFromRoute(canStart, handleStart) {
  const location = useLocation();
  useEffect(() => {
    if (!location.state?.autoStart || !canStart) return;
    window.history.replaceState({}, document.title);
    handleStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
