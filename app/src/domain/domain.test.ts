import { describe, expect, it } from "vitest";
import {
  computeApproxCRate,
  computeCoolingPreview,
  computePackNominalEnergyKwh,
  getAllPackDefinitions,
  getPackDefinition,
  getPresets,
} from "./dataLoaders";
import { computeRoiEstimate, createEmptyRoiInputs } from "./roi";
import { validateSimulationConfig } from "./validation";

describe("dataLoaders", () => {
  it("loads both reference packs and verified arithmetic energies", () => {
    const packs = getAllPackDefinitions();
    expect(packs).toHaveLength(2);
    const lfp = getPackDefinition("LFP_BLADE");
    const nmc = getPackDefinition("NMC_4680");
    expect(computePackNominalEnergyKwh(lfp)).toBeCloseTo(51.84, 2);
    expect(computePackNominalEnergyKwh(nmc)).toBeCloseTo(70.85, 2);
    expect(computeApproxCRate(lfp, 100)).toBeCloseTo(1.929, 2);
    expect(getPresets()).toHaveLength(4);
  });

  it("keeps all 4 scenarios inside laminar F3 Re < 950", () => {
    for (const arch of ["LFP_BLADE", "NMC_4680"] as const) {
      const pack = getPackDefinition(arch);
      for (const preset of getPresets()) {
        const preview = computeCoolingPreview(pack, preset.coolantFlowLpm);
        expect(preview.reynoldsNumber).toBeLessThan(950);
        expect(preview.flowWarning).toBe("NONE");
      }
    }
  });
});

describe("validation", () => {
  it("blocks out-of-range inputs and emits >2C & Re warnings", () => {
    const invalid = validateSimulationConfig({
      scenarioId: "bad",
      architecture: "LFP_BLADE",
      chargingPowerKw: 200,
      ambientTemperatureC: 25,
      coolantFlowLpm: 8,
      coolantInletTemperatureC: 25,
      initialSocPercent: 80,
      targetSocPercent: 50,
      maxDurationMinutes: 60,
      initialPackTemperatureC: 25,
    });
    expect(invalid.valid).toBe(false);
    expect(invalid.issues.some((i) => i.severity === "error" && i.field === "chargingPowerKw")).toBe(true);
    expect(invalid.issues.some((i) => i.severity === "error" && i.field === "targetSocPercent")).toBe(true);

    const warn = validateSimulationConfig({
      scenarioId: "warn",
      architecture: "LFP_BLADE",
      chargingPowerKw: 130, // > 2C on 51.84 kWh LFP
      ambientTemperatureC: 25,
      coolantFlowLpm: 19,
      coolantInletTemperatureC: 25,
      initialSocPercent: 10,
      targetSocPercent: 80,
      maxDurationMinutes: 45,
      initialPackTemperatureC: 25,
    });
    expect(warn.valid).toBe(true);
    expect(warn.issues.some((i) => i.code === "C_RATE_ABOVE_2C")).toBe(true);
  });
});

describe("roi calculator", () => {
  it("returns INSUFFICIENT_INPUTS when required costs are empty (never invents defaults)", () => {
    const res = computeRoiEstimate(createEmptyRoiInputs(8));
    expect(res.readyToCompare).toBe(false);
    expect(res.recommendationCode).toBe("INSUFFICIENT_INPUTS");
    expect(res.repairCost).toBeNull();
  });

  it("evaluates Repair vs Replace & Deferral formulas identically to 05 §5.3", () => {
    const res = computeRoiEstimate({
      ...createEmptyRoiInputs(8),
      currency: "IDR",
      inspectionCost: 5_000_000,
      moduleReplacementCost: 25_000_000,
      modulesToReplaceCount: 2,
      packReplacementCost: 140_000_000,
      downtimeCostPerDay: 2_000_000,
      repairDowntimeDays: 3,
      replacementDowntimeDays: 10,
      deferralAnnualCostIncreasePct: 10,
      deferralYears: 2,
      annualBenefitOfActing: 30_500_000,
      projectedEndSohPercent: 83.5,
      eolThresholdPercent: 80,
    });

    expect(res.readyToCompare).toBe(true);
    expect(res.repairCost).toBe(61_000_000);
    expect(res.replaceCost).toBe(160_000_000);
    expect(res.savingRepairVsReplace).toBe(99_000_000);
    expect(res.deferredRepairCost).toBeCloseTo(61_000_000 * 1.21, 1);
    expect(res.paybackYears).toBeCloseTo(2.0, 4);
    expect(res.recommendationCode).toBe("REPAIR_CHEAPER");
  });

  it("recommends replacement when projected SoH falls below threshold (Rule 2)", () => {
    const res = computeRoiEstimate({
      ...createEmptyRoiInputs(8),
      inspectionCost: 100,
      moduleReplacementCost: 500,
      packReplacementCost: 5000,
      projectedEndSohPercent: 74,
      eolThresholdPercent: 80,
      repairAddressesPackWideAgeing: false,
    });
    expect(res.recommendationCode).toBe("REPLACE_LOWER_RISK");
  });
});

