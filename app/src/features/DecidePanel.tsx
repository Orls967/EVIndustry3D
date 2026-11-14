import React from "react";
import type { CurrencyCode } from "../domain/contracts";
import { computeRoiEstimate, formatCurrency } from "../domain/roi";
import { useWorkspaceStore } from "../state/workspaceStore";
import { Disclosure, InlineBanner } from "../ui/Primitives";

function parseCost(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function DecidePanel(): React.ReactElement {
  const store = useWorkspaceStore();
  const roi = store.roiInputs;
  const result = computeRoiEstimate(roi);

  return (
    <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div>
        <div className="caption-label">DECISION CALCULATOR (REPAIR VS REPLACE)</div>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--color-text-secondary)" }}>
          All cost fields start empty so no unverified market prices are assumed. Enter your own quotes below.
        </p>
      </div>

      {roi.projectedEndSohPercent !== null && (
        <InlineBanner tone={roi.projectedEndSohPercent < roi.eolThresholdPercent ? "warning" : "info"}>
          Linked from Forecast: projected Year-{roi.analysisHorizonYears} SoH ={" "}
          <span className="mono-num">{roi.projectedEndSohPercent.toFixed(1)}%</span> (threshold{" "}
          <span className="mono-num">{roi.eolThresholdPercent.toFixed(0)}%</span>).
        </InlineBanner>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
        <label style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
          Currency
          <select
            className="field-select mono-num"
            value={roi.currency}
            onChange={(e) => store.updateRoiInputs({ currency: e.target.value as CurrencyCode })}
          >
            <option value="IDR">IDR (Rp)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
          </select>
        </label>
        <label style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
          Modules to replace
          <input
            type="number"
            className="field-input mono-num"
            min={1}
            step={1}
            value={roi.modulesToReplaceCount}
            onChange={(e) =>
              store.updateRoiInputs({ modulesToReplaceCount: Math.max(1, Math.floor(Number(e.target.value) || 1)) })
            }
          />
        </label>

        <label style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
          Inspection cost ({roi.currency})
          <input
            type="number"
            className="field-input mono-num"
            placeholder="Required"
            min={0}
            value={roi.inspectionCost ?? ""}
            onChange={(e) => store.updateRoiInputs({ inspectionCost: parseCost(e.target.value) })}
          />
        </label>
        <label style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
          Module cost each ({roi.currency})
          <input
            type="number"
            className="field-input mono-num"
            placeholder="Required"
            min={0}
            value={roi.moduleReplacementCost ?? ""}
            onChange={(e) => store.updateRoiInputs({ moduleReplacementCost: parseCost(e.target.value) })}
          />
        </label>

        <label style={{ fontSize: "12px", color: "var(--color-text-secondary)", gridColumn: "1 / -1" }}>
          Full pack replacement cost ({roi.currency})
          <input
            type="number"
            className="field-input mono-num"
            placeholder="Required"
            min={0}
            value={roi.packReplacementCost ?? ""}
            onChange={(e) => store.updateRoiInputs({ packReplacementCost: parseCost(e.target.value) })}
          />
        </label>
      </div>

      <Disclosure summary="Optional downtime, deferral & payback inputs">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
          <label style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
            Downtime / day ({roi.currency})
            <input
              type="number"
              className="field-input mono-num"
              placeholder="Optional"
              min={0}
              value={roi.downtimeCostPerDay ?? ""}
              onChange={(e) => store.updateRoiInputs({ downtimeCostPerDay: parseCost(e.target.value) })}
            />
          </label>
          <label style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
            Repair downtime (days)
            <input
              type="number"
              className="field-input mono-num"
              placeholder="0"
              min={0}
              value={roi.repairDowntimeDays ?? ""}
              onChange={(e) => store.updateRoiInputs({ repairDowntimeDays: parseCost(e.target.value) })}
            />
          </label>
          <label style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
            Replace downtime (days)
            <input
              type="number"
              className="field-input mono-num"
              placeholder="0"
              min={0}
              value={roi.replacementDowntimeDays ?? ""}
              onChange={(e) => store.updateRoiInputs({ replacementDowntimeDays: parseCost(e.target.value) })}
            />
          </label>
          <label style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
            Deferral escalation (%/yr)
            <input
              type="number"
              className="field-input mono-num"
              placeholder="Optional"
              min={0}
              value={roi.deferralAnnualCostIncreasePct ?? ""}
              onChange={(e) => store.updateRoiInputs({ deferralAnnualCostIncreasePct: parseCost(e.target.value) })}
            />
          </label>
          <label style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
            Deferral horizon (yr)
            <input
              type="number"
              className="field-input mono-num"
              min={1}
              step={1}
              value={roi.deferralYears}
              onChange={(e) => store.updateRoiInputs({ deferralYears: Math.max(1, Number(e.target.value) || 1) })}
            />
          </label>
          <label style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
            Annual benefit ({roi.currency}/yr)
            <input
              type="number"
              className="field-input mono-num"
              placeholder="For payback"
              min={0}
              value={roi.annualBenefitOfActing ?? ""}
              onChange={(e) => store.updateRoiInputs({ annualBenefitOfActing: parseCost(e.target.value) })}
            />
          </label>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "var(--space-2)", fontSize: "12px", color: "var(--color-text-secondary)" }}>
          <input
            type="checkbox"
            checked={roi.repairAddressesPackWideAgeing}
            onChange={(e) => store.updateRoiInputs({ repairAddressesPackWideAgeing: e.target.checked })}
          />
          <span>Repair addresses pack-wide ageing</span>
        </label>
      </Disclosure>

      {!result.readyToCompare ? (
        <div className="panel-card" style={{ padding: "var(--space-3)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          {result.recommendationText} Enter inspection, module replacement, and pack replacement costs above.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
            <div className="panel-card" style={{ padding: "8px 10px" }}>
              <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Repair total</div>
              <div className="mono-num" style={{ fontSize: "15px", fontWeight: 600 }}>
                {formatCurrency(result.repairCost ?? 0, result.currency)}
              </div>
            </div>
            <div className="panel-card" style={{ padding: "8px 10px" }}>
              <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Pack replacement</div>
              <div className="mono-num" style={{ fontSize: "15px", fontWeight: 600 }}>
                {formatCurrency(result.replaceCost ?? 0, result.currency)}
              </div>
            </div>
            {result.deferredRepairCost !== null && (
              <div className="panel-card" style={{ padding: "8px 10px" }}>
                <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>If deferred ({roi.deferralYears} yr)</div>
                <div className="mono-num" style={{ fontSize: "14px", fontWeight: 600 }}>
                  {formatCurrency(result.deferredRepairCost, result.currency)}
                </div>
              </div>
            )}
            {result.paybackYears !== null && (
              <div className="panel-card" style={{ padding: "8px 10px" }}>
                <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Simple payback</div>
                <div className="mono-num" style={{ fontSize: "15px", fontWeight: 600 }}>
                  {result.paybackYears.toFixed(1)} yr
                </div>
              </div>
            )}
          </div>

          <InlineBanner tone={result.recommendationCode === "REPLACE_LOWER_RISK" ? "warning" : "info"}>
            <div style={{ fontWeight: 600 }}>{result.recommendationText}</div>
            <div style={{ fontSize: "12px", marginTop: "4px", opacity: 0.9 }}>{result.ruleApplied}</div>
          </InlineBanner>

          <Disclosure summary="Calculation details">
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
              {result.formulas.map((f) => (
                <div key={f.label} style={{ borderBottom: "1px solid var(--color-border-subtle)", paddingBottom: "6px" }}>
                  <div style={{ fontWeight: 600 }}>{f.label}</div>
                  <div className="mono-num" style={{ color: "var(--color-text-muted)" }}>
                    {f.expression}
                  </div>
                  <div className="mono-num">
                    = {f.substituted} = <strong>{f.resultFormatted}</strong>
                  </div>
                </div>
              ))}
            </div>
          </Disclosure>

          <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{result.disclaimer}</div>
        </div>
      )}
    </div>
  );
}