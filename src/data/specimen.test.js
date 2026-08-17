import { describe, it, expect } from "vitest";
import { ADULT_MS } from "@/data/aquarium/growth";
import {
  flaskSlots,
  parseSlot,
  sealFish,
  sealable,
  slotId,
  splitResidents,
  unsealFish,
} from "@/data/specimen";

const NOW = 1_700_000_000_000;
// 成体＝入缸满 ADULT_MS；幼体差一点点，用来验「没长成的封不了」
const adult = (uid, id = "fish", extra) => ({ uid, id, born: NOW - ADULT_MS, ...extra });
const young = (uid, id = "fish") => ({ uid, id, born: NOW - ADULT_MS + 60_000 });

// 槽位：F1 注满的第 1 只、第 2 只（index 从 0 起）
const S0 = slotId("F1", 0);
const S1 = slotId("F1", 1);

describe("parseSlot / flaskSlots", () => {
  it("槽位 id 拆得回形状与第几只", () => {
    expect(parseSlot(S1)).toEqual({ flaskId: "F1", index: 1 });
  });

  it("老存档里的纯形状 id 当第 0 只", () => {
    expect(parseSlot("F1")).toEqual({ flaskId: "F1", index: 0 });
  });

  it("架上的槽位＝各形状各注满了几只", () => {
    const items = [{ id: "F1" }, { id: "F2" }];
    // F1 注满两只还多一点，F2 差一秒没满
    expect(flaskSlots(items, { F1: 7300, F2: 3599 })).toEqual([S0, S1]);
  });
});

describe("sealFish", () => {
  it("长成的那只封进那只满瓶里", () => {
    const next = sealFish([adult("a")], "a", S1, NOW);
    expect(next[0].sealedIn).toBe(S1);
    expect(next[0].sealedAt).toBe(NOW);
  });

  it("老写法（纯形状 id）归一成第 0 只", () => {
    expect(sealFish([adult("a")], "a", "F1", NOW)[0].sealedIn).toBe(S0);
  });

  it("还在长的封不了，原样返回（调用方据此跳过落盘）", () => {
    const list = [young("a")];
    expect(sealFish(list, "a", S0, NOW)).toBe(list);
  });

  it("一只瓶子只封一只", () => {
    const list = [adult("a", "fish", { sealedIn: S0, sealedAt: NOW }), adult("b", "koi")];
    expect(sealFish(list, "b", S0, NOW)).toBe(list);
  });

  it("同一形状的下一只满瓶还能再封一只", () => {
    const list = [adult("a", "fish", { sealedIn: S0, sealedAt: NOW }), adult("b", "koi")];
    expect(sealFish(list, "b", S1, NOW).find((e) => e.uid === "b").sealedIn).toBe(S1);
  });

  it("老存档占着第一只时，第一只还是封不进去（同一个槽位）", () => {
    const list = [adult("a", "fish", { sealedIn: "F1", sealedAt: NOW }), adult("b", "koi")];
    expect(sealFish(list, "b", S0, NOW)).toBe(list);
  });

  it("已经封过的不能再封到别的瓶子里", () => {
    const list = [adult("a", "fish", { sealedIn: S0, sealedAt: NOW })];
    expect(sealFish(list, "a", S1, NOW)).toBe(list);
  });
});

describe("splitResidents", () => {
  it("封起来的不在缸里游，按槽位归档", () => {
    const list = [adult("a", "fish", { sealedIn: S0, sealedAt: NOW }), adult("b", "koi")];
    const { sealed, swimming } = splitResidents(list, [S0]);
    expect(sealed[S0].uid).toBe("a");
    expect(swimming.map((e) => e.uid)).toEqual(["b"]);
  });

  it("同一形状的两只满瓶各封各的", () => {
    const list = [
      adult("a", "fish", { sealedIn: S0, sealedAt: NOW }),
      adult("b", "koi", { sealedIn: S1, sealedAt: NOW }),
    ];
    const { sealed, swimming } = splitResidents(list, [S0, S1]);
    expect(sealed[S0].uid).toBe("a");
    expect(sealed[S1].uid).toBe("b");
    expect(swimming).toEqual([]);
  });

  it("老存档的纯形状 id 归到第一只满瓶", () => {
    const list = [adult("a", "fish", { sealedIn: "F1", sealedAt: NOW })];
    expect(splitResidents(list, [S0]).sealed[S0].uid).toBe("a");
  });

  it("那只瓶子不在了（移出架子 / 水位掉回去），里面那只自动回缸里游", () => {
    const list = [adult("a", "fish", { sealedIn: S1, sealedAt: NOW })];
    const { sealed, swimming } = splitResidents(list, [S0]);
    expect(sealed).toEqual({});
    expect(swimming.map((e) => e.uid)).toEqual(["a"]);
  });

  it("同一只瓶子里出现两只（脏存档）时只认最早封的那只", () => {
    const list = [
      adult("a", "fish", { sealedIn: S0, sealedAt: NOW }),
      adult("b", "koi", { sealedIn: S0, sealedAt: NOW - 1000 }),
    ];
    const { sealed, swimming } = splitResidents(list, [S0]);
    expect(sealed[S0].uid).toBe("b");
    expect(swimming.map((e) => e.uid)).toEqual(["a"]);
  });
});

describe("sealable", () => {
  it("只给出长成的、还在缸里的那些", () => {
    const list = [
      adult("a"),
      young("b"),
      adult("c", "koi", { sealedIn: S0, sealedAt: NOW }),
    ];
    expect(sealable(list, [S0], NOW).map((e) => e.uid)).toEqual(["a"]);
  });
});

describe("unsealFish", () => {
  it("取出来放回缸里", () => {
    const list = [adult("a", "fish", { sealedIn: S0, sealedAt: NOW })];
    const next = unsealFish(list, "a");
    expect(next[0].sealedIn).toBe(null);
    expect(splitResidents(next, [S0]).swimming).toHaveLength(1);
  });

  it("本来就没封的原样返回", () => {
    const list = [adult("a")];
    expect(unsealFish(list, "a")).toBe(list);
  });
});
