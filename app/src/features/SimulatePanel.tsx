import React from "react";
import { Play, RotateCcw, Square } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import type { ScenarioPreset, ThermalResult } from "../domain/contracts";
import { computeCoolingPreview, getPackDefinition, getPresets } from "../domain/dataLoaders";
import { validateSimulationConfig } from "../domain/validation";
import { useWorkspaceStore } from "../state/workspaceStore";
import { ThermalTimeSeriesChart } from "../ui/Charts";
import { DataStatusBadge } from "../ui/DataStatusBadge";
import { Disclosure, InlineBanner, SliderField } from "../ui/Primitives";

export interface SimulatePanelProps {
  onRun: () => void;
  onCancel: () => void;
}

const HotspotZonesList = React.memo(function HotspotZonesList({
  result,
}: {
  result: ThermalResult;
}): React.ReactElement {
  const simPlaybackSampleIndex = useWorkspaceStore((s) => s.simPlaybackSampleIndex);

  const zoneRanking = React.useMemo(() => {
    const nS = result.nSamples;
    const sIdx = Math.min(simPlaybackSampleIndex, Math.max(0, nS - 1));
    return result.zoneIds
      .map((zoneId, zIdx) => ({
        zoneId,
        tempC: result.zoneTemperaturesC[zIdx * nS + sIdx] ?? 0,
      }))
      .sort((a, b) => b.tempC - a.tempC);
  }, [result, simPlaybackSampleIndex]);

  return (
    <div>
      <div className="caption-label" style={{ marginBottom: "6px" }}>
        HOTSPOT ZONES (CLICK TO HIGHLIGHT)
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
        {zoneRanking.slice(0, 6).map((z) => {
          const isHot = z.zoneId === result.summary.hottestZoneId;
          return (
            <button
              key={z.zoneId}
              type="button"
              className="btn btn-secondary btn-sm mono-num"
              style={{
                justifyContent: "space-between",
                borderColor: isHot ? "var(--color-status-warning)" : undefined,
                minHeight: "30px",
                fontSize: "12px",
              }}
              onClick={() => useWorkspaceStore.getState().selectComponent("pack.cells", z.zoneId, null)}
            >
              <span>{z.zoneId.replace("pack.", "")}</span>
              <span>{z.tempC.toFixed(1)} °C</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

export function SimulatePanel({ onRun, onCancel }: SimulatePanelProps): React.ReactElement {
  const {
    architecture,
    simConfig,
    simStatus,
    simProgressPct,
    simError,
    selectedPresetId,
    thermalResult,
    thermalResultStale,
  } = useWorkspaceStore(
    useShallow((s) => ({
      architecture: s.architecture,
      simConfig: s.simConfig,
      simStatus: s.simStatus,
      simProgressPct: s.simProgressPct,
      simError: s.simError,
      selectedPresetId: s.selectedPresetId,
      thermalResult: s.thermalResult,
      thermalResultStale: s.thermalResultStale,
    }))
  );

  const pack = getPackDefinition(architecture);
  const presets = getPresets();
  const simValidation = validateSimulationConfig(simConfig);
  const coolingPreview = computeCoolingPreview(pack, simConfig.coolantFlowLpm);

  const hasError = simValidation.issues.some((i) => i.severity === "error");
  const isRunning = simStatus === "running";
  const res: ThermalResult | null = thermalResult;

  return (
    <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div>
        <label htmlFor="preset-select" className="caption-label" style={{ display: "block", marginBottom: "6px" }}>
          SCENARIO PRESET
        </label>
        <select
          id="preset-select"
          className="field-select"
          value={selectedPresetId}
          disabled={isRunning}
          onChange={(e) => {
            const v = e.target.value;
            if (v !== "custom") {
              useWorkspaceStore.getState().applyPreset(v as ScenarioPreset["id"]);
            }
          }}
        >
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} ({p.chargingPowerKw} kW, {p.ambientTemperatureC} °C, {p.coolantFlowLpm} L/min)
            </option>
          ))}
          <option value="custom">Custom scenario</option>
        </select>
      </div>

      <SliderField
        id="charging-power"
        label="Charging power"
        value={simConfig.chargingPowerKw}
        min={10}
        max={150}
        step={5}
        unit="kW"
        onChange={(v) => useWorkspaceStore.getState().updateSimConfig({ chargingPowerKw: v })}
        error={simValidation.issues.find((i) => i.field === "chargingPowerKw" && i.severity === "error")?.message}
        warning={simValidation.issues.find((i) => i.field === "chargingPowerKw" && i.severity === "warning")?.message}
      />

      <SliderField
        id="ambient-temp"
        label="Ambient temperature"
        value={simConfig.ambientTemperatureC}
        min={-10}
        max={45}
        step={1}
        unit="°C"
        onChange={(v) => useWorkspaceStore.getState().updateSimConfig({ ambientTemperatureC: v })}
        error={simValidation.issues.find((i) => i.field === "ambientTemperatureC" && i.severity === "error")?.message}
      />

      <SliderField
        id="coolant-flow"
        label="Coolant flow rate"
        value={simConfig.coolantFlowLpm}
        min={1}
        max={20}
        step={0.5}
        unit="L/min"
        onChange={(v) => useWorkspaceStore.getState().updateSimConfig({ coolantFlowLpm: v })}
        error={simValidation.issues.find((i) => i.field === "coolantFlowLpm" && i.severity === "error")?.message}
        warning={simValidation.issues.find((i) => i.field === "coolantFlowLpm" && i.severity === "warning")?.message}
      />

      <Disclosure summary="Advanced boundary parameters">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
          <label style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
            Coolant inlet (°C)
            <input
              type="number"
              className="field-input mono-num"
              min={-10}
              max={45}
              value={simConfig.coolantInletTemperatureC}
              onChange={(e) => useWorkspaceStore.getState().updateSimConfig({ coolantInletTemperatureC: Number(e.target.value) })}
            />
          </label>
          <label style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
            Max duration (min)
            <input
              type="number"
              className="field-input mono-num"
              min={1}
              max={180}
              value={simConfig.maxDurationMinutes}
              onChange={(e) => useWorkspaceStore.getState().updateSimConfig({ maxDurationMinutes: Number(e.target.value) })}
            />
          </label>
          <label style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
            Initial SOC (%)
            <input
              type="number"
              className="field-input mono-num"
              min={0}
              max={95}
              value={simConfig.initialSocPercent}
              onChange={(e) => useWorkspaceStore.getState().updateSimConfig({ initialSocPercent: Number(e.target.value) })}
            />
          </label>
          <label style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
            Target SOC (%)
            <input
              type="number"
              className="field-input mono-num"
              min={5}
              max={100}
              value={simConfig.targetSocPercent}
              onChange={(e) => useWorkspaceStore.getState().updateSimConfig({ targetSocPercent: Number(e.target.value) })}
            />
          </label>
        </div>
        {simValidation.issues
          .filter((i) => ["coolantInletTemperatureC", "maxDurationMinutes", "initialSocPercent", "targetSocPercent"].includes(i.field) && i.severity === "error")
          .map((i) => (
            <div key={i.field} style={{ color: "var(--color-status-danger)", fontSize: "12px", marginTop: "6px" }}>
              {i.field}: {i.message}
            </div>
          ))}
      </Disclosure>

      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        {isRunning ? (
          <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>
            <Square size={14} strokeWidth={1.5} aria-hidden="true" />
            <span>Cancel ({simProgressPct}%)</span>
          </button>
        ) : (
          <button type="button" className="btn btn-primary" style={{ flex: 1 }} disabled={hasError} onClick={onRun}>
            <Play size={14} strokeWidth={1.5} aria-hidden="true" />
            <span>Run simulation</span>
          </button>
        )}
        <button
          type="button"
          className="btn btn-secondary"
          disabled={isRunning}
          onClick={() => useWorkspaceStore.getState().resetSimulationInputs()}
        >
          <RotateCcw size={14} strokeWidth={1.5} aria-hidden="true" />
          <span>Reset parameters</span>
        </button>
      </div>

      <InlineBanner tone="info">
        Regime preview: <span className="mono-num">Re = {coolingPreview.reynoldsNumber.toFixed(1)}</span>, approx{" "}
        <span className="mono-num">{simValidation.approxCRate.toFixed(2)}C</span>.
      </InlineBanner>

      {simStatus === "failed" && simError && (
        <InlineBanner tone="danger">
          <div>
            <strong>Simulation failed:</strong> {simError}
          </div>
          <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: "6px" }} onClick={onRun}>
            Retry
          </button>
        </InlineBanner>
      )}

      {simStatus === "cancelled" && (
        <InlineBanner tone="warning">Simulation cancelled. Previous results (if any) remain marked stale.</InlineBanner>
      )}

      {res && thermalResultStale && (
        <InlineBanner tone="warning">
          Parameters changed — results below are from the previous run. Click Run simulation to update.
        </InlineBanner>
      )}

      {!res && simStatus === "idle" && (
        <div className="panel-card" style={{ padding: "var(--space-4)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          Run a simulation to inspect zone temperatures, cooling removal fraction, and 3D heatmap playback.
        </div>
      )}

      {res && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <span className="caption-label">RESULTS</span>
              <DataStatusBadge status={res.dataStatus} />
              <span className="badge badge--modelled mono-num" style={{ fontSize: "11px" }}>
                {res.validationStatus}
              </span>
            </div>
            <span className="mono-num" style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
              v{res.engineVersion}
            </span>
          </div>

          {res.warnings.length > 0 && (
            <InlineBanner tone="warning">
              <ul style={{ margin: 0, paddingLeft: "16px" }}>
                {res.warnings.map((w) => (
                  <li key={w.code} style={{ marginBottom: "2px" }}>
                    <span className="mono-num">{w.code}</span>: {w.message}
                  </li>
                ))}
              </ul>
            </InlineBanner>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
            <div className="panel-card" style={{ padding: "8px 10px" }}>
              <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Max temperature</div>
              <div className="mono-num" style={{ fontSize: "18px", fontWeight: 600 }}>
                {res.summary.maxTemperatureC.toFixed(1)} °C
              </div>
            </div>
            <div className="panel-card" style={{ padding: "8px 10px" }}>
              <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Pack average</div>
              <div className="mono-num" style={{ fontSize: "18px", fontWeight: 600 }}>
                {res.summary.averageTemperatureC.toFixed(1)} °C
              </div>
            </div>
            <div className="panel-card" style={{ padding: "8px 10px" }}>
              <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Zone spread ΔT</div>
              <div className="mono-num" style={{ fontSize: "16px", fontWeight: 600 }}>
                {res.summary.temperatureSpreadC.toFixed(1)} °C
              </div>
            </div>
            <div className="panel-card" style={{ padding: "8px 10px" }}>
              <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Hottest zone</div>
              <div className="mono-num" style={{ fontSize: "14px", fontWeight: 600 }}>
                {res.summary.hottestZoneId}
              </div>
            </div>
            <div className="panel-card" style={{ padding: "8px 10px" }}>
              <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Heat removed</div>
              <div className="mono-num" style={{ fontSize: "15px", fontWeight: 600 }}>
                {(res.summary.coolingHeatRemovalFraction * 100).toFixed(1)} %
              </div>
            </div>
            <div className="panel-card" style={{ padding: "8px 10px" }}>
              <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Coolant ΔT / Re</div>
              <div className="mono-num" style={{ fontSize: "13px", fontWeight: 600 }}>
                {res.summary.coolantDeltaTC.toFixed(1)} °C · Re {res.summary.reynoldsNumber.toFixed(0)}
              </div>
            </div>
          </div>

          <ThermalTimeSeriesChart result={res} />

          <HotspotZonesList result={res} />
        </div>
      )}
    </div>
  );
}
