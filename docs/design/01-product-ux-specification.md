# 01 — Product & UX Specification

**Project:** EV Battery Pack Digital Twin
**Phase:** 2 — Product, UX & Technical Design
**Date:** 14 November 2026
**Status:** Proposed design, presented for Gate 2. **Not yet approved.**

Everything here is a **proposal** unless marked as an existing requirement (PRD) or an approved decision (`flow.md` §0). Wireframes are low-fidelity layout diagrams; they are not implementation.

Related: `02-design-system.md`, `03-interaction-motion-specification.md`, `04-technical-architecture.md`, `05-simulation-and-data-design.md`, `06-3d-asset-specification.md`, `07-acceptance-risks-prd-alignment.md`.

---

## 1. Product structure

### 1.1 What the user can do

| Capability | Meaning | PRD |
|---|---|---|
| **Inspect** | Orbit, explode, slice, and select parts of a generic battery pack | FR-03 – FR-06 |
| **Simulate** | Set charging power, ambient temperature, coolant flow; run a thermal model; read heatmap and metrics | FR-07 – FR-09 |
| **Compare** | Run the same scenario on both architectures | FR-10 |
| **Decide** | See an illustrative SoH projection and a repair-versus-replace estimate | FR-11, FR-12 |

### 1.2 Sitemap

The product is a static single-page application. Routes use the URL hash so that every link works on GitHub Pages without server configuration (see `04-technical-architecture.md` §6).

| Route | Screen | Purpose |
|---|---|---|
| `#/` | Landing | Explain the product; lead to the simulator |
| `#/simulator` | Architecture selection | Choose LFP blade-type or NMC 4680-type |
| `#/simulator/lfp` | Workspace, LFP | Inspect, simulate, forecast, decide |
| `#/simulator/nmc` | Workspace, NMC | Same, for the NMC pack |
| `#/compare` | Comparator | Same scenario on both packs, side by side |
| `#/methodology` | Methodology | Model, parameters and sources, assumptions, limitations |

This keeps the full PRD §9 route set. PRD §9 also permits collapsing to a landing page plus one workspace; that remains a fallback if scope must shrink.

### 1.3 Global elements

- **Top bar** on every screen: product name, primary navigation, `Launch Simulator`.
- **Data-status badge** next to every result: `Illustrative`, `Modelled`, or `Measured` (`02-design-system.md` §6.3).
- **Model disclaimer** reachable from every result: "Estimate from a simplified model. Not a diagnosis, certification, or OEM procedure."
- **Language:** English by default (Gate 0, Q4). Strings are kept in one resource file so Bahasa Indonesia can be added later; the translation itself is not in MVP scope.

---

## 2. User journeys

These are PRD §8 Journeys A–C, mapped to screens.

### Journey A — Explore anatomy
1. Landing → `Launch Simulator`.
2. Architecture selection → choose a pack.
3. Workspace opens in **Inspect** mode, assembled, slow rotation (C3).
4. User orbits and zooms; rotation stops on first interaction.
5. User turns on **Exploded view**; parts separate in stages (C1).
6. User selects a part in the 3D view or in the component tree; the inspector opens.
7. User presses **Reset assembly**.

### Journey B — Thermal simulation
1. Workspace → **Simulate** tab.
2. User picks a preset or edits the three parameters.
3. User presses **Run simulation**; status goes idle → running → completed.
4. Heatmap turns on; metrics and the time chart fill.
5. User opens the hotspot list and selects the hottest zone; the camera focuses on it.
6. User turns on **Cross-section** to look inside at that zone.
7. User opens **Compare** to see the other architecture under the same scenario.

### Journey C — Service decision
1. With a completed simulation, user opens the **Forecast** tab.
2. User reads the SoH curve, its assumptions, and the `Illustrative` badge.
3. User opens the **Decide** tab and enters cost inputs.
4. User reads repair-versus-replace and opens **Calculation details**.

---

## 3. Landing page

### 3.1 Section order

Follows UI/UX spec §4.2 and the patterns adopted in `docs/design-research/notes/landing-page-analysis.md`.

