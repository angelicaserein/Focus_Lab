import React from "react";
import { useNavigate } from "react-router-dom";
import { useFocus } from "@/context/FocusContext";
import { useLanguage } from "@/context/LanguageContext";
import TodayQuests from "@/pages/Home/TodayQuests";
import FocusHeatmap from "@/pages/Home/FocusHeatmap";
import DeadlineHorizon from "@/pages/Home/DeadlineHorizon";
import "./Home.css";

// 首屏按「离现在多近」自上而下排：
//   开始专注（此刻能做的唯一一件事）→ 今日委托（今天）→ 截止临近（这几天）→ 热力图（回顾）。
// 热力图沉到最后：它是回顾性的，放在首屏顶端会让人一进门先被过去的记录评判一遍。
export default function Home() {
  const { focusRecords } = useFocus();
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <main className="page page-home">
      <button className="home-quickstart" onClick={() => navigate("/focus")}>
        {t("home.quickstart")}
      </button>
      <TodayQuests />
      <DeadlineHorizon />
      <FocusHeatmap records={focusRecords} />
    </main>
  );
}
