# 04 — Technical Architecture

**Phase:** 2 · **Date:** 14 November 2026 · **Status:** Proposed, presented for Gate 2. **Not yet approved.**

Builds on approved decisions D3, D6, D7, D8, D9 (`flow.md` §0). Nothing here has been built or measured. Performance figures are **targets**, not results.

---

## 1. Overview

A static web application. Everything the visitor uses runs in their browser. There is no server, no database, no account, and no network call after the site's own files have loaded.

```text
                         BROWSER
┌───────────────────────────────────────────────────────────────────┐
│  Main thread — TypeScript                                         │
│  ┌──────────┐  ┌───────────────┐  ┌────────────┐  ┌────────────┐  │
│  │ UI       │  │ 3D scene      │  │ Workspace  │  │ ROI        │  │
│  │ React    │◄─┤ three.js/R3F  │◄─┤ state      │─►│ calculator │  │
│  └────┬─────┘  └───────────────┘  └─────┬──────┘  └────────────┘  │
│       │                                 │                         │
│       │              ┌──────────────────▼─────────────┐           │
│       │              │ Engine client (typed messages) │           │
│       │              └──────────────────┬─────────────┘           │
├───────┼─────────────────────────────────┼─────────────────────────┤
│       │        Web Worker               │ postMessage             │
│       │              ┌──────────────────▼─────────────┐           │
│       │              │ Rust engine → WebAssembly      │           │
│       │              │ thermal model · SoH projection │           │
│       │              └────────────────────────────────┘           │
│  ┌────▼──────────────────────────────────────────────┐            │
│  │ Static data: pack definitions · parameter register│            │
│  │ · resistance tables · component metadata          │            │
│  └────────────────────────▲──────────────────────────┘            │
└───────────────────────────┼───────────────────────────────────────┘
                            │ generated and checked before release
               DEVELOPER MACHINE — Python, offline
        digitize figures · fit coefficients · reference model
        · cross-check Rust engine · validation plots
```

---

## 2. Languages and their boundaries

| Language | Owns | Does not do |
|---|---|---|
| **TypeScript** | UI, routing, state, 3D scene, charts, input validation, ROI arithmetic, worker messaging | Physics or degradation maths |
| **Rust → WebAssembly** | Thermal model, SoH projection, numerical integration, unit-safe core types | DOM access, rendering, file or network access |
| **Python (offline)** | Turning source material into data files; an independent reference implementation; fitting; validation reports | Anything at runtime. No Python is shipped to the browser |

Rust is used because it was chosen for this demonstrator (D7). The project MUST NOT state that Rust was selected for measured performance.

---

## 3. Module boundaries

### 3.1 Proposed repository layout

```text
/
├─ app/                      TypeScript application (Vite + React)
│  └─ src/
│     ├─ routes/             landing, selection, workspace, compare, methodology
│     ├─ features/
│     │  ├─ inspect/         component tree, inspector
│     │  ├─ simulate/        parameter form, results, charts, timeline
│     │  ├─ forecast/        SoH inputs and chart
│     │  └─ decide/          ROI inputs, outputs, calculation details
│     ├─ scene/              3D: pack builders, materials, exploded, clipping, heatmap, camera
│     ├─ engine/             worker, typed client, message types
│     ├─ domain/             shared types, units, validation, ROI formulas
│     ├─ ui/                 design-system components and tokens
│     └─ content/            interface strings, component descriptions
├─ engine/                   Rust workspace
│  ├─ core/                  pure model library: no WebAssembly dependency, fully unit-testable
│  └─ wasm/                  thin binding layer that exposes core to JavaScript
├─ analysis/                 Python, offline
│  ├─ reference_model/       independent implementation of the same equations
│  ├─ digitize/              figure-to-table scripts with their inputs
│  ├─ fitting/               degradation coefficient fitting
│  └─ reports/               validation outputs
├─ data/                     single source of truth, plain JSON
│  ├─ packs/                 lfp-blade.json, nmc-4680.json
│  ├─ parameters/            parameter register with provenance
│  ├─ tables/                resistance tables and other generated tables
│  ├─ test-vectors/          shared scenarios with expected outputs
│  └─ schema/                JSON Schemas for all of the above
└─ docs/
```

