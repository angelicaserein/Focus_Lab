import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  // @anthropic-ai/sdk 是通过动态 import() 按需加载的（见 utils/ai*.js），Vite 冷启动
  // 扫描静态依赖时扫不到它。在此预声明，让「dev + key」用户首次调用 AI 时也不必触发
  // 运行时重新优化 + 整页刷新。其余依赖走静态 import，Vite 会自动预打包。
  optimizeDeps: {
    include: ['@anthropic-ai/sdk'],
  },
})
