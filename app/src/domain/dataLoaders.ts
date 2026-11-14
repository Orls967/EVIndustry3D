import lfpPackJson from "../../../data/packs/lfp-blade.json";
import nmcPackJson from "../../../data/packs/nmc-4680.json";
import registerJson from "../../../data/parameters/register.json";
import type { ArchitectureId, PackDefinition, ParameterRegister, ScenarioPreset } from "./contracts";

const LFP_PACK = lfpPackJson as PackDefinition;
const NMC_PACK = nmcPackJson as PackDefinition;
const REGISTER = registerJson as ParameterRegister;

export function getPackDefinition(arch: ArchitectureId): PackDefinition {
  return arch === "LFP_BLADE" ? LFP_PACK : NMC_PACK;
}

export function getAllPackDefinitions(): PackDefinition[] {
  return [LFP_PACK, NMC_PACK];
}

export function getParameterRegister(): ParameterRegister {
  return REGISTER;
}

export function getPresets(): ScenarioPreset[] {
  return REGISTER.presets;
}

export function getPresetById(id: ScenarioPreset["id"]): ScenarioPreset {
  const found = REGISTER.presets.find((p) => p.id === id);
  if (!found) {
    throw new Error(`Missing preset: ${id}`);
  }
  return found;
}

export function computePackNominalVoltageV(pack: PackDefinition): number {
  return pack.seriesCount * pack.cell.nominalVoltageV;
}

export function computePackNominalCapacityAh(pack: PackDefinition): number {
  return pack.parallelCount * pack.cell.nominalCapacityAh;
}

export function computePackNominalEnergyKwh(pack: PackDefinition): number {
  return (computePackNominalVoltageV(pack) * computePackNominalCapacityAh(pack)) / 1000.0;
}

export function computeApproxCRate(pack: PackDefinition, chargingPowerKw: number): number {
  const energyKwh = computePackNominalEnergyKwh(pack);
  return energyKwh > 0 ? chargingPowerKw / energyKwh : 0;
}

export interface CoolingPreview {
  hydraulicDiameterMm: number;
  velocityMs: number;
  reynoldsNumber: number;
  hCcWPerM2K: number;
  rCcKW: number;
  flowWarning: "NONE" | "NON_LAMINAR_COOLANT_F3" | "TRANSITIONAL_OR_TURBULENT_RE";
}

export function computeCoolingPreview(pack: PackDefinition, flowLpm: number): CoolingPreview {
  const c = REGISTER.coolant;
  const a = pack.cooling.channelWidthMm / 1000.0;
  const b = pack.cooling.channelHeightMm / 1000.0;
  const dh = (2.0 * a * b) / (a + b);
  const vDot = Math.max(flowLpm, 0) / 60000.0;
  const vel = vDot / (pack.cooling.parallelChannels * a * b);
  const re = (c.densityKgPerM3 * vel * dh) / c.viscosityPaS;
  const hCc = (pack.cooling.nusseltNumber * c.conductivityWPerMK) / dh;
  const rCc = 1.0 / (hCc * pack.cooling.contactAreaPerZoneM2) + pack.cooling.rZoneToCoolantBaseKW;

  let flowWarning: CoolingPreview["flowWarning"] = "NONE";
  if (re >= 2300) {
    flowWarning = "TRANSITIONAL_OR_TURBULENT_RE";
  } else if (re >= 950) {
    flowWarning = "NON_LAMINAR_COOLANT_F3";
  }

  return {
    hydraulicDiameterMm: dh * 1000.0,
    velocityMs: vel,
    reynoldsNumber: re,
    hCcWPerM2K: hCc,
    rCcKW: rCc,
    flowWarning,
  };
}

