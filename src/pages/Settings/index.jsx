import React, { useRef, useState } from "react";
import { useReward, SHOP_ITEMS } from "../../context/RewardContext";
import { exportAllData, importAllData, KEY_MAP } from "../../utils/storage";
import "./Settings.css";

const THEME_OPTIONS = [
  { id: "default", name: "默认", icon: "🎨", desc: "原始紫色调" },
  ...SHOP_ITEMS.filter((i) => i.id.startsWith("theme-")),
];

const STORAGE_LABELS = {
  todos:        "待办",
  scenarios:    "情境",
  focusRecords: "专注记录",
  notes:        "随记",
  distractions: "分心",
  chatHistory:  "聊天",
};

function getStorageInfo() {
  let totalBytes = 0;
  const items = [];
  for (const [name, { key }] of Object.entries(KEY_MAP)) {
    if (!(name in STORAGE_LABELS)) continue;
    const raw = localStorage.getItem(key) ?? "";
    const bytes = new Blob([raw]).size;
    totalBytes += bytes;
    let count = null;
    try {
      const p = JSON.parse(raw);
      const arr = p?.data ?? p;
      if (Array.isArray(arr)) count = arr.length;
    } catch { /* ignore */ }
    items.push({ label: STORAGE_LABELS[name], bytes, count });
  }
  return { totalKB: (totalBytes / 1024).toFixed(1), items };
}

export default function SettingsPage() {
  const { isOwned, activeTheme, setTheme } = useReward();
  const fileInputRef = useRef(null);
  const [importMsg, setImportMsg] = useState(null);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [confirmClearChat, setConfirmClearChat] = useState(false);

  const handleExport = () => exportAllData();

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = importAllData(evt.target.result);
      if (result.success) {
        setImportMsg({ type: "success", text: `已成功导入 ${result.keys.length} 项数据，即将重新加载…` });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setImportMsg({ type: "error", text: `导入失败：${result.error}` });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleClearHistory = () => {
    if (confirmClearHistory) {
      localStorage.removeItem("focus_records_v1");
      window.location.reload();
    } else {
      setConfirmClearHistory(true);
      setTimeout(() => setConfirmClearHistory(false), 3000);
    }
  };

  const handleClearChat = () => {
    if (confirmClearChat) {
      localStorage.removeItem("focus_chat_v1");
      window.location.reload();
    } else {
      setConfirmClearChat(true);
      setTimeout(() => setConfirmClearChat(false), 3000);
    }
  };

  const storageInfo = getStorageInfo();

  return (
    <div className="page-settings">
      <div className="settings-headline">
        <h1>设置</h1>
      </div>

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

      <div className="settings-section">
        <div className="settings-section-title">数据管理</div>
        <p className="settings-section-hint">
          所有数据保存在本地浏览器中。清除浏览器缓存前请先导出备份。
        </p>

        <div className="settings-storage-info">
          <div className="settings-storage-total">占用空间：约 {storageInfo.totalKB} KB</div>
          <div className="settings-storage-breakdown">
            {storageInfo.items.map((item) => (
              <span key={item.label} className="settings-storage-item">
                {item.label}{item.count !== null ? `（${item.count}条）` : ""}
              </span>
            ))}
          </div>
        </div>

        <div className="settings-data-actions">
          <button className="settings-data-btn" onClick={handleExport}>
            导出数据
          </button>
          <button className="settings-data-btn" onClick={handleImportClick}>
            导入数据
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </div>

        {importMsg && (
          <div className={`settings-import-msg ${importMsg.type}`}>
            {importMsg.text}
          </div>
        )}

        <div className="settings-danger-zone">
          <div className="settings-danger-title">危险操作</div>
          <div className="settings-data-actions">
            <button
              className={`settings-data-btn danger${confirmClearHistory ? " confirm" : ""}`}
              onClick={handleClearHistory}
            >
              {confirmClearHistory ? "确认清除？" : "清除专注记录"}
            </button>
            <button
              className={`settings-data-btn danger${confirmClearChat ? " confirm" : ""}`}
              onClick={handleClearChat}
            >
              {confirmClearChat ? "确认清除？" : "清除聊天记录"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
