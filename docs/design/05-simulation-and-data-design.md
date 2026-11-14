# 05 — Simulation & Data Design

**Phase:** 2 · **Date:** 14 November 2026 · **Status:** Proposed, presented for Gate 2. **Not yet approved.**

This document specifies the models, their inputs, and where every number comes from. It follows `constraints.md` §8 (physics) and §9 (quantitative integrity). Source IDs (S1, S4, S5, S15) refer to `docs/research/phase-1-research-package.md`.

**Nothing here has been implemented or run.** No simulation result exists yet.

---

## 1. Reference packs

Both packs are **generic reference designs** (decision D1). They are not replicas of any vehicle pack.

| Property | LFP blade-type | NMC 4680-type | Status |
|---|---|---|---|
| Cell form | Prismatic blade, 965 × 90 × 14 mm | Cylindrical, 46 mm × 80 mm | Sourced — S15 |
| Cell nominal capacity | 135 Ah | 23.125 Ah | Sourced — S15 |
| Cell nominal voltage | 3.2 V | 3.7 V | Sourced — S15 |
| Cell mass | 2.7 kg | 0.355 kg | Sourced — S15 |
| Series × parallel | **120s1p** | **92s9p** | LFP: **assumed**. NMC: from a secondary source, low confidence |
| Cell count | 120 | 828 | Derived |
| Nominal pack voltage | 384 V | 340 V | Derived |
| Nominal pack energy | 51.8 kWh | 70.8 kWh | Derived |
| Cooling | One cold plate on top of the cells | Channels along the side of the cell rows | Sourced, secondary |
| Thermal zones | 10 zones × 12 cells | 12 zones × 69 cells | **Design choice** |

Derived values **[verified arithmetic]**: 120 × 135 Ah × 3.2 V = 51.84 kWh; 828 × 23.125 Ah × 3.7 V = 70.85 kWh.

**The two packs do not have equal energy.** At the same charging power they see different C-rates. The comparator therefore offers two modes — equal power and equal C-rate — and always shows both packs' C-rate (PRD FR-10).

The LFP series count is a free design choice. 120 cells is consistent with the "roughly 100–120 cells" seen in a secondary source, and gives a voltage in the common 400 V class. It is labelled an assumption in the product.

---

## 2. Thermal model

### 2.1 Classification

**Reduced-order model** (`constraints.md` §8.3): a lumped-parameter thermal network with an electrical loss model. It is not CFD and not experimentally validated.

### 2.2 Structure

- The pack is divided into **zones**. Each zone is one thermal mass with one temperature.
- Each zone exchanges heat with: the coolant segment that passes it, its neighbouring zones, and the surroundings through the enclosure.
- Coolant enters at the inlet, passes the zones in order, and warms as it goes.

```text
 ambient ──R_amb──┐        ┐        ┐
                  │        │        │
 zone 1 ──R_zz── zone 2 ──R_zz── zone 3 ── …
   │               │               │
  R_cc            R_cc            R_cc      (depends on coolant flow)
   │               │               │
 inlet → coolant 1 → coolant 2 → coolant 3 → … → outlet
```

### 2.3 Governing equations

**Electrical — current from charging power**

```text
I_pack = P_charge / V_pack                     (A)
I_cell = I_pack / N_parallel                   (A)
dSOC/dt = I_cell / (Q_cell · 3600)             (1/s), Q_cell in Ah
```

**Heat generation per cell — irreversible only**

```text
q_cell = I_cell² · R_dc(SOC, T)                (W)
Q_zone = n_cells_in_zone · q_cell              (W)
```

**Zone energy balance**

```text
C_zone · dT_z/dt = Q_zone
                 − (T_z − T_cool,z) / R_cc(flow)
                 − Σ_neighbours (T_z − T_n) / R_zz
                 − (T_z − T_amb) / R_amb
```

**Coolant, segment by segment** (form used in S4)

```text
T_cool,k = T_cool,k−1 + (T_z − T_cool,k−1) / (R_cc · C_f)
C_f = ṁ · c_p                                  (W/K)
```

**Flow dependence of the cell-to-coolant path** (form used in S4)

```text
1 / (R_cc · A) = a · flow^b + c
```

### 2.4 Inputs

