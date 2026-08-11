import React from "react";
import { useReward } from "@/context/RewardContext";
import { useLanguage } from "@/context/LanguageContext";
import { getItemState } from "./rewardUtils";

// 「我的自定义」商品卡，带编辑 / 删除操作。
// onPurchased(item) 兑换成功回调；onEdit(item) / onDelete(id) 由页面提供。
export default function CustomItemCard({ item, onPurchased, onEdit, onDelete }) {
  const { coins, isOwned, getRedeemCount, buyItem } = useReward();
  const { t } = useLanguage();
  const { owned, count, affordable, disabled } = getItemState(item, {
    coins,
    isOwned,
    getRedeemCount,
  });

  let btnLabel = t("reward.buy");
  if (owned) btnLabel = t("reward.ownedCheck");
  else if (!affordable) btnLabel = t("reward.notEnough");

  return (
    <div className="reward-shop-card">
      {count > 0 && <span className="reward-shop-badge">{t("reward.redeemedCount", { count })}</span>}
      <div className="reward-shop-actions">
        <button
          className="reward-shop-action"
          title={t("reward.custom.edit")}
          aria-label={t("reward.custom.editAria", { name: item.name })}
          onClick={() => onEdit(item)}
        >
          ✏️
        </button>
        <button
          className="reward-shop-action"
          title={t("common.delete")}
          aria-label={t("reward.custom.deleteAria", { name: item.name })}
          onClick={() => onDelete(item.id)}
        >
          🗑️
        </button>
      </div>
      <div className="reward-shop-icon">{item.icon}</div>
      <div className="reward-shop-name">{item.name}</div>
      <div className="reward-shop-desc">{item.desc}</div>
      <div className="reward-shop-footer">
        <span className="reward-shop-price">🪙 {item.price}</span>
        <button
          className={`reward-buy-btn ${owned ? "owned" : ""}`}
          disabled={disabled}
          onClick={() => {
            if (buyItem(item)) onPurchased(item);
          }}
        >
          {btnLabel}
        </button>
      </div>
    </div>
  );
}
