import { useEffect } from "react";

// todos 变化时清理已不存在的 focusedTodoId（todo 被删除后同步移出 focus 列表）。
export default function usePruneDeletedFocus(todos, focusedTodoIds, removeFocusTodo) {
  useEffect(() => {
    const todoIdSet = new Set(todos.map((t) => t.id));
    focusedTodoIds.forEach((id) => {
      if (!todoIdSet.has(id)) removeFocusTodo(id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todos]);
}
