import React, { useMemo, useRef, useState } from "react";
import { Coins, Fish } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useReward } from "@/context/RewardContext";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import {
  FISH_SPECIES,
  FISH_COST,
  TOTAL_SPECIES,
  drawFish,
  speciesById,
} from "@/data/aquarium/aquariumData";
import AquariumTank from "./AquariumTank";
import FishGlyph from "./FishGlyph";
import "./Aquarium.css";

// 生态缸：金币换鱼的收集页。花金币必出一件「还没入住」的新物种（无损、无重复挫败，
// 沿用祈愿页的收集观）——鱼跃出水面、弹一张收集卡，收下后潜回缸里，从此和其他住客一起游。
// 全部入住后停止售卖（缸已圆满）。收集进度是持久化的物种 id 列表。

export default function AquariumPage() {
  const { t } = useLanguage();
  const { coins, spendCoins } = useReward();
  const [collection, setCollection] = useLocalStorage(
    STORAGE_KEYS.AQUARIUM_COLLECTION,
    [],
  );

  const tankRef = useRef(null);
  // 挂载那一刻的已入住物种，交给 canvas 播种（只读一次，之后靠 dive 增量加入）。
  const initialKeys = useRef(collection).current;

  const [busy, setBusy] = useState(false);
  const [card, setCard] = useState(null); // 收集卡：{ id } | null

  const ownedSet = useMemo(() => new Set(collection), [collection]);
  const allMet = ownedSet.size >= TOTAL_SPECIES;
  const canBuy = coins >= FISH_COST && !busy && !allMet;
  const canBuyExtra = coins >= FISH_COST && !busy;

  const buy = () => {
    if (!canBuy) return;
    if (!spendCoins(FISH_COST)) return;
    const id = drawFish(collection);
    if (!id) return; // 理论上 allMet 已拦住
    setBusy(true);
    // 浪花 + 跃出；到顶点弹收集卡
    tankRef.current?.reveal(id, () => setCard({ id }));
  };

  // 收集满之后：花金币把喜欢的鱼「再请一只」进缸——已在册，故不弹收集卡，
  // 跃出到顶点后直接潜回，成为又一位常驻住客。
  const buyExtra = (id) => {
    if (!canBuyExtra) return;
    if (!spendCoins(FISH_COST)) return;
    setBusy(true);
    tankRef.current?.reveal(id, () => {
      tankRef.current?.dive(id);
      setBusy(false);
    });
  };

  const collect = () => {
    if (!card) return;
    const { id } = card;
    setCard(null);
    setCollection((prev) => (prev.includes(id) ? prev : [...prev, id]));
    // 潜回缸里，成为常驻住客
    tankRef.current?.dive(id);
    setBusy(false);
  };

  return (
    <div className="page-aquarium">
      {/* 缸 + 金币 + 买鱼按钮 */}
      <div className="aq-stage">
        <AquariumTank ref={tankRef} initialKeys={initialKeys} />

        <div className="aq-actions">
          <div className="aq-coins">
            <Coins size={18} aria-hidden="true" />
            <span className="aq-coins-val">{coins}</span>
          </div>
          {!allMet ? (
            <>
              <button type="button" className="aq-buy" onClick={buy} disabled={!canBuy}>
                <Fish size={18} aria-hidden="true" />
                {t("aquarium.buy")}
                <span className="aq-cost">{t("aquarium.cost", { n: FISH_COST })}</span>
              </button>
              {coins < FISH_COST && (
                <p className="aq-hint aq-poor">
                  {t("aquarium.needMore", { n: FISH_COST - coins })}
                </p>
              )}
            </>
          ) : (
            <p className="aq-hint aq-allmet">
              {t("aquarium.addMore", { n: FISH_COST })}
            </p>
          )}
        </div>
      </div>

      {/* 图鉴：已入住＝彩色，未遇见＝剪影 */}
      <section className="aq-dex">
        <div className="aq-dex-head">
          <h2>{t("aquarium.dexTitle")}</h2>
          <span className="aq-dex-count">
            {t("aquarium.dexCount", { n: ownedSet.size, total: TOTAL_SPECIES })}
          </span>
        </div>
        <div className="aq-grid">
          {FISH_SPECIES.map((sp) => {
            const owned = ownedSet.has(sp.id);
            // 收集满后，图鉴里的每一格都成了「再买一只」的按钮。
            const buyable = allMet && owned;
            const cls = `aq-slot rarity-${sp.rarity}${owned ? " owned" : " locked"}${
              buyable ? " buyable" : ""
            }`;
            const inner = (
              <>
                <div className="aq-slot-icon">
                  {owned ? <FishGlyph glyph={sp.glyph} size={30} /> : "❔"}
                </div>
                <div className="aq-slot-name">
                  {owned ? t(`aquarium.species.${sp.id}.name`) : t("aquarium.unmet")}
                </div>
              </>
            );
            return buyable ? (
              <button
                key={sp.id}
                type="button"
                className={cls}
                onClick={() => buyExtra(sp.id)}
                disabled={!canBuyExtra}
                title={t("aquarium.addOne", { n: FISH_COST })}
                aria-label={`${t(`aquarium.species.${sp.id}.name`)} · ${t("aquarium.addOne", { n: FISH_COST })}`}
              >
                {inner}
              </button>
            ) : (
              <div key={sp.id} className={cls}>
                {inner}
              </div>
            );
          })}
        </div>
      </section>

      {/* 收集卡 */}
      {card && <CollectCard id={card.id} t={t} onCollect={collect} />}
    </div>
  );
}

// 收集卡：鱼跃出后弹出，展示物种 + 稀有度 + 一句话，点「收下」入册并潜回缸里。
function CollectCard({ id, t, onCollect }) {
  const sp = speciesById(id);
  if (!sp) return null;
  return (
    <div className="aq-card-veil" role="dialog" aria-modal="true">
      <div className={`aq-card rarity-${sp.rarity}`}>
        <div className="aq-card-glow" aria-hidden="true" />
        <div className="aq-card-eye">{t("aquarium.new")}</div>
        <div className="aq-card-medal">
          <FishGlyph glyph={sp.glyph} size={56} />
        </div>
        <h3 className="aq-card-name">{t(`aquarium.species.${id}.name`)}</h3>
        <div className="aq-card-rarity">
          {[1, 2, 3].map((i) => (
            <i key={i} className={i <= sp.rarity ? "on" : ""} />
          ))}
          <span className="aq-card-rarity-label">{t(`aquarium.rarity.${sp.rarity}`)}</span>
        </div>
        <p className="aq-card-cap">{t(`aquarium.species.${id}.desc`)}</p>
        <button type="button" className="aq-card-btn" onClick={onCollect}>
          {t("aquarium.collect")}
        </button>
      </div>
    </div>
  );
}
