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
let loadFailed = false;  // require 挂了：跟「网络不通」是两回事，回话要分开
let downloaded = false;

function notify(title, body) {
  if (!Notification.isSupported()) return;
  new Notification({ title, body }).show();
}

// 只在真的要用时才 require：electron-updater 导入时就会去读打包进来的
// app-update.yml，dev 下没有那个文件。
//
// 加载失败要吼一声，这是这个文件里唯一不静默的地方。
// electron-updater 是主进程运行时 require 的，得靠 electron-builder.yml 里那份
// 手写的 files 清单把它和它的十来个依赖一起打进包——漏一个，正式版里
// 自动更新就是死的，而用户侧一点动静都没有（检查是静默的、失败也是静默的）。
// 正好是最该在日志里留痕的那类故障：不留痕就永远不会有人发现。
function load() {
  if (updater) return updater;
  // 已经失败过就直接认输：那行日志说清楚一次就够了，托盘每点一次刷一遍只是噪音
  if (loadFailed) throw new Error("electron-updater 不在这个安装包里");
  let mod;
  try {
    mod = require("electron-updater");
  } catch (e) {
    loadFailed = true;
    console.error([
      "[updater] 加载 electron-updater 失败——这个安装包里的自动更新是死的。",
      `  原因：${e?.message ?? e}`,
      "  多半是打包时漏带了它或它的某个依赖：见 electron-builder.yml 的 files 清单。",
      "  核对：node node_modules/@electron/asar/bin/asar.js list release/win-unpacked/resources/app.asar",
    ].join("\n"));
    throw e;
  }
  const { autoUpdater } = mod;
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
    // load() 挂掉和「查不到服务器」要分开说：前者是这个安装包本身缺东西，
    // 重试多少次都一样，把用户往「稍后再试」上引是骗人。
    let u;
    try {
      u = load();
    } catch {
      notify("Focus Lab", "这个安装包里没带更新组件，自动更新不可用（详见日志）。");
      return;
    }
    const r = await u.checkForUpdates();
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
