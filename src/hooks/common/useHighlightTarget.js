import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// 跨页搜索点开一条结果后，目标页要把那一条滚进视野并闪一下——
// 否则跳过去只是落在页面顶部，用户还得自己在长列表里再找一遍。
//
// 约定：导航时带 state.highlight = 条目 id；页面把每行标上
// data-highlight-id={id}，本 hook 负责找到它、滚过去、加上 .is-highlighted，
// 到点自行摘掉（样式见 styles/global.css）。
//
// 返回值是本次要定位的 id（无则 null），给页面做「让它先可见」的准备工作用——
// 任务库就靠它把当前库切到目标任务所在的那个库。
//
// 直接操作 DOM 而不是往下传 highlightId props：目标行在任务库里要穿过
// FlowView → 分堆 → TaskCard、或 TasksTable → TodoRow 两条不同的路，
// 每条都加一个只为闪一下而存在的 prop 不划算；而这个类是纯瞬时装饰，
// 不参与任何状态。代价是行若在这 2 秒内重渲染会把类冲掉，闪光提前结束——
// 只是提示少闪一会儿，不影响定位。
const FLASH_MS = 2200;
const FLASH_CLASS = "is-highlighted";
// 找目标行的重试节奏与上限
const FIND_STEP_MS = 60;
const FIND_TIMEOUT_MS = 800;

export default function useHighlightTarget() {
  const { state, pathname } = useLocation();
  const navigate = useNavigate();

  // 把 id 收进自己的 state，而不是一路直接读 location.state：
  // 下面要立刻把 location.state 抹掉（刷新 / 前进后退不该重放这次高亮），
  // 那次抹除会让读 location 的 effect 重跑一遍并执行清理——把还没来得及
  // 触发的滚动 / 高亮一起取消掉。存一份自己的副本，抹除就不再牵动定位逻辑。
  const [id, setId] = useState(null);

  useEffect(() => {
    if (!state?.highlight) return;
    setId(state.highlight);
    navigate(pathname, { replace: true, state: null });
  }, [state, pathname, navigate]);

  useEffect(() => {
    if (!id) return;
    // 目标行未必立刻在 DOM 里：页面是懒加载的，任务库还可能要先切库、
    // 展开已完成堆才轮到它渲染。所以隔几帧重试，直到找到或超时放弃。
    let el = null;
    let waited = 0;
    const tick = () => {
      el = document.querySelector(`[data-highlight-id="${CSS.escape(id)}"]`);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        el.classList.add(FLASH_CLASS);
        clearInterval(poll);
        return;
      }
      waited += FIND_STEP_MS;
      if (waited >= FIND_TIMEOUT_MS) clearInterval(poll); // 找不到就安静收手
    };
    const poll = setInterval(tick, FIND_STEP_MS);
    tick();

    const timer = setTimeout(() => setId(null), FLASH_MS);
    return () => {
      clearInterval(poll);
      clearTimeout(timer);
      el?.classList.remove(FLASH_CLASS);
    };
  }, [id]);

  return id;
}
