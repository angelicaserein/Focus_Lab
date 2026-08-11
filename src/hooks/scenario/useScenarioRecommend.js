import { useCallback, useMemo, useState } from "react";
import { useTodos } from "@/context/TodoContext";
import { useScenarios } from "@/context/ScenarioContext";
import { useTaskAttrs } from "@/context/DatabaseContext";
import { buildScenarioContext, recommendTasks } from "@/utils/scenario/scenarioRecommend";
import { rerankRecommendations, hasApiKey } from "@/utils/ai/aiRecommend";
import { useLanguage } from "@/context/LanguageContext";

// 编排「情景智能推荐」：规则排序即时算出，AI 精排按需触发。
//   · base       规则层 Top N（同步 useMemo），每项 { todo, score, reasons }
//   · ranked     最终展示列表：AI 成功时按其 order 重排并合并 aiReason，否则 = base
//   · runAi()    触发 AI 精排，状态机 idle → loading → done|error
//
// 任何 AI 失败 / 无 key 都不影响 base 展示（推荐始终可用）。
export default function useScenarioRecommend({ todos: todosArg, limit = 5 } = {}) {
  const { todos: allTodos } = useTodos();
  const { activeScenario } = useScenarios();
  const { taskAttrs } = useTaskAttrs();
  const { t, lang } = useLanguage();

  const todos = todosArg ?? allTodos;
  const priorityAttr = useMemo(() => taskAttrs.find((a) => a.id === "priority"), [taskAttrs]);

  const ctx = useMemo(
    () => (activeScenario ? buildScenarioContext(activeScenario, priorityAttr, t) : null),
    [activeScenario, priorityAttr, t],
  );

  const base = useMemo(() => {
    if (!ctx) return [];
    return recommendTasks(todos, ctx, { now: Date.now(), limit });
  }, [todos, ctx, limit]);

  // AI 结果：{ order, reasons }。重置依据 base 的 id 指纹（候选变了就作废旧 AI 结果）。
  const [ai, setAi] = useState(null);
  const [aiStatus, setAiStatus] = useState("idle"); // idle | loading | done | error

  const baseKey = base.map((b) => b.todo.id).join(",");

  const ranked = useMemo(() => {
    // AI 结果须与当前 base 候选集一致才生效，否则回退规则顺序。
    if (!ai || ai.baseKey !== baseKey) return base;
    const byId = new Map(base.map((b) => [b.todo.id, b]));
    const ordered = ai.order.map((id) => byId.get(id)).filter(Boolean);
    // 补上 AI 漏掉的候选（保持在末尾），避免任务凭空消失。
    for (const b of base) if (!ai.order.includes(b.todo.id)) ordered.push(b);
    return ordered.map((b) => ({ ...b, aiReason: ai.reasons[b.todo.id] }));
  }, [base, ai, baseKey]);

  const runAi = useCallback(async () => {
    if (!base.length || aiStatus === "loading") return;
    setAiStatus("loading");
    try {
      const candidates = base.map(({ todo }) => ({
        id: todo.id,
        text: todo.text,
        attrs: todo.attrs ?? {},
      }));
      const result = await rerankRecommendations(candidates, {
        scenario: activeScenario,
        envProfile: ctx?.envProfile,
        lang,
      });
      setAi({ ...result, baseKey });
      setAiStatus("done");
    } catch {
      setAiStatus("error");
    }
  }, [base, aiStatus, activeScenario, ctx, baseKey]);

  return {
    hasScenario: Boolean(activeScenario),
    envProfile: ctx?.envProfile ?? null,
    ranked,
    aiStatus,
    aiEnabled: hasApiKey(),
    runAi,
  };
}
