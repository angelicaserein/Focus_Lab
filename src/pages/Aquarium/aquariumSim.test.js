import { describe, it, expect, vi } from "vitest";
import { STAGE } from "@/data/aquarium/growth";
import {
  CHASE_MAX,
  REACH_R,
  RIPPLE_EDGE,
  SENSE_R,
  SWIPE_V,
  TOUCH_R,
  geometry,
  grabAt,
  inTank,
  seek,
  shove,
  sizeFactor,
  step,
  surfaceAt,
} from "./aquariumSim";

// 缸里这些规则以前只能盯着 canvas 看半分钟才敢下结论（「鱼会不会被推穿缸壁」
// 「卵会不会游走」）。这里用一只固定尺寸的缸 + 手搓的住客，把规则一条条钉死。
const q = geometry(800, 500);

// 一潭静水：t=0、没有落水扰动。要看涟漪时单独构造。
const world = (over = {}) => ({
  t: 0,
  splash: 0,
  splashX: 0,
  splashT: 0,
  residents: [],
  food: [],
  bubbles: [],
  ripples: [],
  ptr: { x: 0, y: 0, v: 0, on: false },
  ...over,
});

// 一只普通的鱼，摆在缸中央
const fish = (over = {}) => ({
  id: "koi",
  uid: "u1",
  motion: "swim",
  stage: STAGE.ADULT,
  born: 0,
  x: (q.SW_L + q.SW_R) / 2,
  y: (q.RIM + q.SW_B) / 2,
  vx: 0.2,
  vy: 0,
  cruise: 0.2,
  chase: 0,
  ph: 0,
  ...over,
});

describe("geometry", () => {
  it("缸壁内缩，游动范围又比缸壁再收一点（鱼不贴着玻璃游）", () => {
    expect(q.JX).toBeGreaterThan(0);
    expect(q.SW_L).toBeGreaterThan(q.JX);
    expect(q.SW_R).toBeLessThan(q.JX + q.JW);
    expect(q.SW_B).toBeLessThan(q.JY + q.JH);
    expect(q.RIM).toBeGreaterThan(q.JY); // 水面低于缸口
    expect(q.RIM).toBeLessThan(q.SW_B);
  });

  it("极小尺寸也不塌：宽高有下限，缸仍然是个缸", () => {
    const tiny = geometry(10, 10);
    expect(tiny.W).toBe(220);
    expect(tiny.H).toBe(180);
    expect(tiny.JW).toBeGreaterThan(0);
    expect(tiny.JH).toBeGreaterThan(0);
    expect(tiny.SW_R).toBeGreaterThan(tiny.SW_L);
  });

  it("生物大小跟着缸走，但两头都夹住 —— 小屏不塞满、大屏不缩成芝麻", () => {
    expect(geometry(200, 200).S).toBe(0.7);
    expect(geometry(4000, 3000).S).toBe(1.7);
    expect(geometry(560, 400).S).toBeCloseTo(1, 5);
  });

  it("宽高比变了几何照样成立（手机竖屏那种窄缸）", () => {
    const narrow = geometry(320, 620);
    expect(narrow.SW_L).toBeLessThan(narrow.SW_R);
    expect(narrow.RIM).toBeLessThan(narrow.SW_B);
    expect(narrow.R).toBeGreaterThanOrEqual(14);
    expect(narrow.R).toBeLessThanOrEqual(40);
  });
});

describe("sizeFactor", () => {
  it("越稀有的越大一圈，一缸里才有层次", () => {
    expect(sizeFactor({ rarity: 3 })).toBeGreaterThan(sizeFactor({ rarity: 2 }));
    expect(sizeFactor({ rarity: 2 })).toBeGreaterThan(sizeFactor({ rarity: 1 }));
  });
});

describe("surfaceAt", () => {
  it("静水面在 RIM 附近起伏，幅度有限（不会翻出缸外）", () => {
    const s = world();
    for (let x = q.JX; x <= q.JX + q.JW; x += 20) {
      expect(Math.abs(surfaceAt(x, s, q) - q.RIM)).toBeLessThan(8 * q.S);
    }
  });

  it("水面在动：同一点不同时刻高度不同", () => {
    const x = q.JX + q.JW / 2;
    expect(surfaceAt(x, world({ t: 0 }), q)).not.toBeCloseTo(
      surfaceAt(x, world({ t: 1.7 }), q),
      3,
    );
  });

  it("砸下去那一刻落点是个凹坑（y 变大＝更靠下），不是整缸一起抬起", () => {
    const s = world({ splash: 1, splashX: q.JX + q.JW / 2, splashT: 0 });
    const calm = world();
    const at = s.splashX;
    expect(surfaceAt(at, s, q)).toBeGreaterThan(surfaceAt(at, calm, q));
  });

  it("扰动是局部的：离落点越远越弱", () => {
    const mid = q.JX + q.JW / 2;
    const s = world({ splash: 1, splashX: mid, splashT: 0 });
    const calm = world();
    const near = Math.abs(surfaceAt(mid + 10, s, q) - surfaceAt(mid + 10, calm, q));
    const far = Math.abs(surfaceAt(mid + 300, s, q) - surfaceAt(mid + 300, calm, q));
    expect(far).toBeLessThan(near);
  });

  it("splash 衰减到阈值以下就完全不参与计算（回到常态呼吸）", () => {
    const x = q.JX + 40;
    expect(surfaceAt(x, world({ splash: 0.0005, splashX: x }), q)).toBe(
      surfaceAt(x, world(), q),
    );
  });
});