| Input | Unit | Proposed range | Default | Notes |
|---|---|---|---|---|
| Charging power | kW | 10 – 150 | 50 | Warning above 2C for the selected pack: beyond the range of source data |
| Ambient temperature | °C | −10 – 45 | 25 | Range matches the test range reported in S4 |
| Coolant flow | L/min | To be set with the cooling parameters | — | Range depends on the correlation chosen in Phase 3 |
| Coolant inlet temperature | °C | — | **Assumption to be stated** | Advanced input; needed by the model but not in the PRD's three inputs |
| Initial SOC | % | 0 – 95 | 10 | PRD FR-08 optional input |
| Target SOC | % | 5 – 100 | 80 | Run ends here |
| Maximum duration | min | 1 – 180 | 60 | Run ends here if the target is not reached |

2C corresponds to about 104 kW for the LFP pack and 142 kW for the NMC pack **[verified arithmetic]**.

### 2.5 Boundary and initial conditions

- Ambient temperature is constant during a run.
- Coolant inlet temperature and flow are constant during a run.
- All zones start at the initial pack temperature (default: ambient).
- No solar load, no cabin interaction, no heat from the charger or power electronics.

### 2.6 Simplifications — each is shown to the user

| # | Simplification | Consequence |
|---|---|---|
| 1 | **Constant charging power until the target SOC.** No constant-voltage taper | Overstates current, and so heat, near the end of charge |
| 2 | **Pack voltage taken as nominal** when converting power to current, until an open-circuit-voltage curve is sourced | Current error of the order of the voltage swing over SOC |
| 3 | **Resistance-only electrical model.** The approved direction (D3) is a first-order equivalent circuit, but no RC parameters have been sourced. The 18-second pulse resistance from S15 is used as one effective resistance | Transient voltage behaviour is not modelled. Heat is approximated by I²R |
| 4 | **Reversible (entropic) heat is omitted** — no entropic coefficients have been sourced | S4 reports that reversible heat can be a substantial fraction of irreversible heat at or below 1C. Results at low C-rates are less reliable |
| 5 | **One temperature per zone**; all cells in a zone share it | No core-to-surface gradient; no cell-to-cell variation inside a zone |
| 6 | **Resistance read from a published figure** | Approximate; digitization error |
| 7 | **No ageing feedback**: resistance does not grow with SoH during a run | Aged packs would run hotter than shown |

Simplifications 3 and 4 are **departures from the ideal form of D3**, forced by missing data. They are flagged for your decision at Gate 2 (`07-acceptance-risks-prd-alignment.md` §1, G2-2).

### 2.7 Numerical method

- Fixed-step fourth-order Runge–Kutta for the zone temperatures; coolant temperatures solved algebraically each step.
- Proposed time step 1 s; stored output every 10 s.
- The engine checks the step against the fastest thermal time constant and refuses to run with an unstable step.
- The run is rejected with `NUMERICAL_INSTABILITY` if any value is non-finite.

### 2.8 Outputs

Maximum, average, and spread of zone temperature; hottest zone; time series per zone and per coolant segment; SOC over time; peak C-rate; energy charged; heat generated; heat removed by coolant; energy-balance error.

**Cooling condition indicator** (PRD FR-09): the fraction of generated heat removed by the coolant at the end of the run, with the outlet-minus-inlet temperature. It is a descriptive number, not a pass/fail judgement.

**Reference temperature limit** (PRD §4.1 item 11): the product shows results relative to a limit only if a limit with a source is available for that cell. Otherwise the limit field is a user-entered reference labelled "user-defined". No universal safety threshold is invented (`constraints.md` §4.1).

### 2.9 Data status of thermal results

`Modelled` + validation status `NOT_VALIDATED`, moving to `VERIFIED_NUMERICALLY` after the checks in §6 pass. It never becomes `Measured`.

---

## 3. Parameter register

Status values: **Sourced** (value available from a source that was read) · **To digitize** (source read; values must be extracted from a figure) · **To source** (no value yet; must be found in Phase 3) · **Assumed** (design choice, labelled) · **Derived**.

*Register updated 14 November 2026 with sources F1–F9 (`docs/research/phase-1-research-package.md` §13–§14).*

