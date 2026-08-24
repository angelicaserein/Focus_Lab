import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// 命令面板的「新建任务 / 记一条随记」带着 state.compose 跳到目标页，
// 到了之后光标要直接落进那个输入框——否则「一步到位」只走了一半，
// 用户还得自己在页面上找那个框。
//
// 约定：目标页给输入框标 data-compose-target，本 hook 负责找到它并聚焦。
// 走 DOM 查询而不是往下传 ref：为这一件事在页面里穿一层 ref 传递不划算
// （同 useHighlightTarget 的取舍）。
const FIND_STEP_MS = 60;
const FIND_TIMEOUT_MS = 800;

export default function useComposeFocus() {
  const { state, pathname } = useLocation();
  const navigate = useNavigate();
  // 先收进自己的 state 再抹掉 location.state：不抹的话刷新 / 前进后退会重放一次。
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!state?.compose) return;
    setArmed(true);
    navigate(pathname, { replace: true, state: null });
  }, [state, pathname, navigate]);

  useEffect(() => {
    if (!armed) return undefined;
    // 目标页是懒加载的，输入框未必立刻在 DOM 里，隔几帧重试到超时为止。
    let waited = 0;
    const tick = () => {
      const all = [...document.querySelectorAll("[data-compose-target]")];
      // 输入框优先。只找到按钮的话（要先展开新建行那种）就替用户点一下，
      // 下一轮轮询就能拿到真正的输入框了。
      const field = all.find((el) => el.tagName === "INPUT" || el.tagName === "TEXTAREA");
      if (!field && all[0]) {
        all[0].click();
        waited += FIND_STEP_MS; // 点了也照样计时，免得展不开时无限轮询下去
        if (waited >= FIND_TIMEOUT_MS) {
          clearInterval(poll);
          setArmed(false);
        }
        return;
      }
      if (field) {
        field.focus();
        field.scrollIntoView({ block: "center", behavior: "smooth" });
        clearInterval(poll);
        setArmed(false);
        return;
      }
      waited += FIND_STEP_MS;
      if (waited >= FIND_TIMEOUT_MS) {
        clearInterval(poll);
        setArmed(false); // 找不到就安静收手
      }
    };
    const poll = setInterval(tick, FIND_STEP_MS);
    tick();
    return () => clearInterval(poll);
  }, [armed]);
}