| # | Section | Content | Notes |
|---|---|---|---|
| 1 | Top bar | Product name · Overview · Technology · Architectures · Methodology · `Launch Simulator` | Sticky |
| 2 | Hero | Category label, headline, one sentence, primary and secondary call to action, pack visual | Poster first; live 3D on demand |
| 3 | Capability strip | Inspect · Simulate · Decide | Three items, one line each |
| 4 | How it works | Select architecture → Inspect → Run simulation → Evaluate lifecycle | Four steps |
| 5 | Architectures | LFP blade-type and NMC 4680-type cards with sourced cell facts | "Comparison depends on the modelled configuration" |
| 6 | Engineering visualization | Exploded view · Cross-section · Thermal heatmap | Stills from the product's own model |
| 7 | Decision support | SoH projection · Repair versus replace · ROI | Marked as estimates |
| 8 | Methodology and trust | What is modelled, what is assumed, what it is not | Links to `#/methodology` |
| 9 | Closing call to action and footer | `Launch Simulator`; disclaimer; sources link | |

**No numeric proof points.** The project has no real performance metrics and must not invent any (`constraints.md` §4.1). Section 5 shows only cell facts that carry a citation.

### 3.2 Hero copy — proposed

- **Label:** `EV BATTERY PACK DIGITAL TWIN`
- **Headline:** `See inside the pack. Test the heat. Weigh the decision.`
- **Sentence:** `Explore two battery architectures in 3D, run thermal charging scenarios, and turn the results into lifecycle and maintenance estimates.`
- **Primary:** `Launch Simulator` · **Secondary:** `How it works`

### 3.3 Wireframe — desktop (1440 wide)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ ◼ EV Pack Twin      Overview  Technology  Architectures  Methodology  [Launch Simulator] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  EV BATTERY PACK DIGITAL TWIN                 ┌───────────────────────────┐  │
│                                               │                           │  │
│  See inside the pack.                         │     battery pack visual   │  │
│  Test the heat.                               │   (poster → live 3D, C3)  │  │
│  Weigh the decision.                          │                           │  │
│                                               │                    [❚❚]   │  │
│  Explore two battery architectures in 3D…     └───────────────────────────┘  │
│                                                                              │
│  [ Launch Simulator ]   How it works →                                       │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│   INSPECT                  SIMULATE                  DECIDE                  │
│   Explore internal         Test thermal              Understand lifecycle    │
│   architecture             charging scenarios        and maintenance impact  │
├──────────────────────────────────────────────────────────────────────────────┤
│  How it works     ①  Select ──── ②  Inspect ──── ③  Simulate ──── ④  Evaluate│
├──────────────────────────────────────────────────────────────────────────────┤
│  Architectures                                                               │
│  ┌─────────────────────────────┐   ┌─────────────────────────────┐           │
│  │ LFP · blade-type            │   │ NMC · 4680-type             │           │
│  │ [still]                     │   │ [still]                     │           │
│  │ sourced cell facts + cite   │   │ sourced cell facts + cite   │           │
│  │ Open in simulator →         │   │ Open in simulator →         │           │
│  └─────────────────────────────┘   └─────────────────────────────┘           │
│  Comparison depends on the modelled configuration and scenario.              │
├──────────────────────────────────────────────────────────────────────────────┤
│  Engineering visualization     [Exploded]   [Cross-section]   [Heatmap]      │
├──────────────────────────────────────────────────────────────────────────────┤
│  Decision support              [SoH projection]  [Repair vs replace]  [ROI]  │
├──────────────────────────────────────────────────────────────────────────────┤
│  Methodology & trust     Modelled, not measured · Assumptions shown ·        │
│                          Not an OEM diagnostic tool         Read methodology→│
├──────────────────────────────────────────────────────────────────────────────┤
│                    Ready to explore?   [ Launch Simulator ]                  │
│  Footer: disclaimer · sources · licence                                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Wireframe — mobile (390 wide)

