// 标本：烧瓶架 × 生态缸交汇的那一件事——把养大的一只封进注满的一只瓶子里存好。
//
// 两道门槛，缺一不可（缺哪一道都会让这件事变廉价）：
//   鱼要长成成体   还在长的封起来就永远停在半路了，养成那条线也就白走了
//   瓶子要注满一小时  标本是这一小时专注的封存物，不是随手一放
// 一只瓶子只封一只——它是这只瓶子的「里面装着什么」，不是一个收纳格。
//
// 存档不另开 key：封存写在生态缸那条住客记录上（sealedIn = 烧瓶 id）。
// 一份数据、一个真相——于是不会出现「缸里还在游、瓶里也摆着」的两份账。
// 图鉴仍然算它一份（收集是无损的，见 aquariumData 的收集观），只是不再在缸里游。
//
// 瓶子被移出架子时，封在里面的那只自动回缸里游（sealedIn 指向架上不存在的瓶子即视为没封）——
// 故不会留下够不着的孤儿标本，也不必在删瓶子那条路径上再写一遍清理。
import { STAGE, growthOf, normalizeCollection } from "@/data/aquarium/growth";
import { FLASK_FULL_SECS } from "@/pages/Flasks/flaskShelf";

// 能封标本的最低水位＝一只瓶子注满（1 小时专注）
export const SPECIMEN_MIN_SECS = FLASK_FULL_SECS;

// 这只瓶子够不够格封标本
export const flaskReady = (secs) => (secs || 0) >= SPECIMEN_MIN_SECS;

export const isAdult = (entry, now = Date.now()) =>
  growthOf(entry?.born, now).stage === STAGE.ADULT;

// 住客 → { sealed: { [flaskId]: entry }, swimming: entry[] }。
// flaskIds 是架上真实存在的瓶子（不传＝不校验）；指向已被移走的瓶子的那些回去游。
// 同一只瓶子里出现两只（改坏存档）时只认最早封进去的那只，其余当没封。
export function splitResidents(list, flaskIds) {
  const ids = flaskIds ? new Set(flaskIds) : null;
  const entries = normalizeCollection(list);
  const sealed = {};
  for (const e of entries) {
    if (!e.sealedIn) continue;
    if (ids && !ids.has(e.sealedIn)) continue;
    const cur = sealed[e.sealedIn];
    if (!cur || e.sealedAt < cur.sealedAt) sealed[e.sealedIn] = e;
  }
  const held = new Set(Object.values(sealed).map((e) => e.uid));
  return { sealed, swimming: entries.filter((e) => !held.has(e.uid)) };
}

// 此刻可以被做成标本的那些：长成了、还在缸里游。
export function sealable(list, flaskIds, now = Date.now()) {
  return splitResidents(list, flaskIds).swimming.filter((e) => isAdult(e, now));
}

// 把 uid 这一只封进 flaskId。不合规矩（没长成 / 已经封过 / 那只瓶子里已经有一只）时
// 原样返回入参——调用方据此跳过一次落盘，也不必自己再校验一遍。
export function sealFish(list, uid, flaskId, now = Date.now()) {
  if (!uid || !flaskId) return list;
  const entries = normalizeCollection(list);
  const target = entries.find((e) => e.uid === uid);
  if (!target || target.sealedIn || !isAdult(target, now)) return list;
  if (entries.some((e) => e.sealedIn === flaskId)) return list; // 一瓶一只
  return entries.map((e) =>
    e.uid === uid ? { ...e, sealedIn: flaskId, sealedAt: now } : e,
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
