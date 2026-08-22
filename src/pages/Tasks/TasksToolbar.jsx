import React, { useRef, useState } from "react";
import FilterPopover from "@/pages/Tasks/FilterPopover";
import SortPopover from "@/pages/Tasks/SortPopover";
import { useLanguage } from "@/context/LanguageContext";

// 任务库工具栏（对标 Notion）：搜索 + 「筛选 / 排序」两个紧凑按钮，点开各自弹层。
// 整条挂在库标签栏右端（见 .tasks-bar），所以这里是一行横排、无卡片外框。
// 查询状态与操作来自 useTaskQuery（经 query 传入），本组件负责编排 UI。
export default function TasksToolbar({ query, fields, scenario = null }) {
  const {
    search, setSearch,
    filter, sorts,
    addRule, updateRule, changeRuleField, changeRuleOp, removeRule, setConjunction, clearFilter,
    addSort, updateSort, removeSort, clearSort,
  } = query;

  const { t } = useLanguage();
  const [open, setOpen] = useState(null); // null | "filter" | "sort"
  const filterBtnRef = useRef(null);
  const sortBtnRef   = useRef(null);

  const filterCount = filter.rules.length;
  const sortCount   = sorts.length;
  const toggle = (which) => setOpen(o => (o === which ? null : which));

  return (
    <div className="tasks-toolbar">
      {scenario && (
        <button
          className={`flt-btn scenario-pill${scenario.on ? " active" : ""}`}
          onClick={scenario.toggle}
          title={scenario.on
            ? t("tasks.scenarioOn", { name: scenario.name })
            : t("tasks.scenarioOff", { name: scenario.name })}
        >
          🎯 {scenario.name}{scenario.on ? " ✕" : ""}
        </button>
      )}

      <div className="tasks-search-wrap">
        <input
          className="tasks-search"
          placeholder={t("tasks.searchPlaceholder")}
          aria-label={t("tasks.searchPlaceholder")}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button
            type="button"
            className="search-clear"
            onClick={() => setSearch("")}
            aria-label={t("tasks.searchClear")}
          >
            ×
          </button>
        )}
      </div>

      <button
        ref={filterBtnRef}
        className={`query-btn${filterCount ? " active" : ""}`}
        onClick={() => toggle("filter")}
      >
        {t("tasks.filter")}{filterCount ? ` · ${filterCount}` : ""}
      </button>

      <button
        ref={sortBtnRef}
        className={`query-btn${sortCount ? " active" : ""}`}
        onClick={() => toggle("sort")}
      >
        {t("tasks.sort")}{sortCount ? ` · ${sortCount}` : ""}
      </button>

      {open === "filter" && (
        <FilterPopover
          anchorEl={filterBtnRef.current}
          onClose={() => setOpen(null)}
          fields={fields}
          filter={filter}
          actions={{ addRule, updateRule, changeRuleField, changeRuleOp, removeRule, setConjunction, clearFilter }}
        />
      )}

      {open === "sort" && (
        <SortPopover
          anchorEl={sortBtnRef.current}
          onClose={() => setOpen(null)}
          fields={fields}
          sorts={sorts}
          actions={{ addSort, updateSort, removeSort, clearSort }}
        />
      )}
    </div>
  );
}
