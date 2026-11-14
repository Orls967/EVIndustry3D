import React, { Suspense, useEffect, useState } from "react";
import { Eye, EyeOff, PanelLeftClose, PanelLeftOpen, Pause, Play, Search } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import type { ArchitectureId, ThermalResult } from "../domain/contracts";
import { getPackDefinition } from "../domain/dataLoaders";
import {
  cancelThermalInWorkspace,
  runSohInWorkspace,
  runThermalInWorkspace,
} from "../engine/simulationController";
import { DecidePanel } from "../features/DecidePanel";
import { ForecastPanel } from "../features/ForecastPanel";
import { SimulatePanel } from "../features/SimulatePanel";
import { useWorkspaceStore, type SheetHeight, type WorkspaceTab } from "../state/workspaceStore";
import { DataStatusBadge } from "../ui/DataStatusBadge";
import { PackSchematicPoster } from "../ui/PackSchematicPoster";

const LazyPackCanvas = React.lazy(() =>
  import("../scene/PackCanvas").then((mod) => ({ default: mod.PackCanvas }))
);

function formatMmSs(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const InspectZoneTempCard = React.memo(function InspectZoneTempCard({
  selectedComponentZoneId,
}: {
  selectedComponentZoneId: string | null | undefined;
}): React.ReactElement | null {
  const { thermalResult, selectedZoneId, simPlaybackSampleIndex } = useWorkspaceStore(
    useShallow((s) => ({
      thermalResult: s.thermalResult,
      selectedZoneId: s.selectedZoneId,
      simPlaybackSampleIndex: s.simPlaybackSampleIndex,
    }))
  );

  if (!thermalResult) return null;
  const targetZone = selectedZoneId ?? selectedComponentZoneId ?? thermalResult.zoneIds[0];
  const zIdx = thermalResult.zoneIds.findIndex((z) => z === targetZone);
  const tempC =
    zIdx < 0
      ? thermalResult.summary.averageTemperatureC
      : thermalResult.zoneTemperaturesC[
          zIdx * thermalResult.nSamples +
            Math.min(simPlaybackSampleIndex, Math.max(0, thermalResult.nSamples - 1))
        ] ?? null;

  if (tempC === null) return null;

  return (
    <div className="panel-card" style={{ padding: "8px 10px", marginTop: "var(--space-2)" }}>
      <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
        Simulated temperature ({selectedZoneId ? selectedZoneId.replace("pack.", "") : "pack average"})
      </div>
      <div className="mono-num" style={{ fontSize: "16px", fontWeight: 600 }}>
        {tempC.toFixed(1)} °C
      </div>
    </div>
  );
});

const PlaybackBottomStrip = React.memo(function PlaybackBottomStrip({
  thermalResult,
}: {
  thermalResult: ThermalResult | null;
}): React.ReactElement {
  const { simPlaybackSampleIndex, simPlaybackPlaying } = useWorkspaceStore(
    useShallow((s) => ({
      simPlaybackSampleIndex: s.simPlaybackSampleIndex,
      simPlaybackPlaying: s.simPlaybackPlaying,
    }))
  );

  const sIdx = thermalResult
    ? Math.min(simPlaybackSampleIndex, Math.max(0, thermalResult.nSamples - 1))
    : 0;
  const currentT = thermalResult ? (thermalResult.timeSeconds[sIdx] ?? 0) : 0;
  const currentSoc = thermalResult ? (thermalResult.socPercent[sIdx] ?? 0) : 0;

  return (
    <div className="workspace-bottom-strip">
      {thermalResult ? (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flex: 1, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ minHeight: "30px" }}
            onClick={() => useWorkspaceStore.getState().setPlaybackPlaying(!simPlaybackPlaying)}
            aria-label={simPlaybackPlaying ? "Pause thermal playback" : "Play thermal playback"}
          >
            {simPlaybackPlaying ? <Pause size={13} strokeWidth={1.5} /> : <Play size={13} strokeWidth={1.5} />}
            <span>{simPlaybackPlaying ? "Pause" : "Play"}</span>
          </button>
          <input
            type="range"
            aria-label="Simulation playback time"
            min={0}
            max={Math.max(0, thermalResult.nSamples - 1)}
            value={sIdx}
            onChange={(e) => {
              const st = useWorkspaceStore.getState();
              st.setPlaybackPlaying(false);
              st.setPlaybackSampleIndex(Number(e.target.value));
            }}
            style={{ flex: 1, minWidth: "140px", maxWidth: "420px", accentColor: "var(--color-accent-primary)" }}
          />
          <span className="mono-num" style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
            {formatMmSs(currentT)} / {formatMmSs(thermalResult.durationSeconds)} · SOC {currentSoc.toFixed(0)}%
          </span>
        </div>
      ) : (
        <span style={{ color: "var(--color-text-muted)" }}>
          Run a thermal simulation in Simulate to unlock heatmap playback.
        </span>
      )}
      <span className="mono-num" style={{ color: "var(--color-text-secondary)" }}>
        Engine v{thermalResult?.engineVersion ?? "0.1.0"} · Data v1.0.0
      </span>
    </div>
  );
});

