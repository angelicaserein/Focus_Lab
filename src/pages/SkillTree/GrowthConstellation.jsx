import React from "react";
import { growthStageText } from "@/pages/Character/charView";

// 成长星图（纯衍生）：把角色卡已有的「5 大人生属性 + 场景技能线」摆成一张星图。
// 不新增任何存储、无门禁——节点大小 / 连线粗细 / 光晕强度都由真实成长进度决定，
// 越常做的方向越亮、越大。这是角色数据的空间化呈现，契合「全部从行为推导」的原则。
const CX = 360;
const CY = 285;
const R_ATTR = 128; // 内环：人生属性
const R_SKILL = 222; // 外环：场景技能

function polar(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180; // -90 → 让第一个节点落在正上方
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function truncate(str, n = 5) {
  const s = String(str ?? "");
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export default function GrowthConstellation({ char, t }) {
  const attrs = char.attributes ?? [];
  const skills = char.skills ?? [];

  const attrNodes = attrs.map((a, i) => {
    const [x, y] = polar(CX, CY, R_ATTR, (i * 360) / (attrs.length || 1));
    const p = Math.max(0, Math.min(1, a.progress || 0));
    return { ...a, x, y, p, r: 18 + p * 11 };
  });

  const skillNodes = skills.map((s, i) => {
    // 外环相对内环错开半格，视觉上交错、不与属性重叠
    const step = 360 / (skills.length || 1);
    const [x, y] = polar(CX, CY, R_SKILL, i * step + step / 2);
    const p = Math.max(0, Math.min(1, s.progress || 0));
    return { ...s, x, y, p, r: 12 + p * 8 };
  });

  return (
    <div className="st-cst">
      <div className="st-cst-stage">
        <svg
          className="st-cst-svg"
          viewBox="0 0 720 570"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={t("skilltree.constellation.aria")}
        >
          {/* 连线：核心 → 属性，粗细/亮度随进度 */}
          {attrNodes.map((a) => (
            <line
              key={`la-${a.id}`}
              className="st-cst-link"
              x1={CX} y1={CY} x2={a.x} y2={a.y}
              strokeWidth={1.4 + a.p * 2.6}
              style={{ opacity: 0.18 + a.p * 0.5 }}
            />
          ))}
          {/* 连线：核心 → 技能（虚线，更弱） */}
          {skillNodes.map((s) => (
            <line
              key={`ls-${s.id}`}
              className="st-cst-link st-cst-link-skill"
              x1={CX} y1={CY} x2={s.x} y2={s.y}
              strokeWidth={1 + s.p * 1.6}
              style={{ opacity: 0.12 + s.p * 0.4 }}
            />
          ))}

          {/* 光晕：越强越亮越大 */}
          {[...attrNodes, ...skillNodes].map((nd) => (
            <circle
              key={`h-${nd.id}`}
              className="st-cst-halo"
              cx={nd.x} cy={nd.y} r={nd.r * 2.1}
              style={{ opacity: 0.08 + nd.p * 0.24 }}
            />
          ))}

          {/* 核心：当前称号 */}
          <circle className="st-cst-core-halo" cx={CX} cy={CY} r={64} />
          <circle className="st-cst-core" cx={CX} cy={CY} r={38} />
          <text className="st-cst-core-icon" x={CX} y={CY} dy="2">{char.rank.icon}</text>
          <text className="st-cst-core-label" x={CX} y={CY + 58}>
            {growthStageText(t, char.level)}
          </text>

          {/* 技能节点（外环） */}
          {skillNodes.map((s) => (
            <g key={`sn-${s.id}`} className="st-cst-node st-cst-node-skill">
              <circle cx={s.x} cy={s.y} r={s.r} />
              <text className="st-cst-node-icon" x={s.x} y={s.y} dy="1" style={{ fontSize: s.r }}>
                {s.icon}
              </text>
              <text className="st-cst-node-label" x={s.x} y={s.y + s.r + 13}>
                {truncate(s.unclassified ? t("character.freeExplore") : s.title)}
              </text>
            </g>
          ))}

          {/* 属性节点（内环） */}
          {attrNodes.map((a) => (
            <g key={`an-${a.id}`} className="st-cst-node st-cst-node-attr">
              <circle cx={a.x} cy={a.y} r={a.r} />
              <text className="st-cst-node-icon" x={a.x} y={a.y} dy="1" style={{ fontSize: a.r }}>
                {a.icon}
              </text>
              <text className="st-cst-node-label" x={a.x} y={a.y + a.r + 14}>
                {t(`character.attr.${a.id}`)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <p className="st-cst-hint">
        {skills.length === 0
          ? t("skilltree.constellation.skillsEmpty")
          : t("skilltree.constellation.hint")}
      </p>
    </div>
  );
}
