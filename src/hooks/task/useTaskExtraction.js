import { useCallback, useState } from "react";
import { aiErrorText } from "@/utils/ai/aiClient";
import { useTodos } from "@/context/TodoContext";
import { useDatabases } from "@/context/DatabaseContext";
import {
  askClarifyingQuestions,
  extractTasksFromText,
  refineTask,
  sanitizeTaskAttrs,
} from "@/utils/ai/aiTasks";
import useTaskSplitPrefs from "@/hooks/task/useTaskSplitPrefs";
import { useLanguage } from "@/context/LanguageContext";

// 编排「AI 笔记 → 任务」的一次会话。
// 状态机：idle → (asking →) loading → review → (commit) → idle ；出错则 error。
//   · request(text)   发起。若设置页开了「先反问」且模型确实有要问的，
//                     先进 asking 持有问题；否则直接进 loading 抽取。
//                     后一种情况置 clarifySkipped，让评审面板能说明「这次没问」——
//                     否则「模型觉得不用问」和「反问那步失败了」在界面上长得一模一样。
//   · answer(answers) 带着反问答案继续抽取（跳过 = 传 []）
//   · commit(tasks)   把用户审核后的任务落到当前激活的任务库
//   · refine(task)    把某一条再拆细，返回新任务数组（不改状态机，评审面板自己就地替换）
//   · close()         关闭面板，回到 idle
//
// 候选 attrs 在 request 时为「原始值」，落库时再用 sanitizeTaskAttrs
// 针对当前库清洗（只保留库里存在且合法的列）。
export default function useTaskExtraction() {
  const { addTodo, setTodoAttr } = useTodos();
  const { activeDatabase, activeDatabaseId } = useDatabases();
  const { prefs } = useTaskSplitPrefs();
  const { t } = useLanguage();

  const [status, setStatus] = useState("idle"); // idle | asking | loading | review | error
  const [candidates, setCandidates] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [pendingText, setPendingText] = useState("");
  // 开了「先反问」却没问成（模型返回空 / 这一步失败）
  const [clarifySkipped, setClarifySkipped] = useState(false);
  const [error, setError] = useState(null);

  // 真正去抽取。answers = [{ question, answer }]，没有反问环节时为 []。
  const extract = useCallback(
    async (input, answers) => {
      setStatus("loading");
      setError(null);
      try {
        const tasks = await extractTasksFromText(input, {
          database: activeDatabase,
          t,
          prefs,
          answers,
        });
        setCandidates(tasks);
        setQuestions([]);
        setStatus("review");
      } catch (e) {
        // 认得出的失败（401/429/5xx/断网）给一句「该怎么办」，
        // 而不是把 `HTTP 500` 这种只报现象的话原样贴到界面上。
        setError(aiErrorText(t, e, "brainDump.failed"));
        setStatus("error");
      }
    },
    [activeDatabase, t, prefs],
  );

  const request = useCallback(
    async (text) => {
      const input = (text ?? "").trim();
      if (!input || status === "loading") return;
      setPendingText(input);

      setClarifySkipped(false);

      if (!prefs.askFirst) {
        await extract(input, []);
        return;
      }

      // 反问只是锦上添花：问不出来（或这一步失败）就当没问过，直接往下拆。
      setStatus("loading");
      setError(null);
      let qs = [];
      try {
        qs = await askClarifyingQuestions(input, { prefs });
      } catch {
        qs = [];
      }
      if (qs.length) {
        setQuestions(qs);
        setStatus("asking");
      } else {
        setClarifySkipped(true);
        await extract(input, []);
      }
    },
    [status, prefs, extract],
  );

  // answers: [{ question, answer }]；跳过就传 []（等于全用默认，不额外约束模型）
  const answer = useCallback(
    (answers) => extract(pendingText, answers),
    [extract, pendingText],
  );

  // 把一条候选再拆细。抛错交给调用方（评审面板就地提示，不打断整个会话）。
  const refine = useCallback(
    (task) => refineTask(task, { database: activeDatabase, t, prefs }),
    [activeDatabase, t, prefs],
  );

  // tasks: 用户在面板里勾选并可能改过标题/属性的 [{ text, attrs }]
  // 返回这批新任务的 id —— 调用方拿它做「撤回」（见 deleteTodos）
  const commit = useCallback(
    (tasks) => {
      const ids = [];
      for (const task of tasks) {
        const text = (task.text ?? "").trim();
        if (!text) continue;
        const todo = addTodo(text, { databaseId: activeDatabaseId });
        if (!todo) continue;
        const { attrs } = sanitizeTaskAttrs(task.attrs, activeDatabase);
        for (const [attrId, value] of Object.entries(attrs)) {
          setTodoAttr(todo.id, attrId, value);
        }
        ids.push(todo.id);
      }
      setStatus("idle");
      setCandidates([]);
      return ids;
    },
    [addTodo, setTodoAttr, activeDatabase, activeDatabaseId],
  );

  const close = useCallback(() => {
    setStatus("idle");
    setCandidates([]);
    setQuestions([]);
    setError(null);
  }, []);

  const isOpen = status !== "idle";

  return {
    status, isOpen, candidates, questions, clarifySkipped,
    error, request, answer, refine, commit, close,
  };
}