| Parameter | Symbol | Unit | Value | Status | Source |
|---|---|---|---|---|---|
| Cell capacity | Q_cell | Ah | LFP 135 · NMC 23.125 | Sourced | S15 Table 1 |
| Cell nominal voltage | V_nom | V | LFP 3.2 · NMC 3.7 | Sourced | S15 Table 1 |
| Cell mass | m_cell | kg | LFP 2.7 · NMC 0.355 | Sourced | S15 Table 1; S1 |
| Cell dimensions | — | mm | LFP 965 × 90 × 14 · NMC ⌀46 × 80 | Sourced | S15 Table 1 |
| DC resistance vs SOC and T | R_dc | mΩ | LFP ≈ 0.7–1.5 · NMC ≈ 5–11 | To digitize (Python) | S15 Figure 8 |
| Open-circuit voltage vs SOC | V_ocv | V | 11-point curves, 0–100 % SOC | To digitize (Python) — **proxy cells** | F7 Figure 2: LFP 26650 and NMC 21700, not blade or 4680 |
| Entropic coefficient vs SOC | dV_ocv/dT | mV/K | LFP ≈ −0.55 to +0.22 · NMC ≈ −0.18 to +0.23 | To digitize (Python) — **proxy cells** | F7 Figure 3; F8 as NMC cross-check |
| Cell specific heat capacity | c_cell | J/(kg·K) | LFP prismatic **1041** · NMC cylindrical **912** | Sourced — format medians | F1: medians of 52 full-cell measurements by format. LFP prismatic entries 1048–1174; one LFP prismatic cell measured 1087 (F5) |
| Temperature dependence of c_cell | — | %/K | +0.2 | Sourced | F1 |
| Through-plane conductivity | k_⊥ | W/(m·K) | 0.61 (range 0.15–1.4) | Sourced — median, ±81 % uncertainty | F1 |
| In-plane conductivity | k_∥ | W/(m·K) | 21–40.1 | Sourced — range | F1 |
| Zone thermal mass | C_zone | J/K | LFP 33,728 · NMC 22,339 | Derived **[verified arithmetic]** | n × m_cell × c_cell |
| Zone-to-zone resistance | R_zz | K/W | — | Derive in Phase 3 | From k_⊥ / k_∥ and geometry |
| Zone-to-ambient coefficient | h_amb | W/(m²·K) | 5 | Sourced — one study's assumption | F3 |
| Single-cell still-air coefficient (check P3 only) | h_P3 | W/(m²·K) | 12 | Derived | F13 eqn. 8.13a (natural convection, 4.7–6.6) + eqn. 2.31 (radiation, ε = 0.9 assumed, 5.7–6.7) for ΔT = 10–45 K → 10.3–13.3 |
| Coolant (50 wt % ethylene glycol, 25 °C) | c_p · k · ρ · μ | — | 3488 J/(kg·K) · 0.417 W/(m·K) · ≈1061 kg/m³ · ≈3.27 mPa·s | Sourced correlations, computed | F2 Figures 7, 8, 9, 17; water check reproduces 4186 J/(kg·K) and 0.603 W/(m·K) |
| Coolant flow regime | Re | — | Laminar, Re < 950 at 0.05–0.2 m/s | Sourced — for one cold-plate design | F3 |
| Cell-to-coolant heat transfer | Nu_Dh → h_cc | — | Laminar, fully developed, based on hydraulic diameter: circular 3.657 / 4.364; rectangular a = 4b 4.439 / 5.331; a = 8b 5.597 / 6.490; parallel plates 7.541 / 8.235 (fixed wall temperature / fixed wall flux). h_cc = Nu · k_coolant / D_h; D_h = 2ab/(a + b) | Sourced | F13: Lienhard & Lienhard, *A Heat Transfer Textbook* v6.00, Table 7.4 and eqn. 7.61. Channel dimensions are assumed design values. Thermal-entry correlations (eqn. 7.28) are available if the entry length matters |
| Contact area per zone | A | m² | — | Derived | From the 3D geometry |
| Coolant inlet temperature default | — | °C | 25 | Assumed | Matches F3's test condition; stated in the interface |
| Series and parallel counts | — | — | §1 | Assumed / secondary | §1 |
| Number of zones | — | — | 10 / 12 | Assumed | Design choice |

### 3.1 What changed and what is still open

- **Heat capacity, conductivity, and coolant properties are now sourced.** Risk T1 is mostly closed.
- **Simplification 4 (no reversible heat) can be removed** using F7's entropic coefficients, with a visible "proxy cell" note. This partly resolves G2-2.
- **Simplification 2 (nominal voltage)** can be removed with F7's OCV curves, with the same note.
- **Cell-to-coolant heat transfer is now sourced** from F13 (received and read 14 November 2026). In laminar fully developed flow the Nusselt number is constant, so coolant flow acts mainly through the coolant's heat capacity rate. The model must therefore check the Reynolds number each run and warn when it leaves the laminar range.
- **Remaining assumptions are design dimensions only:** channel width and height, interface-layer thickness, contact areas. They are listed in the register as assumed and shown on the methodology page.
- Thermal results can therefore be `Modelled` + "Not yet validated", as approved in D4.

