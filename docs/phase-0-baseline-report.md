# Phase 0 — Baseline Report

**Project:** EV Battery Pack Digital Twin
**Date:** 14 November 2026
**Phase:** 0 — Project Understanding & Baseline Audit
**Status:** Presented for Gate 0 (baseline confirmation). **Not yet approved.**
**Governing documents:** `flow.md` v2.0, `constraints.md` v1.0

Evidence labels used here follow `constraints.md` §4.2: **Verified** (observed directly in the project files), **Assumption**, **Recommendation**.

---

## 1. Project understanding

### 1.1 What the product is — Verified (PRD §1)

A responsive web application that lets a user:

1. **Inspect** — explore a 3D EV battery pack: orbit, exploded view, cross-section/X-ray, component inspector.
2. **Simulate** — set charging power, ambient temperature, and coolant flow, run a scenario-based thermal model, and see a heatmap and metrics.
3. **Decide** — view a State of Health projection over 1–8 years and a repair-versus-replace / ROI estimate from editable cost inputs.

Two architectures are compared: **LFP prismatic/blade** and **NMC cylindrical**.

### 1.2 What the product is not — Verified (PRD §2.3)

It is a demonstration, learning, scenario-exploration, and early decision-support tool. It is not a BMS or OEM diagnostic replacement, not a validated high-fidelity CFD solver, not a live twin of a real vehicle, not a safety or legal authority, and it makes no SoH accuracy claim before data and validation exist.

### 1.3 Users — Verified (PRD §3)

| Persona | Main job |
|---|---|
| EV fleet manager / operator | Compare usage scenarios, maintenance cost, and replacement |
| Diagnostic technician / automotive engineer | Inspect components, hotspots, and cooling visually |
| Student / researcher | Explore LFP vs NMC and test scenarios |

The MVP runs without user accounts.

### 1.4 Approved visual direction — Verified (UI/UX spec §2.1)

| Area | Decision |
|---|---|
| Landing page | NVIDIA Omniverse-inspired cinematic (dominant) + Siemens-like enterprise structure |
| 3D model | Precision CAD / Engineering Exploded View |
| Animation | C3 Cinematic 360° for hero/overview; C1 Guided Exploded Assembly for inspection |
| Identity | Hybrid Industrial Digital Twin Experience |

---

## 2. Documentation audit

| File | Status stated in the file | Role | Finding |
|---|---|---|---|
| `EV_Battery_Pack_Digital_Twin_PRD.md` | Draft v1.0, "for validation of product direction" | Requirements | Complete and detailed. Visual sections (§10, §20, §21) predate the approved direction and need the limited alignment listed in UI/UX spec §12. |
| `EV_Battery_Pack_Digital_Twin_UI_UX_Design_Specification.md` | "Direction approved; detailed visual design pending" | Design direction | Direction is approved; tokens, layout, assets, and timing are explicitly pending. |
| `EV_Battery_Pack_Digital_Twin_Visual_Reference_Guide.md` | "Research brief; no implementation authorized" | Research procedure | Defines the evidence procedure. No evidence has been collected yet. |
| `flow.md` | v2.0 | Workflow | Revised 14 November 2026. |
| `constraints.md` | v1.0 | Rulebook | Created 14 November 2026. |

Not present: `README.md`, `CLAUDE.md`, any architecture document, any research output.

**Sources of truth, in their domains:** PRD for requirements; UI/UX spec for visual direction; Visual Reference Guide for research procedure; `flow.md` for process; `constraints.md` for rules; the user for every decision.

---

## 3. Existing implementation assessment — Verified

| Item | State |
|---|---|
| Source code | None |
| 3D assets | None |
| Datasets or parameter files | None |
| Build configuration, dependencies | None |
| Git repository | None (folder is not under version control) |
| GitHub repository | None; to be created manually by the user in Phase 6 |
| Research evidence (`docs/design-research/`) | Does not exist |

The project is a clean start. There is nothing to preserve or migrate.

---

## 4. Scope and feature inventory — Verified (PRD §4, §7)

