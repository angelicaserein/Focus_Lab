// 整页截图：node scripts/shot.mjs [路径] [输出文件]
// 例：node scripts/shot.mjs /tasks .tmp/shots/tasks.png
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const path = process.argv[2] ?? '/';
const out = process.argv[3] ?? `.tmp/shots/${path.replace(/[^\w]/g, '_') || 'home'}.png`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto(`http://localhost:5173${path}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500); // 等动画/3D 稳定
await mkdir(dirname(out), { recursive: true });
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(out);