```text
┌──────────────────────────┐
│ ◼ EV Pack Twin       ☰   │
├──────────────────────────┤
│ EV BATTERY PACK          │
│ DIGITAL TWIN             │
│                          │
│ See inside the pack.     │
│ Test the heat.           │
│ Weigh the decision.      │
│                          │
│ Explore two battery…     │
│                          │
│ [   Launch Simulator   ] │
│ How it works →           │
│ ┌──────────────────────┐ │
│ │  pack poster image   │ │
│ │  (static on mobile)  │ │
│ └──────────────────────┘ │
├──────────────────────────┤
│ INSPECT                  │
│ SIMULATE                 │
│ DECIDE                   │
├──────────────────────────┤
│ ① Select                 │
│ ② Inspect                │
│ ③ Simulate               │
│ ④ Evaluate               │
├──────────────────────────┤
│ [ LFP card ]             │
│ [ NMC card ]             │
│  … sections stack …      │
└──────────────────────────┘
```

### 3.5 Hero behaviour

1. A static poster image renders first. It is a still of the product's own model.
2. On desktop, live 3D replaces the poster after the page is idle **and** WebGL is available **and** the user has not requested reduced motion.
3. On mobile, the poster stays; live 3D starts only in the simulator.
4. If WebGL is missing or the 3D bundle fails to load, the poster stays and nothing else changes.
5. A pause control is always visible while the hero rotates.

---

## 4. Architecture selection

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Top bar                                                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│  Choose a battery architecture                                               │
│                                                                              │
│  ┌───────────────────────────────────┐  ┌───────────────────────────────────┐│
│  │ LFP · blade-type                  │  │ NMC · 4680-type                   ││
│  │ [assembled still]                 │  │ [assembled still]                 ││
│  │ Cell      prismatic, long blade   │  │ Cell      cylindrical 46 × 80 mm  ││
│  │ Cooling   top cold plate          │  │ Cooling   side channels           ││
│  │ Config    <series>s<parallel>p    │  │ Config    <series>s<parallel>p    ││
│  │ Energy    <value> kWh  Modelled   │  │ Energy    <value> kWh  Modelled   ││
│  │ [ Open workspace ]                │  │ [ Open workspace ]                ││
│  └───────────────────────────────────┘  └───────────────────────────────────┘│
│  These are generic reference designs, not replicas of any vehicle pack.      │
└──────────────────────────────────────────────────────────────────────────────┘
```

Switching architecture inside the workspace asks for confirmation when a scenario has results: "Switching clears the current results. Parameters are kept where valid." (PRD FR-02.)

---

## 5. Simulator workspace

### 5.1 Regions — desktop

| Region | Content |
|---|---|
| **Top bar** | Product name · architecture switcher · scenario name · simulation status · help |
| **Left panel** | Component tree with visibility toggles; search |
| **Viewport** | 3D pack; view toolbar; mode toolbar; temperature legend when heatmap is on |
| **Right panel** | Four tabs: **Inspect** · **Simulate** · **Forecast** · **Decide** |
| **Bottom strip** | Timeline scrubber and playback for the completed simulation; status line |

Panel widths are proposed, not final: left 280 px, right 380 px, both collapsible. They are confirmed in usability review during Phase 4 (UI/UX spec §7.1).

### 5.2 Wireframe — desktop workspace

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ ◼ EV Pack Twin  │ [LFP blade ▾] │ Scenario: Fast charging │ ● Completed │ ? │
├───────────────┬──────────────────────────────────────────┬───────────────────┤
│ COMPONENTS    │ [Iso][Top][Front][Side] [⟲ Reset view]   │ Inspect│Simulate│ │
│ 🔍 search     │                                          │ Forecast│Decide  │ │
│               │                                          ├───────────────────┤
│ ☑ Upper encl. │                                          │ SIMULATE          │
│ ☑ Cold plate  │              3D VIEWPORT                 │ Preset [Fast ▾]   │
│ ☑ TIM layer   │                                          │                   │
│ ☑ Cells  (n)  │                                          │ Charging power    │
│ ☑ Busbars     │                                          │ ├──────●───┤ 120 kW│
│ ☑ BMS         │                                          │ Ambient temp.     │
│ ☑ Lower encl. │                                          │ ├───●──────┤ 25 °C │
│ ☑ Coolant in  │                                          │ Coolant flow      │
│ ☑ Coolant out │  ┌──────────────────────────┐            │ ├─────●────┤ 10 L/min│
│               │  │[Assembled|Exploded] ──●── │            │                   │
│               │  │[Cross-section] [Heatmap]  │            │ [ Run simulation ]│
│               │  └──────────────────────────┘  ┌───────┐ │ [ Reset parameters]│
│               │                                │ 52 °C │ │                   │
│               │                                │  ▓    │ │ RESULTS  Modelled │
│               │                                │  ▓    │ │ Max     48.2 °C   │
│               │                                │  ░    │ │ Average 41.0 °C   │
│               │                                │ 25 °C │ │ Spread   9.6 °C   │
│               │                                └───────┘ │ Hottest zone Z4   │
├───────────────┴──────────────────────────────────────────┴───────────────────┤
│ ▶ ❚❚  ├────────────●──────────────────┤  12:30 / 30:00 min    Model v0.1.0  │
└──────────────────────────────────────────────────────────────────────────────┘
```

