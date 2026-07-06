// 世界地图的数据层（纯数据、与 React 无关，便于复用与单测）。
//
// 世界观：把每个「情景 Scenario」当作研究所之外的一片「区域」，专注=在该区域探索。
// 全部从已有数据推导——探索度 = 该情景下的专注进度（来自 useCharacter 的 skills），
// 无新增持久化、无门禁、无 X/Y 分母，契合 [[adhd-no-judgmental-numbers]] 与角色系统一致。

// 区域图标池：按 id 确定性分配（与 characterUtils.iconForId 同族，独立一份以免耦合热文件）。
const REGION_ICONS = ["🏔️", "🌋", "🏝️", "🌲", "🏜️", "🏞️", "🗻", "🏕️", "🌅", "🌌"];
export function iconForRegion(id) {
  const s = String(id || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return REGION_ICONS[h % REGION_ICONS.length];
}

// 探索度 → 质化措辞 key（无数字、无分母）。未探索的区域也大方展示，作为「待发现的远方」。
export function explorationPhraseKey(explored, progress) {
  if (!explored) return "undiscovered";
  const p = Math.max(0, Math.min(1, progress || 0));
  if (p < 0.34) return "arrived";
  if (p < 0.75) return "familiar";
  return "homeland";
}

// 把 scenarios + 角色技能线合并成「区域」列表。
//   explored 区域（该情景下有专注）带真实 progress / secs；未探索的作为「待发现」。
//   未归类的自由探索汇成一片「未定之野 wilds」。
// 排序：已探索的按探索度从高到低（越熟悉越靠近据点），其后是待发现，wilds 收尾。
export function computeRegions(scenarios = [], skills = []) {
  const skillById = new Map(skills.filter((s) => !s.unclassified).map((s) => [s.id, s]));

  const regions = (scenarios || []).map((s) => {
    const sk = skillById.get(s.id);
    return {
      id: s.id,
      title: s.title,
      icon: sk?.icon || iconForRegion(s.id),
      explored: !!sk,
      progress: sk?.progress || 0,
      secs: sk?.secs || 0,
    };
  });

  regions.sort((a, b) => {
    if (a.explored !== b.explored) return a.explored ? -1 : 1;
    if (a.explored) return b.progress - a.progress;
    return String(a.title).localeCompare(String(b.title));
  });

  const loose = (skills || []).find((s) => s.unclassified);
  if (loose) {
    regions.push({
      id: "__wilds__",
      title: null,
      wilds: true,
      icon: "✨",
      explored: true,
      progress: loose.progress || 0,
      secs: loose.secs || 0,
    });
  }

  return regions;
}

// 沿一条起伏的小径为「据点(研究所) + N 个区域」排布路点坐标（SVG 单位）。
// 组件按坐标画连线与节点；点多时画布变宽、窄屏横向滚动。
export const TRAIL = {
  startX: 96,
  stepX: 168,
  baseY: 158,
  amp: 58,
  height: 300,
};

export function trailPoint(index) {
  const x = TRAIL.startX + index * TRAIL.stepX;
  const y = TRAIL.baseY - TRAIL.amp * Math.sin((index * Math.PI) / 2);
  return [x, y];
}

export function trailWidth(nodeCount) {
  return TRAIL.startX * 2 + Math.max(0, nodeCount - 1) * TRAIL.stepX;
}
