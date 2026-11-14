import type { ArchitectureId } from "../../domain/contracts";

function easeOutCubic(t: number): number {
  const c = Math.min(Math.max(t, 0), 1);
  return 1 - Math.pow(1 - c, 3);
}

function windowProgress(pct: number, startPct: number, endPct: number): number {
  if (endPct <= startPct) return pct >= endPct ? 1 : 0;
  return easeOutCubic((pct - startPct) / (endPct - startPct));
}

export interface ExplodeOffsets {
  upperEnclosureY: number;
  bmsBusbarsY: number;
  lfpColdPlateY: number;
  lfpTimY: number;
  lfpCellSpreadFactor: number; // 1.0 assembled -> 1.28 spread
  nmcCellsY: number;
  nmcSideChannelsY: number;
  cameraDistanceFactor: number;
}

/**
 * Deterministic C1 exploded view stage mapping (03-interaction-motion-specification.md §3.3-3.4).
 * Offsets are authored so vertical separation strictly avoids intersections at every explode percentage.
 */
export function computeExplodeOffsets(arch: ArchitectureId, explodePercent: number): ExplodeOffsets {
  const pct = Math.min(Math.max(explodePercent, 0), 100);
  const camPull = 1 + 0.38 * easeOutCubic(pct / 100);

  if (arch === "LFP_BLADE") {
    const s1 = windowProgress(pct, 0, 25);
    const s2 = windowProgress(pct, 25, 45);
    const s3 = windowProgress(pct, 45, 65);
    const s4 = windowProgress(pct, 65, 80);
    const s5 = windowProgress(pct, 80, 100);

    // Cumulative upward separation ensures upper layers move further and never cross lower layers
    const timY = 0.08 * s4;
    const plateY = 0.14 * s3 + timY;
    const bmsY = 0.16 * s2 + plateY;
    const lidY = 0.20 * s1 + bmsY;

    return {
      upperEnclosureY: lidY,
      bmsBusbarsY: bmsY,
      lfpColdPlateY: plateY,
      lfpTimY: timY,
      lfpCellSpreadFactor: 1.0 + 0.28 * s5,
      nmcCellsY: 0,
      nmcSideChannelsY: 0,
      cameraDistanceFactor: camPull,
    };
  }

  // NMC 4680 stages (03 §3.4):
  // S1 (0-25): Lid | S2 (25-45): BMS & busbars | S3 (45-75): Cells up | S4 (75-100): Side channels mid height while cells lift clear above
  const s1 = windowProgress(pct, 0, 25);
  const s2 = windowProgress(pct, 25, 45);
  const s3 = windowProgress(pct, 45, 75);
  const s4 = windowProgress(pct, 75, 100);

  const channelsY = 0.05 * s4;
  const cellsY = 0.15 * s3 + 0.08 * s4;
  const bmsY = 0.16 * s2 + cellsY;
  const lidY = 0.20 * s1 + bmsY;

  return {
    upperEnclosureY: lidY,
    bmsBusbarsY: bmsY,
    lfpColdPlateY: 0,
    lfpTimY: 0,
    lfpCellSpreadFactor: 1.0,
    nmcCellsY: cellsY,
    nmcSideChannelsY: channelsY,
    cameraDistanceFactor: camPull,
  };
}

