import { useMemo } from "react";

export default function useTaskFilter({ todos, statusFilter, priorityFilter, tagFilter, scenarioFilter, search, sortBy, sortDir, prioritySortMap }) {
  return useMemo(() => {
    let list = todos;
    if (statusFilter === "active")    list = list.filter(t => !t.completed);
    if (statusFilter === "completed") list = list.filter(t => t.completed);
    if (priorityFilter.length)
      list = list.filter(t => priorityFilter.includes(t.attrs?.priority ?? "none"));
    if (tagFilter.length)
      list = list.filter(t => tagFilter.some(tag => t.attrs?.tags?.includes(tag)));
    // 当前情景筛选：保留无标签任务（避免「任务消失」），只筛掉明确标了别的类型的。
    if (scenarioFilter?.length)
      list = list.filter(t =>
        !(t.attrs?.tags?.length) || t.attrs.tags.some(tag => scenarioFilter.includes(tag)),
      );
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.text.toLowerCase().includes(q) || t.attrs?.notes?.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "createdAt") {
        cmp = (a.createdAt ?? 0) - (b.createdAt ?? 0);
      } else if (sortBy === "dueDate") {
        const da = a.attrs?.dueDate ?? "9999-99-99";
        const db = b.attrs?.dueDate ?? "9999-99-99";
        cmp = da < db ? -1 : da > db ? 1 : 0;
      } else if (sortBy === "priority") {
        cmp = (prioritySortMap[a.attrs?.priority] ?? 0) -
              (prioritySortMap[b.attrs?.priority] ?? 0);
      } else if (sortBy === "text") {
        cmp = a.text.localeCompare(b.text, "zh");
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [todos, statusFilter, priorityFilter, tagFilter, scenarioFilter, search, sortBy, sortDir, prioritySortMap]);
}
