import React from "react";
import { useReward } from "@/context/RewardContext";
import { useLanguage } from "@/context/LanguageContext";
import { shopItemName, shopItemDesc } from "@/utils/shopConfig";
import { getItemState } from "./rewardUtils";

// 开发者商城的商品卡（干净版：色底图标 + 简洁信息 + 幽灵按钮）。
// onPurchased(item) 在兑换成功后回调（用于弹出提示）。
export default function ShopCard({ item, onPurchased }) {
  const { coins, isOwned, getRedeemCount, buyItem } = useReward();
  const { t } = useLanguage();
  const { owned, count, affordable, disabled } = getItemState(item, {
    coins,
    isOwned,
    getRedeemCount,
  });

  let btnLabel = t("reward.buy");
  if (owned) btnLabel = t("reward.owned");
  else if (!affordable) btnLabel = t("reward.short", { count: item.price - coins });

  return (
    <div
      className={`shop-card ${owned ? "shop-card--owned" : ""}`}
      style={{ "--tint": item.accent }}
    >
      <div className="shop-card-icon">
        {item.icon}
        {count > 0 && <span className="shop-card-count">{count}</span>}
      </div>
      <div className="shop-card-name">{shopItemName(t, item)}</div>
      <div className="shop-card-desc">{shopItemDesc(t, item)}</div>
      <div className="shop-card-footer">
        <span className="shop-card-price">
          <span className="shop-card-coin">🪙</span>
          {item.price}
        </span>
        <button
          className={`shop-card-btn ${owned ? "owned" : ""} ${
            !owned && !affordable ? "poor" : ""
          }`}
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
