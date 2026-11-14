import React from "react";
import { UI_STRINGS } from "../content/strings";
import {
  computePackNominalCapacityAh,
  computePackNominalEnergyKwh,
  computePackNominalVoltageV,
  getAllPackDefinitions,
  getParameterRegister,
} from "../domain/dataLoaders";
import { DataStatusBadge } from "../ui/DataStatusBadge";
import { InlineBanner } from "../ui/Primitives";

export function MethodologyPage(): React.ReactElement {
  const reg = getParameterRegister();
  const packs = getAllPackDefinitions();

  return (
    <section className="landing-section" style={{ borderBottom: 0 }}>
      <div className="container" style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        <div>
          <div className="caption-label">TRANSPARENCY &amp; PARAMETER REGISTER</div>
          <h1 style={{ margin: "var(--space-2) 0 var(--space-3)", fontSize: "40px", lineHeight: "46px" }}>
            Methodology &amp; Sources
          </h1>
          <p style={{ margin: 0, color: "var(--color-text-secondary)", maxWidth: "74ch" }}>
            Rendered directly from <code>data/parameters/register.json</code> (v{reg.parameterSetVersion}, reviewed{" "}
            {reg.lastReviewedDate}). Assumed geometry values are separated explicitly from open literature parameters.
          </p>
        </div>

        <InlineBanner tone="warning">{UI_STRINGS.modelDisclaimer}</InlineBanner>

        {/* Reference packs */}
        <div className="panel-card" style={{ padding: "var(--space-4)", overflowX: "auto" }}>
          <h2 style={{ margin: "0 0 var(--space-3)", fontSize: "20px" }}>1. Generic reference pack definitions</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Pack</th>
                <th>Config</th>
                <th>Cell form</th>
                <th>Nominal Voltage / Cap / Energy</th>
                <th>Cooling topology &amp; Nu_Dh</th>
                <th>Zones</th>
              </tr>
            </thead>
            <tbody>
              {packs.map((p) => (
                <tr key={p.id}>
                  <td>{p.displayName}</td>
                  <td className="mono-num">
                    {p.seriesCount}s{p.parallelCount}p
                  </td>
                  <td>{p.cell.formFactor === "PRISMATIC_BLADE" ? "Prismatic blade" : "Cylindrical 4680"}</td>
                  <td className="mono-num">
                    {computePackNominalVoltageV(p).toFixed(1)} V · {computePackNominalCapacityAh(p).toFixed(1)} Ah ·{" "}
                    {computePackNominalEnergyKwh(p).toFixed(1)} kWh
                  </td>
                  <td className="mono-num">
                    {p.cooling.topology} ({p.cooling.parallelChannels} ch, Nu={p.cooling.nusseltNumber})
                  </td>
                  <td className="mono-num">{p.zones.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Thermal & SoH Equations */}
        <div className="panel-card" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <h2 style={{ margin: 0, fontSize: "20px" }}>2. Thermal, SoH &amp; ROI model equations</h2>
          <p style={{ margin: 0, fontSize: "14px", color: "var(--color-text-secondary)" }}>
            <strong>Thermal ODEs (RK4, Δt = 1 s):</strong> Each zone evolves via{" "}
            <code>C_eff(T) dT_i/dt = Q_irr + Q_rev − Q_cool − Q_zz − Q_amb</code>, where{" "}
            <code>Q_irr = N_cells I² R_dc(SOC, T)</code> (bilinear lookup from S15),{" "}
            <code>Q_rev = N_cells I (T + 273.15) dV_ocv/dT</code> (F7 proxy curve), and laminar forced convection uses{" "}
            <code>Nu_Dh = 5.597</code> with 50 wt% ethylene glycol / water properties at 25 °C (F2 / F13).
          </p>
          <p style={{ margin: 0, fontSize: "14px", color: "var(--color-text-secondary)" }}>
            <strong>SoH forecast (Illustrative):</strong> LFP uses F9 Schimpe et al. (2018) semi-empirical calendar + cyclic fade scaled from 3 Ah 26650 proxy parameters; NMC uses Option B user-provided Arrhenius + throughput coefficients with zero invented defaults. Temperature sensitivity bands evaluate <code>T_rep ± 5 °C</code> (not statistical confidence intervals).
          </p>
          <p style={{ margin: 0, fontSize: "14px", color: "var(--color-text-secondary)" }}>
            <strong>Repair vs Replace ROI:</strong> Deterministic TypeScript arithmetic starting from empty user-supplied costs (default IDR). All substituted numbers remain inspectable under Calculation details.
          </p>
        </div>

        {/* Parameter register */}
        <div className="panel-card" style={{ padding: "var(--space-4)", overflowX: "auto" }}>
          <h2 style={{ margin: "0 0 var(--space-3)", fontSize: "20px" }}>3. Parameter register (live from data/parameters/register.json)</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Symbol</th>
                <th>Unit</th>
                <th>Status</th>
                <th>Source / Assumption</th>
              </tr>
            </thead>
            <tbody>
              {reg.parameters.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{p.applicability}</div>
                  </td>
                  <td className="mono-num">{p.symbol}</td>
                  <td className="mono-num">{p.unit}</td>
                  <td>
                    <DataStatusBadge status={p.status === "ASSUMED" ? "ASSUMED" : "MODELLED"} />
                    <div className="mono-num" style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: 4 }}>
                      {p.status}
                    </div>
                  </td>
                  <td>
                    <div>{p.sourceRef}</div>
                    <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{p.conditionOrAssumption}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Verification & Limitations */}
        <div className="panel-card" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <h2 style={{ margin: 0, fontSize: "20px" }}>4. Verification, limitations &amp; accessibility</h2>
          <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "14px", color: "var(--color-text-secondary)", lineHeight: "22px" }}>
            <li>
              <strong>V1–V6 Numerical checks:</strong> Energy balance error &lt; 0.01% (threshold ≤ 1%), steady-state analytic match ≤ 0.1 °C, timestep halving invariance ≤ 0.05 °C, adiabatic monotonicity, and Rust/Wasm vs Python reference solver agreement ≤ 0.005 °C across shared test vectors.
            </li>
            <li>
              <strong>Known limitations:</strong> Generic assumed pack/channel dimensions (not vehicle OEM telemetry); laminar Nu correlation loses accuracy at Re ≥ 2300; S15 resistance tables clamp outside 20–90% SOC and 10–40 °C; X-axis cross-section renders open-shell interior walls cleanly without Boolean cap extrusion (Risk T3).
            </li>
            <li>
              <strong>Accessibility scope (WCAG 2.1 AA):</strong> Interactive chrome, sliders, forms, live status descriptions, and tabular views follow WCAG 2.1 AA; the WebGL canvas cannot expose individual pixels to assistive technology directly, so the keyboard-navigable Component Tree, live state summary, and chart data tables provide equivalent access.
            </li>
          </ul>
        </div>

        {/* Open-source licences */}
        <div className="panel-card" style={{ padding: "var(--space-4)" }}>
          <h2 style={{ margin: "0 0 var(--space-2)", fontSize: "20px" }}>5. Third-party software, font &amp; icon licences</h2>
          <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "14px", color: "var(--color-text-secondary)", lineHeight: "22px" }}>
            <li>Inter &amp; JetBrains Mono (@fontsource): SIL Open Font License 1.1 (self-hosted offline bundle)</li>
            <li>Lucide React icons: ISC License</li>
            <li>Three.js, @react-three/fiber, @react-three/drei, Zustand: MIT License</li>
            <li>Rust core &amp; wasm-bindgen crates (serde, serde_json): MIT / Apache-2.0 License</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