| ID | Feature | MVP | Note |
|---|---|---|---|
| FR-01 | Landing page | Yes | Must stay informative without WebGL |
| FR-02 | Architecture selection (LFP / NMC) | Yes | — |
| FR-03 | 3D viewer: orbit, zoom, pan, presets, reset | Yes | — |
| FR-04 | Exploded view | Yes | Seven component groups |
| FR-05 | Component inspector | Yes | Must state whether data is educational or actual |
| FR-06 | X-ray / cross-section slicer | Yes — one axis | Multi-axis is Post-MVP |
| FR-07 | Thermal heatmap | Yes | From engine output, labelled |
| FR-08 | Parameter sandbox + presets | Yes | Charging power, ambient temperature, coolant flow |
| FR-09 | Thermal simulation results | Yes | Max, average, spread, hottest component |
| FR-10 | LFP vs NMC comparator | Yes | No universal winner |
| FR-11 | SoH and degradation forecast | Yes — baseline/empirical | Trained ML is Post-MVP |
| FR-12 | ROI and maintenance calculator | Yes | No invented prices; default currency IDR |
| FR-13 | Scenario management | Presets and reset only | Save/duplicate/export is Post-MVP |
| FR-14 | Reporting (PDF/CSV) | No | Post-MVP |

Also Post-MVP: experimental datasets and calibration, BMS/fleet telemetry, multi-user and roles, thermal runaway propagation.

---

## 5. Technical dependencies — Verified as proposals only (PRD §11)

Nothing below is approved. Each is a Phase 1 research question and a Gate 2 decision.

| Layer | PRD proposal |
|---|---|
| Frontend | React + TypeScript (Next.js or Vite) |
| 3D | Three.js / React Three Fiber; GLB/glTF assets |
| State | Zustand or similar |
| Thermal engine | Reduced-order/lumped model; Rust only "if a benchmark proves the need"; WebAssembly or backend |
| Analytics / SoH | Python + FastAPI "can" be used; not required before a dataset exists |
| ROI | Deterministic; may run in the frontend |

---

## 6. Risk and gap analysis

### 6.1 Risks

| # | Risk | Impact | Likelihood | Basis |
|---|---|---|---|---|
| R1 | No separable, legally usable CAD/3D pack models | Blocks exploded view, slicer, both architectures | High | Verified: no assets exist; PRD §16 names this risk |
| R2 | Physical parameters without sources | Thermal results not credible; violates no-invention rules | High | Verified: no parameter data exists |
| R3 | No degradation dataset matching chemistry and form factor | SoH limited to an illustrative baseline | High | Verified: no dataset exists |
| R4 | Architecture incompatible with GitHub Pages | Rework late in the project | Medium | Verified conflict C-03 |
| R5 | Scope growth toward CFD or ML | Schedule and complexity | Medium | PRD §16 |
| R6 | WebGL performance on mobile | Poor experience | Medium | PRD §16; unmeasured |
| R7 | Non-equivalent LFP/NMC comparison | Misleading conclusions | Medium | PRD §16 |
| R8 | Visuals mistaken for real sensor data | User misinterpretation | Medium | PRD §16 |
| R9 | No validation reference for the thermal model | Results stay "Not yet validated" | High | Verified: PRD §18 checklist is open |
| R10 | Folder not under version control | Any overwrite is unrecoverable | Present now | Verified |

Impact and likelihood ratings are **estimates**.

### 6.2 Gaps

- All ten items of the PRD §18 manual preparation checklist are open. Several cannot be completed by a coding agent: choosing reference pack designs, supplying or approving 3D assets, sourcing parameters, and specialist review.
- No performance target hardware is defined ("mid-range desktop" is not specified).
- No supported-viewport list is defined beyond desktop / tablet / mobile.
- No timeline or deadline is stated in any document.

### 6.3 Conflicts

Seven document conflicts, C-01 to C-07, are recorded in `flow.md` §7.1. None has been resolved.

---

## 7. Questions requiring your decisions

### 7.1 Needed now, for Gate 0

These shape what Phase 1 researches.

