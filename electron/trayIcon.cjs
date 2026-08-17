// 托盘图标：一只从下往上注水的小瓶子。
//
// tooltip 要把鼠标停上去才看得到（见 trayTooltip.cjs）。任务栏那一格本身
// 一直在视野边缘，让它跟着进度变，扫一眼就知道跑到哪儿了——这正是桌面版
// 比网页版多出来的那块地方。
//
// 纯函数返回一张 BGRA 位图（Electron 的 nativeImage.createFromBitmap 要的就是
// 这个格式），不碰任何 Electron API，于是这里的几何和配色都能在 vitest 里锁住。
//
// 画的是「圆形轮廓 + 从底部涨上来的水面」，跟应用里的烧瓶是同一个语汇。
// 16 像素上画不下瓶颈瓶身，圆是唯一还能看清「水到哪儿了」的形状。

const SIZE = 32;      // 逻辑 16px × scaleFactor 2
const SS = 2;         // 每个像素再切 2×2 个采样点做抗锯齿：16px 上锯齿非常显眼
const R = 15;         // 圆半径（留半像素余地，免得贴边被裁）

// 水的颜色跟应用的强调色同一路子。暂停时压成灰蓝：一眼能分出「在跑」和「停着」，
// 而不用去读 tooltip。
const RUNNING = { r: 138, g: 180, b: 255 };
const PAUSED = { r: 150, g: 156, b: 172 };
// 轮廓：始终在，空瓶时托盘里也得有个东西，不然图标像丢了
const EDGE = { r: 214, g: 224, b: 245 };

const clamp01 = (v) => (Number.isFinite(v) ? Math.min(Math.max(v, 0), 1) : 0);

// 一个采样点落在图形的哪一层：2=水里，1=轮廓上，0=外面
function sampleAt(x, y, cx, cy, waterY) {
  const d = Math.hypot(x - cx, y - cy);
  if (d > R) return 0;
  if (d > R - 2.4) return 1;      // 圆环
  return y >= waterY ? 2 : 0;     // 水面以下才是水
}

// ratio: 0~1 进度；running: 在跑还是暂停。
// 返回 { buffer, width, height }，直接喂 nativeImage.createFromBitmap。
function trayBitmap(ratio, running = true) {
  const p = clamp01(ratio);
  const fill = running ? RUNNING : PAUSED;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  // 水面：p=0 在圆的底缘（一滴没有），p=1 在顶缘（满）
  const waterY = cy + R - p * 2 * R;

  const buf = Buffer.alloc(SIZE * SIZE * 4);
  const step = 1 / SS;
  const per = SS * SS;

  for (let py = 0; py < SIZE; py += 1) {
    for (let px = 0; px < SIZE; px += 1) {
      let water = 0;
      let edge = 0;
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const hit = sampleAt(px + (sx + 0.5) * step, py + (sy + 0.5) * step, cx, cy, waterY);
          if (hit === 2) water += 1;
          else if (hit === 1) edge += 1;
        }
      }
      // 水盖在轮廓上：两者都命中的采样点按各自占比混，边缘才不会有一圈硬缝
      const wa = water / per;
      const ea = edge / per;
      const a = wa + ea;
      if (a <= 0) continue;
      const r = (fill.r * wa + EDGE.r * ea) / a;
      const g = (fill.g * wa + EDGE.g * ea) / a;
      const b = (fill.b * wa + EDGE.b * ea) / a;
      // 空瓶时轮廓淡一点：没有会话的时候托盘不该抢注意力
      const alpha = Math.round(255 * a * (wa > 0 ? 1 : 0.85));
      const i = (py * SIZE + px) * 4;
      buf[i] = Math.round(b);      // BGRA
      buf[i + 1] = Math.round(g);
      buf[i + 2] = Math.round(r);
      buf[i + 3] = alpha;
    }
  }
  return { buffer: buf, width: SIZE, height: SIZE, scaleFactor: 2 };
}

// 进度只按这么多档重画：计时每秒推一次，16 像素上再细也看不出来，
// 而每次重画都要走一遍 32×32×4 个采样点 + 一次原生 setImage。
const STEPS = 24;
function iconKey(ratio, running) {
  return `${Math.round(clamp01(ratio) * STEPS)}|${running ? 1 : 0}`;
}

module.exports = { trayBitmap, iconKey, SIZE };
