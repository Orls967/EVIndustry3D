# 03 — Repository Layout, Module Boundaries, Contracts & Dependency Plan

**Project:** EV Battery Pack Digital Twin
**Phase:** 3 — Implementation Planning
**Date:** 14 November 2026
**Status:** Proposed for Gate 3 review.

---

## 1. Confirmed Repository & Directory Structure

Refines and confirms `docs/design/04-technical-architecture.md` §3.1:

```text
/
├─ .gitignore                      Excludes node_modules, dist, target, .venv, .env* (except .env.example)
├─ .env.example                    Documents VITE_BASE_PATH only (zero secrets)
├─ README.md                       Project overview, run/test commands (finalized in Phase 6)
├─ app/                            Frontend workspace (Vite + React + TypeScript strict)
│  ├─ package.json
│  ├─ tsconfig.json                "strict": true, "noUncheckedIndexedAccess": true
│  ├─ vite.config.ts               base from VITE_BASE_PATH (default "/"), worker ES format
│  ├─ eslint.config.js             Enforces module import boundaries (no-restricted-imports)
│  ├─ playwright.config.ts         Desktop (1440×900), Tablet (768×1024), Mobile (390×844)
│  ├─ public/
│  │  └─ stills/                   Static model-rendered fallback posters (generated in M3)
│  └─ src/
│     ├─ main.tsx                  Imports self-hosted fonts & design tokens CSS
│     ├─ App.tsx                   HashRouter + ErrorBoundary + SkipLink
│     ├─ styles/                   CSS custom properties from 02-design-system.md
│     ├─ routes/                   LandingPage, SelectArchitecturePage, WorkspacePage, ComparePage, MethodologyPage
│     ├─ features/
│     │  ├─ inspect/               ComponentTree, ComponentInspector
│     │  ├─ simulate/              ParameterForm, Presets, SimulationResults, TimeChart, HotspotList
│     │  ├─ forecast/              SohForm, SohChart, AssumptionsDisclosure
│     │  └─ decide/                RoiForm, RoiSummary, CalculationDetails
│     ├─ scene/                    Three.js / R3F ONLY (never imports engine/)
│     │  ├─ PackCanvas.tsx         On-demand R3F Canvas, studio lighting, WebGL fallback/retry
│     │  ├─ builders/              Procedural LFP blade & NMC 4680 geometry builders
│     │  ├─ materials/             CAD material presets & 5-stop thermal scale mapper
│     │  ├─ controllers/           C3 auto-rotate, C1 exploded interpolation, camera presets/focus
│     │  ├─ clipping/              1-axis X-ray plane & cut-face handler
│     │  └─ picking/               Raycast + InstancedMesh instanceId → cellId → zoneId map
│     ├─ engine/                   Worker lifecycle + typed client + Wasm glue (no UI)
│     │  ├─ thermal.worker.ts      Loads engine/wasm pkg, handles Init/RunThermal/RunSoh/Cancel
│     │  ├─ engineClient.ts        Promise/progress wrapper + stale scenarioId guard
│     │  └─ protocol.ts            Worker message & typed-array transfer definitions
│     ├─ state/
│     │  └─ workspaceStore.ts      Zustand store (UI, parameters, results keyed by scenarioId, overrides)
│     ├─ domain/                   Pure TS types, unit formatters, field validators, ROI math
│     │  ├─ contracts.ts           Shared TS types matching Rust serde & JSON schemas
│     │  ├─ validation.ts          Range, unit, >2C warning checks (blocks invalid input pre-worker)
│     │  └─ roi.ts                 Pure deterministic Repair vs Replace & deferral formulas
│     ├─ ui/                       Design-system primitives (Button, SliderField, DataStatusBadge, TableView, etc.)
│     └─ content/                  Centralized English UI strings & generic educational copy
├─ engine/                         Rust Cargo workspace
│  ├─ Cargo.toml
│  ├─ core/                        Pure Rust library (no wasm-bindgen dependency; runs native cargo test)
│  │  └─ src/
│  │     ├─ lib.rs
│  │     ├─ types.rs               Unit-safe structs, PackParams, SimulationConfig, ThermalResult, SohConfig
│  │     ├─ tables.rs              Bilinear lookup for R_dc(SOC, T), linear lookup for OCV & dV_ocv/dT
│  │     ├─ coolant.rs             F2 50% EG properties + F13 laminar Nu_Dh & Re check
│  │     ├─ thermal.rs             Lumped thermal network ODE + RK4 solver + energy balance check
│  │     └─ soh.rs                 F9 Schimpe 2018 LFP model + NMC user-fade option + ±5 °C sensitivity
│  └─ wasm/                        Thin wasm-bindgen crate exposing core JSON/typed-array API to worker
│     └─ src/lib.rs
├─ analysis/                       Offline Python developer toolchain (NEVER shipped to browser)
│  ├─ requirements.txt             Pinned numpy, scipy, matplotlib, jsonschema
│  ├─ digitize/                    Scripts + source metadata for S15 Fig. 8 and F7 Figs. 2–3
│  ├─ reference_model/             Independent Python implementation of thermal & SoH equations
│  ├─ validation/                  Runs V1–V6, P1–P3, generates test vectors & validation summary JSON
│  └─ tests/                       pytest suite for Python reference model & schema generation
├─ data/                           Single source of truth (plain JSON, checked into repo)
│  ├─ schema/                      JSON Schemas (pack.schema.json, register.schema.json, table.schema.json, vectors.schema.json)
│  ├─ packs/                       lfp-blade.json, nmc-4680.json
│  ├─ parameters/                  register.json (every parameter + provenance/source/assumptions)
│  ├─ tables/                      r_dc_lfp.json, r_dc_nmc.json, ocv_*_proxy.json, entropic_*_proxy.json
│  └─ test-vectors/                thermal_vectors.json, soh_vectors.json (consumed by Rust & Python)
└─ docs/
   ├─ phase-0-baseline-report.md
   ├─ research/
   ├─ design/
   ├─ design-research/
   └─ plan/                        Phase 3 planning documents (this folder)
```

