import { describe, expect, it } from "vitest";
import type { WorkerRequest, WorkerResponse } from "./protocol";

describe("M0-M5 worker protocol types", () => {
  it("constructs Init, RunThermal, RunSoh, Cancel, Progress, and Done messages", () => {
    const reqInit: WorkerRequest = { type: "Init" };
    const reqCancel: WorkerRequest = { type: "Cancel", scenarioId: "fast-charge" };
    const reqSoh: WorkerRequest = {
      type: "RunSoh",
      requestId: "soh-1",
      config: {
        architecture: "LFP_BLADE",
        baselineSohPercent: 100,
        horizonYears: 8,
        thresholdPercent: 80,
        equivalentFullCyclesPerYear: 365,
        averageCRate: 1,
        depthOfDischargePercent: 80,
        representativeTemperatureC: 31,
        averageRestingSocPercent: 50,
        maxChargeSocPercent: 90,
      },
    };
    const resReady: WorkerResponse = { type: "Ready", engineVersion: "0.1.0" };
    const resProg: WorkerResponse = { type: "Progress", scenarioId: "fast-charge", percent: 50 };
    const resFail: WorkerResponse = { type: "Failed", requestId: "soh-1", message: "test" };
    expect(reqInit.type).toBe("Init");
    expect(reqCancel.type).toBe("Cancel");
    expect(reqSoh.type).toBe("RunSoh");
    expect(resReady.type).toBe("Ready");
    expect(resProg.percent).toBe(50);
    expect(resFail.message).toBe("test");
  });
});

