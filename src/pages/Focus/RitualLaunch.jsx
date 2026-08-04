import React, { useEffect, useRef, useState } from "react";
import Companion from "@/components/companion/Companion";
import { companionLine } from "@/data/companion/companionData";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import { useLanguage } from "@/context/LanguageContext";
import "./RitualLaunch.css";

const BREATHE_MS = 800;   // 蓄势拍时长，之后进入「揭晓（停住）」等用户点开始吧
const HANDOFF_MS = 600;   // 交棒淡出时长，结束即 onComplete 挂载沉浸层

// 启动仪式揭晓层：点「开始专注」后插在 handleStart 之前的过渡。
// 三拍：breathe（蓄势）→ reveal（揭晓，停住等确认）→ handoff（点开始吧后淡出交棒）。
// 揭晓不自动推进——用户看完再点「开始吧」才进沉浸层，多一次「承诺动作」。
// 「跳过」/Esc 不播交棒，直接 onSkip 立即进入。
export default function RitualLaunch({
  selectedTodos = [],
  scenarioTitle = null,
  animEnabled = true,
  onComplete,
  onSkip,
}) {
  const { t } = useLanguage();
  const [outfit] = useLocalStorage(STORAGE_KEYS.COMPANION_OUTFIT, null);

  // 暖光的一句：挂载时定一次，整段仪式不变（避免重渲染换台词）。
  const lineRef = useRef(null);
  if (lineRef.current === null) lineRef.current = companionLine(t, "focus");

  // 动画关时省掉蓄势拍，直接停在揭晓；开时先 breathe 再 reveal。
  const [phase, setPhase] = useState(animEnabled ? "breathe" : "reveal");

  useEffect(() => {
    if (phase !== "breathe") return undefined;
    const id = window.setTimeout(() => setPhase("reveal"), BREATHE_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  // Esc = 跳过（与 RandomTaskDrawer 一致的手感）
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onSkip(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  const handleBegin = () => {
    if (phase === "handoff") return;
    if (!animEnabled) { onComplete(); return; }
    setPhase("handoff");
    window.setTimeout(() => onComplete(), HANDOFF_MS);
  };

  const revealed = phase === "reveal" || phase === "handoff";

  return (
    <div
      className={`ritual-overlay ritual-phase-${phase}${animEnabled ? "" : " ritual-no-anim"}`}
      role="dialog"
      aria-modal="true"
      aria-label={t("focus.ritual.begin")}
    >
      <button type="button" className="ritual-skip" onClick={onSkip}>
        {t("focus.ritual.skip")}
      </button>

      <div className="ritual-stage">
        <Companion
          mood="focus"
          outfit={outfit}
          size={120}
          say={revealed ? lineRef.current : null}
          className="ritual-companion"
        />

        <p className="ritual-breathe-text">{t("focus.ritual.breathe")}</p>

        {revealed && (
          <div className="ritual-reveal">
            <div className="ritual-card">
              <span className="ritual-sweep" />
              <span className="ritual-card-label">{t("focus.ritual.taskLabel")}</span>
              <ul className="ritual-task-list">
                {selectedTodos.map((todo) => (
                  <li key={todo.id} className="ritual-task">{todo.text}</li>
                ))}
              </ul>
              {scenarioTitle && (
                <div className="ritual-scenario">
                  <span className="ritual-scenario-label">{t("focus.ritual.scenarioLabel")}</span>
                  <span className="ritual-scenario-name">{scenarioTitle}</span>
                </div>
              )}
            </div>

            <button type="button" className="ritual-begin-btn" onClick={handleBegin}>
              {t("focus.ritual.begin")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
