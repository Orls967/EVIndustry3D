import { describe, expect, it } from "vitest";
import * as THREE from "three";
import type { ThermalResult } from "../domain/contracts";
import { getPackDefinition } from "../domain/dataLoaders";
import { buildLfpSceneLayout, buildNmcSceneLayout } from "./builders/packGeometrySpec";
import { AdaptiveDprController } from "./controllers/adaptiveDpr";
import { computeExplodeOffsets } from "./controllers/explodeController";
import { pickLfpBladeCells, pickNmcCylinderCells } from "./controllers/instancedPicking";
import {
  computeFractionalSampleIndex,
  computeThermalResultRange,
  interpolateZoneTemperatures,
} from "./controllers/playbackController";
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

  it("interpolates zone temperatures smoothly between adjacent playback samples", () => {
    const mockResult: ThermalResult = {
      scenarioId: "test",
      architecture: "LFP_BLADE",
      dataStatus: "MODELLED",
      validationStatus: "NOT_VALIDATED",
      engineVersion: "0.1.0",
      parameterSetVersion: "1.0.0",
      createdAtIso: "2026-11-15T00:00:00Z",
      timeStepSeconds: 1,
      durationSeconds: 120,
      endedBecause: "TARGET_SOC",
      summary: {
        maxTemperatureC: 40,
        averageTemperatureC: 35,
        temperatureSpreadC: 10,
        hottestZoneId: "pack.zone_02",
        peakCRate: 1,
        reynoldsNumber: 200,
        energyChargedKwh: 10,
        heatGeneratedKwh: 0.2,
        heatRemovedByCoolantKwh: 0.1,
        coolingHeatRemovalFraction: 0.5,
        coolantDeltaTC: 2,
        energyBalanceErrorPercent: 0,
      },
      nSamples: 3,
      timeSeconds: new Float32Array([0, 60, 120]),
      // zone_01: 20 -> 30 -> 40 ; zone_02: 24 -> 36 -> 44
      zoneTemperaturesC: new Float32Array([20, 30, 40, 24, 36, 44]),
      coolantTemperaturesC: new Float32Array([20, 22, 24, 21, 23, 25]),
      socPercent: new Float32Array([20, 50, 80]),
      zoneIds: ["pack.zone_01", "pack.zone_02"],
      assumptions: [],
      warnings: [],
    };

    const out = new Float32Array(2);
    const mid = interpolateZoneTemperatures(mockResult, 0.5, out);
    expect(out[0]).toBeCloseTo(25, 4);
    expect(out[1]).toBeCloseTo(30, 4);
    expect(mid.peakTempC).toBeCloseTo(30, 4);
    expect(mid.hotZoneIndex).toBe(1);

    const quarter = interpolateZoneTemperatures(mockResult, 1.25, out);
    expect(out[0]).toBeCloseTo(32.5, 4);
    expect(out[1]).toBeCloseTo(38, 4);
    expect(quarter.peakTempC).toBeCloseTo(38, 4);

    expect(computeThermalResultRange(mockResult)).toEqual([20, 44]);

    expect(computeFractionalSampleIndex(0, 60, 3, 120)).toBeCloseTo(0.5, 5);
    expect(computeFractionalSampleIndex(1.75, 60, 3, 120)).toBeCloseTo(0.25, 5);
    expect(computeFractionalSampleIndex(0, 60, 1, 120)).toBe(0);
  });

  it("picks exact NMC cylinder and LFP blade instances with fast AABB pre-test", () => {
    const nmcPack = getPackDefinition("NMC_4680");
    const nmcLayout = buildNmcSceneLayout(nmcPack);
    const nmcBounds = new THREE.Box3(new THREE.Vector3(-2, -1, -2), new THREE.Vector3(2, 1, 2));
    const targetNmc = nmcLayout.cells[400]!;
    const nmcRay = new THREE.Ray(
      new THREE.Vector3(targetNmc.xM, targetNmc.yBaseM + 0.15 + 1.0, targetNmc.zM),
      new THREE.Vector3(0, -1, 0)
    );
    const nmcHit = pickNmcCylinderCells(
      nmcRay,
      nmcLayout.cells,
      nmcLayout.cellRadiusM,
      nmcLayout.cellHeightY,
      0.15,
      nmcBounds
    );
    expect(nmcHit?.instanceId).toBe(targetNmc.instanceIndex);

    const missRay = new THREE.Ray(new THREE.Vector3(10, 1, 10), new THREE.Vector3(0, -1, 0));
    expect(
      pickNmcCylinderCells(missRay, nmcLayout.cells, nmcLayout.cellRadiusM, nmcLayout.cellHeightY, 0, nmcBounds)
    ).toBeNull();

    const lfpPack = getPackDefinition("LFP_BLADE");
    const lfpLayout = buildLfpSceneLayout(lfpPack);
    const lfpBounds = new THREE.Box3(new THREE.Vector3(-3, -1, -2), new THREE.Vector3(3, 1, 2));
    const targetLfp = lfpLayout.cells[55]!;
    const lfpRay = new THREE.Ray(
      new THREE.Vector3(targetLfp.xM * 1.2, targetLfp.yBaseM + 1.0, targetLfp.zM),
      new THREE.Vector3(0, -1, 0)
    );
    const lfpHit = pickLfpBladeCells(
      lfpRay,
      lfpLayout.cells,
      lfpLayout.cellThicknessX,
      lfpLayout.cellHeightY,
      lfpLayout.cellLengthZ,
      1.2,
      lfpBounds
    );
    expect(lfpHit?.instanceId).toBe(targetLfp.instanceIndex);
  });

  it("adapts DPR on sustained slow frames while ignoring demand-mode idle gaps", () => {
    const ctrl = new AdaptiveDprController(2, { windowFrames: 4 });
    let t = 0;
    // Simulate a 2000ms demand-mode idle gap -> must NOT drop DPR
    ctrl.recordFrame(t);
    t += 2000;
    expect(ctrl.recordFrame(t)).toBeNull();
    expect(ctrl.getDpr()).toBe(2);

    // Simulate slow 30ms frames
    for (let i = 0; i < 4; i++) {
      t += 30;
      ctrl.recordFrame(t);
    }
    expect(ctrl.getDpr()).toBe(1.75);

    // Simulate fast 16ms frames for 2 windows to recover
    let changed: number | null = null;
    for (let i = 0; i < 8; i++) {
      t += 16;
      const res = ctrl.recordFrame(t);
      if (res !== null) changed = res;
    }
    expect(changed).toBe(2);
  });
});

