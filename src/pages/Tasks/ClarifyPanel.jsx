import React, { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

// 倒脑子的「反问」一轮：AI 读完笔记，针对这段内容出 1–3 个选择题，
// 每题自带默认答案。答完点「按这些拆」，或直接跳过（跳过 = 一条约束都不加，
// 不是「按默认答案拆」——用户没表态，就别替他表态）。
// 视觉沿用「分任务」的 ait-* 外壳。
export default function ClarifyPanel({ questions, onSubmit, onSkip, onClose }) {
  const { t } = useLanguage();
  const [picked, setPicked] = useState({});

  // 每题预选它自己的默认项，用户可以只改在意的那一两题
  useEffect(() => {
    const init = {};
    questions.forEach((q, i) => {
      init[i] = q.default ?? q.options[0];
    });
    setPicked(init);
  }, [questions]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = () =>
    onSubmit(
      questions.map((q, i) => ({ question: q.question, answer: picked[i] ?? q.default })),
    );

  return (
    <div className="ait-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ait-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("brainDump.clarify.title")}
      >
        <div className="ait-head">
          <h2 className="ait-title">{t("brainDump.clarify.title")}</h2>
          <button
            type="button"
            className="ait-close"
            onClick={onClose}
            aria-label={t("brainDump.close")}
          >
            ✕
          </button>
        </div>

        <p className="ait-hint">{t("brainDump.clarify.hint")}</p>

        <ul className="bd-q-list">
          {questions.map((q, i) => (
            <li key={q.question} className="bd-q">
              <p className="bd-q-text">{q.question}</p>
              <div className="bd-q-options" role="radiogroup" aria-label={q.question}>
                {q.options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    role="radio"
                    aria-checked={picked[i] === opt}
                    className={`bd-q-opt${picked[i] === opt ? " on" : ""}`}
                    onClick={() => setPicked((prev) => ({ ...prev, [i]: opt }))}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>

        <div className="ait-actions">
          <button type="button" className="ait-btn-ghost" onClick={onSkip}>
            {t("brainDump.clarify.skip")}
          </button>
          <button type="button" className="ait-btn-primary" onClick={submit}>
            {t("brainDump.clarify.submit")}
          </button>
        </div>
      </div>
    </div>
  );
}
