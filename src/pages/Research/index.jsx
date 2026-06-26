import React, { useState } from "react";
import { todayDateStr } from "../../utils/researchRecords";
import { exportResearchCSV } from "../../utils/researchExport";
import useResearchRecord from "../../hooks/useResearchRecord";
import DateNavigation from "./DateNavigation";
import ScaleGrid from "./ScaleGrid";
import AutoDataCard from "./AutoDataCard";
import "./Research.css";

export default function ResearchPage() {
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
        <h1>每日研究记录</h1>
        <DateNavigation
          dateStr={dateStr}
          isToday={isToday}
          hasSavedRecord={!!existingRecord}
          onDateChange={setDateStr}
        />
      </div>

      {/* 系统记录（自动） */}
      <section className="research-section">
        <div className="research-section-title">系统记录</div>
        <p className="research-section-hint">由专注会话自动计算，只读</p>
        <AutoDataCard autoData={autoData} isToday={isToday} />
      </section>

      {/* 自评量表 */}
      <section className="research-section">
        <div className="research-section-title">自评量表</div>
        <p className="research-section-hint">点击选择评分，再次点击可取消</p>
        <ScaleGrid scales={draft.scales} onChange={setScale} />
      </section>

      {/* 回顾记录（手动数字） */}
      <section className="research-section">
        <div className="research-section-title">回顾记录</div>
        <p className="research-section-hint">根据主观感受填写，可与系统记录不同</p>
        <div className="research-retro-rows">
          <div className="research-retro-row">
            <label className="research-retro-label" htmlFor="retro-distractions">
              回顾分心次数
            </label>
            <input
              id="retro-distractions"
              type="number"
              min="0"
              className="research-number-input"
              value={draft.retrospective.distractionCount}
              onChange={(e) => setRetro("distractionCount", e.target.value)}
              placeholder="次"
            />
          </div>
          <div className="research-retro-row">
            <label className="research-retro-label" htmlFor="retro-procrastination">
              自感拖延时间
            </label>
            <input
              id="retro-procrastination"
              type="number"
              min="0"
              className="research-number-input"
              value={draft.retrospective.procrastinationMins}
              onChange={(e) => setRetro("procrastinationMins", e.target.value)}
              placeholder="分钟"
            />
          </div>
        </div>
      </section>

      {/* 主观感受 */}
      <section className="research-section">
        <div className="research-section-title">主观感受</div>
        <p className="research-section-hint">自由记录今天的专注体验</p>
        <textarea
          className="research-textarea"
          rows={5}
          value={draft.experience}
          onChange={(e) => setExperience(e.target.value)}
          placeholder="今天专注时感觉怎么样？有什么想记录的……"
        />
      </section>

      {/* 操作栏 */}
      <div className="research-action-bar">
        <button type="button" className="research-save-btn" onClick={handleSave}>
          {existingRecord ? "更新记录" : "保存记录"}
        </button>
        <button
          type="button"
          className="research-export-btn"
          onClick={() => exportResearchCSV(records)}
          disabled={records.length === 0}
        >
          导出 CSV
        </button>
        <span className={`research-save-status${savedAnim ? " visible" : ""}`}>
          已保存 ✓
        </span>
      </div>
    </div>
  );
}
