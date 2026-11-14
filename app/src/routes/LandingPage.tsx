import React from "react";
import { ArrowRight, Box, Calculator, Flame, Layers, ShieldCheck } from "lucide-react";
import { UI_STRINGS } from "../content/strings";
import {
  computePackNominalEnergyKwh,
  computePackNominalVoltageV,
  getAllPackDefinitions,
} from "../domain/dataLoaders";
import { DataStatusBadge } from "../ui/DataStatusBadge";
import { HeroPackPreview } from "../ui/HeroPackPreview";
import { PackSchematicPoster } from "../ui/PackSchematicPoster";

export function LandingPage(): React.ReactElement {
  const packs = getAllPackDefinitions();

  const scrollToHowItWorks = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const el = document.getElementById("how-it-works");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div>
      {/* Section 2: Hero */}
      <section className="landing-section">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-copy">
              <div className="caption-label">{UI_STRINGS.hero.category}</div>
              <h1 className="hero-headline">{UI_STRINGS.hero.headline}</h1>
              <p style={{ margin: "0 0 var(--space-6)", fontSize: "18px", lineHeight: "28px", color: "var(--color-text-secondary)" }}>
                {UI_STRINGS.hero.subtitle}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center" }}>
                <a href="#/simulator" className="btn btn-primary">
                  <span>{UI_STRINGS.hero.primaryCta}</span>
                  <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
                </a>
                <a href="#how-it-works" onClick={scrollToHowItWorks} className="btn btn-secondary">
                  {UI_STRINGS.hero.secondaryCta}
                </a>
              </div>
              <p style={{ marginTop: "var(--space-4)", fontSize: "13px", color: "var(--color-text-muted)" }}>
                {UI_STRINGS.modelDisclaimer}
              </p>
            </div>
            <div className="hero-visual">
              <HeroPackPreview />
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Capability strip */}
      <section className="landing-section landing-section--raised">
        <div className="container">
          <div className="grid-3">
            <div className="panel-card" style={{ padding: "var(--space-6)" }}>
              <Box size={22} strokeWidth={1.5} color="var(--color-accent-primary)" aria-hidden="true" />
              <h2 style={{ margin: "var(--space-3) 0 var(--space-2)", fontSize: "20px", lineHeight: "28px" }}>Inspect</h2>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--color-text-secondary)" }}>
                Explore internal pack structure, exploded assembly stages, 1-axis X-ray cross-section, and component parameters.
              </p>
            </div>
            <div className="panel-card" style={{ padding: "var(--space-6)" }}>
              <Flame size={22} strokeWidth={1.5} color="var(--color-accent-primary)" aria-hidden="true" />
              <h2 style={{ margin: "var(--space-3) 0 var(--space-2)", fontSize: "20px", lineHeight: "28px" }}>Simulate</h2>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--color-text-secondary)" }}>
                Test charging power, ambient temperature, and laminar liquid cooling flow rates across 10–12 thermal zones.
              </p>
            </div>
            <div className="panel-card" style={{ padding: "var(--space-6)" }}>
              <Calculator size={22} strokeWidth={1.5} color="var(--color-accent-secondary)" aria-hidden="true" />
              <h2 style={{ margin: "var(--space-3) 0 var(--space-2)", fontSize: "20px", lineHeight: "28px" }}>Decide</h2>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--color-text-secondary)" }}>
                Inspect illustrative SoH projections and compute repair-versus-replace economics directly from your own cost inputs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: How it works */}
      <section id="how-it-works" className="landing-section">
        <div className="container">
          <div className="caption-label">WORKFLOW</div>
          <h2 style={{ margin: "var(--space-2) 0 var(--space-6)", fontSize: "28px", lineHeight: "34px" }}>How it works</h2>
          <div className="grid-4">
            {[
              { step: "01", title: "Select architecture", body: "Choose the generic LFP blade pack or NMC 4680 cylindrical pack." },
              { step: "02", title: "Inspect anatomy", body: "Explode assembly layers, inspect cell specs, and slice along pack length." },
              { step: "03", title: "Run simulation", body: "Pick a charging scenario or tune parameters; view zone heatmap & hottest nodes." },
              { step: "04", title: "Evaluate lifecycle", body: "Review illustrative 1–8 yr capacity fade and inspectable ROI calculations." },
            ].map((item) => (
              <div key={item.step} className="panel-card" style={{ padding: "var(--space-4)" }}>
                <div className="mono-num" style={{ fontSize: "13px", color: "var(--color-accent-primary)", marginBottom: "var(--space-2)" }}>
                  STEP {item.step}
                </div>
                <h3 style={{ margin: "0 0 var(--space-2)", fontSize: "16px", fontWeight: 600 }}>{item.title}</h3>
                <p style={{ margin: 0, fontSize: "14px", color: "var(--color-text-secondary)" }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5: Architectures */}
      <section className="landing-section landing-section--raised">
        <div className="container">
          <div className="caption-label">REFERENCE CONFIGURATIONS</div>
          <h2 style={{ margin: "var(--space-2) 0 var(--space-2)", fontSize: "28px", lineHeight: "34px" }}>Two pack architectures</h2>
          <p style={{ margin: "0 0 var(--space-6)", fontSize: "14px", color: "var(--color-text-secondary)" }}>
            {UI_STRINGS.compareNonEquivalence}
          </p>
          <div className="grid-2">
            {packs.map((pack) => {
              const isLfp = pack.id === "LFP_BLADE";
              const route = isLfp ? "#/simulator/lfp" : "#/simulator/nmc";
              const energyKwh = computePackNominalEnergyKwh(pack);
              const voltageV = computePackNominalVoltageV(pack);
              return (
                <article key={pack.id} className="panel-card" style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-2)" }}>
                    <h3 style={{ margin: 0, fontSize: "20px", lineHeight: "28px" }}>{pack.displayName}</h3>
                    <DataStatusBadge status="MODELLED" />
                  </div>
                  <PackSchematicPoster architecture={pack.id} mode="assembled" />
                  <p style={{ margin: 0, fontSize: "14px", color: "var(--color-text-secondary)" }}>{pack.description}</p>
                  <table className="data-table">
                    <tbody>
                      <tr>
                        <th>Cell (Sourced: S15)</th>
                        <td className="mono-num">
                          {pack.cell.dimensionsMm.join(" x ")} mm · {pack.cell.nominalCapacityAh} Ah · {pack.cell.nominalVoltageV} V
                        </td>
                      </tr>
                      <tr>
                        <th>Specific heat (F1)</th>
                        <td className="mono-num">{pack.cell.specificHeatJPerKgK} J/(kg·K)</td>
                      </tr>
                      <tr>
                        <th>Pack config (Assumed)</th>
                        <td className="mono-num">
                          {pack.seriesCount}s{pack.parallelCount}p · {voltageV.toFixed(1)} V · {energyKwh.toFixed(2)} kWh
                        </td>
                      </tr>
                      <tr>
                        <th>Cooling topology</th>
                        <td>{pack.cooling.topology === "TOP_COLD_PLATE" ? "Top cold plate (14 ch)" : "Side cooling ribbons (12 ch)"}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div>
                    <a href={route} className="btn btn-secondary">
                      <span>Open in simulator</span>
                      <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 6: Engineering visualization */}
      <section className="landing-section">
        <div className="container">
          <div className="caption-label">3D & THERMAL VISUALIZATION</div>
          <h2 style={{ margin: "var(--space-2) 0 var(--space-6)", fontSize: "28px", lineHeight: "34px" }}>Engineering visualization</h2>
          <div className="grid-3">
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <PackSchematicPoster architecture="LFP_BLADE" mode="exploded" />
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontWeight: 600 }}>
                <Layers size={16} strokeWidth={1.5} color="var(--color-accent-primary)" aria-hidden="true" />
                <span>Exploded assembly</span>
              </div>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--color-text-secondary)" }}>
                Stage-by-stage separation of enclosure lid, BMS, cold plate / side channels, TIM layer, and cell bank.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <PackSchematicPoster architecture="NMC_4680" mode="cutaway" />
              <div style={{ fontWeight: 600 }}>1-Axis Cross-section</div>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--color-text-secondary)" }}>
                Slice along the longitudinal X axis to inspect internal channel paths and zones without mutating geometry.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <PackSchematicPoster architecture="LFP_BLADE" mode="thermal" />
              <div style={{ fontWeight: 600 }}>Zone thermal heatmap</div>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--color-text-secondary)" }}>
                Discrete 5-stop colour mapping per thermal zone with live min–max legend and neutral non-thermal casings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 7: Decision support */}
      <section className="landing-section landing-section--raised">
        <div className="container">
          <div className="caption-label">LIFECYCLE & MAINTENANCE ECONOMICS</div>
          <h2 style={{ margin: "var(--space-2) 0 var(--space-6)", fontSize: "28px", lineHeight: "34px" }}>Decision support</h2>
          <div className="grid-3">
            <div className="panel-card" style={{ padding: "var(--space-6)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
                <h3 style={{ margin: 0, fontSize: "18px" }}>SoH Projection</h3>
                <DataStatusBadge status="ILLUSTRATIVE" />
              </div>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--color-text-secondary)" }}>
                1–8 year capacity fade using F9 (Schimpe 2018) for LFP proxy cells and user-editable fade inputs (no defaults) for NMC, with a ±5 °C sensitivity band.
              </p>
            </div>
            <div className="panel-card" style={{ padding: "var(--space-6)" }}>
              <h3 style={{ margin: "0 0 var(--space-2)", fontSize: "18px" }}>Repair vs Replace</h3>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--color-text-secondary)" }}>
                Compare inspection, module swap, and pack replacement costs including downtime rates in IDR, USD, or EUR — empty by default so nothing is fabricated.
              </p>
            </div>
            <div className="panel-card" style={{ padding: "var(--space-6)" }}>
              <h3 style={{ margin: "0 0 var(--space-2)", fontSize: "18px" }}>Transparent Formulas</h3>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--color-text-secondary)" }}>
                Every ROI estimate shows the exact substituted arithmetic and rule criteria inside Calculation details.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 8: Methodology & trust */}
      <section className="landing-section">
        <div className="container">
          <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
            <ShieldCheck size={24} strokeWidth={1.5} color="var(--color-accent-primary)" aria-hidden="true" style={{ marginTop: 4 }} />
            <div>
              <div className="caption-label">TRANSPARENCY & PROVENANCE</div>
              <h2 style={{ margin: "var(--space-1) 0 0", fontSize: "28px", lineHeight: "34px" }}>Methodology & scope boundaries</h2>
            </div>
          </div>
          <div className="grid-3">
            <div className="panel-card" style={{ padding: "var(--space-4)" }}>
              <h3 style={{ margin: "0 0 var(--space-2)", fontSize: "16px" }}>What is modelled</h3>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--color-text-secondary)" }}>
                Lumped thermal network (10 / 12 zones) with F7 reversible heat, S15 R_dc(SOC, T), F1 heat capacity, F2 EG/water coolant, and F13 laminar Nu_Dh convection.
              </p>
            </div>
            <div className="panel-card" style={{ padding: "var(--space-4)" }}>
              <h3 style={{ margin: "0 0 var(--space-2)", fontSize: "16px" }}>What is assumed</h3>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--color-text-secondary)" }}>
                Series/parallel counts, channel dimensions (24 × 3 mm), TIM thicknesses, and uniform ambient coefficient h_amb = 5 W/(m²·K) are explicitly flagged as Assumed.
              </p>
            </div>
            <div className="panel-card" style={{ padding: "var(--space-4)" }}>
              <h3 style={{ margin: "0 0 var(--space-2)", fontSize: "16px" }}>What this is not</h3>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--color-text-secondary)" }}>
                Not 3D CFD, not validated against full-pack calorimetry, and not a prediction of thermal runaway, safety margins, or OEM service warranty.
              </p>
            </div>
          </div>
          <div style={{ marginTop: "var(--space-6)" }}>
            <a href="#/methodology" className="btn btn-secondary">
              <span>Read full methodology & parameter register</span>
              <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {/* Section 9: Closing CTA & Footer */}
      <section className="landing-section landing-section--raised" style={{ borderBottom: 0 }}>
        <div className="container" style={{ textAlign: "center" }}>
          <h2 style={{ margin: "0 0 var(--space-4)", fontSize: "28px", lineHeight: "34px" }}>Ready to explore the packs?</h2>
          <a href="#/simulator" className="btn btn-primary">
            <span>{UI_STRINGS.hero.primaryCta}</span>
            <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
          </a>
        </div>
      </section>
      <footer style={{ borderTop: "1px solid var(--color-border-subtle)", padding: "var(--space-6) 0", fontSize: "13px", color: "var(--color-text-muted)" }}>
        <div className="container" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "var(--space-4)" }}>
          <div>{UI_STRINGS.modelDisclaimer}</div>
          <div>{UI_STRINGS.footer.note}</div>
        </div>
      </footer>
    </div>
  );
}

