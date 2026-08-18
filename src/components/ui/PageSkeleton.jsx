import React from "react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";
import "./PageSkeleton.css";

// 懒加载页面切换时的占位骨架屏。
//
// 关键点：每个页面的布局都不一样（任务库是表格、奖励是卡片网格、历史是统计+图表…），
// 所以骨架屏必须「按当前路由」画出对应页面的真实轮廓，而不是千篇一律的「标题+三卡片」。
//
// 为什么靠 useLocation 而不是传 prop：Suspense fallback 渲染在 Router 上下文内，
// 切换路由时 pathname 已经是「目标页」，正好用来挑选要画哪一套骨架。
//
// 为什么 CSS 自带一份布局而不复用页面自己的类名：每个页面的 CSS 都打包进它各自的
// 懒加载 chunk，骨架屏显示时那份 CSS 还没下载，所以这里必须自带容器宽度/网格/图表形状，
// 才能在内容到达前就「长得像」目标页面。配色走主题 token，自动适配三套皮肤。

// 单个微光灰块。数字尺寸自动当作 px，字符串（如 "60%"）原样使用。
function Sk({ w, h = 14, r = 8, cn = "", style }) {
  return (
    <div
      className={`sk-block ${cn}`}
      style={{ width: w, height: h, borderRadius: r, ...style }}
    />
  );
}

const Card = ({ cn = "", children, style }) => (
  <div className={`sk-card ${cn}`} style={style}>
    {children}
  </div>
);

const rep = (n) => Array.from({ length: n }, (_, i) => i);
const right = { marginLeft: "auto" };

// 图表柱高（百分比），固定一组让骨架稳定不闪烁
const DAILY = [45, 72, 55, 90, 60, 82, 40];
const HOURLY = [
  10, 8, 5, 5, 8, 15, 30, 55, 70, 85, 75, 60,
  50, 65, 80, 90, 78, 60, 45, 40, 55, 35, 20, 12,
];

// ── 首页：专注热力图 + 大号开始按钮 ──────────────────────────────────────────
function HomeSk() {
  return (
    <div className="sk-page skp-home">
      <Card>
        <div className="sk-between">
          <Sk w={140} h={12} />
          <Sk w={80} h={12} />
        </div>
        <div className="sk-heatmap-months">
          {rep(13).map((m) => (
            <Sk key={m} w={24} h={9} />
          ))}
        </div>
        <div className="sk-heatmap">
          {rep(52).map((c) => (
            <div className="sk-heatmap-col" key={c}>
              {rep(7).map((d) => (
                <Sk key={d} w={11} h={11} r={3} />
              ))}
            </div>
          ))}
        </div>
      </Card>
      <Sk w="100%" h={60} r={18} cn="skp-home-btn" />
    </div>
  );
}

