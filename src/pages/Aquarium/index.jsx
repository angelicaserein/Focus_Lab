import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Coins, Egg, Fish } from "lucide-react";
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
import {
  HATCH_AT,
  STAGE,
  growthOf,
  feedResident,
  newResident,
  normalizeCollection,
  ownedSpecies,
} from "@/data/aquarium/growth";
import AquariumTank from "./AquariumTank";
import FishGlyph from "./FishGlyph";
import "./Aquarium.css";

// 生态缸：金币换鱼的收集页。花金币必出一件「还没入住」的新物种（无损、无重复挫败，
// 沿用祈愿页的收集观）——弹一张收集卡揭晓是谁，收下后落进缸里，从此是常驻住客。
//
// 落进缸的是一颗卵：孵成幼体、再长成图鉴里的样子（见 data/aquarium/growth）。故收集进度
// 存的是 { id, born } 而不只是 id——长到哪一步由 born 与当下时间现算，不存阶段。

// 距离下一阶段还有多久，说人话。不到一小时按分钟，超过按小时（保留一位小数太啰嗦，取整）。
function remainLabel(ms, t) {
  const min = Math.max(1, Math.ceil(ms / 60000));
  return min < 60
    ? t("aquarium.growMin", { n: min })
    : t("aquarium.growHour", { n: Math.max(1, Math.round(min / 60)) });
}

