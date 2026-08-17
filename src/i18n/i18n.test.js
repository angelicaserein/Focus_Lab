import { describe, it, expect } from "vitest";
import { TRANSLATIONS, LANGUAGES, DEFAULT_LANG } from "@/i18n/translations";

// 字典的守护测试。词条有一千多条、分散在二十几个命名空间文件里，靠人眼守不住；
// 这里把「两套语言必须并排长在一起」这条约定钉死：
//   缺一种语言、两个文件抢同一个 key、占位符对不上——都会在这里红掉，
//   而不是等到用户切到英文界面才看见半句中文或裸露的 {n}。
//
// 用 import.meta.glob 直接抓 i18n/ 目录下的所有命名空间文件：新增一个文件
// 不用改这里，忘记在 translations.js 里注册反而会被下面的「都已注册」用例抓出来。
const MODULES = import.meta.glob("./*.js", { eager: true });

const NAMESPACE_FILES = Object.entries(MODULES).filter(
  ([path]) => !path.endsWith("/translations.js") && !path.endsWith(".test.js"),
);

// [{ file, key, entry }]，展平后大部分用例都直接遍历它
const ENTRIES = NAMESPACE_FILES.flatMap(([path, mod]) =>
  Object.entries(mod.default).map(([key, entry]) => ({ file: path, key, entry })),
);

const PLACEHOLDERS = (s) =>
  [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("i18n 字典", () => {
  it("确实抓到了所有命名空间文件", () => {
    expect(NAMESPACE_FILES.length).toBeGreaterThan(20);
    expect(ENTRIES.length).toBeGreaterThan(1000);
  });

  it("每条词条都同时给了 en 和 zh", () => {
    const bad = ENTRIES.filter(({ entry }) =>
      LANGUAGES.some(({ id }) => typeof entry[id] !== "string" || !entry[id].trim()),
    ).map(({ file, key }) => `${file} ${key}`);
    expect(bad).toEqual([]);
  });

  it("每条词条只声明 en / zh，没有拼错的语言字段", () => {
    const ids = LANGUAGES.map((l) => l.id);
    const bad = ENTRIES.filter(({ entry }) =>
      Object.keys(entry).some((k) => !ids.includes(k)),
    ).map(({ file, key, entry }) => `${file} ${key}: ${Object.keys(entry).join()}`);
    expect(bad).toEqual([]);
  });

  it("同一个 key 不会在两个文件里各定义一次", () => {
    // translations.js 是按顺序合并的，重复的 key 会被后一个文件悄悄覆盖
    const seen = new Map();
    const dupes = [];
    for (const { file, key } of ENTRIES) {
      if (seen.has(key)) dupes.push(`${key}: ${seen.get(key)} <-> ${file}`);
      else seen.set(key, file);
    }
    expect(dupes).toEqual([]);
  });

  it("en 与 zh 的占位符集合一致", () => {
    // {n} 在一边有、另一边没有，切换语言时要么丢数据、要么把 "{n}" 原样显示给用户
    const bad = ENTRIES.filter(
      ({ entry }) =>
        PLACEHOLDERS(entry.en).join() !== PLACEHOLDERS(entry.zh).join(),
    ).map(
      ({ file, key, entry }) =>
        `${file} ${key}: en[${PLACEHOLDERS(entry.en)}] zh[${PLACEHOLDERS(entry.zh)}]`,
    );
    expect(bad).toEqual([]);
  });

  it("英文文案里不混中文字符与全角标点", () => {
    // 最常见的漏翻：复制了 zh 那行忘了改，或中文标点跟着句子一起粘过来
    const bad = ENTRIES.filter(({ entry }) =>
      /[一-鿿　-〿＀-･]/.test(entry.en),
    ).map(({ file, key, entry }) => `${file} ${key}: ${entry.en}`);
    expect(bad).toEqual([]);
  });

  it("标点统一：省略号用 …，引号用弯引号，撇号用直的", () => {
    // 全篇已经统一成这一套，这里只是把它钉住，免得新文案又混进 "..." 或 "xx"
    const bad = [];
    for (const { file, key, entry } of ENTRIES) {
      for (const { id } of LANGUAGES) {
        const s = entry[id];
        if (s.includes("...")) bad.push(`${file} ${key}.${id}: 用 … 代替 ...`);
        if (s.includes('"')) bad.push(`${file} ${key}.${id}: 用 “ ” 代替 "`);
        if (s.includes("’")) bad.push(`${file} ${key}.${id}: 用 ' 代替 ’`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("key 都带命名空间前缀，且不含空格", () => {
    const bad = ENTRIES.filter(({ key }) => !/^[a-z][\w-]*(\.[\w-]+)+$/i.test(key)).map(
      ({ file, key }) => `${file} ${key}`,
    );
    expect(bad).toEqual([]);
  });

  it("所有命名空间文件都在 translations.js 里注册了", () => {
    // 漏注册的文件里那些 key 会静默回退成 key 本身，页面上直接露出 "focus.xxx"
    const merged = TRANSLATIONS[DEFAULT_LANG];
    const missing = ENTRIES.filter(({ key }) => !(key in merged)).map(
      ({ file, key }) => `${file} ${key}`,
    );
    expect(missing).toEqual([]);
  });

  it("合并后的字典每种语言条数相同，且与源文件对得上", () => {
    for (const { id } of LANGUAGES) {
      expect(Object.keys(TRANSLATIONS[id])).toHaveLength(ENTRIES.length);
    }
  });
});
