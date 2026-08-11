// React 必须显式引入：本项目没装 @vitejs/plugin-react，JSX 走 esbuild 的经典
// 转换（编译成 React.createElement），少了这个默认导入整页会 React is not defined。
import React, { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Trash2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useFocus } from "@/context/FocusContext";
import useFlaskShelf from "@/hooks/flask/useFlaskShelf";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import { FlaskGraphic } from "@/pages/Focus/FocusFlask";
import {
  FLASK_FULL_SECS,
  MAX_SHELF,
  bottlesOf,
  fillsOf,
  shelfStats,
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
// 排版：一只烧瓶一张小卡、网格并排。卡里只画「正在接的那只」，
// 已注满的不再一只只重画（同形状的瓶子重复画一排既占地方又都长一个样），
// 改用瓶身旁的 ×N 角标交代攒下了几只满瓶。
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

  // 移出是不可逆的（形状没了就得回设置页重调），所以点垃圾桶只是「问一句」，
  // 真正动手要再确认一次。同一时刻只问一只。
  const [confirmId, setConfirmId] = useState(null);

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
            <span className="fk-count">
              {t("flasks.shelfCount", { n: items.length, total: MAX_SHELF })}
            </span>
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
          flasks={items}
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
        <ul className="fk-grid">
          {items.map((it) => (
            <ShelfCard
              key={it.id}
              flask={it}
              secs={fills[it.id] ?? 0}
              stat={stats[it.id]}
              active={it.id === activeId}
              confirming={confirmId === it.id}
              t={t}
              onSelect={() => {
                setConfirmId(null);
                setActiveFlask(it.id);
              }}
              onRename={(name) => renameFlask(it.id, name)}
              onAskRemove={() => setConfirmId(it.id)}
              onCancelRemove={() => setConfirmId(null)}
              onRemove={() => handleRemove(it.id)}
            />
          ))}
        </ul>
      )}
    </div>
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
  t,
  onSelect,
  onRename,
  onAskRemove,
  onCancelRemove,
  onRemove,
}) {
  const { full, partial } = bottlesOf(secs);
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

        {/* 只画正在接的那只。攒下的满瓶不重画——同形状的瓶子画一排都长一个样，
            只是白白占地方——改成瓶身右上角一枚 ×N 角标。 */}
        <div className="fk-figure">
          <FlaskGraphic progress={partial} params={flask.params} />
          {full > 0 && (
            <span className="fk-full" title={t("flasks.fullCount", { n: full })}>
              ×{full}
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
