import { describe, it, expect, beforeEach, vi } from "vitest";

// 底座换桩（见 aiTasksModes.test.js 里的同款说明）。
const shell = vi.hoisted(() => ({
  isProd: false,
  hasKey: true,
  chatComplete: vi.fn(),
  postProxy: vi.fn(),
}));

vi.mock("@/utils/ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    get IS_PROD() { return shell.isProd; },
    hasApiKey: () => shell.hasKey,
    delay: () => Promise.resolve(),
    chatComplete: shell.chatComplete,
    postProxy: shell.postProxy,
  };
});

const { parseConfigJson, buildUserPayload, suggestScenarioConfig } =
  await import("@/utils/ai/aiScenarioConfig");

const options = {
  deviceOptions: [{ label: "电脑" }, { label: "耳机" }],
  commOptions: [{ label: "保持安静" }],
  tagOptions: [{ label: "项目" }, { label: "琐事" }],
};

const EMPTY = { devices: [], communication: "", taskTypes: [], note: "" };

beforeEach(() => {
  shell.chatComplete.mockReset();
  shell.postProxy.mockReset();
  shell.isProd = false;
  shell.hasKey = true;
});

describe("parseConfigJson", () => {
  it("解析四个字段，字符串两端空格去掉", () => {
    const raw = '{"devices":[" 电脑 ","耳机"],"communication":" 保持安静 ","taskTypes":["项目"],"note":" 安静写论文 "}';
    expect(parseConfigJson(raw)).toEqual({
      devices: ["电脑", "耳机"],
      communication: "保持安静",
      taskTypes: ["项目"],
      note: "安静写论文",
    });
  });

  it("数组里的非字符串和空串剔掉，字段类型不对就当没给", () => {
    const raw = '{"devices":["电脑",3,"  ",null],"communication":["保持安静"],"taskTypes":"项目"}';
    expect(parseConfigJson(raw)).toEqual({
      devices: ["电脑"],
      communication: "",
      taskTypes: [],
      note: "",
    });
  });

  it("剥围栏；解析不出来时给一份空配置，而不是 undefined 字段", () => {
    expect(parseConfigJson('```json\n{"devices":["电脑"]}\n```').devices).toEqual(["电脑"]);
    expect(parseConfigJson("模型今天想聊天")).toEqual(EMPTY);
    expect(parseConfigJson(["电脑"])).toEqual(EMPTY);
  });
});

describe("buildUserPayload", () => {
  it("把描述和三张现有清单一起交代清楚", () => {
    const text = buildUserPayload("在图书馆写论文", options);
    expect(text).toContain("情境描述：在图书馆写论文");
    expect(text).toContain("- 设备：电脑、耳机");
    expect(text).toContain("- 交流规则：保持安静");
    expect(text).toContain("任务类型（只能从这里选）：项目、琐事");
  });

  it("清单为空时写「（无）」，描述为空时写「（未填写）」", () => {
    const text = buildUserPayload("   ", {});
    expect(text).toContain("情境描述：（未填写）");
    expect(text).toContain("- 设备：（无）");
  });
});

describe("suggestScenarioConfig", () => {
  it("描述为空时直接给空配置，不调任何后端", async () => {
    expect(await suggestScenarioConfig("  ", options)).toEqual(EMPTY);
    expect(shell.postProxy).not.toHaveBeenCalled();
    expect(shell.chatComplete).not.toHaveBeenCalled();
  });

  it("生产环境走 /api/scenario-config 代理", async () => {
    shell.isProd = true;
    shell.postProxy.mockResolvedValue({ result: '{"devices":["电脑"],"communication":"保持安静"}' });

    const out = await suggestScenarioConfig("在图书馆写论文", options);

    const [endpoint, body] = shell.postProxy.mock.calls[0];
    expect(endpoint).toBe("/api/scenario-config");
    expect(body).toEqual({ prompt: "在图书馆写论文", options });
    expect(out.devices).toEqual(["电脑"]);
    expect(shell.chatComplete).not.toHaveBeenCalled();
  });

  it("本地有 key 时直连 SDK，输入里带上现有清单", async () => {
    shell.chatComplete.mockResolvedValue('{"devices":["耳机"]}');

    const out = await suggestScenarioConfig("戴耳机写代码", options);

    expect(out.devices).toEqual(["耳机"]);
    expect(shell.chatComplete.mock.calls[0][0].user).toContain("戴耳机写代码");
  });

  it("无 key 时按关键词粗配一版：图书馆→保持安静，写论文→电脑", async () => {
    shell.hasKey = false;

    const out = await suggestScenarioConfig("在图书馆写论文", options);

    expect(out.communication).toBe("保持安静");
    expect(out.devices).toContain("电脑");
    expect(out.note).toContain("示例");
    expect(shell.postProxy).not.toHaveBeenCalled();
  });

  it("离线粗配的任务类型只从现有标签里挑，不自造", async () => {
    shell.hasKey = false;

    const hit = await suggestScenarioConfig("今天要推进项目", options);
    const miss = await suggestScenarioConfig("今天要练琴", options);

    expect(hit.taskTypes).toEqual(["项目"]);
    expect(miss.taskTypes).toEqual([]);
  });

  it("离线粗配一个设备关键词都没命中时，退回清单里的第一项", async () => {
    shell.hasKey = false;

    const out = await suggestScenarioConfig("就是随便坐着", options);

    expect(out.devices).toEqual(["电脑"]);
  });

  it("英文描述也认得（关键词不分大小写）", async () => {
    shell.hasKey = false;

    const out = await suggestScenarioConfig("Working on my LAPTOP with HEADPHONES", options);

    expect(out.devices).toEqual(expect.arrayContaining(["电脑", "耳机"]));
  });
});
