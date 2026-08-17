import { useCallback, useEffect, useRef, useState } from "react";
import { useTodos } from "@/context/TodoContext";
import desktop, { isDesktop } from "@/utils/desktop/desktopBridge";

// 把文件拖进窗口 → 建成任务，任务记着这个文件在硬盘上的位置。
//
// 这是桌面版真正独一份的一件事：浏览器的 drop 只给你文件内容，拿不到路径，
// 更不可能回头把它打开。于是网页版最多做到「把文件读进来」，而这里做到的是
// 「这条任务对应硬盘上的那个文件，点一下就打开」。
//
// 为什么值得做：想到「该改论文了」到真的开始改，中间隔着「找到那个文件」。
// 那一步看着不算什么，却正是最容易在半路走神的地方。拖一下就把这段路省了。
//
// 注意不是拖到桌宠上——桌宠窗为了不挡桌面图标是鼠标穿透的（见 usePetWindow），
// 穿透的窗口在 Windows 上根本不会被注册成拖放目标，收不到 drop。所以靶子是主窗口。

// 文件名 → 任务标题：去掉扩展名，把下划线/连字符还原成空格。
// 「实验设计_v3.docx」变成「实验设计 v3」——标题是给人读的，扩展名那部分
// 已经由旁边的「打开」按钮代表了，留在标题里只是噪音。
// 拆不出名字（路径以分隔符结尾之类）时回退成整个路径，宁可难看也别建一条空任务。
export function titleFromPath(path) {
  const raw = String(path ?? "");
  const base = raw.split(/[\\/]/).pop() || raw;
  const stem = base.replace(/\.[^.\s]{1,12}$/, "");
  const clean = (stem || base).replace(/[_-]+/g, " ").trim();
  return clean || raw;
}

export default function useDesktopFileDrop() {
  const { addTodo } = useTodos();
  // 拖到窗口上方时给一层提示，不然松手前用户不知道这里能接住
  const [dragging, setDragging] = useState(false);
  // dragenter/dragleave 会在子元素之间来回冒泡，进出各记一笔才不会闪。
  const depth = useRef(0);
  const addRef = useRef(addTodo);
  addRef.current = addTodo;

  const reset = useCallback(() => { depth.current = 0; setDragging(false); }, []);

  useEffect(() => {
    if (!isDesktop) return undefined;

    // 只认「从系统里拖文件进来」。在页面内部拖别的东西（任务卡排序之类）
    // 的 dataTransfer 里没有 Files，别把那些也接管了。
    const hasFiles = (e) => !!e.dataTransfer?.types?.includes("Files");

    const onEnter = (e) => {
      if (!hasFiles(e)) return;
      depth.current += 1;
      setDragging(true);
    };
    const onOver = (e) => {
      if (!hasFiles(e)) return;
      // 不拦下来的话浏览器的默认行为是「用这个文件替换掉当前页面」，
      // 整个 app 会被一个 PDF 顶掉，且回不来。
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    };
    const onLeave = (e) => {
      if (!hasFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragging(false);
    };
    const onDrop = (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      reset();
      const paths = desktop.pathsOf(e.dataTransfer.files);
      for (const p of paths) addRef.current(titleFromPath(p), { filePath: p });
    };

    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [reset]);

  return dragging;
}
