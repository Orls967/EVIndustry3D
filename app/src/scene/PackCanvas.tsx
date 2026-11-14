import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, events as createPointerEvents, useFrame, useThree, type RootStore } from "@react-three/fiber";
import { Layers, Pause, Play, RotateCcw, Scissors, Thermometer } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { UI_STRINGS } from "../content/strings";
import type { ArchitectureId, ThermalResult } from "../domain/contracts";
import { getPackDefinition } from "../domain/dataLoaders";
import { useWorkspaceStore, type CameraPreset, type QualityTier } from "../state/workspaceStore";
import { PackSchematicPoster } from "../ui/PackSchematicPoster";
import { InlineBanner } from "../ui/Primitives";
import { CameraRig, ClippingPlaneOverlay, type SharedCameraPose } from "./components/CameraAndClipControllers";
import { LfpBladeAssembly } from "./components/LfpBladeAssembly";
import { Nmc4680Assembly } from "./components/Nmc4680Assembly";
import { OutlineShaderPrewarm } from "./components/SelectableMesh";
import { ThermalLegend } from "./components/ThermalLegend";
import {
  computeFractionalSampleIndex,
  computeThermalResultRange,
  interpolateZoneTemperatures,
} from "./controllers/playbackController";
import { createHoverBus, type CameraSyncBus } from "./controllers/sceneInteractionBus";

function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

const EXPLODE_DURATION_MS = 2400;

interface SceneAnimationDriversProps {
  effectiveResult: ThermalResult | null;
  playbackPlaying: boolean;
  sampleIndexRef: React.MutableRefObject<number>;
  lastCommittedSampleRef: React.MutableRefObject<number>;
  explodePlaying: boolean;
  explodePercentRef: React.MutableRefObject<number>;
  explodeSliderRef: React.RefObject<HTMLInputElement | null>;
  explodeLabelRef: React.RefObject<HTMLSpanElement | null>;
  onExplodeFinished: () => void;
  invalidateRef: React.MutableRefObject<(() => void) | null>;
}

function SceneAnimationDrivers({
  effectiveResult,
  playbackPlaying,
  sampleIndexRef,
  lastCommittedSampleRef,
  explodePlaying,
  explodePercentRef,
  explodeSliderRef,
  explodeLabelRef,
  onExplodeFinished,
  invalidateRef,
}: SceneAnimationDriversProps): null {
  const invalidate = useThree((s) => s.invalidate);
  const setFrameloop = useThree((s) => s.setFrameloop);
  invalidateRef.current = invalidate;

  const isContinuousAnimating =
    Boolean(playbackPlaying && effectiveResult && effectiveResult.nSamples > 1) || explodePlaying;

  // Switch R3F to continuous "always" loop while heatmap playback or explode is active
  // so animation frames never stall on demand-mode internal.frames races; restore "demand" when idle.
  useEffect(() => {
    if (isContinuousAnimating) {
      setFrameloop("always");
      invalidate();
      return () => {
        setFrameloop("demand");
      };
    }
    setFrameloop("demand");
    return undefined;
  }, [isContinuousAnimating, setFrameloop, invalidate]);

  useFrame((_, delta) => {
    const deltaMs = Math.min(delta * 1000, 100);

    if (playbackPlaying && effectiveResult && effectiveResult.nSamples > 1) {
      const nextCursor = computeFractionalSampleIndex(
        sampleIndexRef.current,
        deltaMs,
        effectiveResult.nSamples
      );
      sampleIndexRef.current = nextCursor;

      const intIdx = Math.floor(nextCursor);
      if (intIdx !== lastCommittedSampleRef.current) {
        lastCommittedSampleRef.current = intIdx;
        useWorkspaceStore.getState().setPlaybackSampleIndex(intIdx);
      }
    }

    if (explodePlaying) {
      const nextPct = Math.min(explodePercentRef.current + (deltaMs / EXPLODE_DURATION_MS) * 100, 100);
      explodePercentRef.current = nextPct;
      const rounded = Math.round(nextPct);
      if (explodeSliderRef.current) {
        explodeSliderRef.current.value = String(rounded);
      }
      if (explodeLabelRef.current) {
        explodeLabelRef.current.textContent = `${rounded}%`;
      }
      if (nextPct >= 100) {
        useWorkspaceStore.getState().setExplodePercent(100);
        onExplodeFinished();
        invalidate();
      }
    }
  });

  return null;
}

