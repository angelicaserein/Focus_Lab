import React, { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls, useAnimations } from "@react-three/drei";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { Box3, Vector3 } from "three";
import { useTodos } from "../../context/TodoContext";
import TodoApp from "../../components/TodoApp";
import ErrorBoundary from "../../components/ErrorBoundary";
import pusheenGlb from "../../../assets/model/pusheen_-_im_busy.glb?url";
import "./Focus.css";

const webglFallback = (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      color: "rgba(255,255,255,0.5)",
      fontSize: "13px",
    }}
  >
    3D 模型加载失败（WebGL 不可用）
  </div>
);

function PusheenModel({ animEnabled }) {
  const { scene, animations } = useGLTF(pusheenGlb);
  // useGLTF returns a shared, cached scene that the animation mixer mutates in
  // place. Clone it per-mount so each entry into the immersive view starts from
  // a fresh, un-posed copy — otherwise <Center> re-measures a leftover pose and
  // the model appears shifted on re-entry.
  const clonedScene = useMemo(() => cloneSkeleton(scene), [scene]);
  // The model's geometry is authored off-origin (its bounding-box center sits at
  // roughly (-4.6, 0.8, 1.4) in local space). Measure that center and offset the
  // model by its negative so it sits at the origin. We do this explicitly rather
  // than via <Center>, which mis-measures this skinned mesh and leaves it off to
  // one side.
  const centerOffset = useMemo(() => {
    const box = new Box3().setFromObject(clonedScene);
    return box.getCenter(new Vector3()).multiplyScalar(-1).toArray();
  }, [clonedScene]);

  const groupRef = useRef();
  const { actions } = useAnimations(animations, groupRef);

  useEffect(() => {
    const all = Object.values(actions);
    if (animEnabled) {
      all.forEach((a) => a?.reset().play());
    } else {
      all.forEach((a) => a?.stop());
    }
  }, [animEnabled, actions]);

  // Keep the model's own center on the world origin (which is also the
  // OrbitControls pivot) so it rotates in place around itself. We do NOT
  // translate it up here — doing so would move its center off the pivot and make
  // it swing. Vertical framing is handled by the camera (see CameraRig).
  return (
    <group scale={1.18}>
      <group position={centerOffset}>
        <group ref={groupRef}>
          <primitive object={clonedScene} />
        </group>
      </group>
    </group>
  );
}

// Lifts the framing so the model sits in the upper-center of the screen, using a
// camera view offset (lens shift). Unlike moving the model, this does not touch
// the orbit pivot, so the model still rotates around its own center.
function CameraRig({ verticalShift = 0.16 }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  useEffect(() => {
    // Positive offsetY shifts the frustum down, so the centered model renders
    // higher on screen. width/height stay full → this is a pure lens shift.
    camera.setViewOffset(
      size.width,
      size.height,
      0,
      size.height * verticalShift,
      size.width,
      size.height,
    );
    camera.updateProjectionMatrix();
    return () => {
      camera.clearViewOffset();
      camera.updateProjectionMatrix();
    };
  }, [camera, size.width, size.height, verticalShift]);

  return null;
}

const MAX_SECS = 25 * 60;

