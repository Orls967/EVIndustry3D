# 07 — Gate 2 Decisions, Acceptance Criteria, Risks & PRD Alignment

**Phase:** 2 · **Date:** 14 November 2026 · **Status:** Presented for Gate 2. **Not yet approved.**

This is the entry point to the Phase 2 design package.

| # | Document | Covers |
|---|---|---|
| 01 | `01-product-ux-specification.md` | Structure, journeys, wireframes, states, responsive, accessibility |
| 02 | `02-design-system.md` | Colour, type, spacing, components, data visualization, 3D treatment |
| 03 | `03-interaction-motion-specification.md` | C3, C1, selection, cross-section, heatmap, reduced motion |
| 04 | `04-technical-architecture.md` | Modules, languages, contracts, hosting, errors, performance |
| 05 | `05-simulation-and-data-design.md` | Reference packs, thermal model, parameters, SoH, ROI, validation |
| 06 | `06-3d-asset-specification.md` | Component hierarchy, geometry, rendering budget |
| 07 | this file | Decisions, acceptance criteria, risks, PRD alignment |

---

## 1. Decisions requiring your approval at Gate 2

| ID | Decision | Recommendation | Where |
|---|---|---|---|
| G2-1 | **Thermal colour scale.** Conventional blue-green-yellow-red, or a scale whose brightness rises steadily | Keep the conventional scale with the listed mitigations. It matches the PRD and the UI/UX spec; its weakness is disclosed | 02 §2.4 |
| G2-2 | **Thermal model simplifications** — *updated 14 Nov 2026.* Reversible heat and a real OCV curve can now be included using measured curves from proxy cells (LFP 26650, NMC 21700), labelled as such. The electrical model stays resistance-only, because no RC parameters are sourced | Include reversible heat and OCV with the proxy-cell label; keep resistance-only. This narrows approved decision D3 | 05 §2.6, §3.1 |
| G2-3 | **SoH coefficients** — *updated 14 Nov 2026.* LFP: Schimpe et al. 2018 coefficients (26650 cell). NMC: no open set found | LFP from Schimpe, `Illustrative`; NMC with user-editable fade inputs and no defaults | 05 §4.5 |
| G2-4 | **Pack configurations.** LFP 120s1p (51.8 kWh, assumed) and NMC 92s9p (70.8 kWh, secondary source); unequal energy; comparator offers equal-power and equal-C-rate modes | Accept | 05 §1 |
| G2-5 | **Coolant inlet temperature** as a fourth, advanced input with a stated default | Accept. The model needs it; the PRD lists three inputs plus optional ones | 05 §2.4 |
| G2-6 | **Routes.** Full PRD route set using hash-based URLs | Accept | 01 §1.2, 04 §6 |
| G2-7 | **Landing page is dark throughout**, although the main visual reference is light below its hero | Accept. It follows the approved "dark foundation" direction | 01 §3, 02 §2 |
| G2-8 | **Typefaces:** Inter and JetBrains Mono, self-hosted, subject to licence verification | Accept | 02 §3 |
| G2-9 | **Reference device for performance.** Which machine(s) define "meets the frame-rate target"? | No recommendation — this is yours to name. Without it, no frame-rate claim can be made | 04 §8.1 |
| G2-10 | **Document alignment.** May Claude apply the limited edits in §4 to the PRD and the UI/UX Design Specification? | Yes, after Gate 2, as the first step of Phase 3 | §4 below |
| G2-11 | **Analytics and logging out of MVP scope** (confirms Gate 0 Q11; closes C-04) | Confirm | 04 §6 |
| G2-12 | **ML stays Post-MVP** (confirms Gate 0 Q8; closes C-05) | Confirm | 05 §4.7 |

---

## 2. Acceptance criteria

The acceptance criteria in PRD §7 (FR-01 to FR-12) and PRD §15 remain in force unchanged. The criteria below are **additions** that follow from this design.

### 2.1 Landing page (FR-01)

