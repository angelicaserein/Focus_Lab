import React from "react";
import { useReward, SHOP_ITEMS } from "@/context/RewardContext";
import { SHOP_CATEGORIES } from "@/utils/shopConfig";
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

  const { toast, showToast } = useToast();
  const onPurchased = (item) =>
    showToast({ message: `${item.name} 兑换成功！`, icon: item.icon });

  const { form, setField, editingId, startEdit, cancelEdit, handleSubmit, canSubmit } =
    useCustomItemForm({ addCustomItem, updateCustomItem, showToast });

  const debug = useCoinsDebug({ coins, setCoinsTo, showToast });

  return (
    <div className="page-reward">
      <div className="reward-headline">
        <h1>奖励</h1>
        {DEBUG_ENABLED && (
          <button
            type="button"
            className="reward-debug-btn"
            title="调试：修改金币"
            aria-label="调试：修改金币"
            onClick={debug.openDebug}
          >
            🛠️ 调试
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
        <div className="reward-asset-label">我的资产</div>
        <div className="reward-asset-value">
          <span className="reward-coin-icon">🪙</span>
          <span className="reward-coin-num">{coins}</span>
          <span className="reward-coin-unit">金币</span>
        </div>
        <div className="reward-asset-hint">完成专注任务即可赚取金币（1 秒 = 1 枚）</div>
      </div>

      {/* 开发者商城 */}
      <div className="reward-section">
        <div className="reward-shop-header">
          <div>
            <div className="reward-section-title">开发者商城</div>
            <div className="reward-shop-header-sub">
              用金币解锁皮肤，或兑换犒劳自己的小奖励
            </div>
          </div>
          <span className="reward-shop-header-count">{SHOP_ITEMS.length} 件好物</span>
        </div>

        {SHOP_CATEGORIES.map((cat) => {
          const items = SHOP_ITEMS.filter((it) => it.tag === cat.tag);
          if (items.length === 0) return null;
          return (
            <div key={cat.tag} className="shop-group">
              <div className="shop-group-title">
                <span className="shop-group-icon">{cat.icon}</span>
                {cat.label}
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
          {editingId ? "编辑自定义商品" : "我的自定义"}
        </div>

        <form className="reward-custom-form" onSubmit={handleSubmit}>
          <EmojiPicker value={form.icon} onChange={(icon) => setField({ icon })} />
          <input
            className="reward-custom-input reward-custom-name"
            value={form.name}
            placeholder="商品名称"
            aria-label="商品名称"
            onChange={(e) => setField({ name: e.target.value })}
          />
          <input
            className="reward-custom-input reward-custom-price"
            type="number"
            min="1"
            value={form.price}
            placeholder="花费"
            aria-label="花费金币"
            onChange={(e) => setField({ price: e.target.value })}
          />
          <input
            className="reward-custom-input reward-custom-desc"
            value={form.desc}
            placeholder="描述（可选）"
            aria-label="描述"
            onChange={(e) => setField({ desc: e.target.value })}
          />
          <button className="reward-custom-add" type="submit" disabled={!canSubmit}>
            {editingId ? "保存" : "添加"}
          </button>
          {editingId && (
            <button
              type="button"
              className="reward-custom-cancel"
              onClick={cancelEdit}
            >
              取消
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
            还没有自定义商品，添加一个奖励犒劳自己吧 ✨
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