This layout is confirmed or changed in Phase 3.

### 3.2 Dependency rules

- `engine/core` depends on nothing in `app/`.
- `scene/` never calls the engine; it renders state it is given.
- `features/*` never import three.js; they talk to the scene through the workspace state.
- `data/` is read by all three languages and written only by people and by `analysis/` scripts.
- Every file in `data/` validates against a schema in `data/schema/`.

### 3.3 Why `data/` is central

One parameter register feeds four consumers: the Rust engine, the Python reference model, the methodology page, and the inspector. The numbers shown to the user are therefore the numbers the model used. Each generated file records which script and which source produced it.

---

## 4. Data flow for a simulation

1. The user edits parameters. TypeScript validates range, unit, and compatibility with the selected pack.
2. On **Run**, the app sends a `RunThermal` message to the worker with the configuration, the pack definition, and the parameter set.
3. The Rust engine validates again, integrates the model, and posts progress messages.
4. The worker returns a `ThermalResult`, or a typed error.
5. The app stores the result with its scenario ID. A result is attached only if its scenario ID matches the current request; late results from a superseded run are discarded (PRD FR-09).
6. The scene maps zone temperatures to colours; panels show metrics and the chart.
7. For the forecast, the app sends `RunSoh` with a temperature summary from the result and the usage assumptions.
8. The ROI calculator runs in TypeScript on the main thread from the forecast and the cost inputs.
9. Every displayed result carries data status, model version, parameter-set version, timestamp, and assumptions.

---

## 5. Contracts

These refine the conceptual types in PRD §11.6. Field names carry their unit.

```ts
type ArchitectureId = "LFP_BLADE" | "NMC_4680";
type DataStatus = "ILLUSTRATIVE" | "MODELLED" | "MEASURED";
type ValidationStatus = "NOT_VALIDATED" | "VERIFIED_NUMERICALLY" | "COMPARED_WITH_PUBLISHED";

type SimulationConfig = {
  scenarioId: string;              // generated per run
  architecture: ArchitectureId;
  chargingPowerKw: number;
  ambientTemperatureC: number;
  coolantFlowLpm: number;
  coolantInletTemperatureC: number; // advanced input; default is a stated assumption
  initialSocPercent: number;
  targetSocPercent: number;
  maxDurationMinutes: number;
  initialPackTemperatureC: number;  // defaults to ambient
};

type ThermalResult = {
  scenarioId: string;
  architecture: ArchitectureId;
  dataStatus: DataStatus;
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
    energyChargedKwh: number;
    heatGeneratedKwh: number;
    heatRemovedByCoolantKwh: number;
    energyBalanceErrorPercent: number;
  };
  timeSeconds: number[];                 // n samples
  zoneTemperaturesC: number[][];         // [zone][sample]
  coolantTemperaturesC: number[][];      // [segment][sample]
  socPercent: number[];                  // n samples
  zoneIds: string[];
  assumptions: string[];
  warnings: Array<{ code: string; message: string }>;
};

type SohConfig = {
  architecture: ArchitectureId;
  baselineSohPercent: number;
  horizonYears: number;                  // 1–8
  thresholdPercent: number;
  equivalentFullCyclesPerYear: number;
  representativeTemperatureC: number;    // from the thermal result, or entered
  averageSocPercent: number;
};

type SohForecast = {
  dataStatus: "ILLUSTRATIVE" | "MODELLED";
  modelName: string;
  engineVersion: string;
  parameterSetVersion: string;
  points: Array<{ year: number; sohPercent: number;
                  lowerBoundPercent?: number; upperBoundPercent?: number }>;
  thresholdCrossingYear: number | null;
  assumptions: string[];
};

type EngineError = {
  code: "INVALID_INPUT" | "OUT_OF_RANGE" | "NUMERICAL_INSTABILITY" | "INTERNAL";
  field?: string;
  message: string;                       // safe to show to the user
};
```

