import { describe, it, expect } from "vitest";
import {
  XP_BASE,
  XP_PER_TASK,
  XP_PER_FOCUS_DAY,
  XP_PER_CLEAN_SESSION,
  levelFromXp,
  rankForLevel,
  computeStreak,
  computeMetrics,
  computeXpBreakdown,
  computeAttributes,
  computeAchievements,
  computeSkills,
  computeCharacter,
  computeSessionReward,
} from "@/utils/character/characterUtils";

// 造一条专注记录：默认单任务单会话，durationSecs 即墙钟时长。
// extra 可覆盖 taskId / distractionCount 等字段（属性 / 成就测试用）。
const rec = (startedAt, durationSecs, scenarioId, sessionId, extra = {}) => ({
  id: `r-${startedAt}-${sessionId ?? durationSecs}`,
  sessionId: sessionId ?? `s-${startedAt}`,
  taskId: `task-${startedAt}`,
  startedAt,
  durationSecs,
  taskText: "t",
  outcome: "ended",
  ...(scenarioId ? { scenarioId } : {}),
  ...extra,
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

describe("computeMetrics", () => {
  it("汇总时长/会话/专注日/零分心/完成任务/去重场景与任务", () => {
    const records = [
      rec(1000, 1200, "study", "sA", { taskId: "t1", distractionCount: 0 }),
      rec(2000, 300, "work", "sB", { taskId: "t2", distractionCount: 2 }),
    ];
    const todos = [{ completed: true }, { completed: false }, { completed: true }];
    const m = computeMetrics({ records, todos });
    expect(m.totalSecs).toBe(1500);
    expect(m.sessionCount).toBe(2);
    expect(m.longestSecs).toBe(1200);
    expect(m.cleanSessionCount).toBe(1); // 仅 sA 零分心
    expect(m.cleanSessionSecs).toBe(1200);
    expect(m.completedTasks).toBe(2);
    expect(m.distinctScenarios).toBe(2);
    expect(m.distinctTasks).toBe(2);
  });

  it("同会话多条记录取 max 分心数，不叠加", () => {
    const records = [
      rec(1000, 600, "study", "sA", { distractionCount: 3 }),
      rec(1000, 800, "study", "sA", { distractionCount: 3 }),
    ];
    const m = computeMetrics({ records, todos: [] });
    expect(m.sessionCount).toBe(1);
    expect(m.cleanSessionCount).toBe(0);
  });
});

describe("computeXpBreakdown", () => {
  it("四项经验来源求和为总经验", () => {
    const metrics = {
      totalSecs: 1000,
      completedTasks: 3,
      focusDays: 2,
      cleanSessionCount: 1,
    };
    const { total, sources } = computeXpBreakdown(metrics);
    const expected =
      1000 + 3 * XP_PER_TASK + 2 * XP_PER_FOCUS_DAY + 1 * XP_PER_CLEAN_SESSION;
    expect(total).toBe(expected);
    expect(sources.map((s) => s.key)).toEqual(["focus", "tasks", "days", "clean"]);
  });
});

describe("computeAttributes", () => {
  it("返回 5 个固定维度，各带等级与原始指标", () => {
    const metrics = {
      totalSecs: 4 * XP_BASE, // 智力应到 2 级
      focusDays: 1,
      cleanSessionSecs: 0,
      cleanSessionCount: 0,
      completedTasks: 0,
      distinctScenarios: 0,
      distinctTasks: 0,
    };
    const attrs = computeAttributes(metrics);
    expect(attrs.map((a) => a.id)).toEqual([
      "intellect", "grit", "focus", "execution", "exploration",
    ]);
    const intellect = attrs.find((a) => a.id === "intellect");
    expect(intellect.level).toBe(2);
    expect(intellect.metricKind).toBe("time");
    expect(intellect.metricValue).toBe(4 * XP_BASE);
  });
});

describe("computeAchievements", () => {
  const base = { metrics: computeMetrics({ records: [], todos: [] }), level: 0, coins: 0, streak: 0 };

  it("空状态下全部未解锁，且带进度对象", () => {
    const list = computeAchievements(base);
    expect(list.every((a) => !a.unlocked)).toBe(true);
    const hourClub = list.find((a) => a.id === "hourClub");
    expect(hourClub.progress).toMatchObject({ cur: 0, target: 3600 });
  });

  it("满足条件的成就标记为已解锁且无进度对象", () => {
    const ctx = { ...base, metrics: { ...base.metrics, sessionCount: 2 }, coins: 1200 };
    const list = computeAchievements(ctx);
    expect(list.find((a) => a.id === "firstFocus").unlocked).toBe(true);
    expect(list.find((a) => a.id === "firstFocus").progress).toBeNull();
    expect(list.find((a) => a.id === "wealthy").unlocked).toBe(true);
  });
});

describe("computeSkills", () => {
  const scenarios = [
    { id: "study", title: "学习" },
    { id: "work", title: "工作" },
  ];

  it("每个有记录的场景一条技能，按经验降序，含时长", () => {
    const records = [rec(1000, 1200, "work"), rec(2000, 300, "study")];
    const { skills } = computeSkills(records, scenarios);
    expect(skills.map((s) => s.id)).toEqual(["work", "study"]);
    expect(skills[0]).toMatchObject({ title: "工作", level: 2, secs: 1200 });
    expect(skills[1]).toMatchObject({ title: "学习", level: 1, secs: 300 });
  });

  it("0 经验场景不进列表，改计入 lockedCount", () => {
    const { skills, lockedCount } = computeSkills([rec(1000, 600, "study")], scenarios);
    expect(skills.map((s) => s.id)).toEqual(["study"]);
    expect(lockedCount).toBe(1); // work 没专注过
  });

  it("未归类专注汇成 __unclassified__ 条目", () => {
    const { skills } = computeSkills([rec(1000, 600)], scenarios);
    const loose = skills.find((s) => s.unclassified);
    expect(loose).toBeTruthy();
    expect(loose.id).toBe("__unclassified__");
  });

  it("同场景图标稳定（同 id 多次调用一致）", () => {
    const a = computeSkills([rec(1, 600, "study")], scenarios).skills[0].icon;
    const b = computeSkills([rec(2, 600, "study")], scenarios).skills[0].icon;
    expect(a).toBe(b);
  });
});

describe("computeCharacter", () => {
  const now = new Date(2026, 6, 4, 12, 0, 0).getTime();

  it("聚合等级/称号/金币/连续天数/属性/成就/技能", () => {
    const records = [
      rec(now, 1200, "study", "sA", { distractionCount: 0 }),
      rec(now - DAY, 300, null, "sB", { distractionCount: 1 }),
    ];
    const char = computeCharacter(
      {
        records,
        scenarios: [{ id: "study", title: "学习" }],
        coins: 42,
        todos: [{ completed: true }],
      },
      now,
    );
    // 总经验 = 1500(专注) + 60(1任务) + 240(2天) + 60(1零分心) = 1860
    expect(char.xpBreakdown.total).toBe(1860);
    expect(char.level).toBe(2); // floor(sqrt(1860/300)) = floor(2.49) = 2
    expect(char.coins).toBe(42);
    expect(char.streak).toBe(2);
    expect(char.attributes).toHaveLength(5);
    expect(char.achievements.length).toBeGreaterThan(0);
    expect(char.skills.length).toBeGreaterThanOrEqual(1);
  });

  it("空输入不抛错，返回 0 级空技能空属性齐全", () => {
    const char = computeCharacter({}, now);
    expect(char.level).toBe(0);
    expect(char.coins).toBe(0);
    expect(char.streak).toBe(0);
    expect(char.skills).toEqual([]);
    expect(char.lockedSkillCount).toBe(0);
    expect(char.attributes).toHaveLength(5);
  });
});

describe("computeSessionReward", () => {
  const now = new Date(2026, 6, 4, 15, 0, 0).getTime();

  it("首次专注且零分心：金币=时长，经验含专注+专注天数+零分心三项", () => {
    const r = computeSessionReward({
      durationSecs: 600,
      distractionCount: 0,
      prevRecords: [],
      prevXp: 0,
      prevLevel: 0,
      now,
    });
    expect(r.coins).toBe(600);
    expect(r.gainedXp).toBe(600 + XP_PER_FOCUS_DAY + XP_PER_CLEAN_SESSION);
    expect(r.sources.map((s) => s.key)).toEqual(["focus", "days", "clean"]);
    expect(r.streak).toBe(1);
  });

  it("今天已专注过：不再计专注天数加成", () => {
    const r = computeSessionReward({
      durationSecs: 300,
      distractionCount: 0,
      prevRecords: [rec(now - 3600_000, 600)], // 今天早些时候已有记录
      now,
    });
    expect(r.sources.some((s) => s.key === "days")).toBe(false);
    expect(r.gainedXp).toBe(300 + XP_PER_CLEAN_SESSION);
  });

  // 结算卡的经验必须和角色卡的经验拆解同源，否则卡上写着「+600」、
  // 转头角色卡按 focus+tasks+days+clean 算出来多一截，用户看到的是两个数。
  it("完成任务也计经验，与 computeXpBreakdown 的 tasks 源同价", () => {
    const r = computeSessionReward({
      durationSecs: 300,
      distractionCount: 1, // 排掉零分心加成，只看专注+任务两项
      completedTasks: 3,
      prevRecords: [rec(now - 3600_000, 600)], // 排掉专注天数加成
      now,
    });
    expect(r.completedTasks).toBe(3);
    expect(r.gainedXp).toBe(300 + 3 * XP_PER_TASK);
    expect(r.sources.map((s) => s.key)).toEqual(["focus", "tasks"]);
  });

  it("一个任务都没勾完时不出现 tasks 这一项", () => {
    const r = computeSessionReward({ durationSecs: 300, completedTasks: 0, prevRecords: [], now });
    expect(r.sources.some((s) => s.key === "tasks")).toBe(false);
  });

  it("完成任务的经验也能把等级推过阈值", () => {
    // prevXp=280（还差 20 到 Lv.1 的 300），本次只专注 1 秒但勾完 1 个任务（+60）
    const r = computeSessionReward({
      durationSecs: 1,
      completedTasks: 1,
      distractionCount: 1,
      prevRecords: [rec(now - 3600_000, 600)],
      prevXp: 280,
      prevLevel: 0,
      now,
    });
    expect(r.leveledUp).toBe(true);
    expect(r.newLevel).toBe(1);
  });

  it("有分心：不计零分心加成", () => {
    const r = computeSessionReward({ durationSecs: 300, distractionCount: 2, prevRecords: [], now });
    expect(r.sources.some((s) => s.key === "clean")).toBe(false);
  });

  it("跨过等级阈值时 leveledUp 为真", () => {
    // prevXp=280（还差 20 到 Lv.1 的 300），本次专注 100s → 升到 Lv.1
    const r = computeSessionReward({
      durationSecs: 100,
      distractionCount: 5, // 排除零分心加成，隔离升级来自专注
      prevRecords: [rec(now - 1000, 10)],
      prevXp: 280,
      prevLevel: 0,
      now,
    });
    expect(r.newLevel).toBe(1);
    expect(r.leveledUp).toBe(true);
  });

  it("连续天数：昨天有记录 + 今天本次 → 2", () => {
    const r = computeSessionReward({
      durationSecs: 300,
      prevRecords: [rec(now - DAY, 600)],
      now,
    });
    expect(r.streak).toBe(2);
  });
});
