// 跨页面复用的通用文案：确认弹窗按钮、空状态等。
// 只放真正到处都用得上的；只有一页用到的仍归各自命名空间。
export default {
  "common.confirm": { en: "Confirm", zh: "确认" },
  "common.cancel": { en: "Cancel", zh: "取消" },
  "common.delete": { en: "Delete", zh: "删除" },
  "common.today": { en: "Today", zh: "今天" },
  "common.error": { en: "Something went wrong — please refresh", zh: "出错了，请刷新页面" },
  "common.refresh": { en: "Refresh", zh: "刷新" },
  // 页面崩了那一屏。用户此刻最担心的是「我的东西是不是没了」，所以先回答这句；
  // 出错的是哪一页也要说出来，否则不知道该绕开什么。
  "common.errorOn": { en: "“{page}” failed to render", zh: "「{page}」这一页没能显示出来" },
  "common.errorDataSafe": {
    en: "Your data is still saved on this device — refreshing won't lose anything.",
    zh: "你的数据都还在本机存着，刷新不会丢。",
  },
  "common.goHome": { en: "Back to home", zh: "回到主页" },
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

  // AI 调用失败的四种归因。每条都要能直接读出「那我该干什么」，
  // 所以不写「请求失败(500)」这类只报现象的话。
  "common.aiError.auth": {
    en: "AI key isn't working — check it in Settings",
    zh: "AI 密钥用不了，去设置里检查一下",
  },
  "common.aiError.rate": {
    en: "Too many requests just now — try again in a moment",
    zh: "请求太频繁了，等一会儿再试",
  },
  "common.aiError.server": {
    en: "The AI service is having trouble — not your side. Try again later",
    zh: "AI 服务那边出问题了，不是你的问题，晚点再试",
  },
  "common.aiError.network": {
    en: "Can't reach the server — check your network",
    zh: "连不上服务器，检查一下网络",
  },
  "common.aiError.unknown": {
    en: "The AI call didn't go through — try again",
    zh: "这次 AI 没调通，再试一次",
  },
  // AI 连不上时给的那句离线示例，必须标出来：让人以为伙伴真这么回答，
  // 比直接报错更糟——它污染的是「AI 到底可不可信」这个判断。
  "common.aiDegraded": {
    en: "AI offline · sample reply",
    zh: "AI 未连上 · 这是示例回复",
  },
};