> **Phase 6 boundary (`constraints.md` §11.3):** `.github/workflows/` is **not** created in Phase 3 or Phase 4. GitHub Actions and GitHub Pages configuration are prepared exclusively in Phase 6 after Gate 4.

---

## 2. Module Dependency & Boundary Rules

| Module | Allowed Imports | Forbidden Imports (enforced by ESLint / Cargo) |
|---|---|---|
| `engine/core` | `serde`, `serde_json`, `std` | `wasm-bindgen`, `js-sys`, `web-sys`, DOM |
| `engine/wasm` | `engine/core`, `wasm-bindgen`, `serde-wasm-bindgen` | Business equations duplicated outside `core` |
| `app/src/domain/` | Pure TS + `data/` JSON types | `react`, `three`, `engine/worker` |
| `app/src/scene/` | `three`, `@react-three/*`, `domain/`, `state/` | `engine/`, `features/*` |
| `app/src/features/*` | `ui/`, `domain/`, `state/`, `content/` | `three`, `@react-three/*`, direct Wasm calls |
| `app/src/engine/` | `domain/`, `engine/wasm` generated pkg | `react`, `three`, `features/*` |
| `data/` | Read by `app/`, `engine/`, `analysis/` | Written at runtime (static read-only JSON) |

---

## 3. Formal Data & Worker Contracts

Refines `04-technical-architecture.md` §5. Every physical field name carries its unit.

### 3.1 Thermal & Worker Contracts (`app/src/domain/contracts.ts` ↔ `engine/core/src/types.rs`)

```ts
export type ArchitectureId = "LFP_BLADE" | "NMC_4680";
export type DataStatus = "ILLUSTRATIVE" | "MODELLED" | "MEASURED";
export type ValidationStatus =
  | "NOT_VALIDATED"
  | "VERIFIED_NUMERICALLY"
  | "COMPARED_WITH_PUBLISHED";

export type SimulationConfig = {
  scenarioId: string;
  architecture: ArchitectureId;
  chargingPowerKw: number;           // 10 – 150 kW
  ambientTemperatureC: number;       // -10 – 45 °C
  coolantFlowLpm: number;            // validated against laminar range in data/parameters/register.json
  coolantInletTemperatureC: number;  // advanced input; default 25 °C (Assumed, matches F3)
  initialSocPercent: number;         // 0 – 95 %
  targetSocPercent: number;          // 5 – 100 % (must be > initialSocPercent)
  maxDurationMinutes: number;        // 1 – 180 min
  initialPackTemperatureC: number;   // defaults to ambientTemperatureC
};

export type ThermalWarningCode =
  | "ABOVE_2C_LIMIT"
  | "NON_LAMINAR_COOLANT_F3"         // Re >= 950 (beyond F3 CFD study range)
  | "TRANSITIONAL_OR_TURBULENT_RE";  // Re >= 2300 (beyond F13 laminar Nu_Dh correlation)

export type ThermalResult = {
  scenarioId: string;
  architecture: ArchitectureId;
  dataStatus: "MODELLED";
  validationStatus: ValidationStatus;
  engineVersion: string;
  parameterSetVersion: string;
  createdAtIso: string;
  timeStepSeconds: number;
  durationSeconds: number;
  endedBecause: "TARGET_SOC" | "MAX_DURATION" | "CANCELLED";
  summary: {
    maxTemperatureC: number;
    averageTemperatureC: number;
    temperatureSpreadC: number;
    hottestZoneId: string;
    peakCRate: number;
    reynoldsNumber: number;
    energyChargedKwh: number;
    heatGeneratedKwh: number;
    heatRemovedByCoolantKwh: number;
    coolingHeatRemovalFraction: number; // heatRemoved / heatGenerated (when > 0)
    coolantDeltaTC: number;             // outlet - inlet at end of run
    energyBalanceErrorPercent: number;
  };
  timeSeconds: Float32Array;            // stored every 10 s
  zoneTemperaturesC: Float32Array;      // flattened [zoneIndex * nSamples + sampleIndex]
  coolantTemperaturesC: Float32Array;   // flattened [segmentIndex * nSamples + sampleIndex]
  socPercent: Float32Array;             // nSamples
  zoneIds: string[];
  assumptions: string[];
  warnings: Array<{ code: ThermalWarningCode; message: string }>;
};
```

