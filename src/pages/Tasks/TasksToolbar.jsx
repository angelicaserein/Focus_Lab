import React, { useRef, useState } from "react";
import FilterPopover from "@/pages/Tasks/FilterPopover";
import SortPopover from "@/pages/Tasks/SortPopover";

// 任务库工具栏（对标 Notion）：搜索 + 「筛选 / 排序」两个紧凑按钮，点开各自弹层。
// 查询状态与操作来自 useTaskQuery（经 query 传入），本组件负责编排 UI。
export default function TasksToolbar({ query, fields, scenario = null }) {
  const {
    search, setSearch,
    filter, sorts,
    addRule, updateRule, changeRuleField, changeRuleOp, removeRule, setConjunction, clearFilter,
    addSort, updateSort, removeSort, clearSort,
  } = query;

  const [open, setOpen] = useState(null); // null | "filter" | "sort"
  const filterBtnRef = useRef(null);
  const sortBtnRef   = useRef(null);

  const filterCount = filter.rules.length;
  const sortCount   = sorts.length;
  const toggle = (which) => setOpen(o => (o === which ? null : which));

  return (
    <div className="tasks-toolbar">
      <div className="tasks-search-wrap">
        <input
          className="tasks-search"
          placeholder="搜索任务或备注…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <button className="search-clear" onClick={() => setSearch("")}>×</button>}
      </div>

      <div className="toolbar-row">
        {scenario && (
          <button
            className={`flt-btn scenario-pill${scenario.on ? " active" : ""}`}
            onClick={scenario.toggle}
            title={scenario.on
              ? `仅显示「${scenario.name}」相关任务，点击查看全部`
              : `点击只看「${scenario.name}」相关任务`}
          >
            🎯 {scenario.name}{scenario.on ? " ✕" : ""}
          </button>
        )}

        <button
          ref={filterBtnRef}
          className={`query-btn${filterCount ? " active" : ""}`}
          onClick={() => toggle("filter")}
        >
          筛选{filterCount ? ` · ${filterCount}` : ""}
        </button>

        <button
          ref={sortBtnRef}
          className={`query-btn${sortCount ? " active" : ""}`}
          onClick={() => toggle("sort")}
        >
          排序{sortCount ? ` · ${sortCount}` : ""}
        </button>
      </div>

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
