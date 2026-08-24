import React, { useId } from "react";
import usePrefs from "@/hooks/common/usePrefs";
import useFlaskShelf from "@/hooks/flask/useFlaskShelf";
import { buildFlask } from "@/pages/Focus/flaskShapes";

// 烧瓶进度图：液面高度随 progress（0~1）上升。
//
// 拆成两层是因为桌宠窗：它和主窗口同源，多挂一个 usePrefs 就会让桌宠也往共享的
// localStorage 里回写一份挂载时读到的偏好，主窗口刚改过的形状会被它盖回去。
// FlaskGraphic 是纯图形，形状只认传进来的 params；FocusFlask 在外面补一层
// 「没传 params 就用设置页存的形状」，给应用内的页面用。

const BASE_Y = 128; // 瓶底，与 flaskShapes 的坐标系一致

export function FlaskGraphic({ progress = 0, params, hitLayer = false, drainToNeck = false }) {
  const { path, highlight, cap } = buildFlask(params);
  // 每个实例独立的 id：设置页会同时渲染多个烧瓶，共用 id 会互相错切
  const uid = useId();
  const clipId = `${uid}-clip`;
  const liquidId = `${uid}-liquid`;
  const glassId = `${uid}-glass`;
  const meniscusId = `${uid}-meniscus`;

  const p = Math.min(Math.max(progress, 0), 1);
  // 液柱整体做成一块固定的矩形，靠 translateY 推上来。
  // 直接改 rect 的 y 属性也行，但那样没法用 CSS transition 平滑过渡。
  //
  // drainToNeck：水往瓶口那头退，而不是往瓶底退。
  // 给桌宠倒瓶子用的——瓶身整个转了 180°，屏幕上的「下」就是瓶子的「上」，
  // 不翻这个方向的话水会顺着瓶底往上升出去，跟倒水正好相反。
  // 两边同时翻（瓶子转、液柱反向）在屏幕坐标里恰好互相抵消：
  // 看起来就是玻璃绕着一摊不动的水转过去，然后水才从瓶口漏下去。
  const dir = drainToNeck ? -1 : 1;
  const drop = BASE_Y * (1 - p) * dir;
  // 液面永远在液柱「靠空气」的那一头：正着是顶边，倒过来是底边
  const GLOW = 9; // 弯液面高光往液体里晕开的厚度
  // 细线往液体里缩半个线宽，免得一半描在液柱外面显得虚
  const surfaceY = drainToNeck ? BASE_Y - 0.45 : 0.45;
  const glowY = drainToNeck ? BASE_Y - GLOW : 0;

  return (
    <div className="immersive-flask">
      <svg viewBox="0 0 80 130" width="100" height="163" aria-hidden="true">
        <defs>
          <clipPath id={clipId}>
            <path d={path} />
          </clipPath>
          {/* 液体：底部稍深、靠近液面稍亮，纯色块会显得很死。
              整体调浅（主色兑白）——满瓶的实底主色太重，一排瓶子摆在架上像一堵墙，
              而且瓶里封着的标本会被压得看不清。两个色标都可被外部 CSS 变量覆盖。 */}
          <linearGradient id={liquidId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0"
              stopColor="var(--flask-liquid-top, color-mix(in srgb, var(--accent) 52%, #fff))"
              stopOpacity="1"
            />
            <stop
              offset="1"
              stopColor="var(--flask-liquid-bot, color-mix(in srgb, var(--accent) 72%, #fff))"
              stopOpacity="0.86"
            />
          </linearGradient>
          {/* 玻璃：左上受光、右下留一点厚度感。
              三个色标都可被外部 CSS 变量覆盖——应用内是深色卡片，用浅色玻璃；
              桌宠飘在别人的壁纸上，得换成深色烟熏玻璃才在白底上看得见。 */}
          <linearGradient id={glassId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--flask-glass-top, rgba(255,255,255,0.14))" />
            <stop offset="0.55" stopColor="var(--flask-glass-mid, rgba(255,255,255,0.04))" />
            <stop offset="1" stopColor="var(--flask-glass-bot, rgba(255,255,255,0.10))" />
          </linearGradient>
          {/* 弯液面的高光：连续渐变，不是叠两条硬边的白条——
              硬边在液体上会读成一道「条纹」，而水面只该是一层渐隐的亮。
              倒瓶时液面在下边，渐变方向也跟着翻。 */}
          <linearGradient
            id={meniscusId} x1="0" x2="0"
            y1={drainToNeck ? "1" : "0"} y2={drainToNeck ? "0" : "1"}
          >
            <stop offset="0" stopColor="#fff" stopOpacity="0.34" />
            <stop offset="0.35" stopColor="#fff" stopOpacity="0.1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 瓶身的玻璃色只铺在液体后面当背板。要是盖在液体上面，
            深色玻璃会把进度色压成一坨脏颜色——所以填充在下、描边在上。 */}
        <path className="flask-glass" d={path} fill={`url(#${glassId})`} />

        {/* clip 与位移必须分两层：clip-path 跟着同一元素的 transform 一起走，
            写在一层上液面会把裁剪框一起带上去，瓶壁就漏了。 */}
        <g clipPath={`url(#${clipId})`}>
          <g className="flask-liquid" style={{ transform: `translateY(${drop}px)` }}>
            <rect x="0" y="0" width="80" height={BASE_Y} fill={`url(#${liquidId})`} />
            {/* 液面：一层渐隐的高光 + 贴边的一根细线，让「涨到哪儿了」有个明确的边 */}
            {p > 0.004 && (
              <>
                <rect x="0" y={glowY} width="80" height={GLOW} fill={`url(#${meniscusId})`} />
                <line
                  x1="0" x2="80" y1={surfaceY} y2={surfaceY}
                  stroke="#fff" strokeOpacity="0.4" strokeWidth="0.9"
                />
              </>
            )}
          </g>
        </g>

        <path
          className="flask-outline" d={path}
          fill="none" stroke="var(--flask-stroke, rgba(255,255,255,0.45))"
          strokeWidth="1.5" strokeLinejoin="round"
        />
        <path
          className="flask-highlight" d={highlight}
          fill="none" stroke="var(--flask-highlight, rgba(255,255,255,0.22))"
          strokeWidth="2.5" strokeLinecap="round"
        />
        {/* 瓶塞：偏透明的玻璃塞，仅比瓶身略实一点，保持通透质感 */}
        <path
          className="flask-cap" d={cap}
          fill={`url(#${glassId})`} stroke="var(--flask-stroke, rgba(255,255,255,0.5))"
          strokeWidth="1.2" strokeLinejoin="round"
        />

        {hitLayer && (
          // 桌宠专用：一份不上色的轮廓副本，只用来做命中判定（见 PetApp.css）。
          // 描边加宽是给指针留的余量——正好贴着瓶壁的话，边缘一像素之差就点空。
          <>
            <path className="flask-hit" d={path} strokeWidth="12" strokeLinejoin="round" />
            <path className="flask-hit" d={cap} strokeWidth="12" strokeLinejoin="round" />
          </>
        )}
      </svg>
    </div>
  );
}

// 应用内使用：形状优先取烧瓶架上选中的那只——那就是「我这次要往里注水的瓶子」，
// 专注页自然该画它；架子空着时退回设置页调的形状。传入 params 可覆盖（用于设置页预览）。
export default function FocusFlask({ progress, params }) {
  const { flaskShape } = usePrefs();
  const { activeParams } = useFlaskShelf();
  return <FlaskGraphic progress={progress} params={params ?? activeParams ?? flaskShape.params} />;
}