> **Note on Typed Arrays:** Flattening `[zone][sample]` into `Float32Array` (or `Float64Array` inside Rust → `Float32Array` across `postMessage` transfer list) avoids nested array allocation overhead when transferring time series between the Worker and main thread (`04` §5.1).

### 3.2 SoH & ROI Contracts

```ts
export type SohConfig = {
  architecture: ArchitectureId;
  baselineSohPercent: number;            // 50 – 100 %
  horizonYears: number;                  // 1 – 8 years
  thresholdPercent: number;              // 50 – 95 %, default 80 %
  equivalentFullCyclesPerYear: number;
  averageCRate: number;                  // default derived from thermal run or user-entered
  depthOfDischargePercent: number;       // 10 – 100 %
  representativeTemperatureC: number;    // derived from thermal run + resting temp, or user override
  averageRestingSocPercent: number;      // 0 – 100 %
  // Required for NMC_4680 (Option B, no defaults per G2-3):
  manualCalendarFadePctPerSqrtYear?: number;
  manualCycleFadePctPer100Efc?: number;
};

export type SohForecast = {
  dataStatus: "ILLUSTRATIVE";
  modelName: string;                     // e.g. "Schimpe_2018_26650_LFP" or "UserFadeInput_NMC"
  engineVersion: string;
  parameterSetVersion: string;
  points: Array<{
    year: number;
    sohPercent: number;
    lowerSensitivityCMinus5Percent?: number; // -5 °C sensitivity (not a statistical CI)
    upperSensitivityCPlus5Percent?: number;  // +5 °C sensitivity (not a statistical CI)
  }>;
  thresholdCrossingYear: number | null;
  assumptions: string[];
};

export type RoiInputs = {
  currency: "IDR" | "USD" | "EUR";
  inspectionCost: number | null;
  moduleReplacementCost: number | null;
  modulesToReplaceCount: number;         // integer >= 1, default 1
  packReplacementCost: number | null;
  downtimeCostPerDay: number | null;     // optional
  repairDowntimeDays: number | null;
  replacementDowntimeDays: number | null;
  analysisHorizonYears: number;          // synced from Forecast horizon
  deferralAnnualCostIncreasePct: number | null;
  deferralYears: number;                 // default 1
  annualBenefitOfActing: number | null;  // optional, for payback
};
```

### 3.3 Worker Protocol & Stale-Result Protection

- Worker messages: `Init`, `Ready`, `RunThermal`, `Progress`, `ThermalDone`, `RunSoh`, `SohDone`, `Cancel`, `Failed` (`04` §5.1).
- `workspaceStore` tracks `activeThermalRequestId: string | null`. When `Run` is pressed (or architecture switches), a new `scenarioId` is generated and any prior `scenarioId` receives `Cancel`. Any incoming `Progress` / `ThermalDone` / `Failed` whose `scenarioId !== activeThermalRequestId` is **discarded**.
- On `Failed` or `CANCELLED`, previously displayed `lastCompletedThermalResult` stays visible only if from the same architecture, flagged `stale: true` with the error/cancellation banner (`01` §8).

---

## 4. Static Hosting & Sub-Path Build Plan

Per `04-technical-architecture.md` §6 and `flow.md` Phase 6:
- **Routing:** `createHashRouter` (`react-router` or lightweight custom hash route matcher — using minimal custom hash routing or `react-router` if needed; custom ~40-line hash router for 6 fixed routes avoids extra dependency weight). Every link resolves to `#/...` off `index.html`, requiring zero server rewrites on GitHub Pages.
- **Base path:** `vite.config.ts` sets `base: process.env.VITE_BASE_PATH ?? "/"` so local dev uses `/` and Phase 6 GitHub Pages build sets `VITE_BASE_PATH=/<repo-name>/` without editing source files.
- **Worker & Wasm pathing:** Vite bundles `new Worker(new URL("./thermal.worker.ts", import.meta.url), { type: "module" })` and resolves `engine/wasm/pkg/*.wasm` relative to `import.meta.url` so sub-path deployment works automatically (`M0-06` verifies this under `--base /test-subpath/`).
- **Zero third-party runtime calls:** fonts (`@fontsource/inter`, `@fontsource/jetbrains-mono`) and JSON data are bundled/inlined in `dist/`. No CDN links, no analytics scripts.

