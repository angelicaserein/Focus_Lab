import React from "react";
import { useNavigate } from "react-router-dom";
import { useFocus } from "../../context/FocusContext";
import FocusHeatmap from "./FocusHeatmap";
import "./Home.css";

export default function Home() {
  const { focusRecords } = useFocus();
  const navigate = useNavigate();

  return (
    <main className="page page-home">
      <FocusHeatmap records={focusRecords} />
      <button className="home-quickstart" onClick={() => navigate("/focus")}>
        ▶ 开始专注
      </button>
    </main>
  );
}
