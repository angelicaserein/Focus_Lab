import React, { useMemo } from "react";
import { RotateCcw, ToggleLeft } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useFeatures } from "@/context/FeatureContext";
import {
  FUNCTION_BRANCHES,
  TOGGLEABLE_PATHS,
  featureKey,
  featureKeys,
} from "./functionTreeData";
import "./FunctionTree.css";

// 功能树：一棵「设置」形态的树，每个叶子节点都是一个功能开关。
// 点一下关掉该功能（它会从侧边栏消失、直接访问其路由会被弹回主页），再点一下打开——随时可逆。
// 关掉功能只影响导航可见性与可达性，不删除任何数据。核心功能（主页/设置/功能树）不在此列。
//
// 带 children 的节点是「组」（如情境功能）：组开关是一族功能的总闸，关掉它组内全部隐去，
// 子开关随之停用但仍照原样显示自己的记忆，重开组即恢复——不让用户丢失已调好的搭配。

// 一个开关按钮。组节点与叶子节点共用，差别只在 sub / 是否停用。
function FeatureSwitch({ feature, on, disabled = false, sub = false, onToggle, t }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      className={`ft-node${on ? " on" : " off"}${sub ? " ft-node-sub" : ""}`}
      onClick={onToggle}
      aria-label={`${t(feature.labelKey)} — ${t(on ? "functiontree.on" : "functiontree.off")}`}
    >
      <span className="ft-node-icon" aria-hidden="true">{feature.icon}</span>
      <span className="ft-node-label">{t(feature.labelKey)}</span>
      <span className="ft-switch" aria-hidden="true">
        <span className="ft-switch-knob" />
      </span>
    </button>
  );
}

export default function FunctionTreePage() {
  const { t } = useLanguage();
  const { isEnabled, isSelfEnabled, toggle, enableAll } = useFeatures();

  const onCount = useMemo(
    () => TOGGLEABLE_PATHS.filter((p) => isEnabled(p)).length,
    [isEnabled],
  );
  const total = TOGGLEABLE_PATHS.length;
  const allOn = onCount === total;

  return (
    <div className="page-ftree">
      <div className="ft-headline">
        <h1>{t("functiontree.title")}</h1>
        <div className="ft-bar">
          <span className="ft-summary">
            {t("functiontree.summary", { on: onCount, total })}
          </span>
          <button
            type="button"
            className="ft-reset"
            onClick={enableAll}
            disabled={allOn}
          >
            <RotateCcw size={14} aria-hidden="true" />
            {t("functiontree.enableAll")}
          </button>
        </div>
      </div>

      <p className="ft-hint">
        <ToggleLeft size={15} aria-hidden="true" className="ft-hint-icon" />
        {t("functiontree.hint")}
      </p>

      <div className="ft-branches">
        {FUNCTION_BRANCHES.map((branch) => {
          const branchKeys = branch.features.flatMap(featureKeys);
          const branchOn = branchKeys.filter((k) => isEnabled(k)).length;
          return (
            <div
              key={branch.id}
              className="ft-branch"
              style={{ "--branch": branch.color }}
            >
              <div className="ft-hub">
                <span className="ft-hub-title">{t(`nav.section.${branch.id}`)}</span>
                <span className="ft-hub-count">
                  {branchOn}/{branchKeys.length}
                </span>
              </div>

              <div className="ft-nodes">
                {branch.features.map((f) => {
                  const key = featureKey(f);
                  const on = isEnabled(key);

                  if (!f.children) {
                    return (
                      <FeatureSwitch
                        key={key}
                        feature={f}
                        on={on}
                        onToggle={() => toggle(key)}
                        t={t}
                      />
                    );
                  }

                  const childOn = f.children.filter((c) =>
                    isEnabled(featureKey(c)),
                  ).length;
                  return (
                    <div key={key} className={`ft-group${on ? "" : " off"}`}>
                      <FeatureSwitch
                        feature={f}
                        on={on}
                        onToggle={() => toggle(key)}
                        t={t}
                      />
                      <p className="ft-group-count">
                        {t("functiontree.summary", {
                          on: childOn,
                          total: f.children.length,
                        })}
                      </p>
                      <div className="ft-nodes ft-nodes-sub">
                        {f.children.map((c) => {
                          const ck = featureKey(c);
                          return (
                            <FeatureSwitch
                              key={ck}
                              feature={c}
                              sub
                              // 显示子项自己的记忆（不受父组影响），停用点击直到组重开
                              on={isSelfEnabled(ck)}
                              disabled={!on}
                              onToggle={() => toggle(ck)}
                              t={t}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
