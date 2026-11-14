# 05 — Test, Validation, Performance & Definition of Done Plan

**Project:** EV Battery Pack Digital Twin
**Phase:** 3 — Implementation Planning
**Date:** 14 November 2026
**Status:** Proposed for Gate 3 review.

---

## 1. Testing Strategy Across Layers

Every check follows `constraints.md` §13: exact commands executed and actual observed outputs (passed / failed / skipped / not executed) are reported at every milestone.

| Layer | Tooling | Scope & Assertions | Run Cadence |
|---|---|---|---|
| **Data & Schemas** | `ajv` / Python `jsonschema` | All files in `data/` validate against `data/schema/*.json`; unit consistency; no missing provenance fields | Every change to `data/` & pre-build |
| **Rust Engine (`engine/core`)** | `cargo test` | RK4 step stability, `V1` energy balance (≤ 1%), `V2` steady state (≤ 0.1 °C), `V3` Δt halving (≤ 0.1 °C), `V4` bit-identical determinism, `V5` monotonicity, `V6` vs `data/test-vectors/`, `F9` Schimpe SoH unit checks, `INVALID_INPUT`/`NUMERICAL_INSTABILITY` error paths | Every `engine/` edit |
| **Python Reference (`analysis/`)** | `pytest` | Reference thermal & SoH solver (`V1–V5`), `P1–P3` published behaviour checks, digitization regression | Every `analysis/` or `data/` edit |
| **TypeScript Domain (`app/src/domain/`)** | `vitest` | Input range/unit validation, `>2C` warnings, `roi.ts` formula & empty-input rules, stale-scenario ID guard, unit formatters | Every `app/` edit |
| **React Components** | `vitest` + Testing Library | Loading, empty, error, unavailable, `stale` states (`01` §8); DataStatusBadge; Slider+NumericField sync; `Calculation details` substitution; Table view toggle | Every UI/feature milestone |
| **Browser E2E** | `@playwright/test` | Journeys A, B, C at `1440×900`, `768×1024`, `390×844`; architecture switch confirmation; WebGL-disabled fallback; `prefers-reduced-motion`; sub-path preview (`--base /subpath/`) | `M6-01` & pre-release |
| **Accessibility** | `@axe-core/playwright` + manual | Zero serious/critical axe rules on all 6 routes; full keyboard-only traversal of Journeys A–C; `44×44` CSS px touch target verification; SR live-region text verification | `M6-02` & component checks |
| **Static & Type Checks** | `tsc --noEmit`, `eslint`, `cargo clippy`, `vite build` | Zero TS errors, zero boundary violations, zero warnings treated as errors, zero external runtime network requests | Every milestone exit |

---

## 2. Scientific & Engineering Validation Plan

Per `05-simulation-and-data-design.md` §6 and `constraints.md` §8:

1. **Numerical Verification (`V1–V6`):** executed automatically in `M1-06`, `M4-02`, and `M6`. Once `V1–V6` pass on the Rust engine, `ThermalResult.validationStatus` transitions from `NOT_VALIDATED` to `VERIFIED_NUMERICALLY` (while `dataStatus` remains `MODELLED`, and UI still displays *"Not experimentally validated"*).
2. **Weak Published-Behaviour Checks (`P1–P3`):** executed in `M1-06` in Python and cross-checked on the Rust engine in `M4-02`:
   - **P1:** Volume-specific heating at 1C, 20 °C sits within S15 Fig. 8 ranges.
   - **P2:** 4680-to-blade heating ratio at 1C is ~2× (S15).
   - **P3:** Uncooled 4680 cell at 2C from 25 °C generates ~15 W and approaches ~70 °C (S1).
3. **Explicit Non-Claims:** The product never claims experimental pack validation, CFD equivalence, safety thresholds, or validity above 2C / outside source SOC & temperature bounds.

---

## 3. Performance Measurement Protocol

