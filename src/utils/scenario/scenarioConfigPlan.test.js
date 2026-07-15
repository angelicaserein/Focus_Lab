import { describe, it, expect } from "vitest";
import { planScenarioConfig } from "@/utils/scenario/scenarioConfigPlan";
import { parseConfigJson } from "@/utils/ai/aiScenarioConfig";

// 确定性 id 生成器，便于断言。
const seqGen = () => {
  let n = 0;
  return () => `new-${++n}`;
};

const CTX = {
  deviceOptions: [
    { id: "computer", label: "电脑" },
    { id: "headphones", label: "耳机" },
  ],
  commOptions: [
    { id: "silent", label: "保持安静" },
    { id: "talking", label: "可以说话" },
  ],
  tagOptions: [{ id: "deep", label: "深度工作" }],
};

describe("planScenarioConfig", () => {
  it("命中已有 label 复用其 id，不新建", () => {
    const plan = planScenarioConfig(
      { devices: ["电脑", "耳机"], communication: "保持安静", taskTypes: ["深度工作"] },
      { ...CTX, genId: seqGen() },
    );
    expect(plan.settings.devices).toEqual(["computer", "headphones"]);
    expect(plan.settings.communication).toBe("silent");
    expect(plan.settings.taskTypes).toEqual(["deep"]);
    expect(plan.newOptions.devices).toEqual([]);
    expect(plan.newOptions.communication).toEqual([]);
  });

  it("清单里没有的设备/交流规则会被安排新建，id 进入 settings", () => {
    const plan = planScenarioConfig(
      { devices: ["录音笔"], communication: "戴降噪" },
      { ...CTX, genId: seqGen() },
    );
    expect(plan.newOptions.devices).toEqual([{ id: "new-1", label: "录音笔" }]);
    expect(plan.settings.devices).toEqual(["new-1"]);
    expect(plan.newOptions.communication).toEqual([{ id: "new-2", label: "戴降噪" }]);
    expect(plan.settings.communication).toBe("new-2");
    // 预览标记新建
    expect(plan.preview.devices[0]).toEqual({ label: "录音笔", isNew: true });
  });

  it("label 匹配忽略大小写与首尾空格，且去重", () => {
    const plan = planScenarioConfig(
      { devices: [" 电脑 ", "电脑", "耳机"], communication: "" },
      { ...CTX, genId: seqGen() },
    );
    expect(plan.settings.devices).toEqual(["computer", "headphones"]);
  });

  it("任务类型只匹配现有标签，匹配不到标记 unmatched 且不进 settings", () => {
    const plan = planScenarioConfig(
      { taskTypes: ["深度工作", "遛狗"] },
      { ...CTX, genId: seqGen() },
    );
    expect(plan.settings.taskTypes).toEqual(["deep"]);
    expect(plan.preview.taskTypes).toEqual([
      { label: "深度工作", matched: true },
      { label: "遛狗", matched: false },
    ]);
  });

  it("baseSettings 中未被覆盖的字段被保留", () => {
    const plan = planScenarioConfig(
      { devices: ["电脑"] },
      { ...CTX, baseSettings: { foo: 1 }, genId: seqGen() },
    );
    expect(plan.settings.foo).toBe(1);
    expect(plan.settings.communication).toBe("");
  });
});

describe("parseConfigJson", () => {
  it("剥代码围栏后解析出规范结构", () => {
    const raw = '```json\n{"devices":["电脑"," "],"communication":"保持安静","taskTypes":["深度工作"],"note":"安静写代码"}\n```';
    expect(parseConfigJson(raw)).toEqual({
      devices: ["电脑"],
      communication: "保持安静",
      taskTypes: ["深度工作"],
      note: "安静写代码",
    });
  });

  it("非法输入回退为空结构", () => {
    expect(parseConfigJson("这不是 JSON")).toEqual({
      devices: [],
      communication: "",
      taskTypes: [],
      note: "",
    });
  });
});
