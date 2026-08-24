import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Coins, Egg, Fish } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useReward } from "@/context/RewardContext";
import useResidents from "@/hooks/aquarium/useResidents";
import useFlaskShelf from "@/hooks/flask/useFlaskShelf";
import useFlaskFills from "@/hooks/flask/useFlaskFills";
import { flaskSlots, slotLabel, splitResidents } from "@/data/specimen";
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
  hatchedSpecies,
  newResident,
  normalizeCollection,
  numberResidents,
  ownedSpecies,
} from "@/data/aquarium/growth";
import AquariumTank from "./AquariumTank";
import AquariumDebugPanel from "./AquariumDebugPanel";
import FishGlyph from "./FishGlyph";
import "./Aquarium.css";

// 调试面板（删鱼）只在开发环境存在：收集是无损的，正式构建里不该有「删掉一只」这条路
const DEBUG_ENABLED = import.meta.env.DEV;

// 生态缸：金币换鱼的收集页。花金币必出一件「还没入住」的新物种（无损、无重复挫败，
// 沿用祈愿页的收集观）。
//
// 但换回来的不是一只成体，而是一颗看不出品种的卵：是谁在抽的那一刻就定了（存进档里），
// 只是不告诉你——要等它孵成幼体、显形，图鉴那一格才解锁、名字才报得出来。故：
//   已拿到（含卵）＝ ownedSpecies，抽取避重与「是否收集满」看它；
//   已显形       ＝ hatchedSpecies，图鉴、生长情况里报名字看它。
// 卵一律画成中性色的同一颗（见 FishGlyph / AquariumTank 的 tint），颜色也不许剧透。
//
// 成长见 data/aquarium/growth：存的是 { id, born }，长到哪一步由 born 与当下时间现算。

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
  // 存档兼容：老版本存的是纯 id 字符串数组，视作 born=0（早就住进来的，直接是成体）。
  // entries 是「每一只」，同一物种可以有多条，各自一条成长线。
  const { entries, setCollection } = useResidents();
  // 被做成标本封进烧瓶的那些不在缸里游了（见 data/specimen）；那只瓶子不在了就自动回来，
  // 故这里要拿架上当下真实存在的槽位（＝每个形状注满了几只）去判定。水位走和烧瓶架页
  // 同一个 hook——各算各的话（比如这边漏掉调试覆盖）就会两页打架：那边封得进去，
  // 这边认为槽位不存在，于是刚封好的那只又回缸里游。
  const { items: flasks } = useFlaskShelf();
  const { fills } = useFlaskFills();
  const slots = useMemo(() => flaskSlots(flasks, fills), [flasks, fills]);
  const { sealed, swimming } = useMemo(
    () => splitResidents(entries, slots),
    [entries, slots],
  );

  const tankRef = useRef(null);
  // 挂载那一刻的住客，交给 canvas 播种（只读一次，之后靠 drop 增量加入）。
  const initial = useRef(swimming).current;

  // 缸里那批是播种 + drop 增量维护的，不跟着 swimming 走；故「不该在缸里了」得在这儿补一刀，
  // 否则封进瓶子的那只要等下次重进页面才消失（这一刻它明明已经在烧瓶里了）。
  // 只管减不管加：进缸永远是 drop（要走那段入水动画），从别处凭空出现的没有。
  const shownRef = useRef(new Set(initial.map((e) => e.uid)));
  useEffect(() => {
    const alive = new Set(swimming.map((e) => e.uid));
    shownRef.current.forEach((uid) => {
      if (!alive.has(uid)) tankRef.current?.remove(uid);
    });
    shownRef.current = alive;
  }, [swimming]);

  const [busy, setBusy] = useState(false);
  // 卡片队列：{ kind: "egg" | "hatch", id }。买到的卵弹一张（收下才落进缸），
  // 破膜的弹一张（只是揭晓）。同一刻可能两件事撞上，故排队一张张来。
  const [cards, setCards] = useState([]);
  const card = cards[0] ?? null;

  // 成长随时间走，得有人推着重渲染（图鉴解锁、破膜揭晓都挂在这个 now 上）。全长大了就不再跑。
  const [now, setNow] = useState(() => Date.now());

  // 已拿到的物种（含还是卵的）：抽取避重、判「收集满」用它——卵也占着那一格，
  // 不然会抽到一个你已经有卵在孵的物种。
  const ownedSet = useMemo(() => ownedSpecies(entries), [entries]);
  const allMet = ownedSet.size >= TOTAL_SPECIES;
  // 已显形的物种：图鉴只解锁这些。
  const metSet = useMemo(() => hatchedSpecies(entries, now), [entries, now]);
  const eggCount = useMemo(
    () => entries.filter((e) => growthOf(e.born, now).stage === STAGE.EGG).length,
    [entries, now],
  );

  // 同一物种养了不止一只时看最早那只：图鉴显示的是「你养得最久的那只长到哪了」。
  // 最早那只必然是长得最靠前的那只，故已显形的物种在图鉴里不会显示成卵。
  const bornOf = useMemo(() => {
    const m = new Map();
    entries.forEach((e) => {
      const cur = m.get(e.id);
      if (cur == null || e.born < cur) m.set(e.id, e.born);
    });
    return m;
  }, [entries]);

  const growing = useMemo(
    () => swimming.some((e) => growthOf(e.born, now).stage !== STAGE.ADULT),
    [swimming, now],
  );
  useEffect(() => {
    if (!growing) return undefined;
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [growing]);

  // 破膜＝显形：开着页面时，卵一变成幼体就弹一张卡揭晓是谁。
  // eggRef 记的是上一次看到还是卵的那些 uid；挂载那一次只记录不揭晓——
  // 不在页面时破的膜不补弹卡（回来时图鉴里已经解锁了，看得到）。
  const eggRef = useRef(null);
  useEffect(() => {
    const stillEgg = new Set(
      entries.filter((e) => growthOf(e.born, now).stage === STAGE.EGG).map((e) => e.uid),
    );
    const prev = eggRef.current;
    eggRef.current = stillEgg;
    if (!prev) return;
    // 「不再是卵」里要剔掉存档里已经没了的那些（调试删掉的不算破膜）
    const byUid = new Map(entries.map((e) => [e.uid, e]));
    const hatched = [...prev].filter((uid) => !stillEgg.has(uid) && byUid.has(uid));
    if (hatched.length) {
      setCards((q) => [...q, ...hatched.map((uid) => ({ kind: "hatch", id: byUid.get(uid).id }))]);
    }
  }, [entries, now]);

  const canBuy = coins >= FISH_COST && !busy && !allMet;
  const canBuyExtra = coins >= FISH_COST && !busy;

  // 抽到谁这一刻就定了，但卡上只给一颗卵——揭晓推迟到破膜那天。
  // 先抽后扣：抽空（理论上 allMet 已拦住）时金币不能已经花出去了——
  // 那会是「按了一下，币没了，什么都没得到」，比不给抽还糟。
  const buy = () => {
    if (!canBuy) return;
    const id = drawFish([...ownedSet]);
    if (!id) return;
    if (!spendCoins(FISH_COST)) return;
    setBusy(true);
    setCards((q) => [...q, { kind: "egg", id }]);
  };

  // 存档追加一只，并让它从上面落进缸里。买新物种与「再请一只」走的是同一条路——
  // 都是新的一只、新的一条成长线，故都要落档（以前「再请一只」只在画布上活着，刷新就没了）。
  const settle = (id) => {
    const rec = newResident(id);
    setCollection((prev) => [...normalizeCollection(prev), rec]);
    // busy 是靠 drop 的落地回调解开的。缸要是没挂上（理论上不会），
    // 没人来调那个回调，买鱼按钮就永远灰着——这里兜一下，宁可少一段入水动画。
    if (tankRef.current) tankRef.current.drop(rec, () => setBusy(false));
    else setBusy(false);
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

  // 调试：删掉某一只。存档删一条，缸里那只随即消失——两边都得动，只删存档的话
  // 页面不重挂就还在游（缸的住客是挂载时播种、之后靠 drop 增量维护的）。
  const [debugOpen, setDebugOpen] = useState(false);
  const sealedUids = useMemo(
    () => new Set(Object.values(sealed).map((e) => e.uid)),
    [sealed],
  );
  const removeResident = (uid) => {
    setCollection((prev) => normalizeCollection(prev).filter((e) => e.uid !== uid));
    tankRef.current?.remove(uid);
  };
  const removeAllResidents = () => {
    entries.forEach((e) => tankRef.current?.remove(e.uid));
    setCollection([]);
  };

  // 关掉队首那张。买来的那颗卵是在这一刻才落进缸里的（先接过卵、再放进去）；
  // 破膜卡只是揭晓，缸里那只早自己长过去了，没什么要安置。
  const dismiss = () => {
    const top = cards[0];
    setCards((q) => q.slice(1));
    if (top?.kind === "egg") settle(top.id);
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
        <div className="aq-head-right">
          {DEBUG_ENABLED && (
            <button
              type="button"
              className="aq-debug-btn"
              title={t("aquarium.debug.open")}
              aria-label={t("aquarium.debug.open")}
              onClick={() => setDebugOpen(true)}
            >
              {t("aquarium.debug.btn")}
            </button>
          )}
          <div className="aq-coins">
            <Coins size={16} aria-hidden="true" />
            <span className="aq-coins-val">{coins}</span>
          </div>
        </div>
      </header>

      {DEBUG_ENABLED && debugOpen && (
        <AquariumDebugPanel
          entries={entries}
          sealedUids={sealedUids}
          flasks={flasks}
          onRemove={removeResident}
          onRemoveAll={removeAllResidents}
          onClose={() => setDebugOpen(false)}
        />
      )}

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

      {/* 图鉴：已显形＝彩色，还没显形（含手里正孵着的卵）＝剪影 */}
      <section className="aq-dex">
        <div className="aq-dex-head">
          <h2>{t("aquarium.dexTitle")}</h2>
          <span className="aq-dex-count">
            {t("aquarium.dexCount", { n: metSet.size, total: TOTAL_SPECIES })}
            {/* 缸里还孵着几颗——不然「买了却没多一格」会像是没生效 */}
            {eggCount > 0 && (
              <span className="aq-dex-eggs">{t("aquarium.eggsPending", { n: eggCount })}</span>
            )}
          </span>
        </div>
        <div className="aq-grid">
          {FISH_SPECIES.map((sp) => {
            const owned = metSet.has(sp.id);
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

      {/* 生长情况：缸里这些住客各自养到哪一步了（封成标本的已不在缸里，见下面那节） */}
      <GrowthBoard entries={swimming} now={now} t={t} />

      {/* 封存的标本：养成的那几只现在待在烧瓶里。放在生长情况之后——
          先看还在长的，再看已经收好的。 */}
      <SpecimenBoard sealed={sealed} flasks={flasks} t={t} />

      {/* 卡片：买到的卵（还不知是谁）／破膜显形（第一次报名字） */}
      {card && <CollectCard kind={card.kind} id={card.id} t={t} onClose={dismiss} />}
    </div>
  );
}

// 生长情况：图鉴那张卡回答「有谁」，这张回答「各自养到哪一步了」。
// 一行一只住客：现在的样子 + 阶段 + 整条成长线上的进度 + 还要多久。
// 还在长的排前面（快到下一阶段的最靠前），已长成的沉底只留一行素净的交代——
// 每次打开最该看见的是「快好了」的那几只，而不是从头数一遍全员。
function GrowthBoard({ entries, now, t }) {
  // 序号（②、③…）与「哪些物种不止一只」的口径见 numberResidents，与调试面板共用。
  // 这里在其上再按「还在长的排前面、快到下一阶段的最靠前」排一次——
  // 每次打开最该看见的是「快好了」的那几只，而不是从头数一遍全员。
  const { rows, many } = useMemo(() => {
    const { rows: numbered, many: dup } = numberResidents(entries);
    return {
      many: dup,
      rows: numbered
        .map((e) => ({ ...e, sp: speciesById(e.id), gr: growthOf(e.born, now) }))
        .filter((r) => r.sp)
        .sort((a, b) => {
          const da = a.gr.stage === STAGE.ADULT ? 1 : 0;
          const db = b.gr.stage === STAGE.ADULT ? 1 : 0;
          return da - db || a.gr.remain - b.gr.remain;
        }),
    };
  }, [entries, now]);

  if (!rows.length) return null;
  const growing = rows.filter((r) => r.gr.stage !== STAGE.ADULT).length;

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
          // 还是卵的那行不报品种：名字、序号都得等破膜（序号也是线索——「小鱼 ②」等于说了）
          const egg = r.gr.stage === STAGE.EGG;
          const name = egg
            ? t("aquarium.eggUnknown")
            : t(`aquarium.species.${r.id}.name`);
          return (
            <li key={r.uid} className={`aq-grow-row${done ? " done" : ""}`}>
              <span className="aq-grow-icon">
                <FishGlyph glyph={r.sp.glyph} size={26} stage={r.gr.stage} scale={r.gr.scale} />
              </span>
              <span className={`aq-grow-name${egg ? " unknown" : ""}`}>
                {name}
                {!egg && many.has(r.id) && <span className="aq-grow-nth">{r.nth}</span>}
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
                  aria-label={name}
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

// 封存的标本：哪一只、封在哪只瓶子里。缸里少了一只总得有个交代——
// 不然只会以为鱼没了。取出放回缸里在烧瓶架那边（标本是瓶子的一部分，操作跟着瓶子走）。
function SpecimenBoard({ sealed, flasks, t }) {
  const rows = Object.entries(sealed);
  if (!rows.length) return null;
  return (
    <section className="aq-growth">
      <div className="aq-dex-head">
        <h2>{t("aquarium.sealedTitle")}</h2>
        <span className="aq-dex-count">{t("aquarium.sealedCount", { n: rows.length })}</span>
      </div>
      <ul className="aq-grow-list">
        {rows.map(([slot, e]) => (
          <li key={e.uid} className="aq-grow-row done">
            <span className="aq-grow-icon">
              <FishGlyph glyph={e.id} size={26} />
            </span>
            <span className="aq-grow-name">{t(`aquarium.species.${e.id}.name`)}</span>
            <span className="aq-grow-meta">
              <Link className="aq-sealed-link" to="/flasks">
                {slotLabel(slot, flasks, t)}
              </Link>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// 卡片。两种：
//   egg   刚换回来的一颗卵——不给名字、不给稀有度（星数也是线索），收下才落进缸里
//   hatch 它破膜了——这一刻才第一次报出是谁，图鉴同时解锁
function CollectCard({ kind, id, t, onClose }) {
  const sp = speciesById(id);
  if (!sp) return null;
  const egg = kind === "egg";
  return (
    <div className="aq-card-veil" role="dialog" aria-modal="true">
      <div className={`aq-card rarity-${egg ? 1 : sp.rarity}`}>
        <div className="aq-card-glow" aria-hidden="true" />
        <div className="aq-card-eye">{t(egg ? "aquarium.eggNew" : "aquarium.hatchedEye")}</div>
        <div className="aq-card-medal">
          {/* 卵走 stage=EGG：通用卵造型 + 中性色，看不出是哪一种 */}
          <FishGlyph glyph={sp.glyph} size={66} stage={egg ? STAGE.EGG : STAGE.ADULT} />
        </div>
        <h3 className="aq-card-name">
          {t(egg ? "aquarium.eggName" : `aquarium.species.${id}.name`)}
        </h3>
        {!egg && (
          <div className="aq-card-rarity">
            {[1, 2, 3].map((i) => (
              <i key={i} className={i <= sp.rarity ? "on" : ""} />
            ))}
            <span className="aq-card-rarity-label">{t(`aquarium.rarity.${sp.rarity}`)}</span>
          </div>
        )}
        <p className="aq-card-cap">
          {t(egg ? "aquarium.eggMystery" : `aquarium.species.${id}.desc`)}
        </p>
        {egg && (
          <p className="aq-card-egg">
            <Egg size={14} aria-hidden="true" />
            {t("aquarium.eggWait")}
          </p>
        )}
        <button type="button" className="aq-card-btn" onClick={onClose}>
          {t(egg ? "aquarium.eggPut" : "aquarium.meet")}
        </button>
      </div>
    </div>
  );
}
