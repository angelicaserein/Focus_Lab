import React, { useMemo, useState } from "react";
import { useTodos } from "../../context/TodoContext";
import { useDDL } from "../../context/DDLContext";
import { getDaysUntil } from "../../utils/time";
import {
  countdownLabel,
  countdownClass,
  formatDueDate,
  isCheckpointDue,
  collectDueReminders,
  isActiveDeadline,
} from "../../utils/ddlUtils";
import DDLDebugPanel from "./DDLDebugPanel";
import "./DDLReminders.css";

const QUICK_DAYS = [1, 3, 7, 14, 30];

// ── 添加节点表单 ──────────────────────────────────────────────────────────────
function AddCheckpointForm({ todoId, dueDate, onClose }) {
  const { addCheckpoint } = useDDL();
  const [days, setDays] = useState("");
  const [message, setMessage] = useState("");

  const maxDays = useMemo(() => {
    const d = getDaysUntil(dueDate);
    return d !== null ? Math.max(d + 30, 30) : 365;
  }, [dueDate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const d = parseInt(days, 10);
    if (!d || d < 1 || !message.trim()) return;
    addCheckpoint(todoId, { daysBeforeDeadline: d, message });
    setDays("");
    setMessage("");
    onClose();
  };

  return (
    <form className="ddl-add-form" onSubmit={handleSubmit}>
      <div className="ddl-add-form-row">
        <div className="ddl-add-days-wrap">
          <span className="ddl-add-prefix">提前</span>
          <input
            className="ddl-add-days"
            type="number"
            min={1}
            max={maxDays}
            placeholder="7"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
          <span className="ddl-add-suffix">天提醒</span>
        </div>
        <div className="ddl-quick-days">
          {QUICK_DAYS.map((d) => (
            <button
              key={d}
              type="button"
              className={`ddl-quick-btn${days === String(d) ? " active" : ""}`}
              onClick={() => setDays(String(d))}
            >
              {d}天
            </button>
          ))}
        </div>
      </div>
      <div className="ddl-add-form-row">
        <input
          className="ddl-add-msg"
          type="text"
          placeholder="提醒内容，如：完成初稿"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={80}
          autoFocus
        />
      </div>
      <div className="ddl-add-form-actions">
        <button type="submit" className="ddl-save-btn" disabled={!days || !message.trim()}>
          保存
        </button>
        <button type="button" className="ddl-cancel-btn" onClick={onClose}>
          取消
        </button>
      </div>
    </form>
  );
}

// ── 单个检查点行 ─────────────────────────────────────────────────────────────
function CheckpointRow({ todoId, cp, daysLeft }) {
  const { deleteCheckpoint, toggleCheckpointDone } = useDDL();
  const isDue = isCheckpointDue(cp, daysLeft);

  return (
    <div className={`ddl-cp${cp.done ? " done" : ""}${isDue ? " due" : ""}`}>
      <button
        className="ddl-cp-check"
        onClick={() => toggleCheckpointDone(todoId, cp.id)}
        title={cp.done ? "标记为未完成" : "标记为完成"}
      >
        {cp.done ? "✓" : "○"}
      </button>
      <span className="ddl-cp-days">{cp.daysBeforeDeadline}天前</span>
      <span className="ddl-cp-msg">{cp.message}</span>
      <button
        className="ddl-cp-del"
        onClick={() => deleteCheckpoint(todoId, cp.id)}
        title="删除节点"
      >
        ×
      </button>
    </div>
  );
}

// ── 任务卡片 ─────────────────────────────────────────────────────────────────
function DDLCard({ todo }) {
  const { getCheckpoints } = useDDL();
  const [showForm, setShowForm] = useState(false);

  const daysLeft = getDaysUntil(todo.attrs?.dueDate);
  const checkpoints = getCheckpoints(todo.id);
  // 按 daysBeforeDeadline 降序（最远提醒在上）
  const sortedCps = useMemo(
    () => [...checkpoints].sort((a, b) => b.daysBeforeDeadline - a.daysBeforeDeadline),
    [checkpoints]
  );

  return (
    <div className={`ddl-card${daysLeft !== null && daysLeft < 0 ? " card-overdue" : ""}`}>
      <div className="ddl-card-header">
        <span className="ddl-card-title">{todo.text}</span>
        <div className="ddl-card-meta">
          <span className="ddl-card-date">{formatDueDate(todo.attrs?.dueDate)}</span>
          <span className={`ddl-countdown ${countdownClass(daysLeft)}`}>
            {countdownLabel(daysLeft)}
          </span>
        </div>
      </div>

      {sortedCps.length > 0 && (
        <div className="ddl-checkpoints">
          {sortedCps.map((cp) => (
            <CheckpointRow key={cp.id} todoId={todo.id} cp={cp} daysLeft={daysLeft} />
          ))}
        </div>
      )}

      {showForm ? (
        <AddCheckpointForm
          todoId={todo.id}
          dueDate={todo.attrs?.dueDate}
          onClose={() => setShowForm(false)}
        />
      ) : (
        <button className="ddl-add-cp-btn" onClick={() => setShowForm(true)}>
          + 添加提醒节点
        </button>
      )}
    </div>
  );
}

// ── 今日提醒区块 ─────────────────────────────────────────────────────────────
function TodayReminders({ items }) {
  const { toggleCheckpointDone } = useDDL();
  if (items.length === 0) return null;

  return (
    <div className="ddl-today">
      <div className="ddl-today-hd">
        <span className="ddl-today-icon">⚠</span>
        <span className="ddl-today-title">今日提醒</span>
        <span className="ddl-today-count">{items.length} 条</span>
      </div>
      <div className="ddl-today-list">
        {items.map(({ todo, checkpoint, daysLeft }) => (
          <div key={checkpoint.id} className="ddl-today-item">
            <button
              className="ddl-today-check"
              onClick={() => toggleCheckpointDone(todo.id, checkpoint.id)}
              title="标记为完成"
            >
              ○
            </button>
            <div className="ddl-today-content">
              <span className="ddl-today-task">{todo.text}</span>
              <span className="ddl-today-sep">→</span>
              <span className="ddl-today-msg">{checkpoint.message}</span>
            </div>
            <span className={`ddl-countdown ${countdownClass(daysLeft)}`}>
              {countdownLabel(daysLeft)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────────────────
export default function DDLRemindersPage() {
  const { todos } = useTodos();
  const { checkpointsMap } = useDDL();

  const todosWithDueDate = useMemo(
    () =>
      todos
        .filter((t) => !t.completed && isActiveDeadline(t))
        .sort((a, b) => a.attrs.dueDate.localeCompare(b.attrs.dueDate)),
    [todos]
  );

  const todaysReminders = useMemo(
    () => collectDueReminders(todosWithDueDate, checkpointsMap),
    [todosWithDueDate, checkpointsMap]
  );

  const pendingCount = todaysReminders.length;

  return (
    <div className="ddl-page">
      <div className="ddl-header">
        <h1 className="ddl-title">DDL 提醒</h1>
        <p className="ddl-subtitle">
          {todosWithDueDate.length > 0
            ? `${todosWithDueDate.length} 个截止任务${pendingCount > 0 ? `，${pendingCount} 条今日提醒` : ""}`
            : "任务库中还没有设置截止日期的任务"}
        </p>
      </div>

      {todosWithDueDate.length === 0 ? (
        <div className="ddl-empty">
          <div className="ddl-empty-icon">📋</div>
          <div className="ddl-empty-text">
            在任务库中为任务设置截止日期后，<br />
            这里会自动显示提醒管理。
          </div>
        </div>
      ) : (
        <>
          <TodayReminders items={todaysReminders} />
          <div className="ddl-list">
            {todosWithDueDate.map((todo) => (
              <DDLCard key={todo.id} todo={todo} />
            ))}
          </div>
        </>
      )}

      {import.meta.env.DEV && <DDLDebugPanel />}
    </div>
  );
}