describe("inTank", () => {
  it("缸壁围出来的那块才算水里", () => {
    expect(inTank({ x: q.JX + q.JW / 2, y: q.JY + q.JH / 2 }, q)).toBe(true);
    expect(inTank({ x: q.JX - 1, y: q.JY + 10 }, q)).toBe(false);
    expect(inTank({ x: q.JX + 10, y: q.JY - 1 }, q)).toBe(false);
    expect(inTank({ x: q.JX + q.JW + 1, y: q.JY + 10 }, q)).toBe(false);
    expect(inTank({ x: q.JX + 10, y: q.JY + q.JH + 1 }, q)).toBe(false);
  });
});

describe("grabAt", () => {
  it("点空水里抓不到东西", () => {
    const s = world({ residents: [fish({ x: 100, y: 100 })] });
    expect(grabAt({ x: 600, y: 400 }, s, q)).toBeNull();
  });

  it("判定圈按它这一帧画出来的大小：鲸好抓、樱花虾得点准", () => {
    const whale = fish({ id: "whale", x: 300, y: 300, dsize: 200 });
    const shrimp = fish({ id: "shrimp", x: 300, y: 300, dsize: 10 });
    const off = { x: 340, y: 300 };
    expect(grabAt(off, world({ residents: [whale] }), q)).toBe(whale);
    expect(grabAt(off, world({ residents: [shrimp] }), q)).toBeNull();
  });

  it("重叠时取最近的那只", () => {
    const near = fish({ id: "a", x: 300, y: 300, dsize: 120 });
    const far = fish({ id: "b", x: 330, y: 300, dsize: 120 });
    expect(grabAt({ x: 305, y: 300 }, world({ residents: [near, far] }), q)).toBe(near);
  });
});

