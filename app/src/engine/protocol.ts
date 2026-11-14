import type { SimulationConfig, SohConfig, SohForecast, ThermalResult } from "../domain/contracts";

export type WorkerRequest =
  | { type: "Init" }
  | { type: "RunThermal"; scenarioId: string; config: SimulationConfig }
  | { type: "RunSoh"; requestId: string; config: SohConfig }
  | { type: "Cancel"; scenarioId: string };

export type WorkerResponse =
  | { type: "Ready"; engineVersion: string }
  | { type: "Progress"; scenarioId: string; percent: number }
  | { type: "ThermalDone"; scenarioId: string; result: ThermalResult }
  | { type: "SohDone"; requestId: string; result: SohForecast }
  | { type: "Failed"; requestId?: string; message: string };
