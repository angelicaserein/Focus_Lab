---
name: no-over-encapsulation
description: 重构封装要克制——只抽真有问题的，已达标的页面不要再拆
metadata: 
  node_type: memory
  type: feedback
  originSessionId: fac5b405-53be-4619-b2e3-42e70b98d349
---

用户在一轮 hook/组件封装后明确说「不要过度封装」。

**Why:** 该项目大部分页面已经是「页面只做编排 + 逻辑在 hook + 展示拆成子组件」的标准结构（如 Focus/index.jsx 编排 ~15 个 hook、DDLReminders 已拆子组件、Tasks 用 useTaskQuery+taskQuery.js）。继续把小的本地状态（Tasks 新建行、FocusConsole 时长草稿）强抽成 hook 只增加跳转、降低可读性。

**How to apply:** 只在有真实信号时抽：重复的渲染逻辑、单组件干多件不相关的事、内联 `renderX` 助手、状态过多。判断标准是「抽完更清晰」而非「能抽就抽」。遇到用户笼统说「继续封装/都做」时，先扫描确认还有没有真目标，没有就明说到此为止，不要制造工作。真正做过的合理封装见提交历史（Reward/Memo/PrefsSection）。给抽出的纯逻辑补 vitest（项目不用 jsdom/testing-library，只测导出的纯函数）。
