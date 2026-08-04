import React, { useEffect, useMemo, useState } from "react";
import usePrefs from "@/hooks/common/usePrefs";
import { useLanguage } from "@/context/LanguageContext";
import desktop, { isDesktop } from "@/utils/desktop/desktopBridge";

// 分心水位的设置：勾出「专注时算数的程序」。
// 只在桌面版出现——网页版拿不到前台窗口，这一整块都没有意义。
//
// 这张表不让用户自己填。「Word 的进程名叫 WINWORD」这种知识不该由用户来提供，
// 所以列表是探测器自己攒的：你专注时用过什么，它就出现在这里，勾一下即可。
// 代价是首次使用时表是空的，得先跑一次专注让它见见世面（下面的 empty 文案说明了这点）。

export default function AppWatchSection() {
  const { appWatch, setAppWatch } = usePrefs();
  const { t } = useLanguage();
  const [seen, setSeen] = useState([]);

  useEffect(() => {
    if (!isDesktop) return undefined;
    // 主进程缓存了一份，重进设置页不必等到下次切窗口才有内容
    desktop.hello().then((r) => { if (Array.isArray(r?.apps)) setSeen(r.apps); });
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

  if (!isDesktop) return null;

  const setEnabled = (enabled) => setAppWatch({ ...appWatch, enabled });
  const toggleApp = (name) => setAppWatch({
    ...appWatch,
    allow: appWatch.allow.includes(name)
      ? appWatch.allow.filter((n) => n !== name)
      : [...appWatch.allow, name],
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
        </>
      )}
    </div>
  );
}
