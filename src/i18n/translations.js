// 应用文案字典。新增可见文案时进对应命名空间文件补 { en, zh } 两份。
// key 采用 "命名空间.名称" 的扁平结构；t() 缺失时回退到 en，再回退到 key 本身。
// 每条文案的中英并置在同一处，避免两套字典漂移。
import nav from "./nav";
import character from "./character";
import wish from "./wish";
import aquarium from "./aquarium";
import world from "./world";
import skilltree from "./skilltree";
import functiontree from "./functiontree";
import industry from "./industry";
import home from "./home";
import ddl from "./ddl";
import focus from "./focus";
import flasks from "./flasks";
import distraction from "./distraction";
import todo from "./todo";
import settings from "./settings";
import gantt from "./gantt";
import reminder from "./reminder";
import tutorial from "./tutorial";

export const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "zh", label: "中文" },
];

export const DEFAULT_LANG = "zh";

// 各命名空间按显示顺序合并；后者不覆盖前者的 key（命名空间前缀天然不冲突）。
const MODULES = [
  nav,
  character,
  wish,
  aquarium,
  world,
  skilltree,
  functiontree,
  industry,
  home,
  ddl,
  focus,
  flasks,
  distraction,
  todo,
  settings,
  gantt,
  reminder,
  tutorial,
];

// 把 { key: { en, zh } } 的并置结构，按语言拆平成 { en: {...}, zh: {...} }。
export const TRANSLATIONS = LANGUAGES.reduce((acc, { id }) => {
  acc[id] = {};
  for (const mod of MODULES) {
    for (const key in mod) acc[id][key] = mod[key][id];
  }
  return acc;
}, {});
