# 04 — Simulation, Data & 3D Parameterization Plan

**Project:** EV Battery Pack Digital Twin
**Phase:** 3 — Implementation Planning
**Date:** 14 November 2026
**Status:** Proposed for Gate 3 review. Resolves all "Phase 3" design deferrals in `docs/design/05` and `docs/design/06`.

---

## 1. Purpose

`docs/design/05-simulation-and-data-design.md` §3 and `06-3d-asset-specification.md` §3.2 left specific Phase 3 tasks before coding begins:
1. Define the offline Python digitization & extraction plan for `R_dc`, `V_ocv`, and `dV_ocv/dT`.
2. Specify how assumed design dimensions (pack pitch, channel width/height, TIM thickness, contact areas) are parameterized cleanly in `data/` so `D_h`, `Nu_Dh`, `h_cc`, `R_cc`, `R_zz`, and valid laminar coolant flow ranges (`L/min`) are mathematically consistent.
3. Lock the scenario preset structure (`Normal`, `Hot ambient`, `Fast charging`, `Reduced cooling`) and numerical verification tolerances (`V1–V6`).

Per `constraints.md` §4.1 & §8.2, **no physical property is invented**: sourced values cite their source ID (`S1`, `S15`, `F1–F13`), and engineering design dimensions are explicitly tagged **`Assumed`** in both `data/parameters/register.json` and the `#/methodology` UI.

---

## 2. Offline Python Digitization & Verification Plan (`M1`)

Every generated JSON table in `data/tables/` MUST embed metadata: `sourceRef`, `scriptPath`, `generatedAtIso`, `proxyCellNote` (where applicable), and `estimatedErrorNote`.

| Target File | Source Material | Method (`analysis/digitize/`) | Verification Check |
|---|---|---|---|
| `r_dc_lfp.json` | S15 Fig. 8 (18 s pulse resistance vs SOC & T, LFP blade) | Plot digitization on extracted figure image at grid nodes (SOC 10–90 %, T 0–45 °C); bilinear table | Re-overlay digitized points on source image; run `P1` & `P2` heating checks at 1C, 20 °C |
| `r_dc_nmc.json` | S15 Fig. 8 (18 s pulse resistance vs SOC & T, NMC 4680) | Same grid digitization + bilinear table | Run `P1`, `P2`, and `P3` (uncooled 4680 at 2C from 25 °C → ~15 W, ~70 °C) |
| `ocv_lfp_proxy.json` | F7 Fig. 2 (LFP 26650 proxy cell, 11 points 0–100 % SOC) | Direct extraction/digitization + linear interpolation table | Check OCV bounds (~2.5–3.65 V) & monotonic SOC behaviour; mark **proxy cell** |
| `ocv_nmc_proxy.json` | F7 Fig. 2 (NMC 21700 proxy cell, 11 points 0–100 % SOC) | Same | Check OCV bounds (~3.0–4.2 V); mark **proxy cell** |
| `entropic_lfp_proxy.json` | F7 Fig. 3 (LFP 26650 `dV_ocv/dT` vs SOC) | Digitization at SOC nodes + linear interpolation | Verify range matches F7 (`≈ −0.55 to +0.22 mV/K`); mark **proxy cell** |
| `entropic_nmc_proxy.json` | F7 Fig. 3 (NMC 21700), cross-checked against F8 (18650 NMC) | Digitization + comparison note against F8 | Verify range (`≈ −0.18 to +0.23 mV/K`); document F7 vs F8 delta |
| `coolant_eg50.json` | F2 Figs. 7, 8, 9, 17 (50 wt% ethylene glycol) | Transcribe/fit temperature-dependent or 25 °C baseline (`c_p = 3488 J/(kg·K)`, `k = 0.417 W/(m·K)`, `ρ ≈ 1061 kg/m³`, `μ ≈ 3.27 mPa·s`) | Reproduce F2 water check (`4186 J/(kg·K)`, `0.603 W/(m·K)`) |

---

## 3. Pack Geometry & Cooling Parameterization (`M1-03`, `M1-04`)

### 3.1 Single-Definition Principle

