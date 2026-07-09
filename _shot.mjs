import { chromium } from "playwright";

const BASE = "http://localhost:5174";
const OUT = process.argv[2] || ".";
const routes = [
  ["home", "/"], ["settings", "/settings"], ["functiontree", "/functiontree"],
  ["skilltree", "/skilltree"], ["focus", "/focus"], ["history", "/history"],
  ["scenario", "/scenario"], ["reward", "/reward"], ["research", "/research"],
  ["scenario-stats", "/scenario-stats"], ["analytics", "/analytics"], ["tasks", "/tasks"],
  ["ddl", "/ddl"], ["memo", "/memo"], ["calendar", "/calendar"],
  ["character", "/character"], ["industry", "/industry"], ["gantt", "/gantt"],
  ["wish", "/wish"], ["world", "/world"],
];
const widths = { pc: 1440, mobile: 390 };

const browser = await chromium.launch();
for (const [name, w] of Object.entries(widths)) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
  const page = await ctx.newPage();
  for (const [slug, path] of routes) {
    try {
      await page.goto(BASE + "/#" + path, { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${OUT}/${name}-${slug}.png` });
      console.log("ok", name, slug, "->", page.url());
    } catch (e) {
      console.log("ERR", name, slug, e.message);
    }
  }
  await ctx.close();
}
await browser.close();
console.log("done");
