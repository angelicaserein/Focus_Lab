import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  base: './',
  // localStorage 按 origin（含端口）隔离：端口一变，浏览器就当成另一个站点，
  // 之前的任务/设置全读不到、像丢了数据。固定 5173，并用 strictPort 让「端口被
  // 占用」时直接报错（提示去关掉旧的 dev server），而不是静默跳到 5174/5177。
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      // 全库内部模块统一用 @/ 指向 src，移动文件不再打断相对路径
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // openai 是通过动态 import() 按需加载的（见 utils/ai*.js），Vite 冷启动
  // 扫描静态依赖时扫不到它。在此预声明，让「dev + key」用户首次调用 AI 时也不必触发
  // 运行时重新优化 + 整页刷新。其余依赖走静态 import，Vite 会自动预打包。
  optimizeDeps: {
    include: ['openai'],
  },
  test: {
    // 现有测试均为纯函数单测，跑在 node 环境即可。若要测组件/带 DOM 的 hook，
    // 在该测试文件顶部加 `// @vitest-environment jsdom` 并 `npm i -D jsdom`。
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'json-summary'],
      // TDD 只 gate「刻意抽出的纯逻辑层」utils/**；UI/three/JSX 组件不做单测。
      // 想测某个 hook 的逻辑时，照既有范式把纯函数抽出去（见 docs/TDD.md）。
      include: ['src/utils/**'],
      exclude: ['**/*.{test,spec}.*', '**/index.{js,jsx}'],
      // 只涨不跌的地板线（当前 utils≈65%；time/ddl/matrixGeometry/focusRecords
      // 已补测，analytics/character 100%）。补了测试、覆盖率上去后，把这几个数字
      // 往上调，锁住成果、防止回退。留几个点余量，避免无关改动误伤红灯。
      thresholds: {
        statements: 63,
        branches: 55,
        functions: 59,
        lines: 63,
      },
    },
  },
})
