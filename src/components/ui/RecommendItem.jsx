import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import "./RecommendItem.css";

// 单条推荐的展示件（情景页 / 专注页共用）。
//   entry: { todo, score, reasons:[{key,labelKey,vars}], aiReason? }
//   action: 调用方注入的操作按钮（去专注 / 加入专注…）
// 理由来源：规则层 reasons（带标签）+ 可选 AI 一句话理由（aiReason，置顶高亮）。
export default function RecommendItem({ entry, action }) {
  const { t } = useLanguage();
  const { todo, reasons = [], aiReason } = entry;
  return (
    <div className="rec-item">
      <div className="rec-item-body">
        <div className="rec-item-title">{todo.text}</div>
        {(aiReason || reasons.length > 0) && (
          <div className="rec-item-reasons">
            {aiReason && <span className="rec-chip rec-chip-ai">✨ {aiReason}</span>}
            {reasons.map((r) => (
              <span key={r.key} className="rec-chip">{t(r.labelKey, r.vars)}</span>
            ))}
          </div>
        )}
      </div>
      {action && <div className="rec-item-action">{action}</div>}
    </div>
  );
}
