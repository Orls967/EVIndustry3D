import { create } from "zustand";
import type {
  ArchitectureId,
  RoiInputs,
  ScenarioPreset,
  SimulationConfig,
  SohConfig,
  SohForecast,
  ThermalResult,
} from "../domain/contracts";
import { getPackDefinition, getPresetById } from "../domain/dataLoaders";
import { createEmptyRoiInputs } from "../domain/roi";

export type WorkspaceTab = "inspect" | "simulate" | "forecast" | "decide";
export type SheetHeight = "peek" | "half" | "full";
export type SimRunStatus = "idle" | "running" | "completed" | "failed" | "cancelled";
export type QualityTier = "high" | "medium" | "low";
export type CameraPreset = "iso" | "top" | "front" | "side";

export interface SceneRenderMetrics {
  drawCalls: number;
  triangles: number;
  lastFrameMs: number;
  fpsEstimate: number;
}

function buildDefaultVisibility(arch: ArchitectureId): Record<string, boolean> {
  const pack = getPackDefinition(arch);
  const vis: Record<string, boolean> = {};
  for (const c of pack.components) {
    vis[c.id] = true;
  }
  return vis;
}

function buildConfigFromPreset(arch: ArchitectureId, presetId: ScenarioPreset["id"]): SimulationConfig {
  const preset = getPresetById(presetId);
  return {
    scenarioId: `${arch.toLowerCase()}-${presetId}`,
    architecture: arch,
    chargingPowerKw: preset.chargingPowerKw,
    ambientTemperatureC: preset.ambientTemperatureC,
    coolantFlowLpm: preset.coolantFlowLpm,
    coolantInletTemperatureC: preset.coolantInletTemperatureC,
    initialSocPercent: preset.initialSocPercent,
    targetSocPercent: preset.targetSocPercent,
    maxDurationMinutes: preset.maxDurationMinutes,
    initialPackTemperatureC: preset.ambientTemperatureC,
  };
}

function buildDefaultSohConfig(arch: ArchitectureId): SohConfig {
  return {
    architecture: arch,
    baselineSohPercent: 100,
    horizonYears: 8,
    thresholdPercent: 80,
    equivalentFullCyclesPerYear: 300,
    averageCRate: 1.0,
    depthOfDischargePercent: 70,
    representativeTemperatureC: 30,
    averageRestingSocPercent: 50,
    maxChargeSocPercent: 80,
    nmcCalendarLossPctPerSqrtYear: null,
    nmcCycleLossPctPerFec: null,
    nmcCycleExponent: null,
    nmcActivationEnergyJPerMol: null,
    nmcReferenceTempC: null,
  };
}

export interface WorkspaceState {
  architecture: ArchitectureId;
  activeTab: WorkspaceTab;
  mobileSheetHeight: SheetHeight;
  leftPanelCollapsed: boolean;

  // Inspection & 3D control state
  selectedComponentId: string | null;
  selectedZoneId: string | null;
  selectedCellId: string | null;
  componentVisibility: Record<string, boolean>;
  componentSearch: string;
  explodePercent: number;
  crossSectionEnabled: boolean;
  crossSectionPosition: number; // 0..1 along X
  crossSectionFlipped: boolean;
  heatmapEnabled: boolean;
  qualityTier: QualityTier;
  cameraPreset: CameraPreset;
  cameraRequestNonce: number;
  c3AutoRotate: boolean;
  sceneRenderMetrics: SceneRenderMetrics | null;

  // Simulation state + stale-result guard
  selectedPresetId: ScenarioPreset["id"] | "custom";
  simConfig: SimulationConfig;
  simStatus: SimRunStatus;
  simProgressPct: number;
  simError: string | null;
  activeThermalRequestId: string | null;
  thermalResult: ThermalResult | null;
  thermalResultStale: boolean;
  simPlaybackSampleIndex: number;
  simPlaybackPlaying: boolean;

  // Architecture switch modal guard (PRD FR-02)
  pendingSwitchArch: ArchitectureId | null;

