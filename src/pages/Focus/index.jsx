import React, { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { useGLTF, OrbitControls, Center, useAnimations } from "@react-three/drei";
import { useTodos } from "../../context/TodoContext";
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

  return (
    <Center>
      <group ref={groupRef}>
        <primitive object={scene} />
      </group>
    </Center>
  );
}

const MAX_SECS = 25 * 60;

export default function FocusPage() {
  const { todos, focusedTodoId, setFocusTodo, clearFocusTodo, addFocusRecord } = useTodos();
  const selectedTodo = useMemo(
    () => todos.find((t) => t.id === focusedTodoId),
    [todos, focusedTodoId],
  );

  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isImmersive, setIsImmersive] = useState(false);
  const sessionStartRef = React.useRef(null);
  const [debugMode, setDebugMode] = useState(false);
  const [debugProgress, setDebugProgress] = useState(0.5);
  const [animEnabled, setAnimEnabled] = useState(true);
  const [cardVisible, setCardVisible] = useState(false);

  useEffect(() => {
    if (!selectedTodo) {
      setSeconds(0);
      setIsRunning(false);
      setIsImmersive(false);
    }
  }, [selectedTodo]);

  useEffect(() => {
    if (!isRunning) return undefined;
    const id = window.setInterval(() => setSeconds((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [isRunning]);

  const handleSelect = (id) => {
    setFocusTodo(id);
    setSeconds(0);
    setIsRunning(false);
    setIsImmersive(false);
  };

  const handleStart = () => {
    if (!selectedTodo) return;
    sessionStartRef.current = Date.now();
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

  const handleStop = () => {
    if (seconds > 0 && selectedTodo) {
      addFocusRecord({
        taskId: selectedTodo.id,
        taskText: selectedTodo.text,
        durationSecs: seconds,
        startedAt: sessionStartRef.current ?? Date.now() - seconds * 1000,
      });
    }
    sessionStartRef.current = null;
    setIsRunning(false);
    setSeconds(0);
    setIsImmersive(false);
    clearFocusTodo();
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
              <Canvas camera={{ position: [0, 0.5, 6], fov: 45 }} gl={{ alpha: true }} style={{ background: "transparent" }}>
                <ambientLight intensity={1.5} />
                <directionalLight position={[5, 8, 5]} intensity={2} />
                <directionalLight position={[-5, 3, -3]} intensity={0.8} color="#d5c0d0" />
                <pointLight position={[0, 4, 2]} intensity={1} color="#e0cedd" />
                <Suspense fallback={null}>
                  <PusheenModel animEnabled={animEnabled} />
                </Suspense>
                <OrbitControls
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
              </div>
              <div className="immersive-task">
                {selectedTodo?.text ?? "请选择一个任务"}
              </div>

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

      {/* ── Normal view ── */}
      <div className="page-focus">
        <div className="focus-shell">
          {/* Left: task picker */}
          <div className="focus-left">
            <div className="focus-headline">
              <h1>专注</h1>
            </div>

            <div className="task-selector">
              {todos.length === 0 ? (
                <div className="empty-state-card">
                  还没有任务，请先返回 Home 添加你要专注的内容。
                </div>
              ) : (
                todos.map((todo) => (
                  <button
                    key={todo.id}
                    type="button"
                    className={`task-pill ${todo.id === focusedTodoId ? "selected" : ""}`}
                    onClick={() => handleSelect(todo.id)}
                  >
                    <div className="task-pill-title">{todo.text}</div>
                    <div className="task-pill-meta">
                      {todo.completed ? "✓ 已完成" : "待处理"}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right: timer console */}
          <div className="focus-right">
            <div className="focus-card">
              <div className="focus-card-header">
                <span className="card-label">当前任务</span>
                <button
                  type="button"
                  className="clear-focus"
                  onClick={handleStop}
                  disabled={!selectedTodo}
                >
                  清除
                </button>
              </div>

              {selectedTodo ? (
                <div className="focus-task-name">{selectedTodo.text}</div>
              ) : (
                <div className="focus-task-placeholder">
                  尚未选择任务 — 请从左侧选择一个开始专注
                </div>
              )}


              <div className="focus-actions">
                <button
                  className="focus-action-btn primary"
                  type="button"
                  onClick={handleStart}
                  disabled={!selectedTodo}
                >
                  ▶ 开始专注
                </button>
                <button
                  className="focus-action-btn secondary"
                  type="button"
                  onClick={handleReset}
                  disabled={!selectedTodo || seconds === 0}
                >
                  重置
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
