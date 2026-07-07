import { describe, it, expect } from "vitest";
import {
  iconForRegion,
  explorationPhraseKey,
  computeRegions,
  trailPoint,
  trailWidth,
  TRAIL,
} from "./worldData";

describe("iconForRegion（确定性图标）", () => {
  it("同一 id 恒得同一图标，且落在图标池内", () => {
    const a = iconForRegion("scn_reading");
    expect(a).toBe(iconForRegion("scn_reading"));
    expect(typeof a).toBe("string");
    expect(a.length).toBeGreaterThan(0);
  });

  it("空/缺 id 也安全返回一个池内图标", () => {
    expect(typeof iconForRegion()).toBe("string");
    expect(typeof iconForRegion(null)).toBe("string");
  });
});

describe("explorationPhraseKey（质化措辞，无数字）", () => {
  it("未探索恒为 undiscovered，忽略进度", () => {
    expect(explorationPhraseKey(false, 0.9)).toBe("undiscovered");
  });

  it("按探索进度分三档：arrived / familiar / homeland", () => {
    expect(explorationPhraseKey(true, 0)).toBe("arrived");
    expect(explorationPhraseKey(true, 0.33)).toBe("arrived");
    expect(explorationPhraseKey(true, 0.34)).toBe("familiar");
    expect(explorationPhraseKey(true, 0.74)).toBe("familiar");
    expect(explorationPhraseKey(true, 0.75)).toBe("homeland");
    expect(explorationPhraseKey(true, 1)).toBe("homeland");
  });

  it("越界 / 缺省进度被夹取，不抛错", () => {
    expect(explorationPhraseKey(true, -5)).toBe("arrived");
    expect(explorationPhraseKey(true, 5)).toBe("homeland");
    expect(explorationPhraseKey(true)).toBe("arrived");
  });
});

describe("computeRegions（情景 → 区域）", () => {
  const scenarios = [
    { id: "a", title: "阅读" },
    { id: "b", title: "写作" },
    { id: "c", title: "运动" },
  ];

  it("有对应技能线的情景=已探索，取技能的图标/进度/时长；否则=待发现", () => {
    const skills = [{ id: "a", icon: "📚", progress: 0.5, secs: 1200 }];
    const regions = computeRegions(scenarios, skills);
    const a = regions.find((r) => r.id === "a");
    const b = regions.find((r) => r.id === "b");

    expect(a).toMatchObject({ explored: true, icon: "📚", progress: 0.5, secs: 1200 });
    expect(b).toMatchObject({ explored: false, progress: 0, secs: 0 });
    expect(typeof b.icon).toBe("string"); // 待发现区域仍有确定性图标兜底
  });

  it("排序：已探索(按进度降序) 在前，待发现(按标题) 其后", () => {
    const skills = [
      { id: "a", progress: 0.3, secs: 10 },
      { id: "c", progress: 0.8, secs: 20 },
    ];
    const ids = computeRegions(scenarios, skills).map((r) => r.id);
    // c(0.8) > a(0.3) 已探索在前；b 待发现收尾
    expect(ids).toEqual(["c", "a", "b"]);
  });

  it("未归类(unclassified)的自由探索汇成一片 wilds，恒排在最后", () => {
    const skills = [
      { id: "a", progress: 0.9, secs: 30 },
      { id: "loose", unclassified: true, progress: 0.4, secs: 40 },
    ];
    const regions = computeRegions(scenarios, skills);
    const last = regions[regions.length - 1];
    expect(last).toMatchObject({ id: "__wilds__", wilds: true, explored: true, secs: 40 });
    // wilds 不占用某个情景 id
    expect(regions.filter((r) => r.wilds)).toHaveLength(1);
  });

  it("空输入安全返回空数组", () => {
    expect(computeRegions()).toEqual([]);
    expect(computeRegions([], [])).toEqual([]);
  });
});

describe("trailPoint / trailWidth（路点排布）", () => {
  it("起点(index 0)落在据点坐标", () => {
    expect(trailPoint(0)).toEqual([TRAIL.startX, TRAIL.baseY]);
  });

  it("路点沿正弦起伏，x 随 index 线性右移", () => {
    const [x1, y1] = trailPoint(1);
    expect(x1).toBe(TRAIL.startX + TRAIL.stepX);
    expect(y1).toBeCloseTo(TRAIL.baseY - TRAIL.amp, 5); // sin(π/2)=1，抬到最高
  });

  it("画布宽度随节点数增长，单节点=两倍起点边距", () => {
    expect(trailWidth(1)).toBe(TRAIL.startX * 2);
    expect(trailWidth(3)).toBe(TRAIL.startX * 2 + 2 * TRAIL.stepX);
    expect(trailWidth(0)).toBe(TRAIL.startX * 2); // 空场景不为负
  });
});
