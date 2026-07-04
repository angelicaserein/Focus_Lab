import { describe, it, expect } from "vitest";
import {
  XP_BASE,
  levelFromXp,
  rankForLevel,
  computeStreak,
  computeSkills,
  computeCharacter,
} from "@/utils/character/characterUtils";

// 造一条专注记录：默认单任务单会话，durationSecs 即墙钟时长。
const rec = (startedAt, durationSecs, scenarioId, sessionId) => ({
  id: `r-${startedAt}-${sessionId ?? durationSecs}`,
  sessionId: sessionId ?? `s-${startedAt}`,
  startedAt,
  durationSecs,
  taskText: "t",
  outcome: "ended",
  ...(scenarioId ? { scenarioId } : {}),
});

const DAY = 86400000;

describe("levelFromXp", () => {
  it("0 经验为 0 级，进度归零", () => {
    expect(levelFromXp(0)).toMatchObject({ level: 0, progress: 0, xpIntoLevel: 0 });
  });

  it("恰好 XP_BASE 秒升到 1 级", () => {
    expect(levelFromXp(XP_BASE).level).toBe(1);
    expect(levelFromXp(XP_BASE - 1).level).toBe(0);
  });

  it("二次曲线：4*XP_BASE 到 2 级，9*XP_BASE 到 3 级", () => {
    expect(levelFromXp(4 * XP_BASE).level).toBe(2);
    expect(levelFromXp(9 * XP_BASE).level).toBe(3);
  });

  it("级内进度落在 [0,1)，且中点约 0.5", () => {
    // 1→2 级区间为 [300, 1200)，跨度 900，取中点 750
    const p = levelFromXp(750);
    expect(p.level).toBe(1);
    expect(p.xpForNextLevel).toBe(900);
    expect(p.progress).toBeCloseTo(0.5, 5);
  });

  it("负数/脏输入归零，不抛错", () => {
    expect(levelFromXp(-100).level).toBe(0);
    expect(levelFromXp(NaN).level).toBe(0);
    expect(levelFromXp(undefined).level).toBe(0);
  });
});

describe("rankForLevel", () => {
  it("按等级取对应称号档位", () => {
    expect(rankForLevel(0).zh).toBe("见习者");
    expect(rankForLevel(2).zh).toBe("见习者");
    expect(rankForLevel(3).zh).toBe("学徒");
    expect(rankForLevel(6).zh).toBe("冒险者");
    expect(rankForLevel(999).zh).toBe("传奇");
  });
});

describe("computeStreak", () => {
  const now = new Date(2026, 6, 4, 15, 0, 0).getTime(); // 2026-07-04 下午

  it("空记录为 0", () => {
    expect(computeStreak([], now)).toBe(0);
  });

  it("今天+昨天+前天连续 → 3", () => {
    const records = [rec(now, 600), rec(now - DAY, 600), rec(now - 2 * DAY, 600)];
    expect(computeStreak(records, now)).toBe(3);
  });

  it("同一天多条只算一天", () => {
    const records = [rec(now, 600), rec(now - 1000, 600), rec(now - DAY, 600)];
    expect(computeStreak(records, now)).toBe(2);
  });

  it("今天没记录但昨天有 → 从昨天起算不清零", () => {
    const records = [rec(now - DAY, 600), rec(now - 2 * DAY, 600)];
    expect(computeStreak(records, now)).toBe(2);
  });

  it("中间断一天则中断", () => {
    const records = [rec(now, 600), rec(now - 2 * DAY, 600)];
    expect(computeStreak(records, now)).toBe(1);
  });

  it("最近一次是前天（昨天与今天都没）→ 0", () => {
    expect(computeStreak([rec(now - 2 * DAY, 600)], now)).toBe(0);
  });
});

describe("computeSkills", () => {
  const scenarios = [
    { id: "study", title: "学习" },
    { id: "work", title: "工作" },
  ];

  it("每个场景一条技能，按经验降序", () => {
    const records = [
      rec(1000, 1200, "work"),
      rec(2000, 300, "study"),
    ];
    const skills = computeSkills(records, scenarios);
    expect(skills.map((s) => s.id)).toEqual(["work", "study"]);
    expect(skills[0]).toMatchObject({ title: "工作", level: 2 });
    expect(skills[1]).toMatchObject({ title: "学习", level: 1 });
  });

  it("未归类专注汇成 __unclassified__ 条目", () => {
    const skills = computeSkills([rec(1000, 600)], scenarios);
    const loose = skills.find((s) => s.unclassified);
    expect(loose).toBeTruthy();
    expect(loose.id).toBe("__unclassified__");
  });

  it("无未归类专注时不产生该条目", () => {
    const skills = computeSkills([rec(1000, 600, "study")], scenarios);
    expect(skills.some((s) => s.unclassified)).toBe(false);
  });

  it("同场景图标稳定（同 id 多次调用一致）", () => {
    const a = computeSkills([rec(1, 600, "study")], scenarios)[0].icon;
    const b = computeSkills([rec(2, 600, "study")], scenarios)[0].icon;
    expect(a).toBe(b);
  });
});

describe("computeCharacter", () => {
  const now = new Date(2026, 6, 4, 12, 0, 0).getTime();

  it("聚合等级/称号/金币/连续天数/会话数/技能", () => {
    const records = [
      rec(now, 1200, "study", "sA"),
      rec(now - DAY, 300, null, "sB"),
    ];
    const char = computeCharacter(
      { records, scenarios: [{ id: "study", title: "学习" }], coins: 42 },
      now,
    );
    expect(char.level).toBe(2); // 总 1500s → floor(sqrt(1500/300)) = floor(2.23) = 2
    expect(char.coins).toBe(42);
    expect(char.streak).toBe(2);
    expect(char.sessionCount).toBe(2);
    expect(char.rank.zh).toBe("见习者");
    expect(char.skills.length).toBeGreaterThanOrEqual(1);
  });

  it("空输入不抛错，返回 0 级空技能", () => {
    const char = computeCharacter({}, now);
    expect(char.level).toBe(0);
    expect(char.coins).toBe(0);
    expect(char.streak).toBe(0);
    expect(char.skills).toEqual([]);
  });
});
