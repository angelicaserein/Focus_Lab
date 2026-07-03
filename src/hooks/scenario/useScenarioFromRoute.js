import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// 从情景页快速启动时，通过 router state 设置全局当前情景（仅首次挂载读取一次，
// 读后清掉 history state 防止返回 / 刷新重复设置）。
export default function useScenarioFromRoute(setActiveScenario) {
  const location = useLocation();
  useEffect(() => {
    const sid = location.state?.scenarioId;
    if (sid) {
      setActiveScenario(sid);
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
