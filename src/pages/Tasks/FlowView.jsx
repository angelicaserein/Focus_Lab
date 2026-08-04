import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shuffle, Check, Timer, Plus, RotateCcw } from "lucide-react";
import { useTodos } from "@/context/TodoContext";
import { useFocus } from "@/context/FocusContext";
import { useLanguage } from "@/context/LanguageContext";
import { formatDate, formatMins, isDuePast } from "@/utils/task/taskAttrUtils";
import TaskCard from "@/pages/Tasks/TaskCard";
import {
  activeDue,
  makeWeightOf,
  bucketTasks,
  stickyBuckets,
  pickRightNow,
} from "@/pages/Tasks/taskFlowUtils";
import "./FlowView.css";

// 三个分堆的图标与文案键（标题 / 副标题都走 i18n）
const BUCKET_META = {
  today:    { emoji: "🔴", label: "flow.bucket.today",    hint: "flow.bucket.todayHint" },
  upcoming: { emoji: "🗓️", label: "flow.bucket.upcoming", hint: "flow.bucket.upcomingHint" },
  anytime:  { emoji: "🌿", label: "flow.bucket.anytime",  hint: "flow.bucket.anytimeHint" },
};

// 「现在就做」卡片里那排只读小徽标：优先级 / 截止 / 预计时长，一眼看清份量。
function HeroChips({ todo, priorityAttr, t }) {
  const chips = [];
  const pOpt = priorityAttr?.options?.find((o) => o.id === todo.attrs?.priority);
  if (pOpt) {
    chips.push(
      <span key="p" className="fc-hero-chip" style={{ "--badge-color": pOpt.color }}>
        {pOpt.label}
      </span>,
    );
  }
  const due = activeDue(todo);
  if (due) {
    const overdue = isDuePast(due) && !todo.completed;
    chips.push(
      <span key="d" className={`fc-hero-chip due${overdue ? " overdue" : ""}`}>
        {overdue ? t("flow.overdue") : "🗓 "}{formatDate(due)}
      </span>,
    );
  }
  const est = todo.attrs?.estimatedMins;
  if (est) chips.push(<span key="e" className="fc-hero-chip">⏱ {formatMins(est)}</span>);
  return chips.length ? <div className="fc-hero-chips">{chips}</div> : null;
}

/**
 * 分堆并「冻结」卡片位置：改属性、勾完成都不该让卡片当场换堆乱跳，
 * 位置只在换库 / 换筛选（scopeKey 变）或用户点「整理一下」时才重排。
 */
function useStickyBuckets(todos, weightOf, scopeKey) {
  const placementRef = useRef(new Map());
  const [tidyNonce, setTidyNonce] = useState(0);
  const resetKey = `${scopeKey}|${tidyNonce}`;
  const lastResetRef = useRef(resetKey);

  // 渲染期同步清空落位：换库/换筛选后要立刻按新数据重排，不能等 effect 慢一帧。
  if (lastResetRef.current !== resetKey) {
    lastResetRef.current = resetKey;
    placementRef.current = new Map();
  }

  const buckets = useMemo(() => {
    const res = stickyBuckets(bucketTasks(todos, weightOf), placementRef.current);
    placementRef.current = res.placement;
    return res.buckets;
    // resetKey 也是依赖：清空落位后要立刻重算
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todos, weightOf, resetKey]);

  return [buckets, () => setTidyNonce((n) => n + 1)];
}

/**
 * 心流视图：任务库的 ADHD 友好版排布——托举一件 hero + 三堆宽松卡片。
 * 数据（当前库 / 情景 / 搜索筛选排序）由任务库页面统一算好后传进来，
 * 所以两个视图看到的永远是同一批任务。
 */
