import React, { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import "./DistractionModal.css";

// value 是写进记录的原文（统计按它归类，不能改）；labelKey 只管显示。
export const DISTRACTION_TAGS = [
  { value: "手机/屏幕", labelKey: "focus.distract.tag.phone" },
  { value: "思绪游荡", labelKey: "focus.distract.tag.mind" },
  { value: "外部打扰", labelKey: "focus.distract.tag.interrupt" },
  { value: "去干别的", labelKey: "focus.distract.tag.other-task" },
  { value: "其他",      labelKey: "focus.distract.tag.other" },
];

// 记录里存的原文 → 当前语言的显示文案；认不出来的（旧数据 / 自定义）原样返回。
export function distractionTagLabel(t, value) {
  const hit = DISTRACTION_TAGS.find((x) => x.value === value);
  return hit ? t(hit.labelKey) : value;
}

// 分心标签浮层。刻意不做「点外面 / 倒计时」自动关闭：输入途中误触外部会把没记完的
// 分心悄悄丢掉。只能走两条明确出口——「完成」(填了内容) 或「懒得写原因」(留空存档)。
export default function DistractionModal({ onTag, onSkip }) {
  const { t } = useLanguage();
  const [selectedTag, setSelectedTag] = useState(null);
  const [note, setNote] = useState("");

  const hasContent = Boolean(selectedTag) || note.trim().length > 0;

  const handleTagSelect = (tag) => {
    setSelectedTag((prev) => (prev === tag ? null : tag));
  };

  const handleDone = () => {
    if (!hasContent) return;
    onTag(selectedTag, note.trim());
  };

  return (
    <div className="distraction-modal-backdrop">
      <div className="distraction-modal">
        <div className="distraction-modal-title">
          <span>{t("focus.distract.title")}</span>
        </div>
        <div className="distraction-tags">
          {DISTRACTION_TAGS.map(({ value, labelKey }) => (
            <button
              key={value}
              type="button"
              className={`distraction-tag-btn${selectedTag === value ? " selected" : ""}`}
              onClick={() => handleTagSelect(value)}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
        <input
          className="distraction-note-input"
          placeholder={t("focus.distract.notePlaceholder")}
          value={note}
          maxLength={100}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleDone()}
        />
        <div className="distraction-modal-actions">
          <button type="button" className="distraction-skip-btn" onClick={onSkip}>
            {t("focus.distract.skip")}
          </button>
          <button
            type="button"
            className="distraction-done-btn"
            onClick={handleDone}
            disabled={!hasContent}
          >
            {t("focus.distract.done")}
          </button>
        </div>
      </div>
    </div>
  );
}
