import React from "react";
import { TrendingDown } from "lucide-react";
import { UI_STRINGS } from "../content/strings";
import { useWorkspaceStore } from "../state/workspaceStore";
import { SohForecastChart } from "../ui/Charts";
import { DataStatusBadge } from "../ui/DataStatusBadge";
import { InlineBanner, SliderField } from "../ui/Primitives";

export interface ForecastPanelProps {
  onRunSoh: () => void;
}

function numOrNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function ForecastPanel({ onRunSoh }: ForecastPanelProps): React.ReactElement {
  const store = useWorkspaceStore();
  const cfg = store.sohConfig;
  const isNmc = store.architecture === "NMC_4680";
  const forecast = store.sohForecast;

  const nmcMissing =
    isNmc &&
    (cfg.nmcCalendarLossPctPerSqrtYear === null ||
      cfg.nmcCalendarLossPctPerSqrtYear === undefined ||
      cfg.nmcCycleLossPctPerFec === null ||
      cfg.nmcCycleLossPctPerFec === undefined ||
      cfg.nmcCycleExponent === null ||
      cfg.nmcCycleExponent === undefined ||
      cfg.nmcActivationEnergyJPerMol === null ||
      cfg.nmcActivationEnergyJPerMol === undefined ||
      cfg.nmcReferenceTempC === null ||
      cfg.nmcReferenceTempC === undefined);

  return (
    <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
        <DataStatusBadge status="ILLUSTRATIVE" />
        <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
          {isNmc ? "NMC Option B (user inputs)" : "F9 Schimpe 2018 LFP proxy"}
        </span>
      </div>

      {store.thermalResult && (
        <InlineBanner tone="info">
          Representative temp (<span className="mono-num">{cfg.representativeTemperatureC.toFixed(1)} °C</span>) &amp;
          avg C-rate (<span className="mono-num">{cfg.averageCRate.toFixed(2)}C</span>) seeded from your thermal run.
        </InlineBanner>
      )}

      <SliderField
        id="soh-horizon"
        label="Projection horizon"
        value={cfg.horizonYears}
        min={1}
        max={8}
        step={1}
        unit="years"
        onChange={(v) => store.updateSohConfig({ horizonYears: v })}
      />

      <SliderField
        id="soh-threshold"
        label="End-of-life threshold"
        value={cfg.thresholdPercent}
        min={50}
        max={95}
        step={1}
        unit="%"
        onChange={(v) => store.updateSohConfig({ thresholdPercent: v })}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
        <label style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
          Starting SoH (%)
          <input
            type="number"
            className="field-input mono-num"
            min={50}
            max={100}
            step={0.5}
            value={cfg.baselineSohPercent}
            onChange={(e) => store.updateSohConfig({ baselineSohPercent: Number(e.target.value) })}
          />
        </label>
        <label style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
          Cycles / year (FEC)
          <input
            type="number"
            className="field-input mono-num"
            min={10}
            max={1500}
            step={25}
            value={cfg.equivalentFullCyclesPerYear}
            onChange={(e) => store.updateSohConfig({ equivalentFullCyclesPerYear: Number(e.target.value) })}
          />
        </label>
        <label style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
          Representative temp (°C)
          <input
            type="number"
            className="field-input mono-num"
            min={-10}
            max={60}
            step={0.5}
            value={cfg.representativeTemperatureC}
            onChange={(e) => store.updateSohConfig({ representativeTemperatureC: Number(e.target.value) })}
          />
        </label>
        <label style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
          Average charge C-rate
          <input
            type="number"
            className="field-input mono-num"
            min={0.1}
            max={4}
            step={0.1}
            value={cfg.averageCRate}
            onChange={(e) => store.updateSohConfig({ averageCRate: Number(e.target.value) })}
          />
        </label>
      </div>

      {!isNmc ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
          <label style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
            Depth of discharge (%)
            <input
              type="number"
              className="field-input mono-num"
              min={10}
              max={100}
              step={5}
              value={cfg.depthOfDischargePercent}
              onChange={(e) => store.updateSohConfig({ depthOfDischargePercent: Number(e.target.value) })}
            />
          </label>
          <label style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
            Resting SOC (%)
            <input
              type="number"
              className="field-input mono-num"
              min={0}
              max={100}
              step={5}
              value={cfg.averageRestingSocPercent}
              onChange={(e) => store.updateSohConfig({ averageRestingSocPercent: Number(e.target.value) })}
            />
          </label>
        </div>
      ) : (
        <div className="panel-card" style={{ padding: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <div className="caption-label">NMC FADE COEFFICIENTS (USER-REQUIRED, NO DEFAULTS)</div>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-muted)" }}>
            Per design decision G2-3 Option B, no literature NMC coefficients are prefilled. Enter explicit parameters to project NMC SoH.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
            <label style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
              Cal. fade (% / √yr)
              <input
                type="number"
                className="field-input mono-num"
                placeholder="e.g. 1.5"
                step={0.1}
                value={cfg.nmcCalendarLossPctPerSqrtYear ?? ""}
                onChange={(e) => store.updateSohConfig({ nmcCalendarLossPctPerSqrtYear: numOrNull(e.target.value) })}
              />
            </label>
            <label style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
              Cycle fade (% / FEC)
              <input
                type="number"
                className="field-input mono-num"
                placeholder="e.g. 0.004"
                step={0.001}
                value={cfg.nmcCycleLossPctPerFec ?? ""}
                onChange={(e) => store.updateSohConfig({ nmcCycleLossPctPerFec: numOrNull(e.target.value) })}
              />
            </label>
            <label style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
              Cycle exponent
              <input
                type="number"
                className="field-input mono-num"
                placeholder="e.g. 1.0"
                step={0.05}
                value={cfg.nmcCycleExponent ?? ""}
                onChange={(e) => store.updateSohConfig({ nmcCycleExponent: numOrNull(e.target.value) })}
              />
            </label>
            <label style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
              Ea (J / mol)
              <input
                type="number"
                className="field-input mono-num"
                placeholder="e.g. 25000"
                step={500}
                value={cfg.nmcActivationEnergyJPerMol ?? ""}
                onChange={(e) => store.updateSohConfig({ nmcActivationEnergyJPerMol: numOrNull(e.target.value) })}
              />
            </label>
            <label style={{ fontSize: "12px", color: "var(--color-text-secondary)", gridColumn: "1 / -1" }}>
              Reference temp (°C)
              <input
                type="number"
                className="field-input mono-num"
                placeholder="e.g. 25"
                step={1}
                value={cfg.nmcReferenceTempC ?? ""}
                onChange={(e) => store.updateSohConfig({ nmcReferenceTempC: numOrNull(e.target.value) })}
              />
            </label>
          </div>
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary"
        disabled={store.sohStatus === "running" || nmcMissing}
        onClick={onRunSoh}
      >
        <TrendingDown size={15} strokeWidth={1.5} aria-hidden="true" />
        <span>{store.sohStatus === "running" ? "Computing…" : "Compute SoH projection"}</span>
      </button>

      {store.sohError && <InlineBanner tone="danger">{store.sohError}</InlineBanner>}

      {!forecast ? (
        <div className="panel-card" style={{ padding: "var(--space-3)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          Enter usage assumptions and click Compute SoH projection to view the 1–8 year capacity curve and ±5 °C temperature sensitivity band.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <div className="panel-card" style={{ padding: "var(--space-3)" }}>
            <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>End-of-horizon projected SoH (Yr {cfg.horizonYears})</div>
            <div className="mono-num" style={{ fontSize: "20px", fontWeight: 600 }}>
              {(forecast.points[forecast.points.length - 1]?.sohPercent ?? 0).toFixed(1)} %
            </div>
            <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "4px" }}>
              {forecast.thresholdCrossingYear !== null
                ? `Crosses ${cfg.thresholdPercent}% threshold near Year ${forecast.thresholdCrossingYear.toFixed(1)}.`
                : `Remains above ${cfg.thresholdPercent}% threshold through Year ${cfg.horizonYears}.`}
            </div>
          </div>

          <SohForecastChart forecast={forecast} thresholdPercent={cfg.thresholdPercent} />

          <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
            <strong>Model:</strong> {forecast.modelName}
            <ul style={{ margin: "6px 0 0", paddingLeft: "16px" }}>
              {forecast.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <p style={{ margin: "6px 0 0" }}>{UI_STRINGS.sohIllustrativeNote}</p>
          </div>
        </div>
      )}
    </div>
  );
}