Both `app/src/scene/builders/` and `engine/core` read the same `data/packs/lfp-blade.json` and `data/packs/nmc-4680.json` files (`06` §1). Every geometry parameter carries `"provenance": "SOURCED" | "DERIVED" | "ASSUMED"`.

### 3.2 Structural Dimensions (mm in JSON, m in 3D/Physics)

| Pack | Dimension | Value / Rule | Provenance |
|---|---|---|---|
| **LFP Blade** (`120s1p`) | Cell size | `965 (Z) × 90 (Y) × 14 (X)` mm | **Sourced** (S15 Table 1) |
| **LFP Blade** | Zones | `10` zones × `12` cells along `X` | **Assumed** (design choice) |
| **LFP Blade** | Inter-cell gap / pad | Fixed design value set in `M1-04` (candidate `0.5–1.0 mm`, yielding ~`1.7–1.8 m` stack length matching `06` §3.2) | **Assumed** |
| **LFP Blade** | TIM & top cold plate | TIM slab thickness (candidate `1.5 mm`), aluminum cold plate thickness (candidate `10 mm`) + enclosure wall clearances | **Assumed** |
| **NMC 4680** (`92s9p`) | Cell size | `⌀46 × 80 (Y)` mm | **Sourced** (S15 Table 1; S1) |
| **NMC 4680** | Array & zones | `36` columns (`X`) × `23` rows (`Z`) = `828` cells; `12` zones × (`3 cols × 23 rows = 69 cells`) | **Assumed** (design choice) |
| **NMC 4680** | Cell pitch & cooling gap | Pitch along `X` and `Z` accommodating side cooling ribbons + TIM sleeve (matching `06` §3.2 ~`1.7 m × 1.1 m` envelope) | **Assumed** |

### 3.3 Cell-to-Coolant Heat Transfer (`R_cc`) & Laminar Flow Range

Using **F13** (Lienhard & Lienhard, *A Heat Transfer Textbook* v6.00, Table 7.4 & eqn. 7.61) and **F2** (50 wt% EG at 25 °C):

1. **Channel geometry (`Assumed` design parameters locked in `M1-03`):**
   - Each pack defines `channelWidthMm` (`a`), `channelHeightMm` (`b`), `parallelChannelsCount` (`N_ch`), and `channelWallAndTimResistanceKW` (`R_tim + R_wall` derived from TIM thickness/conductivity and contact area `A_zone`).
   - Preferred aspect ratios follow **F13 Table 7.4** exact tabulated cases (`a = 4b` → `Nu_Dh = 4.439 / 5.331`; `a = 8b` → `Nu_Dh = 5.597 / 6.490`; or parallel plates `7.541 / 8.235`, where lower value = uniform wall temperature and higher = uniform wall heat flux — use uniform wall temperature as conservative baseline, or document choice in `M1-03`).
2. **Equations solved per run:**
   - Hydraulic diameter: $D_h = \frac{2ab}{a + b}$ (F13 eqn. 7.61).
   - Mean coolant velocity: $v = \frac{\dot{V}}{N_{ch} \cdot a \cdot b}$ where $\dot{V}$ is converted from `coolantFlowLpm` ($\text{L/min} \to \text{m}^3/\text{s}$).
   - Reynolds number: $Re = \frac{\rho \cdot v \cdot D_h}{\mu}$.
   - Convective coefficient (fully developed laminar): $h_{cc} = \frac{Nu_{D_h} \cdot k_{\text{coolant}}}{D_h}$.
   - Total zone cell-to-coolant thermal resistance: $R_{cc} = \frac{1}{h_{cc} \cdot A_{\text{contact,zone}}} + R_{\text{TIM,zone}} + R_{\text{wall,zone}}$ (with optional F13 eqn. 7.28 thermal-entry check evaluated in `M1-03` to see whether entry enhancement is material).
   - Coolant segment heat capacity rate: $C_f = \dot{m} \cdot c_p = (\rho \cdot \dot{V}) \cdot c_p$.