describe("seek", () => {
  it("卵不参与追逐 —— 它还不会游", () => {
    const egg = fish({ stage: STAGE.EGG });
    const s = world({ food: [{ x: egg.x + 5, y: egg.y }] });
    expect(seek(egg, q, s)).toBe(false);
  });

  it("扎根的走不了（珊瑚不会游过来吃）", () => {
    const coral = fish({ motion: "anchor" });
    const s = world({ food: [{ x: coral.x + 5, y: coral.y }] });
    expect(seek(coral, q, s)).toBe(false);
  });

  it("到嘴边就吃掉：饵标记为已吃、弹一下、冒个泡", () => {
    const r = fish();
    const food = { x: r.x + REACH_R * q.S * 0.5, y: r.y };
    const s = world({ food: [food] });
    seek(r, q, s);
    expect(food.eaten).toBe(true);
    expect(r.pop).toBeGreaterThan(0);
    expect(s.bubbles).toHaveLength(1);
  });

  it("成体吃到饵不改 born，也不惊动父页（长满了，吃着玩）", () => {
    const onFeed = vi.fn();
    const r = fish({ stage: STAGE.ADULT, born: 12345 });
    const s = world({ food: [{ x: r.x, y: r.y }] });
    seek(r, q, s, onFeed);
    expect(r.born).toBe(12345);
    expect(onFeed).not.toHaveBeenCalled();
  });

  it("还在长的吃到饵：born 往前赶一截，并把 uid 报给父页", () => {
    const onFeed = vi.fn();
    const r = fish({ stage: STAGE.FRY, born: Date.now() - 1000, uid: "u7" });
    const before = r.born;
    const s = world({ food: [{ x: r.x, y: r.y }] });
    seek(r, q, s, onFeed);
    expect(r.born).toBeLessThan(before); // born 越早＝长得越久
    expect(onFeed).toHaveBeenCalledWith("u7");
  });

  it("没 onFeed 回调也不炸（父页没接这条线时）", () => {
    const r = fish({ stage: STAGE.FRY, born: Date.now() - 1000 });
    expect(() => seek(r, q, world({ food: [{ x: r.x, y: r.y }] }))).not.toThrow();
  });

  it("闻得到就朝饵加速，闻不到就当没有", () => {
    const r = fish();
    const near = seek(r, q, world({ food: [{ x: r.x + 60, y: r.y }] }));
    expect(near).toBe(true);
    expect(r.vx).toBeGreaterThan(0.2);

    const far = fish({ vx: 0.2 });
    expect(seek(far, q, world({ food: [{ x: far.x + SENSE_R * q.S + 50, y: far.y }] }))).toBe(
      false,
    );
    expect(far.vx).toBe(0.2);
  });

  it("底栖的只捡沉到底的那几粒 —— 它们不会浮上来抢", () => {
    const crab = fish({ motion: "crawl", y: q.SW_B });
    const floating = { x: crab.x + 40, y: q.RIM + 30 };
    expect(seek(crab, q, world({ food: [floating] }))).toBe(false);

    const sunk = { x: crab.x + 40, y: q.SW_B - 5 };
    expect(seek(fish({ motion: "crawl", y: q.SW_B }), q, world({ food: [sunk] }))).toBe(true);
  });

  it("手划得快＝搅水：往反方向窜", () => {
    const r = fish();
    const s = world({ ptr: { x: r.x + 40, y: r.y, v: SWIPE_V + 3, on: true } });
    seek(r, q, s);
    expect(r.vx).toBeLessThan(0.2); // 手在右边，往左窜
  });

  it("手慢慢挪＝好奇：靠过来", () => {
    const r = fish();
    const s = world({ ptr: { x: r.x + 100, y: r.y, v: 0.4, on: true } });
    seek(r, q, s);
    expect(r.vx).toBeGreaterThan(0.2);
  });

  it("手贴太近就不再往前凑（留一小段距离，不糊在指尖上）", () => {
    const r = fish({ vx: 0 });
    const s = world({ ptr: { x: r.x + 5, y: r.y, v: 0.2, on: true } });
    expect(seek(r, q, s)).toBe(false);
    expect(r.vx).toBe(0);
  });

  it("手在影响半径外就不理它", () => {
    const r = fish({ vx: 0.2 });
    const s = world({ ptr: { x: r.x + TOUCH_R * q.S + 50, y: r.y, v: 0.2, on: true } });
    expect(seek(r, q, s)).toBe(false);
  });

  it("追速有上限，不会越加越快甩出缸", () => {
    const r = fish({ vx: 99, vy: 99 });
    seek(r, q, world({ food: [{ x: r.x + 60, y: r.y + 60 }] }));
    expect(Math.hypot(r.vx, r.vy)).toBeLessThanOrEqual(CHASE_MAX * q.S + 1e-9);
  });

  it("刺激没了不是急刹：chase 一帧帧退，速度慢慢收敛回巡游", () => {
    const r = fish({ vx: 1.1, vy: 0.5, chase: 3, cruise: 0.2 });
    expect(seek(r, q, world())).toBe(true);
    expect(r.chase).toBe(2);
    expect(Math.abs(r.vx)).toBeLessThan(1.1);
    expect(Math.abs(r.vx)).toBeGreaterThan(0.2);
    expect(Math.abs(r.vy)).toBeLessThan(0.5);
  });

  it("收敛过程不会把它掉个头（符号保持）", () => {
    const r = fish({ vx: -1.1, chase: 5 });
    seek(r, q, world());
    expect(r.vx).toBeLessThan(0);
  });

  it("chase 归零后彻底放手，返回 false", () => {
    const r = fish({ vx: 0.2, chase: 0 });
    expect(seek(r, q, world())).toBe(false);
  });
});