- [ ] The page is readable and navigable before any 3D code has loaded.
- [ ] With WebGL disabled, the hero shows the poster and every section renders.
- [ ] With reduced motion requested, nothing on the page moves by itself.
- [ ] No number appears without a citation or a data-status badge.
- [ ] `Launch Simulator` is reachable by keyboard as the first interactive element after the navigation.

### 2.2 Architecture selection (FR-02)

- [ ] Each card states the configuration, the cooling arrangement, and "generic reference design".
- [ ] Switching architecture with results present asks for confirmation and clears the results.

### 2.3 3D viewer (FR-03)

- [ ] Orbit, pan, zoom, four presets, and reset work by pointer, touch, and keyboard.
- [ ] The component tree offers every selection that clicking a mesh offers.
- [ ] The viewport exposes a text description of its current state.
- [ ] An idle scene renders no frames.

### 2.4 Exploded view (FR-04)

- [ ] The slider scrubs forward and backward; the same value always gives the same layout.
- [ ] No two parts intersect at any value from 0 to 100 %.
- [ ] The LFP and NMC sequences follow their own stage tables (03 §3.3, §3.4).
- [ ] The fully exploded pack fits the viewport at each supported breakpoint.

### 2.5 Component inspector (FR-05)

- [ ] Selecting a mesh and selecting its tree row give the same component ID.
- [ ] Every fact is marked generic/educational or sourced.
- [ ] Selecting a cell shows its zone and, when available, its zone temperature.

### 2.6 Cross-section (FR-06)

- [ ] Toggle, position slider, flip, and reset work on one axis.
- [ ] Turning the section off restores the full model exactly.
- [ ] Cut faces are filled, or the documented fallback is shown with its note.

### 2.7 Heatmap (FR-07)

- [ ] The toggle is disabled until a run has completed.
- [ ] The legend shows numeric ticks, the unit, and the scenario's own minimum and maximum.
- [ ] Every zone's temperature is available as a number by hover, selection, and the hotspot list.
- [ ] Parts without a temperature are neutral grey, never a thermal colour.
- [ ] Playback is labelled "Simulation playback".

### 2.8 Parameters and results (FR-08, FR-09)

- [ ] Out-of-range input is rejected at the field and never reaches the engine.
- [ ] A warning appears above 2C for the selected pack.
- [ ] Changing an input after a run marks the visible results as stale.
- [ ] A late result from a superseded run is never displayed.
- [ ] Every result shows data status, validation status, engine version, parameter-set version, and timestamp.
- [ ] The energy-balance error is shown and is within the tolerance set in Phase 3.
- [ ] A cancelled or failed run leaves the previous results intact and marked.

### 2.9 Comparator (FR-10)

- [ ] Both packs use one shared temperature scale.
- [ ] Equal-power and equal-C-rate modes are available, and each pack's C-rate is shown.
- [ ] Differences in configuration are listed; no overall winner is declared.

### 2.10 SoH projection (FR-11)

- [ ] The chart carries the `Illustrative` badge and lists every assumption.
- [ ] No uncertainty band is drawn unless it is labelled as temperature sensitivity.
- [ ] The source and test conditions of the coefficients are shown, or the inputs are user-entered.

### 2.11 ROI (FR-12)

- [ ] No cost field has a default value other than currency.
- [ ] `Calculation details` shows each formula with the numbers substituted.
- [ ] With inputs missing, the recommendation reads "Not enough inputs to compare."
- [ ] The rule that produced the recommendation is displayed.

### 2.12 Engine and data

- [ ] Checks V1–V6 in 05 §6.1 pass.
- [ ] Checks P1–P3 in 05 §6.2 are run and their outcomes reported, whatever they are.
- [ ] Every parameter in the register has a source or an "assumed" label, visible on the methodology page.
- [ ] Every data file validates against its schema.

### 2.13 Accessibility and responsiveness

- [ ] Automated accessibility scan reports no serious or critical issues on each screen.
- [ ] Journeys A, B, and C can be completed with a keyboard only.
- [ ] Journeys A, B, and C can be completed at 390 px, 768 px, and 1440 px widths.
- [ ] All touch targets are at least 44 × 44 CSS px.

