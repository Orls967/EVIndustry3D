import type { CurrencyCode, RoiInputs, RoiResult } from "./contracts";

export function formatCurrency(value: number, currency: CurrencyCode): string {
  const locale = currency === "IDR" ? "id-ID" : currency === "EUR" ? "de-DE" : "en-US";
  const decimals = currency === "IDR" ? 0 : 2;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function createEmptyRoiInputs(horizonYears = 8): RoiInputs {
  return {
    currency: "IDR",
    inspectionCost: null,
    moduleReplacementCost: null,
    modulesToReplaceCount: 1,
    packReplacementCost: null,
    downtimeCostPerDay: null,
    repairDowntimeDays: null,
    replacementDowntimeDays: null,
    analysisHorizonYears: horizonYears,
    deferralAnnualCostIncreasePct: null,
    deferralYears: 1,
    annualBenefitOfActing: null,
    projectedEndSohPercent: null,
    eolThresholdPercent: 80,
    repairAddressesPackWideAgeing: false,
  };
}

/**
 * Deterministic Repair vs Replace & Deferral ROI calculator (05-simulation-and-data-design.md §5.3-5.4).
 * Never invents missing cost defaults.
 */
export function computeRoiEstimate(inputs: RoiInputs): RoiResult {
  const disclaimer = "Decision estimate from your inputs. Not a safety or service instruction.";
  const hasRepairCore = inputs.inspectionCost !== null && inputs.moduleReplacementCost !== null;
  const hasReplaceCore = inputs.packReplacementCost !== null;
  const modules = Math.max(1, Math.floor(inputs.modulesToReplaceCount || 1));

  if (!hasRepairCore || !hasReplaceCore) {
    return {
      readyToCompare: false,
      currency: inputs.currency,
      repairCost: null,
      replaceCost: null,
      deferredRepairCost: null,
      savingRepairVsReplace: null,
      savingActingNowVsDefer: null,
      paybackYears: null,
      recommendationCode: "INSUFFICIENT_INPUTS",
      recommendationText: "Not enough inputs to compare.",
      ruleApplied: "Rule 1: Required repair and pack replacement cost inputs must all be provided.",
      disclaimer,
      formulas: [],
    };
  }

  const inspection = inputs.inspectionCost ?? 0;
  const moduleCost = inputs.moduleReplacementCost ?? 0;
  const packCost = inputs.packReplacementCost ?? 0;
  const downtimeRate = inputs.downtimeCostPerDay ?? 0;
  const repairDays = inputs.repairDowntimeDays ?? 0;
  const replaceDays = inputs.replacementDowntimeDays ?? 0;

  const repairCost = inspection + modules * moduleCost + repairDays * downtimeRate;
  const replaceCost = packCost + replaceDays * downtimeRate;
  const savingRepairVsReplace = replaceCost - repairCost;

  let deferredRepairCost: number | null = null;
  let savingActingNowVsDefer: number | null = null;
  if (inputs.deferralAnnualCostIncreasePct !== null) {
    const rate = inputs.deferralAnnualCostIncreasePct / 100.0;
    const defYears = Math.max(0, inputs.deferralYears);
    deferredRepairCost = repairCost * Math.pow(1.0 + rate, defYears);
    savingActingNowVsDefer = deferredRepairCost - repairCost;
  }

  const paybackYears =
    inputs.annualBenefitOfActing !== null && inputs.annualBenefitOfActing > 0
      ? repairCost / inputs.annualBenefitOfActing
      : null;

  let recommendationCode: RoiResult["recommendationCode"];
  let recommendationText: string;
  let ruleApplied: string;

  if (
    inputs.projectedEndSohPercent !== null &&
    inputs.projectedEndSohPercent < inputs.eolThresholdPercent &&
    !inputs.repairAddressesPackWideAgeing
  ) {
    recommendationCode = "REPLACE_LOWER_RISK";
    recommendationText =
      "Replacement is the lower-risk estimate; a repair may not last the horizon.";
    ruleApplied = `Rule 2: Projected end-of-horizon SoH (${inputs.projectedEndSohPercent.toFixed(1)}%) < threshold (${inputs.eolThresholdPercent.toFixed(1)}%) and partial repair does not reset pack-wide ageing.`;
  } else if (repairCost < replaceCost) {
    recommendationCode = "REPAIR_CHEAPER";
    recommendationText = `Repair is the lower-cost estimate by ${formatCurrency(savingRepairVsReplace, inputs.currency)}.`;
    ruleApplied = "Rule 3: RepairCost < ReplaceCost while projected SoH remains viable (or repair addresses pack-wide ageing).";
  } else {
    recommendationCode = "REPLACE_CHEAPER";
    recommendationText = `Replacement is the lower-cost estimate by ${formatCurrency(-savingRepairVsReplace, inputs.currency)}.`;
    ruleApplied = "Rule 4: ReplaceCost <= RepairCost.";
  }

  const formulas: RoiResult["formulas"] = [
    {
      label: "RepairCost",
      expression: "Inspection + Modules * ModuleCost + RepairDays * DowntimePerDay",
      substituted: `${formatCurrency(inspection, inputs.currency)} + ${modules} * ${formatCurrency(moduleCost, inputs.currency)} + ${repairDays} * ${formatCurrency(downtimeRate, inputs.currency)}`,
      resultFormatted: formatCurrency(repairCost, inputs.currency),
    },
    {
      label: "ReplaceCost",
      expression: "PackCost + ReplaceDays * DowntimePerDay",
      substituted: `${formatCurrency(packCost, inputs.currency)} + ${replaceDays} * ${formatCurrency(downtimeRate, inputs.currency)}`,
      resultFormatted: formatCurrency(replaceCost, inputs.currency),
    },
    {
      label: "Saving (Replace - Repair)",
      expression: "ReplaceCost - RepairCost",
      substituted: `${formatCurrency(replaceCost, inputs.currency)} - ${formatCurrency(repairCost, inputs.currency)}`,
      resultFormatted: formatCurrency(savingRepairVsReplace, inputs.currency),
    },
  ];

  if (deferredRepairCost !== null && savingActingNowVsDefer !== null && inputs.deferralAnnualCostIncreasePct !== null) {
    formulas.push({
      label: "DeferredCost",
      expression: "RepairCost * (1 + DeferralRate)^DeferralYears",
      substituted: `${formatCurrency(repairCost, inputs.currency)} * (1 + ${(inputs.deferralAnnualCostIncreasePct / 100).toFixed(4)})^${inputs.deferralYears}`,
      resultFormatted: formatCurrency(deferredRepairCost, inputs.currency),
    });
    formulas.push({
      label: "SavingActingNow",
      expression: "DeferredCost - RepairCost",
      substituted: `${formatCurrency(deferredRepairCost, inputs.currency)} - ${formatCurrency(repairCost, inputs.currency)}`,
      resultFormatted: formatCurrency(savingActingNowVsDefer, inputs.currency),
    });
  }

  return {
    readyToCompare: true,
    currency: inputs.currency,
    repairCost,
    replaceCost,
    deferredRepairCost,
    savingRepairVsReplace,
    savingActingNowVsDefer,
    paybackYears,
    recommendationCode,
    recommendationText,
    ruleApplied,
    disclaimer,
    formulas,
  };
}

