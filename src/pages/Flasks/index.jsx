// React 必须显式引入：本项目没装 @vitejs/plugin-react，JSX 走 esbuild 的经典
// 转换（编译成 React.createElement），少了这个默认导入整页会 React is not defined。
import React, { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, FlaskConical, Trash2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useFocus } from "@/context/FocusContext";
import useFlaskShelf from "@/hooks/flask/useFlaskShelf";
import useResidents from "@/hooks/aquarium/useResidents";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import { flaskReady, sealable, splitResidents } from "@/data/specimen";
import FishGlyph from "@/pages/Aquarium/FishGlyph";
import { FlaskGraphic } from "@/pages/Focus/FocusFlask";
import {
  DEFAULT_SHELF_SORT,
  FLASK_FULL_SECS,
  SHELF_SORTS,
  bottlesOf,
  fillsOf,
  normalizeSort,
  shelfStats,
  sortShelf,
} from "./flaskShelf";
import {
  clearDebugFill,
  mergeDebugFills,
  normalizeDebugFills,
  setDebugFill,
} from "./flaskDebug";
import FlaskDebugPanel from "./FlaskDebugPanel";
import "./Flasks.css";

// 烧瓶架：把设置页调好的形状一只只存下来，挑一只作为「现在往里注水」的瓶子。
// 一小时专注注满一只；接满了不停手，多出来的直接流进下一只同样形状的瓶子。
//
// 排版：分上下两个板块。
//   上：架上（正在接的）——每个存下来的形状一张卡，能改名、能挑一只接水、能移出。
//       这一层是「操作台」，回答的是「现在往哪只里注」。
//   下：注满的（图鉴）——攒下的满瓶一只一张卡平铺，纯展示的收藏品。
//       注满一只就多一张卡，而不是缩成瓶身上一枚 ×N 角标
//       （数字要数，瓶子一眼就看得见有多少）。
// 两层分开是因为它们的性质不同：上面那层随时会变（换形状、换选中），
// 下面那层只增不减——攒下的东西不该跟操作项混在一格里被扫过去。
//
// 注满进度不在这儿存档，是从专注记录（record.flaskId）现算的，见 flaskShelf.js。
//
// 注满一小时的瓶子还能干一件事：把生态缸里养成的一只封进去做成标本（见 data/specimen）。
// 封存写在生态缸那条住客记录上，故这里只读不存——瓶子被移出架子，里面那只自动回缸里游。

// 秒数 → 「1 小时 20 分」。整点不带零头，不足一小时只说分钟。
function dur(secs, t) {
  const mins = Math.max(0, Math.round(secs / 60));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return t("flasks.hm", { h, m });
  if (h) return t("flasks.h", { h });
  return t("flasks.m", { m });
}

// 时间戳 → 「今天 / 昨天 / N 天前 / N 周前 / 很久以前」。
// 卡片上只是交代「这只最近有没有在用」，粒度到天就够，不必精确到分钟。
function ago(ts, t) {
  if (!ts) return null;
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (days <= 0) return t("flasks.agoToday");
  if (days === 1) return t("flasks.agoYesterday");
  if (days < 7) return t("flasks.agoDays", { n: days });
  if (days < 30) return t("flasks.agoWeeks", { n: Math.floor(days / 7) });
  return t("flasks.agoLong");
}

// 水位调试按钮同奖励页：只在开发环境露出，发布给参与者时自动消失。
const DEBUG_ENABLED = import.meta.env.DEV;

