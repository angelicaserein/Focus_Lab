import React, { useState, useEffect } from "react";
import { useReward, SHOP_ITEMS } from "../../context/RewardContext";
import EmojiPicker from "../../components/EmojiPicker";
import "./Reward.css";

const EMPTY_FORM = { name: "", icon: "🎁", price: "", desc: "" };

export default function RewardPage() {
  const {
    coins,
    buyItem,
    isOwned,
    getRedeemCount,
    customItems,
    addCustomItem,
    updateCustomItem,
    removeCustomItem,
  } = useReward();
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(id);
  }, [toast]);

  // 渲染单张商品卡。actions 仅自定义商品传入（编辑 / 删除）。
  const renderCard = (item, actions) => {
    const owned = item.type === "unlock" && isOwned(item.id);
    const count = item.type === "consumable" ? getRedeemCount(item.id) : 0;
    const affordable = coins >= item.price;
    const disabled = owned || !affordable;

    let btnLabel = "兑换";
    if (owned) btnLabel = "已拥有 ✓";
    else if (!affordable) btnLabel = "金币不足";

    return (
      <div key={item.id} className="reward-shop-card">
        {count > 0 && <span className="reward-shop-badge">已兑换 ×{count}</span>}
        {actions && (
          <div className="reward-shop-actions">
            <button
              className="reward-shop-action"
              title="编辑"
              aria-label={`编辑 ${item.name}`}
              onClick={() => actions.onEdit(item)}
            >
              ✏️
            </button>
            <button
              className="reward-shop-action"
              title="删除"
              aria-label={`删除 ${item.name}`}
              onClick={() => actions.onDelete(item.id)}
            >
              🗑️
            </button>
          </div>
        )}
        <div className="reward-shop-icon">{item.icon}</div>
        <div className="reward-shop-name">{item.name}</div>
        <div className="reward-shop-desc">{item.desc}</div>
        <div className="reward-shop-footer">
          <span className="reward-shop-price">🪙 {item.price}</span>
          <button
            className={`reward-buy-btn ${owned ? "owned" : ""}`}
            disabled={disabled}
            onClick={() => {
              const ok = buyItem(item);
              if (ok) setToast({ message: `${item.name} 兑换成功！`, icon: item.icon });
            }}
          >
            {btnLabel}
          </button>
        </div>
      </div>
    );
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      icon: item.icon,
      price: String(item.price),
      desc: item.desc ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingId) {
      const ok = updateCustomItem(editingId, form);
      if (ok) {
        cancelEdit();
        setToast({ message: "已保存修改", icon: "✅" });
      }
    } else {
      const ok = addCustomItem(form);
      if (ok) {
        setForm(EMPTY_FORM);
        setToast({ message: "已添加到我的自定义", icon: "✨" });
      }
    }
  };

  const canSubmit = form.name.trim() && Number(form.price) > 0;

  return (
    <div className="page-reward">
      <div className="reward-headline">
        <h1>奖励</h1>
      </div>

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
        <div className="reward-section-title">开发者商城</div>
        <div className="reward-shop-grid">
          {SHOP_ITEMS.map((item) => renderCard(item))}
        </div>
      </div>

      {/* 我的自定义 */}
      <div className="reward-section">
        <div className="reward-section-title">
          {editingId ? "编辑自定义商品" : "我的自定义"}
        </div>

        <form className="reward-custom-form" onSubmit={handleSubmit}>
          <EmojiPicker
            value={form.icon}
            onChange={(icon) => setForm((f) => ({ ...f, icon }))}
          />
          <input
            className="reward-custom-input reward-custom-name"
            value={form.name}
            placeholder="商品名称"
            aria-label="商品名称"
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            className="reward-custom-input reward-custom-price"
            type="number"
            min="1"
            value={form.price}
            placeholder="花费"
            aria-label="花费金币"
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          />
          <input
            className="reward-custom-input reward-custom-desc"
            value={form.desc}
            placeholder="描述（可选）"
            aria-label="描述"
            onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
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
            {customItems.map((item) =>
              renderCard(item, { onEdit: startEdit, onDelete: removeCustomItem })
            )}
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