export default function FlowView({ todos, visibleAttrs, priorityAttr, activeDatabaseId, scopeKey }) {
  const { addTodo, toggleTodo, editTodo, setTodoAttr, deleteTodo } = useTodos();
  const { addFocusTodo } = useFocus();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [soloMode, setSoloMode] = useState(false);          // 「一次只看一件」专注模式
  const [heroId, setHeroId] = useState(null);               // 当前托举的那一件
  const [showDone, setShowDone] = useState(false);          // 已完成堆默认收起
  const [newText, setNewText] = useState("");
  const captureRef = useRef(null);

  const weightOf = useMemo(() => makeWeightOf(priorityAttr), [priorityAttr]);
  const incomplete = useMemo(() => todos.filter((t) => !t.completed), [todos]);
  const [buckets, tidy] = useStickyBuckets(todos, weightOf, scopeKey);

  const doneCount = useMemo(() => todos.filter((t) => t.completed).length, [todos]);
  const total = todos.length;
  const allDone = total > 0 && doneCount === total;

  // 现在就做：定住不动。只有这件被完成 / 删除 / 筛掉，或用户点「换一个」时才换人——
  // 否则随手改个属性都会让 hero 跳到别的任务上，注意力当场断掉。
  const pinned = incomplete.find((t) => t.id === heroId) ?? null;
  const autoPick = useMemo(() => pickRightNow(incomplete, weightOf), [incomplete, weightOf]);
  const hero = pinned ?? autoPick ?? null;
  useEffect(() => {
    if (!pinned && autoPick) setHeroId(autoPick.id);
  }, [pinned, autoPick]);

  const shuffle = () => {
    const pool = incomplete.filter((t) => t.id !== hero?.id);
    if (!pool.length) return;
    setHeroId(pool[Math.floor(Math.random() * pool.length)].id);
  };

  // 「去专注」把这件任务一起带过去：到专注页它已是选中状态，不用再挑一遍。
  const goFocus = () => {
    if (hero) addFocusTodo(hero.id);
    navigate("/focus");
  };

  const capture = () => {
    const t = newText.trim();
    if (!t) return;
    addTodo(t, { databaseId: activeDatabaseId });
    setNewText("");
    captureRef.current?.focus();
  };
  const onCaptureKey = (e) => {
    if (e.key === "Enter") capture();
    if (e.key === "Escape") setNewText("");
  };

  const cardProps = {
    visibleAttrs,
    onToggle: toggleTodo,
    onEditText: editTodo,
    onSaveAttr: setTodoAttr,
    onDelete: deleteTodo,
  };

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
          <button
            type="button"
            className={`fc-solo-toggle${soloMode ? " active" : ""}`}
            onClick={() => setSoloMode((v) => !v)}
          >
            {soloMode ? t("flow.soloOff") : t("flow.soloOn")}
          </button>
        </div>
      )}

      {/* 现在就做这一件 —— 反过载的核心：屏蔽其它，只托举一件 */}
      {hero ? (
        <section className="fc-hero">
          <div className="fc-hero-eyebrow">{t("flow.heroEyebrow")}</div>
          <div className="fc-hero-title">{hero.text}</div>
          <HeroChips todo={hero} priorityAttr={priorityAttr} t={t} />
          <div className="fc-hero-actions">
            <button
              type="button"
              className="fc-hero-btn primary"
              onClick={() => { toggleTodo(hero.id); setHeroId(null); }}
            >
              <Check size={18} strokeWidth={2.5} aria-hidden="true" /> {t("flow.heroDone")}
            </button>
            <button type="button" className="fc-hero-btn" onClick={shuffle} disabled={incomplete.length < 2}>
              <Shuffle size={17} aria-hidden="true" /> {t("flow.heroShuffle")}
            </button>
            <button type="button" className="fc-hero-btn" onClick={goFocus}>
              <Timer size={17} aria-hidden="true" /> {t("flow.heroFocus")}
            </button>
          </div>
        </section>
      ) : (
        <section className="fc-hero empty">
          <div className="fc-hero-title">
            {total === 0 ? t("flow.emptyNoTasks") : t("flow.emptyAllDone")}
          </div>
          <p className="fc-hero-empty-hint">
            {total === 0 ? t("flow.emptyNoTasksHint") : t("flow.emptyAllDoneHint")}
          </p>
        </section>
      )}

      {/* 快速捕获：随时把闪过的念头倒出来，减少「记不住」的心理负担 */}
      <div className="fc-capture">
        <Plus size={18} aria-hidden="true" className="fc-capture-icon" />
        <input
          ref={captureRef}
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

      {/* 专注模式下只保留上面的「现在就做」+ 捕获框，其余分堆全部隐去 */}
      {!soloMode && (
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
                <div className="fc-bucket-list">
                  {list.map((todo) => (
                    <TaskCard key={todo.id} todo={todo} {...cardProps} />
                  ))}
                </div>
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
                <div className="fc-bucket-list">
                  {buckets.done.map((todo) => (
                    <TaskCard key={todo.id} todo={todo} {...cardProps} />
                  ))}
                </div>
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
      )}
    </div>
  );
}