---

## 5. Dependency & Licence Verification Table

Checked directly via `npm view` and `cargo info` on **14 November 2026** (`constraints.md` §10.3). Note: actual installation occurs only after Gate 3 authorization (`M0`), at which point font `LICENSE` files inside `node_modules` will also be read directly (`02-design-system.md` §3).

### 5.1 Frontend & Tooling (npm)

| Package | Role | Version Checked | Licence | Last Published | Status / Notes |
|---|---|---|---|---|---|
| `vite` | Build tool | `8.3.8` | MIT | 2026-11-11 | Active; supports ES module workers |
| `@vitejs/plugin-react` | React Vite plugin | `6.3.0` | MIT | 2026-11-09 | Active |
| `react` / `react-dom` | UI framework | `19.3.1` | MIT | 2026-11-12 | Active |
| `typescript` | Type checker | `7.0.2` (or `5.x` if plugin compat needed) | Apache-2.0 | 2026-11-14 | Verify ESLint/TS compatibility in `M0-02` |
| `three` | 3D engine | `0.187.0` | MIT | 2026-10-30 | Active |
| `@types/three` | TypeScript defs | `0.187.0` | MIT | 2026-10-30 | Matches `three` version |
| `@react-three/fiber` | React renderer for three.js | `9.8.2` | MIT | 2026-10-21 | PeerDeps: `react >=19 <19.4`, `three >=0.156` ✓ |
| `@react-three/drei` | R3F helpers (OrbitControls, etc.) | `10.7.9` | MIT | 2026-09-25 | PeerDeps: `react ^19`, `three >=0.159` ✓ |
| `zustand` | Workspace state store | `5.1.0` | MIT | 2026-11-06 | Active |
| `recharts` | Time-series & SoH SVG charts | `3.10.1` | MIT | 2026-11-03 | PeerDeps: `react ^19.0.0` ✓ |
| `lucide-react` | 1.5 px outline icons | `1.73.0` | ISC | 2026-11-14 | Active; configurable strokeWidth |
| `@fontsource/inter` | Self-hosted Inter font | `5.3.0` | OFL-1.1 | 2026-07-19 | Inspect `LICENSE` file in `M2-01` |
| `@fontsource/jetbrains-mono` | Self-hosted JetBrains Mono | `5.3.0` | OFL-1.1 | 2026-07-19 | Inspect `LICENSE` file in `M2-01` |
| `vite-plugin-wasm` | Wasm ES module bundling | `3.6.0` | MIT | 2026-03-15 | Verify worker Wasm loading in `M0-06` |
| `ajv` | Build/test JSON Schema validation | `8.20.0` | MIT | 2026-04-24 | Dev/test only; validates `data/` |
| `vitest` | Unit & component test runner | `5.1.0` | MIT | 2026-11-02 | Dev/test only |
| `@playwright/test` | Browser E2E test runner | `1.65.1` | Apache-2.0 | 2026-11-14 | Dev/test only |
| `@axe-core/playwright` | Automated WCAG rule scanner | `4.14.0` | MPL-2.0 | 2026-11-06 | Dev/test only (never bundled in `dist/`) |

### 5.2 Rust Engine (crates.io) & Python (offline)

| Package | Role | Version Checked | Licence | Notes |
|---|---|---|---|---|
| `wasm-bindgen` | Rust–JS bindings | `0.2.130` | MIT OR Apache-2.0 | Pinned in `engine/wasm/Cargo.toml` |
| `serde` | Serialization | `1.0.229` | MIT OR Apache-2.0 | Used by `core` & `wasm` |
| `serde_json` | JSON parsing for `data/` | `1.0.154` | MIT OR Apache-2.0 | Used by `core` & test vectors |
| `serde-wasm-bindgen` | Fast JS value conversion | `0.6.5` | MIT | Used in `engine/wasm` |
| `js-sys` | TypedArray (`Float32Array`) interop | `0.3.107` | MIT OR Apache-2.0 | Zero-copy/flat array output |
| `numpy`, `scipy`, `matplotlib`, `jsonschema` | Python offline digitization & reference checks | Pinned in `M0-01` | BSD / MIT | Offline only; check exact licences when creating `requirements.txt` |

