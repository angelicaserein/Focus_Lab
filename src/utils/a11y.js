// 键盘可达性小工具。
//
// 有些「可点的东西」天生做不成 <button>：任务行里嵌着删除按钮和输入框（button
// 不能套 button）、表格 <th> 的内容块要吃满单元格、心流卡的标题点一下就地改名。
// 这些只能退回 role="button" + tabIndex={0}，再自己补一个键盘处理——
// 原生按钮的 Enter/Space 激活是浏览器送的，div 没有这份待遇。
//
// 这个 helper 就是那份键盘处理，省得在每个站点重抄一遍 if (e.key === "Enter" ...)。
// 注意它只管「激活」这一件事，别往里塞方向键/Esc 之类的组件专属逻辑。

/**
 * 生成 onKeyDown 处理器：Enter / Space 时调用 handler，等价于点击。
 *
 * Space 必须 preventDefault，否则页面会顺带滚一屏；Enter 也一并挡掉，
 * 免得在表单里触发隐式提交。
 *
 * 事件只在元素自身上响应：从内部真正的 <button> / <input> 冒上来的按键不算
 * ——它们有自己的激活语义，再触发一次外层就是双重激活（比如点删除按钮结果连
 * 带把整行也选中了）。
 *
 * @param {(e: KeyboardEvent) => void} handler 激活时执行
 * @returns {(e: KeyboardEvent) => void}
 */
export function onActivateKey(handler) {
  return (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    if (e.target !== e.currentTarget) return;
    e.preventDefault();
    handler(e);
  };
}
