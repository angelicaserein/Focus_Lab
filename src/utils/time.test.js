import { describe, it, expect } from "vitest";
import { getTodayStr } from "./time";

describe("getTodayStr", () => {
  it("返回本地年月日，不受 UTC 偏移影响（凌晨不会跳到昨天）", () => {
    const d = new Date();
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
    expect(getTodayStr()).toBe(expected);
  });

  it("和 new Date().getDay() 同属一天（口径一致）", () => {
    // getTodayStr 的日与本地 getDate() 必须一致——历史 bug 是用 toISOString() 取 UTC 日，
    // 在 UTC+8 凌晨会比本地日期小 1，与依赖它的循环任务重置逻辑错位。
    const localDay = new Date().getDate();
    const strDay = Number(getTodayStr().split("-")[2]);
    expect(strDay).toBe(localDay);
  });
});
