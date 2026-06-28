import { useState } from "react";

// 任务库工具栏的筛选/排序 UI 状态与操作。
// 与 useTaskFilter（对 todos 做纯计算的过滤+排序）分离：这里只管「用户选了什么」，
// 那里只管「据此算出可见列表」。
export default function useTaskFilters() {
  const [statusFilter,   setStatusFilter]   = useState("all");
  const [priorityFilter, setPriorityFilter] = useState([]);
  const [tagFilter,      setTagFilter]      = useState([]);
  const [search,         setSearch]         = useState("");
  const [sortBy,         setSortBy]         = useState("createdAt");
  const [sortDir,        setSortDir]        = useState("desc");

  const togglePriority = (pid) =>
    setPriorityFilter(p => p.includes(pid) ? p.filter(x => x !== pid) : [...p, pid]);
  const toggleTag = (tid) =>
    setTagFilter(t => t.includes(tid) ? t.filter(x => x !== tid) : [...t, tid]);

  const handleSortClick = (field) => {
    if (sortBy === field) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortBy(field); setSortDir("desc"); }
  };

  // 排序方向箭头：当前排序字段才显示，↓ 降序 / ↑ 升序。
  const arrow = (f) => sortBy === f ? (sortDir === "desc" ? " ↓" : " ↑") : "";

  const clearFilters = () => {
    setPriorityFilter([]);
    setTagFilter([]);
    setStatusFilter("all");
    setSearch("");
  };

  const hasFilter =
    priorityFilter.length || tagFilter.length || statusFilter !== "all" || search;

  return {
    statusFilter, setStatusFilter,
    priorityFilter, togglePriority,
    tagFilter, toggleTag,
    search, setSearch,
    sortBy, sortDir, handleSortClick, arrow,
    clearFilters, hasFilter,
  };
}
