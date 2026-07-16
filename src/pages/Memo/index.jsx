import React, { useMemo, useState } from "react";
import useMemos from "@/hooks/useMemos";
import useTaskExtraction from "@/hooks/task/useTaskExtraction";
import AiTaskModal from "@/pages/Memo/AiTaskModal";
import MemoItem from "@/pages/Memo/MemoItem";
import useMemoAiOrganize from "@/pages/Memo/useMemoAiOrganize";
import { collectTags, itemHasTag } from "@/pages/Memo/memoTags";
import { useDatabases } from "@/context/DatabaseContext";
import { formatSessionDate } from "@/utils/time";
import "./Memo.css";

const FILTERS = [
  { key: "all", label: "全部" },
  { key: "memo", label: "手动" },
  { key: "focus", label: "专注随记" },
];

// 按自然日分组，返回 [dayLabel, items][]（items 已按时间倒序）
function groupByDay(items) {
  const groups = [];
  const index = new Map();
  for (const item of items) {
    const label = formatSessionDate(item.ts);
    if (!index.has(label)) {
      index.set(label, groups.length);
      groups.push([label, []]);
    }
    groups[index.get(label)][1].push(item);
  }
  return groups;
}

export default function MemoPage() {
  const { timeline, counts, addMemo, updateMemo, removeMemo, setMemoTags } = useMemos();
  const { activeDatabase } = useDatabases();
  const ai = useTaskExtraction();
  const organize = useMemoAiOrganize({ timeline, ai, activeDatabase });

  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState("all");
  const [activeTag, setActiveTag] = useState(null);

  const tagCloud = useMemo(() => collectTags(timeline), [timeline]);

  const filtered = useMemo(() => {
    let list = filter === "all" ? timeline : timeline.filter((i) => i.source === filter);
    if (activeTag) list = list.filter((i) => itemHasTag(i, activeTag));
    return list;
  }, [timeline, filter, activeTag]);
  const groups = useMemo(() => groupByDay(filtered), [filtered]);

  // 点击某标签：再次点击同一标签则取消筛选。
  const toggleTag = (tag) => setActiveTag((cur) => (cur === tag ? null : tag));

  const handleAdd = () => {
    if (!draft.trim()) return;
    addMemo(draft);
    setDraft("");
  };

  const handleDraftKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleCommit = (tasks) => organize.commit(tasks);

  return (
    <div className="page-memo">
      <div className="memo-headline">
        <h1>备忘录</h1>
        <p className="memo-subtitle">随时记下想法，专注时的随记也会汇总到这里</p>
      </div>

      {/* 新建备忘 */}
      <div className="memo-compose">
        <textarea
          className="memo-compose-input"
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleDraftKeyDown}
          placeholder="写点什么…（Enter 添加，Shift+Enter 换行）"
        />
        <button
          type="button"
          className="memo-compose-add"
          onClick={handleAdd}
          disabled={!draft.trim()}
        >
          添加
        </button>
      </div>

      {/* 筛选 */}
      <div className="memo-filters">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`memo-filter-chip${filter === key ? " active" : ""}`}
            onClick={() => setFilter(key)}
          >
            {label}
            <span className="memo-filter-count">{counts[key]}</span>
          </button>
        ))}
      </div>

      {/* 标签筛选 */}
      {tagCloud.length > 0 && (
        <div className="memo-tagbar">
          {tagCloud.map(({ tag, count }) => (
            <button
              key={tag}
              type="button"
              className={`memo-tagbar-chip${activeTag === tag ? " active" : ""}`}
              onClick={() => toggleTag(tag)}
            >
              #{tag}
              <span className="memo-tagbar-count">{count}</span>
            </button>
          ))}
          {activeTag && (
            <button
              type="button"
              className="memo-tagbar-clear"
              onClick={() => setActiveTag(null)}
            >
              清除标签筛选
            </button>
          )}
        </div>
      )}

      {/* 时间线 */}
      {filtered.length === 0 ? (
        <div className="memo-empty">
          {filter === "focus"
            ? "还没有专注随记，去沉浸式专注里记录一条吧"
            : "还没有备忘，写下你的第一条想法"}
        </div>
      ) : (
        <div className="memo-timeline">
          {groups.map(([day, items]) => (
            <section key={day} className="memo-day">
              <div className="memo-day-label">{day}</div>
              <ul className="memo-list">
                {items.map((item) => (
                  <MemoItem
                    key={item.id}
                    item={item}
                    selected={organize.selected.has(item.id)}
                    onToggleSelect={organize.toggleSelect}
                    onUpdate={updateMemo}
                    onRemove={removeMemo}
                    onSetTags={setMemoTags}
                    onTagClick={toggleTag}
                    activeTag={activeTag}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* 选中条目 → 整理成任务 浮动操作条 */}
      {organize.selected.size > 0 && (
        <div className="memo-actionbar">
          <span className="memo-actionbar-text">已选 {organize.selected.size} 条</span>
          <button
            type="button"
            className="memo-actionbar-clear"
            onClick={organize.clearSelection}
          >
            清空
          </button>
          <button
            type="button"
            className="memo-actionbar-go"
            onClick={organize.requestFromSelected}
            disabled={ai.status === "loading"}
          >
            整理成任务
          </button>
        </div>
      )}

      {/* 成功提示 */}
      {organize.savedMsg && (
        <div className="memo-saved" role="status">{organize.savedMsg}</div>
      )}

      {/* AI 评审面板 */}
      {ai.isOpen && (
        <AiTaskModal
          status={ai.status}
          candidates={ai.candidates}
          error={ai.error}
          database={activeDatabase}
          onCommit={handleCommit}
          onClose={ai.close}
        />
      )}
    </div>
  );
}
