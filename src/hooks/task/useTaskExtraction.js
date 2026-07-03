import { useCallback, useState } from "react";
import { useTodos } from "@/context/TodoContext";
import { useDatabases } from "@/context/DatabaseContext";
import { extractTasksFromText, sanitizeTaskAttrs } from "@/utils/ai/aiTasks";

// 编排「AI 笔记 → 任务」的一次会话。
// 状态机：idle → loading → review → (commit) → idle ；出错则 error。
//   · request(text)  发起抽取，进入 review 持有候选
//   · commit(tasks)  把用户审核后的任务落到当前激活的任务库
//   · close()        关闭面板，回到 idle
//
// 候选 attrs 在 request 时为「原始值」，落库时再用 sanitizeTaskAttrs
// 针对当前库清洗（只保留库里存在且合法的列）。
export default function useTaskExtraction() {
  const { addTodo, setTodoAttr } = useTodos();
  const { activeDatabase, activeDatabaseId } = useDatabases();

  const [status, setStatus] = useState("idle"); // idle | loading | review | error
  const [candidates, setCandidates] = useState([]);
  const [error, setError] = useState(null);
  const [addedCount, setAddedCount] = useState(0);

  const request = useCallback(
    async (text) => {
      const input = (text ?? "").trim();
      if (!input || status === "loading") return;
      setStatus("loading");
      setError(null);
      setAddedCount(0);
      try {
        const tasks = await extractTasksFromText(input, { database: activeDatabase });
        setCandidates(tasks);
        setStatus("review");
      } catch (e) {
        setError(e?.message || "AI 整理失败，请稍后再试");
        setStatus("error");
      }
    },
    [status, activeDatabase],
  );

  // tasks: 用户在面板里勾选并可能改过标题/属性的 [{ text, attrs }]
  const commit = useCallback(
    (tasks) => {
      let n = 0;
      for (const task of tasks) {
        const text = (task.text ?? "").trim();
        if (!text) continue;
        const todo = addTodo(text, { databaseId: activeDatabaseId });
        if (!todo) continue;
        const { attrs } = sanitizeTaskAttrs(task.attrs, activeDatabase);
        for (const [attrId, value] of Object.entries(attrs)) {
          setTodoAttr(todo.id, attrId, value);
        }
        n += 1;
      }
      setAddedCount(n);
      setStatus("idle");
      setCandidates([]);
      return n;
    },
    [addTodo, setTodoAttr, activeDatabase, activeDatabaseId],
  );

  const close = useCallback(() => {
    setStatus("idle");
    setCandidates([]);
    setError(null);
  }, []);

  const isOpen = status === "loading" || status === "review" || status === "error";

  return { status, isOpen, candidates, error, addedCount, request, commit, close };
}
