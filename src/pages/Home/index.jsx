import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useFocus } from "../../context/FocusContext";
import { useTodos } from "../../context/TodoContext";
import { useReward } from "../../context/RewardContext";
import { computeFocusStats } from "../../utils/focusRecords";
import { formatDuration } from "../../utils/time";
import "./Home.css";

function getGreeting(todaySecs) {
  if (todaySecs === 0) return "今天还没开始，试试 5 分钟？";
  if (todaySecs < 300) return "刚起步，继续加油！";
  if (todaySecs < 1800) return `已专注 ${formatDuration(todaySecs)}，不错！`;
  return `今天专注 ${formatDuration(todaySecs)}，太棒了！`;
}

export default function Home() {
  const { focusRecords } = useFocus();
  const { todos } = useTodos();
  const { coins } = useReward();
  const navigate = useNavigate();

  const stats = useMemo(() => computeFocusStats(focusRecords), [focusRecords]);
  const activeTasks = todos.filter((t) => !t.completed).length;

  return (
    <main className="page page-home">
      <div className="home-greeting">
        <h1 className="home-greeting-title">你好 👋</h1>
        <p className="home-greeting-sub">{getGreeting(stats.todaySecs)}</p>
      </div>

      <div className="home-stats-grid">
        <div className="home-stat-card home-stat-focus">
          <div className="home-stat-value">
            {stats.todaySecs > 0 ? formatDuration(stats.todaySecs) : "—"}
          </div>
          <div className="home-stat-label">今日专注</div>
        </div>

        <div className="home-stat-card">
          <div className="home-stat-value">{activeTasks}</div>
          <div className="home-stat-label">待办任务</div>
        </div>

        <div className="home-stat-card">
          <div className="home-stat-value">
            <span className="home-stat-coin-icon">🪙</span>
            {coins}
          </div>
          <div className="home-stat-label">金币余额</div>
        </div>
      </div>

      <button
        className="home-quickstart"
        onClick={() => navigate("/focus")}
      >
        ▶ 开始专注
      </button>
    </main>
  );
}
