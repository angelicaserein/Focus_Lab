import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Plus, RotateCcw } from "lucide-react";
import { useTodos } from "@/context/TodoContext";
import { useLanguage } from "@/context/LanguageContext";
import TaskCard from "@/pages/Tasks/TaskCard";
import {
  makeWeightOf,
  bucketTasks,
  stickyBuckets,
} from "@/pages/Tasks/taskFlowUtils";
import "./FlowView.css";

// 三个分堆的图标与文案键（标题 / 副标题都走 i18n）
const BUCKET_META = {
  today:    { emoji: "🔴", label: "flow.bucket.today",    hint: "flow.bucket.todayHint" },
  upcoming: { emoji: "🗓️", label: "flow.bucket.upcoming", hint: "flow.bucket.upcomingHint" },
  anytime:  { emoji: "🌿", label: "flow.bucket.anytime",  hint: "flow.bucket.anytimeHint" },
};

/**
 * 分堆并「冻结」卡片位置：改属性不该让卡片当场换堆乱跳，
 * 位置只在换库 / 换筛选（scopeKey 变）、用户点「整理一下」，
 * 或某一张被 settle() 显式放行（勾完成 / 取消勾）时才变。
 */
function useStickyBuckets(todos, weightOf, scopeKey) {
  const placementRef = useRef(new Map());
  const [tidyNonce, setTidyNonce] = useState(0);
  const [settleNonce, setSettleNonce] = useState(0);
  // 后勾完的排在先勾完的后面：递增序号即可，不必给任务加 completedAt 字段
  const doneTailRef = useRef(1e6);
  const resetKey = `${scopeKey}|${tidyNonce}`;
  const lastResetRef = useRef(resetKey);

  // 渲染期同步清空落位：换库/换筛选后要立刻按新数据重排，不能等 effect 慢一帧。
  if (lastResetRef.current !== resetKey) {
    lastResetRef.current = resetKey;
    placementRef.current = new Map();
    doneTailRef.current = 1e6;
  }

  const buckets = useMemo(() => {
    const res = stickyBuckets(bucketTasks(todos, weightOf), placementRef.current);
    placementRef.current = res.placement;
    return res.buckets;
    // resetKey / settleNonce 也是依赖：落位表被改过就要立刻重算
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todos, weightOf, resetKey, settleNonce]);

  /** 放行一张卡：勾完成的落到「已完成」堆末尾，取消勾的回到它数据上该在的位置。 */
  const settle = useCallback((id, done) => {
    if (done) placementRef.current.set(id, { bucket: "done", index: doneTailRef.current++ });
    else placementRef.current.delete(id);
    setSettleNonce((n) => n + 1);
  }, []);

  return [buckets, () => setTidyNonce((n) => n + 1), settle];
}

// 勾完 → 卡片就地收起 → 归位到「已完成」堆。两段之间隔一个动画时长，
// 手指底下那张卡才不会瞬移，注意力跟得上。与 .fc-slot 的过渡时长一致。
const SINK_MS = 300;

/**
 * 心流视图：任务库的 ADHD 友好版排布——三堆宽松卡片 + 快速捕获。
 * 数据（当前库 / 情景 / 搜索筛选排序）由任务库页面统一算好后传进来，
 * 所以两个视图看到的永远是同一批任务。
 */