Targets from `04-technical-architecture.md` §8.1 (to be measured, **never** assumed):
- **Desktop 3D orbit:** 60 FPS target, 30 FPS minimum on the **Gate 3 reference device (`G2-9`)**.
- **Draw calls:** ≤ 200 per frame (aiming `< 40` LFP / `< 60` NMC assembled per `06` §4).
- **Thermal run (60 simulated min):** ≤ 1.0 s wall time in Web Worker.
- **Idle GPU cost:** 0 frames rendered when scene is static (`frameloop="demand"`).
- **Landing page pre-3D:** Interactive & readable before 3D chunk downloads.

**Measurement cadence:**
- **Baseline (`M3-08`, D8):** Measure assembled + exploded + cross-section frame times (p50, p95 FPS via DevTools / `requestAnimationFrame` delta probe), draw calls (`renderer.info.render.calls`), and triangles on the `G2-9` device.
- **Final (`M6-03`):** Re-measure with thermal heatmap active + playback scrubbing + `#/compare` dual canvas, plus `RunThermal` wall time across presets. Report exact hardware/browser specs alongside results (`constraints.md` §7).

---

## 4. Definition of Ready (DoR) & Definition of Done (DoD)

### 4.1 Global Definition of Ready (before starting any milestone/task)
- Prerequisite milestone(s) and user review gate(s) are explicitly approved.
- Referenced data schemas, equations, or design tokens exist in `docs/design/` or `docs/plan/`.
- Open decisions blocking the milestone (e.g. `G2-9` before `M3-08`) are resolved or have an approved fallback.

### 4.2 Global Definition of Done (applies to every milestone M0–M6)
1. Code compiles cleanly with zero TypeScript errors (`tsc --noEmit`), ESLint boundary checks passing, and `cargo clippy` clean where Rust changed.
2. All unit/integration tests for the milestone's new modules are written and **actually run**, with 100% pass rate and zero skipped/weakened assertions.
3. No invented constants, prices, metrics, or unlabelled assumptions; every physical parameter or UI result carries its required provenance / `DataStatus` badge.
4. No `git commit` or `git push` executed by the agent; Milestone Report (`flow.md` Phase 4 template) delivered to the user.

### 4.3 Milestone-Specific DoD

| Milestone | Specific Exit Criteria |
|---|---|
| **M0** | `vite build` succeeds with `VITE_BASE_PATH=/subpath/`; preview serves `.wasm` worker handshake (`Init` → `Ready`) with zero external network requests; `data/schema/` validator passes on seed files. |
| **M1** | All digitization scripts deterministic and committed with source notes; `data/packs/*.json`, `data/parameters/register.json`, `data/tables/*.json`, and `data/test-vectors/*.json` pass schema checks; Python passes `V1–V5` and reports `P1–P3`; **user approves M1 review**. |
| **M2** | All 6 hash routes resolve; Landing Page renders all 9 sections at `390/768/1440` px without WebGL; self-hosted font `LICENSE` files verified; `prefers-reduced-motion` honoured; **user approves M2 review**. |
| **M3** | Both procedural packs match `06` §2 component IDs; raycast & tree selection 100% synced; C1 exploded stages non-intersecting; 1-axis slicer functional (filled or documented T3 fallback); `D8` FPS & draw calls measured on `G2-9`; model stills rendered; **user approves M3 review**. |
| **M4** | Rust `engine/core` passes `V1–V6` (`≤ 0.05 °C` vs Python); worker cancellation & `scenarioId` stale guard verified; Simulate tab, presets, `>2C`/`Re` warnings, heatmap, legend, hotspot list, & playback bar complete; **user approves M4 review**. |
| **M5** | `#/compare` (dual modes, shared scale, linked/unlinked camera), **Forecast** tab (Schimpe LFP / manual NMC + ±5 °C sensitivity), **Decide** tab (empty defaults, IDR, `Calculation details`), & `#/methodology` (live from `register.json`) complete; **user approves M5 review**. |
| **M6** | Playwright E2E Journeys A–C pass across all 3 viewports + WebGL-off + reduced-motion; `axe-core` reports 0 serious/critical issues; manual keyboard pass verified; Phase 5 Test, Validation, Perf/A11y, & RC reports ready for **Gate 4**. |