3. **Coolant Flow Range & Runtime Warnings:**
   - `M1-03` selects `coolantFlowLpm` min/max (candidate `1.0 – 20.0 L/min`) such that the **Normal**, **Hot ambient**, and **Fast charging** presets keep $Re < 950$ (F3 laminar study range) for both packs, and **Reduced cooling** sits near the lower end (`~1–2 L/min`).
   - At runtime, if $Re \ge 950$ (`< 2300`), the engine attaches `NON_LAMINAR_COOLANT_F3` warning ("Flow exceeds the F3 study's Re < 950 range; laminar Nusselt correlation still used").
   - If $Re \ge 2300$, the engine attaches `TRANSITIONAL_OR_TURBULENT_RE` warning ("Flow enters transitional/turbulent regime; laminar correlation underpredicts heat transfer").

### 3.4 Zone-to-Zone (`R_zz`) & Ambient (`R_amb`) Resistance Derivation

- `R_zz` between adjacent thermal zones is derived in `M1-03` from cell anisotropic conductivities **F1** (`k_⊥ = 0.61 W/(m·K)` ±81% across stack direction; `k_∥ = 21–40.1 W/(m·K)` in-plane) and zone center-to-center geometry + inter-cell gap material assumption. Sensitivity to the ±81% `k_⊥` uncertainty will be reported in the `M1` validation note.
- `R_amb = 1 / (h_amb · A_ext,zone)` uses `h_amb = 5 W/(m²·K)` (**F3**, labelled as one study's assumption) and the exterior enclosure area per zone.

---

## 4. Scenario Presets (`M1-05`)

Exact numeric values are finalized in `M1-05` after `M1-03` locks the laminar `Re` bounds, following these design intents (`05` §8):

| Preset | Charging Power (`kW`) | Ambient Temp (`°C`) | Coolant Flow (`L/min`) | Coolant Inlet (`°C`) | SOC (`%`) | Duration (`min`) |
|---|---|---|---|---|---|---|
| **Normal** | Moderate (~`50 kW`, `< 1C` both packs) | `25` | Nominal laminar ($Re \approx 300\text{–}600$) | `25` | `10 → 80` | `60` |
| **Hot ambient** | Same as Normal (~`50 kW`) | `40` | Nominal laminar | `35` or `25` (state in M1) | `10 → 80` | `60` |
| **Fast charging** | Near `2C` for selected pack (e.g. `100 kW` LFP / `135 kW` NMC, or fixed high `100 kW` — clarify in M1) | `25` | Nominal/high laminar ($Re < 950$) | `25` | `10 → 80` | `45` |
| **Reduced cooling** | Same as Normal (~`50 kW`) | `30` | Low flow (e.g. `1.5 L/min`) | `25` | `10 → 80` | `60` |

---

## 5. Confirmed Numerical Verification Tolerances (`05` §6.1)

| Check | Criterion | Confirmed Phase 3 Tolerance | Enforced Where |
|---|---|---|---|
| **V1** | Energy balance error: $\frac{|E_{\text{gen}} - (\Delta E_{\text{stored}} + E_{\text{coolant}} + E_{\text{amb}})|}{\max(E_{\text{gen}}, 1\,\text{J})} \times 100\%$ | **≤ 1.0 %** | Rust `cargo test` + runtime `ThermalResult.summary` |
| **V2** | Single-zone steady-state temperature vs closed-form analytical calculation | **≤ 0.1 °C** | Rust `cargo test` & Python `pytest` |
| **V3** | Time-step halving (`Δt = 0.5 s` vs `1.0 s`) peak temperature difference | **≤ 0.1 °C** | `M1-06` & `M4-02` verification suite |
| **V4** | Repeatability: identical inputs produce identical outputs | **Bit-identical** (same build) | Rust & Python determinism tests |
| **V5** | Monotonicity: higher coolant flow never raises `T_max`; higher ambient never lowers `T_max` | **Strict monotonic** over valid sweep | `M1-06` & `M4-02` sweep tests |
| **V6** | Rust `engine/core` vs Python `reference_model` on shared `data/test-vectors/` | **≤ 0.05 °C** max zone delta; **≤ 0.05 %** SoH delta | Automated cross-language check in `M4-02` & `M5-01` |

