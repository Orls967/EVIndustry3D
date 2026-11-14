import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Layers, Pause, Play, RotateCcw, Scissors, Thermometer } from "lucide-react";
import { UI_STRINGS } from "../content/strings";
import type { ArchitectureId, ThermalResult } from "../domain/contracts";
import { getPackDefinition } from "../domain/dataLoaders";
import { useWorkspaceStore, type CameraPreset, type QualityTier } from "../state/workspaceStore";
import { PackSchematicPoster } from "../ui/PackSchematicPoster";
import { InlineBanner } from "../ui/Primitives";
import { CameraRig, ClippingPlaneOverlay, type SharedCameraPose } from "./components/CameraAndClipControllers";
import { LfpBladeAssembly } from "./components/LfpBladeAssembly";
import { Nmc4680Assembly } from "./components/Nmc4680Assembly";
import { ThermalLegend } from "./components/ThermalLegend";

function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

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
  externalPose,
  onBroadcastPose,
}: PackCanvasProps): React.ReactElement {
  const store = useWorkspaceStore();
  const pack = getPackDefinition(architecture);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [webglAvailable, setWebglAvailable] = useState<boolean>(() => checkWebGLSupport());
  const [contextLost, setContextLost] = useState<boolean>(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const [explodePlaying, setExplodePlaying] = useState(false);
  const [localMetrics, setLocalMetrics] = useState<{ drawCalls: number; triangles: number; lastFrameMs: number } | null>(null);

  const keyboardCmdRef = useRef<{ type: "orbit" | "zoom"; dx: number; dy: number } | null>(null);
  const liveAnnouncementRef = useRef<string>("");

  const effectiveResult = overrideResult !== undefined ? overrideResult : store.thermalResult;
  const effectiveSampleIdx =
    overrideSampleIndex !== undefined ? overrideSampleIndex : store.simPlaybackSampleIndex;
  const effectiveHeatmapOn =
    overrideHeatmapOn !== undefined ? overrideHeatmapOn : store.heatmapEnabled && effectiveResult !== null;
  const effectiveExplodePct =
    overrideExplodePercent !== undefined ? overrideExplodePercent : compactHero ? 65 : store.explodePercent;

  const { zoneTempsAtSample, computedRange, samplePeakC, sampleHotZoneId } = useMemo(() => {
    if (!effectiveResult) {
      return {
        zoneTempsAtSample: undefined,
        computedRange: [25, 55] as [number, number],
        samplePeakC: 25,
        sampleHotZoneId: pack.zones[0]?.id ?? "pack.zone_01",
      };
    }
    const nZ = effectiveResult.zoneIds.length;
    const nS = effectiveResult.nSamples;
    const sIdx = Math.min(Math.max(effectiveSampleIdx, 0), Math.max(nS - 1, 0));
    const slice: number[] = [];
    let curMax = -Infinity;
    let curHotIdx = 0;
    let globalMin = Infinity;
    let globalMax = -Infinity;
    for (let i = 0; i < effectiveResult.zoneTemperaturesC.length; i++) {
      const val = effectiveResult.zoneTemperaturesC[i] ?? 25;
      if (val < globalMin) globalMin = val;
      if (val > globalMax) globalMax = val;
    }
    for (let z = 0; z < nZ; z++) {
      const t = effectiveResult.zoneTemperaturesC[z * nS + sIdx] ?? 25;
      slice.push(t);
      if (t > curMax) {
        curMax = t;
        curHotIdx = z;
      }
    }
    const minBound = Math.floor(Math.min(globalMin, 25));
    const maxBound = Math.ceil(Math.max(globalMax, minBound + 5));
    return {
      zoneTempsAtSample: slice,
      computedRange: [minBound, maxBound] as [number, number],
      samplePeakC: curMax,
      sampleHotZoneId: effectiveResult.zoneIds[curHotIdx] ?? effectiveResult.summary.hottestZoneId,
    };
  }, [effectiveResult, effectiveSampleIdx, pack.zones]);

  const tempRangeC = overrideTempRange ?? computedRange;

  const packLengthM = pack.envelopeMm.lengthX / 1000.0;
  const clipWorldX = (store.crossSectionPosition - 0.5) * packLengthM;

  const clippingPlanes = useMemo(() => {
    if (!store.crossSectionEnabled) return [];
    const nx = store.crossSectionFlipped ? 1 : -1;
    const constant = store.crossSectionFlipped ? -clipWorldX : clipWorldX;
    return [new THREE.Plane(new THREE.Vector3(nx, 0, 0), constant)];
  }, [store.crossSectionEnabled, store.crossSectionFlipped, clipWorldX]);

  // Smooth 2.4s guided Explode playback when Play button clicked (03 §3.1)
  useEffect(() => {
    if (!explodePlaying) return;
    const startPct = store.explodePercent >= 99 ? 0 : store.explodePercent;
    const startMs = performance.now();
    const totalMs = 2400 * ((100 - startPct) / 100);
    let rafId = 0;

    const step = (now: number) => {
      const p = Math.min((now - startMs) / Math.max(totalMs, 1), 1);
      store.setExplodePercent(Math.round(startPct + p * (100 - startPct)));
      if (p < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        setExplodePlaying(false);
      }
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explodePlaying]);

  // Allow pressing 'H' anywhere in the workspace (outside form controls) to toggle thermal heatmap
  useEffect(() => {
    if (compactHero || syncId) return;
    const onWindowKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if ((e.key === "h" || e.key === "H") && effectiveResult) {
        e.preventDefault();
        useWorkspaceStore.getState().setHeatmapEnabled(!useWorkspaceStore.getState().heatmapEnabled);
      }
    };
    window.addEventListener("keydown", onWindowKey);
    return () => window.removeEventListener("keydown", onWindowKey);
  }, [compactHero, syncId, effectiveResult]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          store.setC3AutoRotate(false);
          keyboardCmdRef.current = { type: "orbit", dx: 0.12, dy: 0 };
          break;
        case "ArrowRight":
          e.preventDefault();
          store.setC3AutoRotate(false);
          keyboardCmdRef.current = { type: "orbit", dx: -0.12, dy: 0 };
          break;
        case "ArrowUp":
          e.preventDefault();
          store.setC3AutoRotate(false);
          keyboardCmdRef.current = { type: "orbit", dx: 0, dy: -0.1 };
          break;
        case "ArrowDown":
          e.preventDefault();
          store.setC3AutoRotate(false);
          keyboardCmdRef.current = { type: "orbit", dx: 0, dy: 0.1 };
          break;
        case "+":
        case "=":
          e.preventDefault();
          keyboardCmdRef.current = { type: "zoom", dx: -0.2, dy: 0 };
          break;
        case "-":
          e.preventDefault();
          keyboardCmdRef.current = { type: "zoom", dx: 0.2, dy: 0 };
          break;
        case "r":
        case "R":
          e.preventDefault();
          store.requestCameraPreset("iso");
          break;
        case "e":
        case "E":
          e.preventDefault();
          store.setExplodePercent(store.explodePercent > 50 ? 0 : 100);
          break;
        case "x":
        case "X":
          e.preventDefault();
          store.setCrossSection({ enabled: !store.crossSectionEnabled });
          break;
        case "h":
        case "H":
          if (effectiveResult) {
            e.preventDefault();
            store.setHeatmapEnabled(!store.heatmapEnabled);
          }
          break;
        case "Escape":
          store.selectComponent(null);
          break;
        default:
          break;
      }
    },
    [store, effectiveResult]
  );

  const liveAnnouncement = `${pack.displayName}. Explode ${effectiveExplodePct}%. Cross-section ${
    store.crossSectionEnabled ? `enabled at ${Math.round(store.crossSectionPosition * 100)}%` : "off"
  }. Heatmap ${
    effectiveHeatmapOn && effectiveResult
      ? `on, maximum ${samplePeakC.toFixed(1)} °C in ${sampleHotZoneId}`
      : "off"
  }.${store.selectedComponentId ? ` Selected ${store.selectedCellId ?? store.selectedComponentId}.` : ""}`;
  liveAnnouncementRef.current = liveAnnouncement;

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
            mode={store.crossSectionEnabled ? "cutaway" : store.explodePercent > 20 ? "exploded" : "assembled"}
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
      <div className="sr-only" aria-live="polite">
        {liveAnnouncement}
      </div>

      {!compactHero && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {(["iso", "top", "front", "side"] as CameraPreset[]).map((p) => (
              <button
                key={p}
                type="button"
                className={`btn btn-sm ${store.cameraPreset === p ? "btn-primary" : "btn-secondary"}`}
                onClick={() => store.requestCameraPreset(p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => store.requestCameraPreset("iso")}
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
              onClick={() => store.setC3AutoRotate(!store.c3AutoRotate)}
              aria-pressed={store.c3AutoRotate}
              title="Toggle slow showcase rotation (C3)"
            >
              {store.c3AutoRotate ? <Pause size={14} strokeWidth={1.5} /> : <Play size={14} strokeWidth={1.5} />}
              <span>{store.c3AutoRotate ? "Pause orbit" : "Auto-orbit"}</span>
            </button>

            <label htmlFor="quality-select" className="sr-only">
              3D quality tier
            </label>
            <select
              id="quality-select"
              className="field-select mono-num"
              style={{ width: "auto", minHeight: "32px", fontSize: "12px" }}
              value={store.qualityTier}
              onChange={(e) => store.setQualityTier(e.target.value as QualityTier)}
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
          dpr={store.qualityTier === "low" ? 1 : [1, 2]}
          camera={{ position: [1.5, 1.05, 1.5], fov: 40, near: 0.05, far: 40 }}
          gl={{
            antialias: store.qualityTier !== "low",
            localClippingEnabled: true,
            powerPreference: "high-performance",
          }}
          onPointerMissed={() => store.selectComponent(null)}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener("webglcontextlost", (ev) => {
              ev.preventDefault();
              setContextLost(true);
            });
          }}
        >
          <color attach="background" args={["#0b0d10"]} />
          {/* Neutral studio lighting (02 §8: one key, soft fill, zero coloured lights) */}
          <ambientLight intensity={0.45} />
          <hemisphereLight args={["#dfe7f0", "#1e2630", 0.72]} />
          <directionalLight position={[3.5, 5.5, 4]} intensity={1.35} color="#ffffff" />
          <directionalLight position={[-3.5, 2.5, -3.5]} intensity={0.68} color="#ffffff" />

          {architecture === "LFP_BLADE" ? (
            <LfpBladeAssembly
              pack={pack}
              explodePercent={effectiveExplodePct}
              visibility={store.componentVisibility}
              selectedComponentId={compactHero ? null : store.selectedComponentId}
              selectedZoneId={compactHero ? null : store.selectedZoneId}
              selectedCellId={compactHero ? null : store.selectedCellId}
              hoveredId={compactHero ? null : hoveredId}
              heatmapEnabled={effectiveHeatmapOn}
              zoneTemperaturesC={zoneTempsAtSample}
              tempRangeC={tempRangeC}
              qualityTier={store.qualityTier}
              clippingPlanes={compactHero ? [] : clippingPlanes}
              onSelectPart={(id, zoneId, cellId) => {
                if (compactHero) return;
                store.setC3AutoRotate(false);
                store.selectComponent(id, zoneId, cellId);
              }}
              onHoverPart={compactHero ? () => {} : setHoveredId}
            />
          ) : (
            <Nmc4680Assembly
              pack={pack}
              explodePercent={effectiveExplodePct}
              visibility={store.componentVisibility}
              selectedComponentId={compactHero ? null : store.selectedComponentId}
              selectedZoneId={compactHero ? null : store.selectedZoneId}
              selectedCellId={compactHero ? null : store.selectedCellId}
              hoveredId={compactHero ? null : hoveredId}
              heatmapEnabled={effectiveHeatmapOn}
              zoneTemperaturesC={zoneTempsAtSample}
              tempRangeC={tempRangeC}
              qualityTier={store.qualityTier}
              clippingPlanes={compactHero ? [] : clippingPlanes}
              onSelectPart={(id, zoneId, cellId) => {
                if (compactHero) return;
                store.setC3AutoRotate(false);
                store.selectComponent(id, zoneId, cellId);
              }}
              onHoverPart={compactHero ? () => {} : setHoveredId}
            />
          )}

          {!compactHero && (
            <ClippingPlaneOverlay
              enabled={store.crossSectionEnabled}
              worldX={clipWorldX}
              flipped={store.crossSectionFlipped}
            />
          )}

          <CameraRig
            architecture={architecture}
            explodePercent={effectiveExplodePct}
            cameraPreset={compactHero ? "iso" : store.cameraPreset}
            cameraRequestNonce={store.cameraRequestNonce}
            c3AutoRotate={store.c3AutoRotate}
            keyboardCommandRef={keyboardCmdRef}
            onUserInteract={() => store.setC3AutoRotate(false)}
            onReportMetrics={(m) => {
              setLocalMetrics(m);
              if (!syncId) {
                store.setSceneRenderMetrics(m);
              }
            }}
            syncId={syncId}
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
              onClick={() => store.setC3AutoRotate(!store.c3AutoRotate)}
              aria-pressed={!store.c3AutoRotate}
            >
              {store.c3AutoRotate ? <Pause size={13} strokeWidth={1.5} /> : <Play size={13} strokeWidth={1.5} />}
              <span>{store.c3AutoRotate ? "Pause rotation" : "Resume rotation"}</span>
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
          <ThermalLegend
            minC={tempRangeC[0]}
            maxC={tempRangeC[1]}
            hottestZoneId={sampleHotZoneId}
            peakTempC={samplePeakC}
          />
        )}

        {/* Hover label chip */}
        {!compactHero && hoveredId && (
          <div
            className="mono-num"
            style={{
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
          >
            {pack.components.find((c) => c.id === hoveredId)?.name ?? hoveredId}
          </div>
        )}

        {/* Measured WebGL telemetry pill (M3-08) */}
        {(localMetrics ?? (!syncId ? store.sceneRenderMetrics : null)) && (() => {
          const m = localMetrics ?? store.sceneRenderMetrics!;
          return (
            <div
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
              {m.drawCalls} calls · {m.triangles.toLocaleString()} tris · {m.lastFrameMs} ms
            </div>
          );
        })()}
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
              id="c1-explode-slider"
              type="range"
              min={0}
              max={100}
              value={store.explodePercent}
              onChange={(e) => {
                setExplodePlaying(false);
                store.setExplodePercent(Number(e.target.value));
              }}
              style={{ width: "110px", accentColor: "var(--color-accent-primary)" }}
            />
            <span className="mono-num" style={{ fontSize: "12px", width: "36px" }}>
              {store.explodePercent}%
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setExplodePlaying((p) => !p)}
            >
              {explodePlaying ? "Pause" : "Step stages"}
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <button
              type="button"
              className={`btn btn-sm ${store.crossSectionEnabled ? "btn-primary" : "btn-secondary"}`}
              onClick={() => store.setCrossSection({ enabled: !store.crossSectionEnabled })}
              aria-pressed={store.crossSectionEnabled}
            >
              <Scissors size={14} strokeWidth={1.5} aria-hidden="true" />
              <span>Cross-section</span>
            </button>

            {store.crossSectionEnabled && (
              <>
                <input
                  aria-label="Cross-section X position"
                  type="range"
                  min={5}
                  max={95}
                  value={Math.round(store.crossSectionPosition * 100)}
                  onChange={(e) => store.setCrossSection({ position: Number(e.target.value) / 100 })}
                  style={{ width: "90px", accentColor: "var(--color-accent-primary)" }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => store.setCrossSection({ flipped: !store.crossSectionFlipped })}
                >
                  Flip
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => store.setCrossSection({ position: 0.5, flipped: false })}
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
              onClick={() => store.setHeatmapEnabled(!store.heatmapEnabled)}
            >
              <Thermometer size={14} strokeWidth={1.5} aria-hidden="true" />
              <span>Heatmap</span>
            </button>

            <button type="button" className="btn btn-ghost btn-sm" onClick={() => store.resetAssembly()}>
              Reset assembly
            </button>
          </div>
        </div>
      )}

      {!compactHero && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--color-text-muted)", flexWrap: "wrap", gap: "4px" }}>
          <span>{UI_STRINGS.modelDisclaimer}</span>
          {store.crossSectionEnabled && (
            <span>Cross-section uses open shell clipping without mutating source geometry (Risk T3 outlined interior).</span>
          )}
        </div>
      )}
    </div>
  );
}
