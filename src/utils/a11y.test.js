import { describe, it, expect, vi } from "vitest";
import { onActivateKey } from "./a11y";

// 造一个够用的假事件：只有 helper 真正读到的字段。
function keyEvent(key, { target = "self" } = {}) {
  const currentTarget = { id: "self" };
  return {
    key,
    currentTarget,
    target: target === "self" ? currentTarget : { id: target },
    preventDefault: vi.fn(),
  };
}

describe("onActivateKey", () => {
  it("Enter 触发 handler", () => {
    const handler = vi.fn();
    const e = keyEvent("Enter");
    onActivateKey(handler)(e);
    expect(handler).toHaveBeenCalledOnce();
    expect(e.preventDefault).toHaveBeenCalled();
  });

  it("Space 触发 handler，并挡掉默认滚动", () => {
    const handler = vi.fn();
    const e = keyEvent(" ");
    onActivateKey(handler)(e);
    expect(handler).toHaveBeenCalledOnce();
    expect(e.preventDefault).toHaveBeenCalled();
  });

  it("其他按键不触发，也不拦默认行为", () => {
    const handler = vi.fn();
    for (const key of ["Escape", "Tab", "a", "ArrowDown"]) {
      const e = keyEvent(key);
      onActivateKey(handler)(e);
      expect(e.preventDefault).not.toHaveBeenCalled();
    }
    expect(handler).not.toHaveBeenCalled();
  });

  it("从内部元素冒上来的按键不算：内嵌按钮自己会激活，外层再来一次就是双重激活", () => {
    const handler = vi.fn();
    const e = keyEvent("Enter", { target: "inner-button" });
    onActivateKey(handler)(e);
    expect(handler).not.toHaveBeenCalled();
    expect(e.preventDefault).not.toHaveBeenCalled();
  });

  it("把事件对象透传给 handler", () => {
    const handler = vi.fn();
    const e = keyEvent("Enter");
    onActivateKey(handler)(e);
    expect(handler).toHaveBeenCalledWith(e);
  });
});
