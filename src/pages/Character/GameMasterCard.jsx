import React, { useEffect, useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { growthStageText, momentumText } from "./charView";
import { narrateJourney, hasApiKey } from "@/utils/ai/aiNarrate";
import "./GameMaster.css";

// 游戏主持人「旅程旁白」卡：把角色真实进展交给 AI（或本地模板兜底）讲成一段冒险叙事。
// 挂在角色页顶部，两套皮肤共用。绝不阻塞——无 key / 失败都有本地旁白。
export default function GameMasterCard({ char, t, lang }) {
  const [state, setState] = useState({ text: "", loading: true, source: null });
  const [variant, setVariant] = useState(0);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));

    // 从角色数据组装叙事上下文（全部已本地化，util 只做语言机械拼装）。
    const rankName = lang === "zh" ? char.rank.zh : char.rank.en;
    const top = char.skills?.[0];
    const topSkillName = top ? (top.unclassified ? t("character.freeExplore") : top.title) : null;
    const unmet = (char.achievements ?? [])
      .filter((a) => !a.unlocked)
      .sort((a, b) => {
        const ra = a.progress?.target ? a.progress.cur / a.progress.target : 0;
        const rb = b.progress?.target ? b.progress.cur / b.progress.target : 0;
        return rb - ra;
      })[0];
    const ctx = {
      rankName,
      stageText: growthStageText(t, char.level),
      momentumText: momentumText(t, char.streak),
      totalMins: Math.round((char.metrics?.totalSecs ?? 0) / 60),
      sessionCount: char.sessionCount ?? 0,
      streak: char.streak ?? 0,
      topSkillName,
      unmetAchTitle: unmet ? t(`character.ach.${unmet.id}.title`) : null,
    };

    narrateJourney(ctx, { lang, variant }).then((res) => {
      if (alive) setState({ text: res.text, loading: false, source: res.source });
    });
    return () => {
      alive = false;
    };
    // 仅在挂载 / 手动换一段 / 语言切换时重新生成，避免每次 char 变动都触发 AI 调用。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, lang]);

  return (
    <div className="gm-card">
      <div className="gm-side" aria-hidden="true">
        <span className="gm-emoji">📖</span>
      </div>
      <div className="gm-body">
        <div className="gm-head">
          <span className="gm-title">{t("gm.title")}</span>
          {state.source === "ai" && (
            <span className="gm-badge"><Sparkles size={11} aria-hidden="true" /> AI</span>
          )}
          <button
            type="button"
            className="gm-refresh"
            onClick={() => setVariant((v) => v + 1)}
            disabled={state.loading}
            aria-label={t("gm.refresh")}
            title={t("gm.refresh")}
          >
            <RefreshCw size={14} className={state.loading ? "gm-spin" : ""} aria-hidden="true" />
          </button>
        </div>
        <p className={`gm-text${state.loading ? " gm-loading" : ""}`}>
          {state.loading ? t("gm.loading") : state.text}
        </p>
        {!hasApiKey() && !state.loading && <div className="gm-note">{t("gm.localNote")}</div>}
      </div>
    </div>
  );
}
