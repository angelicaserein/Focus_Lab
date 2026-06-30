import React from "react";
import { useNavigate } from "react-router-dom";
import { useFocus } from "../../context/FocusContext";
import { useLanguage } from "../../context/LanguageContext";
import FocusHeatmap from "./FocusHeatmap";
import DeadlineHorizon from "./DeadlineHorizon";
import "./Home.css";

export default function Home() {
  const { focusRecords } = useFocus();
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <main className="page page-home">
      <FocusHeatmap records={focusRecords} />
      <DeadlineHorizon />
      <button className="home-quickstart" onClick={() => navigate("/focus")}>
        {t("home.quickstart")}
      </button>
    </main>
  );
}
