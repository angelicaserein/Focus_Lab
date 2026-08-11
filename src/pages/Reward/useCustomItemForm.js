import { useState } from "react";

const EMPTY_FORM = { name: "", icon: "🎁", price: "", desc: "" };

// 表单是否可提交：名称非空且花费为正数。
export function isValidItemForm(form) {
  return Boolean(form.name.trim()) && Number(form.price) > 0;
}

// 把商品映射成表单字段（价格转字符串以填入 number input，desc 兜底空串）。
export function itemToForm(item) {
  return {
    name: item.name,
    icon: item.icon,
    price: String(item.price),
    desc: item.desc ?? "",
  };
}

// 管理「我的自定义」商品表单：新增 / 编辑同用一套字段与提交逻辑。
// 依赖注入 addCustomItem / updateCustomItem（来自 RewardContext）、showToast（提示反馈）与 t（文案）。
export default function useCustomItemForm({ addCustomItem, updateCustomItem, showToast, t }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const setField = (patch) => setForm((f) => ({ ...f, ...patch }));

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm(itemToForm(item));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingId) {
      if (updateCustomItem(editingId, form)) {
        cancelEdit();
        showToast({ message: t("reward.custom.saved"), icon: "✅" });
      }
    } else if (addCustomItem(form)) {
      setForm(EMPTY_FORM);
      showToast({ message: t("reward.custom.added"), icon: "✨" });
    }
  };

  const canSubmit = isValidItemForm(form);

  return { form, setField, editingId, startEdit, cancelEdit, handleSubmit, canSubmit };
}
