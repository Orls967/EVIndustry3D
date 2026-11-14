export type ArchitectureId = "LFP_BLADE" | "NMC_4680";
export type DataStatus = "ILLUSTRATIVE" | "MODELLED" | "MEASURED";
export type ValidationStatus =
  | "NOT_VALIDATED"
  | "VERIFIED_NUMERICALLY"
  | "COMPARED_WITH_PUBLISHED";

export type ParameterStatus = "SOURCED" | "DIGITIZED" | "DERIVED" | "ASSUMED";
export type ComponentProvenance = "GENERIC_EDUCATIONAL" | "SOURCED";

export interface PackComponentParam {
  label: string;
  value: string;
  unit?: string;
  sourceRef?: string;
}

export interface PackComponentFailureMode {
  mode: string;
  effect: string;
}

export interface PackComponentSpec {
  id: string;
  name: string;
  category: string;
  func: string;
  material?: string;
  location: string;
  parameters: PackComponentParam[];
  failureModes: PackComponentFailureMode[];
  provenance: ComponentProvenance;
  explode: {
    stage: number;
    offsetM: [number, number, number];
  };
  zoneId?: string;
}

export interface PackZoneSpec {
  id: string;
  cellCount: number;
  order: number;
  thermalMassJPerK: number;
}

export interface PackDefinition {
  id: ArchitectureId;
  displayName: string;
  description: string;
  provenanceNote: string;
  cell: {
    formFactor: "PRISMATIC_BLADE" | "CYLINDRICAL";
    dimensionsMm: number[];
    massKg: number;
    nominalCapacityAh: number;
    nominalVoltageV: number;
    specificHeatJPerKgK: number;
    specificHeatTempCoeffPctPerK?: number;
    kThroughPlaneWPerMK: number;
    kInPlaneWPerMK: number;
    sourceRefs: string[];
  };
  seriesCount: number;
  parallelCount: number;
  envelopeMm: {
    lengthX: number;
    heightY: number;
    widthZ: number;
    interCellGapMm: number;
    enclosureWallMm?: number;
    timThicknessMm?: number;
    timConductivityWPerMK?: number;
    provenance: "SOURCED" | "DERIVED" | "ASSUMED";
  };
  cooling: {
    topology: "TOP_COLD_PLATE" | "SIDE_CHANNELS";
    channelWidthMm: number;
    channelHeightMm: number;
    parallelChannels: number;
    nusseltNumber: number;
    nusseltBoundaryCondition: "UNIFORM_WALL_TEMP" | "UNIFORM_WALL_FLUX";
    contactAreaPerZoneM2: number;
    rZoneToCoolantBaseKW: number;
    rZoneToZoneKW: number;
    rZoneToAmbientKW: number;
    provenance: "SOURCED" | "DERIVED" | "ASSUMED";
  };
  zones: PackZoneSpec[];
  coolantPath: string[];
  components: PackComponentSpec[];
}

export interface ScenarioPreset {
  id: "normal" | "hot_ambient" | "fast_charging" | "reduced_cooling";
  label: string;
  chargingPowerKw: number;
  ambientTemperatureC: number;
  coolantFlowLpm: number;
  coolantInletTemperatureC: number;
  initialSocPercent: number;
  targetSocPercent: number;
  maxDurationMinutes: number;
}

export interface RegisterParameterEntry {
  id: string;
  name: string;
  symbol: string;
  value: unknown;
  unit: string;
  status: ParameterStatus;
  sourceRef: string;
  conditionOrAssumption: string;
  applicability: string;
  confidenceNote: string;
  lastReviewedDate: string;
}

export interface ParameterRegister {
  parameterSetVersion: string;
  lastReviewedDate: string;
  coolant: {
    name: string;
    specificHeatJPerKgK: number;
    conductivityWPerMK: number;
    densityKgPerM3: number;
    viscosityPaS: number;
    inletTempDefaultC: number;
    flowRangeLpm: [number, number];
    sourceRef: string;
  };
  presets: ScenarioPreset[];
  parameters: RegisterParameterEntry[];
}

export interface SimulationConfig {
  scenarioId: string;
  architecture: ArchitectureId;
  chargingPowerKw: number;
  ambientTemperatureC: number;
  coolantFlowLpm: number;
  coolantInletTemperatureC: number;
  initialSocPercent: number;
  targetSocPercent: number;
  maxDurationMinutes: number;
  initialPackTemperatureC: number;
}