export function WorkspacePage({ routeArch }: { routeArch: ArchitectureId }): React.ReactElement {
  const {
    architecture,
    activeTab,
    mobileSheetHeight,
    leftPanelCollapsed,
    selectedComponentId,
    selectedZoneId,
    selectedCellId,
    componentVisibility,
    componentSearch,
    selectedPresetId,
    simStatus,
    thermalResult,
  } = useWorkspaceStore(
    useShallow((s) => ({
      architecture: s.architecture,
      activeTab: s.activeTab,
      mobileSheetHeight: s.mobileSheetHeight,
      leftPanelCollapsed: s.leftPanelCollapsed,
      selectedComponentId: s.selectedComponentId,
      selectedZoneId: s.selectedZoneId,
      selectedCellId: s.selectedCellId,
      componentVisibility: s.componentVisibility,
      componentSearch: s.componentSearch,
      selectedPresetId: s.selectedPresetId,
      simStatus: s.simStatus,
      thermalResult: s.thermalResult,
    }))
  );

  const pack = getPackDefinition(routeArch);
  const [mobilePanel, setMobilePanel] = useState<"parts" | WorkspaceTab>("inspect");

  // Sync store architecture cleanly when entering directly via hash URL
  useEffect(() => {
    if (architecture !== routeArch) {
      useWorkspaceStore.getState().syncRouteArchitecture(routeArch);
    }
  }, [routeArch, architecture]);

  const filteredComponents = pack.components.filter((c) => {
    const q = componentSearch.trim().toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
  });

  const selectedComponent = pack.components.find((c) => c.id === selectedComponentId) ?? null;

  const componentTreeContent = (
    <div style={{ padding: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ position: "relative" }}>
        <Search
          size={14}
          strokeWidth={1.5}
          aria-hidden="true"
          style={{ position: "absolute", left: 10, top: 11, color: "var(--color-text-muted)" }}
        />
        <input
          type="search"
          aria-label="Filter components"
          placeholder="Filter components…"
          value={componentSearch}
          onChange={(e) => useWorkspaceStore.getState().setComponentSearch(e.target.value)}
          className="field-input"
          style={{ paddingLeft: "30px" }}
        />
      </div>

      {filteredComponents.length === 0 ? (
        <div style={{ fontSize: "13px", color: "var(--color-text-muted)", padding: "var(--space-2)" }}>
          No parts match your search.
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
          {filteredComponents.map((comp) => {
            const visible = componentVisibility[comp.id] !== false;
            const selected = selectedComponentId === comp.id;
            return (
              <li
                key={comp.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "var(--space-2)",
                  padding: "4px 6px",
                  borderRadius: "var(--radius-sm)",
                  background: selected ? "var(--color-surface-2)" : "transparent",
                  border: selected ? "1px solid var(--color-accent-primary)" : "1px solid transparent",
                }}
              >
                <button
                  type="button"
                  onClick={() => useWorkspaceStore.getState().selectComponent(comp.id)}
                  style={{
                    flex: 1,
                    textAlign: "left",
                    background: "transparent",
                    border: 0,
                    color: selected ? "var(--color-accent-primary)" : "var(--color-text-primary)",
                    fontSize: "13px",
                    cursor: "pointer",
                    padding: "4px 2px",
                  }}
                >
                  <div>{comp.name}</div>
                  <div className="mono-num" style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                    {comp.id}
                  </div>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  aria-label={`${visible ? "Hide" : "Show"} ${comp.name}`}
                  onClick={() => useWorkspaceStore.getState().toggleComponentVisibility(comp.id)}
                  style={{ padding: "4px 6px", minHeight: "28px" }}
                >
                  {visible ? <Eye size={14} strokeWidth={1.5} /> : <EyeOff size={14} strokeWidth={1.5} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  const tabBody = (tab: WorkspaceTab) => {
    if (tab === "inspect") {
      if (!selectedComponent) {
        return (
          <div style={{ padding: "var(--space-4)", fontSize: "14px", color: "var(--color-text-secondary)" }}>
            Select a component from the assembly tree or 3D pack to inspect its materials, parameters, provenance, and failure modes.
          </div>
        );
      }
      return (
        <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div>
            <div className="mono-num" style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
              {selectedComponent.id} · {selectedComponent.category}
            </div>
            <h2 style={{ margin: "4px 0 var(--space-2)", fontSize: "18px" }}>{selectedComponent.name}</h2>
            {selectedCellId && (
              <div className="mono-num" style={{ fontSize: "12px", color: "var(--color-accent-primary)", marginBottom: "6px" }}>
                Picked cell: {selectedCellId} · Zone: {selectedZoneId}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <DataStatusBadge status={selectedComponent.provenance === "SOURCED" ? "MODELLED" : "ILLUSTRATIVE"} />
              <span className="mono-num" style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                {selectedComponent.provenance}
              </span>
            </div>
            <InspectZoneTempCard selectedComponentZoneId={selectedComponent.zoneId} />
          </div>

          <div>
            <div className="caption-label">FUNCTION &amp; LOCATION</div>
            <p style={{ margin: "4px 0 0", fontSize: "14px", color: "var(--color-text-secondary)" }}>{selectedComponent.func}</p>
            <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--color-text-muted)" }}>
              Location: {selectedComponent.location}
              {selectedComponent.material ? ` · Material: ${selectedComponent.material}` : ""}
            </p>
          </div>

          <div>
            <div className="caption-label" style={{ marginBottom: "6px" }}>
              PARAMETERS
            </div>
            <table className="data-table">
              <tbody>
                {selectedComponent.parameters.map((p) => (
                  <tr key={p.label}>
                    <th>{p.label}</th>
                    <td className="mono-num">
                      {p.value} {p.unit ?? ""}
                      {p.sourceRef && (
                        <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{p.sourceRef}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <div className="caption-label" style={{ marginBottom: "6px" }}>
              GENERIC FAILURE MODES
            </div>
            <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: "var(--color-text-secondary)" }}>
              {selectedComponent.failureModes.map((f) => (
                <li key={f.mode} style={{ marginBottom: "6px" }}>
                  <strong>{f.mode}:</strong> {f.effect}
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

    if (tab === "simulate") {
      return (
        <SimulatePanel
          onRun={() => void runThermalInWorkspace()}
          onCancel={cancelThermalInWorkspace}
        />
      );
    }

    if (tab === "forecast") {
      return <ForecastPanel onRunSoh={() => void runSohInWorkspace()} />;
    }

    return <DecidePanel />;
  };

  return (
    <div className="workspace-shell">
      {/* Workspace sub-bar */}
      <div className="workspace-subbar">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            aria-label={leftPanelCollapsed ? "Expand component tree" : "Collapse component tree"}
            onClick={() => useWorkspaceStore.getState().toggleLeftPanel()}
          >
            {leftPanelCollapsed ? <PanelLeftOpen size={16} strokeWidth={1.5} /> : <PanelLeftClose size={16} strokeWidth={1.5} />}
          </button>
          <label htmlFor="workspace-arch-switch" className="sr-only">
            Active battery architecture
          </label>
          <select
            id="workspace-arch-switch"
            className="field-select mono-num"
            style={{ width: "auto" }}
            value={routeArch}
            onChange={(e) => {
              const next = e.target.value as ArchitectureId;
              const ok = useWorkspaceStore.getState().requestArchitectureSwitch(next);
              if (ok) {
                window.location.hash = next === "LFP_BLADE" ? "#/simulator/lfp" : "#/simulator/nmc";
              }
            }}
          >
            <option value="LFP_BLADE">LFP Blade (120s1p)</option>
            <option value="NMC_4680">NMC 4680 (92s9p)</option>
          </select>
          <span className="mono-num" style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
            Scenario: {selectedPresetId} · Status: {simStatus}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <DataStatusBadge status="MODELLED" />
          <a href="#/methodology" className="btn btn-ghost btn-sm">
            Methodology
          </a>
        </div>
      </div>

      {/* Main 3-region body */}
      <div className={`workspace-body ${leftPanelCollapsed ? "workspace-body--left-collapsed" : ""}`}>
        {/* Left desktop tree */}
        <aside className="workspace-panel workspace-panel--left-desktop" aria-label="Component tree">
          {!leftPanelCollapsed && (
            <>
              <div style={{ padding: "var(--space-3)", borderBottom: "1px solid var(--color-border-subtle)" }}>
                <div className="caption-label">COMPONENTS ({pack.components.length})</div>
              </div>
              {componentTreeContent}
            </>
          )}
        </aside>

        {/* Center 3D viewport */}
        <div className="workspace-viewport" aria-label="Pack visualization viewport">
          <Suspense fallback={<PackSchematicPoster architecture={routeArch} caption="Loading 3D viewport bundle…" />}>
            <LazyPackCanvas architecture={routeArch} />
          </Suspense>
        </div>

        {/* Right panel / Mobile bottom sheet */}
        <aside className={`workspace-panel workspace-panel--right workspace-sheet--${mobileSheetHeight}`} aria-label="Workspace inspector and tools">
          <div className="tabs-list" role="tablist" aria-label="Workspace panels">
            {(["inspect", "simulate", "forecast", "decide"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                className="tab-btn"
                aria-selected={activeTab === t}
                onClick={() => {
                  useWorkspaceStore.getState().setActiveTab(t);
                  setMobilePanel(t);
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className="topbar-mobile-toggle" style={{ padding: "6px var(--space-3)", borderBottom: "1px solid var(--color-border-subtle)", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setMobilePanel(mobilePanel === "parts" ? activeTab : "parts")}
            >
              {mobilePanel === "parts" ? "Back to tab" : "Parts tree"}
            </button>
            <div style={{ display: "flex", gap: "4px" }}>
              {(["peek", "half", "full"] as SheetHeight[]).map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`btn btn-sm ${mobileSheetHeight === h ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => useWorkspaceStore.getState().setMobileSheetHeight(h)}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {mobilePanel === "parts" ? componentTreeContent : tabBody(activeTab)}
          </div>
        </aside>
      </div>

      {/* Bottom status / Simulation playback strip */}
      <PlaybackBottomStrip thermalResult={thermalResult} />
    </div>
  );
}
