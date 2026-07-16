import React, { useMemo } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import Companion from "@/components/companion/Companion";
import { talentOutfitId } from "@/data/companion/companionData";
import {
  SKILL_BRANCHES,
  SKILL_NODES,
  nodeById,
  branchColor,
  earnedTalentPoints,
  spentTalentPoints,
  computeNodeStates,
} from "./skillTreeData";

// 可解锁技能树（游戏化试验分支）：花「天赋点」按前置依赖逐级解锁节点。
// 与成长星图不同，这里有一份新的持久化状态——已解锁的节点 id（存 localStorage）；
// 天赋点本身仍由等级 / 属性推导。仅用于并排比较「门禁式解锁」这一形态的手感。

// 网格坐标 → 舞台百分比。gx 0..11、gy 0..2；配合 SVG viewBox 0 0 100 100 对齐。
const X = (gx) => 8 + (gx / 11) * 84;
const Y = (gy) => 16 + gy * 34;

export default function SkillTreeUnlock({ char, t, lang }) {
  const [unlocked, setUnlocked] = useLocalStorage(STORAGE_KEYS.SKILLTREE_UNLOCKED, []);
  // 佩戴的灯灵立绘（与祈愿页共用同一份持久化状态；这里只写入天赋专属光环 id）。
  const [outfit, setOutfit] = useLocalStorage(STORAGE_KEYS.COMPANION_OUTFIT, null);

  const earned = earnedTalentPoints(char);
  const spent = spentTalentPoints(unlocked);
  const available = earned - spent;

  const nodeStates = useMemo(() => computeNodeStates(unlocked, available), [unlocked, available]);

  const unlock = (node) => {
    if (node.status !== "available") return;
    setUnlocked((prev) => (prev.includes(node.id) ? prev : [...prev, node.id]));
  };

  // 重置退还天赋点时，若正佩戴某个即将失去的光环，一并卸下，避免佩戴一个不再拥有的皮肤。
  const reset = () => {
    if (outfit && outfit.startsWith("talent_")) setOutfit(null);
    setUnlocked([]);
  };

  // 佩戴 / 卸下某节点的专属光环（再次点击已佩戴项＝卸下，回到默认暖金）。
  const equipAura = (nodeId) => {
    const id = talentOutfitId(nodeId);
    setOutfit((prev) => (prev === id ? null : id));
  };

  const unlockedSet = new Set(unlocked);
  // 已解锁节点＝已到手的光环，按技能树顺序展示，保证排列稳定。
  const auraNodes = SKILL_NODES.filter((n) => unlockedSet.has(n.id));

  return (
    <div className="st-tree">
      {/* 天赋点面板 */}
      <div className="st-tree-bar">
        <div className="st-tree-points">
          <Sparkles className="st-tree-points-icon" size={20} aria-hidden="true" />
          <span className="st-tree-points-val">{Math.max(0, available)}</span>
          <span className="st-tree-points-earned">/ {earned}</span>
          <span className="st-tree-points-label">{t("skilltree.points")}</span>
        </div>
        <button
          type="button"
          className="st-tree-reset"
          onClick={reset}
          disabled={unlocked.length === 0}
        >
          <RotateCcw size={14} aria-hidden="true" />
          {t("skilltree.reset")}
        </button>
      </div>
      <p className="st-tree-hint">{t("skilltree.tree.hint")}</p>

      {/* 舞台：连线（SVG）+ 节点（绝对定位按钮）。窄屏横向滚动，不挤压树形。 */}
      <div className="st-tree-scroll">
      <div className="st-tree-stage">
        <svg className="st-tree-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {SKILL_NODES.flatMap((node) =>
            node.prereq.map((pid) => {
              const from = nodeById(pid);
              const active = unlockedSet.has(pid) && unlockedSet.has(node.id);
              return (
                <line
                  key={`${pid}-${node.id}`}
                  className={`st-tree-link${active ? " active" : ""}`}
                  x1={X(from.gx)} y1={Y(from.gy)} x2={X(node.gx)} y2={Y(node.gy)}
                  stroke={active ? branchColor(node.branch) : undefined}
                  vectorEffect="non-scaling-stroke"
                />
              );
            }),
          )}
        </svg>

        {nodeStates.map((node) => {
          const color = branchColor(node.branch);
          const interactive = node.status === "available";
          return (
            <button
              key={node.id}
              type="button"
              className={`st-node st-node-${node.status}`}
              style={{
                left: `${X(node.gx)}%`,
                top: `${Y(node.gy)}%`,
                "--branch": color,
              }}
              onClick={() => unlock(node)}
              disabled={!interactive}
              title={t(`skilltree.node.${node.id}.desc`)}
              aria-label={`${t(`skilltree.node.${node.id}.title`)} — ${t(`skilltree.status.${node.status}`)}`}
            >
              <span className="st-node-icon" aria-hidden="true">{node.icon}</span>
              <span className="st-node-title">{t(`skilltree.node.${node.id}.title`)}</span>
              {node.status === "unlocked" ? (
                <span className="st-node-cost st-node-done" aria-hidden="true">✓</span>
              ) : (
                <span className="st-node-cost" aria-hidden="true">✦{node.cost}</span>
              )}
            </button>
          );
        })}
      </div>
      </div>

      {/* 光环收藏：每解锁一个节点即到手一枚灯灵专属光环（只此一条获取路径，买不到也抽不到）。
          点一枚即佩戴，灯灵随即在全 app 换上对应色调与头顶饰物。 */}
      <div className="st-auras">
        <div className="st-auras-head">
          <Companion outfit={outfit} mood="cheer" size={76} floating={false} />
          <div className="st-auras-caption">
            <div className="st-auras-title">{t("skilltree.auras.title")}</div>
            <p className="st-auras-hint">{t("skilltree.auras.hint")}</p>
          </div>
        </div>

        {auraNodes.length === 0 ? (
          <p className="st-auras-empty">{t("skilltree.auras.empty")}</p>
        ) : (
          <div className="st-auras-grid">
            {auraNodes.map((node) => {
              const id = talentOutfitId(node.id);
              const worn = outfit === id;
              return (
                <button
                  key={node.id}
                  type="button"
                  className={`st-aura${worn ? " worn" : ""}`}
                  style={{ "--branch": branchColor(node.branch) }}
                  onClick={() => equipAura(node.id)}
                  aria-pressed={worn}
                  title={t(worn ? "skilltree.auras.unequip" : "skilltree.auras.equip")}
                >
                  <span className="st-aura-icon" aria-hidden="true">{node.icon}</span>
                  <span className="st-aura-name">{t(`skilltree.node.${node.id}.title`)}</span>
                  <span className="st-aura-state">
                    {t(worn ? "skilltree.auras.wearing" : "skilltree.auras.tap")}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 分支图例 */}
      <div className="st-tree-legend">
        {SKILL_BRANCHES.map((b) => (
          <span key={b.id} className="st-legend-item">
            <span className="st-legend-dot" style={{ background: b.color }} aria-hidden="true" />
            {b.icon} {t(`skilltree.branch.${b.id}`)}
          </span>
        ))}
      </div>
    </div>
  );
}
