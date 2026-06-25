import { useEffect, useMemo, useState } from "react";
import { useTodos } from "../../context/TodoContext";
import { useFocus } from "../../context/FocusContext";
import { useReward } from "../../context/RewardContext";
import useFocusTimer from "../../hooks/useFocusTimer";

// 一次专注会话的编排：组合计时器 + 专注选择集合，派生待办视图，
// 并提供开始/结束/就地结算/增删替换等操作。从 FocusPage 抽出，让页面组件变薄。
export default function useFocusSession() {
  const { todos, toggleTodo, addTodo } = useTodos();
  const { focusedTodoIds, addFocusTodo, removeFocusTodo, clearFocusTodos, addFocusRecord } =
    useFocus();
  const { addCoins } = useReward();

  const selectedTodos = useMemo(
    () => todos.filter((t) => focusedTodoIds.includes(t.id)),
    [todos, focusedTodoIds],
  );
  const hasSelection = selectedTodos.length > 0;

  // 沉浸页可挑进来的候选任务：尚未在本次专注、且未完成
  const availableTodos = useMemo(
    () => todos.filter((t) => !focusedTodoIds.includes(t.id) && !t.completed),
    [todos, focusedTodoIds],
  );

  // 沉浸页任务编辑：加入已有 / 新建并加入 / 用另一个替换
  const addToFocus = (id) => addFocusTodo(id);
  const createAndFocus = (text) => {
    const t = text.trim();
    if (!t) return;
    const item = addTodo(t);
    if (item) addFocusTodo(item.id);
  };
  const replaceFocus = (oldId, newId) => {
    // 纯交换：移出旧的、加入新的。两次 setState 同批提交，集合不会瞬空触发退出
    removeFocusTodo(oldId);
    addFocusTodo(newId);
  };

  const { seconds, isRunning, start, togglePause, resetTimer, clearSession, getSession } =
    useFocusTimer();
  const [isImmersive, setIsImmersive] = useState(false);

  // 选中集合清空时（手动清除 / 任务都被结算）：归零并退出沉浸
  useEffect(() => {
    if (!hasSelection) {
      clearSession();
      setIsImmersive(false);
    }
    // clearSession 每次渲染都是新引用；这里只关心 hasSelection 的变化
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSelection]);

  const handleStart = () => {
    if (!hasSelection) return;
    start();
    setIsImmersive(true);
  };

  // 就地结算单个任务：记一条带结果的记录并移出本次专注
  const settleTask = (todo, outcome) => {
    const { startedAt, sessionId } = getSession();
    addFocusRecord({
      taskId: todo.id,
      taskText: todo.text,
      durationSecs: seconds,
      startedAt: startedAt ?? Date.now() - seconds * 1000,
      sessionId,
      outcome,
    });
    if (outcome === "completed") {
      if (!todo.completed) toggleTodo(todo.id);
      // 完成奖励：本次专注秒数即金币数（1 秒 = 1 枚）
      addCoins(seconds);
    }
    removeFocusTodo(todo.id);
  };

  const handleStop = () => {
    // 对仍在集合中的任务统一以「结束」结算（settleTask 内部依赖当前 seconds）
    selectedTodos.forEach((t) => settleTask(t, "ended"));
    clearSession();
    setIsImmersive(false);
    clearFocusTodos();
  };

  return {
    selectedTodos,
    hasSelection,
    availableTodos,
    seconds,
    isRunning,
    isImmersive,
    addToFocus,
    createAndFocus,
    replaceFocus,
    togglePause,
    resetTimer,
    removeFocusTodo,
    handleStart,
    handleStop,
    settleTask,
  };
}
