import React, { useEffect, useRef } from "react";

// 「分一下」两步是非题：把「这任务放哪」拆成「急不急 / 重不重要」两个封闭问题，
// 答完自动落到对应象限。本组件只管呈现与转发点击，象限换算留在矩阵组件里。
//
// props：
//   todo      正在归类的任务（用其 text 做标题）
//   urgent    第一题答案：null=还在第一步，true/false=已答、正在问第二题
//   onAnswer(value)  点「是/否」——父组件按 urgent 是否为 null 决定是记第一答还是收尾
//   onBack           第二步时「上一步」→ 回到第一题
//   onCancel         第一步时「取消」/ 点遮罩关闭
//   t                翻译函数
export default function MatrixSortDialog({ todo, urgent, onAnswer, onBack, onCancel, t }) {
  const cardRef = useRef(null);
  // 打开时把焦点从卡片上的「分一下」搬进弹窗，关掉再还回去——
  // 否则 aria-modal 是空头支票：焦点还留在弹窗背后，Tab 走的是被遮住的页面。
  const returnToRef = useRef(null);

  useEffect(() => {
    returnToRef.current = document.activeElement;
    cardRef.current?.querySelector("button")?.focus();
    return () => {
      const el = returnToRef.current;
      if (el && document.contains(el)) el.focus();
    };
  }, []);

  // Esc = 取消。第二步时按 Esc 一样整个关掉（「上一步」留给显式按钮）。
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  // 焦点困在弹窗里：Tab 走到尽头绕回开头，别溜到背后的页面上
  const trapTab = (e) => {
    if (e.key !== "Tab") return;
    const items = cardRef.current?.querySelectorAll("button");
    if (!items?.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="matrix-sort-overlay" onClick={onCancel} role="presentation">
      <div
        ref={cardRef}
        className="matrix-sort-card"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={trapTab}
        role="dialog"
        aria-modal="true"
        aria-label={t("focus.matrix.sortHeading", { text: todo.text })}
      >
        <span className="matrix-sort-heading">
          {t("focus.matrix.sortHeading", { text: todo.text })}
        </span>

        <p className="matrix-sort-question">
          {urgent === null
            ? t("focus.matrix.qUrgent")
            : t("focus.matrix.qImportant")}
        </p>

        <div className="matrix-sort-answers">
          <button
            type="button"
            className="matrix-sort-answer yes"
            onClick={() => onAnswer(true)}
          >
            {t("focus.matrix.answerYes")}
          </button>
          <button
            type="button"
            className="matrix-sort-answer no"
            onClick={() => onAnswer(false)}
          >
            {t("focus.matrix.answerNo")}
          </button>
        </div>

        <div className="matrix-sort-footer">
          <div className="matrix-sort-steps" aria-hidden="true">
            <span className="matrix-sort-dot active" />
            <span className={`matrix-sort-dot${urgent !== null ? " active" : ""}`} />
          </div>
          {urgent !== null ? (
            <button type="button" className="matrix-sort-nav" onClick={onBack}>
              {t("focus.matrix.sortBack")}
            </button>
          ) : (
            <button type="button" className="matrix-sort-nav" onClick={onCancel}>
              {t("focus.matrix.sortCancel")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
