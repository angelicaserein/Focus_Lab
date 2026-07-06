import React, { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import useCharacter from "@/hooks/character/useCharacter";
import GrowthConstellation from "./GrowthConstellation";
import SkillTreeUnlock from "./SkillTreeUnlock";
import "./SkillTree.css";

// 两种形态并排比较：同一入口，切换「成长星图（纯衍生）」与「可解锁技能树（点技能点）」。
// 沿用角色卡的「一份数据、两种呈现」思路，方便取舍。
const VIEWS = [
  { id: "constellation", labelKey: "skilltree.view.constellation" },
  { id: "tree", labelKey: "skilltree.view.tree" },
];

export default function SkillTreePage() {
  const { t, lang } = useLanguage();
  const char = useCharacter();
  const [view, setView] = useState("constellation");

  return (
    <div className={`page-skilltree view-${view}`}>
      <div className="st-headline">
        <h1>{t("skilltree.title")}</h1>
        <div className="st-view-switch" role="tablist" aria-label={t("skilltree.view.label")}>
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={view === v.id}
              className={`st-view-btn${view === v.id ? " active" : ""}`}
              onClick={() => setView(v.id)}
            >
              {t(v.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {view === "tree" ? (
        <SkillTreeUnlock char={char} t={t} lang={lang} />
      ) : (
        <GrowthConstellation char={char} t={t} lang={lang} />
      )}
    </div>
  );
}