const LiveThermalLegend = React.memo(function LiveThermalLegend({
  result,
  minC,
  maxC,
  overrideSampleIndex,
  defaultZoneId,
}: {
  result: ThermalResult;
  minC: number;
  maxC: number;
  overrideSampleIndex?: number;
  defaultZoneId: string;
}): React.ReactElement {
  const storeSampleIdx = useWorkspaceStore((s) => s.simPlaybackSampleIndex);
  const sampleIdx = overrideSampleIndex !== undefined ? overrideSampleIndex : storeSampleIdx;

  const { peakTempC, hottestZoneId } = useMemo(() => {
    const temps = new Float32Array(Math.max(result.zoneIds.length, 1));
    const { peakTempC: peak, hotZoneIndex } = interpolateZoneTemperatures(result, sampleIdx, temps);
    return {
      peakTempC: peak,
      hottestZoneId: result.zoneIds[hotZoneIndex] ?? result.summary.hottestZoneId ?? defaultZoneId,
    };
  }, [result, sampleIdx, defaultZoneId]);

  return (
    <ThermalLegend
      minC={minC}
      maxC={maxC}
      hottestZoneId={hottestZoneId}
      peakTempC={peakTempC}
    />
  );
});

const PackLiveRegion = React.memo(function PackLiveRegion({
  packDisplayName,
  defaultZoneId,
  overrideResult,
  overrideSampleIndex,
  overrideHeatmapOn,
  overrideExplodePercent,
  compactHero,
}: {
  packDisplayName: string;
  defaultZoneId: string;
  overrideResult?: ThermalResult | null;
  overrideSampleIndex?: number;
  overrideHeatmapOn?: boolean;
  overrideExplodePercent?: number;
  compactHero: boolean;
}): React.ReactElement {
  const {
    explodePercent,
    crossSectionEnabled,
    crossSectionPosition,
    heatmapEnabled,
    thermalResult,
    simPlaybackSampleIndex,
    selectedComponentId,
    selectedCellId,
  } = useWorkspaceStore(
    useShallow((s) => ({
      explodePercent: s.explodePercent,
      crossSectionEnabled: s.crossSectionEnabled,
      crossSectionPosition: s.crossSectionPosition,
      heatmapEnabled: s.heatmapEnabled,
      thermalResult: s.thermalResult,
      simPlaybackSampleIndex: s.simPlaybackSampleIndex,
      selectedComponentId: s.selectedComponentId,
      selectedCellId: s.selectedCellId,
    }))
  );

  const effectiveResult = overrideResult !== undefined ? overrideResult : thermalResult;
  const effectiveSampleIdx = overrideSampleIndex !== undefined ? overrideSampleIndex : simPlaybackSampleIndex;
  const effectiveHeatmapOn =
    overrideHeatmapOn !== undefined ? overrideHeatmapOn : heatmapEnabled && effectiveResult !== null;
  const effectiveExplodePct =
    overrideExplodePercent !== undefined ? overrideExplodePercent : compactHero ? 65 : explodePercent;

  let peakC = 25;
  let hotZoneId = defaultZoneId;
  if (effectiveHeatmapOn && effectiveResult) {
    const temps = new Float32Array(Math.max(effectiveResult.zoneIds.length, 1));
    const info = interpolateZoneTemperatures(effectiveResult, effectiveSampleIdx, temps);
    peakC = info.peakTempC;
    hotZoneId = effectiveResult.zoneIds[info.hotZoneIndex] ?? effectiveResult.summary.hottestZoneId ?? defaultZoneId;
  }

  const liveAnnouncement = `${packDisplayName}. Explode ${effectiveExplodePct}%. Cross-section ${crossSectionEnabled ? `enabled at ${Math.round(crossSectionPosition * 100)}%` : "off"
    }. Heatmap ${effectiveHeatmapOn && effectiveResult ? `on, maximum ${peakC.toFixed(1)} °C in ${hotZoneId}` : "off"
    }.${selectedComponentId ? ` Selected ${selectedCellId ?? selectedComponentId}.` : ""}`;

  return (
    <div className="sr-only" aria-live="polite">
      {liveAnnouncement}
    </div>
  );
});

