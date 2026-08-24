import { useEffect, useMemo, useState } from "react";
import { useTodos } from "@/context/TodoContext";
import { useTaskAttrs, useDatabases } from "@/context/DatabaseContext";
import { useScenarios } from "@/context/ScenarioContext";
import useTaskQuery from "@/pages/Tasks/useTaskQuery";
import { applyQuery, buildQueryFields } from "@/pages/Tasks/taskQuery";
import { activeDue, daysUntil } from "@/pages/Tasks/taskFlowUtils";

// 工具栏右端的两个一键筛选：把最常问的「今天要做什么 / 哪些是重要紧急」压成一次点击，
// 不必每次去筛选弹层里搭规则。与筛选/排序叠加生效，再点一次即取消。
const QUICK = {
  today:  (t) => { const d = daysUntil(activeDue(t)); return d !== null && d <= 0; },
  urgent: (t) => t.attrs?.priority === "urgent_important",
};

// 任务库的「显示哪些任务」派生管线，从页面组件中抽出：
// 当前库 → 情景筛选 → 用户查询（筛选/排序/搜索），再顺带算出可见列、查询字段与「未排截止日」候选。
// 页面组件只需消费返回值来渲染，UI 局部状态（新建行/属性编辑器）仍留在组件里。
export default function useVisibleTasks() {
  const { todos } = useTodos();
  const { taskAttrs } = useTaskAttrs();
  const { activeDatabaseId } = useDatabases();
  const { activeScenario } = useScenarios();

  // 当前情景筛选：进入时默认开（贯穿全局），可一键关掉看全部；切换情景时恢复默认开。
  const scenarioTypes = activeScenario?.settings?.taskTypes ?? [];
  const hasScenarioFilter = scenarioTypes.length > 0;
  const [scenarioFilterOn, setScenarioFilterOn] = useState(true);
  useEffect(() => { setScenarioFilterOn(true); }, [activeScenario?.id]);
  const scenarioFilter = hasScenarioFilter && scenarioFilterOn ? scenarioTypes : null;

  const dbTodos = useMemo(
    () => todos.filter(t => (t.databaseId ?? "default") === activeDatabaseId),
    [todos, activeDatabaseId],
  );

  const visibleAttrs = useMemo(
    () => [...taskAttrs].filter(a => a.visible).sort((a, b) => a.order - b.order),
    [taskAttrs],
  );

  // 查询字段（内置字段 + 当前库全部列，含隐藏列，便于按任意属性筛选/排序）。
  const fields = useMemo(() => buildQueryFields(taskAttrs), [taskAttrs]);
  const query = useTaskQuery(fields);

  // 「排截止日」助手的候选：当前库里未完成、还没设截止日的任务
  const undatedTodos = useMemo(
    () => dbTodos.filter(t => !t.completed && !t.attrs?.dueDate),
    [dbTodos],
  );

  // 情景筛选独立于用户查询之外：先按当前情景筛掉明确标了别的类型的任务
  // （保留无标签任务，避免「任务消失」），再套用户的筛选/排序/搜索。
  const scenarioScoped = useMemo(() => {
    if (!scenarioFilter?.length) return dbTodos;
    return dbTodos.filter(t =>
      !(t.attrs?.tags?.length) || t.attrs.tags.some(tag => scenarioFilter.includes(tag)),
    );
  }, [dbTodos, scenarioFilter]);

  const [quick, setQuick] = useState(null); // null | "today" | "urgent"
  const filtered = useMemo(() => {
    const list = applyQuery(scenarioScoped, query.query, fields);
    return quick ? list.filter(QUICK[quick]) : list;
  }, [scenarioScoped, query.query, fields, quick]);

  // 工具栏用的情景开关描述；无情景筛选时为 null。
  const scenario = hasScenarioFilter
    ? { name: activeScenario.title, on: scenarioFilterOn, toggle: () => setScenarioFilterOn(v => !v) }
    : null;

  // 再点一次同一个就取消；两个互斥，避免筛到空还看不出是哪一层筛掉的。
  const quickFilter = { value: quick, toggle: (k) => setQuick((v) => (v === k ? null : k)) };

  return {
    filtered,
    quickFilter,
    visibleAttrs,
    fields,
    query,
    undatedTodos,
    scenario,
    activeDatabaseId,
  };
}