### 2.14 Hosting

- [ ] The built site works from a sub-path with no server configuration.
- [ ] The site makes no request to any other host at runtime.
- [ ] No secret exists in the repository or the bundle.

---

## 3. Risk and dependency register

Likelihood and impact are estimates.

### 3.1 Technical risks

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| T1 | Thermal parameters cannot be sourced — *updated 14 Nov 2026:* heat capacity, conductivity, coolant properties, OCV, and entropic coefficients are now sourced; only cell-to-coolant heat transfer remains open | Low | Medium | Read F13 (free textbook) for the laminar duct value; until then an assumed value with a sensitivity sweep and status `Illustrative` |
| T2 | Digitized resistance data is too coarse | Medium | Medium | Document digitization error; cross-check with P1 and P2 |
| T3 | Filled cross-sections are impractical with instanced cells | Medium | Medium | Fallback: outlined section with a note, or cells drawn non-instanced while the section is on |
| T4 | Picking individual instanced cells behaves differently than assumed | Low | Medium | Verify in the first 3D milestone; fallback is zone-level selection |
| T5 | The 828-cell pack misses the frame-rate target on weaker devices | Medium | Medium | Instancing, quality tiers, on-demand rendering; measure early |
| T6 | Rust/WebAssembly toolchain complicates the build and the Phase 6 workflow | Medium | Low | Keep the binding layer thin; pin tool versions; test a production build early in Phase 4 |
| T7 | Rust and Python models drift apart | Medium | Medium | Shared test vectors run in both on every change |
| T8 | Combined exploded + cross-section is visually confusing | Medium | Low | Make the modes exclusive, as PRD FR-06 allows |
| T9 | Proposed motion timings feel wrong | High | Low | Expected; they are tuned on the real model |
| T10 | Omitting reversible heat distorts low-C-rate results | Medium | Medium | Stated as a limitation; source entropic coefficients if possible |

### 3.2 Product and content risks

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| P1 | Users read modelled values as measurements | Medium | **High** | Badges, disclaimers, methodology page, "Simulation playback" label |
| P2 | The packs are taken for real vehicle packs | Medium | Medium | "Generic reference design" on every architecture surface; no vehicle names in the interface |
| P3 | Unequal pack energies make the comparison misleading | Medium | Medium | Two comparison modes; C-rate always shown |
| P4 | SoH coefficients remain unavailable | Medium | Medium | Option B (user-editable inputs) |
| P5 | Scope grows during implementation | Medium | Medium | Out-of-scope list in 04 §12; changes need approval |

### 3.3 Dependencies on you

| Item | Needed by |
|---|---|
| Decisions G2-1 to G2-12 | Gate 2 |
| Reference device(s) for performance | Phase 3 |
| Degradation papers, if option A is chosen | Before the forecast milestone in Phase 4 |
| Review of generic component descriptions by someone with battery knowledge, if available | Phase 5 |
| Repository owner and name | Phase 6 only |

---

## 4. Alignment edits to existing documents

These bring the PRD and the UI/UX Design Specification into line with approved decisions. **None has been applied.** They need your approval (G2-10). Functional requirements and their acceptance criteria are not changed.

### 4.1 PRD

