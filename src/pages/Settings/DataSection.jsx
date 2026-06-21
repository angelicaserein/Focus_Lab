import React, { useRef, useState } from "react";
import { exportAllData, importAllData, KEY_MAP } from "../../utils/storage";
import { STORAGE_KEYS } from "../../utils/storageKeys";

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

export default function DataSection() {
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
      localStorage.removeItem(STORAGE_KEYS.FOCUS_RECORDS);
      window.location.reload();
    } else {
      setConfirmClearHistory(true);
    }
  };

  const handleClearChat = () => {
    if (confirmClearChat) {
      localStorage.removeItem(STORAGE_KEYS.CHAT);
      window.location.reload();
    } else {
      setConfirmClearChat(true);
    }
  };

  const storageInfo = getStorageInfo();

  return (
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
          {confirmClearHistory ? (
            <>
              <button className="settings-data-btn danger confirm" onClick={handleClearHistory}>
                确认清除
              </button>
              <button className="settings-data-btn" onClick={() => setConfirmClearHistory(false)}>
                取消
              </button>
            </>
          ) : (
            <button className="settings-data-btn danger" onClick={handleClearHistory}>
              清除专注记录
            </button>
          )}
          {confirmClearChat ? (
            <>
              <button className="settings-data-btn danger confirm" onClick={handleClearChat}>
                确认清除
              </button>
              <button className="settings-data-btn" onClick={() => setConfirmClearChat(false)}>
                取消
              </button>
            </>
          ) : (
            <button className="settings-data-btn danger" onClick={handleClearChat}>
              清除聊天记录
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
