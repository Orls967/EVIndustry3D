# 02 — Milestone Plan, Prioritized Backlog & Dependencies

**Project:** EV Battery Pack Digital Twin
**Phase:** 3 — Implementation Planning
**Date:** 14 November 2026
**Status:** Proposed for Gate 3 review.

Priority levels: **P0** (blocks downstream milestones or core MVP path), **P1** (required MVP functionality), **P2** (MVP polish, secondary views, hardening).

---

## 1. Prioritized Backlog by Milestone & Layer

### Milestone 0 — Toolchain, Repo Layout & Build Skeleton

| ID | Layer | Task | Pri | Depends on | Est. Effort |
|---|---|---|---|---|---|
| `M0-01` | Tooling | Install/verify `wasm32-unknown-unknown` target & `wasm-pack`; create Python venv with pinned packages | P0 | Gate 3 | S |
| `M0-02` | Frontend | Initialize `app/` (Vite + React + TS strict + ESLint) with `BASE_URL` env support for static sub-path | P0 | `M0-01` | S |
| `M0-03` | Engine | Initialize `engine/` Cargo workspace (`core` pure Rust lib + `wasm` cdylib via `wasm-bindgen`) | P0 | `M0-01` | S |
| `M0-04` | Engine/FE | Wire Web Worker (`engine/worker.ts`) loading `.wasm` and exchanging `Init`/`Ready` typed messages | P0 | `M0-02`, `M0-03` | M |
| `M0-05` | Data | Create `data/schema/` JSON Schemas (`pack`, `parameter-register`, `table`, `test-vector`) + validation script | P0 | `M0-01` | M |
| `M0-06` | Build | Verify `vite build` + `vite preview --base /test-subpath/` serves `.wasm` with zero external requests | P0 | `M0-04` | S |

### Milestone 1 — Offline Python Data Pipeline & Reference Model

| ID | Layer | Task | Pri | Depends on | Est. Effort |
|---|---|---|---|---|---|
| `M1-01` | Analysis | Digitize `R_dc(SOC, T)` from S15 Fig. 8 for LFP blade & NMC 4680; emit `r_dc_*.json` + digitization error report | P0 | `M0-05` | M |
| `M1-02` | Analysis | Digitize `V_ocv(SOC)` & `dV_ocv/dT(SOC)` from F7 Figs. 2–3 (cross-check F8); emit `*_proxy.json` | P0 | `M0-05` | M |
| `M1-03` | Analysis | Implement `F2` (50% EG coolant properties) & `F13` (`Nu_Dh` Table 7.4, eqn. 7.61); define assumed channel & pack geometry | P0 | `M0-05` | M |
| `M1-04` | Data | Generate `data/packs/lfp-blade.json` & `data/packs/nmc-4680.json` (dimensions, 10/12 zones, explode stages/offsets, component metadata) | P0 | `M1-03` | M |
| `M1-05` | Data | Build `data/parameters/register.json` (provenance, units, assumptions, F9 Schimpe 2018 LFP SoH constants) & preset values | P0 | `M1-01`–`M1-04` | M |
| `M1-06` | Analysis | Implement Python reference thermal & LFP SoH model (`analysis/reference_model/`); verify `V1–V5` & `P1–P3`; emit `data/test-vectors/*.json` | P0 | `M1-05` | L |

### Milestone 2 — Design System, Landing Page & Architecture Selection

| ID | Layer | Task | Pri | Depends on | Est. Effort |
|---|---|---|---|---|---|
| `M2-01` | UI/Tokens | Verify Inter & JetBrains Mono `OFL-1.1` LICENSE files & Lucide `ISC` licence; configure CSS tokens (`02-design-system.md`) | P0 | `M0-02` | S |
| `M2-02` | UI/Core | Build accessible base primitives (Button, Tabs, SegmentedControl, Slider+NumericField, DataStatusBadge, Table, Disclosure, FocusRing) | P0 | `M2-01` | M |
| `M2-03` | Routing | Configure hash router (`#/`, `#/simulator`, `#/simulator/lfp`, `#/simulator/nmc`, `#/compare`, `#/methodology`) + page title/focus management | P0 | `M2-02` | S |
| `M2-04` | Landing | Build `#/` Landing Page (9 sections, desktop 12-col & mobile 4-col, static poster fallback, `prefers-reduced-motion`, zero invented metrics) | P1 | `M2-03` | M |
| `M2-05` | Selection | Build `#/simulator` Architecture Selection cards reading `data/packs/*.json` + switch-confirmation modal logic | P1 | `M1-04`, `M2-03` | S |
| `M2-06` | Workspace | Build responsive Workspace Shell (desktop 3-region + bottom strip; tablet drawer; mobile bottom sheet peek/half/full) with empty/placeholder states | P0 | `M2-03` | M |

