import React, { useState, useEffect } from "react";
import { useTodos } from "../../context/TodoContext";
import "./RandomTaskDrawer.css";

const MAX_REDRAWS = 2;

function pickRandom(pool, excludeId = null) {
  const candidates = excludeId ? pool.filter((t) => t.id !== excludeId) : pool;
  const src = candidates.length > 0 ? candidates : pool;
  return src[Math.floor(Math.random() * src.length)];
}

export default function RandomTaskDrawer({ onSelect, onClose }) {
  const { todos } = useTodos();
  const activeTodos = todos.filter((t) => !t.completed);

  const [redraws, setRedraws] = useState(0);
  const [current, setCurrent] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (activeTodos.length === 0) return;
    setCurrent(pickRandom(activeTodos));
    const t = setTimeout(() => setFlipped(true), 180);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleRedraw = () => {
    if (animating || redraws >= MAX_REDRAWS) return;
    setAnimating(true);
    setFlipped(false);
    setTimeout(() => {
      setCurrent(pickRandom(activeTodos, current?.id));
      setRedraws((n) => n + 1);
      setFlipped(true);
      setTimeout(() => setAnimating(false), 460);
    }, 420);
  };

  const handleSelect = (todo) => {
    onSelect(todo);
    onClose();
  };

  const exhausted = redraws >= MAX_REDRAWS;
  const shortestTodo =
    activeTodos.length > 0
      ? [...activeTodos].sort((a, b) => a.text.length - b.text.length)[0]
      : null;

  return (
    <div className="rtd-overlay" onClick={onClose}>
      <div className="rtd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rtd-header">
          <h2 className="rtd-title">今天做什么？</h2>
          <button className="rtd-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        {activeTodos.length === 0 ? (
          <div className="rtd-empty">
            <p>还没有待做的任务，先去添加几个吧～</p>
            <button className="rtd-btn rtd-btn--secondary" onClick={onClose}>
              关闭
            </button>
          </div>
        ) : (
          <>
            <div className="rtd-card-scene">
              <div className={`rtd-card ${flipped ? "rtd-card--flipped" : ""}`}>
                <div className="rtd-card-back">
                  <span className="rtd-card-back-glyph">✦</span>
                </div>
                <div className="rtd-card-front">
                  <p className="rtd-card-text">{current?.text}</p>
                </div>
              </div>
            </div>

            {flipped && (
              <div className="rtd-actions">
                <button
                  className="rtd-btn rtd-btn--primary"
                  onClick={() => handleSelect(current)}
                >
                  ✓ 就做这个！
                </button>

                {exhausted ? (
                  <div className="rtd-exhausted">
                    <p className="rtd-exhausted-msg">
                      看来你对这些都有点抗拒，要不先做最短的那个？
                    </p>
                    {shortestTodo && shortestTodo.id !== current?.id && (
                      <button
                        className="rtd-btn rtd-btn--ghost"
                        onClick={() => handleSelect(shortestTodo)}
                      >
                        → {shortestTodo.text}
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    className="rtd-btn rtd-btn--secondary"
                    onClick={handleRedraw}
                    disabled={animating}
                  >
                    ↩ 再抽一次
                    <span className="rtd-redraw-quota">
                      还剩 {MAX_REDRAWS - redraws} 次
                    </span>
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
