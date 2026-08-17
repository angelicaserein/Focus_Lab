// 生态缸的「物理层」—— 缸里那些规则本身：缸有多大、水面在哪、一只住客这一帧往哪挪、
// 手和水波怎么影响它。全是纯函数，不认识 canvas、不认识 React。
//
// 为什么从 AquariumTank.jsx 里拆出来：那边是一整套逐帧动画，画笔（ctx）、主题取色、
// 指针事件、命令式 ref 全挤在一个 useEffect 的闭包里。规则和画笔混在一起时，
// 「鱼会不会被推出缸壁」「卵会不会游」这类问题只能靠肉眼盯着缸看半分钟才敢下结论。
// 拆开之后画笔仍留在组件里（它离不开 ctx），规则这一半可以直接喂假数据跑（见 aquariumSim.test.js）。
//
// 约定：这里的函数普遍**原地改** r（一只住客）和 s（缸的世界状态），不返回新对象——
// 每帧几十只生物，逐帧建新对象只会喂垃圾回收。q 是几何（geometry 的结果），只读。
import { STAGE, feedBorn } from "@/data/aquarium/growth";

// —— 画布几何全部由「当前显示尺寸」实时推导（单位＝CSS px）。
//    以前是写死的 820×580 再靠 CSS 缩放，手机上缸被压得又扁又小、生物细如芝麻；
//    现在缸的边距/圆角/生物大小都是显示尺寸的比例，故任何宽高比都成立。——
export function geometry(width, height) {
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

// 贴底/扎根的物种落到缸底，其余在水中层游。
export const BOTTOM = new Set(["crawl", "anchor"]);

// 大小按物种微调：鲸/魟比小虾大一圈，一缸里才有层次。入水动画要收敛到同一个尺寸，故抽出来共用。
export const sizeFactor = (sp) => (sp.rarity === 3 ? 1.15 : sp.rarity === 2 ? 1 : 0.9);

// —— 可互动：撒饵与指针 ——
// 缸不该只是一段循环播放的动画：手放上去要有回应，点一下要有后果。四条规则，各只有一句话：
//   点水面   → 撒下几粒饵，闻到的游过来吃掉（吃完那一下弹一下、吐个泡）
//   点水里   → 那一点荡开一圈水波，波前扫过谁就把谁轻轻推开一点
//   按住一只 → 拎起来跟着手走；松手按手速甩出去，举出水面松手它会掉回水里、溅一次水花
//              缸是敞口的：从缸口提上来就能拎到页面任何地方，在缸外松手它自己蹦回缸里。
//   指针在水里 → 慢慢挪，好奇的跟过来；划得快，就是搅了水，四散躲开
// 几者共用同一个手势（按下-移动-松开），分岔只看「按下时手底下有没有东西」「点得深不深」
// 和「手有多快」——不需要工具栏、不需要模式切换，手上的力度和落点就是语义。
//
// 饵只从水面撒：以前不管点哪儿都从水面掉饵，于是点缸中间会看到「饵凭空出现在头顶」，
// 因果对不上，读起来就是一团乱。现在深水那一点属于水波，喂食归水面，两件事各有各的落点。
export const FOOD_MAX = 24;          // 撒太多会变成一屏噪点，也让「围过来」失去指向
export const FOOD_PER_TAP = 4;
export const FOOD_LIFE = 14 * 60;    // 帧；没被吃掉的饵会慢慢化掉，缸底不会积成一层
export const FOOD_COLOR = "#e0a75f"; // 暖褐一点的颗粒：明暗主题下都读得出是「吃的」，也不跟主色抢
export const SENSE_R = 260;          // 闻到饵的半径（× q.S）
export const REACH_R = 9;            // 到嘴边的距离
export const TOUCH_R = 150;          // 指针的影响半径
export const SWIPE_V = 6;            // 指针速度超过这个就算「搅水」，改为受惊躲开
export const CHASE_MAX = 1.15;       // 追饵/躲手的最高速度，免得越加越快甩出缸
export const FEED_BAND = 30;         // 离水面这么近（× q.S）算「点在水面上」＝撒饵，更深就是荡水波
export const RIPPLE_R = 190;         // 一圈水波能荡多远（× q.S）
export const RIPPLE_LIFE = 52;       // 帧；波荡完就没了，不会一直推着鱼
export const RIPPLE_EDGE = 34;       // 波前的厚度（× q.S）：只有被波前扫到的那一刻才被推
export const RIPPLE_PUSH = 0.16;     // 推力上限，轻轻一下——是「让开」，不是「炸开」

// 水面 = 常态的三层正弦「呼吸」，叠上入水那一下的局部扰动。
// 扰动不是把整个水面一起抬起来（那看着像整缸在晃），而是：落点被砸出一个凹坑，
// 凹坑随时间向两侧荡成一圈圈涟漪，且离落点越远越弱。
// 帧循环要用，缸外的指针事件（撒饵得落在当下起伏的水面上）也要用。
export function surfaceAt(x, s, q) {
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

/** 这一点在不在缸壁围出来的水里（缸外的指针不撒饵、不荡波） */
export const inTank = (p, q) =>
  p.x > q.JX && p.x < q.JX + q.JW && p.y > q.JY && p.y < q.JY + q.JH;

// 抓起一只：命中判定用它这一帧真正画出来的大小（r.dsize），故鲸好抓、樱花虾得点准——
// 判定圈和眼睛看到的一样大，抓不中的时候你能看出来为什么。重叠时取最近的那只。
export function grabAt(p, s, q) {
  let hit = null, best = Infinity;
  for (const r of s.residents) {
    const d = Math.hypot(p.x - r.x, p.y - r.y);
    const reach = Math.max(15 * q.S, (r.dsize || 26 * q.S) * 0.62);
    if (d < reach && d < best) { best = d; hit = r; }
  }
  return hit;
}

// 一只住客对「缸外那只手」的反应，每帧先于 step 跑一遍：
//   有饵     朝最近那粒加速过去，到嘴边就吃掉（底栖的只捡沉到底的那几粒——它们不会浮上来抢）
//   没饵但有手 慢＝好奇（靠过来但留一点距离），快＝搅水（掉头躲开）
//   都没有   速度收敛回它自己的巡游节奏
// onFeed(uid) 是「谁吃到了」的汇报口：缸不碰存档，成长进度怎么记由父页决定。
// 返回是否在「被牵动」状态：是的话 step 让位给这里算出来的速度。
export function seek(r, q, s, onFeed) {
  // 卵没法游，扎根的走不了——它们不参与追逐（缸里本来就该有几样不为所动的东西）
  if (r.stage === STAGE.EGG || r.motion === "anchor") return false;
  const bottom = BOTTOM.has(r.motion);
  const near = bottom ? q.SW_B - 26 * q.S : -Infinity;

  let target = null, best = Infinity;
  for (const f of s.food) {
    if (f.y < near) continue;
    const d = Math.hypot(f.x - r.x, f.y - r.y);
    if (d < best && d < SENSE_R * q.S) { best = d; target = f; }
  }

  let ax = 0, ay = 0;
  if (target) {
    if (best < REACH_R * q.S) {
      target.eaten = true;
      r.pop = 0.8;                    // 吃到那一下弹一下——没有这个反馈，饵就只是凭空消失
      // 还在长的那只吃到饵，就往前赶一点进度：缸里这份自己算（下一帧就该更大一点），
      // 存档那份交给父页——两边用的是同一个 feedBorn，故不会喂着喂着对不上。
      if (r.stage !== STAGE.ADULT) {
        r.born = feedBorn(r.born);
        if (r.uid) onFeed?.(r.uid);
      }
      s.bubbles.push({
        x: r.x, y: r.y - 4 * q.S,
        vy: -(0.4 + Math.random() * 0.6) * q.S,
        r: (0.7 + Math.random() * 1.2) * q.S,
        life: 24 + Math.random() * 18,
      });
    } else {
      ax = ((target.x - r.x) / best) * 0.055;
      ay = ((target.y - r.y) / best) * 0.055;
    }
  } else if (s.ptr.on) {
    const dx = s.ptr.x - r.x, dy = s.ptr.y - r.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < TOUCH_R * q.S) {
      const w8 = 1 - d / (TOUCH_R * q.S);   // 越近反应越强
      if (s.ptr.v > SWIPE_V) {
        ax = (-dx / d) * 0.09 * w8;         // 搅水：往反方向窜
        ay = (-dy / d) * 0.09 * w8;
      } else if (d > 42 * q.S) {
        ax = (dx / d) * 0.03 * w8;          // 好奇：跟过来，但停在一小段距离外
        ay = (dy / d) * 0.03 * w8;
      }
    }
  }

  if (!ax && !ay) {
    // 松开之后不是急刹，是慢慢回到自己的速度（掉头也就在这几十帧里完成）
    if (!r.chase) return false;
    r.chase = Math.max(0, r.chase - 1);
    const sgn = Math.sign(r.vx) || 1;
    r.vx = sgn * (Math.abs(r.vx) + (r.cruise - Math.abs(r.vx)) * 0.06);
    r.vy *= 0.94;
    return r.chase > 0;
  }

  r.vx += ax;
  if (!bottom) r.vy += ay;
  const sp = Math.hypot(r.vx, r.vy);
  const cap = CHASE_MAX * q.S;
  if (sp > cap) { r.vx = (r.vx / sp) * cap; r.vy = (r.vy / sp) * cap; }
  r.chase = 26; // 手离开/饵吃完后，再按这个速度多走一会儿才收敛回巡游
  return true;
}

// 水波推开：波前扫到谁，就顺着「远离波心」的方向轻轻推一把。
// 只在波前那一层厚度里给力（不是「圈内所有鱼一起被吹走」），故看上去是波把鱼推开，
// 而不是鱼在躲一个看不见的点。推完把 chase 撑住几十帧，让它顺着这股劲滑一段再收敛回巡游。
export function shove(r, q, s) {
  if (!s.ripples.length || r.motion === "anchor" || r.stage === STAGE.EGG) return;
  const edge = RIPPLE_EDGE * q.S;
  for (const k of s.ripples) {
    const dx = r.x - k.x, dy = r.y - k.y;
    const d = Math.hypot(dx, dy) || 1;
    const front = Math.abs(d - k.r);
    if (d > k.max || front > edge) continue;
    // 离波前越近、离波心越近、波越新，推得越明显
    const f = (1 - front / edge) * (1 - d / k.max) * k.power * RIPPLE_PUSH * q.S;
    r.vx += (dx / d) * f;
    r.vy += (dy / d) * f;
    r.chase = Math.max(r.chase, 45);
  }
  const sp = Math.hypot(r.vx, r.vy), cap = CHASE_MAX * q.S;
  if (sp > cap) { r.vx = (r.vx / sp) * cap; r.vy = (r.vy / sp) * cap; }
}

// 一只住客一帧的位移。不同 motion 是不同的活法：游的来回巡、爬的贴着底挪、
// 水母上下悬浮、珊瑚海草扎在原地摇——一缸东西全都横着游会很假。
export function step(r, q, s, driven) {
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
  // 被饵/手牵动时一律按算出来的速度走：这一刻它有明确的去处，
  // 平时那套「水母只上下悬浮、鱼带正弦晃」的巡游节律得让位，否则看着像一边走神一边追。
  if (driven) {
    r.x += r.vx;
    if (!bottom) r.y += r.vy;
  } else if (r.motion === "drift") {
    r.x += r.vx * 0.5;
    r.y += Math.sin(s.t * 0.9 + r.ph) * 0.35;
  } else {
    r.x += r.vx;
    if (!bottom) r.y += r.vy + Math.sin(s.t * 1.1 + r.ph) * 0.09;
  }
  if (r.x < q.SW_L) { r.x = q.SW_L; r.vx = Math.abs(r.vx); }
  if (r.x > q.SW_R) { r.x = q.SW_R; r.vx = -Math.abs(r.vx); }
  if (!bottom) {
    const top = surfaceAt(r.x, s, q) + 24 * q.S;
    if (r.y < top) { r.y = top; r.vy = Math.abs(r.vy) * 0.5; }
    if (r.y > q.SW_B) { r.y = q.SW_B; r.vy = -Math.abs(r.vy) * 0.5; }
    if (r.motion === "swim" && Math.random() < 0.006) r.vy += (Math.random() - 0.5) * 0.12;
  }
}