  // Lifecycle & ROI state
  sohConfig: SohConfig;
  sohForecast: SohForecast | null;
  sohStatus: "idle" | "running" | "completed" | "failed";
  sohError: string | null;
  roiInputs: RoiInputs;

  // Actions
  setActiveTab: (tab: WorkspaceTab) => void;
  setMobileSheetHeight: (h: SheetHeight) => void;
  toggleLeftPanel: () => void;
  selectComponent: (id: string | null, zoneId?: string | null, cellId?: string | null) => void;
  toggleComponentVisibility: (id: string) => void;
  setComponentSearch: (query: string) => void;
  setExplodePercent: (pct: number) => void;
  resetAssembly: () => void;
  setCrossSection: (patch: Partial<{ enabled: boolean; position: number; flipped: boolean }>) => void;
  setHeatmapEnabled: (on: boolean) => void;
  setQualityTier: (tier: QualityTier) => void;
  requestCameraPreset: (preset: CameraPreset) => void;
  setC3AutoRotate: (on: boolean) => void;
  setSceneRenderMetrics: (m: SceneRenderMetrics) => void;
  applyPreset: (presetId: ScenarioPreset["id"]) => void;
  updateSimConfig: (patch: Partial<SimulationConfig>) => void;
  startSimulationRequest: (requestId: string) => void;
  updateSimulationProgress: (requestId: string, pct: number) => void;
  cancelSimulationRequest: (requestId: string) => void;
  markSimulationCompleted: (result: ThermalResult) => void;
  markSimulationFailed: (requestId: string, message: string) => void;
  setPlaybackSampleIndex: (idx: number) => void;
  setPlaybackPlaying: (on: boolean) => void;
  syncRouteArchitecture: (arch: ArchitectureId) => void;
  requestArchitectureSwitch: (nextArch: ArchitectureId) => boolean;
  confirmArchitectureSwitch: () => void;
  cancelArchitectureSwitch: () => void;
  updateSohConfig: (patch: Partial<SohConfig>) => void;
  setSohRunning: () => void;
  setSohForecast: (forecast: SohForecast) => void;
  setSohFailed: (message: string) => void;
  updateRoiInputs: (patch: Partial<RoiInputs>) => void;
  resetSimulationInputs: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  architecture: "LFP_BLADE",
  activeTab: "inspect",
  mobileSheetHeight: "peek",
  leftPanelCollapsed: false,

  selectedComponentId: null,
  selectedZoneId: null,
  selectedCellId: null,
  componentVisibility: buildDefaultVisibility("LFP_BLADE"),
  componentSearch: "",
  explodePercent: 0,
  crossSectionEnabled: false,
  crossSectionPosition: 0.5,
  crossSectionFlipped: false,
  heatmapEnabled: false,
  qualityTier: "high",
  cameraPreset: "iso",
  cameraRequestNonce: 0,
  c3AutoRotate: true,
  sceneRenderMetrics: null,

  selectedPresetId: "normal",
  simConfig: buildConfigFromPreset("LFP_BLADE", "normal"),
  simStatus: "idle",
  simProgressPct: 0,
  simError: null,
  activeThermalRequestId: null,
  thermalResult: null,
  thermalResultStale: false,
  simPlaybackSampleIndex: 0,
  simPlaybackPlaying: false,

  pendingSwitchArch: null,

  sohConfig: buildDefaultSohConfig("LFP_BLADE"),
  sohForecast: null,
  sohStatus: "idle",
  sohError: null,
  roiInputs: createEmptyRoiInputs(8),

  setActiveTab: (tab) => set({ activeTab: tab }),
  setMobileSheetHeight: (h) => set({ mobileSheetHeight: h }),
  toggleLeftPanel: () => set((s) => ({ leftPanelCollapsed: !s.leftPanelCollapsed })),

  selectComponent: (id, zoneId = null, cellId = null) =>
    set((s) => ({
      selectedComponentId: id,
      selectedZoneId: zoneId,
      selectedCellId: cellId,
      activeTab: id ? "inspect" : s.activeTab,
    })),

