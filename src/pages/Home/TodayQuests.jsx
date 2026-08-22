import React, { useMemo } from "react";
import { useFocus } from "@/context/FocusContext";
import { useLanguage } from "@/context/LanguageContext";
import { COMMISSIONS, todayStats, pickDailyCommissions } from "./commissionsData";
import "./TodayQuests.css";

// 「今日委托」：借二游每日委托的形，去掉它的钩子（见 commissionsData.js）。
// 这里只负责把数据层算出来的事实画出来——三条温柔的邀请，做到了自己打勾，
// 没做也不催、不倒计时、不连击。跳过任何一条都无损。

export default function TodayQuests() {
  const { focusRecords } = useFocus();
  const { t } = useLanguage();

  // 一天之内结果稳定：日期种子选委托，今天的记录判完成。
  const quests = useMemo(() => {
    const stats = todayStats(focusRecords);
    const picked = pickDailyCommissions();
    return picked.map((c) => ({
      id: c.id,
      icon: c.icon,
      done: c.check(stats),
    }));
  }, [focusRecords]);

  const allDone = quests.length > 0 && quests.every((q) => q.done);

  return (
    <section className="quests-wrap" aria-labelledby="quests-title">
      <div className="quests-header">
        <span className="quests-title" id="quests-title">
          {t("home.quests.title")}
        </span>
        <span className="quests-sub">
          {t(allDone ? "home.quests.lumiDone" : "home.quests.lumiOpen")}
        </span>
      </div>

      <ul className="quests-list">
        {quests.map((q) => (
          <li key={q.id} className="quest-item" data-done={q.done ? "true" : "false"}>
            <span className="quest-icon" aria-hidden="true">
              {q.icon}
            </span>
            <span className="quest-text">{t(`commission.${q.id}`)}</span>
            {/* 打勾只在做到时出现；没做到的那栏留白，不画空框、不显「未完成」 */}
            {q.done && (
              <span
                className="quest-check"
                role="img"
                aria-label={t("home.quests.doneLabel")}
                title={t("home.quests.doneLabel")}
              >
                ✓
              </span>
            )}
          </li>
        ))}
      </ul>

      <p className="quests-note">{t("home.quests.note")}</p>
    </section>
  );
}
