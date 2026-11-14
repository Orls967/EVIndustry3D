import React, { Suspense, useState } from "react";
import { Link2, Link2Off, Play } from "lucide-react";
import { UI_STRINGS } from "../content/strings";
import type { ArchitectureId, ScenarioPreset, SimulationConfig, ThermalResult } from "../domain/contracts";
import {
  computePackNominalEnergyKwh,
  getPackDefinition,
  getPresetById,
  getPresets,
} from "../domain/dataLoaders";
import { runComparisonPair } from "../engine/simulationController";
import type { SharedCameraPose } from "../scene/components/CameraAndClipControllers";
import { DataStatusBadge } from "../ui/DataStatusBadge";
import { PackSchematicPoster } from "../ui/PackSchematicPoster";
import { InlineBanner, SegmentedControl } from "../ui/Primitives";

const LazyPackCanvas = React.lazy(() =>
  import("../scene/PackCanvas").then((mod) => ({ default: mod.PackCanvas }))
);

function buildCompareConfig(
  arch: ArchitectureId,
  preset: ScenarioPreset,
  mode: "equal_power" | "equal_crate",
  targetCRate: number
): SimulationConfig {
  const pack = getPackDefinition(arch);
  const energyKwh = computePackNominalEnergyKwh(pack);
  const chargingPowerKw =
    mode === "equal_power"
      ? preset.chargingPowerKw
      : Math.min(Math.max(Number((targetCRate * energyKwh).toFixed(2)), 10), 250);

  return {
    scenarioId: `cmp-${arch.toLowerCase()}`,
    architecture: arch,
    chargingPowerKw,
    ambientTemperatureC: preset.ambientTemperatureC,
    coolantFlowLpm: preset.coolantFlowLpm,
    coolantInletTemperatureC: preset.coolantInletTemperatureC,
    initialSocPercent: preset.initialSocPercent,
    targetSocPercent: preset.targetSocPercent,
    maxDurationMinutes: preset.maxDurationMinutes,
    initialPackTemperatureC: preset.ambientTemperatureC,
  };
}