### Milestone 3 — 3D Scene Foundation, Procedural Packs & Inspection

| ID | Layer | Task | Pri | Depends on | Est. Effort |
|---|---|---|---|---|---|
| `M3-01` | 3D Core | Build R3F Canvas wrapper: on-demand rendering (`frameloop="demand"`), neutral studio lights, WebGL unavailable/context-loss fallback + `Retry` | P0 | `M2-06` | M |
| `M3-02` | 3D Asset | Implement procedural `lfp-blade` builder (120 instanced blade cells, top cold plate with serpentine hint, TIM, busbars, BMS, enclosures, ports) | P0 | `M1-04`, `M3-01` | L |
| `M3-03` | 3D Asset | Implement procedural `nmc-4680` builder (828 instanced 4680 cells, side cooling channels, TIM ribbons, collectors, BMS, enclosures, ports) | P0 | `M1-04`, `M3-01` | L |
| `M3-04` | 3D Motion | Implement C3 auto-rotation (60 s/rev, stop on interaction, landing resume 8 s, pause button) & smooth 600 ms camera transitions + presets (`Iso/Top/Front/Side/Reset`) | P1 | `M3-02` | M |
| `M3-05` | 3D Motion | Implement C1 Exploded View (0–100% scrubber, stage tables per pack, auto camera pull-back, zero intersection, `Reset Assembly`) | P0 | `M3-02`, `M3-03` | M |
| `M3-06` | Inspect | Implement raycast picking (including `instanceId → cellId → zoneId`), 1 px accent outline, Component Tree search/visibility sync, & **Inspect** tab | P0 | `M3-02`, `M3-03` | M |
| `M3-07` | 3D Slicer | Implement 1-axis X-ray cross-section (`X` axis, slider, flip, reset, filled cut faces or Risk T3 outlined fallback) | P1 | `M3-02`, `M3-03` | L |
| `M3-08` | 3D Perf/A11y | Implement keyboard viewport controls (Arrows, `+/-`, `R/E/X/H/Esc`), SR live description, adaptive quality tiers (`High/Med/Low`), measure FPS on `G2-9` device, render model stills | P0 | `M3-04`–`M3-07` | M |

### Milestone 4 — Rust/Wasm Thermal Engine, Sandbox & Heatmap

| ID | Layer | Task | Pri | Depends on | Est. Effort |
|---|---|---|---|---|---|
| `M4-01` | Engine | Implement `engine/core` thermal model: RK4 integration, `V_ocv` + `dV_ocv/dT` reversible heat, `R_dc(SOC, T)` bilinear lookup, `Nu_Dh` + `Re` laminar check, energy balance | P0 | `M1-06` | L |
| `M4-02` | Engine | Expose `RunThermal` / `Cancel` / `Progress` in `engine/wasm`; run cross-language test suite verifying `V1–V6` (≤ 0.05 °C vs Python) | P0 | `M0-04`, `M4-01` | M |
| `M4-03` | Domain/FE | Implement TS input validation, Zustand simulation slice, `scenarioId` stale-result guard, `> 2C` & `Re` warning banners, `stale` flag on input edit | P0 | `M4-02` | M |
| `M4-04` | Simulate UI | Build **Simulate** tab: presets (`Normal`, `Hot ambient`, `Fast charging`, `Reduced cooling`), sliders/fields, Run/Cancel/Retry, summary metrics, time-series chart + table view, hotspot list | P0 | `M2-02`, `M4-03` | L |
| `M4-05` | 3D Heatmap | Implement zone-level thermal heatmap material mapping (5-stop scale, 400 ms cross-fade, neutral grey for non-thermal parts, hottest zone outline), dynamic legend, & bottom `Simulation playback` bar | P0 | `M3-08`, `M4-04` | M |
| `M4-06` | 3D Hero | Enable optional desktop-idle live 3D C3 preview on `#/` Landing Page with rendered poster fallback & immediate pause control | P2 | `M3-08`, `M2-04` | S |

