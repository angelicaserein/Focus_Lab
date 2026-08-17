// 自动更新。
//
// 网页版改一版、刷新就是新的；装在硬盘上的 exe 不会自己变。这里让它去
// GitHub Releases 上看一眼有没有新版，有就后台下载，等下次退出时装上。
//
// 三条克制的规矩（这个 app 的用户可能正跑着一次专注）：
//   1. 绝不主动重启。下载完只是备好，安装发生在用户自己退出之后
//      （autoInstallOnAppQuit 默认就是这个行为）。中途弹一个「立即重启」
//      会直接把正在计时的会话打断——那是这个 app 最不该做的事。
//   2. 失败一律静默。墙内从 GitHub 拉东西失败是常态，弹一个红框告诉用户
//      「更新检查失败」既没有可操作性，也只是在打扰。手动检查时才回话。
//   3. 只在打包后的正式版里跑。dev 下 electron-updater 会因为没有
//      app-update.yml 直接抛错。
//
// 安装包没有代码签名，Windows 上更新后的首次启动可能仍会过一次 SmartScreen。
// 这是签名证书的事，不是这里能解决的。

const { app, Notification } = require("electron");

let updater = null;      // 懒加载：dev 下根本不该把这个模块拉进来
let checking = false;    // 手动检查时防连点
let downloaded = false;

function notify(title, body) {
  if (!Notification.isSupported()) return;
  new Notification({ title, body }).show();
}

// 只在真的要用时才 require：electron-updater 导入时就会去读打包进来的
// app-update.yml，dev 下没有那个文件。
function load() {
  if (updater) return updater;
  const { autoUpdater } = require("electron-updater");
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  // 日志走 console：出问题时至少在终端 / 崩溃日志里留得下痕迹
  autoUpdater.logger = { info: console.log, warn: console.warn, error: console.error, debug: () => {} };
  autoUpdater.on("update-downloaded", (info) => {
    downloaded = true;
    notify("Focus Lab 已备好更新", `${info?.version ?? "新版本"} 会在下次退出后自动装上。`);
  });
  updater = autoUpdater;
  return updater;
}

// 启动后台检查。静默：查不到、下不动都不吭声。
function checkOnStartup() {
  if (!app.isPackaged) return;
  try {
    load().checkForUpdates().catch(() => {});
  } catch {
    /* 没有 app-update.yml（非 electron-builder 产物）之类，直接放弃 */
  }
}

// 托盘菜单里的「检查更新」。这一路是用户主动问的，所以每种结果都要回话。
async function checkNow() {
  if (!app.isPackaged) {
    notify("Focus Lab", "开发模式下不检查更新。");
    return;
  }
  if (downloaded) {
    notify("Focus Lab", "更新已经下载好了，下次退出后自动装上。");
    return;
  }
  if (checking) return;
  checking = true;
  try {
    const r = await load().checkForUpdates();
    // updateInfo.version 和当前版本一样 = 已经是最新的
    if (!r || r.updateInfo?.version === app.getVersion()) {
      notify("Focus Lab", `已经是最新版本（${app.getVersion()}）。`);
    } else {
      notify("Focus Lab", `正在后台下载 ${r.updateInfo.version}，装好后会再告诉你。`);
    }
  } catch {
    notify("Focus Lab", "没连上更新服务器，稍后再试。");
  } finally {
    checking = false;
  }
}

module.exports = { checkOnStartup, checkNow };