export function ComparePage(): React.ReactElement {
  const presets = getPresets();
  const lfpPack = getPackDefinition("LFP_BLADE");
  const nmcPack = getPackDefinition("NMC_4680");
  const lfpEnergy = computePackNominalEnergyKwh(lfpPack);
  const nmcEnergy = computePackNominalEnergyKwh(nmcPack);

  const [presetId, setPresetId] = useState<ScenarioPreset["id"]>("fast_charging");
  const [eqMode, setEqMode] = useState<"equal_power" | "equal_crate">("equal_power");
  const [targetCRate, setTargetCRate] = useState<number>(1.5);
  const [camerasLinked, setCamerasLinked] = useState<boolean>(true);
  const [sharedPose, setSharedPose] = useState<SharedCameraPose | null>(null);
  const [mobilePack, setMobilePack] = useState<ArchitectureId>("LFP_BLADE");

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ lfp: ThermalResult; nmc: ThermalResult } | null>(null);

  const handleRunBoth = async () => {
    setRunning(true);
    setError(null);
    try {
      const preset = getPresetById(presetId);
      const lfpCfg = buildCompareConfig("LFP_BLADE", preset, eqMode, targetCRate);
      const nmcCfg = buildCompareConfig("NMC_4680", preset, eqMode, targetCRate);
      const pair = await runComparisonPair(lfpCfg, nmcCfg);
      setResults(pair);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  };

  const sharedTempRange: [number, number] = results
    ? [
        Math.floor(
          Math.min(
            25,
            ...Array.from(results.lfp.zoneTemperaturesC),
            ...Array.from(results.nmc.zoneTemperaturesC)
          )
        ),
        Math.ceil(
          Math.max(
            35,
            results.lfp.summary.maxTemperatureC,
            results.nmc.summary.maxTemperatureC
          )
        ),
      ]
    : [25, 55];

  return (
    <section className="landing-section" style={{ borderBottom: 0 }}>
      <div className="container" style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <div>
          <div className="caption-label">COMPARISON VIEW</div>
          <h1 style={{ margin: "var(--space-2) 0 var(--space-3)", fontSize: "36px", lineHeight: "42px" }}>
            Compare LFP Blade and NMC 4680
          </h1>
          <InlineBanner tone="info">{UI_STRINGS.compareNonEquivalence}</InlineBanner>
        </div>

        {/* Comparison controls toolbar */}
        <div
          className="panel-card"
          style={{
            padding: "var(--space-4)",
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--space-3)",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "flex-end" }}>
            <label style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
              Scenario
              <select
                className="field-select"
                value={presetId}
                onChange={(e) => setPresetId(e.target.value as ScenarioPreset["id"])}
              >
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} ({p.chargingPowerKw} kW, {p.ambientTemperatureC} °C)
                  </option>
                ))}
              </select>
            </label>

            <div>
              <div className="caption-label" style={{ marginBottom: "4px" }}>
                EQUIVALENCE BASIS
              </div>
              <SegmentedControl
                name="Comparison equivalence mode"
                value={eqMode}
                onChange={(v) => setEqMode(v as "equal_power" | "equal_crate")}
                options={[
                  { value: "equal_power", label: "Equal power (kW)" },
                  { value: "equal_crate", label: "Equal C-rate (1/h)" },
                ]}
              />
            </div>

            {eqMode === "equal_crate" && (
              <label style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                Target C-rate (1/h)
                <input
                  type="number"
                  className="field-input mono-num"
                  style={{ width: "92px" }}
                  min={0.5}
                  max={2.5}
                  step={0.1}
                  value={targetCRate}
                  onChange={(e) => setTargetCRate(Number(e.target.value) || 1.0)}
                />
              </label>
            )}
          </div>

          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-secondary"
              aria-pressed={camerasLinked}
              onClick={() => setCamerasLinked((v) => !v)}
            >
              {camerasLinked ? <Link2 size={15} strokeWidth={1.5} /> : <Link2Off size={15} strokeWidth={1.5} />}
              <span>{camerasLinked ? "Cameras linked" : "Cameras unlinked"}</span>
            </button>
            <button type="button" className="btn btn-primary" disabled={running} onClick={() => void handleRunBoth()}>
              <Play size={15} strokeWidth={1.5} aria-hidden="true" />
              <span>{running ? "Running both…" : "Run comparison"}</span>
            </button>
          </div>
        </div>

        {error && <InlineBanner tone="danger">{error}</InlineBanner>}

        {/* Mobile pack switcher (< 1200 px) */}
        <div className="compare-mobile-switcher">
          <SegmentedControl
            name="Select pack viewport"
            value={mobilePack}
            onChange={(v) => setMobilePack(v as ArchitectureId)}
            options={[
              { value: "LFP_BLADE", label: "LFP Blade (120s1p)" },
              { value: "NMC_4680", label: "NMC 4680 (92s9p)" },
            ]}
          />
        </div>

        {/* Dual synced viewports (side by side on desktop >= 1200px) */}
        <div className="compare-viewports-grid">
          {(["LFP_BLADE", "NMC_4680"] as const).map((arch) => {
            const p = arch === "LFP_BLADE" ? lfpPack : nmcPack;
            const res = results ? (arch === "LFP_BLADE" ? results.lfp : results.nmc) : null;
            const hiddenMobile = mobilePack !== arch ? "compare-card--mobile-hidden" : "";
            return (
              <div key={arch} className={`panel-card ${hiddenMobile}`} style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h2 style={{ margin: 0, fontSize: "18px" }}>{p.displayName}</h2>
                  <DataStatusBadge status="MODELLED" />
                </div>
                <div style={{ height: "380px" }}>
                  <Suspense fallback={<PackSchematicPoster architecture={arch} mode="assembled" />}>
                    <LazyPackCanvas
                      architecture={arch}
                      overrideResult={res}
                      overrideSampleIndex={res ? Math.max(0, res.nSamples - 1) : 0}
                      overrideHeatmapOn={Boolean(res)}
                      overrideTempRange={sharedTempRange}
                      overrideExplodePercent={35}
                      syncId={camerasLinked ? arch : undefined}
                      externalPose={camerasLinked ? sharedPose : null}
                      onBroadcastPose={camerasLinked ? setSharedPose : undefined}
                    />
                  </Suspense>
                </div>
              </div>
            );
          })}
        </div>

        {/* Shared temperature color legend bar */}
        <div className="panel-card" style={{ padding: "var(--space-3)", display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <span className="caption-label">SHARED TEMPERATURE SCALE</span>
          <span className="mono-num" style={{ fontSize: "12px" }}>
            {sharedTempRange[0]} °C
          </span>
          <div
            style={{
              flex: 1,
              minWidth: "160px",
              height: "12px",
              borderRadius: "4px",
              background: "linear-gradient(to right, #3b6fe0 0%, #3fbf7f 33%, #f2d13d 60%, #f28c28 80%, #e5484d 100%)",
              border: "1px solid var(--color-border-subtle)",
            }}
          />
          <span className="mono-num" style={{ fontSize: "12px" }}>
            {sharedTempRange[1]} °C
          </span>
        </div>

        {/* Metrics table with explicit non-equivalence disclosures (PRD FR-10) */}
        <div className="panel-card" style={{ padding: "var(--space-4)", overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>LFP Blade</th>
                <th>NMC 4680</th>
                <th>Unit</th>
                <th>Configuration &amp; regime note</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Max temperature</td>
                <td className="mono-num">{results ? results.lfp.summary.maxTemperatureC.toFixed(1) : "—"}</td>
                <td className="mono-num">{results ? results.nmc.summary.maxTemperatureC.toFixed(1) : "—"}</td>
                <td className="mono-num">°C</td>
                <td>{results ? `Hottest: ${results.lfp.summary.hottestZoneId} vs ${results.nmc.summary.hottestZoneId}` : "Run comparison to compute"}</td>
              </tr>
              <tr>
                <td>Average temperature</td>
                <td className="mono-num">{results ? results.lfp.summary.averageTemperatureC.toFixed(1) : "—"}</td>
                <td className="mono-num">{results ? results.nmc.summary.averageTemperatureC.toFixed(1) : "—"}</td>
                <td className="mono-num">°C</td>
                <td>End-of-charge spatial average</td>
              </tr>
              <tr>
                <td>Zone temperature spread</td>
                <td className="mono-num">{results ? results.lfp.summary.temperatureSpreadC.toFixed(1) : "—"}</td>
                <td className="mono-num">{results ? results.nmc.summary.temperatureSpreadC.toFixed(1) : "—"}</td>
                <td className="mono-num">°C</td>
                <td>10 zones (LFP top plate) vs 12 zones (NMC side ribbons)</td>
              </tr>
              <tr>
                <td>Heat removed by coolant</td>
                <td className="mono-num">{results ? (results.lfp.summary.coolingHeatRemovalFraction * 100).toFixed(1) : "—"}</td>
                <td className="mono-num">{results ? (results.nmc.summary.coolingHeatRemovalFraction * 100).toFixed(1) : "—"}</td>
                <td className="mono-num">%</td>
                <td>Fraction of total reversible + irreversible heat extracted</td>
              </tr>
              <tr>
                <td>Pack nominal energy</td>
                <td className="mono-num">{lfpEnergy.toFixed(1)}</td>
                <td className="mono-num">{nmcEnergy.toFixed(1)}</td>
                <td className="mono-num">kWh</td>
                <td>Non-equivalent pack capacities: 120s1p vs 92s9p</td>
              </tr>
              <tr>
                <td>Peak C-rate</td>
                <td className="mono-num">{results ? results.lfp.summary.peakCRate.toFixed(2) : "—"}</td>
                <td className="mono-num">{results ? results.nmc.summary.peakCRate.toFixed(2) : "—"}</td>
                <td className="mono-num">1/h</td>
                <td>
                  {eqMode === "equal_power"
                    ? "Differs at equal power because pack energies differ"
                    : "Matched by scaling charging power proportionally to pack energy"}
                </td>
              </tr>
              <tr>
                <td>Coolant Reynolds number</td>
                <td className="mono-num">{results ? results.lfp.summary.reynoldsNumber.toFixed(0) : "—"}</td>
                <td className="mono-num">{results ? results.nmc.summary.reynoldsNumber.toFixed(0) : "—"}</td>
                <td className="mono-num">Re</td>
                <td>Laminar model assumes Re &lt; 2300 (50% EG baseline)</td>
              </tr>
            </tbody>
          </table>
          <p style={{ margin: "var(--space-3) 0 0", fontSize: "13px", color: "var(--color-text-secondary)", fontWeight: 500 }}>
            No universal winner: results depend on configuration and scenario.
          </p>
        </div>
      </div>
    </section>
  );
}