export default function FlowView({ todos, visibleAttrs, priorityAttr, activeDatabaseId, scopeKey, highlightId }) {
  const { addTodo, toggleTodo, editTodo, setTodoAttr, deleteTodo, toggleRecurring } = useTodos();
  const { t } = useLanguage();

  const [showDone, setShowDone] = useState(false);          // 已完成堆默认收起
  const [newText, setNewText] = useState("");
  const captureRef = useRef(null);

  const weightOf = useMemo(() => makeWeightOf(priorityAttr), [priorityAttr]);
  const [buckets, tidy, settle] = useStickyBuckets(todos, weightOf, scopeKey);

  // 正在「收起 → 归位」途中的卡片：先加类播完动画，再真正换堆。
  const [leaving, setLeaving] = useState(() => new Set());
  const timersRef = useRef(new Map());
  useEffect(() => {
    const timers = timersRef.current;
    return () => { timers.forEach(clearTimeout); timers.clear(); };
  }, []);

  // 收起动画跑完再干活的公共壳：勾完成、删除都要先让卡片平滑退场。
  const runAfterSink = useCallback((id, done) => {
    clearTimeout(timersRef.current.get(id));
    setLeaving((prev) => new Set(prev).add(id));
    timersRef.current.set(id, setTimeout(() => {
      timersRef.current.delete(id);
      done();
      setLeaving((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, SINK_MS));
  }, []);

  const handleToggle = useCallback((id, nextDone) => {
    toggleTodo(id);
    runAfterSink(id, () => settle(id, nextDone));
  }, [toggleTodo, settle, runAfterSink]);

  // 删除同理：卡片先收起来再真正删掉，不是「点一下整列往上蹦一格」。
  const handleDelete = useCallback(
    (id) => runAfterSink(id, () => deleteTodo(id)),
    [deleteTodo, runAfterSink],
  );

  // 跨页搜索定位到一件已完成的任务时，把已完成堆展开——它默认折叠，
  // 不展开的话卡片根本没渲染，滚过去和高亮都落空。
  useEffect(() => {
    if (!highlightId) return;
    const target = todos.find((t) => t.id === highlightId);
    if (target?.completed) setShowDone(true);
  }, [highlightId, todos]);

  const doneCount = useMemo(() => todos.filter((t) => t.completed).length, [todos]);
  const total = todos.length;
  const allDone = total > 0 && doneCount === total;

  const capture = () => {
    const text = newText.trim();
    if (!text) return;
    addTodo(text, { databaseId: activeDatabaseId });
    setNewText("");
    captureRef.current?.focus();
  };
  const onCaptureKey = (e) => {
    if (e.key === "Enter") capture();
    if (e.key === "Escape") setNewText("");
  };

  // memo 化：TaskCard 是 React.memo，props 每次新建的话整堆卡片会跟着白重渲染一遍
  const cardProps = useMemo(() => ({
    visibleAttrs,
    onToggle: handleToggle,
    onEditText: editTodo,
    onSaveAttr: setTodoAttr,
    onDelete: handleDelete,
    onSetRecurring: toggleRecurring,
  }), [visibleAttrs, handleToggle, handleDelete, editTodo, setTodoAttr, toggleRecurring]);

  // 卡片外面套一层「槽」：离场时把槽的高度收到 0，下面的卡片才是滑上来而不是瞬移。
  const renderCard = (todo) => (
    <div key={todo.id} className={`fc-slot${leaving.has(todo.id) ? " leaving" : ""}`}>
      <TaskCard todo={todo} {...cardProps} />
    </div>
  );

  return (
    <div className="flow-view">
      {/* 进度条：温和的正反馈，只报喜不评判 */}
      {total > 0 && (
        <div className="fc-progress">
          <div className="fc-progress-track">
            <div
              className="fc-progress-fill"
              style={{ width: `${Math.round((doneCount / total) * 100)}%` }}
            />
          </div>
          <span className="fc-progress-label">
            {allDone
              ? t("flow.allDone")
              : t("todo.stats", { done: doneCount, total })}
          </span>
        </div>
      )}

      {/* 一件未完成的都没有时给句落脚的话，别是一片空白 */}
      {doneCount === total && (
        <section className="fc-empty">
          <div className="fc-empty-title">
            {total === 0 ? t("flow.emptyNoTasks") : t("flow.emptyAllDone")}
          </div>
          <p className="fc-empty-hint">
            {total === 0 ? t("flow.emptyNoTasksHint") : t("flow.emptyAllDoneHint")}
          </p>
        </section>
      )}

      {/* 快速捕获：随时把闪过的念头倒出来，减少「记不住」的心理负担 */}
      <div className="fc-capture">
        <Plus size={18} aria-hidden="true" className="fc-capture-icon" />
        {/* data-compose-target：命令面板的「新建任务」跳进来时，光标直接落在这儿 */}
        <input
          ref={captureRef}
          data-compose-target=""
          className="fc-capture-input"
          placeholder={t("flow.capturePlaceholder")}
          aria-label={t("flow.capturePlaceholder")}
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={onCaptureKey}
        />
        {newText.trim() && (
          <button type="button" className="fc-capture-btn" onClick={capture}>
            {t("todo.form.add")}
          </button>
        )}
      </div>

      <div className="fc-buckets">
        {["today", "upcoming", "anytime"].map((key) => {
          const list = buckets[key];
          if (!list.length) return null;
          const meta = BUCKET_META[key];
          return (
            <section key={key} className="fc-bucket">
              <div className="fc-bucket-head">
                <span className="fc-bucket-title">
                  <span className="fc-bucket-emoji">{meta.emoji}</span>
                  {t(meta.label)}
                  <span className="fc-bucket-count">{list.length}</span>
                </span>
                <span className="fc-bucket-hint">{t(meta.hint)}</span>
              </div>
              <div className="fc-bucket-list">{list.map(renderCard)}</div>
            </section>
          );
        })}

        {buckets.done.length > 0 && (
          <section className="fc-bucket">
            <button type="button" className="fc-done-toggle" onClick={() => setShowDone((v) => !v)}>
              {t("flow.bucket.done")} <span className="fc-bucket-count">{buckets.done.length}</span>
              <span className="fc-done-caret">{showDone ? t("flow.collapse") : t("flow.expand")}</span>
            </button>
            {showDone && (
              <div className="fc-bucket-list">{buckets.done.map(renderCard)}</div>
            )}
          </section>
        )}

        {/* 勾完的卡片留在原位不乱跳；攒够了想收干净时点这里重排 */}
        {total > 0 && (
          <button type="button" className="fc-tidy" onClick={tidy}>
            <RotateCcw size={14} aria-hidden="true" /> {t("flow.tidy")}
          </button>
        )}
      </div>
    </div>
  );
}
