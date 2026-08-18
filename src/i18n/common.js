// 跨页面复用的通用文案：确认弹窗按钮、空状态等。
// 只放真正到处都用得上的；只有一页用到的仍归各自命名空间。
export default {
  "common.confirm": { en: "Confirm", zh: "确认" },
  "common.cancel": { en: "Cancel", zh: "取消" },
  "common.delete": { en: "Delete", zh: "删除" },
  "common.today": { en: "Today", zh: "今天" },
  "common.error": { en: "Something went wrong — please refresh", zh: "出错了，请刷新页面" },
  "common.refresh": { en: "Refresh", zh: "刷新" },
  "common.loading": { en: "Loading", zh: "加载中" },
  "common.loadingEllipsis": { en: "Loading…", zh: "加载中…" },
  "common.close": { en: "Close", zh: "关闭" },

  // localStorage 写满的警报条（StorageQuotaBanner）。措辞的重点是「数据没保存」，
  // 不是「空间不足」——用户需要知道的是后果，不是原因。
  "storage.quota.title": { en: "Your data is no longer being saved", zh: "数据已经存不进去了" },
  "storage.quota.detail": {
    en: "Local storage is full. Anything you do now lives only in this tab and will be lost when you close it. Export a backup, then clear old records in Settings › Data.",
    zh: "本地存储已满。现在做的任何改动只存在当前页面里，关掉就没了。请先导出备份，再到「设置 › 数据」清理旧记录。",
  },
  "storage.quota.export": { en: "Export backup", zh: "导出备份" },
};
