import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTodos } from "@/context/TodoContext";
import { useFocus } from "@/context/FocusContext";
import { useScenarios } from "@/context/ScenarioContext";
import { useLanguage } from "@/context/LanguageContext";
import usePrefs from "@/hooks/common/usePrefs";
import useMemos from "@/hooks/useMemos";
import desktop, { isDesktop } from "@/utils/desktop/desktopBridge";

// 主窗口里常驻的桌宠对接层。挂在 App 根部（路由内，因为要用 useNavigate）。
// 网页版下 isDesktop 为 false，所有订阅都是空实现，这个组件等于不存在。
//
// 职责有三块：
//   1. 发布「待机态」状态：任务数、当前专注选中的任务、语言、烧瓶形状。
//      计时相关的那一段由 Focus 页的 useDesktopFocusSync 单独发（见主进程的合并逻辑）。
//   2. 接住主进程的路由跳转（托盘菜单「开始专注」、桌宠点开主窗口）。
//   3. 接住桌宠里那些「跟当前在哪个页面无关」的指令——目前只有快速记一条。
//      开始 / 暂停 / 结束这类跟计时相关的指令归 Focus 页管，这里不碰。
export default function DesktopHost() {
  const navigate = useNavigate();
  const { todos } = useTodos();
  const { focusedTodoIds } = useFocus();
  const { activeScenario } = useScenarios();
  const { lang } = useLanguage();
  const { flaskShape, timerMode } = usePrefs();
  const { addMemo } = useMemos();

  // addMemo 每次渲染都是新函数，但指令订阅只想建一次。
  // 用 ref 存最新的一份，订阅里读 ref。
  const addMemoRef = useRef(addMemo);
  addMemoRef.current = addMemo;

  useEffect(() => {
    if (!isDesktop) return undefined;
    return desktop.onNavigate((hash) => {
      // 主进程给的是 "#/focus" 这种 HashRouter 形式，去掉 # 才是 navigate 的入参
      navigate(hash.replace(/^#/, "") || "/");
    });
  }, [navigate]);

  useEffect(() => {
    if (!isDesktop) return undefined;
    return desktop.onCommand((cmd) => {
      if (cmd?.type === "add-note" && cmd.text) addMemoRef.current(cmd.text);
    });
  }, []);

  // 待机态快照。
  // 不能只靠依赖数组把关：flaskShape / activeScenario 这些都是每次渲染新建的对象，
  // 依赖恒变 = 每渲染一次就过一趟 IPC。所以比对序列化后的内容，真变了才发。
  const lastPayload = useRef("");
  useEffect(() => {
    if (!isDesktop) return;
    const selected = todos.filter((t) => focusedTodoIds.includes(t.id));
    const app = {
      lang,
      timerMode,
      flaskParams: flaskShape.params,
      scenarioTitle: activeScenario?.title ?? null,
      selectedTitles: selected.map((t) => t.text),
      pendingCount: todos.filter((t) => !t.completed).length,
    };
    const key = JSON.stringify(app);
    if (key === lastPayload.current) return;
    lastPayload.current = key;
    desktop.publishState({ app });
  }, [todos, focusedTodoIds, activeScenario, lang, timerMode, flaskShape]);

  return null;
}