Each register entry stores: value, unit, source reference, measurement conditions or assumption, applicability, confidence note, last-reviewed date (PRD §12.2).

---

## 4. State-of-health projection

### 4.1 Classification

**Illustrative** (decision D5). A semi-empirical form with coefficients that are not validated for these cells.

### 4.2 Form — from S5

```text
Cycle loss    L_cyc = B · exp( −(E_a + λ·C_rate) / (R·T) ) · H^z · (DOD / DOD_ref)^α
Calendar loss L_cal = k · θ_T(T) · θ_V(SOC) · t^n
SoH(t)        = SoH_0 − L_cyc − L_cal            (loss in percentage points)
```

`H` is charge throughput, `T` absolute temperature, `t` time. Cycle and calendar losses are treated as independent and additive, as in S5.

### 4.3 Link to the thermal simulation

The representative temperature used in the Arrhenius terms comes from the thermal result (time-averaged cell temperature during charging) combined with a user-stated resting temperature and the share of time spent charging. The user can override it.

### 4.4 Inputs

Starting SoH · equivalent full cycles per year · average C-rate · depth of discharge · average SOC at rest · representative temperature · horizon (1–8 years) · end-of-life threshold (default 80 %, editable).

### 4.5 Coefficients — the open problem

*Updated 14 November 2026.* **LFP: sourced.** Schimpe et al. 2018 (F9, CC BY), Table IV, fitted on a Sony US26650FTC1 LFP/graphite cell (3 Ah):

| Parameter | Value |
|---|---|
| k_Cal,Ref | 3.69 × 10⁻⁴ h⁻⁰·⁵ (25 °C, SOC 50 %) |
| k_Cyc,HighT,Ref | 1.46 × 10⁻⁴ Ah⁻⁰·⁵ (25 °C, 1C) |
| k_Cyc,LowT,Ref | 4.01 × 10⁻⁴ Ah⁻⁰·⁵ (25 °C, 1C charge) |
| k_Cyc,LowT,HighSOC,Ref | 2.03 × 10⁻⁶ Ah⁻¹ (25 °C, 1C charge) |
| E_a,Cal · E_a,Cyc,HighT · E_a,Cyc,LowT · E_a,Cyc,LowT,HighSOC | 2.06 × 10⁴ · 3.27 × 10⁴ · 5.55 × 10⁴ · 2.33 × 10⁵ J/mol |
| α · β_LowT · β_LowT,HighSOC | 0.384 · 2.64 h · 7.84 h |
| T_Ref · I_Ch,Ref · U_a,Ref · k₀ | 298.15 K · 3 A · 0.123 V · 0.142 |

Schimpe's model form (calendar loss with the square root of time; separate high- and low-temperature cycle terms) replaces the generic form in §4.2 for LFP. The source cell is a small cylindrical cell, so the projection remains `Illustrative` and states "coefficients from a 3 Ah 26650 LFP cell".

**NMC: no open coefficient set found.** NMC uses option B: user-editable fade inputs with no defaults.

The original paywalled papers (Wang 2011, Schmalstieg 2014, Naumann 2018) are no longer needed for the LFP case.

| Option | What happens | Honesty |
|---|---|---|
| **A. You supply the papers** | Coefficients are taken from them, with their test conditions shown. Python reproduces a published curve as a check | Best available. Still `Illustrative`: the cells tested are small cells, not blade or 4680 |
| **B. No papers** | The feature ships with the form and **user-editable** fade-rate inputs that have no defaults | Fully honest, less convenient |
| **C. Drop the forecast from the MVP** | Forecast and the SoH-dependent part of the decision tab are deferred | Removes a PRD MVP item |

**Recommendation:** A, with B as the fallback. This is decision G2-3.

### 4.6 Uncertainty

The model gives no statistical uncertainty. The chart states "No uncertainty estimate available" and offers a sensitivity view: the curve recomputed at ±5 °C representative temperature, drawn as a band and labelled "temperature sensitivity, not a confidence interval".

### 4.7 Machine learning

Not in the MVP (Gate 0 Q8, PRD §4.2). The design leaves room for it: `SohForecast.modelName` identifies the method, and `analysis/` is where a future trained model would be developed and evaluated under `constraints.md` §9.

---

## 5. Repair-versus-replace and ROI

### 5.1 Classification

Deterministic arithmetic on user inputs. Runs in TypeScript. Every formula is displayed.

### 5.2 Inputs — all editable, no invented defaults

