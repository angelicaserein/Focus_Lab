import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { speciesById } from "@/data/aquarium/aquariumData";
import { shapeOf } from "@/data/aquarium/creatureShapes";
import { creaturePalette } from "@/data/aquarium/creaturePalette";
import { STAGE, growthOf, normalizeCollection } from "@/data/aquarium/growth";
// 缸里的规则（缸多大、水面在哪、一只住客这一帧往哪挪）全在 aquariumSim —— 纯函数、可单测。
// 这个文件只留画笔与手：canvas 绘制、指针事件、命令式 ref。
import {
  BOTTOM, FEED_BAND, FOOD_COLOR, FOOD_LIFE, FOOD_MAX, FOOD_PER_TAP,
  RIPPLE_LIFE, RIPPLE_R,
  geometry, grabAt, inTank, seek, shove, sizeFactor, step, surfaceAt,
} from "./aquariumSim";

// 生态缸：一只用 canvas 画的活水缸。已入住的物种一直在里面慢游；新鱼由父页调用命令式接口
// 「从上面扔进来」。缸是可以上手的：点水面撒饵、点水里荡开一圈波把鱼推开（见下方「可互动」）。
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
//   initial: {uid,id,born}[]  挂载时已入住的住客（仅播种一次，后续增减走 drop；兼容老的纯 id 数组）
//   label: string             canvas 的无障碍名（由父页给，跟随语言）
//   paused: boolean           真时停止逐帧绘制（收集卡盖在缸上时用，见下）
//   onFeed(uid): void         某一只吃到一粒饵。缸不碰存档，只汇报「谁吃到了」，
//                             要不要换成成长进度由父页决定（见 growth.feedResident）
// ref API:
//   drop(rec, onLand)         一颗卵（rec = {uid,id,born}）从上方落入缸中，
//                             下潜稳住后成为常驻住客并回调 onLand()
//   remove(uid)               把这一只从缸里抹掉（调试面板删除用；缸不碰存档，删档由父页做）

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

