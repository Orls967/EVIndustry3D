# 06 — Manual Preparation Checklist, Implementation Risk Register & Development Readiness Report

**Project:** EV Battery Pack Digital Twin
**Phase:** 3 — Implementation Planning
**Date:** 14 November 2026
**Status:** Proposed for **Gate 3** review.

---

## 1. Ownership Split: Manual Preparation vs Coding Agent (PRD §18)

Maps `EV_Battery_Pack_Digital_Twin_PRD.md` §18 and `docs/design/07` §3.3 into concrete owners and milestone deadlines:

| # | Item (PRD §18 / Design) | Owner | Current Status | Needed By |
|---|---|---|---|---|
| 1 | Choose generic LFP & NMC reference pack designs | User + Agent | **Done** (`D1`, `G2-4`: LFP 120s1p blade, NMC 92s9p 4680) | Closed |
| 2 | CAD / 3D assets | — | **Not needed** (`D9`: procedural geometry built by agent from `data/packs/*.json`) | Closed |
| 3 | Verify component names, layout, and educational descriptions | **User** (review) / Agent (draft) | Drafted in `06` §2; educational copy drafted in `M3` | **M3 Review** |
| 4 | Physical parameters & sources | User + Agent | **Mostly done** (`S1`, `S15`, `F1–F9`, `F13` obtained); assumed channel/pack dims locked in `M1` | **M1 Review** |
| 5 | Boundary conditions & scenario presets | Agent (propose) / **User** (approve) | Ranges in `05` §2.4; exact preset values proposed in `M1-05` | **M1 Review** |
| 6 | Thermal validation reference data | User (if any) | None available; product uses `V1–V6` + weak checks `P1–P3` and stays `NOT_VALIDATED` / `VERIFIED_NUMERICALLY` | Closed unless supplied |
| 7 | Degradation dataset / NMC SoH paper | **User** (optional) | LFP uses **F9** (Schimpe 2018); NMC uses **Option B** (user-editable fade inputs) unless user supplies an open NMC paper (`G2-3`) | **Before M5-01** |
| 8 | Spare-part / service pricing policy | User | **Done** (`Q10`: manual editable inputs, empty defaults, IDR default) | Closed |
| 9 | Engineering / battery specialist review of assumptions | **User** (if available) | Optional external check of `M1` / `M6` assumption list | **M6 / Gate 4** |
| 10 | Product positioning (demonstrator vs operational) | User | **Done** (`Q1`: academic/portfolio demonstrator) | Closed |
| 11 | **Name reference device(s) for performance (`G2-9`)** | **User** | **OPEN** (e.g., laptop CPU/GPU/browser + mobile device) | **Gate 3 (before M3-08)** |
| 12 | GitHub repo creation, `git init` / `add` / `commit` / `push`, repo owner/name/URL | **User** (`Q12`, `flow.md` §4) | Folder is not yet a Git repository; user runs Git commands | **Optional now / Mandatory Phase 6** |

---

## 2. Implementation Risk Register

Carries forward `docs/design/07` §3 (`T1–T10`, `P1–P5`) plus Phase 3–4 execution risks:

| ID | Risk | Likelihood | Impact | Mitigation & Trigger |
|---|---|---|---|---|
| **IR-01** *(T6)* | `wasm-pack` / `wasm32-unknown-unknown` missing locally; Vite static sub-path `.wasm` loading fails in Worker | Medium | High | Install target + `wasm-pack` in `M0-01`; verify `vite build` + `vite preview --base /test-subpath/` in `M0-06` before any physics code |
| **IR-02** *(T2)* | Digitization error in `R_dc` (S15 Fig. 8) or proxy `V_ocv`/`dV/dT` (F7) distorts heat generation | Medium | Medium | Overlay digitized grid onto source plots in `M1-01`/`M1-02`; validate against `P1–P3` (`M1-06`); disclose error & proxy-cell label |
| **IR-03** *(T1)* | Assumed cooling channel dimensions yield non-laminar $Re$ inside normal presets | Low | Medium | Derive channel `a, b, N_ch` in `M1-03` so Normal/Hot/Fast stay $Re < 950$; emit runtime `NON_LAMINAR_COOLANT_F3` / `TRANSITIONAL_OR_TURBULENT_RE` warnings |
| **IR-04** *(T3, T8)* | Filled cross-section cut faces fail on 828 `InstancedMesh` cylindrical cells, or exploded + slice looks confusing | Medium | Medium | Test stencil/cap clipping in `M3-07`; fallback to outlined section + user note (T3) or mutually exclusive modes (T8) |
| **IR-05** *(T4, T5)* | 828 NMC cells + raycast picking miss 30/60 FPS target on reference device (`G2-9`) | Medium | Medium | Single `InstancedMesh` per pack (`draw calls < 60`), `frameloop="demand"`, auto quality tiers (`High/Med/Low`), measure in `M3-08` |
| **IR-06** *(T7)* | Rust `engine/core` drifts from Python `analysis/reference_model` | Medium | High | Shared `data/test-vectors/*.json` verified by both `cargo test` and `pytest` (`V6 ≤ 0.05 °C`) on every engine/data change |
| **IR-07** *(T9)* | C1/C3 animation timings feel sluggish or disorienting | High | Low | Expected (`D10`); tune easing/durations live during `M3 Review` |
| **IR-08** *(new)* | `typescript@7` or Vite `8` plugin incompatibilities with `@react-three/fiber` / ESLint | Medium | Medium | Pin verified compatible toolchain in `M0-02` (fall back to TS `5.x` if ESLint/plugin ecosystem requires it) |
| **IR-09** *(new)* | Folder has no Git version control (`constraints.md` §12.3, R10) | High | High | Recommend user runs `git init` and creates an initial docs checkpoint commit before Phase 4 coding starts |
| **IR-10** *(P1–P5)* | Misinterpretation of `Modelled`/`Illustrative` estimates as real pack/safety facts, or scope creep | Medium | **High** | Persistent badges, methodology page from `register.json`, "Simulation playback" label, strict Post-MVP exclusion list |

