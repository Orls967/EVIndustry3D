# 01 — Implementation Roadmap

**Project:** EV Battery Pack Digital Twin
**Phase:** 3 — Implementation Planning (authorized by Gate 2 on 14 November 2026)
**Date:** 14 November 2026
**Status:** Proposed for **Gate 3** review. **No implementation is authorized until Gate 3 is explicitly approved.**
**Governing documents:** `flow.md` v2.0, `constraints.md` v1.0, `EV_Battery_Pack_Digital_Twin_PRD.md` v1.1, `docs/design/01`–`07`.

---

## 1. Planning Strategy & Ordering Principles

Per `flow.md` Phase 3, this roadmap prioritizes:
1. **A functional end-to-end foundation before advanced features:** build, schema validation, worker wiring, and data flow are proved early before full UI breadth.
2. **Data and equations before UI:** offline Python digitization, parameter provenance, and reference equations are locked into `data/` before Rust or 3D builders consume them.
3. **Early 3D & Wasm risk burn-down:** static `.wasm` bundling in Vite (Risk T6) is verified in `M0`, and 3D instancing/clipping/frame-rate measurement (D8, Risks T3/T5) happens in `M3` before simulation UI is built on top.
4. **Strict Phase 4 milestone gates:** user review stops are placed after data locking (`M1`), visual shell (`M2`), 3D/motion tuning (`M3`), thermal simulation (`M4`), and full feature completion (`M5`).
5. **No scope expansion:** every MVP item maps to `FR-01`–`FR-13` (presets/reset only); all `PRD §4.2` / `04 §12` Post-MVP items remain excluded.

---

## 2. Mapping Between Workflow Phases and PRD §17 Stages

Per `flow.md` §2 note, PRD §17 stages are development milestones **inside Phase 4** of the master workflow:

| Master Phase / Milestone | Maps to PRD §17 Stage | Core Focus | User Review Gate |
|---|---|---|---|
| **M0** — Toolchain, Repo Layout & Build Skeleton | Stage 0 (partial) / Stage 1 prep | Vite + React + TS + Rust/Wasm worker + JSON schema skeleton; static build check | Technical report only |
| **M1** — Offline Python Data & Reference Model | Stage 0 (parameterization) | Digitize `R_dc`, `V_ocv`, `dV_ocv/dT`; lock assumed pack/channel geometry; Python reference solver; `data/` JSONs & test vectors | **Yes — M1 Review** |
| **M2** — Design System, Landing Page & Selection | Stage 1 (visual foundation) | Tokens, self-hosted fonts, hash router, `#/` Landing Page (poster + WebGL fallback), `#/simulator` selection | **Yes — M2 Review** |
| **M3** — 3D Procedural Packs, Inspection & Perf Baseline | Stage 1 (3D) + Stage 2 (3D inspection) | Procedural LFP & NMC builders, C3/C1 motion, inspector, 1-axis slicer, initial FPS measurement (D8), static poster renders | **Yes — M3 Review** |
| **M4** — Rust/Wasm Thermal Engine, Sandbox & Heatmap | Stage 3 (simulation MVP) | `engine/core` + `engine/wasm` in Web Worker, V1–V6 cross-check vs Python, Simulate tab, thermal heatmap & playback | **Yes — M4 Review** |
| **M5** — Comparator, SoH Forecast, ROI & Methodology | Stage 3 (compare) + Stage 4 (lifecycle/ROI) | `#/compare` view, Forecast tab (LFP Schimpe / NMC manual), Decide tab (ROI), `#/methodology` rendered from `data/` | **Yes — M5 Review** |
| **M6** — Phase 5 Validation, A11y, Profiling & RC | Stage 5 (validation & release) | E2E Journeys A–C, axe-core + keyboard audit, final performance profile, validation report, Release Candidate | **Gate 4 (Release Review)** |
| **Phase 6** — GitHub Setup & GitHub Pages Deployment | Post-Stage 5 | Base-path check, GitHub Actions workflow, user-operated `git init`/`commit`/`push`, live verification | User commit/push |

---

## 3. Milestone Exit Summaries & Demonstration Criteria

### M0 — Toolchain, Workspace Foundation & Static Wasm Smoke Check
- **Objective:** Prove that TypeScript (`app/`), Rust→Wasm (`engine/`), Python (`analysis/`), and JSON schemas (`data/schema/`) compile, validate, and produce a working static `dist/` bundle with a Web Worker loading `.wasm` over relative paths.
- **Demonstration criteria:** `npm run build` outputs `dist/` with no external runtime requests; a dummy `Init`/`Ready` worker handshake returns the engine version string in local preview; schema validation script passes on seed JSON skeletons.

