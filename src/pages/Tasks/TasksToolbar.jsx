import React from "react";

const STATUS_OPTS = [
  { id: "all",       label: "全部" },
  { id: "active",    label: "待办" },
  { id: "completed", label: "已完成" },
];

const SORT_OPTS = [
  { id: "createdAt", label: "创建时间" },
  { id: "dueDate",   label: "截止日期" },
  { id: "priority",  label: "优先级" },
  { id: "text",      label: "任务名" },
];

// 任务库工具栏：搜索 + 状态/优先级/标签筛选 + 排序。
// 状态来自 useTaskFilters，本组件纯渲染。
export default function TasksToolbar({ filters, priorityOpts, tagsOpts }) {
  const {
    statusFilter, setStatusFilter,
    priorityFilter, togglePriority,
    tagFilter, toggleTag,
    search, setSearch,
    sortBy, handleSortClick, arrow,
    clearFilters, hasFilter,
  } = filters;

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
        <div className="filter-group status-group">
          {STATUS_OPTS.map(s => (
            <button
              key={s.id}
              className={`flt-btn${statusFilter === s.id ? " active" : ""}`}
              onClick={() => setStatusFilter(s.id)}
            >{s.label}</button>
          ))}
        </div>

        {priorityOpts.length > 0 && (
          <div className="filter-group">
            {priorityOpts.map(p => (
              <button
                key={p.id}
                className={`flt-btn priority-pill${priorityFilter.includes(p.id) ? " active" : ""}`}
                style={{ "--pill": p.color }}
                onClick={() => togglePriority(p.id)}
              >{p.label}</button>
            ))}
          </div>
        )}

        {tagsOpts.length > 0 && (
          <div className="filter-group">
            {tagsOpts.map(t => (
              <button
                key={t.id}
                className={`flt-btn tag-pill${tagFilter.includes(t.id) ? " active" : ""}`}
                title={t.label}
                onClick={() => toggleTag(t.id)}
              >{t.icon ?? t.label}</button>
            ))}
          </div>
        )}

        {hasFilter && (
          <button className="flt-clear" onClick={clearFilters}>清除筛选</button>
        )}

        <div className="sort-group">
          <span className="sort-label">排序</span>
          {SORT_OPTS.map(s => (
            <button
              key={s.id}
              className={`sort-btn${sortBy === s.id ? " active" : ""}`}
              onClick={() => handleSortClick(s.id)}
            >{s.label}{arrow(s.id)}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