| Section | Change | Reason |
|---|---|---|
| §10.1 | Replace "dark graphite/navy" and "direction to be tested" with the approved Hybrid Industrial Digital Twin direction and graphite/near-black | Closes C-01 |
| §10.2 | Add the cinematic hero with enterprise information hierarchy | UI/UX spec §12 |
| §10.4 | Separate C3 cinematic motion from C1 guided exploded animation | UI/UX spec §12 |
| §11 intro | Replace "decided after proof-of-concept" with a pointer to the approved architecture | D6, D7, D8 |
| §11.1 | State Vite; state hash-based routing | D6 |
| §11.2 | Replace the Blender/GLB pipeline with procedural geometry from parametric data | D9 |
| §11.3 | Replace "Rust if a benchmark proves the need" with: Rust compiled to WebAssembly, chosen for the demonstrator, running in the browser | D7 |
| §11.4 | Replace the FastAPI service with Python used offline for analysis and reference modelling | D7 |
| §11.6 | Point to the contracts in `04-technical-architecture.md` §5 | — |
| §13 | Mark Observability as console-only for the MVP | Q11 |
| §14 | Mark product analytics metrics as not collected in the MVP | Q11 |
| §19 | Record the answers given at Gate 0 and Gate 1 | — |
| §20 | Replace the early reference list with a pointer to the Visual Reference Guide and the research evidence index | UI/UX spec §12 |
| §21 | Remove the statement that the visual direction is not yet chosen | Closes C-07 |
| FR-04 | Note that the component list differs per architecture | D2 |
| Header | Version 1.1; status "Aligned with Gate 2 decisions" | — |

### 4.2 UI/UX Design Specification

| Section | Change | Reason |
|---|---|---|
| §2.1 | Mark colours, typography, spacing, and layout as defined in the Phase 2 design package | Gate 2 |
| §5.2 | Add `pack.cooling_channels` and `pack.zone_*`; note `pack.modules` is not used for these cell-to-pack designs | D2 |
| §5.5 | Replace the GLB and editable-source-file requirements with procedural geometry | D9 |
| §8 | Point to `02-design-system.md` for final tokens | Gate 2 |

### 4.3 Visual Reference Guide

| Section | Change | Reason |
|---|---|---|
| §3 | Mark Reference 01 as removed by its publisher (HTTP 404) and Reference 03's viewer as not rendering, both observed 14 November 2026 | Research evidence |

---

## 5. Conflict register status after this design

| ID | Status |
|---|---|
| C-01 | Resolved by this design; edit pending approval (§4.1) |
| C-02 | Resolved at Gate 1 (D8) |
| C-03 | Resolved: fully client-side static site |
| C-04 | Resolved if G2-11 is confirmed |
| C-05 | Resolved if G2-12 is confirmed |
| C-06 | Resolved at Gate 0 |
| C-07 | Resolved; edit pending approval (§4.1) |
| C-08 | Resolved: wireframes and storyboards delivered in this phase |
| C-09 | Resolved at Gate 1 (D9); edit pending approval (§4.2) |
| C-10 | Resolved at Gate 1 (D2); edit pending approval (§4.1, §4.2) |

---

## 6. Deliverables against `flow.md` Phase 2

| Required deliverable | Where |
|---|---|
| Product and UX specification; user journeys; sitemap | 01 |
| Wireframes, desktop and mobile, landing and workspace | 01 §3, §5, §6 |
| Colour and typography tokens; component inventory | 02 |
| Interaction and motion specification; C3, C1, cross-section storyboards | 03 |
| Technical architecture proposal | 04 |
| Data and simulation design; data flow and interface proposal | 04 §4–5, 05 |
| 3D asset/component specification; asset checklist; naming convention | 06 |
| Feature acceptance criteria | §2 above |
| Technical risks, trade-offs, risk and dependency register | §3 above |
| Updated PRD | Proposed as edits in §4; not applied |

**Not delivered, and why:** a visual (image) treatment board for the 3D model. The treatment is specified in words (02 §8) because no model exists to render and no third-party imagery may be used.

---

## 7. Gate 2 checklist

- [ ] Does the product flow make sense? (01)
- [ ] Do the landing page and simulator structures fit? (01)
- [ ] Do the 3D design and animation match the approved direction? (02 §8, 03, 06)
- [ ] Are the features and their boundaries correct? (§2; 04 §12)
- [ ] Is the technical architecture acceptable, including how it is hosted? (04)
- [ ] Decisions G2-1 to G2-12 answered.
- [ ] **User has explicitly approved the design.**

Phase 3 (implementation planning) does not begin until the last item is checked. Approval of this design does **not** authorize coding; that is Gate 3.
