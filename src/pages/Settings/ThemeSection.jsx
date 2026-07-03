import React from "react";
import { useReward, SHOP_ITEMS } from "@/context/RewardContext";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";

export default function ThemeSection() {
  const { isOwned } = useReward();
  const { activeTheme, setTheme } = useTheme();
  const { t } = useLanguage();

  const THEME_OPTIONS = [
    {
      id: "default",
      name: t("settings.theme.default"),
      icon: "🎨",
      desc: t("settings.theme.defaultDesc"),
    },
    ...SHOP_ITEMS.filter((i) => i.id.startsWith("theme-")),
  ];

  return (
    <div className="settings-section">
      <div className="settings-section-title">{t("settings.theme.title")}</div>
      <p className="settings-section-hint">{t("settings.theme.hint")}</p>
      <div className="settings-theme-grid">
        {THEME_OPTIONS.map((theme) => {
          const unlocked = theme.id === "default" || isOwned(theme.id);
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
