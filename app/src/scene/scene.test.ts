import { describe, expect, it } from "vitest";
import { getPackDefinition } from "../domain/dataLoaders";
import { buildLfpSceneLayout, buildNmcSceneLayout } from "./builders/packGeometrySpec";
import { computeExplodeOffsets } from "./controllers/explodeController";
import { mapTemperatureToThermalColor } from "./materials/cadMaterials";

describe("3D procedural pack layouts & C1 explode", () => {
  it("builds 120 LFP blade cell instances mapped across 10 zones", () => {
    const pack = getPackDefinition("LFP_BLADE");
    const layout = buildLfpSceneLayout(pack);
    expect(layout.cells).toHaveLength(120);
    expect(layout.cells[0]?.cellId).toBe("cell_01_01");
    expect(layout.cells[0]?.zoneId).toBe("pack.zone_01");
    expect(layout.cells[119]?.cellId).toBe("cell_10_12");
    expect(layout.cells[119]?.zoneId).toBe("pack.zone_10");
  });

  it("builds 828 NMC 4680 cell instances across 12 zones and 12 side channels", () => {
    const pack = getPackDefinition("NMC_4680");
    const layout = buildNmcSceneLayout(pack);
    expect(layout.cells).toHaveLength(828);
    expect(layout.ribbonChannelPositionsZ).toHaveLength(12);
    expect(layout.cells[0]?.zoneId).toBe("pack.zone_01");
    expect(layout.cells[827]?.zoneId).toBe("pack.zone_12");
  });

  it("separates LFP and NMC explode stages strictly monotonically without layer crossing", () => {
    for (const pct of [0, 25, 50, 75, 100]) {
      const lfp = computeExplodeOffsets("LFP_BLADE", pct);
      expect(lfp.upperEnclosureY).toBeGreaterThanOrEqual(lfp.bmsBusbarsY);
      expect(lfp.bmsBusbarsY).toBeGreaterThanOrEqual(lfp.lfpColdPlateY);
      expect(lfp.lfpColdPlateY).toBeGreaterThanOrEqual(lfp.lfpTimY);
      expect(lfp.lfpTimY).toBeGreaterThanOrEqual(0);

      const nmc = computeExplodeOffsets("NMC_4680", pct);
      expect(nmc.upperEnclosureY).toBeGreaterThanOrEqual(nmc.bmsBusbarsY);
      expect(nmc.bmsBusbarsY).toBeGreaterThanOrEqual(nmc.nmcCellsY);
      expect(nmc.nmcCellsY).toBeGreaterThanOrEqual(nmc.nmcSideChannelsY);
    }
  });

  it("maps 5-stop thermal scale from cold blue to critical red", () => {
    const cold = mapTemperatureToThermalColor(25, 25, 55);
    const hot = mapTemperatureToThermalColor(55, 25, 55);
    expect(cold.getHexString()).toBe("3b6fe0");
    expect(hot.getHexString()).toBe("e5484d");
  });
});

