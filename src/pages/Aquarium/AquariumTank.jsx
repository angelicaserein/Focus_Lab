import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { speciesById } from "@/data/aquarium/aquariumData";
import { shapeOf } from "@/data/aquarium/creatureShapes";
import { creaturePalette } from "@/data/aquarium/creaturePalette";
import { STAGE, growthOf, normalizeCollection } from "@/data/aquarium/growth";

// 生态缸：一只用 canvas 画的活水缸。已入住的物种一直在里面慢游；新鱼由父页调用命令式接口
// 「从上面扔进来」。
//
// 入水是一条连续的因果链，不是三段拼接（fall → dive → resident 之间不许有突变）：
//   坠落   头朝下越掉越快，触水判定用当下起伏的水面，不是静水位
//   入水   带着这一刻的实际速度砸下去——砸得越重，水花越大、扎得越深
//   下潜   在水里被阻力减速、翻回横姿、尺寸收敛到住客大小，一路拖着气泡
//   交接   速度掉干净、姿态回正，才原地变成住客（位置完全承接）
// 水面的扰动也是局部的：落点被砸出一个凹坑，向两侧荡开涟漪并衰减；整片水面一起抬起
// 会像整缸在晃，而不像被一只鱼砸中。
//
// 顺序上是「先弹解锁卡、收下之后再扔进缸里」：卡片是揭晓，入水是安置，两件事不该抢同一拍。
// （早先做过「跃出水面→顶点弹卡→再潜回」，跃出那一段既解释不通又拖节奏，已去掉。）
//
// 造型不在这里画：形状是 creatureShapes 里那份 24×24 的部件数据（与图鉴共用一份），
// 这里只负责把它编译成 Path2D、按物种配色填上、再让它按自己的方式动。
//
// 落进缸的是一颗卵，不是一只成体（见 data/aquarium/growth）：卵沉到缸底轻轻晃，到点破膜
// 冒一串气泡、变成幼体开始游，再一天天长到图鉴里的大小。阶段只由 born 与当下时间算出来，
// 不存额外状态——故关掉页面它照样在长，回来看到的就是该长到的样子。
//
// 为什么用命令式 ref 而非纯 props：下落是基于时间的逐帧动画，塞进 React state 每帧 setState
// 既浪费又难同步；canvas 世界（residents/fallers/drops）放在 useRef 里自管，父页只在「收下」
// 「再请一只」这两个时刻发一条指令。
//
// props:
//   initial: {id,born}[]   挂载时已入住的住客（仅播种一次，后续增减走 drop；兼容老的纯 id 数组）
//   label: string          canvas 的无障碍名（由父页给，跟随语言）
//   paused: boolean        真时停止逐帧绘制（收集卡盖在缸上时用，见下）
// ref API:
//   drop(id, born, onLand) 一颗卵从上方落入缸中，下潜稳住后成为常驻住客并回调 onLand()

// —— 画布几何全部由「当前显示尺寸」实时推导（单位＝CSS px）。
//    以前是写死的 820×580 再靠 CSS 缩放，手机上缸被压得又扁又小、生物细如芝麻；
//    现在缸的边距/圆角/生物大小都是显示尺寸的比例，故任何宽高比都成立。——
function geometry(width, height) {
  const W = Math.max(220, Math.round(width));
  const H = Math.max(180, Math.round(height));
  const pad = Math.min(34, Math.max(10, W * 0.05));
  const JX = pad, JY = pad, JW = W - pad * 2, JH = H - pad * 2;
  return {
    W, H, JX, JY, JW, JH,
    R: Math.min(40, Math.max(14, Math.min(JW, JH) * 0.12)),
    RIM: JY + JH * 0.09,          // 静水面高度
    SW_L: JX + JW * 0.06,         // 住客游动范围
    SW_R: JX + JW * 0.94,
    SW_B: JY + JH * 0.93,
    // 生物大小跟着缸走，占缸的比例基本恒定：小屏不至于把缸塞满，大屏也不会缩成几粒芝麻
    S: Math.min(1.7, Math.max(0.7, W / 560)),
  };
}