export default function FocusPage() {
  const {
    todos,
    focusedTodoIds,
    removeFocusTodo,
    clearFocusTodos,
    toggleTodo,
    addFocusRecord,
  } = useTodos();
  const selectedTodos = useMemo(
    () => todos.filter((t) => focusedTodoIds.includes(t.id)),
    [todos, focusedTodoIds],
  );
  const hasSelection = selectedTodos.length > 0;

  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isImmersive, setIsImmersive] = useState(false);
  const sessionStartRef = React.useRef(null);
  const sessionIdRef = React.useRef(null);
  const [debugMode, setDebugMode] = useState(false);
  const [debugProgress, setDebugProgress] = useState(0.5);
  const [animEnabled, setAnimEnabled] = useState(true);
  const [cardVisible, setCardVisible] = useState(true);

  // 选中集合清空时（手动清除 / 任务都被结算）：归零并退出沉浸
  useEffect(() => {
    if (!hasSelection) {
      setSeconds(0);
      setIsRunning(false);
      setIsImmersive(false);
      sessionStartRef.current = null;
      sessionIdRef.current = null;
    }
  }, [hasSelection]);

  useEffect(() => {
    if (!isRunning) return undefined;
    const id = window.setInterval(() => setSeconds((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [isRunning]);

  const handleStart = () => {
    if (!hasSelection) return;
    sessionStartRef.current = Date.now();
    sessionIdRef.current = crypto.randomUUID();
    setIsRunning(true);
    setIsImmersive(true);
  };

  const handleTogglePause = () => {
    setIsRunning((r) => !r);
  };

  const handleReset = () => {
    setSeconds(0);
    setIsRunning(false);
    sessionStartRef.current = null;
  };

  // 就地结算单个任务：记一条带结果的记录并移出本次专注
  const settleTask = (todo, outcome) => {
    addFocusRecord({
      taskId: todo.id,
      taskText: todo.text,
      durationSecs: seconds,
      startedAt: sessionStartRef.current ?? Date.now() - seconds * 1000,
      sessionId: sessionIdRef.current,
      outcome,
    });
    if (outcome === "completed" && !todo.completed) toggleTodo(todo.id);
    removeFocusTodo(todo.id);
  };

  const handleStop = () => {
    // 对仍在集合中的任务统一以「结束」结算（settleTask 内部依赖当前 seconds）
    selectedTodos.forEach((t) => settleTask(t, "ended"));
    sessionStartRef.current = null;
    sessionIdRef.current = null;
    setIsRunning(false);
    setSeconds(0);
    setIsImmersive(false);
    clearFocusTodos();
  };

  const progress = Math.min(seconds / MAX_SECS, 1);
  const displayProgress = debugMode ? debugProgress : progress;

  return (
    <>
      {/* ── Immersive overlay (fixed, covers everything incl. sidebar) ── */}
      {isImmersive && (
        <div className="immersive-overlay">
          {/* 3D model — full screen */}
          <div className="immersive-model-area">
            <ErrorBoundary fallback={webglFallback}>
              <Canvas camera={{ position: [0, 0, 6], fov: 45 }} gl={{ alpha: true }} style={{ background: "transparent" }}>
                <ambientLight intensity={1.5} />
                <directionalLight position={[5, 8, 5]} intensity={2} />
                <directionalLight position={[-5, 3, -3]} intensity={0.8} color="#d5c0d0" />
                <pointLight position={[0, 4, 2]} intensity={1} color="#e0cedd" />
                <CameraRig verticalShift={0.16} />
                <Suspense fallback={null}>
                  <PusheenModel animEnabled={animEnabled} />
                </Suspense>
                <OrbitControls
                  target={[0, 0, 0]}
                  enableZoom={false}
                  enablePan={false}
                  maxPolarAngle={Math.PI / 1.6}
                  minPolarAngle={Math.PI / 4}
                />
              </Canvas>
            </ErrorBoundary>
          </div>

          {/* Frosted glass card — floating overlay, hidden by default */}
          <div className={`immersive-card-wrap ${cardVisible ? "visible" : ""}`}>
            <div className="immersive-card">
              <div className="immersive-eyebrow">
                <span className={`immersive-status-dot ${isRunning ? "running" : ""}`} />
                {isRunning ? "专注中" : "已暂停"}
                <span className="immersive-time">
                  {String(Math.floor(seconds / 60)).padStart(2, "0")}:
                  {String(seconds % 60).padStart(2, "0")}
                </span>
              </div>

              {selectedTodos.length > 0 ? (
                <ul className="immersive-task-list">
                  {selectedTodos.map((todo) => (
                    <li key={todo.id} className="immersive-task-row">
                      <button
                        type="button"
                        className="immersive-task-check"
                        onClick={() => settleTask(todo, "completed")}
                        aria-label={`完成 ${todo.text}`}
                        title="标记完成"
                      >
                        ✓
                      </button>
                      <span className="immersive-task-text">{todo.text}</span>
                      <button
                        type="button"
                        className="immersive-task-remove"
                        onClick={() => settleTask(todo, "removed")}
                        aria-label={`从本次专注移除 ${todo.text}`}
                        title="移出本次专注"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="immersive-task">请选择一个任务</div>
              )}

              <div className="immersive-flask">
                <svg viewBox="0 0 80 130" width="100" height="163" aria-hidden="true">
                  <defs>
                    <clipPath id="imm-clip">
                      <path d="M 26,16 L 26,44 L 6,112 Q 6,128 40,128 Q 74,128 74,112 L 54,44 L 54,16 Z" />
                    </clipPath>
                  </defs>
                  <rect
                    x="0" y={128 * (1 - displayProgress)} width="80" height="128"
                    clipPath="url(#imm-clip)" fill="var(--accent)"
                  />
                  <path
                    d="M 26,16 L 26,44 L 6,112 Q 6,128 40,128 Q 74,128 74,112 L 54,44 L 54,16 Z"
                    fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"
                  />
                  <path
                    d="M 28,20 L 28,44 L 10,106"
                    fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round"
                  />
                  <rect
                    x="24" y="0" width="32" height="17" rx="5"
                    fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"
                  />
                </svg>
              </div>

              <div className="immersive-actions">
                <button
                  className="immersive-btn primary"
                  type="button"
                  onClick={handleTogglePause}
                >
                  {isRunning ? "暂停" : "继续"}
                </button>
                <button
                  className="immersive-btn ghost"
                  type="button"
                  onClick={handleReset}
                >
                  重置
                </button>
                <button
                  className="immersive-btn ghost"
                  type="button"
                  onClick={handleStop}
                >
                  结束专注
                </button>
              </div>
            </div>
          </div>

          {/* ── Debug tweaks (fixed bottom-right corner) ── */}
          {import.meta.env.DEV && (
            <div className="immersive-tweaks">
              {debugMode && (
                <div className="tweaks-panel">
                  <div className="tweaks-label">
                    <span>专注时长</span>
                    <span className="tweaks-val">
                      {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="tweaks-divider" />
                  <div className="tweaks-label">
                    <span>液体进度</span>
                    <span className="tweaks-val">{Math.round(debugProgress * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0" max="1" step="0.01"
                    value={debugProgress}
                    onChange={(e) => setDebugProgress(Number(e.target.value))}
                    className="tweaks-slider"
                  />
                  <div className="tweaks-divider" />
                  <button
                    type="button"
                    className={`tweaks-anim-toggle ${cardVisible ? "active" : ""}`}
                    onClick={() => setCardVisible((v) => !v)}
                  >
                    <span className="tweaks-anim-dot" />
                    {cardVisible ? "关闭卡片" : "打开卡片"}
                  </button>
                  <button
                    type="button"
                    className={`tweaks-anim-toggle ${animEnabled ? "active" : ""}`}
                    onClick={() => setAnimEnabled((v) => !v)}
                  >
                    <span className="tweaks-anim-dot" />
                    模型动画：{animEnabled ? "开" : "关"}
                  </button>
                </div>
              )}
              <button
                type="button"
                className={`tweaks-toggle ${debugMode ? "active" : ""}`}
                onClick={() => setDebugMode((d) => !d)}
              >
                调试
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Normal view (stacked: timer console on top, task list below) ── */}
      <div className="page-focus">
        <div className="focus-shell">
          {/* Top: timer console */}
          <div className="focus-card">
            <div className="focus-card-header">
              <span className="card-label">
                已选任务
                {hasSelection && (
                  <span className="focus-count">{selectedTodos.length}</span>
                )}
              </span>
              <button
                type="button"
                className="clear-focus"
                onClick={handleStop}
                disabled={!hasSelection}
              >
                清除
              </button>
            </div>

            {hasSelection ? (
              <div className="focus-chip-list">
                {selectedTodos.map((todo) => (
                  <span key={todo.id} className="focus-chip">
                    <span className="focus-chip-text">{todo.text}</span>
                    <button
                      type="button"
                      className="focus-chip-remove"
                      onClick={() => removeFocusTodo(todo.id)}
                      aria-label={`移除 ${todo.text}`}
                      title="移除"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div className="focus-task-placeholder">
                请从下方任务列表勾选要一起专注的任务（可多选）
              </div>
            )}

            <div className="focus-actions">
              <button
                className="focus-action-btn primary"
                type="button"
                onClick={handleStart}
                disabled={!hasSelection}
              >
                ▶ 开始专注
              </button>
              <button
                className="focus-action-btn secondary"
                type="button"
                onClick={handleReset}
                disabled={!hasSelection || seconds === 0}
              >
                重置
              </button>
            </div>
          </div>

          {/* Bottom: task management (add / filter / edit / delete) */}
          <div className="focus-todos">
            <TodoApp />
          </div>
        </div>
      </div>
    </>
  );
}
