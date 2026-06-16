import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useFocus } from "../../context/FocusContext";
import useLocalStorage from "../../hooks/useLocalStorage";
import { formatDuration } from "../../utils/time";
import {
  todayDateStr,
  buildEmptyRecord,
  computeAutoData,
  exportResearchCSV,
} from "../../utils/researchRecords";
import "./Research.css";

const SCALES = [
  { key: "focusLevel",      label: "整体专注程度", low: "分心", high: "专注" },
  { key: "startDifficulty", label: "启动困难程度", low: "困难", high: "容易" },
  { key: "moodState",       label: "心情状态",     low: "焦虑", high: "平静" },
];

function prevDay(dateStr) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d - 1)).toISOString().slice(0, 10);
}

function nextDay(dateStr) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d + 1)).toISOString().slice(0, 10);
}

function formatDateLabel(dateStr) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, 12)).toLocaleDateString("zh-CN", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function LikertRow({ scaleKey, label, low, high, value, onChange }) {
  return (
    <div className="research-likert-row">
      <span className="research-likert-label">{label}</span>
      <div className="research-likert-circles">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`research-likert-btn${value === n ? " selected" : ""}`}
            onClick={() => onChange(scaleKey, value === n ? null : n)}
            aria-label={`${label} ${n}分`}
            aria-pressed={value === n}
          >
            {n}
          </button>
        ))}
      </div>
      <span className="research-likert-anchors">
        <span>{low}</span>
        <span className="research-likert-anchor-sep">→</span>
        <span>{high}</span>
      </span>
    </div>
  );
}

export default function ResearchPage() {
  const [dateStr, setDateStr] = useState(() => todayDateStr());
  const [records, setRecords] = useLocalStorage("research_daily_v1", []);
  const { focusRecords } = useFocus();
  const [distractions] = useLocalStorage("focus_distractions_v1", []);
  const [draft, setDraft] = useState(() => buildEmptyRecord(todayDateStr()));
  const [savedAnim, setSavedAnim] = useState(false);

  const today = todayDateStr();
  const isToday = dateStr === today;

  const autoData = useMemo(
    () => computeAutoData(focusRecords, distractions, dateStr),
    [focusRecords, distractions, dateStr]
  );

  const existingRecord = useMemo(
    () => records.find((r) => r.date === dateStr) ?? null,
    [records, dateStr]
  );

  useEffect(() => {
    setDraft(existingRecord ? { ...existingRecord } : buildEmptyRecord(dateStr));
  }, [dateStr, existingRecord]);

  const setScale = useCallback((key, val) => {
    setDraft((prev) => ({
      ...prev,
      scales: { ...prev.scales, [key]: val },
    }));
  }, []);

  const setRetro = useCallback((key, val) => {
    setDraft((prev) => ({
      ...prev,
      retrospective: { ...prev.retrospective, [key]: val },
    }));
  }, []);

  const setExperience = useCallback((val) => {
    setDraft((prev) => ({ ...prev, experience: val }));
  }, []);

  const handleSave = useCallback(() => {
    const record = {
      id: existingRecord?.id ?? crypto.randomUUID(),
      date: dateStr,
      savedAt: Date.now(),
      autoData,
      scales: draft.scales,
      retrospective: draft.retrospective,
      experience: draft.experience,
    };
    setRecords((prev) => {
      const idx = prev.findIndex((r) => r.date === dateStr);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = record;
        return next;
      }
      return [...prev, record];
    });
    setSavedAnim(true);
    setTimeout(() => setSavedAnim(false), 2000);
  }, [dateStr, draft, autoData, existingRecord, setRecords]);

  const hasAutoData =
    autoData.totalFocusDurationSecs > 0 || autoData.realtimeDistractionCount > 0;

  return (
    <div className="page-research">
      {/* 标题 + 日期导航 */}
      <div className="research-headline">
        <h1>每日研究记录</h1>
        <div className="research-date-nav">
          <button
            type="button"
            className="research-date-nav-btn"
            onClick={() => setDateStr(prevDay(dateStr))}
            aria-label="前一天"
          >
            ←
          </button>
          <span className="research-date-label">{formatDateLabel(dateStr)}</span>
          <button
            type="button"
            className="research-date-nav-btn"
            onClick={() => setDateStr(nextDay(dateStr))}
            disabled={isToday}
            aria-label="后一天"
          >
            →
          </button>
          <span
            className={`research-date-badge ${
              existingRecord ? "research-date-badge--saved" : "research-date-badge--unsaved"
            }`}
          >
            {existingRecord ? "已保存" : "未保存"}
          </span>
        </div>
      </div>

      {/* 系统记录（自动） */}
      <section className="research-section">
        <div className="research-section-title">系统记录</div>
        <p className="research-section-hint">由专注会话自动计算，只读</p>
        {hasAutoData ? (
          <div className="research-auto-grid">
            <div className="research-auto-card">
              <div className="research-auto-value">
                {autoData.maxFocusDurationSecs > 0
                  ? formatDuration(autoData.maxFocusDurationSecs)
                  : "—"}
              </div>
              <div className="research-auto-label">最大专注时长</div>
            </div>
            <div className="research-auto-card">
              <div className="research-auto-value">
                {autoData.totalFocusDurationSecs > 0
                  ? formatDuration(autoData.totalFocusDurationSecs)
                  : "—"}
              </div>
              <div className="research-auto-label">今日总专注时长</div>
            </div>
            <div className="research-auto-card">
              <div className="research-auto-value">
                {autoData.realtimeDistractionCount}
              </div>
              <div className="research-auto-label">实时分心次数</div>
            </div>
            <div className="research-auto-card">
              <div className="research-auto-value">
                {autoData.taskCompletedCount}
              </div>
              <div className="research-auto-label">任务完成数</div>
            </div>
          </div>
        ) : (
          <div className="research-auto-empty">
            {isToday
              ? "今日暂无专注记录，完成专注后数据将自动显示"
              : "该日期无专注记录"}
          </div>
        )}
      </section>

      {/* 自评量表 */}
      <section className="research-section">
        <div className="research-section-title">自评量表</div>
        <p className="research-section-hint">点击选择评分，再次点击可取消</p>
        <div className="research-likert-container">
          {SCALES.map((s) => (
            <LikertRow
              key={s.key}
              scaleKey={s.key}
              label={s.label}
              low={s.low}
              high={s.high}
              value={draft.scales[s.key]}
              onChange={setScale}
            />
          ))}
        </div>
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
