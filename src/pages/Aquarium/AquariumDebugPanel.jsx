import React, { useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { speciesById } from "@/data/aquarium/aquariumData";
import { slotLabel } from "@/data/specimen";
import { STAGE, growthOf, numberResidents } from "@/data/aquarium/growth";
import FishGlyph from "./FishGlyph";

// 生态缸调试面板（仅开发环境）：一行一只住客，可以直接把它删掉。
// 收集本身是无损的（见 aquariumData 的收集观），故删除只在这里存在——用来把测试养出来的一缸
// 清干净，不是给玩家的功能。删的是存档里那一条，缸里那只随即消失（见 AquariumTank.remove）。
//
// 封在烧瓶里的那些也列出来：它们同样占着一条存档记录，只在缸里看不见，
// 不列的话「删干净了却还剩几条」会很费解。
export default function AquariumDebugPanel({ entries, sealedUids, flasks, onRemove, onRemoveAll, onClose }) {
  const { t } = useLanguage();

  // 同物种多只时给序号，和生长情况那张卡共用 numberResidents（按入缸先后），
  // 不然一列同名分不清删的是哪只。
  const { rows, many } = useMemo(() => {
    const { rows: numbered, many: dup } = numberResidents(entries);
    return { many: dup, rows: numbered.map((e) => ({ ...e, sp: speciesById(e.id) })) };
  }, [entries]);

  return (
    <div
      className="aq-debug-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="aq-debug-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t("aquarium.debug.aria")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="aq-debug-title">{t("aquarium.debug.title")}</div>
        <p className="aq-debug-note">{t("aquarium.debug.note")}</p>

        {rows.length === 0 ? (
          <p className="aq-debug-note">{t("aquarium.debug.empty")}</p>
        ) : (
          <ul className="aq-debug-list">
            {rows.map((r) => {
              const gr = growthOf(r.born);
              const sealed = sealedUids.has(r.uid);
              const name = r.sp
                ? t(`aquarium.species.${r.id}.name`)
                : t("aquarium.debug.unknown", { id: r.id });
              return (
                <li key={r.uid} className="aq-debug-row">
                  <span className="aq-debug-icon" aria-hidden="true">
                    {r.sp && (
                      <FishGlyph glyph={r.sp.glyph} size={24} stage={gr.stage} scale={gr.scale} />
                    )}
                  </span>
                  <span className="aq-debug-name">
                    {name}
                    {many.has(r.id) && <span className="aq-grow-nth">{r.nth}</span>}
                  </span>
                  <span className="aq-debug-state">
                    {t(`aquarium.stage.${gr.stage}`)}
                    {gr.stage !== STAGE.ADULT && <> · {Math.round(gr.grown * 100)}%</>}
                    {sealed && (
                      <em className="aq-debug-flag">
                        {/* 瓶子已经不在架上（改坏存档/正在清理）时报槽位原文，别显示成空白 */}
                        {slotLabel(r.sealedIn, flasks, t) ??
                          t("aquarium.debug.sealed", { v: r.sealedIn })}
                      </em>
                    )}
                  </span>
                  <button
                    type="button"
                    className="aq-debug-del"
                    onClick={() => onRemove(r.uid)}
                    aria-label={t("aquarium.debug.removeAria", { name })}
                  >
                    {t("aquarium.debug.remove")}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="aq-debug-actions">
          <button
            type="button"
            className="aq-debug-del"
            onClick={onRemoveAll}
            disabled={!rows.length}
          >
            {t("aquarium.debug.removeAll")}
          </button>
          <button type="button" className="aq-debug-close" onClick={onClose} autoFocus>
            {t("aquarium.debug.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
