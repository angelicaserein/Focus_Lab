import React, { useEffect, useMemo, useRef, useState } from "react";
import usePrefs from "@/hooks/common/usePrefs";
import { useLanguage } from "@/context/LanguageContext";
import desktop, { isDesktop } from "@/utils/desktop/desktopBridge";

// 分心水位的设置：勾出「专注时算数的程序」。
// 只在桌面版出现——网页版拿不到前台窗口，这一整块都没有意义。
//
// 这张表不让用户自己填。「Word 的进程名叫 WINWORD」这种知识不该由用户来提供，
// 所以列表是探测器自己攒的：你专注时用过什么，它就出现在这里，勾一下即可。
// 代价是首次使用时表是空的，得先跑一次专注让它见见世面（下面的 empty 文案说明了这点）。
//
// 第二张表是标题关键词。浏览器是个特例：查论文和刷视频是同一个 msedge.exe，
// 勾或不勾都不对——勾了就整天摸鱼免罚，不勾就没法查资料。所以额外给一层，
// 让窗口标题（就是当前标签页的标题）里出现某些词时照样算分心。

// 关键词这东西第一次面对空输入框是想不出来的，给几个最常见的一键加上。
// 只是起点，不是内置黑名单——加完就是普通的一条，可以随手删掉。
const SUGGESTIONS = ["youtube", "bilibili", "抖音", "小红书", "微博", "知乎", "淘宝", "twitch"];

export default function AppWatchSection() {
  const { appWatch, setAppWatch } = usePrefs();
  const { t } = useLanguage();
  const [seen, setSeen] = useState([]);
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);
  // 探测器是 Windows-only（见 appWatch.cjs：靠 PowerShell P/Invoke user32）。
  // 但 mac / Linux 照样在打包发布，之前这一整块在那些平台上照常渲染——
  // 用户勾了一堆程序、开关也亮着，实际什么都不会发生。null=还没问到，先不画。
  const [supported, setSupported] = useState(null);

  useEffect(() => {
    if (!isDesktop) return undefined;
    // 主进程缓存了一份，重进设置页不必等到下次切窗口才有内容
    desktop.hello().then((r) => {
      if (Array.isArray(r?.apps)) setSeen(r.apps);
      setSupported(!!r?.watchSupported);
    }).catch(() => setSupported(true)); // 握手本身失败是另一回事，别顺手把功能藏了
    return desktop.onAppsSeen((list) => setSeen(Array.isArray(list) ? list : []));
  }, []);

  // 勾过的程序即使这次没见到也要列出来，否则「我明明勾了 Word」会凭空消失
  const rows = useMemo(() => {
    const byName = new Map(seen.map((a) => [a.name, a]));
    for (const name of appWatch.allow) {
      if (!byName.has(name)) byName.set(name, { name, label: name });
    }
    return [...byName.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [seen, appWatch.allow]);

  if (!isDesktop || !supported) return null;

  const setEnabled = (enabled) => setAppWatch({ ...appWatch, enabled });
  const toggleApp = (name) => setAppWatch({
    ...appWatch,
    allow: appWatch.allow.includes(name)
      ? appWatch.allow.filter((n) => n !== name)
      : [...appWatch.allow, name],
  });

  // 统一转小写存：主进程比对时标题也是转小写的，这边先归一化，去重才准
  const addWord = (raw) => {
    const word = String(raw).trim().toLowerCase();
    setDraft("");
    if (!word || appWatch.deny.includes(word)) return;
    setAppWatch({ ...appWatch, deny: [...appWatch.deny, word] });
  };
  const removeWord = (word) => setAppWatch({
    ...appWatch,
    deny: appWatch.deny.filter((w) => w !== word),
  });

  return (
    <div className="settings-section">
      <div className="settings-section-title">{t("settings.watch.title")}</div>
      <p className="settings-section-hint">{t("settings.watch.hint")}</p>

      <div className="settings-pref-row">
        <span className="settings-pref-label">{t("settings.watch.enable")}</span>
        <button
          className={`settings-toggle-btn${appWatch.enabled ? " active" : ""}`}
          onClick={() => setEnabled(!appWatch.enabled)}
          aria-pressed={appWatch.enabled}
        >
          <span className="settings-toggle-track">
            <span className="settings-toggle-thumb" />
          </span>
          {appWatch.enabled ? t("settings.prefs.on") : t("settings.prefs.off")}
        </button>
      </div>
      <p className="settings-section-hint">{t("settings.watch.privacy")}</p>

      {appWatch.enabled && (
        <>
          <div className="settings-pref-row settings-pref-row-block">
            <span className="settings-pref-label">{t("settings.watch.allowLabel")}</span>
            {rows.length === 0 ? (
              <p className="settings-section-hint">{t("settings.watch.empty")}</p>
            ) : (
              <div className="settings-app-list">
                {rows.map((a) => {
                  const on = appWatch.allow.includes(a.name);
                  return (
                    <button
                      type="button"
                      key={a.name}
                      className={`settings-app${on ? " is-on" : ""}`}
                      aria-pressed={on}
                      onClick={() => toggleApp(a.name)}
                    >
                      <span className="settings-app-check" aria-hidden="true" />
                      <span className="settings-app-name">{a.label}</span>
                      <span className="settings-app-proc">{a.name}.exe</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {/* 一个都没勾等于「什么都算分心」，那只会让水一直涨。主进程也按这个约定
              直接把功能视作关闭，这里把原因说出来，免得用户以为是坏了。 */}
          {appWatch.allow.length === 0 && rows.length > 0 && (
            <p className="settings-section-hint">{t("settings.watch.needOne")}</p>
          )}

          {/* 标题关键词。一个都没勾时这块不显示——白名单是空的，判定本来就不工作。 */}
          {appWatch.allow.length > 0 && (
            <div className="settings-pref-row settings-pref-row-block">
              <span className="settings-pref-label">{t("settings.watch.denyLabel")}</span>
              <p className="settings-section-hint">{t("settings.watch.denyHint")}</p>

              {/* 回车也能提交、加完焦点留在输入框：一次想加好几个词时手不用离开键盘 */}
              <div className="settings-word-input">
                <input
                  ref={inputRef}
                  type="text"
                  value={draft}
                  placeholder={t("settings.watch.denyPlaceholder")}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addWord(draft); } }}
                />
                <button type="button" onClick={() => { addWord(draft); inputRef.current?.focus(); }}>
                  {t("settings.watch.denyAdd")}
                </button>
              </div>

              {appWatch.deny.length > 0 && (
                <div className="settings-word-list">
                  {appWatch.deny.map((w) => (
                    <button
                      type="button"
                      key={w}
                      className="settings-word is-on"
                      onClick={() => removeWord(w)}
                      aria-label={`${t("settings.watch.denyRemove")} ${w}`}
                    >
                      {w}
                      <span className="settings-word-x" aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>
              )}

              {SUGGESTIONS.some((w) => !appWatch.deny.includes(w)) && (
                <div className="settings-word-list">
                  {SUGGESTIONS.filter((w) => !appWatch.deny.includes(w)).map((w) => (
                    <button type="button" key={w} className="settings-word" onClick={() => addWord(w)}>
                      <span className="settings-word-x" aria-hidden="true">+</span>
                      {w}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
