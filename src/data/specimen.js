// 标本：烧瓶架 × 生态缸交汇的那一件事——把养大的一只封进注满的一只瓶子里存好。
//
// 两道门槛，缺一不可（缺哪一道都会让这件事变廉价）：
//   鱼要长成成体   还在长的封起来就永远停在半路了，养成那条线也就白走了
//   瓶子要注满一小时  标本是这一小时专注的封存物，不是随手一放
// 一只瓶子只封一只——它是这只瓶子的「里面装着什么」，不是一个收纳格。
//
// 「一只瓶子」指的是注满的那一只，不是架上的一个形状：同一形状注满三只，
// 就有三只瓶子各能封一只。故封存认的是槽位 id（slotId＝形状 id + 第几只），
// 页面上一只满瓶一张卡，一张卡对应一个槽位。
//
// 存档不另开 key：封存写在生态缸那条住客记录上（sealedIn = 槽位 id）。
// 一份数据、一个真相——于是不会出现「缸里还在游、瓶里也摆着」的两份账。
// 图鉴仍然算它一份（收集是无损的，见 aquariumData 的收集观），只是不再在缸里游。
//
// 槽位不在了（瓶子被移出架子、或水位掉回不足一只）时，封在里面的那只自动回缸里游——
// 故不会留下够不着的孤儿标本，也不必在删瓶子那条路径上再写一遍清理。
import { STAGE, growthOf, normalizeCollection } from "@/data/aquarium/growth";
import { FLASK_FULL_SECS, bottlesOf } from "@/pages/Flasks/flaskShelf";

// 能封标本的最低水位＝一只瓶子注满（1 小时专注）
export const SPECIMEN_MIN_SECS = FLASK_FULL_SECS;

// 这只瓶子够不够格封标本
export const flaskReady = (secs) => (secs || 0) >= SPECIMEN_MIN_SECS;

export const isAdult = (entry, now = Date.now()) =>
  growthOf(entry?.born, now).stage === STAGE.ADULT;

// —— 槽位 ——
// 一个槽位＝某个形状注满的第 index 只瓶子（index 从 0 起）。
export const slotId = (flaskId, index = 0) => `${flaskId}#${index}`;

// 槽位 id → { flaskId, index }。老存档里 sealedIn 是纯形状 id（那时一形状只封一只），
// 没有 # 就当第 0 只——于是旧存档不迁移也读得出来，仍落在第一只满瓶上。
export function parseSlot(id) {
  const s = typeof id === "string" ? id : "";
  const at = s.lastIndexOf("#");
  if (at < 0) return { flaskId: s, index: 0 };
  const n = Number(s.slice(at + 1));
  return {
    flaskId: s.slice(0, at),
    index: Number.isInteger(n) && n >= 0 ? n : 0,
  };
}

// 槽位 → 「封在某某瓶里」的说法。同一形状可以有好几只满瓶，各封各的；
// 故第二只起要报是第几只，不然两行一模一样，看不出封的是哪只瓶子。
// 架上找不到那只瓶子时返回 null，由调用方决定怎么交代。
export function slotLabel(slot, flasks, t) {
  const { flaskId, index } = parseSlot(slot);
  const f = (flasks ?? []).find((it) => it.id === flaskId);
  if (!f) return null;
  const v = f.name || t(`settings.prefs.flaskShape.${f.preset}`);
  return index > 0
    ? t("aquarium.sealedInNth", { v, n: index + 1 })
    : t("aquarium.sealedIn", { v });
}

const normalizeSlot = (id) => {
  const { flaskId, index } = parseSlot(id);
  return flaskId ? slotId(flaskId, index) : "";
};

// 架子当下真实存在的槽位：每个形状按水位摊平成几只满瓶。
// items＝架上的形状，fills＝{ [flaskId]: 累计秒数 }（见 flaskShelf.fillsOf）。
export function flaskSlots(items, fills) {
  const slots = [];
  for (const it of items ?? []) {
    const { full } = bottlesOf(fills?.[it.id] ?? 0);
    for (let i = 0; i < full; i += 1) slots.push(slotId(it.id, i));
  }
  return slots;
}

// 住客 → { sealed: { [slotId]: entry }, swimming: entry[] }。
// slotIds 是当下真实存在的槽位（不传＝不校验）；指向已经没了的槽位的那些回去游。
// 同一个槽位里出现两只（改坏存档）时只认最早封进去的那只，其余当没封。
export function splitResidents(list, slotIds) {
  const ids = slotIds ? new Set(slotIds.map(normalizeSlot)) : null;
  const entries = normalizeCollection(list);
  const sealed = {};
  for (const e of entries) {
    const slot = normalizeSlot(e.sealedIn);
    if (!slot) continue;
    if (ids && !ids.has(slot)) continue;
    const cur = sealed[slot];
    if (!cur || e.sealedAt < cur.sealedAt) sealed[slot] = e;
  }
  const held = new Set(Object.values(sealed).map((e) => e.uid));
  return { sealed, swimming: entries.filter((e) => !held.has(e.uid)) };
}

// 此刻可以被做成标本的那些：长成了、还在缸里游。
export function sealable(list, slotIds, now = Date.now()) {
  return splitResidents(list, slotIds).swimming.filter((e) => isAdult(e, now));
}

// 把 uid 这一只封进 slot 这只瓶子。不合规矩（没长成 / 已经封过 / 那只瓶子里已经有一只）时
// 原样返回入参——调用方据此跳过一次落盘，也不必自己再校验一遍。
export function sealFish(list, uid, slot, now = Date.now()) {
  const target = normalizeSlot(slot);
  if (!uid || !target) return list;
  const entries = normalizeCollection(list);
  const fish = entries.find((e) => e.uid === uid);
  if (!fish || fish.sealedIn || !isAdult(fish, now)) return list;
  if (entries.some((e) => normalizeSlot(e.sealedIn) === target)) return list; // 一瓶一只
  return entries.map((e) =>
    e.uid === uid ? { ...e, sealedIn: target, sealedAt: now } : e,
  );
}

// 取出来放回缸里。封存是保存，不是牺牲——反悔的代价应当是一次点击。
export function unsealFish(list, uid) {
  const entries = normalizeCollection(list);
  if (!entries.some((e) => e.uid === uid && e.sealedIn)) return list;
  return entries.map((e) =>
    e.uid === uid ? { ...e, sealedIn: null, sealedAt: 0 } : e,
  );
}
