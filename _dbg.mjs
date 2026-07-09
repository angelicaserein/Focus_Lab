import { chromium } from "playwright";
const BASE = "http://localhost:5174";
const browser = await chromium.launch();
const page = await browser.newPage();
for (const p of ["/", "/ddl", "/tasks", "/settings"]) {
  await page.goto(BASE + p, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(800);
  const info = await page.evaluate(() => ({
    url: location.pathname,
    mainClass: document.querySelector("main")?.className,
    firstHeading: document.querySelector("h1,h2,.page-title,.ddl-horizon-title")?.textContent?.trim()?.slice(0,40),
    ls: JSON.stringify(localStorage).slice(0,120),
  }));
  console.log(p, "=>", JSON.stringify(info));
}
await browser.close();