### M1 — Offline Python Data Pipeline & Reference Model
- **Objective:** Eliminate all "To digitize" / "Derive in Phase 3" gaps in `05-simulation-and-data-design.md` §3 and produce verified `data/` artifacts.
- **Demonstration criteria:**
  - Deterministic Python scripts in `analysis/` produce `r_dc_lfp.json`, `r_dc_nmc.json`, `ocv_lfp_proxy.json`, `ocv_nmc_proxy.json`, `entropic_lfp_proxy.json`, `entropic_nmc_proxy.json`, `packs/lfp-blade.json`, `packs/nmc-4680.json`, `parameters/register.json`, and `test-vectors/*.json`.
  - Python reference thermal model passes numerical checks `V1–V5` and reproduces published checks `P1–P3` with documented plots/notes.
  - Every assumed dimension (channel width/height, TIM thickness, contact area, pitch) is explicitly marked `Assumed` in `register.json`.

### M2 — Design System, Landing Page & Architecture Selection
- **Objective:** Deliver the `Hybrid Industrial Digital Twin Experience` UI shell, tokens (`02-design-system.md`), and non-3D/fallback-capable entry routes.
- **Demonstration criteria:**
  - `#/` renders all 9 sections (`01` §3.1) at 1440 px, 768 px, and 390 px with zero layout overflow and self-hosted Inter + JetBrains Mono.
  - Landing page is usable with WebGL disabled (shows placeholder poster until M3 renders the real stills) and respects `prefers-reduced-motion`.
  - `#/simulator` shows both generic reference pack cards with sourced cell specs and routes cleanly to `#/simulator/lfp` and `#/simulator/nmc`.

### M3 — 3D Scene Foundation, Procedural Packs & Inspection Modes
- **Objective:** Build the interactive 3D digital twin for LFP (120 blade cells, top cold plate) and NMC (828 cylindrical 4680 cells, side cooling channels) and execute the first real performance measurement (`D8`).
- **Demonstration criteria:**
  - Clicking any mesh or tree row selects the exact same component ID and opens the **Inspect** tab with `GENERIC_EDUCATIONAL` / `SOURCED` badges.
  - **C3** auto-rotate stops immediately on pointer/touch/keyboard input; **C1** exploded slider (0–100%) separates stages deterministically with zero mesh intersections.
  - 1-axis cross-section (`X`) clips without mutating source geometry (filled cut faces, or documented outlined fallback per Risk T3).
  - Frame time, draw calls, and triangle counts are measured on the Gate 3 reference device (`G2-9`) and recorded; real model stills replace M2 placeholders.

### M4 — Rust/Wasm Thermal Engine, Parameter Sandbox & Heatmap
- **Objective:** Connect the Rust lumped thermal network solver to the workspace and heatmap visualization.
- **Demonstration criteria:**
  - Rust `engine/core` and Python `analysis/reference_model` agree within `0.05 °C` (`V6`) across all shared test vectors (`V1–V6` passing).
  - **Simulate** tab validates inputs at field level, shows `> 2C` and non-laminar `Re` warnings, supports Cancel/stale-run protection, and displays `Modelled` + `NOT_VALIDATED` (or `VERIFIED_NUMERICALLY`) badges.
  - 3D thermal heatmap maps zone temperatures (never interpolating inside a zone, neutral grey on non-thermal parts), shows dynamic min–max legend, hotspot outline/list, and `Simulation playback` scrubber.

### M5 — Comparator, SoH Forecast, ROI Calculator & Methodology
- **Objective:** Complete all remaining MVP journeys (Journey B comparison + Journey C decision support) and transparency documentation.
- **Demonstration criteria:**
  - `#/compare` runs scenarios on both LFP and NMC with one shared temperature scale, linked/unlinked cameras, equal-power & equal-C-rate modes, C-rate readouts, and explicit non-equivalence notes.
  - **Forecast** tab computes 1–8 yr SoH (`Illustrative`: Schimpe 2018 for LFP; user-editable fade inputs for NMC) with ±5 °C temperature sensitivity band and table toggle.
  - **Decide** tab computes Repair vs Replace & deferral ROI in TypeScript (IDR default, empty cost defaults, inspectable `Calculation details`, rule-based recommendation).
  - `#/methodology` renders the parameter register directly from `data/parameters/register.json`, plus equations, verification checks, limitations, and dependency licences.

### M6 — Phase 5 Testing, Validation, Accessibility & Release Candidate
- **Objective:** Systematic end-to-end verification before Gate 4.
- **Demonstration criteria:** All unit, cross-language, component, and Playwright E2E tests (Journeys A–C at 390/768/1440 px) pass; `axe-core` reports zero serious/critical violations; manual keyboard & reduced-motion audit passes; static sub-path production build runs offline with zero external network requests.

---

## 4. Phase 4 Execution Cadence & Change Control

- Every milestone ends with the **Milestone Report** required by `flow.md` Phase 4 (objectives, planned vs actual tasks, files changed, exact test commands, observed results, known issues/limitations, AC status, remaining work).
- Work does **not** advance past `M1`, `M2`, `M3`, `M4`, or `M5` without explicit user review approval.
- Any requirement or architecture deviation discovered during implementation is proposed with impact and cost (`constraints.md` §1.3, §2.6) rather than applied silently.

