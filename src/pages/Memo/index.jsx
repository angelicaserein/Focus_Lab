import React, { useMemo, useState } from "react";
import useMemos from "@/hooks/useMemos";
import useHighlightTarget from "@/hooks/common/useHighlightTarget";
import useTaskExtraction from "@/hooks/task/useTaskExtraction";
import AiTaskModal from "@/pages/Memo/AiTaskModal";
import MemoItem from "@/pages/Memo/MemoItem";
import Toast from "@/components/ui/Toast";
import useMemoAiOrganize from "@/pages/Memo/useMemoAiOrganize";
import ClarifyPanel from "@/pages/Tasks/ClarifyPanel";
import { collectTags, itemHasTag } from "@/pages/Memo/memoTags";
import { useDatabases } from "@/context/DatabaseContext";
import { useLanguage } from "@/context/LanguageContext";
import { formatSessionDate } from "@/utils/time";
import "./Memo.css";

// labelKey 交给页面 t()，别在这层写死中文
const FILTERS = [
  { key: "all", labelKey: "memo.filter.all" },
  { key: "memo", labelKey: "memo.filter.memo" },
  { key: "focus", labelKey: "memo.filter.focus" },
];

// 按自然日分组，返回 [dayLabel, items][]（items 已按时间倒序）
// 分组标题就是本地化后的日期串，故 lang 要一路传进来
function groupByDay(items, lang) {
  const groups = [];
  const index = new Map();
  for (const item of items) {
    const label = formatSessionDate(item.ts, lang);
    if (!index.has(label)) {
      index.set(label, groups.length);
      groups.push([label, []]);
    }
    groups[index.get(label)][1].push(item);
  }
  return groups;
}

export default function MemoPage() {
  const {
    timeline, counts, addMemo, updateMemo, removeMemo, setMemoTags, pendingUndo, undoLast,
  } = useMemos();
  const { activeDatabase } = useDatabases();
  const { t, lang } = useLanguage();
  const ai = useTaskExtraction();
  const organize = useMemoAiOrganize({ timeline, ai, activeDatabase, t });

  // 跨页搜索点进来时，把那一条滚进视野并短暂高亮
  useHighlightTarget();

  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState("all");
  const [activeTag, setActiveTag] = useState(null);

  const tagCloud = useMemo(() => collectTags(timeline), [timeline]);

  const filtered = useMemo(() => {
    let list = filter === "all" ? timeline : timeline.filter((i) => i.source === filter);
    if (activeTag) list = list.filter((i) => itemHasTag(i, activeTag));
    return list;
  }, [timeline, filter, activeTag]);
  const groups = useMemo(() => groupByDay(filtered, lang), [filtered, lang]);

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
        <h1>{t("memo.title")}</h1>
        <p className="memo-subtitle">{t("memo.subtitle")}</p>
      </div>

      {/* 新建备忘 */}
      <div className="memo-compose">
        {/* data-compose-target：命令面板的「记一条随记」跳进来时光标直接落在这儿 */}
        <textarea
          data-compose-target=""
          className="memo-compose-input"
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleDraftKeyDown}
          placeholder={t("memo.composePlaceholder")}
        />
        <button
          type="button"
          className="memo-compose-add"
          onClick={handleAdd}
          disabled={!draft.trim()}
        >
          {t("memo.add")}
        </button>
      </div>

      {/* 筛选 */}
      <div className="memo-filters">
        {FILTERS.map(({ key, labelKey }) => (
          <button
            key={key}
            type="button"
            className={`memo-filter-chip${filter === key ? " active" : ""}`}
            onClick={() => setFilter(key)}
          >
            {t(labelKey)}
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
              {t("memo.clearTagFilter")}
            </button>
          )}
        </div>
      )}

      {/* 时间线 */}
      {filtered.length === 0 ? (
        <div className="memo-empty">
          {filter === "focus" ? t("memo.emptyFocus") : t("memo.empty")}
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
          <span className="memo-actionbar-text">
            {t("memo.selectedCount", { count: organize.selected.size })}
          </span>
          <button
            type="button"
            className="memo-actionbar-clear"
            onClick={organize.clearSelection}
          >
            {t("memo.clearSelection")}
          </button>
          <button
            type="button"
            className="memo-actionbar-go"
            onClick={organize.requestFromSelected}
            disabled={ai.status === "loading"}
          >
            {t("memo.organize")}
          </button>
        </div>
      )}

      {/* 成功提示 */}
      {organize.savedMsg && (
        <div className="memo-saved" role="status">{organize.savedMsg}</div>
      )}

      {/* 设置页开了「先反问」且模型确实有要问的时候，先插一屏反问（跟倒脑子同一条链路）。
          少了这屏的话 status 会停在 asking，而 AiTaskModal 不认这个状态，只会弹一个空壳。 */}
      {ai.status === "asking" && (
        <ClarifyPanel
          questions={ai.questions}
          onSubmit={ai.answer}
          onSkip={() => ai.answer([])}
          onClose={ai.close}
        />
      )}

      {/* 删错一条能立刻捡回来——没有这个 toast 的话，那份撤销能力就没有入口 */}
      <Toast pending={pendingUndo} undo={undoLast} getText={(item) => item.text} />

      {/* AI 评审面板 */}
      {ai.isOpen && ai.status !== "asking" && (
        <AiTaskModal
          status={ai.status}
          candidates={ai.candidates}
          error={ai.error}
          database={activeDatabase}
          clarifySkipped={ai.clarifySkipped}
          onRefine={ai.refine}
          onCommit={handleCommit}
          onClose={ai.close}
        />
      )}
    </div>
  );
}
