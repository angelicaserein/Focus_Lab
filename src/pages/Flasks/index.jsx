import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Check, Trash2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useFocus } from "@/context/FocusContext";
import useFlaskShelf from "@/hooks/flask/useFlaskShelf";
import { FlaskGraphic } from "@/pages/Focus/FocusFlask";
import {
  FLASK_FULL_SECS,
  MAX_SHELF,
  bottlesOf,
  shelfFillSecs,
} from "./flaskShelf";
import "./Flasks.css";

// 烧瓶架：把设置页调好的形状一只只存下来，挑一只作为「现在往里注水」的瓶子。
// 一小时专注注满一只；接满了不停手，多出来的直接流进下一只同样形状的瓶子，
// 所以一行看到的是「同一形状的一排」——前面几只满的是攒下的小时，末尾那只正在接。
//
// 注满进度不在这儿存档，是从专注记录（record.flaskId）现算的，见 flaskShelf.js。

// 秒数 → 「1 小时 20 分」。整点不带零头，不足一小时只说分钟。
function dur(secs, t) {
  const mins = Math.max(0, Math.round(secs / 60));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return t("flasks.hm", { h, m });
  if (h) return t("flasks.h", { h });
  return t("flasks.m", { m });
}

export default function FlasksPage() {
  const { t } = useLanguage();
  const { focusRecords } = useFocus();
  const { items, activeId, removeFlask, renameFlask, setActiveFlask } = useFlaskShelf();

  const fills = useMemo(() => shelfFillSecs(focusRecords), [focusRecords]);

  return (
    <div className="page-flasks">
      <header className="fk-headline">
        <h1>{t("flasks.title")}</h1>
        {items.length > 0 && (
          <span className="fk-count">
            {t("flasks.shelfCount", { n: items.length, total: MAX_SHELF })}
          </span>
        )}
      </header>
      <p className="fk-lead">{t("flasks.lead")}</p>

      {items.length === 0 ? (
        <div className="fk-empty">
          <FlaskGraphic progress={0} />
          <p className="fk-empty-title">{t("flasks.empty")}</p>
          <p className="fk-empty-hint">{t("flasks.emptyHint")}</p>
          <Link className="fk-empty-link" to="/settings">
            {t("flasks.goSettings")}
          </Link>
        </div>
      ) : (
        <ul className="fk-list" role="radiogroup" aria-label={t("flasks.setActive")}>
          {items.map((it) => (
            <ShelfRow
              key={it.id}
              flask={it}
              secs={fills[it.id] ?? 0}
              active={it.id === activeId}
              t={t}
              onSelect={() => setActiveFlask(it.id)}
              onRename={(name) => renameFlask(it.id, name)}
              onRemove={() => removeFlask(it.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// 架上的一格：一只烧瓶的名字、进度文字，和它那一排瓶子。
// 整格可点＝选它接水（radio 语义）；名字输入框与删除按钮不参与选中，
// 故它们要挡住冒泡，不然改个名就顺手换了正在专注的瓶子。
function ShelfRow({ flask, secs, active, t, onSelect, onRename, onRemove }) {
  const { full, partial, drawn, hidden } = bottlesOf(secs);
  const presetName = t(`settings.prefs.flaskShape.${flask.preset}`);
  const remain = FLASK_FULL_SECS - (secs % FLASK_FULL_SECS);

  return (
    // role="none"：radiogroup 的直接子元素只能是 radio，listitem 会破坏这个结构
    <li className={`fk-item${active ? " active" : ""}`} role="none">
      <div
        className="fk-pick"
        role="radio"
        aria-checked={active}
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
      >
        <div className="fk-head">
          <input
            className="fk-name"
            value={flask.name}
            placeholder={presetName || t("flasks.namePlaceholder")}
            onChange={(e) => onRename(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            aria-label={t("flasks.namePlaceholder")}
          />
          {active ? (
            <span className="fk-badge">
              <Check size={14} aria-hidden="true" />
              {t("flasks.active")}
            </span>
          ) : (
            <span className="fk-hint-pick">{t("flasks.setActive")}</span>
          )}
          <button
            type="button"
            className="fk-remove"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            title={t("flasks.removeHint")}
            aria-label={t("flasks.remove")}
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </div>

        {/* 一排瓶子：满的在前，末尾那只是正在接的。多到画不下时，
            前面省略若干满瓶，用一枚计数标记交代，末尾那只永远留着。 */}
        <div className="fk-row">
          {hidden > 0 && <span className="fk-more">{t("flasks.more", { n: hidden })}</span>}
          {Array.from({ length: drawn }, (_, i) => {
            // drawn 只画末尾这几只：前 drawn-1 只是满的，最后一只在接
            const isLast = i === drawn - 1;
            return (
              <div key={i} className={`fk-bottle${isLast ? " filling" : " done"}`}>
                <FlaskGraphic progress={isLast ? partial : 1} params={flask.params} />
              </div>
            );
          })}
        </div>

        <p className="fk-meta">
          {secs > 0 ? (
            <>
              <span className="fk-meta-total">{t("flasks.total", { v: dur(secs, t) })}</span>
              {full > 0 && <span className="fk-meta-full">{t("flasks.fullCount", { n: full })}</span>}
              <span className="fk-meta-next">{t("flasks.nextIn", { v: dur(remain, t) })}</span>
            </>
          ) : (
            <span className="fk-meta-total">{t("flasks.justStarted")}</span>
          )}
        </p>
      </div>
    </li>
  );
}