// 部件 → Path2D 的编译结果按 glyph 缓存：形状是静态的，没必要每帧重建。
const pathCache = new Map();
function compiled(glyph) {
  let parts = pathCache.get(glyph);
  if (!parts) {
    parts = shapeOf(glyph).map((p) => {
      const path = new Path2D();
      if (p.c) path.arc(p.c[0], p.c[1], p.c[2], 0, Math.PI * 2);
      else path.addPath(new Path2D(p.d));
      return { ...p, path };
    });
    pathCache.set(glyph, parts);
  }
  return parts;
}

// 贴底/扎根的物种落到缸底，其余在水中层游。
const BOTTOM = new Set(["crawl", "anchor"]);

// 大小按物种微调：鲸/魟比小虾大一圈，一缸里才有层次。入水动画要收敛到同一个尺寸，故抽出来共用。
const sizeFactor = (sp) => (sp.rarity === 3 ? 1.15 : sp.rarity === 2 ? 1 : 0.9);

const AquariumTank = forwardRef(function AquariumTank(
  { initial = [], label = "Aquarium", paused = false },
  ref,
) {
  const canvasRef = useRef(null);
  const reduceRef = useRef(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  // 全部 canvas 世界状态放这里，避免触发 React 重渲染。
  // splashX/splashT：入水是「一个点」被砸中，不是整缸一起晃——水面扰动以落点为中心衰减。
  const w = useRef({
    residents: [],
    fallers: [],
    drops: [],
    bubbles: [],
    splash: 0,
    splashX: 0,
    splashT: 0,
    t: 0,
  });
  const g = useRef(geometry(780, 460)); // 首帧前的占位，挂载后立刻被实测值覆盖
  const seedRef = useRef(normalizeCollection(initial));

  // born：入缸时刻，决定它现在是卵/幼体/成体（见 growth）。缺省当成早已入住的成体。
  function spawnResident(id, x, y, born = 0) {
    const sp = speciesById(id);
    if (!sp) return;
    const q = g.current;
    const stage = growthOf(born).stage; // 记住上一帧的阶段，跨过门槛那一下才好做破膜的动静
    // 卵不会游，一律待在缸底（重开页面时也该在底上，而不是悬在水中央）
    const bottom = BOTTOM.has(sp.motion) || stage === STAGE.EGG;
    const swimSpeed = sp.motion === "crawl" ? 0.09 : 0.2;
    w.current.residents.push({
      id,
      born,
      stage,
      glyph: sp.glyph,
      motion: sp.motion,
      size: sizeFactor(sp),
      x: x ?? q.SW_L + Math.random() * (q.SW_R - q.SW_L),
      y:
        y ??
        (bottom
          ? q.SW_B
          : q.RIM + 40 + Math.random() * Math.max(20, q.SW_B - q.RIM - 60)),
      vx:
        sp.motion === "anchor"
          ? 0
          : (Math.random() < 0.5 ? -1 : 1) * (swimSpeed * (0.8 + Math.random() * 0.5)),
      vy: bottom || sp.motion === "drift" ? 0 : (Math.random() - 0.5) * 0.15,
      ph: Math.random() * 6.3,
    });
  }

  // 入水的水花：从落点向两侧上方溅开，故水滴的横速以落点为中心对称展开。
  // 同时记下落点与时刻——水面的凹坑和涟漪都从这里长出来（见 surfaceY）。
  function splashAt(x, y, power = 1) {
    const s = w.current, q = g.current;
    s.splash = power;
    s.splashX = x;
    s.splashT = s.t;
    const n = Math.round(14 * power) + 4;
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1;
      s.drops.push({
        x: x + side * Math.random() * 10 * q.S,
        y: y - 2,
        vx: side * (1.2 + Math.random() * 4.4) * q.S * power,
        vy: (-3.4 - Math.random() * 5.6) * q.S * power,
        r: (1.6 + Math.random() * 2.8) * q.S,
        life: 26 + Math.random() * 16,
      });
    }
    // 被拍进水里的空气：一团气泡随即往上冒
    for (let i = 0; i < 10; i++) {
      s.bubbles.push({
        x: x + (Math.random() - 0.5) * 26 * q.S,
        y: y + (6 + Math.random() * 26) * q.S,
        vy: -(0.5 + Math.random() * 0.9) * q.S,
        r: (1 + Math.random() * 2.4) * q.S,
        life: 34 + Math.random() * 30,
      });
    }
  }

  // 破膜：卵壳裂开时挤出一小团气泡，里面那只弹一下（r.pop 在绘制时衰减）。
  // 这一下是「它长出来了」的唯一提示——没有它，卵会毫无交代地变成一条小鱼。
  function hatch(r) {
    const s = w.current, q = g.current;
    r.pop = 1;
    for (let i = 0; i < 8; i++) {
      s.bubbles.push({
        x: r.x + (Math.random() - 0.5) * 16 * q.S,
        y: r.y - Math.random() * 6 * q.S,
        vy: -(0.4 + Math.random() * 0.8) * q.S,
        r: (0.7 + Math.random() * 1.6) * q.S,
        life: 30 + Math.random() * 26,
      });
    }
  }

  useImperativeHandle(ref, () => ({
    drop(id, born = Date.now(), onLand) {
      const sp = speciesById(id);
      if (!sp) return onLand?.();
      const q = g.current;
      // 落点在缸中段随机，别每次都砸正中间
      const x = q.JX + q.JW * (0.3 + Math.random() * 0.4);
      if (reduceRef.current) {
        spawnResident(id, x, undefined, born);
        return onLand?.();
      }
      const gr = growthOf(born);
      w.current.fallers.push({
        id,
        born,
        // 落下来的是一颗卵——沿途、入水、下潜画的都得是卵，不能空中先长成成体
        glyph: gr.stage === STAGE.EGG ? "egg" : sp.glyph,
        motion: sp.motion,
        phase: "fall",
        p: 0,
        x,
        y: -26 * q.S,
        y0: -26 * q.S,               // 从画布上沿之外落下来，像是被放进缸里
        r0: (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.5),
        rot: 0,
        // 起手比落定后略大（像从更高处掉下来），但跟着阶段缩——一颗卵不该在空中有成体那么大
        size: 34 * gr.scale * q.S,
        rest: 26 * sizeFactor(sp) * gr.scale * q.S,  // 入水后要收敛到的住客尺寸（卵就是小小一颗）
        onLand,
      });
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    // 从 canvas 自身读 CSS 变量：水色等派生 token 定义在页面根（.page-aquarium）上，
    // 自定义属性会继承下来，故从元素读能取到页面级 token，也自动跟随主题/皮肤切换。
    //
    // 但这几个值只在换主题/皮肤时才变，绝不能每帧读：getComputedStyle().getPropertyValue()
    // 在样式脏的时候会强制一次整棵树的同步样式重算。以前每帧要读几十次（每只住客 2 次、
    // 每颗水滴 1 次），平时被浏览器缓存掩盖，一旦有 DOM 变动（比如收集卡挂载）就集中爆发，
    // 表现为「鱼跃出来之后卡一下」。故这里读一次缓存下来，只在主题变化/尺寸变化时刷新。
    const readVar = (name) => getComputedStyle(canvas).getPropertyValue(name).trim();
    const pal = {};
    // 每个物种的一套颜色也在这时算好并缓存（HSL 换算不该进每帧）。
    const tints = new Map();
    function tintOf(id) {
      let c = tints.get(id);
      if (!c) {
        c = creaturePalette(pal.fish, speciesById(id));
        tints.set(id, c);
      }
      return c;
    }
    function readPalette() {
      pal.fish = readVar("--fish") || readVar("--accent-mid") || "#874579";
      pal.glass = readVar("--card2") || readVar("--card");
      pal.water = readVar("--wbot") || readVar("--wtop");
      pal.accent = readVar("--accent");
      pal.line = readVar("--line-tank") || "rgba(160,120,152,.16)";
      tints.clear(); // 主色变了，整缸重新上色
    }
    readPalette();
    // 主题写在 <html data-theme>，皮肤/侧栏等状态写在 body class 上——任一变化都重取一次配色。
    const themeMo = new MutationObserver(readPalette);
    themeMo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class", "style"],
    });
    themeMo.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduceRef.current = mq.matches;
    const onMq = (e) => (reduceRef.current = e.matches);
    mq.addEventListener?.("change", onMq);

    // backing store 跟随显示尺寸 × devicePixelRatio：高清屏不糊，缩放窗口也不拉伸。
    function resize() {
      const rect = canvas.getBoundingClientRect();
      const q = geometry(rect.width, rect.height);
      g.current = q;
      const dpr = Math.min(2.5, window.devicePixelRatio || 1);
      const bw = Math.round(q.W * dpr), bh = Math.round(q.H * dpr);
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      // 改 width/height 会重置上下文状态，故变换在这之后设
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    // 播种已入住的住客（仅一次，且在量好尺寸之后，位置才落在缸里）。
    // 各自的 born 一并带上：上次关页面时还是卵的，这次进来该长多大就多大。
    seedRef.current.forEach((e) => spawnResident(e.id, undefined, undefined, e.born));

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;

    function rr(x, y, wd, ht, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + wd, y, x + wd, y + ht, r);
      ctx.arcTo(x + wd, y + ht, x, y + ht, r);
      ctx.arcTo(x, y + ht, x, y, r);
      ctx.arcTo(x, y, x + wd, y, r);
      ctx.closePath();
    }

    // 水面 = 常态的三层正弦「呼吸」，叠上入水那一下的局部扰动。
    // 扰动不是把整个水面一起抬起来（那看着像整缸在晃），而是：落点被砸出一个凹坑，
    // 凹坑随时间向两侧荡成一圈圈涟漪，且离落点越远越弱。
    function surfaceY(x) {
      const s = w.current, q = g.current;
      const nx = (x - q.JX) / q.JW;
      const a = 4 * q.S;
      let y =
        q.RIM +
        Math.sin(nx * 7 + s.t * 1.5) * a * 0.5 +
        Math.sin(nx * 3.3 - s.t * 1) * a * 0.8 +
        Math.sin(nx * 13 + s.t * 2.4) * a * 0.22;
      if (s.splash > 0.001) {
        const dist = Math.abs(x - s.splashX);
        const fall = dist / (q.JW * 0.3);
        const env = s.splash * Math.exp(-fall * fall);
        const age = s.t - s.splashT;
        // cos 在落点、入水那一刻取 +1（向下＝凹坑），之后相位随距离外移＝波纹扩散
        y += env * 15 * q.S * Math.cos(dist * 0.085 - age * 20);
      }
      return y;
    }

    // 把 24×24 的部件画到缸里：scale 里的 /24 把造型坐标换算成「这只生物在缸中的像素大小」。
    function drawCreature(id, glyph, x, y, rot, scale, flip) {
      const c = tintOf(id);
      const k = scale / 24;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.scale(flip ? -k : k, k);
      ctx.translate(-12, -12);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const p of compiled(glyph)) {
        const color = c[p.role] ?? c.body;
        if (p.op != null) ctx.globalAlpha = p.op;
        if (p.s) {
          ctx.strokeStyle = color;
          ctx.lineWidth = p.s;
          ctx.stroke(p.path);
        } else {
          ctx.fillStyle = color;
          ctx.fill(p.path);
        }
        if (p.op != null) ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    // 一只住客一帧的位移。不同 motion 是不同的活法：游的来回巡、爬的贴着底挪、
    // 水母上下悬浮、珊瑚海草扎在原地摇——一缸东西全都横着游会很假。
    function step(r, q, s) {
      // 卵不会游：沉到缸底待着，只随水轻轻晃——动的是水，不是它。
      if (r.stage === STAGE.EGG) {
        r.y += (q.SW_B - r.y) * 0.03;
        r.x += Math.sin(s.t * 0.6 + r.ph) * 0.06;
        return;
      }
      const bottom = BOTTOM.has(r.motion);
      if (bottom) {
        // 落进缸后慢慢沉到底，再贴着底走
        r.y += (q.SW_B - r.y) * 0.03;
      }
      if (r.motion === "anchor") return;
      if (r.motion === "drift") {
        r.x += r.vx * 0.5;
        r.y += Math.sin(s.t * 0.9 + r.ph) * 0.35;
      } else {
        r.x += r.vx;
        if (!bottom) r.y += r.vy + Math.sin(s.t * 1.1 + r.ph) * 0.09;
      }
      if (r.x < q.SW_L) { r.x = q.SW_L; r.vx = Math.abs(r.vx); }
      if (r.x > q.SW_R) { r.x = q.SW_R; r.vx = -Math.abs(r.vx); }
      if (!bottom) {
        const top = surfaceY(r.x) + 24 * q.S;
        if (r.y < top) { r.y = top; r.vy = Math.abs(r.vy) * 0.5; }
        if (r.y > q.SW_B) { r.y = q.SW_B; r.vy = -Math.abs(r.vy) * 0.5; }
        if (r.motion === "swim" && Math.random() < 0.006) r.vy += (Math.random() - 0.5) * 0.12;
      }
    }

    function frame() {
      raf = requestAnimationFrame(frame);
      // 收集卡盖在缸上时整个画布停画：卡片上面还压着一层满屏 backdrop-filter 模糊，
      // 底下每帧重绘会逼合成器每帧重新模糊一次背景，正是弹卡那一下最贵的开销。
      if (pausedRef.current) return;

      const s = w.current, q = g.current;
      s.t += reduceRef.current ? 0 : 0.016;
      s.splash = Math.max(0, s.splash - 0.013);
      ctx.clearRect(0, 0, q.W, q.H);

      // 玻璃底（扁平单色）
      ctx.save(); rr(q.JX, q.JY, q.JW, q.JH, q.R); ctx.fillStyle = pal.glass; ctx.fill(); ctx.restore();

      // 水（裁剪在缸内，扁平单色，无渐变、无高光）
      ctx.save(); rr(q.JX, q.JY, q.JW, q.JH, q.R); ctx.clip();
      ctx.fillStyle = pal.water;
      ctx.beginPath(); ctx.moveTo(q.JX, q.JY + q.JH);
      for (let x = q.JX; x <= q.JX + q.JW; x += 6) ctx.lineTo(x, surfaceY(x));
      ctx.lineTo(q.JX + q.JW, q.JY + q.JH); ctx.closePath(); ctx.fill();
      // 气泡
      for (let i = 0; i < 5; i++) {
        const bx = q.JX + q.JW * ((i * 0.19 + (s.t * 0.03 * (i + 1)) % 1));
        const by = q.JY + q.JH - ((s.t * 22 * (0.4 + i * 0.15)) % Math.max(40, q.JH - 40));
        ctx.fillStyle = "rgba(255,255,255,.22)"; ctx.beginPath(); ctx.arc(bx, by, (2 + (i % 3)) * q.S, 0, 7); ctx.fill();
      }
      // 住客。阶段每帧从 born 现算（纯函数，无状态），故页面关着的时候它也在长。
      const now = Date.now();
      s.residents.forEach((r) => {
        const gr = growthOf(r.born, now);
        if (gr.stage !== r.stage) {
          if (r.stage === STAGE.EGG) hatch(r); // 破膜那一下：冒一串气泡 + 弹一下
          r.stage = gr.stage;
        }
        if (!reduceRef.current) step(r, q, s);
        const egg = gr.stage === STAGE.EGG;
        // 扎根的随水摇（绕根部转一点），会动的只是身体轻晃；卵只是被水推着晃
        const rot = egg
          ? Math.sin(s.t * 0.8 + r.ph) * 0.16
          : r.motion === "anchor"
            ? Math.sin(s.t * 0.7 + r.ph) * 0.12
            : Math.sin(s.t * 1.6 + r.ph) * 0.05;
        if (r.pop > 0) r.pop = Math.max(0, r.pop - 0.05);
        const size = 26 * r.size * gr.scale * (1 + (r.pop || 0) * 0.3) * q.S;
        drawCreature(
          r.id,
          egg ? "egg" : r.glyph,
          r.x,
          r.y,
          rot,
          size,
          !egg && r.motion !== "anchor" && r.vx < 0,
        );
      });

      // 入水后的下潜段：还没变成住客，但已经在水里了，故画在水的裁剪之内（会被水面挡住）。
      // 一头扎进去 → 被水阻住 → 翻平 → 交接成住客，中间没有任何一帧是突变。
      s.fallers.forEach((F) => {
        if (F.phase !== "dive") return;
        F.vy *= 0.9;                       // 水的阻力
        F.y += F.vy;
        F.x += F.vx;
        F.vx *= 0.94;
        F.rot += (0 - F.rot) * 0.09;       // 从头朝下慢慢翻回横着
        F.size += (F.rest - F.size) * 0.09;
        F.age = (F.age || 0) + 1;
        // 下潜快时拖一串气泡
        if (F.vy > 0.7 * q.S && F.age % 3 === 0) {
          s.bubbles.push({
            x: F.x + (Math.random() - 0.5) * 12 * q.S,
            y: F.y - F.size * 0.2,
            vy: -(0.4 + Math.random() * 0.6) * q.S,
            r: (0.8 + Math.random() * 1.4) * q.S,
            life: 26 + Math.random() * 24,
          });
        }
        drawCreature(F.id, F.glyph, F.x, F.y, F.rot, F.size);
        // 速度掉干净、姿态也回正了，才把它交给住客系统（位置完全承接，不跳）
        if ((F.vy < 0.12 * q.S && Math.abs(F.rot) < 0.05) || F.age > 150) {
          F.done = true;
          spawnResident(F.id, F.x, F.y, F.born);
          F.onLand?.();
        }
      });

      // 气泡：入水拍进去的空气 + 下潜尾迹，边升边微微左右晃
      if (s.bubbles.length) {
        s.bubbles.forEach((b) => {
          b.y += b.vy;
          b.vy *= 0.995;
          b.x += Math.sin(b.y * 0.08) * 0.35;
          b.life--;
          // 升到水面就破了，不该继续飘到水面以上的空气里
          if (b.y - b.r <= surfaceY(b.x)) b.life = 0;
          ctx.globalAlpha = Math.min(0.5, b.life / 30) * 0.55;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
        });
        ctx.globalAlpha = 1;
        s.bubbles = s.bubbles.filter((b) => b.life > 0);
      }
      ctx.restore();

      // 浪花
      if (s.drops.length) {
        ctx.fillStyle = pal.accent;
        s.drops.forEach((d) => {
          d.vy += 0.45 * q.S; d.x += d.vx; d.y += d.vy; d.life--;
          // 落回水面就算融进去了——以前是穿过水面继续往下飞到寿命结束
          if (d.vy > 0 && d.y >= surfaceY(d.x)) d.life = 0;
          ctx.globalAlpha = Math.max(0, d.life / 40);
          ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 7); ctx.fill();
        });
        ctx.globalAlpha = 1;
        s.drops = s.drops.filter((d) => d.life > 0);
      }

      // 下落入水：p² 让它越掉越快（重力感），姿态从随手一扔的倾斜转到入水前的头朝下。
      // 造型头朝右，故 +90° 才是头冲下。画在水的裁剪之外，因为这一段还在缸口上面。
      // 触水的判定用当下起伏的水面（不是静水位），入水时的速度直接带进下潜段——
      // 「砸得越重、扎得越深、水花越大」，这一串因果连上了，入水才不像贴上去的。
      if (s.fallers.length) {
        s.fallers.forEach((F) => {
          if (F.phase !== "fall") return;
          const sy = surfaceY(F.x);
          F.p = Math.min(1, F.p + 0.036);
          const e = F.p;
          const prevY = F.y;
          F.y = F.y0 + (sy - F.y0) * e * e;
          F.rot = F.r0 + (Math.PI / 2 - F.r0) * e;
          drawCreature(F.id, F.glyph, F.x, F.y, F.rot, F.size);
          if (F.y >= sy) {
            const vy = Math.max(2.5 * q.S, F.y - prevY);
            F.phase = "dive";
            F.y = sy;
            F.vy = vy;
            F.vx = (Math.random() - 0.5) * 0.6 * q.S;
            // 水花大小也看它多大一只：一颗卵砸不出一条鲸的动静
            const heft = Math.min(1, Math.max(0.55, F.rest / (26 * q.S)));
            splashAt(F.x, sy, Math.min(1.3, vy / (5 * q.S)) * heft);
          }
        });
        s.fallers = s.fallers.filter((F) => !F.done);
      }

      // 玻璃描边（扁平，无竖向高光）
      ctx.save(); rr(q.JX, q.JY, q.JW, q.JH, q.R); ctx.lineWidth = 3.5; ctx.strokeStyle = pal.line; ctx.stroke(); ctx.restore();
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      themeMo.disconnect();
      mq.removeEventListener?.("change", onMq);
    };
  }, []);

  return <canvas ref={canvasRef} className="aq-canvas" aria-label={label} />;
});

export default AquariumTank;
