import { describe, it, expect } from "vitest";
import { formatTrayTooltip } from "./trayTooltip.cjs";

// 这句话是托盘图标的 tooltip。Tray 没有 getToolTip，跑起来之后只有人眼能看见它，
// 所以它的每一种形态都在这里锁住——线上出问题的话，先看这组用例还绿不绿。

const focusing = { seconds: 754, isRunning: true, targetMins: 25, timerMode: "countup" };

describe("formatTrayTooltip", () => {
  it("没有状态 / 没有会话时只显示应用名", () => {
    expect(formatTrayTooltip(null)).toBe("Focus Lab");
    expect(formatTrayTooltip({})).toBe("Focus Lab");
    expect(formatTrayTooltip({ focus: null })).toBe("Focus Lab");
  });

  it("会话停在 0 秒没动过时不显示 00:00", () => {
    // 进了专注页但还没点开始：托盘挂一个「已暂停 00:00」只是噪音
    expect(formatTrayTooltip({ focus: { seconds: 0, isRunning: false, targetMins: 25 } }))
      .toBe("Focus Lab");
  });

  it("正计时显示已过时长", () => {
    expect(formatTrayTooltip({ focus: focusing })).toBe("Focus Lab — 专注中 12:34");
  });

  it("暂停时换标签但时间还在", () => {
    expect(formatTrayTooltip({ focus: { ...focusing, isRunning: false } }))
      .toBe("Focus Lab — 已暂停 12:34");
  });

  it("跟着主窗口的语言走", () => {
    expect(formatTrayTooltip({ app: { lang: "en" }, focus: focusing }))
      .toBe("Focus Lab — Focusing 12:34");
    expect(formatTrayTooltip({ app: { lang: "en" }, focus: { ...focusing, isRunning: false } }))
      .toBe("Focus Lab — Paused 12:34");
    // 非 en 的一律当中文（和桌宠、主窗口同一套判断）
    expect(formatTrayTooltip({ app: { lang: "zh" }, focus: focusing }))
      .toBe("Focus Lab — 专注中 12:34");
  });

  it("倒计时显示剩余，超时显示超出多久", () => {
    const countdown = { ...focusing, timerMode: "countdown" }; // 25 分钟目标，已过 12:34
    expect(formatTrayTooltip({ focus: countdown })).toBe("Focus Lab — 专注中 12:26");
    expect(formatTrayTooltip({ focus: { ...countdown, seconds: 1500 } }))
      .toBe("Focus Lab — 专注中 00:00");
    expect(formatTrayTooltip({ focus: { ...countdown, seconds: 1600 } }))
      .toBe("Focus Lab — 专注中 +01:40");
  });

  it("倒计时没给目标时长时按 25 分钟算（和桌宠同一个兜底）", () => {
    expect(formatTrayTooltip({ focus: { seconds: 60, isRunning: true, timerMode: "countdown" } }))
      .toBe("Focus Lab — 专注中 24:00");
  });

  it("超过一小时不截断，分钟位照常往上涨", () => {
    expect(formatTrayTooltip({ focus: { ...focusing, seconds: 3725 } }))
      .toBe("Focus Lab — 专注中 62:05");
  });

  it("脏数据不炸：秒数是 NaN / 负数 / 字符串都能出一句话", () => {
    expect(formatTrayTooltip({ focus: { seconds: NaN, isRunning: true } }))
      .toBe("Focus Lab — 专注中 00:00");
    expect(formatTrayTooltip({ focus: { seconds: -30, isRunning: true } }))
      .toBe("Focus Lab — 专注中 00:00");
    expect(formatTrayTooltip({ focus: { seconds: "754", isRunning: true } }))
      .toBe("Focus Lab — 专注中 12:34");
  });

  it("秒数带小数时四舍五入到整秒", () => {
    expect(formatTrayTooltip({ focus: { ...focusing, seconds: 754.6 } }))
      .toBe("Focus Lab — 专注中 12:35");
  });
});