---

## 3. Development Readiness Report

### 3.1 Verified Local Environment (checked 14 November 2026)

| Tool | Observed Output | Readiness Status | Action in `M0-01` (after Gate 3) |
|---|---|---|---|
| `node` | `v24.21.0` | Ready | — |
| `npm` | `11.19.0` | Ready | — |
| `rustc` / `cargo` | `1.93.1` (`2026-02-11`) | Ready (native target `aarch64-apple-darwin`) | — |
| Rust Wasm target | `wasm32v1-none` installed; **`wasm32-unknown-unknown` missing** | **Action needed** | `rustup target add wasm32-unknown-unknown` |
| `wasm-pack` | **`not found`** | **Action needed** | Install `wasm-pack` (e.g. `cargo install wasm-pack` or official installer) |
| `python3` | `3.14.3` | Ready (base Python) | Create `.venv` and install `numpy`, `scipy`, `matplotlib`, `jsonschema`, `pytest` |
| `git` | `2.49.0` (`fatal: not a git repository`) | **User action recommended** | Provide `git init` / `git add` command for user (`Q12`) |

### 3.2 Documentation Alignment Status

- `G2-10` alignment edits have been verified present in `EV_Battery_Pack_Digital_Twin_PRD.md` (v1.1), `EV_Battery_Pack_Digital_Twin_UI_UX_Design_Specification.md`, and `EV_Battery_Pack_Digital_Twin_Visual_Reference_Guide.md`.
- `AHTTv600.pdf` (MIT textbook, F13) laminar Nusselt numbers (Table 7.4) and eqn. 7.61 are recorded in `docs/research/phase-1-research-package.md` §14 and `docs/design/05-simulation-and-data-design.md` §3.

### 3.3 Open Items Requiring User Input at Gate 3

1. **`G2-9` — Reference device for performance targets (open since Gate 2):** Please name the desktop (and optional mobile) machine/browser that defines *"meets the 60 FPS target / 30 FPS minimum"* (e.g., *"this MacBook Apple Silicon on Chrome/Safari"* or specific hardware).
2. **`G2-3` confirmation:** Confirm proceeding with **Option B** (user-editable fade inputs, no defaults) for NMC SoH, or supply an open NMC degradation paper before `M5`.
3. **Git initialization recommendation (`Q12`):** Before `M0` creates code files, initializing Git locally protects the documentation baseline against accidental overwrites. (Per `constraints.md` §11.3, exact commands can be provided for you to run.)

---

## 4. Gate 3 Checklist (`flow.md` Phase 3)

- [x] Implementation roadmap presented (`01-implementation-roadmap.md`).
- [x] Sprint/milestone plan, prioritized backlog, and task dependencies presented (`02-milestone-backlog-dependencies.md`).
- [x] Repository layout, module boundaries, worker/data contracts, and verified dependency licences presented (`03-repository-module-contracts.md`).
- [x] Simulation digitization, assumed geometry/channel parameterization, presets, and numerical tolerances plan presented (`04-simulation-data-3d-plan.md`).
- [x] Test, validation, performance protocol, and Definition of Ready/Done presented (`05-test-validation-dod.md`).
- [x] Manual prerequisites, risk register, and development readiness report presented (`06-readiness-risks-manual-checklist.md`).
- [ ] **Open decision `G2-9` (reference device) answered by the user.**
- [ ] **User has explicitly authorized the start of coding (Gate 3 approval).**

**STOP: No application code, `package.json`, `Cargo.toml`, or `data/*.json` will be written until Gate 3 is explicitly approved by the user.**

