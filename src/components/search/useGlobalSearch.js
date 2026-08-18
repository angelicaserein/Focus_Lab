import { useMemo } from "react";
import { useTodos } from "@/context/TodoContext";
import { useScenarios } from "@/context/ScenarioContext";
import { useDatabases } from "@/context/DatabaseContext";
import { useFeatures } from "@/context/FeatureContext";
import { useLanguage } from "@/context/LanguageContext";
import useMemos from "@/hooks/useMemos";
import { attrName } from "@/utils/task/taskAttrUtils";
import { NAV_PAGES } from "@/components/layout/navSections";
import { TRANSLATIONS, LANGUAGES } from "@/i18n/translations";
import {
  searchAll,
  toPageEntries,
  toTaskEntries,
  toMemoEntries,
  toScenarioEntries,
} from "@/components/search/searchIndex";

// 一个 key 在所有语言下的写法。界面是中文时输 "focus" 也该找到专注页，反之亦然。
const tAll = (key) => LANGUAGES.map(({ id }) => TRANSLATIONS[id]?.[key]).filter(Boolean);

/**
 * 跨页搜索的数据装配层：从各 Context 取数、摊成统一条目、交给 searchAll 匹配。
 * 条目表按数据源分别 memo，输入时只重跑匹配，不重建整张表。
 */
export default function useGlobalSearch(query) {
  const { todos } = useTodos();
  const { scenarios } = useScenarios();
  const { databases } = useDatabases();
  const { isEnabled } = useFeatures();
  const { t } = useLanguage();
  const { timeline } = useMemos();

  // 被功能树关掉的页面不出现在结果里——它们此刻不可达，列出来只会让人白点一次。
  const pages = useMemo(
    () => toPageEntries(NAV_PAGES.filter((p) => isEnabled(p.to)), t, tAll),
    [isEnabled, t],
  );

  const tasks = useMemo(() => {
    const nameOf = (todo) => {
      const db = databases.find((d) => d.id === (todo.databaseId ?? "default"));
      return db ? attrName(t, db) : "";
    };
    return toTaskEntries(todos, nameOf);
  }, [todos, databases, t]);

  const memos = useMemo(() => toMemoEntries(timeline), [timeline]);
  const scenarioEntries = useMemo(() => toScenarioEntries(scenarios), [scenarios]);

  // 情境功能被整组关掉时，情景条目跟着从结果里消失（与页面同一条规则）。
  return useMemo(
    () =>
      searchAll(query, {
        pages,
        tasks: isEnabled("/tasks") ? tasks : [],
        memos: isEnabled("/memo") ? memos : [],
        scenarios: isEnabled("/scenario") ? scenarioEntries : [],
      }),
    [query, pages, tasks, memos, scenarioEntries, isEnabled],
  );
}