export interface PackCanvasProps {
  architecture: ArchitectureId;
  overrideResult?: ThermalResult | null;
  overrideSampleIndex?: number;
  overrideHeatmapOn?: boolean;
  overrideTempRange?: [number, number];
  overrideExplodePercent?: number;
  compactHero?: boolean;
  onHeroExitToStill?: () => void;
  syncId?: string;
  cameraSyncBus?: CameraSyncBus;
  externalPose?: SharedCameraPose | null;
  onBroadcastPose?: (pose: SharedCameraPose) => void;
}

export function PackCanvas({
  architecture,
  overrideResult,
  overrideSampleIndex,
  overrideHeatmapOn,
  overrideTempRange,
  overrideExplodePercent,
  compactHero = false,
  onHeroExitToStill,
  syncId,
  cameraSyncBus,
  externalPose,
  onBroadcastPose,
}: PackCanvasProps): React.ReactElement {
  const pack = getPackDefinition(architecture);

  const storeThermalResult = useWorkspaceStore((s) => s.thermalResult);
  const storeHeatmapEnabled = useWorkspaceStore((s) => s.heatmapEnabled);
  const storePlaybackPlaying = useWorkspaceStore((s) => s.simPlaybackPlaying);
  const storeExplodePercent = useWorkspaceStore((s) => s.explodePercent);
  const componentVisibility = useWorkspaceStore((s) => s.componentVisibility);

  const { selectedComponentId, selectedZoneId, selectedCellId } = useWorkspaceStore(
    useShallow((s) => ({
      selectedComponentId: s.selectedComponentId,
      selectedZoneId: s.selectedZoneId,
      selectedCellId: s.selectedCellId,
    }))
  );

  const { crossSectionEnabled, crossSectionPosition, crossSectionFlipped } = useWorkspaceStore(
    useShallow((s) => ({
      crossSectionEnabled: s.crossSectionEnabled,
      crossSectionPosition: s.crossSectionPosition,
      crossSectionFlipped: s.crossSectionFlipped,
    }))
  );

  const { qualityTier, cameraPreset, cameraRequestNonce, c3AutoRotate } = useWorkspaceStore(
    useShallow((s) => ({
      qualityTier: s.qualityTier,
      cameraPreset: s.cameraPreset,
      cameraRequestNonce: s.cameraRequestNonce,
      c3AutoRotate: s.c3AutoRotate,
    }))
  );

  const [webglAvailable, setWebglAvailable] = useState<boolean>(() => checkWebGLSupport());
  const [contextLost, setContextLost] = useState<boolean>(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const [explodePlaying, setExplodePlaying] = useState(false);

  const keyboardCmdRef = useRef<{ type: "orbit" | "zoom"; dx: number; dy: number } | null>(null);
  const isOrbitDraggingRef = useRef<boolean>(false);
  const telemetryElRef = useRef<HTMLDivElement>(null);
  const hoverChipRef = useRef<HTMLDivElement>(null);
  const explodeSliderRef = useRef<HTMLInputElement>(null);
  const explodeLabelRef = useRef<HTMLSpanElement>(null);
  const invalidateRef = useRef<(() => void) | null>(null);

  const effectiveResult = overrideResult !== undefined ? overrideResult : storeThermalResult;
  const effectiveHeatmapOn =
    overrideHeatmapOn !== undefined ? overrideHeatmapOn : storeHeatmapEnabled && effectiveResult !== null;
  const effectiveExplodePct =
    overrideExplodePercent !== undefined ? overrideExplodePercent : compactHero ? 65 : storeExplodePercent;
  const isPlayingHeatmap = overrideResult === undefined && storePlaybackPlaying && effectiveResult !== null;

  const sampleIndexRef = useRef<number>(
    overrideSampleIndex !== undefined
      ? overrideSampleIndex
      : useWorkspaceStore.getState().simPlaybackSampleIndex
  );
  const lastCommittedSampleRef = useRef<number>(Math.floor(sampleIndexRef.current));
  const colorDirtyRef = useRef<boolean>(true);
  const explodePercentRef = useRef<number>(effectiveExplodePct);

  // Sync explodePercentRef when committed store value or override prop changes
  useEffect(() => {
    explodePercentRef.current = effectiveExplodePct;
    if (explodeSliderRef.current) {
      explodeSliderRef.current.value = String(effectiveExplodePct);
    }
    if (explodeLabelRef.current) {
      explodeLabelRef.current.textContent = `${effectiveExplodePct}%`;
    }
  }, [effectiveExplodePct]);

  // Reset sample cursor when starting playback from the last frame or changing results
  useEffect(() => {
    if (overrideSampleIndex !== undefined) {
      sampleIndexRef.current = overrideSampleIndex;
      lastCommittedSampleRef.current = Math.floor(overrideSampleIndex);
      colorDirtyRef.current = true;
      invalidateRef.current?.();
      return;
    }
    const idx = useWorkspaceStore.getState().simPlaybackSampleIndex;
    sampleIndexRef.current = idx;
    lastCommittedSampleRef.current = Math.floor(idx);
    colorDirtyRef.current = true;
    invalidateRef.current?.();
  }, [effectiveResult, overrideSampleIndex]);

  useEffect(() => {
    if (!isPlayingHeatmap || !effectiveResult) return;
    const sIdx = useWorkspaceStore.getState().simPlaybackSampleIndex;
    if (sIdx >= effectiveResult.nSamples - 1) {
      sampleIndexRef.current = 0;
      lastCommittedSampleRef.current = 0;
      useWorkspaceStore.getState().setPlaybackSampleIndex(0);
    } else {
      sampleIndexRef.current = sIdx;
      lastCommittedSampleRef.current = sIdx;
    }
    colorDirtyRef.current = true;
  }, [isPlayingHeatmap, effectiveResult]);

  // Listen to manual scrubber updates without re-rendering PackCanvas
  useEffect(() => {
    if (overrideSampleIndex !== undefined) return;
    return useWorkspaceStore.subscribe((state, prev) => {
      if (state.simPlaybackSampleIndex === prev.simPlaybackSampleIndex) return;
      if (state.simPlaybackPlaying) return;
      sampleIndexRef.current = state.simPlaybackSampleIndex;
      lastCommittedSampleRef.current = state.simPlaybackSampleIndex;
      colorDirtyRef.current = true;
      invalidateRef.current?.();
    });
  }, [overrideSampleIndex]);

  const packRef = useRef(pack);
  packRef.current = pack;

  const hoverBus = useMemo(
    () =>
      createHoverBus((id) => {
        const chip = hoverChipRef.current;
        if (!chip) return;
        if (!id) {
          chip.style.opacity = "0";
          chip.style.visibility = "hidden";
          chip.textContent = "";
        } else {
          const label = packRef.current.components.find((c) => c.id === id)?.name ?? id;
          chip.textContent = label;
          chip.style.visibility = "visible";
          chip.style.opacity = "1";
        }
      }),
    []
  );

  // Clear hover chip when switching architecture
  useEffect(() => {
    hoverBus.setHovered(null);
  }, [architecture, hoverBus]);

  const computedRange = useMemo(
    () => (effectiveResult ? computeThermalResultRange(effectiveResult) : ([25, 55] as [number, number])),
    [effectiveResult]
  );
  const tempRangeC = overrideTempRange ?? computedRange;

  const packLengthM = pack.envelopeMm.lengthX / 1000.0;
  const clipWorldX = (crossSectionPosition - 0.5) * packLengthM;

  const clippingPlanes = useMemo(() => {
    if (!crossSectionEnabled) return [];
    const nx = crossSectionFlipped ? 1 : -1;
    const constant = crossSectionFlipped ? -clipWorldX : clipWorldX;
    return [new THREE.Plane(new THREE.Vector3(nx, 0, 0), constant)];
  }, [crossSectionEnabled, crossSectionFlipped, clipWorldX]);

  // Custom R3F pointer event manager: skip hover raycasts while OrbitControls is dragging and throttle move to rAF
  const createCanvasEvents = useCallback((r3fStore: RootStore) => {
    const manager = createPointerEvents(r3fStore);
    const handlers = manager.handlers;
    if (!handlers) return manager;

    const origMove = handlers.onPointerMove;
    const origLeave = handlers.onPointerLeave;
    const origDisconnect = manager.disconnect;
    let rafId = 0;
    let pendingEv: Event | null = null;

    handlers.onPointerMove = (ev: Event) => {
      const pe = ev as PointerEvent;
      if (isOrbitDraggingRef.current || pe.buttons !== 0) {
        return;
      }
      pendingEv = ev;
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          const next = pendingEv;
          pendingEv = null;
          if (next && !isOrbitDraggingRef.current) {
            origMove(next);
          }
        });
      }
    };

    handlers.onPointerLeave = (ev: Event) => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      pendingEv = null;
      origLeave(ev);
    };

    manager.disconnect = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      pendingEv = null;
      origDisconnect?.();
    };

    return manager;
  }, []);

  // Allow pressing 'H' anywhere in the workspace (outside form controls) to toggle thermal heatmap
  useEffect(() => {
    if (compactHero || syncId) return;
    const onWindowKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if ((e.key === "h" || e.key === "H") && effectiveResult) {
        e.preventDefault();
        const st = useWorkspaceStore.getState();
        st.setHeatmapEnabled(!st.heatmapEnabled);
      }
    };
    window.addEventListener("keydown", onWindowKey);
    return () => window.removeEventListener("keydown", onWindowKey);
  }, [compactHero, syncId, effectiveResult]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      const st = useWorkspaceStore.getState();
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          st.setC3AutoRotate(false);
          keyboardCmdRef.current = { type: "orbit", dx: 0.12, dy: 0 };
          invalidateRef.current?.();
          break;
        case "ArrowRight":
          e.preventDefault();
          st.setC3AutoRotate(false);
          keyboardCmdRef.current = { type: "orbit", dx: -0.12, dy: 0 };
          invalidateRef.current?.();
          break;
        case "ArrowUp":
          e.preventDefault();
          st.setC3AutoRotate(false);
          keyboardCmdRef.current = { type: "orbit", dx: 0, dy: -0.1 };
          invalidateRef.current?.();
          break;
        case "ArrowDown":
          e.preventDefault();
          st.setC3AutoRotate(false);
          keyboardCmdRef.current = { type: "orbit", dx: 0, dy: 0.1 };
          invalidateRef.current?.();
          break;
        case "+":
        case "=":
          e.preventDefault();
          keyboardCmdRef.current = { type: "zoom", dx: -0.2, dy: 0 };
          invalidateRef.current?.();
          break;
        case "-":
          e.preventDefault();
          keyboardCmdRef.current = { type: "zoom", dx: 0.2, dy: 0 };
          invalidateRef.current?.();
          break;
        case "r":
        case "R":
          e.preventDefault();
          st.requestCameraPreset("iso");
          break;
        case "e":
        case "E":
          e.preventDefault();
          setExplodePlaying(false);
          st.setExplodePercent(st.explodePercent > 50 ? 0 : 100);
          break;
        case "x":
        case "X":
          e.preventDefault();
          st.setCrossSection({ enabled: !st.crossSectionEnabled });
          break;
        case "h":
        case "H":
          if (effectiveResult) {
            e.preventDefault();
            st.setHeatmapEnabled(!st.heatmapEnabled);
          }
          break;
        case "Escape":
          st.selectComponent(null);
          break;
        default:
          break;
      }
    },
    [effectiveResult]
  );

  const handleSelectPart = useCallback(
    (id: string, zoneId?: string | null, cellId?: string | null) => {
      if (compactHero) return;
      const st = useWorkspaceStore.getState();
      st.setC3AutoRotate(false);
      st.selectComponent(id, zoneId, cellId);
    },
    [compactHero]
  );

  const handleHoverPart = useCallback(
    (id: string | null) => {
      if (compactHero) return;
      hoverBus.setHovered(id);
    },
    [compactHero, hoverBus]
  );

  const handleUserInteract = useCallback(() => {
    useWorkspaceStore.getState().setC3AutoRotate(false);
  }, []);

  const handleExplodeFinished = useCallback(() => {
    setExplodePlaying(false);
  }, []);

  const handleToggleExplodePlay = useCallback(() => {
    if (explodePlaying) {
      setExplodePlaying(false);
      useWorkspaceStore.getState().setExplodePercent(Math.round(explodePercentRef.current));
      return;
    }
    if (explodePercentRef.current >= 99) {
      explodePercentRef.current = 0;
      useWorkspaceStore.getState().setExplodePercent(0);
    }
    setExplodePlaying(true);
  }, [explodePlaying]);

  if (!webglAvailable || contextLost) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", height: "100%" }}>
        <InlineBanner tone="warning">
          {contextLost
            ? "WebGL context was lost. Falling back to 2D engineering schematic."
            : "WebGL is unavailable in this environment. Using 2D engineering schematic fallback."}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ marginLeft: "var(--space-3)" }}
            onClick={() => {
              setWebglAvailable(checkWebGLSupport());
              setContextLost(false);
              setCanvasKey((k) => k + 1);
            }}
          >
            Retry 3D view
          </button>
        </InlineBanner>
        <div style={{ margin: "auto 0" }}>
          <PackSchematicPoster
            architecture={architecture}
            mode={crossSectionEnabled ? "cutaway" : storeExplodePercent > 20 ? "exploded" : "assembled"}
            forceSvg
          />
        </div>
      </div>
    );
  }

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Interactive 3D battery pack viewport. Use arrow keys to orbit, plus or minus to zoom, R to reset view, E to toggle explode, X to toggle cross-section, Escape to clear selection."
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        gap: "var(--space-2)",
        outline: "none",
      }}
    >
      <PackLiveRegion
        packDisplayName={pack.displayName}
        defaultZoneId={pack.zones[0]?.id ?? "pack.zone_01"}
        overrideResult={overrideResult}
        overrideSampleIndex={overrideSampleIndex}
        overrideHeatmapOn={overrideHeatmapOn}
        overrideExplodePercent={overrideExplodePercent}
        compactHero={compactHero}
      />

      {!compactHero && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {(["iso", "top", "front", "side"] as CameraPreset[]).map((p) => (
              <button
                key={p}
                type="button"
                className={`btn btn-sm ${cameraPreset === p ? "btn-primary" : "btn-secondary"}`}
                onClick={() => useWorkspaceStore.getState().requestCameraPreset(p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => useWorkspaceStore.getState().requestCameraPreset("iso")}
              title="Reset camera view (R)"
            >
              <RotateCcw size={14} strokeWidth={1.5} aria-hidden="true" />
              <span>Reset view</span>
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => useWorkspaceStore.getState().setC3AutoRotate(!c3AutoRotate)}
              aria-pressed={c3AutoRotate}
              title="Toggle slow showcase rotation (C3)"
            >
              {c3AutoRotate ? <Pause size={14} strokeWidth={1.5} /> : <Play size={14} strokeWidth={1.5} />}
              <span>{c3AutoRotate ? "Pause orbit" : "Auto-orbit"}</span>
            </button>

            <label htmlFor="quality-select" className="sr-only">
              3D quality tier
            </label>
            <select
              id="quality-select"
              className="field-select mono-num"
              style={{ width: "auto", minHeight: "32px", fontSize: "12px" }}
              value={qualityTier}
              onChange={(e) => useWorkspaceStore.getState().setQualityTier(e.target.value as QualityTier)}
            >
              <option value="high">Quality: High</option>
              <option value="medium">Quality: Medium</option>
              <option value="low">Quality: Low</option>
            </select>
          </div>
        </div>
      )}

      {/* 3D Canvas area */}
      <div
        style={{
          position: "relative",
          flex: 1,
          minHeight: "320px",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-border-subtle)",
          background: "#0B0D10",
          overflow: "hidden",
        }}
      >
        <Canvas
          key={canvasKey}
          frameloop="demand"
          events={createCanvasEvents}
          dpr={qualityTier === "low" ? 1 : [1, 2]}
          camera={{ position: [1.5, 1.05, 1.5], fov: 40, near: 0.05, far: 40 }}
          gl={{
            antialias: qualityTier !== "low",
            localClippingEnabled: true,
            powerPreference: "high-performance",
          }}
          onPointerMissed={() => useWorkspaceStore.getState().selectComponent(null)}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener("webglcontextlost", (ev) => {
              ev.preventDefault();
              setContextLost(true);
            });
          }}
        >
          <color attach="background" args={["#0b0d10"]} />
          <OutlineShaderPrewarm />
          {/* Neutral studio lighting (02 §8: one key, soft fill, zero coloured lights) */}
          <ambientLight intensity={0.45} />
          <hemisphereLight args={["#dfe7f0", "#1e2630", 0.72]} />
          <directionalLight position={[3.5, 5.5, 4]} intensity={1.35} color="#ffffff" />
          <directionalLight position={[-3.5, 2.5, -3.5]} intensity={0.68} color="#ffffff" />

          <SceneAnimationDrivers
            effectiveResult={effectiveResult}
            playbackPlaying={isPlayingHeatmap}
            sampleIndexRef={sampleIndexRef}
            lastCommittedSampleRef={lastCommittedSampleRef}
            explodePlaying={explodePlaying}
            explodePercentRef={explodePercentRef}
            explodeSliderRef={explodeSliderRef}
            explodeLabelRef={explodeLabelRef}
            onExplodeFinished={handleExplodeFinished}
            invalidateRef={invalidateRef}
          />

          {architecture === "LFP_BLADE" ? (
            <LfpBladeAssembly
              pack={pack}
              explodePercent={effectiveExplodePct}
              explodePercentRef={explodePercentRef}
              visibility={componentVisibility}
              selectedComponentId={compactHero ? null : selectedComponentId}
              selectedZoneId={compactHero ? null : selectedZoneId}
              selectedCellId={compactHero ? null : selectedCellId}
              hoverBus={compactHero ? undefined : hoverBus}
              heatmapEnabled={effectiveHeatmapOn}
              thermalResult={effectiveResult}
              sampleIndexRef={sampleIndexRef}
              playbackPlaying={isPlayingHeatmap}
              colorDirtyRef={colorDirtyRef}
              tempRangeC={tempRangeC}
              qualityTier={qualityTier}
              clippingPlanes={compactHero ? [] : clippingPlanes}
              onSelectPart={handleSelectPart}
              onHoverPart={handleHoverPart}
            />
          ) : (
            <Nmc4680Assembly
              pack={pack}
              explodePercent={effectiveExplodePct}
              explodePercentRef={explodePercentRef}
              visibility={componentVisibility}
              selectedComponentId={compactHero ? null : selectedComponentId}
              selectedZoneId={compactHero ? null : selectedZoneId}
              selectedCellId={compactHero ? null : selectedCellId}
              hoverBus={compactHero ? undefined : hoverBus}
              heatmapEnabled={effectiveHeatmapOn}
              thermalResult={effectiveResult}
              sampleIndexRef={sampleIndexRef}
              playbackPlaying={isPlayingHeatmap}
              colorDirtyRef={colorDirtyRef}
              tempRangeC={tempRangeC}
              qualityTier={qualityTier}
              clippingPlanes={compactHero ? [] : clippingPlanes}
              onSelectPart={handleSelectPart}
              onHoverPart={handleHoverPart}
            />
          )}

          {!compactHero && (
            <ClippingPlaneOverlay
              enabled={crossSectionEnabled}
              worldX={clipWorldX}
              flipped={crossSectionFlipped}
            />
          )}

          <CameraRig
            architecture={architecture}
            explodePercent={effectiveExplodePct}
            cameraPreset={compactHero ? "iso" : cameraPreset}
            cameraRequestNonce={cameraRequestNonce}
            c3AutoRotate={c3AutoRotate}
            qualityTier={qualityTier}
            keyboardCommandRef={keyboardCmdRef}
            isOrbitDraggingRef={isOrbitDraggingRef}
            telemetryElRef={telemetryElRef}
            onUserInteract={handleUserInteract}
            syncId={syncId}
            cameraSyncBus={cameraSyncBus}
            externalPose={externalPose}
            onBroadcastPose={onBroadcastPose}
          />
        </Canvas>

        {/* Hero pause overlay pill (01 §3.5) */}
        {compactHero && (
          <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: "6px" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => useWorkspaceStore.getState().setC3AutoRotate(!c3AutoRotate)}
              aria-pressed={!c3AutoRotate}
            >
              {c3AutoRotate ? <Pause size={13} strokeWidth={1.5} /> : <Play size={13} strokeWidth={1.5} />}
              <span>{c3AutoRotate ? "Pause rotation" : "Resume rotation"}</span>
            </button>
            {onHeroExitToStill && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={onHeroExitToStill}>
                Static still
              </button>
            )}
          </div>
        )}

        {/* Thermal Heatmap 5-stop dynamic legend overlay */}
        {effectiveHeatmapOn && effectiveResult && (
          <LiveThermalLegend
            result={effectiveResult}
            minC={tempRangeC[0]}
            maxC={tempRangeC[1]}
            overrideSampleIndex={overrideSampleIndex}
            defaultZoneId={pack.zones[0]?.id ?? "pack.zone_01"}
          />
        )}

        {/* Hover label chip (DOM-ref controlled, zero React re-renders) */}
        {!compactHero && (
          <div
            ref={hoverChipRef}
            className="mono-num"
            style={{
              visibility: "hidden",
              opacity: 0,
              position: "absolute",
              top: 10,
              left: 10,
              padding: "4px 8px",
              borderRadius: "var(--radius-sm)",
              background: "rgba(24, 29, 35, 0.92)",
              border: "1px solid var(--color-accent-primary)",
              fontSize: "12px",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Measured WebGL telemetry pill (DOM-ref controlled, zero React/store writes) */}
        <div
          ref={telemetryElRef}
          className="mono-num"
          style={{
            position: "absolute",
            bottom: 10,
            right: 10,
            padding: "3px 8px",
            borderRadius: "var(--radius-sm)",
            background: "rgba(18, 22, 27, 0.88)",
            border: "1px solid var(--color-border-subtle)",
            fontSize: "11px",
            color: "var(--color-text-muted)",
            pointerEvents: "none",
          }}
        >
          initializing…
        </div>
      </div>

      {!compactHero && (
        <div
          className="panel-card"
          style={{
            padding: "var(--space-2) var(--space-3)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "var(--space-3)",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <Layers size={15} strokeWidth={1.5} color="var(--color-accent-primary)" aria-hidden="true" />
            <label htmlFor="c1-explode-slider" style={{ fontSize: "13px", fontWeight: 500 }}>
              Explode
            </label>
            <input
              ref={explodeSliderRef}
              id="c1-explode-slider"
              type="range"
              min={0}
              max={100}
              defaultValue={storeExplodePercent}
              onChange={(e) => {
                setExplodePlaying(false);
                useWorkspaceStore.getState().setExplodePercent(Number(e.target.value));
              }}
              style={{ width: "110px", accentColor: "var(--color-accent-primary)" }}
            />
            <span ref={explodeLabelRef} className="mono-num" style={{ fontSize: "12px", width: "36px" }}>
              {storeExplodePercent}%
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleToggleExplodePlay}
            >
              {explodePlaying ? "Pause" : "Step stages"}
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <button
              type="button"
              className={`btn btn-sm ${crossSectionEnabled ? "btn-primary" : "btn-secondary"}`}
              onClick={() => useWorkspaceStore.getState().setCrossSection({ enabled: !crossSectionEnabled })}
              aria-pressed={crossSectionEnabled}
            >
              <Scissors size={14} strokeWidth={1.5} aria-hidden="true" />
              <span>Cross-section</span>
            </button>

            {crossSectionEnabled && (
              <>
                <input
                  aria-label="Cross-section X position"
                  type="range"
                  min={5}
                  max={95}
                  value={Math.round(crossSectionPosition * 100)}
                  onChange={(e) => useWorkspaceStore.getState().setCrossSection({ position: Number(e.target.value) / 100 })}
                  style={{ width: "90px", accentColor: "var(--color-accent-primary)" }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => useWorkspaceStore.getState().setCrossSection({ flipped: !crossSectionFlipped })}
                >
                  Flip
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => useWorkspaceStore.getState().setCrossSection({ position: 0.5, flipped: false })}
                >
                  Mid
                </button>
              </>
            )}

            <button
              type="button"
              className={`btn btn-sm ${effectiveHeatmapOn ? "btn-primary" : "btn-secondary"}`}
              disabled={effectiveResult === null}
              aria-pressed={effectiveHeatmapOn}
              title={effectiveResult === null ? "Run a simulation first." : "Toggle thermal heatmap (H)"}
              onClick={() => useWorkspaceStore.getState().setHeatmapEnabled(!storeHeatmapEnabled)}
            >
              <Thermometer size={14} strokeWidth={1.5} aria-hidden="true" />
              <span>Heatmap</span>
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setExplodePlaying(false);
                useWorkspaceStore.getState().resetAssembly();
              }}
            >
              Reset assembly
            </button>
          </div>
        </div>
      )}

      {!compactHero && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--color-text-muted)", flexWrap: "wrap", gap: "4px" }}>
          <span>{UI_STRINGS.modelDisclaimer}</span>
          {crossSectionEnabled && (
            <span>Cross-section uses open shell clipping without mutating source geometry (Risk T3 outlined interior).</span>
          )}
        </div>
      )}
    </div>
  );
}
