import React, { Suspense, useEffect, useState } from "react";
import { Eye, EyeOff, PanelLeftClose, PanelLeftOpen, Pause, Play, Search } from "lucide-react";
import type { ArchitectureId } from "../domain/contracts";
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

export function WorkspacePage({ routeArch }: { routeArch: ArchitectureId }): React.ReactElement {
  const store = useWorkspaceStore();
  const pack = getPackDefinition(routeArch);
  const [mobilePanel, setMobilePanel] = useState<"parts" | WorkspaceTab>("inspect");

  // Sync store architecture cleanly when entering directly via hash URL
  useEffect(() => {
    if (store.architecture !== routeArch) {
      store.syncRouteArchitecture(routeArch);
    }
  }, [routeArch, store]);

  // Playback animation timer for completed thermal results
  useEffect(() => {
    if (!store.simPlaybackPlaying || !store.thermalResult) return;
    const totalSamples = store.thermalResult.nSamples;
    if (totalSamples <= 1) {
      store.setPlaybackPlaying(false);
      return;
    }
    const id = window.setInterval(() => {
      const s = useWorkspaceStore.getState();
      if (!s.simPlaybackPlaying || !s.thermalResult) return;
      const next = s.simPlaybackSampleIndex + 1;
      if (next >= s.thermalResult.nSamples) {
        s.setPlaybackSampleIndex(0);
      } else {
        s.setPlaybackSampleIndex(next);
      }
    }, 120);
    return () => window.clearInterval(id);
  }, [store.simPlaybackPlaying, store.thermalResult, store]);

  const filteredComponents = pack.components.filter((c) => {
    const q = store.componentSearch.trim().toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
  });

  const selectedComponent = pack.components.find((c) => c.id === store.selectedComponentId) ?? null;

  // Component/zone live temperature readout when simulation exists
  const selectedZoneTempC = React.useMemo(() => {
    if (!store.thermalResult) return null;
    const targetZone = store.selectedZoneId ?? selectedComponent?.zoneId ?? store.thermalResult.zoneIds[0];
    const zIdx = store.thermalResult.zoneIds.findIndex((z) => z === targetZone);
    if (zIdx < 0) return store.thermalResult.summary.averageTemperatureC;
    const sIdx = Math.min(store.simPlaybackSampleIndex, Math.max(0, store.thermalResult.nSamples - 1));
    return store.thermalResult.zoneTemperaturesC[zIdx * store.thermalResult.nSamples + sIdx] ?? null;
  }, [store.thermalResult, store.selectedZoneId, selectedComponent, store.simPlaybackSampleIndex]);

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
          value={store.componentSearch}
          onChange={(e) => store.setComponentSearch(e.target.value)}
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
            const visible = store.componentVisibility[comp.id] !== false;
            const selected = store.selectedComponentId === comp.id;
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
                  onClick={() => store.selectComponent(comp.id)}
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
                  onClick={() => store.toggleComponentVisibility(comp.id)}
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
            {store.selectedCellId && (
              <div className="mono-num" style={{ fontSize: "12px", color: "var(--color-accent-primary)", marginBottom: "6px" }}>
                Picked cell: {store.selectedCellId} · Zone: {store.selectedZoneId}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <DataStatusBadge status={selectedComponent.provenance === "SOURCED" ? "MODELLED" : "ILLUSTRATIVE"} />
              <span className="mono-num" style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                {selectedComponent.provenance}
              </span>
            </div>
            {selectedZoneTempC !== null && (
              <div className="panel-card" style={{ padding: "8px 10px", marginTop: "var(--space-2)" }}>
                <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                  Simulated temperature ({store.selectedZoneId ? store.selectedZoneId.replace("pack.", "") : "pack average"})
                </div>
                <div className="mono-num" style={{ fontSize: "16px", fontWeight: 600 }}>
                  {selectedZoneTempC.toFixed(1)} °C
                </div>
              </div>
            )}
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

  const res = store.thermalResult;
  const sIdx = res ? Math.min(store.simPlaybackSampleIndex, Math.max(0, res.nSamples - 1)) : 0;
  const currentT = res ? (res.timeSeconds[sIdx] ?? 0) : 0;
  const currentSoc = res ? (res.socPercent[sIdx] ?? 0) : 0;

  return (
    <div className="workspace-shell">
      {/* Workspace sub-bar */}
      <div className="workspace-subbar">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            aria-label={store.leftPanelCollapsed ? "Expand component tree" : "Collapse component tree"}
            onClick={() => store.toggleLeftPanel()}
          >
            {store.leftPanelCollapsed ? <PanelLeftOpen size={16} strokeWidth={1.5} /> : <PanelLeftClose size={16} strokeWidth={1.5} />}
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
              const ok = store.requestArchitectureSwitch(next);
              if (ok) {
                window.location.hash = next === "LFP_BLADE" ? "#/simulator/lfp" : "#/simulator/nmc";
              }
            }}
          >
            <option value="LFP_BLADE">LFP Blade (120s1p)</option>
            <option value="NMC_4680">NMC 4680 (92s9p)</option>
          </select>
          <span className="mono-num" style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
            Scenario: {store.selectedPresetId} · Status: {store.simStatus}
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
      <div className={`workspace-body ${store.leftPanelCollapsed ? "workspace-body--left-collapsed" : ""}`}>
        {/* Left desktop tree */}
        <aside className="workspace-panel workspace-panel--left-desktop" aria-label="Component tree">
          {!store.leftPanelCollapsed && (
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
        <aside className={`workspace-panel workspace-panel--right workspace-sheet--${store.mobileSheetHeight}`} aria-label="Workspace inspector and tools">
          <div className="tabs-list" role="tablist" aria-label="Workspace panels">
            {(["inspect", "simulate", "forecast", "decide"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                className="tab-btn"
                aria-selected={store.activeTab === t}
                onClick={() => {
                  store.setActiveTab(t);
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
              onClick={() => setMobilePanel(mobilePanel === "parts" ? store.activeTab : "parts")}
            >
              {mobilePanel === "parts" ? "Back to tab" : "Parts tree"}
            </button>
            <div style={{ display: "flex", gap: "4px" }}>
              {(["peek", "half", "full"] as SheetHeight[]).map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`btn btn-sm ${store.mobileSheetHeight === h ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => store.setMobileSheetHeight(h)}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {mobilePanel === "parts" ? componentTreeContent : tabBody(store.activeTab)}
          </div>
        </aside>
      </div>

      {/* Bottom status / Simulation playback strip */}
      <div className="workspace-bottom-strip">
        {res ? (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flex: 1, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ minHeight: "30px" }}
              onClick={() => store.setPlaybackPlaying(!store.simPlaybackPlaying)}
              aria-label={store.simPlaybackPlaying ? "Pause thermal playback" : "Play thermal playback"}
            >
              {store.simPlaybackPlaying ? <Pause size={13} strokeWidth={1.5} /> : <Play size={13} strokeWidth={1.5} />}
              <span>{store.simPlaybackPlaying ? "Pause" : "Play"}</span>
            </button>
            <input
              type="range"
              aria-label="Simulation playback time"
              min={0}
              max={Math.max(0, res.nSamples - 1)}
              value={sIdx}
              onChange={(e) => {
                store.setPlaybackPlaying(false);
                store.setPlaybackSampleIndex(Number(e.target.value));
              }}
              style={{ flex: 1, minWidth: "140px", maxWidth: "420px", accentColor: "var(--color-accent-primary)" }}
            />
            <span className="mono-num" style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
              {formatMmSs(currentT)} / {formatMmSs(res.durationSeconds)} · SOC {currentSoc.toFixed(0)}%
            </span>
          </div>
        ) : (
          <span style={{ color: "var(--color-text-muted)" }}>
            Run a thermal simulation in Simulate to unlock heatmap playback.
          </span>
        )}
        <span className="mono-num" style={{ color: "var(--color-text-secondary)" }}>
          Engine v{res?.engineVersion ?? "0.1.0"} · Data v1.0.0
        </span>
      </div>
    </div>
  );
}
