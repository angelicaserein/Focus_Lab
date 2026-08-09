import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTodos } from "@/context/TodoContext";
import { useFocus } from "@/context/FocusContext";
import { useScenarios } from "@/context/ScenarioContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import usePrefs from "@/hooks/common/usePrefs";
import useFlaskShelf from "@/hooks/flask/useFlaskShelf";
import useMemos from "@/hooks/useMemos";
import desktop, { isDesktop } from "@/utils/desktop/desktopBridge";

// 主窗口里常驻的桌宠对接层。挂在 App 根部（路由内，因为要用 useNavigate）。
// 网页版下 isDesktop 为 false，所有订阅都是空实现，这个组件等于不存在。
//
// 职责有三块：
//   1. 发布「待机态」状态：任务数、当前专注选中的任务、语言、烧瓶形状。
//      计时相关的那一段由 Focus 页的 useDesktopFocusSync 单独发（见主进程的合并逻辑）。
//   2. 接住主进程的路由跳转（托盘菜单「开始专注」、桌宠点开主窗口）。
//   3. 接住桌宠里那些「跟当前在哪个页面无关」的指令：快速记一条、勾选任务。
//      开始 / 暂停 / 结束这类跟计时相关的指令归 Focus 页管，这里不碰。
//      （勾选放这里而不是 Focus 页：桌宠上挑任务时主窗口多半还没进专注页。）

// 推给桌宠的候选任务条数。面板就那么高，给多了只是让人多滚一屏。
const PET_CANDIDATE_LIMIT = 8;

export default function DesktopHost() {
  const navigate = useNavigate();
  const { todos } = useTodos();
  const { focusedTodoIds, toggleFocusTodo } = useFocus();
  const { activeScenario } = useScenarios();
  const { lang } = useLanguage();
  const { activeTheme } = useTheme();
  const { flaskShape, timerMode, appWatch } = usePrefs();
  // 桌宠画的瓶子跟着烧瓶架上选中的那只走，与专注页保持同一只（架子空着时用设置页的形状）
  const { activeParams } = useFlaskShelf();
  const { addMemo } = useMemos();

  // 这些回调每次渲染都是新函数，但指令订阅只想建一次。
  // 用 ref 存最新的一份，订阅里读 ref。
  const handlers = useRef({});
  handlers.current = { addMemo, toggleFocusTodo };

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
      if (cmd?.type === "add-note" && cmd.text) handlers.current.addMemo(cmd.text);
      if (cmd?.type === "select-task" && cmd.taskId) handlers.current.toggleFocusTodo(cmd.taskId);
    });
  }, []);

  // 分心水位的白名单：真值在这边的 localStorage 里，主进程只要一份用来判定。
  // 不走上面那份 app 快照——那是发给桌宠的，桌宠不需要知道用户勾了哪些程序。
  // appWatch 每次渲染都是新对象，所以照例比对序列化结果再发。
  const lastWatch = useRef("");
  useEffect(() => {
    if (!isDesktop) return;
    const key = JSON.stringify(appWatch);
    if (key === lastWatch.current) return;
    lastWatch.current = key;
    desktop.setWatchConfig(appWatch);
  }, [appWatch]);

  // 待机态快照。
  // 不能只靠依赖数组把关：flaskShape / activeScenario 这些都是每次渲染新建的对象，
  // 依赖恒变 = 每渲染一次就过一趟 IPC。所以比对序列化后的内容，真变了才发。
  const lastPayload = useRef("");
  useEffect(() => {
    if (!isDesktop) return;
    const selected = todos.filter((t) => focusedTodoIds.includes(t.id));
    // 桌宠面板里直接挑任务用的候选表。选中的排在最前面，免得它被截断在
    // LIMIT 之外——那样面板上会出现「有选中，但列表里找不到打勾的那条」。
    const selectedIds = new Set(focusedTodoIds);
    const candidates = [
      ...selected,
      ...todos.filter((t) => !t.completed && !selectedIds.has(t.id)),
    ].slice(0, PET_CANDIDATE_LIMIT).map((t) => ({ id: t.id, text: t.text }));
    const app = {
      lang,
      // 桌宠自己不持有偏好，主题只能跟着推：它按这个值写自己的 <html data-theme>。
      // 统一成 data-theme 的取值（default 表示不带属性的默认皮）。
      theme: (activeTheme || "default").replace(/^theme-/, ""),
      timerMode,
      flaskParams: activeParams ?? flaskShape.params,
      scenarioTitle: activeScenario?.title ?? null,
      selectedTitles: selected.map((t) => t.text),
      selectedIds: focusedTodoIds,
      candidates,
      pendingCount: todos.filter((t) => !t.completed).length,
    };
    const key = JSON.stringify(app);
    if (key === lastPayload.current) return;
    lastPayload.current = key;
    desktop.publishState({ app });
  }, [todos, focusedTodoIds, activeScenario, lang, activeTheme, timerMode, flaskShape, activeParams]);

  return null;
}
