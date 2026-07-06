import React, { useMemo, useState } from "react";
import { Sparkles, Coins } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useReward } from "@/context/RewardContext";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import Companion from "@/components/companion/Companion";
import {
  WISH_POOL,
  WISH_COST,
  itemById,
  drawWish,
  companionLine,
} from "@/data/companion/companionData";
import "./Wish.css";

// 祈愿 + 图鉴：把已有金币重构成二游式「无损」祈愿。花金币揭晓一件「还没遇见」的立绘/回忆，
// 抽到的必是新东西（纯进度、无重复挫败）；全部遇见后再抽只回一点星尘（返币），永不空军。
// 刻意不显示「已收集 X / Y」这类分母 KPI —— 只用质化措辞，契合 ADHD 友好原则。

const REVEAL_MS = 1150;

export default function WishPage() {
  const { t } = useLanguage();
  const { coins, spendCoins, addCoins } = useReward();
  const [collection, setCollection] = useLocalStorage(STORAGE_KEYS.COMPANION_COLLECTION, []);
  const [outfit, setOutfit] = useLocalStorage(STORAGE_KEYS.COMPANION_OUTFIT, null);

  const [phase, setPhase] = useState("idle"); // idle | revealing | result
  const [result, setResult] = useState(null); // { type:'item', item } | { type:'stardust', amount }

  const ownedSet = useMemo(() => new Set(collection), [collection]);
  const allMet = ownedSet.size >= WISH_POOL.length;
  // 收齐后停用祈愿（不再扣币），避免「花 120 只返一点星尘」的净亏——那会违背无损承诺。
  const canWish = coins >= WISH_COST && phase === "idle" && !allMet;

  const outfits = WISH_POOL.filter((it) => it.kind === "outfit");
  const lores = WISH_POOL.filter((it) => it.kind === "lore");

  const doWish = () => {
    if (phase !== "idle" || !spendCoins(WISH_COST)) return;
    const draw = drawWish(collection);
    setPhase("revealing");
    setResult(null);
    window.setTimeout(() => {
      if (draw.stardust) {
        addCoins(draw.stardust);
        setResult({ type: "stardust", amount: draw.stardust });
      } else {
        setCollection((prev) => (prev.includes(draw.itemId) ? prev : [...prev, draw.itemId]));
        setResult({ type: "item", item: itemById(draw.itemId) });
      }
      setPhase("result");
    }, REVEAL_MS);
  };

  const closeResult = () => {
    setResult(null);
    setPhase("idle");
  };

  const equip = (id) => setOutfit((prev) => (prev === id ? null : id));

  return (
    <div className="page-wish">
      <div className="wish-headline">
        <h1>{t("wish.title")}</h1>
        <p className="wish-sub">{t("wish.subtitle")}</p>
      </div>

      {/* 祈愿台：伙伴立绘 + 金币 + 祈愿按钮 */}
      <div className="wish-altar">
        <Companion
          mood={phase === "revealing" ? "cheer" : "idle"}
          outfit={outfit}
          size={150}
          say={phase === "idle" ? companionLine(t, "idle") : null}
        />

        <div className="wish-altar-actions">
          <div className="wish-coins">
            <Coins size={18} aria-hidden="true" />
            <span className="wish-coins-val">{coins}</span>
          </div>
          <button
            type="button"
            className="wish-btn"
            onClick={doWish}
            disabled={!canWish}
          >
            <Sparkles size={18} aria-hidden="true" />
            {t("wish.pray")}
            <span className="wish-cost">{t("wish.cost", { n: WISH_COST })}</span>
          </button>
          {!allMet && coins < WISH_COST && (
            <p className="wish-poor">{t("wish.needMore", { n: WISH_COST - coins })}</p>
          )}
          {allMet && <p className="wish-allmet">{t("wish.allMet")}</p>}
        </div>
      </div>

      {/* 图鉴：立绘（可佩戴）+ 回忆 */}
      <section className="wish-dex">
        <div className="wish-dex-head">
          <h2>{t("wish.dex.outfits")}</h2>
          <span className="wish-dex-hint">{t("wish.dex.outfitsHint")}</span>
        </div>
        <div className="wish-grid">
          {outfits.map((it) => (
            <DexCard
              key={it.id}
              item={it}
              owned={ownedSet.has(it.id)}
              equipped={outfit === it.id}
              onEquip={() => equip(it.id)}
              t={t}
            />
          ))}
        </div>

        <div className="wish-dex-head">
          <h2>{t("wish.dex.lore")}</h2>
          <span className="wish-dex-hint">{t("wish.dex.loreHint")}</span>
        </div>
        <div className="wish-grid">
          {lores.map((it) => (
            <DexCard key={it.id} item={it} owned={ownedSet.has(it.id)} t={t} />
          ))}
        </div>
      </section>

      {/* 揭晓遮罩 */}
      {phase === "revealing" && (
        <div className="wish-reveal" role="status" aria-label={t("wish.revealing")}>
          <div className="wish-reveal-burst" />
          <Companion mood="cheer" outfit={outfit} size={170} floating={false} />
        </div>
      )}

      {/* 结果卡 */}
      {phase === "result" && result && (
        <ResultCard result={result} t={t} onClose={closeResult} onEquip={equip} equipped={outfit} />
      )}
    </div>
  );
}

