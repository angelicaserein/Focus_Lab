import React, { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Shuffle, Check, Timer, Plus } from "lucide-react";
import { useTodos } from "@/context/TodoContext";
import { useTaskAttrs, useDatabases } from "@/context/DatabaseContext";
import { useScenarios } from "@/context/ScenarioContext";
import DatabaseTabs from "@/pages/Tasks/DatabaseTabs";
import { formatDate, formatMins, isDuePast } from "@/utils/task/taskAttrUtils";
import TaskCard from "./TaskCard";
import {
  activeDue,
  makeWeightOf,
  bucketTasks,
  pickRightNow,
} from "./taskFlowUtils";
import "@/pages/Tasks/Tasks.css"; // 复用属性徽标 / 弹层 / 日期选择器等样式
import "./FlowTasks.css";

const BUCKET_META = {
  today:    { emoji: "🔴", label: "今天",      hint: "逾期或今天到期，先把它们清掉" },
  upcoming: { emoji: "🗓️", label: "接下来",    hint: "有截止日，还没到" },
  anytime:  { emoji: "🌿", label: "有空再做",  hint: "没排时间，别有压力" },
};

// 「现在就做」卡片里那排只读小徽标：优先级 / 截止 / 预计时长，一眼看清份量。
function HeroChips({ todo, priorityAttr }) {
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
        {overdue ? "⚠ 已逾期 · " : "🗓 "}{formatDate(due)}
      </span>,
    );
  }
  const est = todo.attrs?.estimatedMins;
  if (est) chips.push(<span key="e" className="fc-hero-chip">⏱ {formatMins(est)}</span>);
  return chips.length ? <div className="fc-hero-chips">{chips}</div> : null;
}