### 5.1 Worker messages

| Direction | Message | Payload |
|---|---|---|
| app → worker | `Init` | parameter set, pack definitions |
| worker → app | `Ready` | engine version |
| app → worker | `RunThermal` | `SimulationConfig` |
| worker → app | `Progress` | scenario ID, fraction 0–1 |
| worker → app | `ThermalDone` | `ThermalResult` |
| app → worker | `RunSoh` | `SohConfig` |
| worker → app | `SohDone` | `SohForecast` |
| app → worker | `Cancel` | scenario ID |
| worker → app | `Failed` | scenario ID, `EngineError` |

Large numeric arrays cross the boundary as typed arrays transferred without copying.

### 5.2 Pack definition and component metadata

```ts
type PackDefinition = {
  id: ArchitectureId;
  displayName: string;
  description: string;                  // "Generic reference design…"
  cell: { formFactor: "PRISMATIC_BLADE" | "CYLINDRICAL";
          dimensionsMm: number[]; massKg: number;
          nominalCapacityAh: number; nominalVoltageV: number;
          sourceRefs: string[] };
  seriesCount: number;
  parallelCount: number;
  zones: Array<{ id: string; cellCount: number; order: number }>;
  coolantPath: string[];                // zone IDs in flow order
  components: ComponentMeta[];
};

type ComponentMeta = {
  id: string;                           // e.g. "pack.cold_plate"
  name: string;
  category: string;
  func: string;
  material?: string;
  location: string;
  parameters: Array<{ label: string; value: string; unit?: string; sourceRef?: string }>;
  failureModes: Array<{ mode: string; effect: string }>;
  provenance: "GENERIC_EDUCATIONAL" | "SOURCED";
  explode: { stage: number; offsetM: [number, number, number] };
  zoneId?: string;
};
```

---

## 6. Hosting and routing

| Topic | Design |
|---|---|
| Host | GitHub Pages, static files only |
| Build | Vite; output directory `dist` |
| Base path | Set from an environment variable at build time. A project site is served under `/<repository>/`; the real name is supplied in Phase 6 and is not assumed now |
| Routing | Hash-based (`#/simulator/lfp`). Every URL resolves to `index.html`, so no server rewrite and no `404.html` workaround is needed |
| Assets | All paths relative to the base path; fonts self-hosted |
| WebAssembly | Emitted as a static `.wasm` file and loaded by the worker |
| Workflow | Prepared **only in Phase 6**. It will need Node and the Rust toolchain with `wasm-pack`. Python is not part of the deployment build; generated data files are committed |
| Secrets | None. The application has no keys, tokens, or environment secrets |
| Third-party requests | None at runtime: no analytics, no font or script hosts |

Product analytics and remote logging (PRD §13 Observability, §14) are **out of MVP scope** (Gate 0, Q11). Errors are logged to the browser console with scenario ID and engine version; nothing is sent anywhere.

---

## 7. Error handling

| Layer | Failure | Handling |
|---|---|---|
| Input | Out of range, wrong type | Blocked at the field with a specific message; never sent to the engine |
| Engine | Invalid input that passed the UI | `INVALID_INPUT` with the field name |
| Engine | Non-finite values or failed stability check | `NUMERICAL_INSTABILITY`; no partial result is shown as valid |
| Worker | WebAssembly fails to load | Simulation controls disabled with explanation; inspection features keep working |
| Scene | WebGL unavailable or context lost | Static view; one automatic restore attempt on context loss, then a `Retry` control |
| Data | A data file fails schema validation | Caught by the build and by tests, not at runtime |
| App | Unexpected exception in a panel | That panel shows an error state; the rest of the workspace continues |

