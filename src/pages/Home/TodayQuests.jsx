import React, { useMemo } from "react";
import { Check } from "lucide-react";
import { useFocus } from "@/context/FocusContext";
import { useLanguage } from "@/context/LanguageContext";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import Companion from "@/components/companion/Companion";
import { todayStats, pickDailyCommissions } from "./commissionsData";
import "./TodayQuests.css";

// 今日委托：灯灯给的几个温柔小点子，全部由「今天的专注」自动判定。
// 做到了就庆祝，没做也只是邀请——无连续、无 X/Y 计数、跳过无损。
export default function TodayQuests() {
  const { t } = useLanguage();
  const { focusRecords } = useFocus();
  const [outfit] = useLocalStorage(STORAGE_KEYS.COMPANION_OUTFIT, null);

  const { quests, anyDone } = useMemo(() => {
    const stats = todayStats(focusRecords);
    const picked = pickDailyCommissions().map((c) => ({ ...c, done: c.check(stats) }));
    return { quests: picked, anyDone: picked.some((q) => q.done) };
  }, [focusRecords]);

  return (
    <section className="quests">
      <div className="quests-head">
        <Companion mood={anyDone ? "cheer" : "idle"} outfit={outfit} size={58} floating={false} />
        <div className="quests-head-text">
          <h2 className="quests-title">{t("home.quests.title")}</h2>
          <p className="quests-lumi">{t(anyDone ? "home.quests.lumiDone" : "home.quests.lumiOpen")}</p>
        </div>
      </div>

      <ul className="quests-list">
        {quests.map((q) => (
          <li key={q.id} className={`quest${q.done ? " done" : ""}`}>
            <span className="quest-icon" aria-hidden="true">{q.icon}</span>
            <span className="quest-text">{t(`commission.${q.id}`)}</span>
            <span
              className="quest-mark"
              aria-label={q.done ? t("home.quests.doneLabel") : undefined}
            >
              {q.done ? <Check size={15} strokeWidth={3} aria-hidden="true" /> : null}
            </span>
          </li>
        ))}
      </ul>

      <p className="quests-note">{t("home.quests.note")}</p>
    </section>
  );
}
