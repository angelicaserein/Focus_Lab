# _deprecated —— 废弃功能 / UI 存档

这里存放**已从 App 移除、但先留档不删**的功能与界面。这些文件不被任何入口 import，
不参与运行时（Vite 只打包被引用的模块），仅作日后回溯 / 复活之用。

## pixel-retro-skin —— 像素复古皮肤

角色卡页曾有两套可切换皮肤：「简约现代」与「像素复古」（8-bit 对话框、分段经验条、
等宽像素字）。2026-07 起下线像素皮肤与皮肤切换器，角色卡只保留现代皮肤。

- `CharacterSheetPixel.jsx` —— 像素皮肤渲染组件（自带原 `charView.contributionDots`）。
- `pixel-skin.css` —— 对应样式（`.char-pixel` / `.cp-*`）。

**若要复活**：把 `CharacterSheetPixel` 接回 `src/pages/Character/index.jsx`，
恢复其中的皮肤切换状态与按钮，并补回 `character.skin.*` 的 i18n 文案即可。
