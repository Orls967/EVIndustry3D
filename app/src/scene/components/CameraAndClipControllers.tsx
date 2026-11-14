import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls, Line } from "@react-three/drei";
import { addAfterEffect, useFrame, useThree } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { ArchitectureId } from "../../domain/contracts";
import type { CameraPreset, QualityTier } from "../../state/workspaceStore";
import { AdaptiveDprController } from "../controllers/adaptiveDpr";
import { computeExplodeOffsets } from "../controllers/explodeController";
import type { CameraSyncBus } from "../controllers/sceneInteractionBus";

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
  qualityTier: QualityTier;
  keyboardCommandRef: React.MutableRefObject<{ type: "orbit" | "zoom"; dx: number; dy: number } | null>;
  isOrbitDraggingRef?: React.MutableRefObject<boolean>;
  telemetryElRef?: React.RefObject<HTMLDivElement | null>;
  onUserInteract: () => void;
  syncId?: string;
  cameraSyncBus?: CameraSyncBus;
  externalPose?: SharedCameraPose | null;
  onBroadcastPose?: (pose: SharedCameraPose) => void;
}

export function CameraRig({
  architecture,
  explodePercent,
  cameraPreset,
  cameraRequestNonce,
  c3AutoRotate,
  qualityTier,
  keyboardCommandRef,
  isOrbitDraggingRef,
  telemetryElRef,
  onUserInteract,
  syncId,
  cameraSyncBus,
  externalPose,
  onBroadcastPose,
}: CameraRigProps): React.ReactElement {
  const { camera, gl, invalidate, setDpr } = useThree();
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

  const targetMaxDpr =
    qualityTier === "low"
      ? 1
      : typeof window !== "undefined"
        ? Math.min(window.devicePixelRatio || 1, 2)
        : 1;

  const adaptiveDprRef = useRef<AdaptiveDprController | null>(null);
  if (!adaptiveDprRef.current) {
    adaptiveDprRef.current = new AdaptiveDprController(targetMaxDpr);
  }

  useEffect(() => {
    const nextDpr = adaptiveDprRef.current!.setTargetMaxDpr(targetMaxDpr);
    setDpr(nextDpr);
    invalidate();
  }, [targetMaxDpr, setDpr, invalidate]);

  const lastSeenGlFrameRef = useRef(-1);
  const lastRenderNowRef = useRef<number | null>(null);
  const lastTelemetryFlushRef = useRef(0);
  const frameAccumRef = useRef({ count: 0, totalMs: 0 });
  const lastGlCountsRef = useRef({ calls: 0, tris: 0 });
  const idleTimerRef = useRef<number | null>(null);

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

  // Trigger continuous gentle invalidation ONLY while C3 auto-rotate runs (0-watt idle when stopped)
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

  // Update telemetry DOM directly after WebGLRenderer.render() via addAfterEffect (zero React state / store writes)
  useEffect(() => {
    const unsubAfter = addAfterEffect(() => {
      if (gl.info.render.frame === lastSeenGlFrameRef.current) return;
      lastSeenGlFrameRef.current = gl.info.render.frame;

      const calls = gl.info.render.calls;
      const tris = gl.info.render.triangles;
      lastGlCountsRef.current.calls = calls;
      lastGlCountsRef.current.tris = tris;

      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = window.setTimeout(() => {
        const el = telemetryElRef?.current;
        if (el) {
          const { calls: c, tris: t } = lastGlCountsRef.current;
          el.textContent = `${c} calls · ${t.toLocaleString()} tris · idle`;
        }
        frameAccumRef.current.count = 0;
        frameAccumRef.current.totalMs = 0;
        lastRenderNowRef.current = null;
      }, 600);

      const el = telemetryElRef?.current;
      if (!el) return;

      const now = performance.now();
      if (lastTelemetryFlushRef.current === 0 || now - lastTelemetryFlushRef.current >= 400) {
        lastTelemetryFlushRef.current = now;
        const { count, totalMs } = frameAccumRef.current;
        frameAccumRef.current.count = 0;
        frameAccumRef.current.totalMs = 0;

        if (count >= 2 && totalMs > 0) {
          const avgMs = totalMs / count;
          const fps = Math.min(120, Math.round(1000 / avgMs));
          el.textContent = `${calls} calls · ${tris.toLocaleString()} tris · ${fps} fps (${avgMs.toFixed(1)} ms avg)`;
        } else {
          el.textContent = `${calls} calls · ${tris.toLocaleString()} tris · idle`;
        }
      }
    });

    return () => {
      unsubAfter();
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [gl, telemetryElRef]);

  useFrame(() => {
    const now = performance.now();

    if (lastRenderNowRef.current !== null) {
      const gap = now - lastRenderNowRef.current;
      if (gap > 0 && gap <= 120) {
        frameAccumRef.current.count += 1;
        frameAccumRef.current.totalMs += gap;
      }
    }
    lastRenderNowRef.current = now;

    if (qualityTier !== "low" && adaptiveDprRef.current) {
      const nextDpr = adaptiveDprRef.current.recordFrame(now);
      if (nextDpr !== null) {
        setDpr(nextDpr);
      }
    }

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
  });

  // Apply synced external camera pose via ref-based bus (zero React re-renders)
  useEffect(() => {
    if (!cameraSyncBus || !syncId) return;
    return cameraSyncBus.subscribe((pose) => {
      if (pose.sourceId === syncId) return;
      applyingExternalRef.current = true;
      camera.position.set(...pose.position);
      if (controlsRef.current) {
        controlsRef.current.target.set(...pose.target);
        controlsRef.current.update();
      }
      invalidate();
      applyingExternalRef.current = false;
    });
  }, [cameraSyncBus, syncId, camera, invalidate]);

  // Fallback support if externalPose prop is passed
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
        if (isOrbitDraggingRef) isOrbitDraggingRef.current = true;
        if (animRef.current) animRef.current.active = false;
        onUserInteract();
      }}
      onEnd={() => {
        if (isOrbitDraggingRef) isOrbitDraggingRef.current = false;
      }}
      onChange={() => {
        invalidate();
        if (!applyingExternalRef.current && syncId && controlsRef.current) {
          const pose: SharedCameraPose = {
            sourceId: syncId,
            position: [camera.position.x, camera.position.y, camera.position.z],
            target: [controlsRef.current.target.x, controlsRef.current.target.y, controlsRef.current.target.z],
          };
          cameraSyncBus?.broadcast(pose);
          onBroadcastPose?.(pose);
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