The numbers above are placeholders for layout only. They are not results.

### 5.3 Right panel tabs

**Inspect** — shown when a component is selected.
- Name, category, component ID.
- Function; material; location in the pack.
- Relevant parameters with units and source.
- Common failure modes and their effect.
- Temperature of this component when a simulation exists.
- A line stating whether each fact is educational (generic) or sourced.

**Simulate**
- Preset selector: Normal · Hot ambient · Fast charging · Reduced cooling (PRD §4.1 item 10).
- Three parameters, each with slider and numeric input, unit, valid range.
- `Run simulation`, `Reset parameters`.
- Status: idle · running (with progress) · completed · failed (with readable message and `Retry`).
- Results: maximum, average, spread, hottest zone, cooling condition, duration.
- Time chart: maximum and average temperature against time.
- Hotspot list: zones sorted by peak temperature; selecting one focuses the camera.
- "Parameters changed — results are from the previous run" banner when inputs no longer match the displayed results (PRD FR-08).

**Forecast**
- Inputs: starting SoH, annual energy throughput or cycles, horizon 1–8 years, end-of-life threshold.
- Chart: SoH against years; threshold line; crossing year if reached.
- Badge `Illustrative`; model name; list of assumptions.

**Decide**
- Cost inputs, all editable, all empty by default except currency (IDR).
- Outputs: cost now, cost if deferred, repair versus replace, potential saving, payback.
- Rule-based recommendation with the rule shown.
- `Calculation details` expands every formula with the numbers substituted.

### 5.4 Wireframe — mobile workspace

```text
┌──────────────────────────┐
│ ◼  [LFP ▾]   ● Completed │
├──────────────────────────┤
│                          │
│                          │
│       3D VIEWPORT        │
│                          │
│                    52 °C │
│                    ▓     │
│                    25 °C │
├──────────────────────────┤
│ [⟲] [Explode] [Slice] [🌡]│   ← mode toolbar, 44 px targets
├──────────────────────────┤
│ ▔▔▔  bottom sheet  ▔▔▔   │
│ Parts│Inspect│Simulate│  │
│ Forecast│Decide          │
│ ……………………………………………………… │
│ Charging power   120 kW  │
│ ├──────●───┤             │
│ [   Run simulation    ]  │
└──────────────────────────┘
```

- The component tree becomes a **Parts** tab inside the bottom sheet.
- The sheet has three heights: peek, half, full.
- The timeline moves inside the Simulate tab.

---

## 6. Comparator

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Compare architectures        Scenario: [Fast charging ▾]   [ Run both ]      │
├─────────────────────────────────────┬────────────────────────────────────────┤
│ LFP · blade-type        Modelled    │ NMC · 4680-type         Modelled       │
│ [3D viewport, heatmap]              │ [3D viewport, heatmap]                 │
│        shared temperature scale ─────────────────────────────  25 ▓▓▓▓ 60 °C │
├─────────────────────────────────────┴────────────────────────────────────────┤
│ Metric              LFP        NMC        Unit     Note                      │
│ Max temperature     …          …          °C                                 │
│ Average             …          …          °C                                 │
│ Spread              …          …          °C                                 │
│ Pack energy         …          …          kWh      configurations differ ⓘ   │
│ C-rate at this power…          …          1/h      differs because energy differs │
├──────────────────────────────────────────────────────────────────────────────┤
│ No universal winner: results depend on configuration and scenario.           │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Both viewports share **one** temperature scale so colours are comparable.
- Cameras are linked by default; a toggle unlinks them.
- Every non-equivalent property is flagged (PRD FR-10).
- On mobile the two packs are stacked, with a segmented control to switch the visible one; the table stays below.

