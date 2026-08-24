import React from "react";
import { isDesktop } from "@/utils/desktop/desktopBridge";
import { useLanguage } from "@/context/LanguageContext";

// 快捷键一览。原来这些键（Esc 关闭、Ctrl+Enter 触发…）只能靠用户碰巧撞上——
// 有加速器却没有任何地方可查，等于对多数人不存在。
//
// 这张表是手写的，不是从代码扫出来的：真值散在各个组件的 keydown 里，
// 加了新键要顺手往这儿补一行。宁可偶尔漏一条，也好过一条都查不到。
const KEYS = [
  { keys: ["Ctrl / ⌘", "K"], descKey: "settings.keys.palette" },
  { keys: ["↑", "↓", "Enter"], descKey: "settings.keys.paletteNav" },
  { keys: ["Esc"], descKey: "settings.keys.esc" },
  { keys: ["Enter"], descKey: "settings.keys.enter" },
  { keys: ["Ctrl / ⌘", "Enter"], descKey: "settings.keys.ctrlEnter" },
];

// 桌面版专属：这两个是系统级的，别的软件在前台时也按得动。
const DESKTOP_KEYS = [
  { keys: ["Ctrl / ⌘", "Shift", "F"], descKey: "settings.keys.desktopFocus" },
  { keys: ["Ctrl / ⌘", "Shift", "Space"], descKey: "settings.keys.desktopCapture" },
];

function KeyRow({ keys, descKey }) {
  const { t } = useLanguage();
  return (
    <li className="settings-keyrow">
      <span className="settings-keycombo">
        {keys.map((k, i) => (
          <React.Fragment key={k}>
            {i > 0 && <span className="settings-keyplus">+</span>}
            <kbd className="settings-kbd">{k}</kbd>
          </React.Fragment>
        ))}
      </span>
      <span className="settings-keydesc">{t(descKey)}</span>
    </li>
  );
}

export default function ShortcutsSection() {
  const { t } = useLanguage();
  const rows = isDesktop ? [...KEYS, ...DESKTOP_KEYS] : KEYS;

  return (
    <div className="settings-section">
      <div className="settings-section-title">{t("settings.keys.title")}</div>
      <p className="settings-section-hint">{t("settings.keys.hint")}</p>
      <ul className="settings-keylist">
        {rows.map((row) => (
          <KeyRow key={row.descKey} {...row} />
        ))}
      </ul>
    </div>
  );
}