| Input | Unit | Default |
|---|---|---|
| Currency | — | IDR |
| Inspection / service cost | currency | empty |
| Module (or cell group) replacement cost | currency | empty |
| Number of modules to replace | count | 1 |
| Pack replacement cost | currency | empty |
| Downtime cost per day | currency/day | empty (optional) |
| Downtime for repair | days | empty |
| Downtime for replacement | days | empty |
| Analysis horizon | years | from the forecast |
| Cost increase if the action is deferred | % per year | empty (user assumption) |
| Deferral period | years | 1 |

### 5.3 Formulas

```text
RepairCost   = Inspection + Modules × ModuleCost + RepairDays × DowntimePerDay
ReplaceCost  = PackCost + ReplaceDays × DowntimePerDay
DeferredCost = RepairCost × (1 + DeferralRate)^DeferralYears
Saving       = ReplaceCost − RepairCost
SavingNow    = DeferredCost − RepairCost
```

Payback is shown only when the user also enters an annual benefit of acting; otherwise the field reads "Not enough inputs".

### 5.4 Recommendation rule — shown in full to the user

1. If required inputs are missing → "Not enough inputs to compare."
2. If projected SoH at the end of the horizon is below the threshold **and** repair does not address pack-wide ageing → "Replacement is the lower-risk estimate; a repair may not last the horizon."
3. Else if `RepairCost < ReplaceCost` → "Repair is the lower-cost estimate by <Saving>."
4. Else → "Replacement is the lower-cost estimate by <−Saving>."

Each output states: "Decision estimate from your inputs. Not a safety or service instruction."

---

## 6. Verification and validation

No experimental data exists for these packs. The plan separates what can be established from what cannot.

### 6.1 Numerical verification — proves the code solves the equations

| # | Check | Acceptance |
|---|---|---|
| V1 | Energy balance: generated = stored + removed | Error ≤ 1 % |
| V2 | Steady state of a single zone matches the hand calculation | Within 0.1 °C |
| V3 | Halving the time step changes peak temperature negligibly | ≤ 0.1 °C |
| V4 | Same inputs give identical outputs | Bit-identical within one build |
| V5 | More coolant flow never raises peak temperature; higher ambient never lowers it | Holds across a parameter sweep |
| V6 | Rust engine agrees with the independent Python reference model on shared test vectors | Within 0.05 °C |

Tolerances are proposals to be confirmed in Phase 3.

### 6.2 Comparison with published behaviour — weak validation

| # | Check | Source |
|---|---|---|
| P1 | Volume-specific heating at 1C and 20 °C falls in the ranges read from S15 Figure 8 | S15 |
| P2 | The 4680-to-blade heating ratio at 1C is about 2 | S15 |
| P3 | An uncooled 4680 cell at 2C from 25 °C produces heat of the order of 15 W and approaches about 70 °C | S1 |

P1 and P2 mainly confirm the resistance data was digitized correctly. P3 is the only independent thermal check, and it also depends on the unsourced heat capacity.

### 6.3 What will not be claimed

- Accuracy in degrees for any real pack.
- Validity above 2C, or outside the temperature and SOC range of the source data.
- Anything about safety margins or thermal runaway.

---

## 7. The Python workstream

| Task | Output | Needed for |
|---|---|---|
| Digitize resistance surfaces from S15 Figure 8 | `data/tables/r_dc_*.json` with digitization notes | Heat generation |
| Check whether S1's open measurement data provides an OCV curve | `data/tables/ocv_nmc.json` if available | Removing simplification 2 for NMC |
| Reference implementation of §2 | `analysis/reference_model/` | Check V6 |
| Generate shared test vectors | `data/test-vectors/*.json` | V6, regression tests |
| Reproduce checks P1–P3 | Validation report with plots | Methodology page |
| Fit or transcribe degradation coefficients (option A) | `data/parameters/degradation_*.json` | SoH projection |

Rules: scripts are deterministic and committed with their inputs; every generated file names the script and source that produced it; digitized values are marked approximate.

---

## 8. Component and scenario content

- **Presets** (PRD §4.1 item 10) set all inputs:

| Preset | Intent | Values |
|---|---|---|
| Normal | Moderate power, mild ambient, nominal flow | Set in Phase 3 once ranges are fixed |
| Hot ambient | Same power, high ambient | 〃 |
| Fast charging | High power near 2C | 〃 |
| Reduced cooling | Normal power, low flow | 〃 |

Preset values are chosen after the cooling parameters are sourced, so they sit inside the model's valid range.

- **Component descriptions** (function, failure modes) are generic educational text written for this project and labelled `GENERIC_EDUCATIONAL`. Facts with a citation are labelled `SOURCED`.
