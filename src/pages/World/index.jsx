import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";
import { useScenarios } from "@/context/ScenarioContext";
import useCharacter from "@/hooks/character/useCharacter";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import Companion from "@/components/companion/Companion";
import { formatDuration } from "@/utils/time";
import {
  computeRegions,
  explorationPhraseKey,
  trailPoint,
  trailWidth,
  TRAIL,
} from "./worldData";
import "./World.css";

// 世界地图：把每个情景当作一片「区域」，专注=在其中探索。暖光作为向导站在据点（研究所）。
// 纯衍生——节点大小/光晕/连线由真实探索进度决定，无新增存储、无门禁、无分母。
// 沿用星图「全部从行为推导」的原则，只是换成一张可探索的世界地图叙事。
export default function WorldPage() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const { scenarios, clearActiveScenario } = useScenarios();
  const char = useCharacter();
  const [outfit] = useLocalStorage(STORAGE_KEYS.COMPANION_OUTFIT, null);

  // 点一片区域 = 进专注页开始探索。
  //   具体情景区域 → 带着该情景启动（沿用情景页「快速启动」的 router state 约定）；未探索的也可点，那正是「第一次去踩点」。
  //   「未定之野」= 不属于任何情景的自由探索 → 清掉当前情景、以「无情景」进专注。
  const launchRegion = (r) => {
    if (r.wilds) {
      clearActiveScenario();
      navigate("/focus");
      return;
    }
    navigate("/focus", { state: { scenarioId: r.id } });
  };
  const onRegionKey = (e, r) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      launchRegion(r);
    }
  };

  const regions = useMemo(
    () => computeRegions(scenarios, char.skills),
    [scenarios, char.skills],
  );

  // 据点(研究所) 在 index 0，区域从 index 1 起铺开。
  const nodes = regions.map((r, i) => {
    const [x, y] = trailPoint(i + 1);
    const p = Math.max(0, Math.min(1, r.progress || 0));
    return { ...r, x, y, p, r: r.explored ? 18 + p * 14 : 15 };
  });
  const [homeX, homeY] = trailPoint(0);
  const width = trailWidth(regions.length + 1);

  const regionName = (r) => (r.wilds ? t("world.wilds") : r.title);

  return (
    <div className="page-world">
      <div className="world-headline">
        <h1>{t("world.title")}</h1>
        <p className="world-sub">{t("world.subtitle")}</p>
      </div>

      {regions.length === 0 ? (
        <div className="world-empty">
          <Companion mood="idle" outfit={outfit} size={120} say={t("world.emptySay")} />
          <p className="world-empty-hint">{t("world.empty")}</p>
        </div>
      ) : (
        <>
          <div className="world-map-scroll">
            <div className="world-map-stage" style={{ width }}>
              <svg
                className="world-map-svg"
                viewBox={`0 0 ${width} ${TRAIL.height}`}
                width={width}
                height={TRAIL.height}
                role="img"
                aria-label={t("world.mapAria")}
              >
                {/* 小径：据点 → 各区域，虚线，越熟悉越亮 */}
                {nodes.map((n, i) => {
                  const prev = i === 0 ? [homeX, homeY] : [nodes[i - 1].x, nodes[i - 1].y];
                  return (
                    <line
                      key={`trail-${n.id}`}
                      className={`world-trail${n.explored ? " explored" : ""}`}
                      x1={prev[0]} y1={prev[1]} x2={n.x} y2={n.y}
                    />
                  );
                })}

                {/* 光晕：越探索越亮越大 */}
                {nodes.filter((n) => n.explored).map((n) => (
                  <circle
                    key={`halo-${n.id}`}
                    className="world-halo"
                    cx={n.x} cy={n.y} r={n.r * 2.2}
                    style={{ opacity: 0.08 + n.p * 0.26 }}
                  />
                ))}

                {/* 区域节点：点一下=进入这片区域开始专注（未定之野=自由探索） */}
                {nodes.map((n) => (
                  <g
                    key={`node-${n.id}`}
                    className={`world-node clickable${n.explored ? " explored" : " undiscovered"}`}
                    role="button"
                    tabIndex={0}
                    aria-label={t("world.enter", { name: regionName(n) })}
                    onClick={() => launchRegion(n)}
                    onKeyDown={(e) => onRegionKey(e, n)}
                  >
                    <circle cx={n.x} cy={n.y} r={n.r} />
                    <text className="world-node-icon" x={n.x} y={n.y} dy="1" style={{ fontSize: n.r }}>
                      {n.explored ? n.icon : "🌫️"}
                    </text>
                    <text className="world-node-label" x={n.x} y={n.y + n.r + 16}>
                      {truncate(regionName(n))}
                    </text>
                  </g>
                ))}

                {/* 据点：研究所 + 向导暖光 */}
                <g className="world-home">
                  <circle className="world-home-halo" cx={homeX} cy={homeY} r={46} />
                  <circle className="world-home-core" cx={homeX} cy={homeY} r={30} />
                  <text className="world-home-icon" x={homeX} y={homeY} dy="2">🏛️</text>
                  <text className="world-home-label" x={homeX} y={homeY + 48}>
                    {t("world.home")}
                  </text>
                </g>
              </svg>

              {/* 向导暖光：绝对定位在据点上方 */}
              <div
                className="world-guide"
                style={{ left: homeX, top: homeY - 78 }}
              >
                <Companion mood="idle" outfit={outfit} size={62} />
              </div>
            </div>
          </div>

          {/* 提示：地图/卡片都是入口，点一下就去那片区域专注 */}
          <p className="world-tap-hint">{t("world.tapHint")}</p>

          {/* 区域详情卡：名称 + 质化探索措辞 + 专注时长（中性事实，允许）。点一下=进入这片区域专注 */}
          <div className="world-regions">
            {regions.map((r) => {
              const p = Math.max(0, Math.min(1, r.progress || 0));
              return (
                <button
                  key={r.id}
                  type="button"
                  className={`world-region clickable${r.explored ? " explored" : ""}`}
                  onClick={() => launchRegion(r)}
                  aria-label={t("world.enter", { name: regionName(r) })}
                >
                  <div className="world-region-icon" aria-hidden="true">
                    {r.explored ? r.icon : "🌫️"}
                  </div>
                  <div className="world-region-body">
                    <div className="world-region-name">{regionName(r)}</div>
                    <div className="world-region-phrase">
                      {t(`world.phase.${explorationPhraseKey(r.explored, r.progress)}`)}
                    </div>
                    {r.explored && (
                      <div className="world-region-bar" aria-hidden="true">
                        <div className="world-region-fill" style={{ width: `${Math.round(p * 100)}%` }} />
                      </div>
                    )}
                  </div>
                  {r.explored && r.secs > 0 && (
                    <div className="world-region-time">{formatDuration(r.secs)}</div>
                  )}
                </button>
              );
            })}
          </div>

          {char.lockedSkillCount > 0 && regions.every((r) => r.explored) && (
            <p className="world-foot">{t("world.moreToFind")}</p>
          )}
        </>
      )}
    </div>
  );
}

function truncate(str, n = 6) {
  const s = String(str ?? "");
  return s.length > n ? s.slice(0, n) + "…" : s;
}
