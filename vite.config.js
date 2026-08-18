import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

// 把「本次构建产出了哪些文件」写进 dist/sw.js，替换掉 public/sw.js 里的
// __SW_BUILD_MANIFEST__ 占位符。Service Worker 拿它在 activate 时清掉不再存在的
// 旧 hash 产物——否则每发一版都往同一个 cache 里堆一份新 bundle + .glb，只涨不清。
// 走 closeBundle 而不是 writeBundle：要等 public/ 拷贝完，清单才包含图标、draco 解码器。
function swBuildManifest() {
  return {
    name: 'sw-build-manifest',
    apply: 'build',
    enforce: 'post',
    closeBundle() {
      const outDir = fileURLToPath(new URL('./dist', import.meta.url))
      const swPath = path.join(outDir, 'sw.js')
      if (!fs.existsSync(swPath)) return

      const files = []
      const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name)
          if (entry.isDirectory()) walk(full)
          // sw.js 自己不进清单：它由浏览器按 SW 更新机制管理，不走 cache。
          else if (full !== swPath) files.push('./' + path.relative(outDir, full).split(path.sep).join('/'))
        }
      }
      walk(outDir)

      const src = fs.readFileSync(swPath, 'utf8')
      const next = src.replace('"__SW_BUILD_MANIFEST__"', JSON.stringify(files.sort()))
      if (next === src) {
        // 占位符没了说明 sw.js 被改过名/改过写法，静默失效会让缓存重新变成只涨不清。
        this.error('sw.js 里找不到 __SW_BUILD_MANIFEST__ 占位符，构建清单没注入成功')
      }
      fs.writeFileSync(swPath, next)
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [swBuildManifest()],
  build: {
    rollupOptions: {
      // 三个入口：index.html 是完整应用（网页版 / Electron 主窗口），
      // pet.html 是 Electron 的桌宠悬浮窗，flood.html 是贴在屏幕底部的积水层。
      // 后两个刻意不复用 index.html——一个只要一只 SVG 烧瓶、一个只要一块 canvas，
      // 都不该把路由 / Context / three.js 再跑一遍。
      // 网页版部署时多出来的这两个页面无人访问，也不进 SW 预缓存清单。
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        pet: fileURLToPath(new URL('./pet.html', import.meta.url)),
        flood: fileURLToPath(new URL('./flood.html', import.meta.url)),
      },
    },
  },
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
    // electron/ 里也收：主进程有极少数纯逻辑（比如托盘 tooltip 的文案）在
    // 跑起来之后根本读不出来（Tray 没有 getToolTip），只能靠单测锁住。
    // api/ 也收：9 个 AI 代理端点的公共外壳（_shared.mjs）管着 405/503/400/500
    // 这些只有部署后才走得到的分支，只能靠单测锁。
    include: [
      'src/**/*.{test,spec}.{js,jsx}',
      'electron/**/*.{test,spec}.{js,cjs}',
      'api/**/*.{test,spec}.mjs',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'json-summary'],
      // TDD 只 gate「刻意抽出的纯逻辑层」utils/**；UI/three/JSX 组件不做单测。
      // 想测某个 hook 的逻辑时，照既有范式把纯函数抽出去（见 docs/TDD.md）。
      include: ['src/utils/**'],
      exclude: ['**/*.{test,spec}.*', '**/index.{js,jsx}'],
      // 只涨不跌的地板线（当前 utils≈91%；analytics/character 100%，
      // time/ddl/matrixGeometry/focusRecords/dayLog/tonePack、storage 的逐版本迁移、
      // utils/ai 六支的三模式分流与兜底均已补测——AI 那几支把 aiClient 换成桩，
      // 只钉「走哪条路 / 失败回退到哪」，不发真请求，见 aiTasksModes.test.js）。
      // 补了测试、覆盖率上去后，把这几个数字往上调，锁住成果、防止回退。
      // 留几个点余量，避免无关改动误伤红灯。
      // 还没测的：desktopBridge、notify、registerSW —— 都是浏览器/Electron 的 I/O
      // 壳子，值不值得测取决于 mock 到哪一层，下一轮先定这个。
      thresholds: {
        statements: 89,
        branches: 82,
        functions: 81,
        lines: 89,
      },
    },
  },
})