  toggleComponentVisibility: (id) =>
    set((s) => ({
      componentVisibility: {
        ...s.componentVisibility,
        [id]: s.componentVisibility[id] === false,
      },
    })),

  setComponentSearch: (query) => set({ componentSearch: query }),
  setExplodePercent: (pct) => set({ explodePercent: Math.min(Math.max(pct, 0), 100) }),

  resetAssembly: () =>
    set((s) => ({
      explodePercent: 0,
      crossSectionEnabled: false,
      crossSectionPosition: 0.5,
      crossSectionFlipped: false,
      componentVisibility: buildDefaultVisibility(s.architecture),
    })),

  setCrossSection: (patch) =>
    set((s) => ({
      crossSectionEnabled: patch.enabled ?? s.crossSectionEnabled,
      crossSectionPosition: patch.position ?? s.crossSectionPosition,
      crossSectionFlipped: patch.flipped ?? s.crossSectionFlipped,
    })),

  setHeatmapEnabled: (on) => set({ heatmapEnabled: on }),
  setQualityTier: (tier) => set({ qualityTier: tier }),
  requestCameraPreset: (preset) =>
    set((s) => ({ cameraPreset: preset, cameraRequestNonce: s.cameraRequestNonce + 1, c3AutoRotate: false })),
  setC3AutoRotate: (on) => set({ c3AutoRotate: on }),
  setSceneRenderMetrics: (m) => set({ sceneRenderMetrics: m }),

  applyPreset: (presetId) =>
    set((s) => ({
      selectedPresetId: presetId,
      simConfig: buildConfigFromPreset(s.architecture, presetId),
      thermalResultStale: s.thermalResult !== null,
    })),

  updateSimConfig: (patch) =>
    set((s) => ({
      selectedPresetId: "custom",
      simConfig: { ...s.simConfig, ...patch },
      thermalResultStale: s.thermalResult !== null,
    })),

  startSimulationRequest: (requestId) =>
    set({
      activeThermalRequestId: requestId,
      simStatus: "running",
      simProgressPct: 0,
      simError: null,
      simPlaybackPlaying: false,
    }),

  updateSimulationProgress: (requestId, pct) =>
    set((s) => {
      if (s.activeThermalRequestId !== requestId) {
        return s;
      }
      return { simProgressPct: pct };
    }),

  cancelSimulationRequest: (requestId) =>
    set((s) => {
      if (s.activeThermalRequestId !== requestId) {
        return s;
      }
      return {
        simStatus: "cancelled",
        simProgressPct: 0,
        simError: "Simulation cancelled by user.",
        thermalResultStale: s.thermalResult !== null,
        activeThermalRequestId: null,
      };
    }),

  markSimulationCompleted: (result) =>
    set((s) => {
      // Stale-result guard (03-repository-module-contracts.md §3.3)
      if (s.activeThermalRequestId !== null && result.scenarioId !== s.activeThermalRequestId) {
        return s;
      }
      const lastIdx = Math.max(0, result.nSamples - 1);
      return {
        simStatus: "completed",
        simProgressPct: 100,
        simError: null,
        thermalResult: result,
        thermalResultStale: false,
        activeThermalRequestId: null,
        heatmapEnabled: true,
        simPlaybackSampleIndex: lastIdx,
        simPlaybackPlaying: false,
        sohConfig: {
          ...s.sohConfig,
          averageCRate: Number(result.summary.peakCRate.toFixed(2)),
          representativeTemperatureC: Number(result.summary.averageTemperatureC.toFixed(1)),
        },
      };
    }),

  markSimulationFailed: (requestId, message) =>
    set((s) => {
      if (s.activeThermalRequestId !== null && requestId !== s.activeThermalRequestId) {
        return s;
      }
      return {
        simStatus: "failed",
        simError: message,
        thermalResultStale: s.thermalResult !== null,
        activeThermalRequestId: null,
      };
    }),

