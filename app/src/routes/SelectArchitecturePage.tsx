import React from "react";
import { ArrowRight } from "lucide-react";
import { UI_STRINGS } from "../content/strings";
import type { ArchitectureId } from "../domain/contracts";
import {
  computePackNominalEnergyKwh,
  computePackNominalVoltageV,
  getAllPackDefinitions,
} from "../domain/dataLoaders";
import { useWorkspaceStore } from "../state/workspaceStore";
import { DataStatusBadge } from "../ui/DataStatusBadge";
import { PackSchematicPoster } from "../ui/PackSchematicPoster";
import { InlineBanner } from "../ui/Primitives";

export function SelectArchitecturePage({
  onNavigate,
}: {
  onNavigate: (hash: string) => void;
}): React.ReactElement {
  const packs = getAllPackDefinitions();
  const requestArchitectureSwitch = useWorkspaceStore((s) => s.requestArchitectureSwitch);
  const thermalResult = useWorkspaceStore((s) => s.thermalResult);
  const activeArch = useWorkspaceStore((s) => s.architecture);

  const handleOpen = (arch: ArchitectureId) => {
    const targetHash = arch === "LFP_BLADE" ? "#/simulator/lfp" : "#/simulator/nmc";
    if (arch === activeArch || thermalResult === null) {
      requestArchitectureSwitch(arch);
      onNavigate(targetHash);
      return;
    }
    const switchedImmediately = requestArchitectureSwitch(arch);
    if (switchedImmediately) {
      onNavigate(targetHash);
    }
  };

  return (
    <section className="landing-section" style={{ borderBottom: 0 }}>
      <div className="container">
        <div className="caption-label">STEP 1 · ARCHITECTURE SELECTION</div>
        <h1 style={{ margin: "var(--space-2) 0 var(--space-3)", fontSize: "40px", lineHeight: "46px" }}>
          Choose a battery architecture
        </h1>
        <p style={{ margin: "0 0 var(--space-6)", color: "var(--color-text-secondary)", maxWidth: "68ch" }}>
          {UI_STRINGS.selectionDisclaimer}
        </p>

        <div className="grid-2" style={{ marginBottom: "var(--space-6)" }}>
          {packs.map((pack) => {
            const energyKwh = computePackNominalEnergyKwh(pack);
            const voltageV = computePackNominalVoltageV(pack);
            return (
              <article
                key={pack.id}
                className="panel-card"
                style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-2)" }}>
                  <h2 style={{ margin: 0, fontSize: "20px", lineHeight: "28px" }}>{pack.displayName}</h2>
                  <DataStatusBadge status="MODELLED" />
                </div>

                <PackSchematicPoster architecture={pack.id} mode="assembled" />

                <table className="data-table">
                  <tbody>
                    <tr>
                      <th>Cell format</th>
                      <td>
                        {pack.cell.formFactor === "PRISMATIC_BLADE"
                          ? `Prismatic blade (${pack.cell.dimensionsMm.join(" x ")} mm)`
                          : `Cylindrical 4680 (${pack.cell.dimensionsMm.join(" x ")} mm)`}
                      </td>
                    </tr>
                    <tr>
                      <th>Cooling</th>
                      <td>
                        {pack.cooling.topology === "TOP_COLD_PLATE"
                          ? `Top cold plate (${pack.cooling.parallelChannels} rectangular channels, Nu = ${pack.cooling.nusseltNumber})`
                          : `Side cooling ribbons (${pack.cooling.parallelChannels} rectangular channels, Nu = ${pack.cooling.nusseltNumber})`}
                      </td>
                    </tr>
                    <tr>
                      <th>Configuration</th>
                      <td className="mono-num">
                        {pack.seriesCount}s{pack.parallelCount}p · {pack.zones.length} thermal zones
                      </td>
                    </tr>
                    <tr>
                      <th>Nominal energy</th>
                      <td className="mono-num">
                        {energyKwh.toFixed(2)} kWh ({voltageV.toFixed(1)} V nominal)
                      </td>
                    </tr>
                  </tbody>
                </table>

                <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text-muted)" }}>{pack.provenanceNote}</p>

                <div style={{ marginTop: "auto", display: "flex", gap: "var(--space-3)" }}>
                  <button type="button" className="btn btn-primary" onClick={() => handleOpen(pack.id)}>
                    <span>Open workspace</span>
                    <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <InlineBanner tone="info">{UI_STRINGS.compareNonEquivalence}</InlineBanner>
      </div>
    </section>
  );
}