Rust functions return `Result`; panics are treated as defects. TypeScript uses strict mode; `any` is not used without a documented reason (`constraints.md` §6).

---

## 8. Performance design

### 8.1 Targets — proposed, to be measured in the first Phase 4 milestone

| Metric | Target | Basis |
|---|---|---|
| Frame rate while orbiting, desktop | 60 FPS target, 30 FPS minimum | PRD §13; **reference hardware is not yet defined** |
| Draw calls per frame | ≤ 200 | React Three Fiber guidance: a few hundred is optimal |
| Thermal run, 60 simulated minutes | ≤ 1 s wall time | Estimate for a model with tens of states; unmeasured |
| Landing page before 3D | Usable without waiting for the 3D bundle | 3D code is loaded on demand |
| Interaction during a run | Viewport stays responsive | Engine runs in a worker |

Open point for Phase 3: name the reference device(s) on which these are measured. Without that, no frame-rate statement can be made.

### 8.2 Techniques

- **Instancing** for all cells: one draw call per cell type, colour per instance for the heatmap.
- **Shared geometry and materials**, created once per pack and disposed when the pack is unloaded.
- **On-demand rendering**: frames are drawn only when something changes.
- **Code splitting**: landing page, workspace, and 3D scene are separate chunks; the engine loads when the workspace opens.
- **Quality tiers** chosen from measured frame time, not from device names:

| Tier | Pixel ratio | Shadows | Cell detail |
|---|---|---|---|
| High | up to 2 | Soft contact shadow | Full |
| Medium | 1.5 | Off | Full |
| Low | 1 | Off | Simplified cells (fewer segments) |

- **Fallback**: if WebGL is unavailable, static images of each pack state replace the viewport; simulation, charts, forecast, and ROI still work.

---

## 9. State

| State | Lives in | Persists |
|---|---|---|
| Selected architecture | URL | Yes, by link |
| View mode, explode value, plane position, visibility, selection | Workspace store | No |
| Simulation parameters | Workspace store | Session only |
| Results | Workspace store, keyed by scenario ID | No |
| Cost inputs | Workspace store | Session only |
| Reduce-motion and quality overrides | Local storage | Yes |

A light client-side store (Zustand, as the PRD proposes) holds workspace state. No user data leaves the browser.

---

## 10. Dependencies — proposed core set

| Dependency | Role | Licence |
|---|---|---|
| Vite | Build tool | To verify in Phase 3 |
| React | UI | To verify in Phase 3 |
| three.js | 3D rendering | MIT — verified during research |
| React Three Fiber | React binding for three.js | MIT — verified during research |
| Zustand | Workspace state | To verify in Phase 3 |
| wasm-bindgen / wasm-pack | Rust-to-WebAssembly toolchain | To verify in Phase 3 |
| A chart library | Line charts | To select in Phase 3 |
| A schema validator | Input and data validation | To select in Phase 3 |

Each dependency is checked for licence and maintenance status before it is added (`constraints.md` §10.3). Exact versions are pinned in Phase 3.

---

## 11. Testing approach — outline for Phase 3

| Level | What |
|---|---|
| Rust unit tests | Each equation; energy balance; steady state against a hand calculation |
| Cross-language tests | Rust engine and Python reference model run the shared test vectors and must agree within a stated tolerance |
| TypeScript unit tests | Validation, ROI formulas, unit formatting, state transitions |
| Component tests | Panels in each system state |
| End-to-end tests | Journeys A, B, C in a real browser |
| Accessibility checks | Automated rule scan plus manual keyboard pass |
| Performance measurement | Frame time and run time on the named reference device |

---

## 12. Out of scope for the MVP

Accounts and roles · saved scenarios · PDF/CSV export · telemetry or live data · a backend of any kind · trained ML models · thermal runaway modelling · multi-axis slicing · Bahasa Indonesia translation · product analytics.