  setPlaybackSampleIndex: (idx) =>
    set((s) => {
      const maxIdx = Math.max(0, (s.thermalResult?.nSamples ?? 1) - 1);
      return { simPlaybackSampleIndex: Math.min(Math.max(idx, 0), maxIdx) };
    }),

  setPlaybackPlaying: (on) => set({ simPlaybackPlaying: on }),

  syncRouteArchitecture: (arch) =>
    set((s) => {
      if (s.architecture === arch) return s;
      return {
        architecture: arch,
        selectedComponentId: null,
        selectedZoneId: null,
        selectedCellId: null,
        componentVisibility: buildDefaultVisibility(arch),
        componentSearch: "",
        heatmapEnabled: false,
        thermalResult: null,
        thermalResultStale: false,
        simStatus: "idle",
        simProgressPct: 0,
        simError: null,
        activeThermalRequestId: null,
        simPlaybackSampleIndex: 0,
        simPlaybackPlaying: false,
        simConfig: { ...s.simConfig, architecture: arch },
        sohConfig: buildDefaultSohConfig(arch),
        sohForecast: null,
        sohStatus: "idle",
        sohError: null,
      };
    }),

  requestArchitectureSwitch: (nextArch) => {
    const s = get();
    if (nextArch === s.architecture) {
      return true;
    }
    if (s.thermalResult !== null) {
      set({ pendingSwitchArch: nextArch });
      return false;
    }
    set({
      architecture: nextArch,
      selectedComponentId: null,
      selectedZoneId: null,
      componentVisibility: buildDefaultVisibility(nextArch),
      componentSearch: "",
      simConfig: { ...s.simConfig, architecture: nextArch },
      sohConfig: buildDefaultSohConfig(nextArch),
      pendingSwitchArch: null,
    });
    return true;
  },

  confirmArchitectureSwitch: () =>
    set((s) => {
      const nextArch = s.pendingSwitchArch;
      if (!nextArch) {
        return s;
      }
      return {
        architecture: nextArch,
        pendingSwitchArch: null,
        selectedComponentId: null,
        selectedZoneId: null,
        componentVisibility: buildDefaultVisibility(nextArch),
        componentSearch: "",
        heatmapEnabled: false,
        thermalResult: null,
        thermalResultStale: false,
        simStatus: "idle",
        simProgressPct: 0,
        simError: null,
        activeThermalRequestId: null,
        simPlaybackSampleIndex: 0,
        simPlaybackPlaying: false,
        simConfig: { ...s.simConfig, architecture: nextArch },
        sohConfig: buildDefaultSohConfig(nextArch),
        sohForecast: null,
        sohStatus: "idle",
        sohError: null,
      };
    }),

  cancelArchitectureSwitch: () => set({ pendingSwitchArch: null }),

  updateSohConfig: (patch) =>
    set((s) => ({
      sohConfig: { ...s.sohConfig, ...patch },
      sohForecast: null,
      sohStatus: "idle",
      sohError: null,
      roiInputs:
        patch.horizonYears !== undefined
          ? { ...s.roiInputs, analysisHorizonYears: patch.horizonYears }
          : s.roiInputs,
    })),

  setSohRunning: () => set({ sohStatus: "running", sohError: null }),

  setSohForecast: (forecast) =>
    set((s) => ({
      sohForecast: forecast,
      sohStatus: "completed",
      sohError: null,
      roiInputs: {
        ...s.roiInputs,
        projectedEndSohPercent: forecast.points[forecast.points.length - 1]?.sohPercent ?? null,
        eolThresholdPercent: s.sohConfig.thresholdPercent,
      },
    })),

  setSohFailed: (message) => set({ sohStatus: "failed", sohError: message }),

  updateRoiInputs: (patch) =>
    set((s) => ({
      roiInputs: { ...s.roiInputs, ...patch },
    })),

  resetSimulationInputs: () =>
    set((s) => ({
      selectedPresetId: "normal",
      simConfig: buildConfigFromPreset(s.architecture, "normal"),
      thermalResultStale: s.thermalResult !== null,
    })),
}));