export type ThermalWarningCode =
  | "C_RATE_ABOVE_2C"
  | "NON_LAMINAR_COOLANT_F3"
  | "TRANSITIONAL_OR_TURBULENT_RE"
  | "RESISTANCE_TABLE_OUT_OF_RANGE"
  | "HIGH_TEMP_ABOVE_45C"
  | "CELL_SURFACE_HOT_ABOVE_60C";

export interface ThermalResult {
  scenarioId: string;
  architecture: ArchitectureId;
  dataStatus: "MODELLED";
  validationStatus: ValidationStatus;
  engineVersion: string;
  parameterSetVersion: string;
  createdAtIso: string;
  timeStepSeconds: number;
  durationSeconds: number;
  endedBecause: "TARGET_SOC" | "MAX_DURATION" | "CANCELLED";
  summary: {
    maxTemperatureC: number;
    averageTemperatureC: number;
    temperatureSpreadC: number;
    hottestZoneId: string;
    peakCRate: number;
    reynoldsNumber: number;
    energyChargedKwh: number;
    heatGeneratedKwh: number;
    heatRemovedByCoolantKwh: number;
    coolingHeatRemovalFraction: number;
    coolantDeltaTC: number;
    energyBalanceErrorPercent: number;
  };
  nSamples: number;
  timeSeconds: Float32Array;
  zoneTemperaturesC: Float32Array;
  coolantTemperaturesC: Float32Array;
  socPercent: Float32Array;
  cRateSeries?: Float32Array;
  heatGenWatts?: Float32Array;
  zoneIds: string[];
  assumptions: string[];
  warnings: Array<{ code: ThermalWarningCode; message: string }>;
}

export interface SohConfig {
  architecture: ArchitectureId;
  baselineSohPercent: number;
  horizonYears: number;
  thresholdPercent: number;
  equivalentFullCyclesPerYear: number;
  averageCRate: number;
  depthOfDischargePercent: number;
  representativeTemperatureC: number;
  averageRestingSocPercent: number;
  maxChargeSocPercent: number;
  // Option B user-editable inputs for NMC (no defaults)
  nmcCalendarLossPctPerSqrtYear?: number | null;
  nmcCycleLossPctPerFec?: number | null;
  nmcCycleExponent?: number | null;
  nmcActivationEnergyJPerMol?: number | null;
  nmcReferenceTempC?: number | null;
}

export interface SohForecast {
  dataStatus: "ILLUSTRATIVE";
  modelName: string;
  engineVersion: string;
  parameterSetVersion: string;
  points: Array<{
    year: number;
    sohPercent: number;
    lowerSensitivityCMinus5Percent?: number;
    upperSensitivityCPlus5Percent?: number;
  }>;
  thresholdCrossingYear: number | null;
  assumptions: string[];
}

export type CurrencyCode = "IDR" | "USD" | "EUR";

export interface RoiInputs {
  currency: CurrencyCode;
  inspectionCost: number | null;
  moduleReplacementCost: number | null;
  modulesToReplaceCount: number;
  packReplacementCost: number | null;
  downtimeCostPerDay: number | null;
  repairDowntimeDays: number | null;
  replacementDowntimeDays: number | null;
  analysisHorizonYears: number;
  deferralAnnualCostIncreasePct: number | null;
  deferralYears: number;
  annualBenefitOfActing: number | null;
  projectedEndSohPercent: number | null;
  eolThresholdPercent: number;
  repairAddressesPackWideAgeing: boolean;
}

export interface RoiResult {
  readyToCompare: boolean;
  currency: CurrencyCode;
  repairCost: number | null;
  replaceCost: number | null;
  deferredRepairCost: number | null;
  savingRepairVsReplace: number | null;
  savingActingNowVsDefer: number | null;
  paybackYears: number | null;
  recommendationCode: "INSUFFICIENT_INPUTS" | "REPLACE_LOWER_RISK" | "REPAIR_CHEAPER" | "REPLACE_CHEAPER";
  recommendationText: string;
  ruleApplied: string;
  disclaimer: string;
  formulas: Array<{
    label: string;
    expression: string;
    substituted: string;
    resultFormatted: string;
  }>;
}