export default function FlowTasks() {
  const { todos, addTodo, toggleTodo, editTodo, setTodoAttr, deleteTodo } = useTodos();
  const { taskAttrs } = useTaskAttrs();
  const { activeDatabaseId } = useDatabases();
  const { activeScenario } = useScenarios();

  const [soloMode, setSoloMode] = useState(false);          // 「一次只看一件」专注模式
  const [pinnedId, setPinnedId] = useState(null);           // 手动挑定的「现在就做」
  const [showDone, setShowDone] = useState(false);          // 已完成堆默认收起
  const [newText, setNewText] = useState("");
  const captureRef = useRef(null);

  // 情景筛选：与任务库同口径——默认开，切换情景时恢复默认开。
  const scenarioTypes = activeScenario?.settings?.taskTypes ?? [];
  const hasScenarioFilter = scenarioTypes.length > 0;
  const [scenarioFilterOn, setScenarioFilterOn] = useState(true);
  useEffect(() => { setScenarioFilterOn(true); }, [activeScenario?.id]);

  const visibleAttrs = useMemo(
    () => [...taskAttrs].filter((a) => a.visible).sort((a, b) => a.order - b.order),
    [taskAttrs],
  );
  const priorityAttr = useMemo(
    () => taskAttrs.find((a) => a.id === "priority" && a.type === "select") ?? null,
    [taskAttrs],
  );
  const weightOf = useMemo(() => makeWeightOf(priorityAttr), [priorityAttr]);

  // 当前库的任务，再套情景筛选（保留无标签任务，避免「任务凭空消失」）。
  const scoped = useMemo(() => {
    const dbTodos = todos.filter((t) => (t.databaseId ?? "default") === activeDatabaseId);
    if (!hasScenarioFilter || !scenarioFilterOn) return dbTodos;
    return dbTodos.filter(
      (t) => !(t.attrs?.tags?.length) || t.attrs.tags.some((tag) => scenarioTypes.includes(tag)),
    );
  }, [todos, activeDatabaseId, hasScenarioFilter, scenarioFilterOn, scenarioTypes]);

  const incomplete = useMemo(() => scoped.filter((t) => !t.completed), [scoped]);
  const buckets = useMemo(() => bucketTasks(scoped, weightOf), [scoped, weightOf]);

  const doneCount = buckets.done.length;
  const total = scoped.length;
  const allDone = total > 0 && doneCount === total;

  // 现在就做：优先用手动挑定的那条，失效（完成/删除/被筛掉）则回落到自动挑选。
  const autoPick = useMemo(() => pickRightNow(incomplete, weightOf), [incomplete, weightOf]);
  const rightNow = incomplete.find((t) => t.id === pinnedId) ?? autoPick;

  const shuffle = () => {
    const pool = incomplete.filter((t) => t.id !== rightNow?.id);
    if (!pool.length) return;
    setPinnedId(pool[Math.floor(Math.random() * pool.length)].id);
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
    <div className="flow-page">
      <header className="fc-header">
        <div className="fc-header-main">
          <h1 className="fc-title">
            <Sparkles size={22} strokeWidth={2.5} aria-hidden="true" /> 心流任务
          </h1>
          <p className="fc-subtitle">一次一件，慢慢来，做完一件就是赢。</p>
        </div>
        <button
          type="button"
          className={`fc-solo-toggle${soloMode ? " active" : ""}`}
          onClick={() => setSoloMode((v) => !v)}
        >
          {soloMode ? "显示全部任务" : "一次只看一件"}
        </button>
      </header>

      <DatabaseTabs />

      {hasScenarioFilter && (
        <button
          type="button"
          className={`fc-scenario-pill${scenarioFilterOn ? " active" : ""}`}
          onClick={() => setScenarioFilterOn((v) => !v)}
          title="按当前情景筛选任务"
        >
          {scenarioFilterOn ? "● " : "○ "}正在按「{activeScenario.title}」情景筛选
        </button>
      )}

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
            {allDone ? "🎉 全部搞定，好好休息一下！" : `已完成 ${doneCount} / ${total}`}
          </span>
        </div>
      )}

      {/* 现在就做这一件 —— 反过载的核心：屏蔽其它，只托举一件 */}
      {rightNow ? (
        <section className="fc-hero">
          <div className="fc-hero-eyebrow">现在就做这一件</div>
          <div className="fc-hero-title">{rightNow.text}</div>
          <HeroChips todo={rightNow} priorityAttr={priorityAttr} />
          <div className="fc-hero-actions">
            <button
              type="button"
              className="fc-hero-btn primary"
              onClick={() => { toggleTodo(rightNow.id); setPinnedId(null); }}
            >
              <Check size={18} strokeWidth={2.5} aria-hidden="true" /> 搞定
            </button>
            <button type="button" className="fc-hero-btn" onClick={shuffle} disabled={incomplete.length < 2}>
              <Shuffle size={17} aria-hidden="true" /> 换一个
            </button>
            <Link to="/focus" className="fc-hero-btn">
              <Timer size={17} aria-hidden="true" /> 去专注
            </Link>
          </div>
        </section>
      ) : (
        <section className="fc-hero empty">
          <div className="fc-hero-title">{total === 0 ? "还没有任务" : "🎉 没有待办了"}</div>
          <p className="fc-hero-empty-hint">
            {total === 0 ? "把脑子里的事写下来，从第一件开始。" : "全部完成，去做点喜欢的事吧。"}
          </p>
        </section>
      )}

      {/* 快速捕获：随时把闪过的念头倒出来，减少「记不住」的心理负担 */}
      <div className="fc-capture">
        <Plus size={18} aria-hidden="true" className="fc-capture-icon" />
        <input
          ref={captureRef}
          className="fc-capture-input"
          placeholder="脑子里还装着什么？写下来清空它…"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={onCaptureKey}
        />
        {newText.trim() && (
          <button type="button" className="fc-capture-btn" onClick={capture}>添加</button>
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
                    {meta.label}
                    <span className="fc-bucket-count">{list.length}</span>
                  </span>
                  <span className="fc-bucket-hint">{meta.hint}</span>
                </div>
                <div className="fc-bucket-list">
                  {list.map((todo) => (
                    <TaskCard
                      key={todo.id}
                      todo={todo}                      {...cardProps}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {doneCount > 0 && (
            <section className="fc-bucket">
              <button type="button" className="fc-done-toggle" onClick={() => setShowDone((v) => !v)}>
                ✅ 已完成 <span className="fc-bucket-count">{doneCount}</span>
                <span className="fc-done-caret">{showDone ? "收起" : "展开"}</span>
              </button>
              {showDone && (
                <div className="fc-bucket-list">
                  {buckets.done.map((todo) => (
                    <TaskCard
                      key={todo.id}
                      todo={todo}                      {...cardProps}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {incomplete.length === 0 && doneCount === 0 && (
            <div className="fc-empty">这个库还空着，用上面的输入框加一件事吧。</div>
          )}
        </div>
      )}
    </div>
  );
}