describe("shove", () => {
  const ripple = (over = {}) => ({
    x: 400, y: 300, r: 100, max: 190 * q.S, power: 1, ...over,
  });

  it("没有波的时候什么都不做", () => {
    const r = fish({ vx: 0.2, vy: 0 });
    shove(r, q, world());
    expect(r.vx).toBe(0.2);
    expect(r.vy).toBe(0);
  });

  it("扎根的和卵不被推动（它们本来就不为所动）", () => {
    for (const over of [{ motion: "anchor" }, { stage: STAGE.EGG }]) {
      const r = fish({ x: 500, y: 300, vx: 0, vy: 0, ...over });
      shove(r, q, world({ ripples: [ripple()] }));
      expect(r.vx).toBe(0);
    }
  });

  it("只有被波前扫到的那一刻才被推 —— 圈内所有鱼一起被吹走是错的", () => {
    // 波心在 (400,300)、波前半径 100：站在波心上（离波前 100）不该被推
    const atCenter = fish({ x: 400, y: 300, vx: 0, vy: 0 });
    shove(atCenter, q, world({ ripples: [ripple()] }));
    expect(atCenter.vx).toBe(0);

    // 正踩在波前上，被推开
    const onFront = fish({ x: 500, y: 300, vx: 0, vy: 0 });
    shove(onFront, q, world({ ripples: [ripple()] }));
    expect(onFront.vx).toBeGreaterThan(0);
  });

  it("推的方向是「远离波心」", () => {
    const left = fish({ x: 300, y: 300, vx: 0, vy: 0 });
    shove(left, q, world({ ripples: [ripple()] }));
    expect(left.vx).toBeLessThan(0);
  });

  it("波前那层有厚度，出了这层厚度就不再给力", () => {
    const outside = fish({ x: 400 + 100 + RIPPLE_EDGE * q.S + 5, y: 300, vx: 0, vy: 0 });
    shove(outside, q, world({ ripples: [ripple()] }));
    expect(outside.vx).toBe(0);
  });

  it("波荡出最远距离之外就管不着了", () => {
    const faraway = fish({ x: 400, y: 300, vx: 0, vy: 0 });
    // 波前已扩到 max 之外，鱼与波心的距离也超过 max
    faraway.x = 400 + 190 * q.S + 20;
    shove(faraway, q, world({ ripples: [ripple({ r: 190 * q.S + 20 })] }));
    expect(faraway.vx).toBe(0);
  });

  it("被推之后先顺着这股劲滑一段（chase 撑住）再收敛回巡游", () => {
    const r = fish({ x: 500, y: 300, vx: 0, vy: 0, chase: 0 });
    shove(r, q, world({ ripples: [ripple()] }));
    expect(r.chase).toBeGreaterThan(0);
  });

  it("推力也吃同一个速度上限", () => {
    const r = fish({ x: 500, y: 300, vx: 50, vy: 50 });
    shove(r, q, world({ ripples: [ripple()] }));
    expect(Math.hypot(r.vx, r.vy)).toBeLessThanOrEqual(CHASE_MAX * q.S + 1e-9);
  });
});

describe("step", () => {
  it("卵不会游：往缸底沉，且不吃自己的速度", () => {
    const egg = fish({ stage: STAGE.EGG, y: q.RIM + 50, vx: 5, x: 400 });
    const x0 = egg.x, y0 = egg.y;
    step(egg, q, world(), false);
    expect(egg.y).toBeGreaterThan(y0);          // 在下沉
    expect(Math.abs(egg.x - x0)).toBeLessThan(0.1); // 只随水轻轻晃，不是被 vx 拖走
  });

  it("扎根的原地不动", () => {
    const coral = fish({ motion: "anchor", vx: 1, x: 400, y: 400 });
    step(coral, q, world(), false);
    expect(coral.x).toBe(400);
  });

  it("贴底的会往缸底收，而且不上浮", () => {
    const crab = fish({ motion: "crawl", y: q.SW_B - 100, vy: -5 });
    const y0 = crab.y;
    step(crab, q, world(), false);
    expect(crab.y).toBeGreaterThan(y0);
    expect(crab.y).toBeLessThanOrEqual(q.SW_B);
  });

  it("撞到缸壁掉头，不会穿墙出去", () => {
    const r = fish({ x: q.SW_R - 0.1, vx: 5 });
    step(r, q, world(), true);
    expect(r.x).toBe(q.SW_R);
    expect(r.vx).toBeLessThan(0);

    const l = fish({ x: q.SW_L + 0.1, vx: -5 });
    step(l, q, world(), true);
    expect(l.x).toBe(q.SW_L);
    expect(l.vx).toBeGreaterThan(0);
  });

  it("不会游出水面（水下留一截余量）", () => {
    const s = world();
    const r = fish({ y: q.RIM, vy: -5 });
    step(r, q, s, true);
    expect(r.y).toBeGreaterThan(surfaceAt(r.x, s, q));
    expect(r.vy).toBeGreaterThan(0); // 被顶回水里
  });

  it("不会沉出缸底", () => {
    const r = fish({ y: q.SW_B - 0.1, vy: 5 });
    step(r, q, world(), true);
    expect(r.y).toBe(q.SW_B);
    expect(r.vy).toBeLessThan(0);
  });

  it("被牵动时按算出来的速度走，巡游的正弦晃让位", () => {
    const s = world({ t: 1.3 });
    const r = fish({ vx: 0.4, vy: 0.3, ph: 1.1, y: 300, x: 400 });
    step(r, q, s, true);
    expect(r.x).toBeCloseTo(400.4, 6);
    expect(r.y).toBeCloseTo(300.3, 6); // 没有额外的正弦项
  });

  it("水母（drift）横向走得慢、靠上下悬浮", () => {
    const s = world({ t: 1 });
    const jelly = fish({ motion: "drift", vx: 0.4, x: 400, y: 300, ph: 0 });
    step(jelly, q, s, false);
    expect(jelly.x).toBeCloseTo(400.2, 6); // 横速打对折
    expect(jelly.y).not.toBeCloseTo(300, 6); // 上下在动
  });
});
