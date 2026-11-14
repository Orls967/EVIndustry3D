import type { ThermalResult } from "../../domain/contracts";

export const PLAYBACK_SAMPLE_INTERVAL_MS = 120;

/**
 * Advances a continuous sample cursor along [0, nSamples - 1] based on elapsed ms,
 * wrapping cleanly back to 0 when reaching the end of the simulation series.
 */
export function computeFractionalSampleIndex(
  currentSample: number,
  deltaMs: number,
  nSamples: number,
  sampleIntervalMs: number = PLAYBACK_SAMPLE_INTERVAL_MS
): number {
  if (nSamples <= 1 || sampleIntervalMs <= 0) return 0;
  const maxIdx = nSamples - 1;
  const step = Math.max(0, deltaMs) / sampleIntervalMs;
  const next = Math.max(0, currentSample) + step;
  if (next >= maxIdx) {
    return next % maxIdx;
  }
  return next;
}

/**
 * Computes the global [min, max] temperature scale bounds across all zones and samples.
 */
export function computeThermalResultRange(result: ThermalResult): [number, number] {
  let globalMin = Infinity;
  let globalMax = -Infinity;
  const temps = result.zoneTemperaturesC;
  for (let i = 0; i < temps.length; i++) {
    const val = temps[i] ?? 25;
    if (val < globalMin) globalMin = val;
    if (val > globalMax) globalMax = val;
  }
  if (!Number.isFinite(globalMin) || !Number.isFinite(globalMax)) {
    return [25, 55];
  }
  const minBound = Math.floor(Math.min(globalMin, 25));
  const maxBound = Math.ceil(Math.max(globalMax, minBound + 5));
  return [minBound, maxBound];
}

/**
 * Linearly interpolates each zone's temperature between neighbouring sample indices
 * into a pre-allocated output buffer, returning the instantaneous peak temperature and zone index.
 */
export function interpolateZoneTemperatures(
  result: ThermalResult,
  fractionalSample: number,
  outTemps: Float32Array | number[]
): { peakTempC: number; hotZoneIndex: number } {
  const nZ = result.zoneIds.length;
  const nS = result.nSamples;
  if (nZ === 0 || nS === 0) {
    return { peakTempC: 25, hotZoneIndex: 0 };
  }

  const maxIdx = Math.max(0, nS - 1);
  const clamped = Math.min(Math.max(fractionalSample, 0), maxIdx);
  const i0 = Math.floor(clamped);
  const i1 = Math.min(i0 + 1, maxIdx);
  const alpha = clamped - i0;
  const data = result.zoneTemperaturesC;

  let peakTempC = -Infinity;
  let hotZoneIndex = 0;

  for (let z = 0; z < nZ; z++) {
    const base = z * nS;
    const t0 = data[base + i0] ?? 25;
    const t1 = data[base + i1] ?? t0;
    const t = t0 + (t1 - t0) * alpha;
    outTemps[z] = t;
    if (t > peakTempC) {
      peakTempC = t;
      hotZoneIndex = z;
    }
  }

  return {
    peakTempC: Number.isFinite(peakTempC) ? peakTempC : 25,
    hotZoneIndex,
  };
}
