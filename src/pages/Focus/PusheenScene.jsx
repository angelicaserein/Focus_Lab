import React, { useEffect, useMemo, useRef, Suspense } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls, useAnimations } from "@react-three/drei";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { Box3, Matrix4, Vector3 } from "three";

// Computes the model's true bounding box *accounting for skinning*, expressed in
// `root`'s local space (so it's independent of any parent transforms). Box3's
// setFromObject ignores skinning and measures the bind pose, which for this
// model is much wider than the posed mesh — so we apply each bone transform
// ourselves, the same way three does when it actually renders.
function measureSkinnedBox(root) {
  const box = new Box3();
  const v = new Vector3();
  const rel = new Matrix4();
  const invRoot = root.matrixWorld.clone().invert();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const pos = o.geometry.attributes.position;
    if (!pos) return;
    rel.multiplyMatrices(invRoot, o.matrixWorld);
    const step = Math.max(1, Math.floor(pos.count / 2000));
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i);
      if (o.isSkinnedMesh) o.applyBoneTransform(i, v);
      v.applyMatrix4(rel);
      box.expandByPoint(v);
    }
  });
  return box;
}
import ErrorBoundary from "../../components/ErrorBoundary";
import pusheenGlb from "../../../assets/model/pusheen_-_im_busy.glb?url";

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
  // a fresh copy and the model doesn't drift between sessions.
  const clonedScene = useMemo(() => cloneSkeleton(scene), [scene]);

  // Measure the ORIGINAL scene, not the clone: useGLTF's scene is already in its
  // correct rest pose, whereas a freshly cloned skeleton sits in a spread-out
  // bind pose whose bounds are wrong. The clone shares the same geometry, so the
  // offset measured here centers it too. (Box3.setFromObject can't be used — it
  // ignores skinning; measureSkinnedBox applies the bone transforms.)
  const centerOffset = useMemo(() => {
    scene.updateWorldMatrix(true, true);
    const c = measureSkinnedBox(scene).getCenter(new Vector3());
    return [-c.x, -c.y, -c.z];
  }, [scene]);

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

// Frames the model on screen using a camera view offset (lens shift). Unlike
// moving the model, this does not touch the orbit pivot, so the model still
// rotates around its own center.
//   verticalShift   > 0 → model moves up
//   horizontalShift > 0 → model moves right
function CameraRig({ verticalShift = 0.16, horizontalShift = 0 }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  useEffect(() => {
    // setViewOffset shifts the frustum window; the centered model then renders
    // in the opposite direction, so we negate to make the props read naturally.
    // width/height stay full → this is a pure lens shift (no distortion).
    camera.setViewOffset(
      size.width,
      size.height,
      -size.width * horizontalShift,
      size.height * verticalShift,
      size.width,
      size.height,
    );
    camera.updateProjectionMatrix();
    return () => {
      camera.clearViewOffset();
      camera.updateProjectionMatrix();
    };
  }, [camera, size.width, size.height, verticalShift, horizontalShift]);

  return null;
}

// 全屏 3D 模型场景（含灯光、相机机位与轨道控制），加载失败时回退到提示文案。
export default function PusheenScene({ animEnabled }) {
  return (
    <ErrorBoundary fallback={webglFallback}>
      <Canvas
        camera={{ position: [1, 1, 6], fov: 45 }} //-2.5, 0, 5.5分别表示相机在x、y、z轴上的位置，fov表示相机的视野角度
        gl={{ alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[5, 8, 5]} intensity={2} />
        <directionalLight
          position={[-5, 3, -3]}
          intensity={0.8}
          color="#d5c0d0"
        />
        <pointLight position={[0, 4, 2]} intensity={1} color="#e0cedd" />
        <CameraRig verticalShift={0.16} horizontalShift={0.18} />
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
  );
}
