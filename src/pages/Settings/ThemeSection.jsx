import React from "react";
import { useReward, SHOP_ITEMS } from "../../context/RewardContext";
import { useTheme } from "../../context/ThemeContext";

const THEME_OPTIONS = [
  { id: "default", name: "默认", icon: "🎨", desc: "原始紫色调" },
  ...SHOP_ITEMS.filter((i) => i.id.startsWith("theme-")),
];

export default function ThemeSection() {
  const { isOwned } = useReward();
  const { activeTheme, setTheme } = useTheme();

  return (
    <div className="settings-section">
      <div className="settings-section-title">外观主题</div>
      <p className="settings-section-hint">
        在「奖励」商城解锁皮肤后即可在此切换
      </p>
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
                <span className="settings-theme-badge">当前</span>
              )}
              {!unlocked && (
                <span className="settings-theme-lock-hint">
                  🪙 {theme.price} 可解锁
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