export default function AquariumPage() {
  const { t } = useLanguage();
  const { coins, spendCoins } = useReward();
  const [collection, setCollection] = useLocalStorage(
    STORAGE_KEYS.AQUARIUM_COLLECTION,
    [],
  );
  // 存档兼容：老版本存的是纯 id 字符串数组，视作 born=0（早就住进来的，直接是成体）。
  // entries 是「每一只」，同一物种可以有多条，各自一条成长线。
  const entries = useMemo(() => normalizeCollection(collection), [collection]);

  const tankRef = useRef(null);
  // 挂载那一刻的住客，交给 canvas 播种（只读一次，之后靠 drop 增量加入）。
  const initial = useRef(entries).current;

  const [busy, setBusy] = useState(false);
  const [card, setCard] = useState(null); // 收集卡：{ id } | null

  // 图鉴与「是否收集满」看的是物种（去重），不是只数。
  const ownedSet = useMemo(() => ownedSpecies(entries), [entries]);
  const allMet = ownedSet.size >= TOTAL_SPECIES;

  // 同一物种养了不止一只时看最早那只：图鉴显示的是「你养得最久的那只长到哪了」。
  const bornOf = useMemo(() => {
    const m = new Map();
    entries.forEach((e) => {
      const cur = m.get(e.id);
      if (cur == null || e.born < cur) m.set(e.id, e.born);
    });
    return m;
  }, [entries]);

  // 图鉴里的成长是随时间走的，得有人推着重渲染。全长大了就不再跑这个表。
  const [now, setNow] = useState(() => Date.now());
  const growing = useMemo(
    () => entries.some((e) => growthOf(e.born, now).stage !== STAGE.ADULT),
    [entries, now],
  );
  useEffect(() => {
    if (!growing) return undefined;
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [growing]);
  const canBuy = coins >= FISH_COST && !busy && !allMet;
  const canBuyExtra = coins >= FISH_COST && !busy;

  // 先揭晓、后安置：抽到就立刻弹解锁卡（这一刻是「你遇到了谁」），
  // 收下之后才把鱼扔进缸里溅起水花（这一刻是「它住进来了」）。
  const buy = () => {
    if (!canBuy) return;
    if (!spendCoins(FISH_COST)) return;
    const id = drawFish([...ownedSet]);
    if (!id) return; // 理论上 allMet 已拦住
    setBusy(true);
    setCard({ id });
  };

  // 存档追加一只，并让它从上面落进缸里。买新物种与「再请一只」走的是同一条路——
  // 都是新的一只、新的一条成长线，故都要落档（以前「再请一只」只在画布上活着，刷新就没了）。
  const settle = (id) => {
    const rec = newResident(id);
    setCollection((prev) => [...normalizeCollection(prev), rec]);
    tankRef.current?.drop(rec, () => setBusy(false));
  };

  // 缸里某一只吃到一粒饵：往前赶一点成长。喂已经长成的那只不改存档（feedResident 原样返回），
  // 故一缸成体怎么喂都不会一直往 localStorage 写。
  const feed = useCallback(
    (uid) => setCollection((prev) => feedResident(prev, uid)),
    [setCollection],
  );

  // 收集满之后：花金币把喜欢的鱼「再请一只」进缸——已在册，故不弹收集卡，直接扔进去。
  // 也是一颗新卵，和先来的那只各长各的。
  const buyExtra = (id) => {
    if (!canBuyExtra) return;
    if (!spendCoins(FISH_COST)) return;
    setBusy(true);
    settle(id);
  };

  const collect = () => {
    if (!card) return;
    const { id } = card;
    setCard(null);
    settle(id); // 落进缸里，溅起水花，从此是常驻住客——先是一颗卵
  };

  return (
    <div className="page-aquarium">
      <header className="aq-headline">
        <h1>
          {t("aquarium.title")}
          {/* 玩法提示（help icon）：跟专注页优先级矩阵的问号同一套，悬停/点开才展开 */}
          <span className="aq-info">
            <button
              type="button"
              className="aq-info-btn"
              aria-label={t("aquarium.tapHintAria")}
            >
              ?
            </button>
            <span className="aq-info-tip" role="tooltip">
              {t("aquarium.tapHint")}
            </span>
          </span>
        </h1>
        <div className="aq-coins">
          <Coins size={16} aria-hidden="true" />
          <span className="aq-coins-val">{coins}</span>
        </div>
      </header>

      {/* 缸 + 买鱼按钮 */}
      <div className="aq-stage">
        {/* 收集卡打开时让缸停画：卡片带满屏模糊遮罩，底下再逐帧重绘会让合成器每帧重算模糊 */}
        <AquariumTank
          ref={tankRef}
          initial={initial}
          label={t("aquarium.title")}
          paused={!!card}
          onFeed={feed}
        />

        <div className="aq-actions">
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
            // 还没长大的：格子里就是它此刻的样子（卵/幼体），另附还要多久。
            const gr = owned ? growthOf(bornOf.get(sp.id), now) : null;
            const young = gr && gr.stage !== STAGE.ADULT;
            const cls = `aq-slot rarity-${sp.rarity}${owned ? " owned" : " locked"}${
              buyable ? " buyable" : ""
            }${young ? " young" : ""}`;
            const inner = (
              <>
                <div className="aq-slot-icon">
                  {owned ? (
                    <FishGlyph
                      glyph={sp.glyph}
                      size={34}
                      stage={gr.stage}
                      scale={gr.scale}
                    />
                  ) : (
                    "❔"
                  )}
                </div>
                <div className="aq-slot-name">
                  {owned ? t(`aquarium.species.${sp.id}.name`) : t("aquarium.unmet")}
                </div>
                {young && (
                  <div className="aq-slot-grow">
                    {t(`aquarium.stage.${gr.stage}`)} · {remainLabel(gr.remain, t)}
                  </div>
                )}
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

      {/* 生长情况：缸里这些住客各自养到哪一步了 */}
      <GrowthBoard entries={entries} now={now} t={t} />

      {/* 收集卡 */}
      {card && <CollectCard id={card.id} t={t} onCollect={collect} />}
    </div>
  );
}

// 生长情况：图鉴那张卡回答「有谁」，这张回答「各自养到哪一步了」。
// 一行一只住客：现在的样子 + 阶段 + 整条成长线上的进度 + 还要多久。
// 还在长的排前面（快到下一阶段的最靠前），已长成的沉底只留一行素净的交代——
// 每次打开最该看见的是「快好了」的那几只，而不是从头数一遍全员。
function GrowthBoard({ entries, now, t }) {
  const rows = useMemo(() => {
    // 同一物种养了好几只时给个序号（小鱼 ②、③…），不然一列同名的行分不清谁是谁。
    // 序号按入缸先后给，故先来的永远是 ①，不会因为排序换位置而改号。
    const seen = new Map();
    return entries
      .slice()
      .sort((a, b) => a.born - b.born)
      .map((e) => {
        const n = (seen.get(e.id) ?? 0) + 1;
        seen.set(e.id, n);
        return { ...e, nth: n, sp: speciesById(e.id), gr: growthOf(e.born, now) };
      })
      .filter((r) => r.sp)
      .sort((a, b) => {
        const da = a.gr.stage === STAGE.ADULT ? 1 : 0;
        const db = b.gr.stage === STAGE.ADULT ? 1 : 0;
        return da - db || a.gr.remain - b.gr.remain;
      });
  }, [entries, now]);

  if (!rows.length) return null;
  const growing = rows.filter((r) => r.gr.stage !== STAGE.ADULT).length;
  // 只有养了不止一只的物种才需要显示序号
  const many = new Set(
    rows.filter((r, _i, all) => all.filter((o) => o.id === r.id).length > 1).map((r) => r.id),
  );

  return (
    <section className="aq-growth">
      <div className="aq-dex-head">
        <h2>{t("aquarium.growTitle")}</h2>
        <span className="aq-dex-count">
          {growing
            ? t("aquarium.growCount", { n: growing, total: rows.length })
            : t("aquarium.growAllDone")}
        </span>
      </div>
      {/* 喂食能加速这件事，只有在「看得见进度」的地方说才有用——写在缸边上没人会把两件事连起来 */}
      {growing > 0 && <p className="aq-grow-note">{t("aquarium.feedNote")}</p>}
      {/* 破膜刻度的位置来自同一份 growth，改门槛时刻度自己跟着挪，不会和条对不上 */}
      <ul className="aq-grow-list" style={{ "--hatch": `${(HATCH_AT * 100).toFixed(1)}%` }}>
        {rows.map((r) => {
          const done = r.gr.stage === STAGE.ADULT;
          return (
            <li key={r.uid} className={`aq-grow-row${done ? " done" : ""}`}>
              <span className="aq-grow-icon">
                <FishGlyph glyph={r.sp.glyph} size={26} stage={r.gr.stage} scale={r.gr.scale} />
              </span>
              <span className="aq-grow-name">
                {t(`aquarium.species.${r.id}.name`)}
                {many.has(r.id) && <span className="aq-grow-nth">{r.nth}</span>}
              </span>
              <span className="aq-grow-meta">
                {t(`aquarium.stage.${r.gr.stage}`)}
                {!done && <> · {remainLabel(r.gr.remain, t)}</>}
              </span>
              {!done && (
                <span
                  className="aq-grow-bar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(r.gr.grown * 100)}
                  aria-label={t(`aquarium.species.${r.id}.name`)}
                >
                  <i style={{ width: `${(r.gr.grown * 100).toFixed(1)}%` }} />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
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
          <FishGlyph glyph={sp.glyph} size={66} />
        </div>
        <h3 className="aq-card-name">{t(`aquarium.species.${id}.name`)}</h3>
        <div className="aq-card-rarity">
          {[1, 2, 3].map((i) => (
            <i key={i} className={i <= sp.rarity ? "on" : ""} />
          ))}
          <span className="aq-card-rarity-label">{t(`aquarium.rarity.${sp.rarity}`)}</span>
        </div>
        <p className="aq-card-cap">{t(`aquarium.species.${id}.desc`)}</p>
        {/* 卡上给的是成体像——「你遇到了谁」不该被一颗看不出物种的卵替掉；
            真正落进缸的是卵，故在这里说清楚，免得以为图鉴显示错了。 */}
        <p className="aq-card-egg">
          <Egg size={14} aria-hidden="true" />
          {t("aquarium.eggNote")}
        </p>
        <button type="button" className="aq-card-btn" onClick={onCollect}>
          {t("aquarium.collect")}
        </button>
      </div>
    </div>
  );
}
