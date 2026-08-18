import { describe, it, expect, beforeEach } from "vitest";
import {
  NOTICE_VERSION,
  shouldShowNotice,
  readAck,
  writeAck,
  clearAck,
} from "./privacyNotice";

// 弹一次就不该再弹，但文案改版后必须再弹一次——这两件事反了都很难被发现：
// 前者是每次开应用都糊用户一脸，后者是新增的外发行为永远没人被告知。
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

describe("shouldShowNotice", () => {
  it("从没看过就要弹", () => {
    expect(shouldShowNotice(null)).toBe(true);
  });

  it("看过当前版本就不再弹", () => {
    expect(shouldShowNotice({ version: NOTICE_VERSION, at: 1 })).toBe(false);
  });

  it("只看过更老的版本要再弹一次", () => {
    expect(shouldShowNotice({ version: NOTICE_VERSION - 1, at: 1 })).toBe(true);
  });

  it("存坏了（没有版本号）当作没看过", () => {
    expect(shouldShowNotice({})).toBe(true);
    expect(shouldShowNotice({ version: "1" })).toBe(true);
  });
});

describe("ack 的读写", () => {
  beforeEach(() => localStorage.clear());

  it("写过之后读得回来，并且不再需要弹", () => {
    writeAck(1700000000000);

    expect(readAck()).toEqual({ version: NOTICE_VERSION, at: 1700000000000 });
    expect(shouldShowNotice(readAck())).toBe(false);
  });

  it("JSON 坏掉时回落成「没看过」，不抛错", () => {
    localStorage.setItem("privacy_notice_ack_v1", "{坏了");

    expect(readAck()).toBeNull();
    expect(shouldShowNotice(readAck())).toBe(true);
  });

  it("清掉之后回到第一次打开的状态", () => {
    writeAck();
    clearAck();

    expect(readAck()).toBeNull();
    expect(shouldShowNotice(readAck())).toBe(true);
  });
});
