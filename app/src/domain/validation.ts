import type { SimulationConfig, ThermalWarningCode } from "./contracts";
import { computeApproxCRate, computeCoolingPreview, getPackDefinition, getParameterRegister } from "./dataLoaders";

export interface ValidationIssue {
  field: keyof SimulationConfig | "general";
  severity: "error" | "warning";
  code?: ThermalWarningCode;
  message: string;
}

export const THERMAL_INPUT_BOUNDS = {
  chargingPowerKw: { min: 10, max: 150, unit: "kW" },
  ambientTemperatureC: { min: -10, max: 45, unit: "°C" },
  coolantFlowLpm: { min: 1.0, max: 20.0, unit: "L/min" },
  coolantInletTemperatureC: { min: -10, max: 45, unit: "°C" },
  initialSocPercent: { min: 0, max: 95, unit: "%" },
  targetSocPercent: { min: 5, max: 100, unit: "%" },
  maxDurationMinutes: { min: 1, max: 180, unit: "min" },
} as const;

export function validateSimulationConfig(config: SimulationConfig): {
  valid: boolean;
  issues: ValidationIssue[];
  approxCRate: number;
  reynoldsNumber: number;
} {
  const issues: ValidationIssue[] = [];
  const pack = getPackDefinition(config.architecture);
  const flowRange = getParameterRegister().coolant.flowRangeLpm;

  const checkRange = (
    field: keyof typeof THERMAL_INPUT_BOUNDS,
    value: number,
    min: number,
    max: number,
    unit: string
  ) => {
    if (!Number.isFinite(value) || value < min || value > max) {
      issues.push({
        field,
        severity: "error",
        message: `Must be between ${min} and ${max} ${unit}.`,
      });
    }
  };

  checkRange(
    "chargingPowerKw",
    config.chargingPowerKw,
    THERMAL_INPUT_BOUNDS.chargingPowerKw.min,
    THERMAL_INPUT_BOUNDS.chargingPowerKw.max,
    "kW"
  );
  checkRange(
    "ambientTemperatureC",
    config.ambientTemperatureC,
    THERMAL_INPUT_BOUNDS.ambientTemperatureC.min,
    THERMAL_INPUT_BOUNDS.ambientTemperatureC.max,
    "°C"
  );
  checkRange("coolantFlowLpm", config.coolantFlowLpm, flowRange[0], flowRange[1], "L/min");
  checkRange(
    "coolantInletTemperatureC",
    config.coolantInletTemperatureC,
    THERMAL_INPUT_BOUNDS.coolantInletTemperatureC.min,
    THERMAL_INPUT_BOUNDS.coolantInletTemperatureC.max,
    "°C"
  );
  checkRange(
    "initialSocPercent",
    config.initialSocPercent,
    THERMAL_INPUT_BOUNDS.initialSocPercent.min,
    THERMAL_INPUT_BOUNDS.initialSocPercent.max,
    "%"
  );
  checkRange(
    "targetSocPercent",
    config.targetSocPercent,
    THERMAL_INPUT_BOUNDS.targetSocPercent.min,
    THERMAL_INPUT_BOUNDS.targetSocPercent.max,
    "%"
  );
  checkRange(
    "maxDurationMinutes",
    config.maxDurationMinutes,
    THERMAL_INPUT_BOUNDS.maxDurationMinutes.min,
    THERMAL_INPUT_BOUNDS.maxDurationMinutes.max,
    "min"
  );

  if (config.targetSocPercent <= config.initialSocPercent) {
    issues.push({
      field: "targetSocPercent",
      severity: "error",
      message: "Target SOC must be greater than initial SOC.",
    });
  }

  const approxCRate = computeApproxCRate(pack, config.chargingPowerKw);
  if (approxCRate > 2.0) {
    issues.push({
      field: "chargingPowerKw",
      severity: "warning",
      code: "C_RATE_ABOVE_2C",
      message: `Exceeds 2C (${approxCRate.toFixed(2)}C) — beyond S15 experimental resistance test range.`,
    });
  }

  const cooling = computeCoolingPreview(pack, config.coolantFlowLpm);
  if (cooling.flowWarning === "TRANSITIONAL_OR_TURBULENT_RE") {
    issues.push({
      field: "coolantFlowLpm",
      severity: "warning",
      code: "TRANSITIONAL_OR_TURBULENT_RE",
      message: `Re = ${cooling.reynoldsNumber.toFixed(0)} >= 2300: enters transitional/turbulent regime; laminar Nu_Dh correlation underpredicts heat transfer.`,
    });
  } else if (cooling.flowWarning === "NON_LAMINAR_COOLANT_F3") {
    issues.push({
      field: "coolantFlowLpm",
      severity: "warning",
      code: "NON_LAMINAR_COOLANT_F3",
      message: `Re = ${cooling.reynoldsNumber.toFixed(0)} >= 950: exceeds the F3 study's Re < 950 range; laminar Nusselt correlation still used.`,
    });
  }

  if (config.initialSocPercent < 20 || config.targetSocPercent > 90) {
    issues.push({
      field: "initialSocPercent",
      severity: "warning",
      code: "RESISTANCE_TABLE_OUT_OF_RANGE",
      message: "S15 R_dc table spans 20–90 % SOC and 10–40 °C; values outside this box are clamped.",
    });
  }

  return {
    valid: issues.every((i) => i.severity !== "error"),
    issues,
    approxCRate,
    reynoldsNumber: cooling.reynoldsNumber,
  };
}

