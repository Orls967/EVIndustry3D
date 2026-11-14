import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls, Line } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { ArchitectureId } from "../../domain/contracts";
import type { CameraPreset, SceneRenderMetrics } from "../../state/workspaceStore";
import { computeExplodeOffsets } from "../controllers/explodeController";

const PRESET_DIRS: Record<CameraPreset, [number, number, number]> = {
  iso: [1.5, 1.05, 1.5],
  top: [0.001, 2.2, 0.001],
  front: [0.0, 0.25, 2.25],
  side: [2.35, 0.28, 0.0],
};

export interface SharedCameraPose {
  sourceId: string;
  position: [number, number, number];
  target: [number, number, number];
}

export interface CameraRigProps {
  architecture: ArchitectureId;
  explodePercent: number;
  cameraPreset: CameraPreset;
  cameraRequestNonce: number;
  c3AutoRotate: boolean;
  keyboardCommandRef: React.MutableRefObject<{ type: "orbit" | "zoom"; dx: number; dy: number } | null>;
  onUserInteract: () => void;
  onReportMetrics: (metrics: SceneRenderMetrics) => void;
  syncId?: string;
  externalPose?: SharedCameraPose | null;
  onBroadcastPose?: (pose: SharedCameraPose) => void;
}

export function CameraRig({
  architecture,
  explodePercent,
  cameraPreset,
  cameraRequestNonce,
  c3AutoRotate,
  keyboardCommandRef,
  onUserInteract,
  onReportMetrics,
  syncId,
  externalPose,
  onBroadcastPose,
}: CameraRigProps): React.ReactElement {
  const { camera, gl, invalidate } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const applyingExternalRef = useRef(false);

  const reducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const animRef = useRef<{
    active: boolean;
    startMs: number;
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
  } | null>(null);

  const offsets = useMemo(() => computeExplodeOffsets(architecture, explodePercent), [architecture, explodePercent]);
  const lastMetricsMsRef = useRef(0);
  const frameAccumRef = useRef({ count: 0, totalMs: 0 });

  useEffect(() => {
    const dir = PRESET_DIRS[cameraPreset];
    const targetY = offsets.upperEnclosureY * 0.35;
    const toTarget = new THREE.Vector3(0, targetY, 0);
    const toPos = new THREE.Vector3(
      dir[0] * offsets.cameraDistanceFactor,
      dir[1] * offsets.cameraDistanceFactor + targetY * 0.4,
      dir[2] * offsets.cameraDistanceFactor
    );

    if (reducedMotion) {
      camera.position.copy(toPos);
      if (controlsRef.current) {
        controlsRef.current.target.copy(toTarget);
        controlsRef.current.update();
      }
      invalidate();
      return;
    }

    animRef.current = {
      active: true,
      startMs: performance.now(),
      fromPos: camera.position.clone(),
      toPos,
      fromTarget: controlsRef.current ? controlsRef.current.target.clone() : new THREE.Vector3(),
      toTarget,
    };
    invalidate();
  }, [cameraPreset, cameraRequestNonce, offsets.cameraDistanceFactor, offsets.upperEnclosureY, camera, invalidate, reducedMotion]);

  // Trigger continuous gentle invalidation ONLY while C3 auto-rotate or camera transition runs (0-watt idle when stopped!)
  useEffect(() => {
    if (!c3AutoRotate || reducedMotion) return;
    let rafId = 0;
    const tick = () => {
      invalidate();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [c3AutoRotate, reducedMotion, invalidate]);

  useFrame((_, delta) => {
    const now = performance.now();

    // Handle active 600ms camera transition
    if (animRef.current?.active) {
      const elapsed = now - animRef.current.startMs;
      const t = Math.min(elapsed / 600, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(animRef.current.fromPos, animRef.current.toPos, eased);
      if (controlsRef.current) {
        controlsRef.current.target.lerpVectors(animRef.current.fromTarget, animRef.current.toTarget, eased);
        controlsRef.current.update();
      }
      if (t < 1) {
        invalidate();
      } else {
        animRef.current.active = false;
      }
    }

    // Apply imperative keyboard orbit / zoom step
    if (keyboardCommandRef.current && controlsRef.current) {
      const cmd = keyboardCommandRef.current;
      keyboardCommandRef.current = null;
      const offset = camera.position.clone().sub(controlsRef.current.target);
      const sph = new THREE.Spherical().setFromVector3(offset);
      if (cmd.type === "orbit") {
        sph.theta += cmd.dx;
        sph.phi = Math.min(Math.max(sph.phi + cmd.dy, 0.12), Math.PI - 0.12);
      } else {
        sph.radius = Math.min(Math.max(sph.radius + cmd.dx, 0.7), 6.0);
      }
      offset.setFromSpherical(sph);
      camera.position.copy(controlsRef.current.target).add(offset);
      controlsRef.current.update();
    }

    // Report gl.info & frame-time metrics periodically (~once every 400ms)
    frameAccumRef.current.count += 1;
    frameAccumRef.current.totalMs += delta * 1000;
    if (now - lastMetricsMsRef.current > 400) {
      const avgMs = Math.max(frameAccumRef.current.totalMs / Math.max(frameAccumRef.current.count, 1), 0.1);
      lastMetricsMsRef.current = now;
      frameAccumRef.current.count = 0;
      frameAccumRef.current.totalMs = 0;
      onReportMetrics({
        drawCalls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        lastFrameMs: Number(avgMs.toFixed(2)),
        fpsEstimate: Math.min(120, Math.round(1000 / avgMs)),
      });
    }
  });

  // Apply synced external camera pose from linked Compare viewport without ping-pong
  useEffect(() => {
    if (!externalPose || !syncId || externalPose.sourceId === syncId) return;
    applyingExternalRef.current = true;
    camera.position.set(...externalPose.position);
    if (controlsRef.current) {
      controlsRef.current.target.set(...externalPose.target);
      controlsRef.current.update();
    }
    invalidate();
    applyingExternalRef.current = false;
  }, [externalPose, syncId, camera, invalidate]);

  // C3 autoRotateSpeed: OrbitControls rotates at 2*pi/60 * autoRotateSpeed rad/s -> 0.5 gives ~60s/rev at 60fps
  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={0.75}
      maxDistance={5.5}
      autoRotate={c3AutoRotate && !reducedMotion}
      autoRotateSpeed={0.5}
      onStart={() => {
        if (animRef.current) animRef.current.active = false;
        onUserInteract();
      }}
      onChange={() => {
        invalidate();
        if (!applyingExternalRef.current && syncId && onBroadcastPose && controlsRef.current) {
          onBroadcastPose({
            sourceId: syncId,
            position: [camera.position.x, camera.position.y, camera.position.z],
            target: [controlsRef.current.target.x, controlsRef.current.target.y, controlsRef.current.target.z],
          });
        }
      }}
    />
  );
}

export function ClippingPlaneOverlay({
  enabled,
  worldX,
  flipped,
  heightY = 0.75,
  depthZ = 1.25,
}: {
  enabled: boolean;
  worldX: number;
  flipped: boolean;
  heightY?: number;
  depthZ?: number;
}): React.ReactElement | null {
  if (!enabled) return null;
  const hw = depthZ / 2;
  const pts: [number, number, number][] = [
    [worldX, -0.05, -hw],
    [worldX, heightY, -hw],
    [worldX, heightY, hw],
    [worldX, -0.05, hw],
    [worldX, -0.05, -hw],
  ];
  const arrowDir = flipped ? -0.14 : 0.14;
  const arrowPts: [number, number, number][] = [
    [worldX, heightY * 0.5, 0],
    [worldX + arrowDir, heightY * 0.5, 0],
  ];

  return (
    <group>
      <Line points={pts} color="#38c7e0" lineWidth={1.5} />
      <Line points={arrowPts} color="#f2b441" lineWidth={2} />
    </group>
  );
}

