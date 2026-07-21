import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { speciesById } from "@/data/aquarium/aquariumData";

// 生态缸：一只用 canvas 画的活水缸。已入住的物种一直在里面慢游；买到新鱼时由父页调用
// 命令式接口播放「跃出 → 顶点 → 潜回」的动画，中途在顶点回调父页弹收集卡。
//
// 为什么用命令式 ref 而非纯 props：跃出/潜回是基于时间的逐帧动画，塞进 React state 每帧
// setState 既浪费又难同步；canvas 世界（residents/leapers/drops）放在 useRef 里自管，父页
// 只在「买鱼」「收下」两个时刻发指令。配色每帧从 CSS 变量读取，故切换主题/皮肤自动跟随。
//
// props:
//   initialKeys: string[]  挂载时已入住的物种 id（仅播种一次，后续增减走 reveal/dive）
// ref API:
//   reveal(id, onApex)     浪花 + 跃出到顶点，到顶点时调用 onApex()
//   dive(id, dir)          从顶点潜回水里，落定后成为常驻住客

// —— 画布几何（backing store 520×680；CSS 负责缩放显示尺寸）——
const W = 520, H = 680;
const JX = 110, JY = 90, JW = 300, JH = 500, R = 54;
const RIM = JY + 46, APEX = JY - 8;
const SW_L = JX + 36, SW_R = JX + JW - 36, SW_B = JY + JH - 30;

