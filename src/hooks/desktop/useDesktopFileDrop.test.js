import { describe, it, expect } from "vitest";
import { titleFromPath } from "@/hooks/desktop/useDesktopFileDrop";

describe("titleFromPath", () => {
  it("Windows 路径取文件名、去扩展名", () => {
    expect(titleFromPath("D:\\论文\\实验设计.docx")).toBe("实验设计");
  });

  it("POSIX 路径同理", () => {
    expect(titleFromPath("/Users/a/notes/reading list.pdf")).toBe("reading list");
  });

  it("下划线和连字符还原成空格（文件名是给机器读的，标题是给人读的）", () => {
    expect(titleFromPath("D:\\x\\实验设计_v3.docx")).toBe("实验设计 v3");
    expect(titleFromPath("weekly-report-2026.xlsx")).toBe("weekly report 2026");
  });

  it("没有扩展名的原样保留", () => {
    expect(titleFromPath("D:\\x\\Makefile")).toBe("Makefile");
  });

  it("名字里带点的不会被当成扩展名切掉半截", () => {
    expect(titleFromPath("v1.2.3 发布计划.md")).toBe("v1.2.3 发布计划");
  });

  it("很长的后缀不当扩展名（那多半是名字的一部分）", () => {
    expect(titleFromPath("archive.verylongsuffixhere")).toBe("archive.verylongsuffixhere");
  });

  it("拆不出名字时回退成整个输入，绝不返回空串", () => {
    expect(titleFromPath("D:\\x\\")).toBe("D:\\x\\");
    expect(titleFromPath("")).toBe("");
    expect(titleFromPath(null)).toBe("");
  });
});
