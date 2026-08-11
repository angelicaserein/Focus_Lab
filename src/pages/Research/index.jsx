import React, { useState } from "react";
import { todayDateStr } from "@/utils/records/researchRecords";
import { exportResearchCSV } from "@/utils/records/researchExport";
import useResearchRecord from "@/hooks/useResearchRecord";
import DateNavigation from "@/pages/Research/DateNavigation";
import ScaleGrid from "@/pages/Research/ScaleGrid";
import AutoDataCard from "@/pages/Research/AutoDataCard";
import { useLanguage } from "@/context/LanguageContext";
import "./Research.css";

export default function ResearchPage() {
  const { t } = useLanguage();
  const [dateStr, setDateStr] = useState(() => todayDateStr());
  const today = todayDateStr();
  const isToday = dateStr === today;

  const {
    records,
    draft,
    autoData,
    existingRecord,
    savedAnim,
    setScale,
    setRetro,
    setExperience,
    handleSave,
  } = useResearchRecord(dateStr);

  return (
    <div className="page-research">
      <div className="research-headline">
        <h1>{t("research.title")}</h1>
        <DateNavigation
          dateStr={dateStr}
          isToday={isToday}
          hasSavedRecord={!!existingRecord}
          onDateChange={setDateStr}
        />
      </div>

      {/* 系统记录（自动） */}
      <section className="research-section">
        <div className="research-section-title">{t("research.auto.title")}</div>
        <p className="research-section-hint">{t("research.auto.hint")}</p>
        <AutoDataCard autoData={autoData} isToday={isToday} />
      </section>

      {/* 自评量表 */}
      <section className="research-section">
        <div className="research-section-title">{t("research.scale.title")}</div>
        <p className="research-section-hint">{t("research.scale.hint")}</p>
        <ScaleGrid scales={draft.scales} onChange={setScale} />
      </section>

      {/* 回顾记录（手动数字） */}
      <section className="research-section">
        <div className="research-section-title">{t("research.retro.title")}</div>
        <p className="research-section-hint">{t("research.retro.hint")}</p>
        <div className="research-retro-rows">
          <div className="research-retro-row">
            <label className="research-retro-label" htmlFor="retro-distractions">
              {t("research.retro.distractions")}
            </label>
            <input
              id="retro-distractions"
              type="number"
              min="0"
              className="research-number-input"
              value={draft.retrospective.distractionCount}
              onChange={(e) => setRetro("distractionCount", e.target.value)}
              placeholder={t("research.retro.distractionsUnit")}
            />
          </div>
          <div className="research-retro-row">
            <label className="research-retro-label" htmlFor="retro-procrastination">
              {t("research.retro.procrastination")}
            </label>
            <input
              id="retro-procrastination"
              type="number"
              min="0"
              className="research-number-input"
              value={draft.retrospective.procrastinationMins}
              onChange={(e) => setRetro("procrastinationMins", e.target.value)}
              placeholder={t("research.retro.procrastinationUnit")}
            />
          </div>
        </div>
      </section>

      {/* 主观感受 */}
      <section className="research-section">
        <div className="research-section-title">{t("research.experience.title")}</div>
        <p className="research-section-hint">{t("research.experience.hint")}</p>
        <textarea
          className="research-textarea"
          rows={5}
          value={draft.experience}
          onChange={(e) => setExperience(e.target.value)}
          placeholder={t("research.experience.placeholder")}
        />
      </section>

      {/* 操作栏 */}
      <div className="research-action-bar">
        <button type="button" className="research-save-btn" onClick={handleSave}>
          {existingRecord ? t("research.update") : t("research.save")}
        </button>
        <button
          type="button"
          className="research-export-btn"
          onClick={() => exportResearchCSV(records, t)}
          disabled={records.length === 0}
        >
          {t("research.export")}
        </button>
        <span className={`research-save-status${savedAnim ? " visible" : ""}`}>
          {t("research.savedTick")}
        </span>
      </div>
    </div>
  );
}
