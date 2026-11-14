import type { PackDefinition } from "../../domain/contracts";

export interface CellInstanceDescriptor {
  instanceIndex: number;
  cellId: string;
  zoneId: string;
  zoneIndex: number;
  xM: number;
  yBaseM: number;
  zM: number;
}

export interface LfpSceneLayout {
  packWidthX: number;
  packHeightY: number;
  packDepthZ: number;
  cellLengthZ: number;
  cellHeightY: number;
  cellThicknessX: number;
  pitchX: number;
  timThicknessM: number;
  coldPlateThicknessM: number;
  cells: CellInstanceDescriptor[];
}

export interface NmcSceneLayout {
  packWidthX: number;
  packHeightY: number;
  packDepthZ: number;
  cellRadiusM: number;
  cellHeightY: number;
  cols: number;
  rows: number;
  pitchXM: number;
  ribbonChannelPositionsZ: number[];
  cells: CellInstanceDescriptor[];
}

export function buildLfpSceneLayout(pack: PackDefinition): LfpSceneLayout {
  // LFP Blade cell dimensionsMm = [965 (Z), 90 (Y), 14 (X)]
  const cellLengthZ = (pack.cell.dimensionsMm[0] ?? 965) / 1000.0;
  const cellHeightY = (pack.cell.dimensionsMm[1] ?? 90) / 1000.0;
  const cellThicknessX = (pack.cell.dimensionsMm[2] ?? 14) / 1000.0;
  const gapX = pack.envelopeMm.interCellGapMm / 1000.0;
  const pitchX = cellThicknessX + gapX;

  const packWidthX = pack.envelopeMm.lengthX / 1000.0;
  const packHeightY = pack.envelopeMm.heightY / 1000.0;
  const packDepthZ = pack.envelopeMm.widthZ / 1000.0;
  const timThicknessM = (pack.envelopeMm.timThicknessMm ?? 1.5) / 1000.0;
  const coldPlateThicknessM = 0.01;

  const totalCells = pack.seriesCount * pack.parallelCount; // 120
  const stackSpanX = (totalCells - 1) * pitchX;
  const startX = -stackSpanX / 2;

  const cells: CellInstanceDescriptor[] = [];
  let instanceIndex = 0;
  for (let zIdx = 0; zIdx < pack.zones.length; zIdx++) {
    const zone = pack.zones[zIdx]!;
    for (let c = 0; c < zone.cellCount; c++) {
      const idxLabel = String(c + 1).padStart(2, "0");
      const zoneNum = String(zIdx + 1).padStart(2, "0");
      cells.push({
        instanceIndex,
        cellId: `cell_${zoneNum}_${idxLabel}`,
        zoneId: zone.id,
        zoneIndex: zIdx,
        xM: startX + instanceIndex * pitchX,
        yBaseM: cellHeightY / 2,
        zM: 0,
      });
      instanceIndex++;
    }
  }

  return {
    packWidthX,
    packHeightY,
    packDepthZ,
    cellLengthZ,
    cellHeightY,
    cellThicknessX,
    pitchX,
    timThicknessM,
    coldPlateThicknessM,
    cells,
  };
}

export function buildNmcSceneLayout(pack: PackDefinition): NmcSceneLayout {
  // NMC 4680 cell dimensionsMm = [46 (dia), 80 (height)]
  const cellDiaM = (pack.cell.dimensionsMm[0] ?? 46) / 1000.0;
  const cellRadiusM = cellDiaM / 2.0;
  const cellHeightY = (pack.cell.dimensionsMm[1] ?? 80) / 1000.0;
  const gapX = pack.envelopeMm.interCellGapMm / 1000.0;
  const pitchXM = cellDiaM + gapX; // 0.0485 m

  const cols = 36;
  const rows = 23;
  const packWidthX = pack.envelopeMm.lengthX / 1000.0;
  const packHeightY = pack.envelopeMm.heightY / 1000.0;
  const packDepthZ = pack.envelopeMm.widthZ / 1000.0;

  // Center rows in Z with side cooling ribbon slots between pairs of rows (12 parallel ribbons across 23 rows)
  // Row spacing is chosen so the whole array fits inside the tray walls:
  // 23 rows x 46 mm + 12 ribbon gaps x 5 mm + 10 plain gaps x 0.5 mm = 1.123 m
  // <= envelope 1.160 m - 2 x 15 mm walls = 1.130 m (visual layout only; no physics input).
  const ribbonGapM = 0.005;
  const plainGapM = 0.0005;
  const rowZPositions: number[] = [];
  const ribbonPositionsZ: number[] = [];
  let cursorZ = 0;
  for (let r = 0; r < rows; r++) {
    rowZPositions.push(cursorZ);
    const hasRibbonAfter = r % 2 === 0 && ribbonPositionsZ.length < pack.cooling.parallelChannels;
    if (hasRibbonAfter) {
      ribbonPositionsZ.push(cursorZ + cellRadiusM + ribbonGapM / 2);
      cursorZ += cellDiaM + ribbonGapM;
    } else {
      cursorZ += cellDiaM + plainGapM;
    }
  }
  const midZ = rowZPositions[rows - 1]! / 2;
  for (let r = 0; r < rows; r++) {
    rowZPositions[r] = rowZPositions[r]! - midZ;
  }
  for (let k = 0; k < ribbonPositionsZ.length; k++) {
    ribbonPositionsZ[k] = ribbonPositionsZ[k]! - midZ;
  }

  const startX = -((cols - 1) * pitchXM) / 2;
  const cells: CellInstanceDescriptor[] = [];
  let instanceIndex = 0;
  for (let col = 0; col < cols; col++) {
    const zoneIndex = Math.min(pack.zones.length - 1, Math.floor(col / 3));
    const zone = pack.zones[zoneIndex]!;
    const zoneNum = String(zoneIndex + 1).padStart(2, "0");
    for (let row = 0; row < rows; row++) {
      const localIdx = (col % 3) * rows + row + 1;
      cells.push({
        instanceIndex,
        cellId: `cell_${zoneNum}_${String(localIdx).padStart(2, "0")}`,
        zoneId: zone.id,
        zoneIndex,
        xM: startX + col * pitchXM,
        yBaseM: cellHeightY / 2,
        zM: rowZPositions[row]!,
      });
      instanceIndex++;
    }
  }

  return {
    packWidthX,
    packHeightY,
    packDepthZ,
    cellRadiusM,
    cellHeightY,
    cols,
    rows,
    pitchXM,
    ribbonChannelPositionsZ: ribbonPositionsZ,
    cells,
  };
}

