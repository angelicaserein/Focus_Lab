import { describe, it, expect } from "vitest";
import { ADULT_MS } from "@/data/aquarium/growth";
import {
  SPECIMEN_MIN_SECS,
  flaskReady,
  sealFish,
  sealable,
  splitResidents,
  unsealFish,
} from "@/data/specimen";

const NOW = 1_700_000_000_000;
// 成体＝入缸满 ADULT_MS；幼体差一点点，用来验「没长成的封不了」
const adult = (uid, id = "fish", extra) => ({ uid, id, born: NOW - ADULT_MS, ...extra });
const young = (uid, id = "fish") => ({ uid, id, born: NOW - ADULT_MS + 60_000 });

describe("flaskReady", () => {
  it("注满一小时才够格封标本", () => {
    expect(SPECIMEN_MIN_SECS).toBe(3600);
    expect(flaskReady(3599)).toBe(false);
    expect(flaskReady(3600)).toBe(true);
    expect(flaskReady(undefined)).toBe(false);
  });
});

describe("sealFish", () => {
  it("长成的那只封进瓶子里", () => {
    const next = sealFish([adult("a")], "a", "F1", NOW);
    expect(next[0].sealedIn).toBe("F1");
    expect(next[0].sealedAt).toBe(NOW);
  });

  it("还在长的封不了，原样返回（调用方据此跳过落盘）", () => {
    const list = [young("a")];
    expect(sealFish(list, "a", "F1", NOW)).toBe(list);
  });

  it("一只瓶子只封一只", () => {
    const list = [adult("a", "fish", { sealedIn: "F1", sealedAt: NOW }), adult("b", "koi")];
    expect(sealFish(list, "b", "F1", NOW)).toBe(list);
  });

  it("已经封过的不能再封到别的瓶子里", () => {
    const list = [adult("a", "fish", { sealedIn: "F1", sealedAt: NOW })];
    expect(sealFish(list, "a", "F2", NOW)).toBe(list);
  });
});

describe("splitResidents", () => {
  it("封起来的不在缸里游，按瓶子归档", () => {
    const list = [adult("a", "fish", { sealedIn: "F1", sealedAt: NOW }), adult("b", "koi")];
    const { sealed, swimming } = splitResidents(list, ["F1"]);
    expect(sealed.F1.uid).toBe("a");
    expect(swimming.map((e) => e.uid)).toEqual(["b"]);
  });

  it("瓶子被移出架子后，里面那只自动回缸里游", () => {
    const list = [adult("a", "fish", { sealedIn: "F1", sealedAt: NOW })];
    const { sealed, swimming } = splitResidents(list, []);
    expect(sealed).toEqual({});
    expect(swimming.map((e) => e.uid)).toEqual(["a"]);
  });

  it("同一只瓶子里出现两只（脏存档）时只认最早封的那只", () => {
    const list = [
      adult("a", "fish", { sealedIn: "F1", sealedAt: NOW }),
      adult("b", "koi", { sealedIn: "F1", sealedAt: NOW - 1000 }),
    ];
    const { sealed, swimming } = splitResidents(list, ["F1"]);
    expect(sealed.F1.uid).toBe("b");
    expect(swimming.map((e) => e.uid)).toEqual(["a"]);
  });
});

describe("sealable", () => {
  it("只给出长成的、还在缸里的那些", () => {
    const list = [
      adult("a"),
      young("b"),
      adult("c", "koi", { sealedIn: "F1", sealedAt: NOW }),
    ];
    expect(sealable(list, ["F1"], NOW).map((e) => e.uid)).toEqual(["a"]);
  });
});

describe("unsealFish", () => {
  it("取出来放回缸里", () => {
    const list = [adult("a", "fish", { sealedIn: "F1", sealedAt: NOW })];
    const next = unsealFish(list, "a");
    expect(next[0].sealedIn).toBe(null);
    expect(splitResidents(next, ["F1"]).swimming).toHaveLength(1);
  });

  it("本来就没封的原样返回", () => {
    const list = [adult("a")];
    expect(unsealFish(list, "a")).toBe(list);
  });
});
