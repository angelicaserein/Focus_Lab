import React from "react";
import { useReward, SHOP_ITEMS } from "@/context/RewardContext";
import { FREE_THEMES } from "@/utils/shopConfig";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { shopItemName, shopItemDesc } from "@/utils/shopConfig";

export default function ThemeSection() {
  const { isOwned } = useReward();
  const { activeTheme, setTheme } = useTheme();
  const { t } = useLanguage();

  // 顺序：不要钱的排前面（默认 → 暗夜），要解锁的排后面。
  // 想在夜里换个深色的人不该先滑过一排锁着的卡片才找到能点的那张。
  const THEME_OPTIONS = [
    {
      id: "default",
      name: t("settings.theme.default"),
      icon: "🎨",
      desc: t("settings.theme.defaultDesc"),
      free: true,
    },
    ...FREE_THEMES.map((i) => ({
      ...i,
      name: shopItemName(t, i),
      desc: shopItemDesc(t, i),
      free: true,
    })),
    ...SHOP_ITEMS.filter((i) => i.id.startsWith("theme-")).map((i) => ({
      ...i,
      name: shopItemName(t, i),
      desc: shopItemDesc(t, i),
    })),
  ];

  return (
    <div className="settings-section">
      <div className="settings-section-title">{t("settings.theme.title")}</div>
      <p className="settings-section-hint">{t("settings.theme.hint")}</p>
      <div className="settings-theme-grid">
        {THEME_OPTIONS.map((theme) => {
          const unlocked = theme.free || isOwned(theme.id);
          const active = activeTheme === theme.id;
          return (
            <button
              key={theme.id}
              className={`settings-theme-card${active ? " active" : ""}${!unlocked ? " locked" : ""}`}
              onClick={() => unlocked && setTheme(theme.id)}
              disabled={!unlocked}
              aria-pressed={active}
            >
              <span className="settings-theme-icon">
                {unlocked ? theme.icon : "🔒"}
              </span>
              <span className="settings-theme-name">{theme.name}</span>
              <span className="settings-theme-desc">{theme.desc}</span>
              {active && (
                <span className="settings-theme-badge">{t("settings.theme.current")}</span>
              )}
              {!unlocked && (
                <span className="settings-theme-lock-hint">
                  {t("settings.theme.unlockHint", { price: theme.price })}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