// ── 专注：左=计时控制台/随记/聊天，右=任务管理 ─────────────────────────────
function FocusSk() {
  return (
    <div className="sk-page skp-focus">
      <div className="skp-focus-main">
        <div className="skp-focus-col">
          <Card>
            <div className="sk-between">
              <Sk w={90} h={12} />
              <Sk w={48} h={20} r={10} />
            </div>
            <Sk w="100%" h={44} r={12} />
            <Sk w="100%" h={38} r={12} />
            <div className="sk-actions sk-actions--fill">
              <Sk w="100%" h={44} r={14} />
              <Sk w="100%" h={44} r={14} />
            </div>
          </Card>
          <Card>
            <Sk w={120} h={14} />
            <Sk w="90%" h={12} />
            <Sk w="70%" h={12} />
          </Card>
          <Card>
            <Sk w={120} h={14} />
            <Sk w="80%" h={12} />
            <Sk w="95%" h={12} />
          </Card>
        </div>
        <div className="skp-focus-col">
          <Card>
            <div className="sk-between">
              <Sk w={120} h={22} />
              <div className="sk-row sk-gap-sm">
                {rep(4).map((i) => (
                  <Sk key={i} w={44} h={16} />
                ))}
              </div>
            </div>
            <div className="sk-row">
              <Sk w="100%" h={40} r={12} />
              <Sk w={48} h={40} r={12} />
            </div>
            {rep(7).map((i) => (
              <div className="sk-row" key={i}>
                <Sk w={18} h={18} r={6} />
                <Sk w="70%" h={14} />
                <Sk w={60} h={14} style={right} />
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── 历史：标题 + 三张统计卡 + 7日柱状图 + 记录列表 ───────────────────────────
function HistorySk() {
  return (
    <div className="sk-page skp-history">
      <div className="sk-headline">
        <Sk w="28%" h={30} r={10} />
      </div>
      <div className="sk-stats">
        <div className="sk-stat sk-card--accent">
          <Sk w="60%" h={28} />
          <Sk w="80%" h={12} />
        </div>
        {rep(2).map((i) => (
          <div className="sk-stat" key={i}>
            <Sk w="60%" h={28} />
            <Sk w="80%" h={12} />
          </div>
        ))}
      </div>
      <div className="sk-stats sk-stats--row2">
        {rep(2).map((i) => (
          <div className="sk-stat" key={i}>
            <Sk w="40%" h={22} />
            <Sk w="55%" h={12} />
          </div>
        ))}
      </div>
      <div className="sk-chart">
        {DAILY.map((h, i) => (
          <Sk key={i} h={`${h}%`} cn="sk-bar" />
        ))}
      </div>
      <Card>
        <div className="sk-between">
          <Sk w={120} h={16} />
          <Sk w={80} h={30} r={12} />
        </div>
        {rep(4).map((i) => (
          <div className="sk-row" key={i}>
            <div className="sk-col">
              <Sk w={180} h={14} />
              <Sk w={120} h={12} />
            </div>
            <Sk w={64} h={18} style={right} />
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── 情景模式：单张大卡（标题+链接 / 表单 / 列表） ────────────────────────────
function ScenarioSk() {
  return (
    <div className="sk-page skp-scenario">
      <div className="sk-between">
        <Sk w={120} h={22} />
        <Sk w={90} h={14} />
      </div>
      <Sk w="100%" h={44} r={12} />
      {rep(3).map((i) => (
        <div className="sk-row" key={i}>
          <Sk w={18} h={18} r={6} />
          <Sk w="70%" h={14} />
          <Sk w={50} h={14} style={right} />
        </div>
      ))}
    </div>
  );
}

// ── 情景统计：标题+返回 / 三张汇总卡 / 排行列表 ──────────────────────────────
function ScenarioStatsSk() {
  return (
    <div className="sk-page skp-scs">
      <div className="sk-between">
        <Sk w="30%" h={30} r={10} />
        <Sk w={90} h={14} />
      </div>
      <div className="sk-stats">
        <div className="sk-stat sk-card--accent">
          <Sk w="60%" h={26} />
          <Sk w="80%" h={12} />
        </div>
        {rep(2).map((i) => (
          <div className="sk-stat" key={i}>
            <Sk w="60%" h={26} />
            <Sk w="80%" h={12} />
          </div>
        ))}
      </div>
      <div className="sk-rank">
        <div className="sk-rank-row sk-rank-head">
          {rep(4).map((i) => (
            <Sk key={i} w={60} h={12} />
          ))}
        </div>
        {rep(5).map((i) => (
          <div className="sk-rank-row" key={i}>
            <Sk w="38%" h={14} />
            <Sk w={40} h={12} style={right} />
            <Sk w={50} h={12} />
            <Sk w={64} h={12} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 奖励：标题 / 资产 hero 卡 / 商城网格 ─────────────────────────────────────
function RewardSk() {
  return (
    <div className="sk-page skp-reward">
      <div className="sk-headline">
        <Sk w="22%" h={30} r={10} />
      </div>
      <div className="sk-hero sk-card--accent">
        <Sk w={80} h={12} />
        <Sk w={160} h={36} />
        <Sk w="60%" h={12} />
      </div>
      <div className="sk-section">
        <Sk w={80} h={16} />
        <div className="sk-grid">
          {rep(6).map((i) => (
            <Card cn="sk-shop" key={i}>
              <Sk w={40} h={40} r={12} />
              <Sk w="70%" h={16} />
              <Sk w="90%" h={12} />
              <Sk w="55%" h={12} />
              <div className="sk-between">
                <Sk w={50} h={16} />
                <Sk w={64} h={32} r={12} />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 设置：分区标题直接落在背景上，内容各不相同（主题卡排 / 药丸+开关 / 数据卡） ──
function SettingsSk() {
  return (
    <div className="sk-page skp-settings">
      <div className="sk-headline">
        <Sk w="18%" h={30} r={10} />
      </div>

      {/* 外观主题：标题 + 提示 + 三张主题卡 */}
      <div className="sk-section">
        <Sk w={90} h={18} />
        <Sk w="40%" h={12} />
        <div className="sk-theme-grid">
          {rep(3).map((i) => (
            <Card cn="sk-theme-card" key={i}>
              <Sk w={44} h={44} r={12} />
              <Sk w="55%" h={14} />
              <Sk w="80%" h={10} />
            </Card>
          ))}
        </div>
      </div>

      {/* 专注偏好：标题 + 提示 + 正计时/倒计时两排时长药丸 + 开关 */}
      <div className="sk-section">
        <Sk w={90} h={18} />
        <Sk w="45%" h={12} />
        {rep(2).map((row) => (
          <div className="sk-row" key={row}>
            <Sk w={110} h={14} />
            <div className="sk-row sk-gap-sm" style={right}>
              {rep(6).map((i) => (
                <Sk key={i} w={46} h={36} r={12} />
              ))}
            </div>
          </div>
        ))}
        <div className="sk-row">
          <Sk w={70} h={14} />
          <Sk w={48} h={26} r={99} style={right} />
        </div>
      </div>

      {/* 数据管理：标题 + 提示 + 占用卡 + 两个按钮 + 危险区 */}
      <div className="sk-section">
        <Sk w={90} h={18} />
        <Sk w="55%" h={12} />
        <Card>
          <Sk w={140} h={14} />
          <div className="sk-row sk-wrap">
            {rep(6).map((i) => (
              <Sk key={i} w={84} h={24} r={10} />
            ))}
          </div>
        </Card>
        <div className="sk-actions">
          <Sk w={96} h={40} r={12} />
          <Sk w={96} h={40} r={12} />
        </div>
        <Card cn="sk-card--danger">
          <Sk w={80} h={12} />
          <div className="sk-actions">
            <Sk w={120} h={40} r={12} />
            <Sk w={120} h={40} r={12} />
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── 数据分析：标题 / 时段柱状图+段卡 / 列表型分区 ───────────────────────────
function AnalyticsSk() {
  return (
    <div className="sk-page skp-analytics">
      <div className="sk-headline">
        <Sk w="34%" h={30} r={10} />
        <Sk w="55%" h={14} />
      </div>

      <div className="sk-section">
        <div className="sk-between">
          <Sk w={140} h={16} />
          <Sk w={100} h={22} r={10} />
        </div>
        <div className="sk-chart sk-chart--hourly">
          {HOURLY.map((h, i) => (
            <Sk key={i} h={`${h}%`} cn="sk-bar" />
          ))}
        </div>
        <div className="sk-blocks">
          {rep(4).map((i) => (
            <Card cn="sk-blockcard" key={i}>
              <Sk w="60%" h={12} />
              <Sk w="50%" h={20} />
              <Sk w="70%" h={10} />
            </Card>
          ))}
        </div>
      </div>

      {rep(2).map((s) => (
        <div className="sk-section" key={s}>
          <div className="sk-between">
            <Sk w={140} h={16} />
            <Sk w={90} h={22} r={10} />
          </div>
          <Card>
            {rep(4).map((i) => (
              <div className="sk-col" key={i}>
                <div className="sk-row">
                  <Sk w="50%" h={12} />
                  <Sk w={60} h={12} style={right} />
                </div>
                <Sk w="100%" h={6} r={99} />
              </div>
            ))}
          </Card>
        </div>
      ))}
    </div>
  );
}

// ── 分心统计：标题 / 四张总览卡 / 趋势柱状 / 24 小时柱状 ────────────────────
function DistractionSk() {
  return (
    <div className="sk-page skp-analytics">
      <div className="sk-headline">
        <Sk w="30%" h={30} r={10} />
        <Sk w="50%" h={14} />
      </div>

      <div className="sk-stats">
        <div className="sk-stat sk-card--accent">
          <Sk w="50%" h={24} />
          <Sk w="80%" h={12} />
        </div>
        {rep(3).map((i) => (
          <div className="sk-stat" key={i}>
            <Sk w="50%" h={24} />
            <Sk w="80%" h={12} />
          </div>
        ))}
      </div>

      {rep(2).map((s) => (
        <div className="sk-section" key={s}>
          <div className="sk-between">
            <Sk w={120} h={16} />
            <Sk w={100} h={22} r={10} />
          </div>
          <div className="sk-chart sk-chart--hourly">
            {HOURLY.map((h, i) => (
              <Sk key={i} h={`${h}%`} cn="sk-bar" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 任务库：标题+新建 / 数据库标签 / 工具栏 / 表格 ──────────────────────────
function TasksSk() {
  return (
    <div className="sk-page skp-tasks">
      <div className="sk-between">
        <div className="sk-titlegroup">
          <Sk w={90} h={26} />
          <Sk w={60} h={14} />
        </div>
        <Sk w={110} h={36} r={12} />
      </div>
      <div className="sk-row sk-tabs">
        {rep(3).map((i) => (
          <Sk key={i} w={90} h={32} r={10} />
        ))}
      </div>
      <div className="sk-row sk-toolbar">
        <Sk w={200} h={36} r={10} />
        <Sk w={100} h={36} r={10} />
        <Sk w={100} h={36} r={10} style={right} />
      </div>
      <div className="sk-table">
        <div className="sk-trow sk-trow--head">
          <Sk w={18} h={14} />
          <Sk w={120} h={14} />
          <Sk w={70} h={14} style={right} />
          <Sk w={70} h={14} />
          <Sk w={70} h={14} />
        </div>
        {rep(8).map((i) => (
          <div className="sk-trow" key={i}>
            <Sk w={18} h={18} r={6} />
            <Sk w="40%" h={14} />
            <Sk w={60} h={14} style={right} />
            <Sk w={60} h={14} />
            <Sk w={60} h={14} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── DDL 提醒：标题+副标题 / 今日提醒 / 任务卡列表 ───────────────────────────
function DDLSk() {
  return (
    <div className="sk-page skp-ddl">
      <div className="sk-headline">
        <Sk w="30%" h={28} r={10} />
        <Sk w="55%" h={14} />
      </div>
      <Card cn="sk-card--soft">
        <div className="sk-row">
          <Sk w={20} h={20} r={6} />
          <Sk w={100} h={14} />
          <Sk w={50} h={14} style={right} />
        </div>
        {rep(2).map((i) => (
          <div className="sk-row" key={i}>
            <Sk w={18} h={18} r={6} />
            <Sk w="60%" h={14} />
            <Sk w={60} h={14} style={right} />
          </div>
        ))}
      </Card>
      {rep(3).map((i) => (
        <Card key={i}>
          <div className="sk-between">
            <Sk w="50%" h={16} />
            <div className="sk-row">
              <Sk w={70} h={12} />
              <Sk w={60} h={20} r={8} />
            </div>
          </div>
          {rep(2).map((j) => (
            <div className="sk-row" key={j}>
              <Sk w={20} h={20} r={6} />
              <Sk w={50} h={12} />
              <Sk w="45%" h={12} />
              <Sk w={20} h={12} style={right} />
            </div>
          ))}
          <Sk w={130} h={30} r={10} />
        </Card>
      ))}
    </div>
  );
}

// ── 兜底：未知路由时画通用「标题 + 三卡片」 ─────────────────────────────────
function GenericSk() {
  return (
    <div className="sk-page skp-generic">
      <div className="sk-headline">
        <Sk w="42%" h={30} r={10} />
        <Sk w="60%" h={16} />
      </div>
      {rep(3).map((i) => (
        <Card key={i}>
          <Sk w="50%" h={14} />
          <Sk w="90%" h={14} />
          <Sk w="70%" h={14} />
        </Card>
      ))}
    </div>
  );
}

const VARIANTS = {
  "/": HomeSk,
  "/focus": FocusSk,
  "/calendar": HistorySk,
  "/scenario": ScenarioSk,
  "/scenario-stats": ScenarioStatsSk,
  "/reward": RewardSk,
  "/settings": SettingsSk,
  "/analytics": AnalyticsSk,
  "/distraction": DistractionSk,
  "/tasks": TasksSk,
  "/ddl": DDLSk,
};

export default function PageSkeleton() {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const Variant = VARIANTS[pathname] ?? GenericSk;

  return (
    <div className="sk-root" role="status" aria-busy="true" aria-label={t("common.loading")}>
      <Variant />
      <span className="sk-sr-only">{t("common.loadingEllipsis")}</span>
    </div>
  );
}
