import type { SimulationConfig, SohConfig, SohForecast, ThermalResult } from "../domain/contracts";
import { validateSimulationConfig } from "../domain/validation";
import { useWorkspaceStore } from "../state/workspaceStore";
import { sharedEngineClient } from "./engineClient";

let seq = 0;
function nextRequestId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now()}-${seq}`;
}

export async function runThermalInWorkspace(configOverride?: SimulationConfig): Promise<ThermalResult | null> {
  const store = useWorkspaceStore.getState();
  const cfg = configOverride ?? store.simConfig;
  const check = validateSimulationConfig(cfg);
  const firstError = check.issues.find((i) => i.severity === "error");
  if (firstError) {
    store.markSimulationFailed(cfg.scenarioId, firstError.message);
    return null;
  }

  const requestId = nextRequestId(cfg.architecture.toLowerCase());
  const payload: SimulationConfig = { ...cfg, scenarioId: requestId };
  store.startSimulationRequest(requestId);

  try {
    const result = await sharedEngineClient.runThermal(payload, (pct) => {
      useWorkspaceStore.getState().updateSimulationProgress(requestId, pct);
    });
    useWorkspaceStore.getState().markSimulationCompleted(result);
    return result;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    useWorkspaceStore.getState().markSimulationFailed(requestId, msg);
    return null;
  }
}

export function cancelThermalInWorkspace(): void {
  const reqId = useWorkspaceStore.getState().activeThermalRequestId;
  if (!reqId) return;
  sharedEngineClient.cancel(reqId);
  useWorkspaceStore.getState().cancelSimulationRequest(reqId);
}

export async function runSohInWorkspace(configOverride?: SohConfig): Promise<SohForecast | null> {
  const store = useWorkspaceStore.getState();
  const cfg = configOverride ?? store.sohConfig;
  const reqId = nextRequestId("soh");
  store.setSohRunning();
  try {
    const forecast = await sharedEngineClient.runSoh(reqId, cfg);
    useWorkspaceStore.getState().setSohForecast(forecast);
    return forecast;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    useWorkspaceStore.getState().setSohFailed(msg);
    return null;
  }
}

export async function runComparisonPair(
  lfpConfig: SimulationConfig,
  nmcConfig: SimulationConfig
): Promise<{ lfp: ThermalResult; nmc: ThermalResult }> {
  const lfp = await sharedEngineClient.runThermal({ ...lfpConfig, scenarioId: nextRequestId("cmp-lfp") });
  const nmc = await sharedEngineClient.runThermal({ ...nmcConfig, scenarioId: nextRequestId("cmp-nmc") });
  return { lfp, nmc };
}