const AquariumTank = forwardRef(function AquariumTank({ initialKeys = [] }, ref) {
  const canvasRef = useRef(null);
  const reduceRef = useRef(false);
  // 全部 canvas 世界状态放这里，避免触发 React 重渲染。
  const w = useRef({ residents: [], leapers: [], drops: [], splash: 0, t: 0 });
  const seededRef = useRef(false);

  function spawnResident(glyph, x, y, vy) {
    w.current.residents.push({
      glyph,
      x: x ?? SW_L + Math.random() * (SW_R - SW_L),
      y: y ?? RIM + 60 + Math.random() * (SW_B - RIM - 90),
      vx: (Math.random() < 0.5 ? -1 : 1) * (0.18 + Math.random() * 0.16),
      vy: vy ?? (Math.random() - 0.5) * 0.15,
      ph: Math.random() * 6.3,
    });
  }

  // 播种已入住物种（仅一次；initialKeys 变化不重播，避免动画世界被重置）。
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    initialKeys.forEach((id) => {
      const sp = speciesById(id);
      if (sp) spawnResident(sp.glyph);
    });
  }, [initialKeys]);

  useImperativeHandle(ref, () => ({
    reveal(id, onApex) {
      const sp = speciesById(id);
      if (!sp) return onApex?.();
      const cx = JX + JW / 2;
      const dir = Math.random() < 0.5 ? -1 : 1;
      if (reduceRef.current) return onApex?.();
      w.current.splash = 1;
      for (let i = 0; i < 20; i++) {
        w.current.drops.push({
          x: cx + (Math.random() - 0.5) * JW * 0.5,
          y: RIM - 6,
          vx: (Math.random() - 0.5) * 6.5,
          vy: -5 - Math.random() * 7,
          r: 2 + Math.random() * 3,
          life: 32 + Math.random() * 16,
        });
      }
      setTimeout(() => {
        w.current.leapers.push({
          mode: "rise",
          glyph: sp.glyph,
          p: 0,
          spin: dir * 2.4,
          x0: cx,
          ax: cx + dir * JW * 0.14,
          onApex,
          done: false,
        });
      }, 140);
    },
    dive(id) {
      const sp = speciesById(id);
      if (!sp) return;
      const cx = JX + JW / 2;
      const dir = Math.random() < 0.5 ? -1 : 1;
      if (reduceRef.current) {
        spawnResident(sp.glyph);
        return;
      }
      w.current.leapers.push({
        mode: "dive",
        glyph: sp.glyph,
        p: 0,
        spin: dir * 1.8,
        ax: cx,
        ex: cx + dir * JW * 0.1,
        done: false,
      });
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    // 从 canvas 自身读 CSS 变量：水色等派生 token 定义在页面根（.page-aquarium）上，
    // 自定义属性会继承下来，故从元素读能取到页面级 token，也自动跟随主题/皮肤切换。
    const css = (name) => getComputedStyle(canvas).getPropertyValue(name).trim();
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduceRef.current = mq.matches;
    const onMq = (e) => (reduceRef.current = e.matches);
    mq.addEventListener?.("change", onMq);

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

    function surfaceY(x) {
      const s = w.current;
      const nx = (x - JX) / JW;
      const a = 4 + s.splash * 40;
      return (
        RIM +
        Math.sin(nx * 7 + s.t * 1.5) * a * 0.5 +
        Math.sin(nx * 3.3 - s.t * 1) * a * 0.8 +
        Math.sin(nx * 13 + s.t * 2.4) * a * 0.22 * (0.4 + s.splash)
      );
    }

    function drawCreature(x, y, rot, glyph, scale, color, flip) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.scale((flip ? -1 : 1) * scale, scale);
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      const eye = css("--card");
      if (glyph === "fish") {
        ctx.beginPath(); ctx.ellipse(0, 0, 15, 9, 0, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(24, -7); ctx.lineTo(24, 7); ctx.closePath(); ctx.fill();
        ctx.fillStyle = eye; ctx.beginPath(); ctx.arc(-7, -2, 1.9, 0, 7); ctx.fill();
      } else if (glyph === "jelly") {
        ctx.beginPath(); ctx.arc(0, 0, 12, Math.PI, 0); ctx.lineTo(12, 4); ctx.lineTo(-12, 4); ctx.fill();
        ctx.beginPath(); for (let i = -8; i <= 8; i += 4) { ctx.moveTo(i, 4); ctx.lineTo(i, 15); } ctx.stroke();
      } else if (glyph === "star") {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) { const a = (Math.PI * i) / 5 - Math.PI / 2, rd = i % 2 ? 5 : 14; ctx.lineTo(Math.cos(a) * rd, Math.sin(a) * rd); }
        ctx.closePath(); ctx.fill();
      } else if (glyph === "shell") {
        ctx.beginPath(); ctx.arc(0, 4, 13, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = eye; ctx.beginPath();
        ctx.moveTo(0, -9); ctx.lineTo(0, 4); ctx.moveTo(-7, -6); ctx.lineTo(-4, 4); ctx.moveTo(7, -6); ctx.lineTo(4, 4); ctx.stroke();
      } else if (glyph === "crab") {
        ctx.beginPath(); ctx.ellipse(0, 0, 13, 8, 0, 0, 7); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-11, -2); ctx.lineTo(-20, -8); ctx.moveTo(11, -2); ctx.lineTo(20, -8);
        ctx.moveTo(-9, 6); ctx.lineTo(-15, 12); ctx.moveTo(9, 6); ctx.lineTo(15, 12); ctx.stroke();
      } else if (glyph === "turtle") {
        ctx.beginPath(); ctx.ellipse(0, 0, 14, 10, 0, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(16, -1, 4, 0, 7); ctx.fill();
      } else if (glyph === "seahorse") {
        ctx.beginPath(); ctx.ellipse(0, 0, 7, 15, 0, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(2, -11, 5, 0, 7); ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, 16); ctx.lineTo(0, -2); ctx.moveTo(0, 4); ctx.lineTo(-9, -10); ctx.moveTo(0, 2); ctx.lineTo(9, -12); ctx.stroke();
      }
      ctx.restore();
    }

    function frame() {
      const s = w.current;
      s.t += reduceRef.current ? 0 : 0.016;
      s.splash = Math.max(0, s.splash - 0.011);
      ctx.clearRect(0, 0, W, H);
      const fish = css("--fish") || css("--accent-mid") || "#7d5876";

      // 底部柔影
      ctx.save();
      ctx.fillStyle = "rgba(31,27,75,.10)";
      ctx.beginPath(); ctx.ellipse(JX + JW / 2, JY + JH + 14, JW * 0.42, 16, 0, 0, 7); ctx.fill();
      ctx.restore();

      // 玻璃底
      ctx.save(); rr(JX, JY, JW, JH, R); ctx.fillStyle = css("--card2") || css("--card"); ctx.fill(); ctx.restore();

      // 水（裁剪在缸内）
      ctx.save(); rr(JX, JY, JW, JH, R); ctx.clip();
      const g = ctx.createLinearGradient(0, RIM, 0, JY + JH);
      g.addColorStop(0, css("--wtop")); g.addColorStop(1, css("--wbot"));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(JX, JY + JH);
      for (let x = JX; x <= JX + JW; x += 6) ctx.lineTo(x, surfaceY(x));
      ctx.lineTo(JX + JW, JY + JH); ctx.closePath(); ctx.fill();
      // 水面高光
      ctx.strokeStyle = "rgba(255,255,255,.45)"; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = JX; x <= JX + JW; x += 6) { const y = surfaceY(x); x === JX ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
      // 气泡
      for (let i = 0; i < 5; i++) {
        const bx = JX + JW * ((i * 0.19 + (s.t * 0.03 * (i + 1)) % 1));
        const by = JY + JH - ((s.t * 22 * (0.4 + i * 0.15)) % (JH - 40));
        ctx.fillStyle = "rgba(255,255,255,.22)"; ctx.beginPath(); ctx.arc(bx, by, 2 + (i % 3), 0, 7); ctx.fill();
      }
      // 住客游动
      s.residents.forEach((r) => {
        if (!reduceRef.current) {
          r.x += r.vx; r.y += r.vy + Math.sin(s.t * 1.1 + r.ph) * 0.09;
          if (r.x < SW_L) { r.x = SW_L; r.vx = Math.abs(r.vx); }
          if (r.x > SW_R) { r.x = SW_R; r.vx = -Math.abs(r.vx); }
          const top = surfaceY(r.x) + 24;
          if (r.y < top) { r.y = top; r.vy = Math.abs(r.vy) * 0.5; }
          if (r.y > SW_B) { r.y = SW_B; r.vy = -Math.abs(r.vy) * 0.5; }
          if (Math.random() < 0.006) r.vy += (Math.random() - 0.5) * 0.12;
        }
        drawCreature(r.x, r.y, Math.sin(s.t * 1.6 + r.ph) * 0.05, r.glyph, 0.8, fish, r.vx < 0);
      });
      ctx.restore();

      // 浪花
      s.drops.forEach((d) => {
        d.vy += 0.45; d.x += d.vx; d.y += d.vy; d.life--;
        ctx.fillStyle = css("--accent"); ctx.globalAlpha = Math.max(0, d.life / 40);
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      });
      s.drops = s.drops.filter((d) => d.life > 0);

      // 跃出 / 潜回
      s.leapers.forEach((L) => {
        if (L.mode === "rise") {
          L.p += 0.02; const e = L.p;
          const x = L.x0 + (L.ax - L.x0) * e;
          const y = RIM - (RIM - APEX) * Math.sin((e * Math.PI) / 2);
          drawCreature(x, y, e * L.spin, L.glyph, 1.15, fish, L.spin < 0);
          if (L.p >= 1 && !L.done) { L.done = true; L.onApex?.(); }
        } else {
          L.p += 0.028; const e = L.p;
          const x = L.ax + (L.ex - L.ax) * e;
          const y = APEX + (RIM + 40 - APEX) * e * e;
          drawCreature(x, y, L.spin * (1 - e), L.glyph, 1.15, fish, L.spin < 0);
          if (L.p >= 1 && !L.done) { L.done = true; spawnResident(L.glyph, L.ex, RIM + 40, 1); }
        }
      });
      s.leapers = s.leapers.filter((L) => L.p < 1);

      // 玻璃描边 + 竖向高光
      ctx.save(); rr(JX, JY, JW, JH, R); ctx.lineWidth = 3.5; ctx.strokeStyle = css("--line-tank") || "rgba(160,120,152,.16)"; ctx.stroke(); ctx.clip();
      const gl = ctx.createLinearGradient(JX, 0, JX + JW, 0);
      gl.addColorStop(0, "rgba(255,255,255,.22)"); gl.addColorStop(0.16, "rgba(255,255,255,0)");
      gl.addColorStop(0.84, "rgba(255,255,255,0)"); gl.addColorStop(1, "rgba(255,255,255,.12)");
      ctx.fillStyle = gl; ctx.fillRect(JX, JY, JW, JH); ctx.restore();

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      mq.removeEventListener?.("change", onMq);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      className="aq-canvas"
      aria-label="生态缸"
    />
  );
});

export default AquariumTank;