| # | Question | Recommendation (not a decision) |
|---|---|---|
| Q1 | Is the first release an **academic/portfolio demonstrator** or an **engineering decision-support prototype**? (PRD §19.1) | Demonstrator. It matches the absence of validation data and the PRD's own non-goals. |
| Q2 | Generic reference pack designs, or one specific vehicle's pack? (PRD §19.2) | Generic reference designs built from published literature, explicitly labelled as such. Avoids proprietary-geometry and accuracy claims. |
| Q3 | Do you have CAD/3D assets, or must they be created? (PRD §19.3) | No recommendation — this is a fact only you know. |
| Q4 | Default interface language: English or Bahasa Indonesia? (C-06, PRD §19.7) | English default, per the PRD header. |
| Q5 | Is the understanding in §1 and the scope in §4 correct? | — |

### 7.2 Can wait for Gate 1 or Gate 2, but an early steer saves research effort

| # | Question | Recommendation (not a decision) |
|---|---|---|
| Q6 | **Hosting (C-03).** GitHub Pages is static-only. Should the whole product run client-side, or is a separately hosted backend acceptable? | Fully client-side. It fits Pages and the MVP's reduced-order model and deterministic ROI. Research would then focus on in-browser execution. |
| Q7 | **Spikes before Gate 3 (C-02).** May a small, throwaway proof-of-concept be approved case by case before coding is authorized? | Keep the default of no code before Gate 3. Decide at Gate 1 only if research shows a decision cannot be made on evidence alone. |
| Q8 | **ML scope (C-05).** Keep trained ML as Post-MVP, with an empirical baseline for the MVP? (PRD §19.5) | Yes, as the PRD states. |
| Q9 | **Thermal model (PRD §19.4).** Is a transparent reduced-order model sufficient for the MVP? | Yes, as the PRD recommends; confirmed after Phase 1 research. |
| Q10 | **ROI inputs (PRD §19.6).** Manual cost inputs, or do you have a verified price list? | Manual inputs with empty, labelled defaults. |
| Q11 | **Analytics and logging (C-04).** Are the PRD §14 product metrics in scope for the first release? | Out of scope for the MVP; they need a backend or a third-party service. |

### 7.3 Process confirmations

| # | Question |
|---|---|
| Q12 | `constraints.md` §11.3 treats `git init`, `git remote add`, and `git add` as not pre-authorized — Claude gives you the command. Keep this? |
| Q13 | `constraints.md` §11.3 also bans `Co-authored-by` trailers in commit messages Claude drafts for you. Keep this? |
| Q14 | `flow.md` keeps Gate 0 from the original workflow, in addition to Gates 1–4. Keep it? |

---

## 8. Proposed Phase 1 research questions

For review only. Research starts after Gate 0 is approved. Each follows the template in `flow.md` Phase 1.

| # | Research question | Decision it serves |
|---|---|---|
| RQ1 | What are the publicly documented structure and component layouts of an LFP blade/prismatic pack and an NMC cylindrical pack? | Reference pack designs; 3D component hierarchy |
| RQ2 | Which reduced-order thermal model form is appropriate, and which parameters does it need, with published sources? | Simulation architecture; parameter provenance |
| RQ3 | How is liquid cold-plate cooling represented in reduced-order models, and how does coolant flow enter the model? | Coolant-flow scenario input |
| RQ4 | Which published empirical degradation models and open datasets exist for LFP and NMC, and under what conditions do they apply? | SoH baseline; ML feasibility |
| RQ5 | How can the thermal model be checked without lab data? | Validation approach and honest labelling |
| RQ6 | What do the three primary visual references actually show, on desktop and mobile? | Landing page, 3D treatment, motion design |
| RQ7 | Which frontend and 3D stack fits a static GitHub Pages deployment with instancing, clipping, and fallback needs? | Technology stack |
| RQ8 | Is in-browser execution sufficient for the thermal model, and is Rust/WebAssembly justified over TypeScript? | Engine language and execution location |
| RQ9 | What is a legal, workable route to the 3D assets? | Asset pipeline; R1 |

RQ7 and RQ8 depend on your answer to Q6.

---

## 9. Gate 0 checklist

- [x] Project understanding report presented (§1).
- [x] Conflicts and gaps presented (§6; `flow.md` §7).
- [x] Open questions presented (§7).
- [ ] **User has explicitly confirmed the understanding is correct, or corrected it.**

Phase 1 research does not begin until the last item is checked.
