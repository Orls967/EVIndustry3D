import { beforeEach, describe, expect, it } from "vitest";
import type { ThermalResult } from "../domain/contracts";
import { useWorkspaceStore } from "./workspaceStore";

function mockThermalResult(scenarioId: string, arch: "LFP_BLADE" | "NMC_4680"): ThermalResult {
  return {
    scenarioId,
    architecture: arch,
    dataStatus: "MODELLED",
    validationStatus: "NOT_VALIDATED",
    engineVersion: "0.1.0",
    parameterSetVersion: "1.0.0",
    createdAtIso: "2026-11-14T00:00:00Z",
    timeStepSeconds: 1,
    durationSeconds: 600,
    endedBecause: "TARGET_SOC",
    summary: {
      maxTemperatureC: 35,
      averageTemperatureC: 32,
      temperatureSpreadC: 3,
      hottestZoneId: "pack.zone_10",
      peakCRate: 1.0,
      reynoldsNumber: 229,
      energyChargedKwh: 30,
      heatGeneratedKwh: 0.4,
      heatRemovedByCoolantKwh: 0.3,
      coolingHeatRemovalFraction: 0.75,
      coolantDeltaTC: 3.5,
      energyBalanceErrorPercent: 0.01,
    },
    nSamples: 2,
    timeSeconds: new Float32Array([0, 600]),
    zoneTemperaturesC: new Float32Array([25, 35]),
    coolantTemperaturesC: new Float32Array([25, 28]),
    socPercent: new Float32Array([10, 80]),
    zoneIds: ["pack.zone_01"],
    assumptions: [],
    warnings: [],
  };
}

describe("workspaceStore", () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      architecture: "LFP_BLADE",
      thermalResult: null,
      thermalResultStale: false,
      activeThermalRequestId: null,
      pendingSwitchArch: null,
      simStatus: "idle",
    });
  });

  it("discards stale worker responses whose scenarioId does not match activeThermalRequestId", () => {
    const store = useWorkspaceStore.getState();
    store.startSimulationRequest("req-2");
    store.markSimulationCompleted(mockThermalResult("req-1", "LFP_BLADE"));
    expect(useWorkspaceStore.getState().thermalResult).toBeNull();
    expect(useWorkspaceStore.getState().simStatus).toBe("running");

    store.markSimulationCompleted(mockThermalResult("req-2", "LFP_BLADE"));
    expect(useWorkspaceStore.getState().thermalResult?.scenarioId).toBe("req-2");
    expect(useWorkspaceStore.getState().simStatus).toBe("completed");
  });

  it("requires confirmation before switching architecture when results exist (PRD FR-02)", () => {
    const store = useWorkspaceStore.getState();
    store.startSimulationRequest("req-1");
    store.markSimulationCompleted(mockThermalResult("req-1", "LFP_BLADE"));

    const immediate = useWorkspaceStore.getState().requestArchitectureSwitch("NMC_4680");
    expect(immediate).toBe(false);
    expect(useWorkspaceStore.getState().pendingSwitchArch).toBe("NMC_4680");
    expect(useWorkspaceStore.getState().architecture).toBe("LFP_BLADE");

    useWorkspaceStore.getState().confirmArchitectureSwitch();
    expect(useWorkspaceStore.getState().architecture).toBe("NMC_4680");
    expect(useWorkspaceStore.getState().thermalResult).toBeNull();
    expect(useWorkspaceStore.getState().pendingSwitchArch).toBeNull();
  });

  it("marks existing thermal result stale when parameters are edited", () => {
    const store = useWorkspaceStore.getState();
    store.startSimulationRequest("req-1");
    store.markSimulationCompleted(mockThermalResult("req-1", "LFP_BLADE"));
    store.updateSimConfig({ chargingPowerKw: 80 });
    expect(useWorkspaceStore.getState().thermalResultStale).toBe(true);
  });
});

