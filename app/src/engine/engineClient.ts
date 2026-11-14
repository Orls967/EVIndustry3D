import type { SimulationConfig, SohConfig, SohForecast, ThermalResult } from "../domain/contracts";
import type { WorkerResponse } from "./protocol";

interface PendingThermal {
  scenarioId: string;
  onProgress?: (pct: number) => void;
  resolve: (result: ThermalResult) => void;
  reject: (err: Error) => void;
}

interface PendingSoh {
  requestId: string;
  resolve: (result: SohForecast) => void;
  reject: (err: Error) => void;
}

export class EngineClient {
  private worker: Worker | null = null;
  private readyPromise: Promise<string> | null = null;
  private pendingThermal: PendingThermal | null = null;
  private pendingSoh: PendingSoh | null = null;

  private ensureWorker(): Promise<string> {
    if (this.worker && this.readyPromise) {
      return this.readyPromise;
    }
    const worker = new Worker(new URL("./thermal.worker.ts", import.meta.url), {
      type: "module",
    });
    this.worker = worker;

    this.readyPromise = new Promise<string>((resolve, reject) => {
      let settledReady = false;
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const msg = event.data;
        if (msg.type === "Ready") {
          settledReady = true;
          resolve(msg.engineVersion);
          return;
        }
        if (msg.type === "Progress") {
          if (this.pendingThermal && this.pendingThermal.scenarioId === msg.scenarioId) {
            this.pendingThermal.onProgress?.(msg.percent);
          }
          return;
        }
        if (msg.type === "ThermalDone") {
          if (this.pendingThermal && this.pendingThermal.scenarioId === msg.scenarioId) {
            const p = this.pendingThermal;
            this.pendingThermal = null;
            p.resolve(msg.result);
          }
          return;
        }
        if (msg.type === "SohDone") {
          if (this.pendingSoh && this.pendingSoh.requestId === msg.requestId) {
            const p = this.pendingSoh;
            this.pendingSoh = null;
            p.resolve(msg.result);
          }
          return;
        }
        if (msg.type === "Failed") {
          if (!settledReady) {
            settledReady = true;
            reject(new Error(msg.message));
          }
          if (this.pendingThermal && (!msg.requestId || msg.requestId === this.pendingThermal.scenarioId)) {
            const p = this.pendingThermal;
            this.pendingThermal = null;
            p.reject(new Error(msg.message));
          }
          if (this.pendingSoh && (!msg.requestId || msg.requestId === this.pendingSoh.requestId)) {
            const p = this.pendingSoh;
            this.pendingSoh = null;
            p.reject(new Error(msg.message));
          }
        }
      };

      worker.onerror = (err) => {
        const message = err.message || "Worker load failure";
        if (!settledReady) {
          settledReady = true;
          reject(new Error(message));
        }
        this.pendingThermal?.reject(new Error(message));
        this.pendingThermal = null;
        this.pendingSoh?.reject(new Error(message));
        this.pendingSoh = null;
        this.dispose();
      };

      worker.postMessage({ type: "Init" });
    });

    return this.readyPromise;
  }

  init(): Promise<string> {
    this.dispose();
    return this.ensureWorker();
  }

  async runThermal(
    config: SimulationConfig,
    onProgress?: (percent: number) => void
  ): Promise<ThermalResult> {
    await this.ensureWorker();
    if (!this.worker) {
      throw new Error("Thermal worker unavailable.");
    }
    if (this.pendingThermal) {
      const stale = this.pendingThermal;
      this.pendingThermal = null;
      stale.reject(new Error("Superseded by a newer simulation request."));
    }
    return new Promise<ThermalResult>((resolve, reject) => {
      this.pendingThermal = {
        scenarioId: config.scenarioId,
        onProgress,
        resolve,
        reject,
      };
      this.worker?.postMessage({
        type: "RunThermal",
        scenarioId: config.scenarioId,
        config,
      });
    });
  }

  async runSoh(requestId: string, config: SohConfig): Promise<SohForecast> {
    await this.ensureWorker();
    if (!this.worker) {
      throw new Error("SoH worker unavailable.");
    }
    if (this.pendingSoh) {
      const stale = this.pendingSoh;
      this.pendingSoh = null;
      stale.reject(new Error("Superseded by a newer forecast request."));
    }
    return new Promise<SohForecast>((resolve, reject) => {
      this.pendingSoh = { requestId, resolve, reject };
      this.worker?.postMessage({
        type: "RunSoh",
        requestId,
        config,
      });
    });
  }

  cancel(scenarioId: string): void {
    if (this.pendingThermal && this.pendingThermal.scenarioId === scenarioId) {
      this.worker?.postMessage({ type: "Cancel", scenarioId });
      const p = this.pendingThermal;
      this.pendingThermal = null;
      p.reject(new Error("Simulation cancelled by user."));
      // Restart cleanly so a tight synchronous Wasm step stops immediately
      this.dispose();
    }
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.readyPromise = null;
  }
}

export const sharedEngineClient = new EngineClient();