---

## 7. Methodology page

Sections: What this tool is and is not · Reference pack definitions · Thermal model (equations, nodes, boundary conditions) · Parameter register (value, unit, source, status) · SoH model · ROI formulas · Verification performed · Known limitations · Sources and licences · Model version history.

The parameter register is rendered from the same data file the engine uses, so the page cannot drift from the model.

---

## 8. System states

| Area | Loading | Empty | Error | Unavailable |
|---|---|---|---|---|
| 3D viewport | Progress bar with percentage over a pack silhouette | — | "The 3D view could not start." + `Retry` + link to static view | WebGL missing: static images of the pack plus full panel functionality |
| Component tree | Skeleton rows | "No parts match your search." | — | — |
| Inspector | — | "Select a part to see its details." | "Details for this part could not be loaded." | — |
| Simulation | "Running… n %" with `Cancel` | "Run a simulation to see results." | Readable cause + `Retry`; previous results stay, marked stale | Engine failed to load: controls disabled with explanation |
| Heatmap | — | Toggle disabled with hint "Run a simulation first." | — | — |
| Forecast | — | "Enter usage assumptions to see a projection." | Input error shown at the field | — |
| Decide | — | "Enter at least one cost to see an estimate." | Input error shown at the field | — |

Simulation status values: `idle`, `running`, `completed`, `failed`, plus a derived `stale` flag when inputs differ from the run that produced the visible results.

Error messages say what happened and what the user can do. They do not expose stack traces.

---

## 9. Responsive behaviour

| Breakpoint | Width | Layout |
|---|---|---|
| Mobile | < 768 px | Viewport on top, bottom sheet, static hero poster, reduced geometry detail |
| Tablet | 768 – 1199 px | Viewport plus one side panel at a time; left panel becomes a drawer |
| Desktop | ≥ 1200 px | Three regions plus bottom strip |

- Touch: one finger orbits, two fingers pan and pinch-zoom.
- Minimum touch target 44 × 44 CSS px (PRD §10.3).
- Rendering quality adapts to the device (`04-technical-architecture.md` §8).
- The comparator stacks below 1200 px.

---

## 10. Accessibility

| Requirement | Design |
|---|---|
| Keyboard | Every control reachable and operable by keyboard; visible focus ring; logical tab order: top bar → left panel → viewport toolbar → right panel → bottom strip |
| 3D without a pointer | The component tree is a full alternative to clicking meshes. Arrow keys orbit when the viewport has focus; `+`/`−` zoom; `R` resets the view; `E` toggles exploded; `X` toggles cross-section; `H` toggles heatmap; `Esc` clears selection |
| Screen readers | The viewport has a text description of the current state ("LFP pack, exploded 60 %, heatmap on, maximum 48 °C in zone 4"). Result changes are announced in a polite live region |
| Colour | No information by colour alone: status has icon and text; heatmap has legend, numeric readouts, and the hotspot list |
| Contrast | Text and controls meet WCAG 2.1 AA; measured values are in `02-design-system.md` §2.3 |
| Motion | `prefers-reduced-motion` disables auto-rotation and replaces animated transitions with short cross-fades or instant changes |
| Charts | Each chart has a "View as table" control |
| Labels | Every input has a visible label, unit, and range; errors are tied to their field |

Target standard: **WCAG 2.1 Level AA** for the application chrome. The 3D canvas itself cannot be made fully accessible; the component tree, text description, and data tables are the equivalent path. This limit is stated on the methodology page.

---

## 11. Content rules

- Every number has a unit.
- Every result has a data-status badge and a link to its assumptions.
- Temperatures are shown to one decimal place; the model does not justify more.
- Component facts state whether they are generic/educational or sourced.
- Wording avoids certainty: "projected", "estimated", "modelled".
- No real-vehicle names in the product interface. Source citations on the methodology page may name the cells that were measured.
