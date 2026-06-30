import React, { useMemo, useRef, useState } from "react";
import useMemos from "../../hooks/useMemos";
import useTaskExtraction from "../../hooks/useTaskExtraction";
import AiTaskModal from "./AiTaskModal";
import { useDatabases } from "../../context/DatabaseContext";
import { formatTimestamp, formatSessionDate } from "../../utils/time";
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
  const { timeline, counts, addMemo, updateMemo, removeMemo } = useMemos();
  const { activeDatabase } = useDatabases();
  const ai = useTaskExtraction();

  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const editRef = useRef(null);

  // AI 整理：随手「倒脑子」输入 + 勾选已有条目
  const [dump, setDump] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [savedMsg, setSavedMsg] = useState("");

  const filtered = useMemo(
    () => (filter === "all" ? timeline : timeline.filter((i) => i.source === filter)),
    [timeline, filter],
  );
  const groups = useMemo(() => groupByDay(filtered), [filtered]);

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

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditText(item.text);
    // 等待 textarea 渲染后聚焦
    requestAnimationFrame(() => editRef.current?.focus());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const commitEdit = (id) => {
    if (editText.trim()) updateMemo(id, editText);
    cancelEdit();
  };

  const handleEditKeyDown = (e, id) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      commitEdit(id);
    }
    if (e.key === "Escape") cancelEdit();
  };

  // ── AI 整理成任务 ──────────────────────────────────────────
  const toggleSelect = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleDumpRequest = () => {
    if (!dump.trim()) return;
    ai.request(dump);
  };

  const handleSelectedRequest = () => {
    const text = timeline
      .filter((i) => selected.has(i.id))
      .map((i) => i.text)
      .join("\n");
    if (text.trim()) ai.request(text);
  };

  const handleCommit = (tasks) => {
    const n = ai.commit(tasks);
    setSelected(new Set());
    setDump("");
    if (n > 0) {
      setSavedMsg(`已加入 ${n} 条任务到「${activeDatabase?.name ?? "任务"}」`);
      setTimeout(() => setSavedMsg(""), 3200);
    }
  };

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

      {/* AI 倒脑子 → 任务 */}
      <div className="memo-ai-dump">
        <div className="memo-ai-dump-label">🧠 倒脑子 → AI 帮你拆成任务</div>
        <textarea
          className="memo-ai-dump-input"
          rows={3}
          value={dump}
          onChange={(e) => setDump(e.target.value)}
          placeholder="把脑子里乱糟糟的事情一股脑写下来，AI 会拆成可执行的任务…"
        />
        <button
          type="button"
          className="memo-ai-dump-btn"
          onClick={handleDumpRequest}
          disabled={!dump.trim() || ai.status === "loading"}
        >
          {ai.status === "loading" ? "整理中…" : "AI 整理成任务"}
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
                {items.map((item) => {
                  const isFocus = item.source === "focus";
                  const isEditing = editingId === item.id;
                  const isSelected = selected.has(item.id);
                  return (
                    <li
                      key={item.id}
                      className={`memo-item${isFocus ? " focus" : ""}${isSelected ? " selected" : ""}`}
                    >
                      <div className="memo-item-head">
                        <input
                          type="checkbox"
                          className="memo-select-check"
                          checked={isSelected}
                          onChange={() => toggleSelect(item.id)}
                          title="选中以整理成任务"
                        />
                        <span className={`memo-badge${isFocus ? " focus" : ""}`}>
                          {isFocus ? "⛯ 专注随记" : "✎ 手动"}
                        </span>
                        <span className="memo-item-time">{formatTimestamp(item.ts)}</span>
                        {!isFocus && !isEditing && (
                          <span className="memo-item-actions">
                            <button
                              type="button"
                              className="memo-item-btn"
                              onClick={() => startEdit(item)}
                            >
                              编辑
                            </button>
                            <button
                              type="button"
                              className="memo-item-btn danger"
                              onClick={() => removeMemo(item.id)}
                            >
                              删除
                            </button>
                          </span>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="memo-edit">
                          <textarea
                            ref={editRef}
                            className="memo-edit-input"
                            rows={3}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => handleEditKeyDown(e, item.id)}
                          />
                          <div className="memo-edit-actions">
                            <button
                              type="button"
                              className="memo-edit-save"
                              onClick={() => commitEdit(item.id)}
                              disabled={!editText.trim()}
                            >
                              保存
                            </button>
                            <button type="button" className="memo-edit-cancel" onClick={cancelEdit}>
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="memo-item-text">{item.text}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* 选中条目 → 整理成任务 浮动操作条 */}
      {selected.size > 0 && (
        <div className="memo-actionbar">
          <span className="memo-actionbar-text">已选 {selected.size} 条</span>
          <button
            type="button"
            className="memo-actionbar-clear"
            onClick={() => setSelected(new Set())}
          >
            清空
          </button>
          <button
            type="button"
            className="memo-actionbar-go"
            onClick={handleSelectedRequest}
            disabled={ai.status === "loading"}
          >
            整理成任务
          </button>
        </div>
      )}

      {/* 成功提示 */}
      {savedMsg && <div className="memo-saved" role="status">{savedMsg}</div>}

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