### Milestone 5 — Comparator, SoH Forecast, ROI Calculator & Methodology

| ID | Layer | Task | Pri | Depends on | Est. Effort |
|---|---|---|---|---|---|
| `M5-01` | Engine | Implement `RunSoh` in Rust `engine/core` + `wasm`: Schimpe 2018 LFP (`Illustrative`) + user-fade-rate NMC + ±5 °C sensitivity calculation; verify vs Python | P0 | `M1-06`, `M4-02` | M |
| `M5-02` | Forecast UI | Build **Forecast** tab: inputs, 1–8 yr SoH curve + threshold line + crossing year, temperature sensitivity band, `Illustrative` badge & assumptions, table view | P1 | `M2-02`, `M5-01` | M |
| `M5-03` | Decide UI | Build **Decide** tab: TS deterministic Repair vs Replace & ROI calculator (`domain/roi.ts`), empty cost defaults, IDR + currency switch, `Calculation details` formula substitution, transparent rule output | P1 | `M2-02`, `M5-02` | M |
| `M5-04` | Compare | Build `#/compare` page: equal-power & equal-C-rate modes, dual viewports sharing one temperature scale, camera link toggle, C-rate & configuration difference notes, mobile stacked switcher | P1 | `M4-05` | L |
| `M5-05` | Methodology | Build `#/methodology` page rendering `data/parameters/register.json`, model equations, `V1–V6` / `P1–P3` results, limitations, WCAG canvas note, and open-source licences | P1 | `M1-05`, `M4-02` | M |

### Milestone 6 — Phase 5 Testing, Validation, Accessibility & Release Candidate

| ID | Layer | Task | Pri | Depends on | Est. Effort |
|---|---|---|---|---|---|
| `M6-01` | E2E Tests | Write Playwright E2E suite for Journeys A, B, C across `1440×900`, `768×1024`, and `390×844` viewports + WebGL-disabled & reduced-motion tests | P0 | `M5-01`–`M5-05` | L |
| `M6-02` | A11y | Run `@axe-core/playwright` on all 6 routes + manual keyboard-only & screen-reader live-region verification; fix any serious/critical issues | P0 | `M6-01` | M |
| `M6-03` | Perf/Build | Execute final performance profiling on `G2-9` reference device (FPS, draw calls, solver time, bundle sizes) and static sub-path offline audit | P0 | `M6-01` | M |
| `M6-04` | Phase 5 Docs | Produce Phase 5 Test Report, Defect/Risk List, Performance/A11y Assessment, Validation Report, and Release Candidate readiness summary for **Gate 4** | P0 | `M6-02`, `M6-03` | M |

*(Effort scale: **S** = ≤ 0.5 day, **M** = 0.5–1.5 days, **L** = 1.5–3 days; relative sizing only, not a schedule commitment.)*

---

## 2. Critical Path & Task Dependency Graph

```text
M0-01 (Toolchain) ──► M0-02/03/04 (Vite + Rust/Wasm Worker) ──► M0-06 (Static Sub-path Smoke)
        │                                                                    │
        ▼                                                                    ▼
M0-05 (JSON Schemas) ──► M1-01..03 (Digitize & Cooling) ──► M1-04..06 (Packs, Register, Py Ref + Vectors)
                                   │                                         │
        ┌──────────────────────────┼─────────────────────────────────────────┘
        ▼                          ▼
M2-01..06 (Tokens, Shell, Landing) M4-01..02 (Rust Thermal Core + V6 Cross-check)
        │                                       │
        ▼                                       ▼
M3-01..08 (3D Builders, C1/C3, Slice, FPS) ──► M4-03..05 (Simulate UI, Heatmap, Playback)
                                                │
                                                ├──► M5-01..03 (SoH + Decide ROI)
                                                ├──► M5-04 (Comparator)
                                                └──► M5-05 (Methodology)
                                                        │
                                                        ▼
                                                M6-01..04 (Phase 5 E2E, A11y, Perf, Gate 4 RC)
```

**Critical path:** `M0-01 → M0-05 → M1-01..06 → M4-01..02 → M4-03..05 → M5-01..03 → M6-01..04`.
**Parallelizable stream:** Once `M0-02` and `M1-04` complete, `M2` (UI shell & landing) and `M3` (3D builders) can proceed without waiting for `M4-01` (Rust equations).

