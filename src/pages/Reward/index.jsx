import React from "react";
import { useReward, SHOP_ITEMS } from "@/context/RewardContext";
import { SHOP_CATEGORIES, shopItemName } from "@/utils/shopConfig";
import { useLanguage } from "@/context/LanguageContext";
import useToast from "@/hooks/common/useToast";
import EmojiPicker from "@/components/ui/EmojiPicker";
import ShopCard from "./ShopCard";
import CustomItemCard from "./CustomItemCard";
import RewardDebugPanel from "./RewardDebugPanel";
import useCustomItemForm from "./useCustomItemForm";
import useCoinsDebug from "./useCoinsDebug";
import "./Reward.css";

// 调试按钮仅在开发环境显示，正式发布给参与者时自动隐藏。
const DEBUG_ENABLED = import.meta.env.DEV;

export default function RewardPage() {
  const {
    coins,
    setCoinsTo,
    customItems,
    addCustomItem,
    updateCustomItem,
    removeCustomItem,
  } = useReward();

  const { t } = useLanguage();
  const { toast, showToast } = useToast();
  const onPurchased = (item) =>
    showToast({
      message: t("reward.purchased", { name: shopItemName(t, item) }),
      icon: item.icon,
    });

  const { form, setField, editingId, startEdit, cancelEdit, handleSubmit, canSubmit } =
    useCustomItemForm({ addCustomItem, updateCustomItem, showToast, t });

  const debug = useCoinsDebug({ coins, setCoinsTo, showToast, t });

  return (
    <div className="page-reward">
      <div className="reward-headline">
        <h1>{t("reward.title")}</h1>
        {DEBUG_ENABLED && (
          <button
            type="button"
            className="reward-debug-btn"
            title={t("reward.debug.open")}
            aria-label={t("reward.debug.open")}
            onClick={debug.openDebug}
          >
            {t("reward.debug.btn")}
          </button>
        )}
      </div>

      {DEBUG_ENABLED && debug.open && (
        <RewardDebugPanel
          value={debug.value}
          setValue={debug.setValue}
          onClose={debug.close}
          onApply={debug.apply}
        />
      )}

      {/* 资产卡 */}
      <div className="reward-asset-card">
        <div className="reward-asset-label">{t("reward.asset.label")}</div>
        <div className="reward-asset-value">
          <span className="reward-coin-icon">🪙</span>
          <span className="reward-coin-num">{coins}</span>
          <span className="reward-coin-unit">{t("reward.asset.unit")}</span>
        </div>
        <div className="reward-asset-hint">{t("reward.asset.hint")}</div>
      </div>

      {/* 开发者商城 */}
      <div className="reward-section">
        <div className="reward-shop-header">
          <div>
            <div className="reward-section-title">{t("reward.shop.title")}</div>
            <div className="reward-shop-header-sub">
              {t("reward.shop.sub")}
            </div>
          </div>
          <span className="reward-shop-header-count">
            {t("reward.shop.count", { count: SHOP_ITEMS.length })}
          </span>
        </div>

        {SHOP_CATEGORIES.map((cat) => {
          const items = SHOP_ITEMS.filter((it) => it.tag === cat.tag);
          if (items.length === 0) return null;
          return (
            <div key={cat.tag} className="shop-group">
              <div className="shop-group-title">
                <span className="shop-group-icon">{cat.icon}</span>
                {t(cat.labelKey)}
              </div>
              <div className="shop-grid">
                {items.map((item) => (
                  <ShopCard key={item.id} item={item} onPurchased={onPurchased} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 我的自定义 */}
      <div className="reward-section">
        <div className="reward-section-title">
          {editingId ? t("reward.custom.editTitle") : t("reward.custom.title")}
        </div>

        <form className="reward-custom-form" onSubmit={handleSubmit}>
          <EmojiPicker value={form.icon} onChange={(icon) => setField({ icon })} />
          <input
            className="reward-custom-input reward-custom-name"
            value={form.name}
            placeholder={t("reward.custom.name")}
            aria-label={t("reward.custom.name")}
            onChange={(e) => setField({ name: e.target.value })}
          />
          <input
            className="reward-custom-input reward-custom-price"
            type="number"
            min="1"
            value={form.price}
            placeholder={t("reward.custom.price")}
            aria-label={t("reward.custom.priceAria")}
            onChange={(e) => setField({ price: e.target.value })}
          />
          <input
            className="reward-custom-input reward-custom-desc"
            value={form.desc}
            placeholder={t("reward.custom.desc")}
            aria-label={t("reward.custom.descAria")}
            onChange={(e) => setField({ desc: e.target.value })}
          />
          <button className="reward-custom-add" type="submit" disabled={!canSubmit}>
            {editingId ? t("reward.custom.save") : t("reward.custom.add")}
          </button>
          {editingId && (
            <button
              type="button"
              className="reward-custom-cancel"
              onClick={cancelEdit}
            >
              {t("common.cancel")}
            </button>
          )}
        </form>

        {customItems.length > 0 ? (
          <div className="reward-shop-grid">
            {customItems.map((item) => (
              <CustomItemCard
                key={item.id}
                item={item}
                onPurchased={onPurchased}
                onEdit={startEdit}
                onDelete={removeCustomItem}
              />
            ))}
          </div>
        ) : (
          <div className="reward-custom-empty">
            {t("reward.custom.empty")}
          </div>
        )}
      </div>

      {toast && (
        <div className="toast toast--center visible" role="status" aria-live="polite">
          <span className="toast-text">{toast.icon} {toast.message}</span>
        </div>
      )}
    </div>
  );
}