export default function FlasksPage() {
  const { t } = useLanguage();
  const { focusRecords } = useFocus();
  const { items, activeId, removeFlask, renameFlask, setActiveFlask } = useFlaskShelf();

  // 每只瓶子的账：水量、注过几次、最近一次什么时候
  const stats = useMemo(() => shelfStats(focusRecords), [focusRecords]);
  const realFills = useMemo(() => fillsOf(stats), [stats]);

  // 调试覆盖：只有开发环境读得到，正式构建里 fills 就是现算值本身
  const [rawDebug, setRawDebug] = useLocalStorage(STORAGE_KEYS.FLASK_DEBUG_FILL, null);
  const debugFills = useMemo(
    () => (DEBUG_ENABLED ? normalizeDebugFills(rawDebug) : {}),
    [rawDebug],
  );
  const [debugOpen, setDebugOpen] = useState(false);
  const fills = useMemo(
    () => (DEBUG_ENABLED ? mergeDebugFills(realFills, debugFills) : realFills),
    [realFills, debugFills],
  );

  // 架子的排法。存的是「怎么看」而不是架子本身，所以单独一个 key，
  // 换排法不动 FLASK_SHELF 的存档顺序——切回「存入顺序」永远能回到原样。
  const [rawSort, setRawSort] = useLocalStorage(
    STORAGE_KEYS.FLASK_SHELF_SORT,
    DEFAULT_SHELF_SORT,
  );
  const sort = normalizeSort(rawSort);
  const shown = useMemo(() => sortShelf(items, stats, sort), [items, stats, sort]);

  // 移出是不可逆的（形状没了就得回设置页重调），所以点垃圾桶只是「问一句」，
  // 真正动手要再确认一次。同一时刻只问一只。
  const [confirmId, setConfirmId] = useState(null);

  // —— 标本 ——
  // 架上每只瓶子里封着谁（sealed），以及缸里有没有长成、可以被封的（ready）。
  // ready 只用来决定「要不要露出封存的入口」；真正挑的那一刻由 SealPicker 重算一次，
  // 故在这一页上开着不动、期间某只刚好长成，也不会挑到一只算漏的。
  const { entries, seal, unseal } = useResidents();
  const flaskIds = useMemo(() => items.map((it) => it.id), [items]);
  const sealed = useMemo(() => splitResidents(entries, flaskIds).sealed, [entries, flaskIds]);
  const hasReady = useMemo(
    () => sealable(entries, flaskIds).length > 0,
    [entries, flaskIds],
  );
  // 正在为哪只瓶子挑标本（null＝没在挑）
  const [sealFor, setSealFor] = useState(null);

  // 攒下的满瓶摊平成一张张卡：按上面那层的排法逐个形状展开。
  // 封着的标本归各形状的第一只满瓶（和以前一样），故在这儿一并算好，
  // 下面渲染时只管照着摆。
  const filled = useMemo(() => {
    const list = [];
    for (const it of shown) {
      const { full } = bottlesOf(fills[it.id] ?? 0);
      const specimen = sealed[it.id] ?? null;
      for (let i = 0; i < full; i += 1) {
        list.push({
          key: `${it.id}#${i}`,
          flask: it,
          specimen: i === 0 ? specimen : null,
          canSeal: i === 0 && !specimen && hasReady,
        });
      }
    }
    return list;
  }, [shown, fills, sealed, hasReady]);

  // 架上一共几只瓶子：存下的形状数 + 各自攒下的满瓶数。
  // 满瓶各占一张卡，这个数就是两个板块里能数到的卡片数总和——报的和看见的对得上。
  const bottleCount = items.length + filled.length;

  const handleRemove = useCallback(
    (id) => {
      setConfirmId(null);
      removeFlask(id);
    },
    [removeFlask],
  );

  return (
    <div className="page-flasks">
      <header className="fk-headline">
        <h1>{t("flasks.title")}</h1>
        <div className="fk-headline-side">
          {items.length > 0 && (
            <span className="fk-count">{t("flasks.shelfCount", { n: bottleCount })}</span>
          )}
          {/* 排法：架上不止一只才有意义 */}
          {items.length > 1 && (
            <label className="fk-sort">
              <span className="fk-sort-label">{t("flasks.sortBy")}</span>
              <select value={sort} onChange={(e) => setRawSort(e.target.value)}>
                {SHELF_SORTS.map((key) => (
                  <option key={key} value={key}>
                    {t(`flasks.sort.${key}`)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {DEBUG_ENABLED && (
            <button
              type="button"
              className="fk-debug-btn"
              title="调试：修改烧瓶水位"
              aria-label="调试：修改烧瓶水位"
              onClick={() => setDebugOpen(true)}
            >
              🛠️ 调试
            </button>
          )}
        </div>
      </header>
      <p className="fk-lead">{t("flasks.lead")}</p>

      {DEBUG_ENABLED && debugOpen && (
        <FlaskDebugPanel
          flasks={shown}
          realFills={realFills}
          debugFills={debugFills}
          onSet={(id, secs) => setRawDebug((prev) => setDebugFill(prev, id, secs))}
          onClear={(id) => setRawDebug((prev) => clearDebugFill(prev, id))}
          onClearAll={() => setRawDebug({})}
          onClose={() => setDebugOpen(false)}
        />
      )}

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
        <>
          {/* —— 上：架上正在接的 —— */}
          <section className="fk-section">
            <header className="fk-section-head">
              <h2 className="fk-section-title">{t("flasks.sectionShelf")}</h2>
              <span className="fk-section-count">
                {t("flasks.sectionShelfCount", { n: items.length })}
              </span>
            </header>
            <p className="fk-section-note">{t("flasks.sectionShelfNote")}</p>
            <ul className="fk-grid">
              {shown.map((it) => {
                const secs = fills[it.id] ?? 0;
                const { full } = bottlesOf(secs);
                const specimen = sealed[it.id] ?? null;
                return (
                  <ShelfCard
                    key={it.id}
                    flask={it}
                    secs={secs}
                    stat={stats[it.id]}
                    active={it.id === activeId}
                    confirming={confirmId === it.id}
                    specimen={specimen}
                    // 封着的那只画在下面那层的第一只满瓶里（标本本来就封在注满的瓶中）；
                    // 一只满瓶都没有时（调试改水位等）才退回来画在正在接的这只上，免得凭空消失。
                    glyph={full === 0}
                    hasReady={hasReady}
                    t={t}
                    onSelect={() => {
                      setConfirmId(null);
                      setActiveFlask(it.id);
                    }}
                    onRename={(name) => renameFlask(it.id, name)}
                    onAskRemove={() => setConfirmId(it.id)}
                    onCancelRemove={() => setConfirmId(null)}
                    onRemove={() => handleRemove(it.id)}
                    onUnseal={() => unseal(specimen?.uid)}
                  />
                );
              })}
            </ul>
          </section>

          {/* —— 下：注满的（图鉴）——
              一只满瓶一张卡，只增不减。一只都还没有时也留着这个板块的标题，
              让人知道上面注满了会掉到哪儿去，而不是等它凭空冒出来。 */}
          <section className="fk-section fk-section-filled">
            <header className="fk-section-head">
              <h2 className="fk-section-title">{t("flasks.sectionFilled")}</h2>
              {filled.length > 0 && (
                <span className="fk-section-count">
                  {t("flasks.sectionFilledCount", { n: filled.length })}
                </span>
              )}
            </header>
            <p className="fk-section-note">{t("flasks.sectionFilledNote")}</p>
            {filled.length === 0 ? (
              <p className="fk-filled-empty">{t("flasks.filledEmpty")}</p>
            ) : (
              <ul className="fk-grid">
                {filled.map((b) => (
                  <FullCard
                    key={b.key}
                    flask={b.flask}
                    specimen={b.specimen}
                    // 封存的入口归第一只满瓶：标本本来就封在注满的那只里，
                    // 按钮和它作用的那只瓶子摆在同一张卡上。
                    canSeal={b.canSeal}
                    t={t}
                    onAskSeal={() => setSealFor(b.flask.id)}
                    onUnseal={() => unseal(b.specimen?.uid)}
                  />
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {sealFor && (
        <SealPicker
          entries={entries}
          flaskIds={flaskIds}
          t={t}
          onPick={(uid) => {
            seal(uid, sealFor);
            setSealFor(null);
          }}
          onClose={() => setSealFor(null)}
        />
      )}
    </div>
  );
}

// 挑一只做成标本。候选在打开这一刻现算（不是页面渲染时那份），
// 故盯着这一页等某只长成、随手一点，挑得到的就是它。
function SealPicker({ entries, flaskIds, t, onPick, onClose }) {
  const list = useMemo(() => sealable(entries, flaskIds), [entries, flaskIds]);
  return (
    <div className="fk-seal-veil" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="fk-seal" onClick={(e) => e.stopPropagation()}>
        <h2 className="fk-seal-title">{t("flasks.sealTitle")}</h2>
        <p className="fk-seal-note">{t("flasks.sealNote")}</p>
        {list.length === 0 ? (
          <p className="fk-seal-empty">{t("flasks.sealNone")}</p>
        ) : (
          <ul className="fk-seal-list">
            {list.map((e) => (
              <li key={e.uid}>
                <button type="button" className="fk-seal-pick" onClick={() => onPick(e.uid)}>
                  <FishGlyph glyph={e.id} size={34} />
                  <span>{t(`aquarium.species.${e.id}.name`)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="fk-seal-cancel" onClick={onClose}>
          {t("flasks.sealCancel")}
        </button>
      </div>
    </div>
  );
}

// 攒下的一只满瓶：名字输入框/删除/选中都不在这儿——那些是「这个形状」的事，归主卡管。
// 这张卡回答两件事：这儿有一只已经注满的瓶子；里面封着谁（没封的话，从这儿封一只进去）。
function FullCard({ flask, specimen, canSeal, t, onAskSeal, onUnseal }) {
  const presetName = t(`settings.prefs.flaskShape.${flask.preset}`);
  return (
    <li className="fk-card filled">
      <div className="fk-pick static">
        <div className="fk-figure">
          <FlaskGraphic progress={1} params={flask.params} />
          {specimen && (
            <span
              className="fk-specimen"
              title={t("flasks.sealedOf", {
                v: t(`aquarium.species.${specimen.id}.name`),
              })}
            >
              <FishGlyph glyph={specimen.id} size={40} />
            </span>
          )}
        </div>
        <p className="fk-filled-name">{flask.name || presetName}</p>
        <p className="fk-meta">
          <span className="fk-meta-total">{t("flasks.filled")}</span>
        </p>

        {/* 封了：说清里面是谁，并留一条「取出放回缸里」的退路（封存是保存，不是牺牲）。
            没封且缸里有长成的：一枚按钮。缸里没有够格的就什么都不摆——
            没养过鱼的人不该看见一条够不着的规则。 */}
        {specimen ? (
          <p className="fk-sealed">
            <span className="fk-sealed-name">
              {t("flasks.sealedOf", { v: t(`aquarium.species.${specimen.id}.name`) })}
            </span>
            <button type="button" className="fk-unseal" onClick={onUnseal}>
              {t("flasks.unseal")}
            </button>
          </p>
        ) : canSeal ? (
          <button type="button" className="fk-seal-btn" onClick={onAskSeal}>
            <FlaskConical size={14} aria-hidden="true" />
            {t("flasks.sealBtn")}
          </button>
        ) : null}
      </div>
    </li>
  );
}

// 架上的一格：一张小卡，正中一只正在接水的瓶子，下面是名字与进度文字。
// 整张卡可点＝选它接水；名字输入框与删除按钮不参与选中，
// 故它们要挡住冒泡，不然改个名就顺手换了正在专注的瓶子。
//
// 这一页是纯鼠标操作：卡片不进 Tab 序列、不接任何按键。
// 之前卡片是可聚焦的 radio，鼠标点完焦点就留在卡上，此后随便按一个键
// （方向键滚个页面就够）都会把它翻成 :focus-visible，凭空描出一圈框。
// 名字输入框还是输入框，该聚焦该打字照旧。
function ShelfCard({
  flask,
  secs,
  stat,
  active,
  confirming,
  specimen,
  glyph,
  hasReady,
  t,
  onSelect,
  onRename,
  onAskRemove,
  onCancelRemove,
  onRemove,
  onUnseal,
}) {
  const { partial } = bottlesOf(secs);
  // 够格封标本的是「注满的那只」，故封存的按钮在满瓶卡上（见 FullCard）。
  // 这张卡上只剩「还差多久才能封」这句话——缸里真有长成的那一刻才说，
  // 没养过鱼的人不该看见一条够不着的规则。
  const sealLocked = !specimen && hasReady && !flaskReady(secs);
  const presetName = t(`settings.prefs.flaskShape.${flask.preset}`);
  const remain = FLASK_FULL_SECS - (secs % FLASK_FULL_SECS);
  const lastAgo = ago(stat?.lastAt, t);

  return (
    <li className={`fk-card${active ? " active" : ""}`}>
      <div className="fk-pick" onClick={onSelect}>
        <button
          type="button"
          className="fk-remove"
          onClick={(e) => {
            e.stopPropagation();
            onAskRemove();
          }}
          title={t("flasks.removeHint")}
          aria-label={t("flasks.remove")}
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>

        {/* 这张卡上的是正在接的那只；攒下的满瓶各自成卡（见 FullCard） */}
        <div className="fk-figure">
          <FlaskGraphic progress={partial} params={flask.params} />
          {/* 标本浮在瓶肚子里：略偏灰、微微一晃都没有——它是被封住的那一只，不是还在游的 */}
          {specimen && glyph && (
            <span
              className="fk-specimen"
              title={t("flasks.sealedOf", {
                v: t(`aquarium.species.${specimen.id}.name`),
              })}
            >
              <FishGlyph glyph={specimen.id} size={40} />
            </span>
          )}
        </div>

        <input
          className="fk-name"
          value={flask.name}
          placeholder={presetName || t("flasks.namePlaceholder")}
          onChange={(e) => onRename(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          aria-label={t("flasks.namePlaceholder")}
          // 确认层盖住整张卡时，名字框不该还能被 Tab 到
          tabIndex={confirming ? -1 : 0}
        />

        <p className="fk-meta">
          {secs > 0 ? (
            <>
              <span className="fk-meta-total">{t("flasks.total", { v: dur(secs, t) })}</span>
              <span className="fk-meta-next">{t("flasks.nextIn", { v: dur(remain, t) })}</span>
            </>
          ) : (
            <span className="fk-meta-total">{t("flasks.justStarted")}</span>
          )}
        </p>

        {/* 这只瓶子的来历：几次专注注出来的、最近一次什么时候。
            水是一次次注进去的，只报总量会让这只瓶子看起来像凭空满的。
            没注过的瓶子不显示这行——上面那句「还没往里注过」已经说完了。 */}
        {stat?.sessions > 0 && (
          <p className="fk-history">
            <span>
              {stat.sessions === 1
                ? t("flasks.sessions_one")
                : t("flasks.sessions", { n: stat.sessions })}
            </span>
            {lastAgo && (
              <>
                <span className="fk-history-dot" aria-hidden="true">
                  ·
                </span>
                <span>{t("flasks.lastPour", { v: lastAgo })}</span>
              </>
            )}
          </p>
        )}

        {/* —— 标本 ——
            差一点：一句话交代还差什么，不做成灰按钮——
            灰按钮只说「不能点」，这句话说的是「还差多久」。
            封着的那只画在满瓶卡上；只有一只满瓶都没有（调试改水位等）时才落到这张卡，
            连带把「取出」的退路一起带过来，免得取不出来。 */}
        {specimen && glyph ? (
          <p className="fk-sealed">
            <span className="fk-sealed-name">
              {t("flasks.sealedOf", { v: t(`aquarium.species.${specimen.id}.name`) })}
            </span>
            <button
              type="button"
              className="fk-unseal"
              onClick={(e) => {
                e.stopPropagation();
                onUnseal();
              }}
            >
              {t("flasks.unseal")}
            </button>
          </p>
        ) : sealLocked ? (
          <p className="fk-seal-locked">
            {t("flasks.sealLocked", { v: dur(FLASK_FULL_SECS - secs, t) })}
          </p>
        ) : null}

        {active ? (
          <span className="fk-badge">
            <Check size={14} aria-hidden="true" />
            {t("flasks.active")}
          </span>
        ) : (
          <span className="fk-hint-pick">{t("flasks.setActive")}</span>
        )}

        {/* 移出确认盖在这张卡上（而不是弹一个全屏对话框）：
            要拿走的是哪只，眼睛不用离开就知道。 */}
        {confirming && (
          <div
            className="fk-confirm"
            role="alertdialog"
            aria-label={t("flasks.confirmTitle")}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="fk-confirm-title">{t("flasks.confirmTitle")}</p>
            <p className="fk-confirm-note">{t("flasks.confirmNote")}</p>
            <div className="fk-confirm-row">
              <button type="button" className="fk-confirm-no" onClick={onCancelRemove}>
                {t("flasks.confirmNo")}
              </button>
              <button type="button" className="fk-confirm-yes" onClick={onRemove}>
                {t("flasks.confirmYes")}
              </button>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}
