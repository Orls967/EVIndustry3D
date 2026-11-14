import initWasm, { engine_version, run_soh, run_thermal } from "../../../engine/wasm/pkg/ev_pack_wasm";
import type { SohForecast, ThermalResult } from "../domain/contracts";
import type { WorkerRequest, WorkerResponse } from "./protocol";

let initialized = false;
let cancelledScenarioId: string | null = null;

async function ensureWasmReady(): Promise<void> {
  if (!initialized) {
    await initWasm();
    initialized = true;
  }
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;

  if (msg.type === "Cancel") {
    cancelledScenarioId = msg.scenarioId;
    return;
  }

  try {
    await ensureWasmReady();

    if (msg.type === "Init") {
      const response: WorkerResponse = {
        type: "Ready",
        engineVersion: engine_version(),
      };
      self.postMessage(response);
      return;
    }

    if (msg.type === "RunThermal") {
      cancelledScenarioId = null;
      const cfgPayload = {
        ...msg.config,
        scenarioId: msg.scenarioId,
      };
      const raw = run_thermal(JSON.stringify(cfgPayload), (pct: number) => {
        if (cancelledScenarioId === msg.scenarioId) return;
        const pMsg: WorkerResponse = {
          type: "Progress",
          scenarioId: msg.scenarioId,
          percent: Math.round(pct),
        };
        self.postMessage(pMsg);
      });

      if (cancelledScenarioId === msg.scenarioId) {
        return;
      }

      const meta = JSON.parse(raw.metaJson) as Omit<
        ThermalResult,
        | "createdAtIso"
        | "timeSeconds"
        | "zoneTemperaturesC"
        | "coolantTemperaturesC"
        | "socPercent"
        | "cRateSeries"
        | "heatGenWatts"
      >;

      const timeSeconds = new Float32Array(raw.timeSeconds);
      const zoneTemperaturesC = new Float32Array(raw.zoneTemperaturesC);
      const coolantTemperaturesC = new Float32Array(raw.coolantTemperaturesC);
      const socPercent = new Float32Array(raw.socPercent);
      const cRateSeries = new Float32Array(raw.cRateSeries);
      const heatGenWatts = new Float32Array(raw.heatGenWatts);

      const result: ThermalResult = {
        ...meta,
        createdAtIso: new Date().toISOString(),
        timeSeconds,
        zoneTemperaturesC,
        coolantTemperaturesC,
        socPercent,
        cRateSeries,
        heatGenWatts,
      };

      const doneMsg: WorkerResponse = {
        type: "ThermalDone",
        scenarioId: msg.scenarioId,
        result,
      };
      (self as unknown as { postMessage: (msg: WorkerResponse, transfer: Transferable[]) => void }).postMessage(
        doneMsg,
        [
          timeSeconds.buffer,
          zoneTemperaturesC.buffer,
          coolantTemperaturesC.buffer,
          socPercent.buffer,
          cRateSeries.buffer,
          heatGenWatts.buffer,
        ]
      );
      return;
    }

    if (msg.type === "RunSoh") {
      const cfgPayload = {
        architecture: msg.config.architecture,
        baselineSohPercent: msg.config.baselineSohPercent,
        horizonYears: msg.config.horizonYears,
        thresholdPercent: msg.config.thresholdPercent,
        equivalentFullCyclesPerYear: msg.config.equivalentFullCyclesPerYear,
        averageCRate: msg.config.averageCRate,
        depthOfDischargePercent: msg.config.depthOfDischargePercent,
        representativeTemperatureC: msg.config.representativeTemperatureC,
        averageRestingSocPercent: msg.config.averageRestingSocPercent,
        maxChargeSocPercent: msg.config.maxChargeSocPercent,
        nmcUserInputs:
          msg.config.architecture === "NMC_4680" &&
          msg.config.nmcCalendarLossPctPerSqrtYear !== null &&
          msg.config.nmcCalendarLossPctPerSqrtYear !== undefined &&
          msg.config.nmcCycleLossPctPerFec !== null &&
          msg.config.nmcCycleLossPctPerFec !== undefined &&
          msg.config.nmcCycleExponent !== null &&
          msg.config.nmcCycleExponent !== undefined &&
          msg.config.nmcActivationEnergyJPerMol !== null &&
          msg.config.nmcActivationEnergyJPerMol !== undefined &&
          msg.config.nmcReferenceTempC !== null &&
          msg.config.nmcReferenceTempC !== undefined
            ? {
                calendarLossPctPerSqrtYear: msg.config.nmcCalendarLossPctPerSqrtYear,
                cycleLossPctPerFec: msg.config.nmcCycleLossPctPerFec,
                cycleExponent: msg.config.nmcCycleExponent,
                activationEnergyJPerMol: msg.config.nmcActivationEnergyJPerMol,
                referenceTempC: msg.config.nmcReferenceTempC,
              }
            : null,
      };

      const rawStr = run_soh(JSON.stringify(cfgPayload));
      const parsed = JSON.parse(rawStr) as Omit<SohForecast, "dataStatus">;
      const result: SohForecast = {
        ...parsed,
        dataStatus: "ILLUSTRATIVE",
      };
      const doneMsg: WorkerResponse = {
        type: "SohDone",
        requestId: msg.requestId,
        result,
      };
      self.postMessage(doneMsg);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const reqId =
      msg.type === "RunThermal" ? msg.scenarioId : msg.type === "RunSoh" ? msg.requestId : undefined;
    const response: WorkerResponse = { type: "Failed", requestId: reqId, message };
    self.postMessage(response);
  }
};