const AquariumTank = forwardRef(function AquariumTank(
  { initial = [], label = "Aquarium", paused = false, onFeed },
  ref,
) {
  const canvasRef = useRef(null);
  // 手上那层：一张铺满视口、完全穿透（pointer-events:none）的画布，专画「已经不在缸里的东西」——
  // 被拎出去的那只、它滴的水、以及往回蹦的那条弧线。缸自己的画布画不到缸外，故另起一层。
  const handRef = useRef(null);
  const reduceRef = useRef(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  // 帧循环挂载时就闭包定型了，故回调走 ref：父页每次重渲染换了新函数，这里也拿得到最新那个
  const feedRef = useRef(onFeed);
  feedRef.current = onFeed;
  // 全部 canvas 世界状态放这里，避免触发 React 重渲染。
  // splashX/splashT：入水是「一个点」被砸中，不是整缸一起晃——水面扰动以落点为中心衰减。
  const w = useRef({
    residents: [],
    fallers: [],
    drops: [],
    odrops: [],    // 拎到缸外时滴的水：画在手上那层（满屏）画布，故不会被缸的边界切掉
    bubbles: [],
    food: [],
    ripples: [],   // 点在水里荡开的那几圈波（见 rippleAt）
    // 指针：位置 + 这一动有多快（v 决定是「好奇」还是「受惊」），idle 用来在手停下后放开它们；
    // grab 是此刻被拎在手里的那只住客（gx/gy 是按下时抓住的那一点相对它中心的偏移）
    ptr: { x: 0, y: 0, v: 0, on: false, idle: 0, grab: null, gx: 0, gy: 0 },
    splash: 0,
    splashX: 0,
    splashT: 0,
    t: 0,
  });
  const g = useRef(geometry(780, 460)); // 首帧前的占位，挂载后立刻被实测值覆盖
  const seedRef = useRef(normalizeCollection(initial));

  // born：入缸时刻，决定它现在是卵/幼体/成体（见 growth）。缺省当成早已入住的成体。
  // uid：存档里那一只的身份，喂到饵时要报上去（同物种可以养好几只，各长各的）。
  function spawnResident(id, x, y, born = 0, uid) {
    const sp = speciesById(id);
    if (!sp) return;
    const q = g.current;
    const stage = growthOf(born).stage; // 记住上一帧的阶段，跨过门槛那一下才好做破膜的动静
    // 卵不会游，一律待在缸底（重开页面时也该在底上，而不是悬在水中央）
    const bottom = BOTTOM.has(sp.motion) || stage === STAGE.EGG;
    const swimSpeed = sp.motion === "crawl" ? 0.09 : 0.2;
    // 巡游速度记下来：追完饵、躲完手之后要收敛回它自己的节奏，而不是一直保持冲刺
    const cruise = swimSpeed * (0.8 + Math.random() * 0.5);
    w.current.residents.push({
      id,
      uid,
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
      vx: sp.motion === "anchor" ? 0 : (Math.random() < 0.5 ? -1 : 1) * cruise,
      vy: bottom || sp.motion === "drift" ? 0 : (Math.random() - 0.5) * 0.15,
      cruise,
      chase: 0,
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

  // 点在水里的那一下：以落点为心荡开一圈水波。波是有波前的——一圈环向外扩，
  // 扫过谁才推谁一下（见 shove），而不是整片水域里的鱼一起被吸走。
  // 顺手冒两三个小气泡：手指戳进水里总要带点空气进去，这也是「戳到的是水」的证据。
  function rippleAt(x, y) {
    const s = w.current, q = g.current;
    s.ripples.push({
      x, y,
      r: 6 * q.S,
      sp: 4.6 * q.S,   // 扩散速度，逐帧衰减：起手快、后面缓，像真的一圈波
      max: RIPPLE_R * q.S,
      age: 0,
      life: RIPPLE_LIFE,
      power: 1,
    });
    for (let i = 0; i < 3; i++) {
      s.bubbles.push({
        x: x + (Math.random() - 0.5) * 14 * q.S,
        y: y + Math.random() * 6 * q.S,
        vy: -(0.4 + Math.random() * 0.7) * q.S,
        r: (0.8 + Math.random() * 1.4) * q.S,
        life: 30 + Math.random() * 24,
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

  // —— 指针：坐标换算到 canvas 的 CSS px（backing store 的缩放不参与，画布世界用的就是 CSS px）——
  function toLocal(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  // 按下去：先看有没有抓到一只——抓鱼和撒饵是同一个手势的两种落点，
  // 点在鱼身上就是「拎起它」，点在空水里才是「撒点饵」。
  function onPointerDown(e) {
    if (pausedRef.current) return;
    const s = w.current, q = g.current;
    const p = toLocal(e);
    if (!inTank(p, q)) return;

    const hit = grabAt(p, s, q);
    if (hit) {
      s.ptr.grab = hit;
      // 抓住的是被点中的那一点，不是它的中心——鱼不会在按下的瞬间跳到指尖底下
      s.ptr.gx = hit.x - p.x;
      s.ptr.gy = hit.y - p.y;
      s.ptr.x = p.x; s.ptr.y = p.y; s.ptr.on = true; s.ptr.idle = 0;
      hit.air = false;
      hit.ret = null;   // 半路被接住：那条回缸的弧线就此作废，从手上重新算
      hit.chase = 0;
      // 指针捕获：拖出画布不脱手，且这一串事件（含最后的 click）全部只发给缸——
      // 所以拎着鱼从别的按钮上面划过去，按不到、也不会点到任何东西。
      canvasRef.current.setPointerCapture?.(e.pointerId);
      canvasRef.current.classList.add("aq-dragging");
      document.body.classList.add("aq-grabbing"); // 缸外那段也要是「攥着」的手势
      return;
    }

    // 减少动效时既不撒饵也不荡波：那种模式下住客本来就不游，饵撒下去没人来吃，只会在缸底堆着
    if (reduceRef.current) return;

    // 点得深不深，决定这一下是喂食还是搅水。水面那一条窄带（含水面之上的缸口）才是饵的入口；
    // 点到水中间就只是碰了水——荡开一圈波把附近的鱼推开。
    const sy = surfaceAt(p.x, s, q);
    if (p.y > sy + FEED_BAND * q.S) {
      rippleAt(p.x, p.y);
      return;
    }

    if (s.food.length >= FOOD_MAX) return;
    for (let i = 0; i < FOOD_PER_TAP; i++) {
      s.food.push({
        x: p.x + (Math.random() - 0.5) * 26 * q.S,
        y: sy + Math.random() * 4 * q.S,
        vx: (Math.random() - 0.5) * 0.25 * q.S,
        vy: (0.25 + Math.random() * 0.25) * q.S,
        r: (1.5 + Math.random() * 1.3) * q.S,
        ph: Math.random() * 6.3,
        life: FOOD_LIFE,
      });
    }
    splashAt(p.x, sy, 0.34); // 一点点动静：手指戳水，不是一条鱼砸进来
  }

  function onPointerMove(e) {
    if (pausedRef.current) return;
    const s = w.current, q = g.current;
    const p = toLocal(e);
    // 手里拎着一只时，划出缸外也要继续记位置——否则一拖到边上鱼就脱手停住了
    const inside = inTank(p, q);
    if (!inside && !s.ptr.grab) { s.ptr.on = false; return; }
    const d = Math.hypot(p.x - s.ptr.x, p.y - s.ptr.y);
    // 速度取「这一动的位移」，再和上一帧混一下：单帧抖动不至于被读成搅水
    s.ptr.v = s.ptr.on ? s.ptr.v * 0.6 + d * 0.4 : 0;
    s.ptr.x = p.x;
    s.ptr.y = p.y;
    // 手已经在缸外了就不再牵动缸里的住客：隔着页面把鱼吸过来说不通
    s.ptr.on = inside;
    s.ptr.idle = 0;
  }

  // 松手：手最后那一下的速度就是它被甩出去的速度（有上限，别甩穿缸壁），
  // 之后按这个速度冲一会儿再收敛回自己的巡游节奏（chase 的倒计时）。
  // 在水面之上松手＝它得自己掉回水里（air），落水那一下照样溅水花——拎出水面是有后果的。
  function onPointerUp(e) {
    const s = w.current, q = g.current;
    const r = s.ptr.grab;
    canvasRef.current?.classList.remove("aq-dragging");
    document.body.classList.remove("aq-grabbing");
    releaseCapture(e);
    if (!r) return;
    s.ptr.grab = null;
    const cap = 3.2 * q.S;
    const sp = Math.hypot(r.vx, r.vy);
    if (sp > cap) { r.vx = (r.vx / sp) * cap; r.vy = (r.vy / sp) * cap; }
    r.chase = 70;
    // 在缸外松手：给它一条回缸的弧线（见 returnHome）。落点在缸中段随机，
    // 免得每次都从同一个点掉回去。减少动效时不演这段，直接放回水里。
    if (!inTank(r, q)) {
      const x1 = q.JX + q.JW * (0.3 + Math.random() * 0.4);
      if (reduceRef.current) {
        r.x = x1;
        r.y = surfaceAt(x1, s, q) + 18 * q.S;
        r.vx = 0; r.vy = 0;
        return;
      }
      const dist = Math.hypot(x1 - r.x, q.RIM - r.y);
      r.ret = {
        x0: r.x, y0: r.y, x1, y1: q.RIM,
        p: 0,
        dur: Math.min(64, Math.max(26, dist / 13)),
        arc: Math.min(140, 40 + dist * 0.18) * q.S,
      };
      r.vx = x1 > r.x ? 1 : -1; // 朝着去处的方向（绘制时的朝向看的就是 vx 的正负）
      r.air = false;
      return;
    }
    if (r.y < surfaceAt(r.x, s, q)) {
      // 减少动效时不演这段自由落体，直接把它放回水里
      if (reduceRef.current) r.y = surfaceAt(r.x, s, q) + 26 * q.S;
      else r.air = true;
    }
  }

  // 没捕获过的 pointerId 直接 release 会抛 NotFoundError，故先问一句
  function releaseCapture(e) {
    const c = canvasRef.current;
    if (c?.hasPointerCapture?.(e.pointerId)) c.releasePointerCapture(e.pointerId);
  }

  const onPointerLeave = () => {
    // 拎着东西时鼠标划出画布不算松手（有 pointer capture，事件还会回来）
    if (w.current.ptr.grab) return;
    w.current.ptr.on = false;
  };

  // 触屏/异常中断：等同于就地松手
  const onPointerCancel = (e) => {
    onPointerUp(e);
    w.current.ptr.on = false;
  };

  useImperativeHandle(ref, () => ({
    drop(rec, onLand) {
      const { id, uid, born = Date.now() } = rec || {};
      const sp = speciesById(id);
      if (!sp) return onLand?.();
      const q = g.current;
      // 落点在缸中段随机，别每次都砸正中间
      const x = q.JX + q.JW * (0.3 + Math.random() * 0.4);
      if (reduceRef.current) {
        spawnResident(id, x, undefined, born, uid);
        return onLand?.();
      }
      const gr = growthOf(born);
      w.current.fallers.push({
        id,
        uid,
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
    // 删掉某一只：住客、正在落下的那颗卵都算。留一串气泡当作「它不在了」的交代，
    // 不然缸里会有一只凭空消失。手里正拎着的那只被删了要先脱手，否则帧循环还在拖一个幽灵。
    remove(uid) {
      const s = w.current, q = g.current;
      if (!uid) return;
      const gone = s.residents.find((r) => r.uid === uid);
      if (gone) {
        for (let i = 0; i < 8; i++) {
          s.bubbles.push({
            x: gone.x + (Math.random() - 0.5) * 16 * q.S,
            y: gone.y - Math.random() * 6 * q.S,
            vy: -(0.4 + Math.random() * 0.8) * q.S,
            r: (0.7 + Math.random() * 1.6) * q.S,
            life: 26 + Math.random() * 24,
          });
        }
      }
      if (s.ptr.grab?.uid === uid) s.ptr.grab = null;
      s.residents = s.residents.filter((r) => r.uid !== uid);
      // 还在半空/下潜的那颗：标记完成并放掉 onLand，免得父页的 busy 永远解不开
      s.fallers.forEach((F) => {
        if (F.uid !== uid || F.done) return;
        F.done = true;
        F.onLand?.();
      });
      s.fallers = s.fallers.filter((F) => !F.done);
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const hctx = handRef.current?.getContext("2d") || null;
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

    // 缸在视口里的位置与像素比。「手上那层」每帧都要用它把自己对齐到缸上，
    // 但这几个数只在布局 / 滚动 / 缩放时才变——每帧现读 getBoundingClientRect
    // 等于每帧强制同步一次布局，偏偏拖拽那一下最吃帧。故量好存着，变了再更新。
    const view = { left: 0, top: 0, vw: 0, vh: 0, dpr: 1 };

    // backing store 跟随显示尺寸 × devicePixelRatio：高清屏不糊，缩放窗口也不拉伸。
    function resize() {
      const rect = canvas.getBoundingClientRect();
      const q = geometry(rect.width, rect.height);
      g.current = q;
      const dpr = Math.min(2.5, window.devicePixelRatio || 1);
      view.left = rect.left;
      view.top = rect.top;
      view.vw = window.innerWidth;
      view.vh = window.innerHeight;
      view.dpr = dpr;
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
    seedRef.current.forEach((e) =>
      spawnResident(e.id, undefined, undefined, e.born, e.uid),
    );

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    // ResizeObserver 只管尺寸；滚动时缸的尺寸没变、位置变了，手上那层同样要跟着挪。
    window.addEventListener("scroll", resize, { passive: true, capture: true });

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

    const surfaceY = (x) => surfaceAt(x, w.current, g.current);

    // 水滴的一帧：缸里那些画在缸的画布上，缸外那些画在手上那层——同一套物理，
    // 只有「落回水面算融进去」的判定差一点：缸外的还得真落在缸的横向范围内才算，
    // 否则在半空中就凭空消失了。返回还活着的那些。
    function stepDrops(list, c, q, needOverTank) {
      c.fillStyle = pal.accent;
      list.forEach((d) => {
        d.vy += 0.45 * q.S; d.x += d.vx; d.y += d.vy; d.life--;
        const overTank = !needOverTank || (d.x > q.JX && d.x < q.JX + q.JW);
        if (d.vy > 0 && overTank && d.y >= surfaceY(d.x)) d.life = 0;
        c.globalAlpha = Math.max(0, d.life / 40);
        c.beginPath(); c.arc(d.x, d.y, d.r, 0, 7); c.fill();
      });
      c.globalAlpha = 1;
      return list.filter((d) => d.life > 0);
    }

    // 把 24×24 的部件画到缸里：scale 里的 /24 把造型坐标换算成「这只生物在缸中的像素大小」。
    // 目标上下文由调用方给：缸里那些画进 ctx，被拎出去的那只画进手上那层 hctx（坐标系同一套）。
    function drawCreature(cx, id, glyph, x, y, rot, scale, flip) {
      const c = tintOf(id);
      const k = scale / 24;
      cx.save();
      cx.translate(x, y);
      cx.rotate(rot);
      cx.scale(flip ? -k : k, k);
      cx.translate(-12, -12);
      cx.lineCap = "round";
      cx.lineJoin = "round";
      for (const p of compiled(glyph)) {
        const color = c[p.role] ?? c.body;
        if (p.op != null) cx.globalAlpha = p.op;
        if (p.s) {
          cx.strokeStyle = color;
          cx.lineWidth = p.s;
          cx.stroke(p.path);
        } else {
          cx.fillStyle = color;
          cx.fill(p.path);
        }
        if (p.op != null) cx.globalAlpha = 1;
      }
      cx.restore();
    }

    // 被拎在手里的那一只：跟手，但留一点滞后——像拎着一条会挣的鱼，而不是拖一个图标。
    // 每帧的实际位移记进 vx/vy，松手时甩出去的就是它。
    //
    // 缸是敞口的：四面是玻璃，上面没有盖。还在缸里的那只被玻璃挡着（x 夹在两壁之间、
    // 不越缸底）；一旦被提过缸口（y < JY），它就不再受任何约束，能拎到页面任何地方——
    // 故「拿出来」是一个有出口的动作（从上面提），而不是随便一拖就穿墙漏出去。
    // 约束只看它上一帧在哪，不看手在哪，所以进出缸口时位置是连续的，不会突然被吸回缸里。
    function dragged(r, q, s) {
      const m = 10 * q.S;
      let tx = s.ptr.x + s.ptr.gx;
      let ty = s.ptr.y + s.ptr.gy;
      if (inTank(r, q)) {
        tx = Math.min(q.JX + q.JW - m, Math.max(q.JX + m, tx));
        ty = Math.min(q.SW_B, ty);
      }
      const nx = r.x + (tx - r.x) * 0.35;
      const ny = r.y + (ty - r.y) * 0.35;
      r.vx = nx - r.x;
      r.vy = ny - r.y;
      r.x = nx;
      r.y = ny;
      // 被举出水面的那只往下滴水：这是「它离开水了」唯一看得见的证据。
      // 拎到缸外时水滴也得跟出去，故这几滴走手上那层画布（见 outside/hand）。
      if (!reduceRef.current && r.y < surfaceY(r.x) && Math.random() < 0.22) {
        const drop = {
          x: r.x + (Math.random() - 0.5) * 10 * q.S,
          y: r.y + 4 * q.S,
          vx: (Math.random() - 0.5) * 0.5 * q.S,
          vy: 0.7 * q.S,
          r: (1 + Math.random() * 1.3) * q.S,
          life: 40,
        };
        (inTank(r, q) ? s.drops : s.odrops).push(drop);
      }
    }

    // 在缸外松手：它自己顺着一条弧线蹦回缸里，落水溅一朵花。
    // 不管你把它放到页面哪个角落，结局都一样——「拎出去」是个可逆的动作，不会把谁弄丢，
    // 也不会在缸外留下任何东西。（不做自由落体：从屏幕下半页松手的话，它会一路掉出视野。）
    function returnHome(r, q, s) {
      const k = r.ret;
      k.p = Math.min(1, k.p + 1 / k.dur);
      const e = k.p;
      r.x = k.x0 + (k.x1 - k.x0) * e;
      r.y = k.y0 + (k.y1 - k.y0) * e - k.arc * Math.sin(Math.PI * e);
      if (k.p < 1) return;
      r.ret = null;
      const sy = surfaceY(r.x);
      r.x = k.x1;
      r.y = sy + 18 * q.S;
      r.vx = 0;
      r.vy = 0;
      r.chase = 40; // 回来之后先自己冲一小段，再收敛回巡游：不是「啪」地归位
      splashAt(r.x, sy, 0.8);
    }

    // 在水面之上松手之后：自由落体，落回水面时按当下速度溅一次水花，然后回到住客的活法。
    function fallBack(r, q, s) {
      r.vy += 0.5 * q.S;
      r.x += r.vx;
      r.y += r.vy;
      r.x = Math.min(q.SW_R, Math.max(q.SW_L, r.x));
      const sy = surfaceY(r.x);
      if (r.y >= sy) {
        r.air = false;
        r.y = sy;
        splashAt(r.x, sy, Math.min(1.1, Math.max(0.4, r.vy / (5 * q.S))));
        r.vy *= 0.35;
      }
    }

    // —— 手上那层 ——
    // 平时它是空的（一张全透明、不吃事件的画布），只有手里拎着东西、或者有谁正往回蹦时才画。
    // 坐标系跟缸的画布完全一致：这一层按 canvas 在视口里的位置整体平移，故 r.x/r.y 不用换算，
    // 一只生物从缸里被提到缸外，中间没有任何一次坐标跳变。
    let handOn = false;
    function openHand() {
      const hc = handRef.current;
      if (!hc || !hctx) return null;
      const { left, top, vw, vh, dpr } = view;
      const bw = Math.round(vw * dpr), bh = Math.round(vh * dpr);
      if (hc.width !== bw || hc.height !== bh) { hc.width = bw; hc.height = bh; }
      hctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      hctx.clearRect(0, 0, vw, vh);
      hctx.translate(left, top);
      handOn = true;
      return hctx;
    }
    // 收手：只在「上一帧还画着东西」时清一次，平时这层完全不动（不占每帧开销）
    function closeHand() {
      if (!handOn) return;
      hctx?.setTransform(1, 0, 0, 1, 0, 0);
      hctx?.clearRect(0, 0, handRef.current?.width || 0, handRef.current?.height || 0);
      handOn = false;
    }

    function frame() {
      raf = requestAnimationFrame(frame);
      // 收集卡盖在缸上时整个画布停画：卡片上面还压着一层满屏 backdrop-filter 模糊，
      // 底下每帧重绘会逼合成器每帧重新模糊一次背景，正是弹卡那一下最贵的开销。
      if (pausedRef.current) { closeHand(); return; }

      const s = w.current, q = g.current;
      // 这一帧有没有东西在缸外：拎着的那只、往回蹦的那些、还在滴的水
      const hand =
        s.ptr.grab || s.odrops.length || s.residents.some((r) => r.ret)
          ? openHand()
          : (closeHand(), null);
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
      // 指针：pointermove 不来就说明手停住了，速度自然归零（否则「刚才划得快」会一直判为搅水）。
      // 停久了当作手已经不在（触屏抬手后没有 leave 事件）。
      s.ptr.v *= 0.82;
      if (s.ptr.on && ++s.ptr.idle > 90) s.ptr.on = false;

      // 饵：沉下去、左右晃、慢慢化掉。画在水的裁剪之内，故沉到底也不会画到缸外。
      if (s.food.length) {
        ctx.fillStyle = FOOD_COLOR;
        s.food.forEach((f) => {
          f.y = Math.min(q.SW_B + 4 * q.S, f.y + f.vy);
          f.x += f.vx + Math.sin(s.t * 1.2 + f.ph) * 0.22;
          f.vx *= 0.98;
          f.life--;
          ctx.globalAlpha = Math.min(1, f.life / 90) * 0.9;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill();
        });
        ctx.globalAlpha = 1;
        s.food = s.food.filter((f) => f.life > 0 && !f.eaten);
      }

      // 水波：一圈圈往外扩、越扩越淡。画在鱼之前（波在水里，鱼在波上面游），
      // 两道环差一小段半径＝波前后面还跟着一圈余波，比单独一个圆更像水。
      if (s.ripples.length) {
        ctx.strokeStyle = pal.accent;
        s.ripples.forEach((k) => {
          k.age++;
          k.r = Math.min(k.max, k.r + k.sp);
          k.sp *= 0.965;
          k.power = Math.max(0, 1 - k.age / k.life);
          for (const off of [0, 20 * q.S]) {
            const rad = k.r - off;
            if (rad <= 2) continue;
            ctx.globalAlpha = k.power * (off ? 0.13 : 0.3);
            ctx.lineWidth = (off ? 1.1 : 2) * q.S;
            ctx.beginPath(); ctx.arc(k.x, k.y, rad, 0, 7); ctx.stroke();
          }
        });
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1;
        s.ripples = s.ripples.filter((k) => k.power > 0);
      }

      // 住客。阶段每帧从 born 现算（纯函数，无状态），故页面关着的时候它也在长。
      const now = Date.now();
      s.residents.forEach((r) => {
        const gr = growthOf(r.born, now);
        if (gr.stage !== r.stage) {
          if (r.stage === STAGE.EGG) hatch(r); // 破膜那一下：冒一串气泡 + 弹一下
          r.stage = gr.stage;
        }
        // 手里那只、正蹦回缸的那只、掉回水里那只、和过自己日子的那只，四种走法互斥
        const held = r === s.ptr.grab;
        if (held) dragged(r, q, s);
        else if (r.ret) returnHome(r, q, s);
        else if (r.air) fallBack(r, q, s);
        else if (!reduceRef.current) {
          // 先被水波推一把，再走这一帧：推力进的是 vx/vy，故 seek 收敛的就是被推之后的速度
          shove(r, q, s);
          // 「谁吃到了饵」经 feedRef 报给父页——seek 是纯函数，不认识组件的 ref
          step(r, q, s, seek(r, q, s, feedRef.current));
        }
        const egg = gr.stage === STAGE.EGG;
        // 离了水就扑腾得凶（频率高、幅度大），在水里被拎着只是别扭地扭两下
        const airborne = held || r.air || !!r.ret;
        const outOfWater = airborne && r.y < surfaceY(r.x);
        const rot = airborne
          ? egg
            ? Math.sin(s.t * 2 + r.ph) * 0.2                      // 卵不会挣，只是被拎着晃
            : Math.sin(s.t * (outOfWater ? 24 : 11) + r.ph) * (outOfWater ? 0.4 : 0.16)
          : egg
            ? Math.sin(s.t * 0.8 + r.ph) * 0.16
            // 扎根的随水摇（绕根部转一点），会动的只是身体轻晃；卵只是被水推着晃
            : r.motion === "anchor"
              ? Math.sin(s.t * 0.7 + r.ph) * 0.12
              : Math.sin(s.t * 1.6 + r.ph) * 0.05;
        if (r.pop > 0) r.pop = Math.max(0, r.pop - 0.05);
        // 拎起来的那只稍微大一点：手里有东西，得看得出来
        const size =
          26 * r.size * gr.scale * (1 + (r.pop || 0) * 0.3) * (held ? 1.12 : 1) * q.S;
        r.dsize = size; // 命中判定用的就是这个（见 grabAt）
        // 拎着的和正蹦回来的走手上那层：缸的画布画不出缸外，画在这儿它才能跑到页面上去。
        // 顺带也就不受水的裁剪，故举到缸口之上时不会被缸壁切掉半截。
        drawCreature(
          (held || r.ret) && hand ? hand : ctx,
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
        drawCreature(ctx, F.id, F.glyph, F.x, F.y, F.rot, F.size);
        // 速度掉干净、姿态也回正了，才把它交给住客系统（位置完全承接，不跳）
        if ((F.vy < 0.12 * q.S && Math.abs(F.rot) < 0.05) || F.age > 150) {
          F.done = true;
          spawnResident(F.id, F.x, F.y, F.born, F.uid);
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

      // 浪花（落回水面就算融进去了——以前是穿过水面继续往下飞到寿命结束）
      if (s.drops.length) s.drops = stepDrops(s.drops, ctx, q, false);

      // 缸外滴的水：画在手上那层，故能一路滴到页面上；没落在缸口上的在半路淡掉，缸外不留痕迹。
      if (s.odrops.length && hand) {
        s.odrops = stepDrops(s.odrops, hand, q, true);
      } else if (s.odrops.length) {
        s.odrops = []; // 没有手上那层可画（理论上不会发生），也不能让它们越积越多
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
          drawCreature(ctx, F.id, F.glyph, F.x, F.y, F.rot, F.size);
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
      document.body.classList.remove("aq-grabbing"); // 拎着东西时被卸载，别把手势留在 body 上
      ro.disconnect();
      window.removeEventListener("scroll", resize, { capture: true });
      themeMo.disconnect();
      mq.removeEventListener?.("change", onMq);
    };
  }, []);

  // 事件挂在 canvas 上，处理函数只写 ref 里的画布世界——不触发任何一次 React 重渲染。
  // 手上那层挂到 body 上（portal）：缸在卡片里，卡片有圆角和 overflow，留在原地会被裁掉；
  // 它 pointer-events:none，故只是一层画，接不到任何事件、也挡不住任何按钮。
  return (
    <>
      <canvas
        ref={canvasRef}
        className="aq-canvas"
        aria-label={label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onPointerCancel={onPointerCancel}
      />
      {createPortal(
        <canvas ref={handRef} className="aq-hand" aria-hidden="true" />,
        document.body,
      )}
    </>
  );
});

export default AquariumTank;
