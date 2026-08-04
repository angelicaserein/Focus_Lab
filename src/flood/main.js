// 屏幕底部的积水。
//
// 专注中切到白名单外的程序，桌宠的烧瓶就翻过来倒水，倒出去的水积在这里。
// 水位由主进程算好（见 main.cjs 的「分心水位」一节），这里只负责把一个 0~1
// 的数字画成一摊会晃的水。
//
// 没有用 React：这个窗口里没有任何状态、没有交互、没有 DOM 结构，
// 就一块 canvas。为它拉一份 React 进来只是让一个常驻窗口白白多占几十 KB。

// 只借主题的变量表，跟桌宠一个路子——水的颜色要跟应用的强调色是同一个。
import "@/styles/theme.css";
import "@/flood/flood.css";

const canvas = document.getElementById("flood-canvas");
const ctx = canvas.getContext("2d");

// 高 dpi 屏上按物理像素画会让这块半屏大的 canvas 填充量翻几倍。
// 水是一团模糊的色块，1.5 倍已经完全看不出锯齿了。
const DPR = Math.min(window.devicePixelRatio || 1, 1.5);

// 水位是慢变量（涨满要 8 分钟），IPC 每 200ms 才来一次。
// 直接用会一格一格地跳，这里本地再做一道指数逼近抹平。
const EASE = 0.12;
const FPS_CAP = 30;

// 水一旦开始积就至少这么深。
// 没有这个下限的话，刚分心的头半分钟水位只有百分之几——在 1080p 上是屏幕最底下
// 二三十像素的一条，跟没有一样。而「有水了」本身才是那条信息，深浅只是量级；
// 一条看不见的水等于这个功能在最该说话的时刻是哑的。
// 缓动会把 0 → MIN 这一跳抹成半秒的涌入，看起来是水漫进来而不是凭空出现。
const MIN_DEPTH_PX = 56;

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let target = 0;   // 主进程给的水位
let level = 0;    // 画面上实际画的水位（追着 target 走）
let rising = false;
let accent = "#8ab4ff";
let width = 0;
let height = 0;
let lastFrame = 0;
let raf = 0;

function readAccent() {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  if (v) accent = v;
}

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.round(width * DPR);
  canvas.height = Math.round(height * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

// 一条由两个正弦叠出来的水面。两个波长/速度都不成整数倍，
// 叠起来才不会看出周期——单一正弦会明显地「在原地滚动」。
function surfaceAt(x, t, amp) {
  return (
    Math.sin(x * 0.011 + t * 0.9) * amp
    + Math.sin(x * 0.023 - t * 1.45) * amp * 0.45
  );
}

function draw(now) {
  raf = requestAnimationFrame(draw);
  if (now - lastFrame < 1000 / FPS_CAP) return;
  lastFrame = now;

  level += (target - level) * EASE;
  if (Math.abs(target - level) < 0.0008) level = target;

  ctx.clearRect(0, 0, width, height);
  if (level <= 0.001) return;

  const t = reduceMotion ? 0 : now / 1000;
  // 涨的时候水面躁一点，退潮时平静下来——不看数字也能感觉到方向
  const amp = reduceMotion ? 0 : (rising ? 5 : 2.4);
  const floor = Math.min(MIN_DEPTH_PX, height);
  const surfaceY = height - (floor + level * (height - floor));

  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(0, surfaceY + surfaceAt(0, t, amp));
  for (let x = 4; x <= width; x += 4) ctx.lineTo(x, surfaceY + surfaceAt(x, t, amp));
  ctx.lineTo(width, height);
  ctx.closePath();

  // 越深越实：一整块等透明度的色板会像贴了张纸，压不出「有厚度的水」
  const grad = ctx.createLinearGradient(0, surfaceY, 0, height);
  grad.addColorStop(0, hexA(accent, 0.26));
  grad.addColorStop(1, hexA(accent, 0.46));
  ctx.fillStyle = grad;
  ctx.fill();

  // 水面那道亮线：和烧瓶里的弯液面同一个语汇，让「涨到哪儿了」有个明确的边
  ctx.beginPath();
  ctx.moveTo(0, surfaceY + surfaceAt(0, t, amp));
  for (let x = 4; x <= width; x += 4) ctx.lineTo(x, surfaceY + surfaceAt(x, t, amp));
  ctx.strokeStyle = "rgba(255,255,255,0.34)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// 主题变量可能是 #rgb / #rrggbb，也可能已经是 rgb()。
// 前者补上 alpha，后者原样用（多一层 globalAlpha 反而会把两段渐变一起压暗）。
function hexA(color, alpha) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color);
  if (!m) return color;
  let hex = m[1];
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const n = parseInt(hex, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

readAccent();
resize();
window.addEventListener("resize", resize);

// 桥接层在浏览器里是 no-op，所以这个文件单独用浏览器打开也不会报错，只是永远画不出水。
import("@/utils/desktop/desktopBridge").then(({ default: desktop }) => {
  desktop.onFloodLevel((payload) => {
    target = Math.min(Math.max(payload?.level ?? 0, 0), 1);
    rising = !!payload?.rising;
  });
});

raf = requestAnimationFrame(draw);
window.addEventListener("pagehide", () => cancelAnimationFrame(raf));