// 图鉴单卡：已遇见=彩色（立绘可点击佩戴）；未遇见=剪影 + 温柔的「尚未相遇」。
function DexCard({ item, owned, equipped, onEquip, t }) {
  const isOutfit = item.kind === "outfit";
  const clickable = owned && isOutfit;
  const Tag = clickable ? "button" : "div";
  return (
    <Tag
      type={clickable ? "button" : undefined}
      className={`wish-card rarity-${item.rarity}${owned ? " owned" : " locked"}${equipped ? " equipped" : ""}`}
      onClick={clickable ? onEquip : undefined}
      title={clickable ? t(equipped ? "wish.card.unequip" : "wish.card.equip") : undefined}
    >
      <div className="wish-card-icon" aria-hidden="true">{owned ? item.icon : "❔"}</div>
      <div className="wish-card-name">
        {owned ? t(`wish.item.${item.id}.name`) : t("wish.card.unmet")}
      </div>
      {owned && <div className="wish-card-desc">{t(`wish.item.${item.id}.desc`)}</div>}
      {equipped && <div className="wish-card-badge">{t("wish.card.wearing")}</div>}
    </Tag>
  );
}

// 揭晓结果：抽到物品或返星尘。抽到立绘可一键佩戴。
function ResultCard({ result, t, onClose, onEquip, equipped }) {
  const isItem = result.type === "item";
  const item = isItem ? result.item : null;
  const isOutfit = isItem && item.kind === "outfit";

  return (
    <div className="wish-result-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={`wish-result${isItem ? ` rarity-${item.rarity}` : " stardust"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="wish-result-glow" aria-hidden="true" />
        {isItem ? (
          <>
            <div className="wish-result-rarity">{t(`wish.rarity.${item.rarity}`)}</div>
            <div className="wish-result-icon">{item.icon}</div>
            <div className="wish-result-name">{t(`wish.item.${item.id}.name`)}</div>
            <div className="wish-result-desc">{t(`wish.item.${item.id}.desc`)}</div>
            <div className="wish-result-line">{companionLine(t, "cheer")}</div>
            <div className="wish-result-actions">
              {isOutfit && (
                <button
                  type="button"
                  className="wish-result-btn primary"
                  onClick={() => {
                    if (equipped !== item.id) onEquip(item.id);
                    onClose();
                  }}
                >
                  {t("wish.result.wearNow")}
                </button>
              )}
              <button type="button" className="wish-result-btn ghost" onClick={onClose}>
                {t("wish.result.keep")}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="wish-result-icon">✨</div>
            <div className="wish-result-name">{t("wish.result.stardust", { n: result.amount })}</div>
            <div className="wish-result-desc">{t("wish.result.stardustDesc")}</div>
            <div className="wish-result-actions">
              <button type="button" className="wish-result-btn primary" onClick={onClose}>
                {t("wish.result.keep")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
