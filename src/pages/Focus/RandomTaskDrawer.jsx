import React, { useState, useEffect } from "react";
import { useTodos } from "../../context/TodoContext";
import { useLanguage } from "../../context/LanguageContext";
import "./RandomTaskDrawer.css";

const MAX_REDRAWS = 2;

function pickRandom(pool, excludeId = null) {
  const candidates = excludeId ? pool.filter((t) => t.id !== excludeId) : pool;
  const src = candidates.length > 0 ? candidates : pool;
  return src[Math.floor(Math.random() * src.length)];
}

export default function RandomTaskDrawer({ onSelect, onClose }) {
  const { todos } = useTodos();
  const { t } = useLanguage();
  const activeTodos = todos.filter((td) => !td.completed);

  const [redraws, setRedraws] = useState(0);
  const [current, setCurrent] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (activeTodos.length === 0) return;
    setCurrent(pickRandom(activeTodos));
    const timer = setTimeout(() => setFlipped(true), 180);
    return () => clearTimeout(timer);
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
          <h2 className="rtd-title">{t("focus.rtd.title")}</h2>
          <button className="rtd-close" onClick={onClose} aria-label={t("focus.rtd.close")}>
            ×
          </button>
        </div>

        {activeTodos.length === 0 ? (
          <div className="rtd-empty">
            <p>{t("focus.rtd.empty")}</p>
            <button className="rtd-btn rtd-btn--secondary" onClick={onClose}>
              {t("focus.rtd.close")}
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
                  {t("focus.rtd.pick")}
                </button>

                {exhausted ? (
                  <div className="rtd-exhausted">
                    <p className="rtd-exhausted-msg">
                      {t("focus.rtd.exhaustedMsg")}
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
                    {t("focus.rtd.redraw")}
                    <span className="rtd-redraw-quota">
                      {t("focus.rtd.redrawQuota", { n: MAX_REDRAWS - redraws })}
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
