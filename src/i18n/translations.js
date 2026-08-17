// 应用文案字典。新增可见文案时进对应命名空间文件补 { en, zh } 两份。
// key 采用 "命名空间.名称" 的扁平结构；t() 缺失时回退到 en，再回退到 key 本身。
// 每条文案的中英并置在同一处，避免两套字典漂移。
import common from "./common";
import analytics from "./analytics";
import history from "./history";
import memo from "./memo";
import nav from "./nav";
import sidebar from "./sidebar";
import character from "./character";
import wish from "./wish";
import aquarium from "./aquarium";
import world from "./world";
import skilltree from "./skilltree";
import functiontree from "./functiontree";
import deprecated from "./deprecated";
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
import reward from "./reward";
import research from "./research";
import calendar from "./calendar";
import scenario from "./scenario";

export const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "zh", label: "中文" },
];

export const DEFAULT_LANG = "zh";

// 各命名空间按显示顺序合并。同名 key 会被后者覆盖，所以两个文件不许定义同一个 key——
// i18n.test.js 会守住这条，以及 en/zh 齐全、占位符一致等约定。
const MODULES = [
  common,
  analytics,
  history,
  memo,
  nav,
  sidebar,
  character,
  wish,
  aquarium,
  world,
  skilltree,
  functiontree,
  deprecated,
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
  reward,
  research,
  calendar,
  scenario,
];

// 把 { key: { en, zh } } 的并置结构，按语言拆平成 { en: {...}, zh: {...} }。
export const TRANSLATIONS = LANGUAGES.reduce((acc, { id }) => {
  acc[id] = {};
  for (const mod of MODULES) {
    for (const key in mod) acc[id][key] = mod[key][id];
  }
  return acc;
}, {});
