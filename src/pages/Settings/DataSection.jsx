import React, { useRef, useState } from "react";
import { exportAllData, importAllData, freezeWrites, KEY_MAP } from "@/utils/storage/storage";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import { useLanguage } from "@/context/LanguageContext";

// 纳入用量统计的存储项；label 在渲染时按 settings.data.label.{name} 翻译。
const STORAGE_NAMES = ["todos", "scenarios", "focusRecords", "notes", "distractions", "chatHistory"];

function getStorageInfo() {
  let totalBytes = 0;
  const items = [];
  for (const [name, { key }] of Object.entries(KEY_MAP)) {
    if (!STORAGE_NAMES.includes(name)) continue;
    const raw = localStorage.getItem(key) ?? "";
    const bytes = new Blob([raw]).size;
    totalBytes += bytes;
    let count = null;
    try {
      const p = JSON.parse(raw);
      const arr = p?.data ?? p;
      if (Array.isArray(arr)) count = arr.length;
    } catch { /* ignore */ }
    items.push({ name, bytes, count });
  }
  return { totalKB: (totalBytes / 1024).toFixed(1), items };
}

export default function DataSection() {
  const { t } = useLanguage();
  const fileInputRef = useRef(null);
  const [importMsg, setImportMsg] = useState(null);
  const [replaceOnImport, setReplaceOnImport] = useState(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [confirmClearChat, setConfirmClearChat] = useState(false);

  const handleExport = () => exportAllData();

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = importAllData(evt.target.result, replaceOnImport ? "replace" : "merge");
      if (result.success) {
        setImportMsg({ type: "success", text: t("settings.data.importSuccess", { count: result.keys.length }) });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setImportMsg({ type: "error", text: t("settings.data.importError", { error: result.error }) });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleClearHistory = () => {
    if (confirmClearHistory) {
      // 先落闸：不然 reload 的 pagehide 会让 FocusContext 把刚删掉的记录写回来，
      // 页面刷完历史还在（见 storage.js 的「写入闸门」）。
      freezeWrites();
      localStorage.removeItem(STORAGE_KEYS.FOCUS_RECORDS);
      window.location.reload();
    } else {
      setConfirmClearHistory(true);
    }
  };

  const handleClearChat = () => {
    if (confirmClearChat) {
      freezeWrites(); // 同上：不落闸的话，聊天记录会在 reload 时被内存里那份写回来
      localStorage.removeItem(STORAGE_KEYS.CHAT);
      window.location.reload();
    } else {
      setConfirmClearChat(true);
    }
  };

  const storageInfo = getStorageInfo();

  return (
    <div className="settings-section">
      <div className="settings-section-title">{t("settings.data.title")}</div>
      <p className="settings-section-hint">{t("settings.data.hint")}</p>

      <div className="settings-storage-info">
        <div className="settings-storage-total">{t("settings.data.usage", { kb: storageInfo.totalKB })}</div>
        <div className="settings-storage-breakdown">
          {storageInfo.items.map((item) => {
            const label = t(`settings.data.label.${item.name}`);
            return (
              <span key={item.name} className="settings-storage-item">
                {item.count !== null ? t("settings.data.count", { label, count: item.count }) : label}
              </span>
            );
          })}
        </div>
      </div>

      <div className="settings-data-actions">
        <button className="settings-data-btn" onClick={handleExport}>
          {t("settings.data.export")}
        </button>
        <button className="settings-data-btn" onClick={handleImportClick}>
          {t("settings.data.import")}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>

      <label className="settings-import-mode">
        <input
          type="checkbox"
          checked={replaceOnImport}
          onChange={(e) => setReplaceOnImport(e.target.checked)}
        />
        <span>{t("settings.data.importReplace")}</span>
      </label>
      <p className="settings-section-hint">
        {t(replaceOnImport ? "settings.data.importReplaceHint" : "settings.data.importMergeHint")}
      </p>

      {importMsg && (
        <div className={`settings-import-msg ${importMsg.type}`}>
          {importMsg.text}
        </div>
      )}

      <div className="settings-danger-zone">
        <div className="settings-danger-title">{t("settings.data.dangerTitle")}</div>
        <div className="settings-data-actions">
          {confirmClearHistory ? (
            <>
              <button className="settings-data-btn danger confirm" onClick={handleClearHistory}>
                {t("settings.data.confirmClear")}
              </button>
              <button className="settings-data-btn" onClick={() => setConfirmClearHistory(false)}>
                {t("settings.data.cancel")}
              </button>
            </>
          ) : (
            <button className="settings-data-btn danger" onClick={handleClearHistory}>
              {t("settings.data.clearFocus")}
            </button>
          )}
          {confirmClearChat ? (
            <>
              <button className="settings-data-btn danger confirm" onClick={handleClearChat}>
                {t("settings.data.confirmClear")}
              </button>
              <button className="settings-data-btn" onClick={() => setConfirmClearChat(false)}>
                {t("settings.data.cancel")}
              </button>
            </>
          ) : (
            <button className="settings-data-btn danger" onClick={handleClearChat}>
              {t("settings.data.clearChat")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
