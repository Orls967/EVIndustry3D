# Phase 1 — Research Package

**Project:** EV Battery Pack Digital Twin
**Date:** 14 November 2026 (all sources accessed on this date)
**Phase:** 1 — Research & Reference Study
**Status:** Presented for Gate 1 (research approval). **Not yet approved.**
**Companion evidence:** `docs/design-research/` (screenshots and visual analysis notes)

## How to read this document

Every claim carries a label from `constraints.md` §4.2:

| Label | Meaning here |
|---|---|
| **[V]** Verified | Observed directly today: a page read in full, a screenshot viewed, a command run. |
| **[S]** Supported by source | Stated by a source that was actually read. The source's own reliability is noted. |
| **[U]** Unverified | Seen only in a search-result summary or a truncated extraction. Not relied on. |
| **[A]** Assumption | Taken as true without evidence. |
| **[E]** Estimate | Reasoned approximation. |
| **[R]** Recommendation | A proposal, not a fact. |

**No code was written and no benchmark was run in this phase.** Anything about performance is therefore an estimate or an assumption.

---

## 1. Summary for Gate 1

### 1.1 What the research supports

1. The two architectures are structurally different, not one pack with different cells. A Blade-type LFP pack has long cells spanning the pack with one large cooling plate on top; a 4680-type NMC pack has a cylindrical array with serpentine coolant channels cooling the side of the cells. **[S]**
2. A reduced-order thermal model of the kind the PRD proposes is an established, published approach, and it gives the coolant-flow slider a real physical path into the model. **[S]**
3. Published semi-empirical degradation models exist with a usable functional form, but their fitted parameters belong to specific small cells. **[S]**
4. The proposed web stack fits static GitHub Pages hosting. **[S]**

### 1.2 What the research does not support

1. **No complete sourced parameter set** was found for either reference pack. Cell-level internal resistance and heating at 1C are now sourced for both cell types (§12). Still missing: thermal masses (heat capacity), thermal resistances to the coolant, entropic coefficients, and cooling coefficients. The one pack-level model read in full identified its parameters from proprietary vehicle data.
2. **No degradation dataset** matching blade or 4680 form factors was found. The open data found is for 18650 cells.
3. **The interactive behaviour of the animation reference was not observed.** Its 3D viewer did not render.
4. **Several primary papers could not be read** (§10). Their content is not used.

The consequence is direct: thermal results can be labelled `Modelled` only with clearly stated assumed parameters and "Not yet validated"; SoH projections must be labelled `Illustrative`.

### 1.3 Decisions requiring your approval

| ID | Decision | Recommendation **[R]** | Basis |
|---|---|---|---|
| D1 | Reference pack concepts | Two **generic** packs: "LFP blade-type, cell-to-pack, top cold plate" and "NMC 4680-type, cylindrical array, side cooling". Described as inspired by public layouts, never as replicas of a BYD or Tesla pack. | RQ1 |
| D2 | Component hierarchy per architecture | Allow the component list to differ by architecture. The NMC pack has side cooling channels instead of a bottom plate with a TIM layer. | RQ1 |
| D3 | Thermal model class | Lumped-parameter thermal network coupled to a first-order equivalent circuit model, with flow-dependent heat transfer. | RQ2, RQ3 |
| D4 | Parameter policy | Every parameter gets a source or an explicit "assumed" label, shown in the product. Results are `Modelled` + "Not yet validated". | RQ2 |
| D5 | SoH baseline | Semi-empirical form (Arrhenius cycle term + calendar term), labelled `Illustrative` for both chemistries. | RQ4 |
| D6 | Frontend stack | Vite + React + TypeScript + three.js via React Three Fiber, deployed as a static site. | RQ7 |
| D7 | Languages | **Decided by the user on 14 November 2026: use all three — Rust, Python, and TypeScript.** Proposed roles, still to be confirmed: Rust compiled to WebAssembly for the thermal engine, running in a Web Worker; TypeScript for the application and 3D layer; Python offline, for parameter fitting and model checks, exporting data files the app reads. The original recommendation (TypeScript only) is superseded; see §8. | RQ8 |
| D8 | Spike before Gate 3 (C-02) | Not needed. The Rust choice is now a user decision made for the demonstrator's purpose, not a performance claim, so no benchmark is required to justify it. Performance measurement remains the first Phase 4 milestone. | RQ8 |
| D9 | 3D asset route | Build geometry procedurally in code from parametric dimensions. This deviates from the UI/UX spec (GLB with editable source file). | RQ9 |
| D10 | Animation reference | Reference 01 is gone (404) and Reference 03's viewer is broken. Either you capture replacements manually, or C1/C3 are designed in Phase 2 from the written behaviour rules in the UI/UX spec §6. | RQ6 |

### 1.4 Unresolved technical questions

- Where the thermal and degradation parameter values come from (D4, D5). This is the largest open item.
- Whether you have any CAD/3D assets (Phase 0 Q3, still unanswered).
- Whether per-cell picking on instanced meshes and capped cross-sections behave as needed. Both are assumptions until tested in Phase 4.
- How deep links behave on GitHub Pages for a single-page app (RQ7).

### 1.5 Recommended direction **[R]**

A fully client-side static web app. Two generic, procedurally built packs. A small, transparent lumped thermal model running in the browser. An illustrative SoH projection and a deterministic ROI calculator. Honest labels everywhere. This is achievable without a backend, without proprietary data, and without claiming accuracy the project cannot demonstrate.

---

## 2. RQ1 — Structure of the two reference packs

| Field | Content |
|---|---|
| **Research question** | What are the publicly documented structure and component layouts of an LFP blade/prismatic pack and an NMC cylindrical pack? |
| **Why it matters** | Defines the 3D component hierarchy, the exploded-view sequence, and where cooling sits in the thermal model. |
| **Minimum evidence** | Cell form and dimensions, cell arrangement, cooling location, for one documented example of each. |
| **Stopping criterion** | One peer-reviewed or clearly sourced reference per architecture. Met for cells; only partly met for pack-level data. |

### Sources

| # | Source | Published | Type | Read |
|---|---|---|---|---|
| S1 | Ank et al., "Lithium-Ion Cells in Automotive Applications: Tesla 4680 Cylindrical Cell Teardown and Characterization", *J. Electrochem. Soc.* 170 120536, DOI 10.1149/1945-7111/ad14d0, CC BY 4.0 | 29 Dec 2023 | Peer-reviewed | Abstract and introduction verbatim; remainder truncated |
| S2 | batterydesign.net, "2022 Tesla Model Y 4680" — https://www.batterydesign.net/2022-tesla-model-y-4680/ | 14 Dec 2022, updated 21 Sep 2026 | Secondary, enthusiast/industry site | In full |
| S3 | batterydesign.net, "BYD Blade" — https://www.batterydesign.net/byd-blade/ | 4 Jul 2022, updated 1 Sep 2026 | Secondary | In full |

### Key findings

**NMC cylindrical (4680-type)**

- 46 mm diameter, 80 mm length; NMC811 cathode; graphite anode without silicon; tabless design. **[S] S1**
- 622.4 Wh/L and 232.5 Wh/kg at cell level. **[S] S1**
- Surface temperature of about 70 °C when charging at 2C without active cooling. **[S] S1**
- Cell mass, capacity, and nominal voltage: now read from the full PDF — see §12. **[S] S1**
- Pack example: 828 cells in 92s9p, serpentine coolant plates carrying water-glycol that cool one side of the cells, inlet and outlet at one end of the pack. **[S] S2**
- S2 warns that its own numbers are hard to reconcile and partly estimated, and it is internally inconsistent (four modules of 107 cells do not make 828). Another site reports 960 cells **[U]**. **Pack-level figures are low confidence.**

**LFP blade (prismatic)**

- Example cell: 138 Ah, 3.2 V, 960 × 90 × 12 mm, 2.63 kg, aluminium casing. A second example is 202 Ah. The manufacturer makes several sizes. **[S] S3**
- Cells run across the pack; an image caption suggests roughly 100–120 cells. **[S] S3**, low confidence.
- One large cooling plate fixed to the **top** surface of the cells, with both coolant connections at the front. **[S] S3**
- Pack gravimetric density about 150 Wh/kg. **[S] S3**
- No series/parallel configuration, pack voltage, or pack energy was found in a source that was read.

### Technical implications

- The exploded sequences differ. Blade-type: lid → top cooling plate → cell array → tray. 4680-type: lid → cell array interleaved with side cooling channels → structural base.
- The base component IDs in the UI/UX spec §5.2 (`pack.modules`, `pack.thermal_interface`, `pack.cooling_plate`) assume one layout. They need a per-architecture mapping. PRD FR-04 has the same assumption.
- The count of cylindrical cells (hundreds to about a thousand) makes instancing necessary (RQ7).

### Limitations

- Pack-level data comes from one secondary site. The peer-reviewed blade-versus-4680 comparison (Gorsch et al., *Cell Reports Physical Science*) could not be read.
- Nothing here establishes geometry accurate enough to call the model CAD.

### Recommendation and confidence

D1 and D2 in §1.3. **Confidence: medium** for the structural contrast, **low** for specific pack numbers.

---

## 3. RQ2 and RQ3 — Reduced-order thermal model and coolant flow

| Field | Content |
|---|---|
| **Research question** | Which reduced-order thermal model form is appropriate, which parameters does it need, and how does coolant flow enter the model? |
| **Why it matters** | Defines the simulation architecture and whether the three PRD inputs (charging power, ambient temperature, coolant flow) can all act through physics. |
| **Minimum evidence** | One peer-reviewed pack-level model with governing equations and validation figures. |
| **Stopping criterion** | Met by S4. |

### Sources

| # | Source | Published | Type | Read |
|---|---|---|---|---|
| S4 | Mannapperuma et al., "Electro-Thermal Modeling and Parameter Identification of an EV Battery Pack Using Drive Cycle Data", *Batteries* 11(9) 319, DOI 10.3390/batteries11090319, CC BY 4.0 | 27 Aug 2025 | Peer-reviewed | Abstract, model section, conclusions |
| S5 | Pasdarshahri et al., "Coupled Electro-Thermal-Aging Battery Pack Modeling — Part 1: Cell Level", *Batteries* 10(11) 404, DOI 10.3390/batteries10110404, CC BY 4.0 | 17 Nov 2024 | Peer-reviewed | Abstract and aging section |

### Key findings — all **[S] S4** unless marked

- **Structure.** A first-order equivalent circuit model (open-circuit voltage, series resistance, one RC pair) coupled to a lumped-parameter thermal network. The pack is split into four thermal zones; coolant temperature is tracked at nine points along the flow path.
- **Zone energy balance.** Thermal mass × rate of temperature change = heat generated + heat exchanged with the coolant through a thermal resistance + heat exchanged with the chassis through a thermal resistance.
- **Heat generation.** Irreversible heat from resistive losses (current² × resistance) plus reversible heat from entropy change (−current × temperature × dV_ocv/dT).
- **Coolant flow.** The battery-to-coolant heat transfer coefficient is a power law of flow rate, `u = a · flow^b + C`, and equals `1 / (R · A)`. The coolant warms along its path according to its heat capacity rate (mass flow × specific heat).
- **Validation.** Against 31 vehicle test datasets: module surface temperature RMSE below 2 °C in more than 90% of cases; terminal voltage normalized RMSE below 2%.
- **Stated weaknesses.** Accuracy falls at high C-rates, and validation is thin outside 15–40 °C and 40–90% SOC. The authors name fast charging as needing further work.
- **Parameters.** Identified from the authors' vehicle CAN data for a 73 kWh NMC pouch pack with a bottom cold plate. No general parameter table was found in the sections read.
- S5 independently uses a lumped-mass thermal model with reversible and irreversible heat at cell level. **[S] S5**

### Technical implications

- All three PRD inputs have a physical path: charging power sets current and therefore heat; ambient temperature is a boundary condition; coolant flow changes both the heat transfer coefficient and the coolant temperature rise.
- A per-zone model produces the per-component temperatures the heatmap and the "hottest component" metric need. The number of zones is a design choice for Phase 2.
- The model is a small system of ordinary differential equations. It should run in a browser in well under a second for a charging session. **[E]** — not measured.
- **Fast charging is both our headline scenario and the published weak spot of this model class.** The product must say so.

### Limitations

- Parameter values for a blade pack and a 4680 pack were not found. The pack in S4 is neither.
- Two further sources on this topic (an NREL multi-node pack model and a Chalmers pack model) could not be retrieved.
- The original reference for the heat generation expression (Bernardi et al., 1985) was not read; it is known here only through S4's use of it.

### Recommendation and confidence

D3 and D4 in §1.3. **Confidence: high** for the model class, **low** for obtaining validated parameters.

---

## 4. RQ4 — Degradation models and open datasets

| Field | Content |
|---|---|
| **Research question** | Which published empirical degradation models and open datasets exist for LFP and NMC, and under what conditions do they apply? |
| **Why it matters** | Defines the SoH baseline and whether trained ML is feasible. |
| **Minimum evidence** | One usable functional form; one open dataset with its terms. |
| **Stopping criterion** | Met for the form and for dataset existence. Not met for chemistry-specific parameters. |

### Sources

| # | Source | Published | Type | Read |
|---|---|---|---|---|
| S5 | Pasdarshahri et al. (as above) | 17 Nov 2024 | Peer-reviewed | Aging model section |
| S6 | Preger et al., "Degradation of Commercial Lithium-Ion Cells as a Function of Chemistry and Cycling Conditions", *J. Electrochem. Soc.*, DOI 10.1149/1945-7111/abae37, **CC BY-NC-ND 4.0** | 2020 | Peer-reviewed | Abstract and introduction |
| S7 | Battery Archive — https://www.batteryarchive.org/ and its study summaries page | No date shown | Data repository | In full |
| S8 | Su, Ke, Yuan, "Electrochemical Modeling of Calendar Capacity Loss of NMC-Graphite Lithium Ion Batteries", arXiv:2103.02166 | 3 Mar 2021 | Preprint | Abstract only |

### Key findings

- **Cycle aging form.** Capacity loss = `B · exp(−(Ea + λ·C-rate) / (R·T)) · H^z · (DOD / DOD_ref)^α`, where H is charge throughput. S5 attributes the base form to Wang et al. and adds the depth-of-discharge term. **[S] S5**
- **Calendar aging form.** Capacity loss = `k · θ_T · θ_V · t^n`, with an Arrhenius temperature factor and a voltage/SOC factor. S5 attributes it to Wilke et al. **[S] S5**
- Cycle and calendar losses are treated as independent and additive. Reference conditions are 25 °C, 50% DOD, 50% SOC. **[S] S5**
- All coefficients are fitted to a specific cell. **[S] S5**
- A multi-year study cycled commercial **18650** LFP, NCA, and NMC cells while varying discharge rate, depth of discharge, and temperature. Time to reach 80% capacity varied by thousands of hours within each chemistry. **[S] S6**
- That study's data is public on Battery Archive, which also hosts CALCE, HNEI, Oxford, and other datasets. **[S] S6, S7**
- Battery Archive states a code of conduct (cite the describing article and the site), **not a formal licence**; some groups set their own reuse rules. **[S] S7**
- An electrochemical model reports 6.4% calendar capacity loss after 10 months at 25 °C and 100% SOC for one 18650 NMC cell. **[S] S8** — a single modelled data point for a different cell; included only as an order-of-magnitude reference.

### Technical implications

- Temperature enters degradation through an Arrhenius term. That is the link from the thermal simulation to the SoH projection that the PRD's data flow requires.
- The open data is for small cylindrical cells. It does not match a blade cell or a 4680 cell. A trained ML model would not be valid for the modelled packs. This supports keeping ML Post-MVP.
- Published results show large spread within one chemistry, which supports the PRD rule against declaring a universal LFP-versus-NMC winner.
- S6 is non-commercial, no-derivatives. Citing its findings is fine; reproducing its figures is not. Data reuse is governed separately by S7's terms.

### Limitations

- Three foundational papers could not be read: Wang et al. 2011 (LFP cycle life), Schmalstieg et al. 2014 (NMC), Naumann et al. 2018 (LFP calendar). Their existence and topics are known only from search summaries **[U]**. Their parameter values are needed before D5 can use real coefficients.
- No coefficient values are reproduced in this report, because none were verified.

### Recommendation and confidence

D5 in §1.3. **Confidence: medium** for the form, **low** for chemistry-specific parameters.

---

## 5. RQ5 — Checking the thermal model without lab data

| Field | Content |
|---|---|
| **Research question** | How can the thermal model be checked when no experimental reference exists? |
| **Why it matters** | Determines what the product may honestly claim. |

No source was found that answers this for our situation, so this section is **recommendation only [R]**, building on the technical metrics already listed in PRD §14.

**Checks that verify the implementation (possible without data):**
1. Energy balance closes: heat generated = heat stored + heat removed, within a stated tolerance.
2. Steady state matches the hand-calculated analytical value for a single zone.
3. Results converge as the time step is reduced.
4. Identical inputs give identical outputs.
5. Trends have the right sign: more coolant flow never raises peak temperature; higher ambient never lowers it.

**Checks that compare with published behaviour (weak validation):**
6. An uncooled 4680 charged at 2C should reach a surface temperature of the order reported in S1 (about 70 °C), if the model is given comparable cell parameters.

**What these do not establish:** accuracy for any real pack. The model class can be described as *reduced-order*, never as *experimentally validated* (`constraints.md` §8.3).

**Confidence: medium.**

---

## 6. RQ6 — Visual references

Full evidence and per-screenshot notes are in `docs/design-research/`. Summary:

| Reference | Result |
|---|---|
| Ref 01 — NVIDIA BMW case study | **Page returns 404.** Not available. **[V]** |
| NVIDIA Omniverse (supporting source) | Captured on desktop and mobile; structure read. **[V]** |
| Siemens digital transformation | Desktop automated capture hit a human-verification page, which was not bypassed. Structure read in a normal browser; mobile captured with a cookie banner. **[V]** |
| Ref 02 — E-Mobility Engineering | Page captured; exploded pack illustration viewed. **[V]** |
| Ref 03 — Sequenz WebGL viewer | Page captured. **The 3D viewer rendered only a blank area**, in two browsers; its resources return 404. No interaction was observed. **[V]** |

### Key findings

- **NVIDIA Omniverse is dark only in the hero.** Below a dark hero band the page is light, with white backgrounds and dark text. A fully dark landing page is this project's own choice, not something the reference does. **[V]**
- The hero is left-aligned: a small category label, a large bold headline, one sentence, one solid primary button, and two text links. The right half holds a photoreal industrial scene overlaid with coloured wireframe boxes. **[V]**
- The hero media are videos or images; there is no live WebGL canvas on the page. **[V]**
- A secondary navigation bar sits under the hero and repeats the primary button at the right. **[V]**
- Section order: what it is → core capabilities (four cards) → how to start (three) → use cases (six) → customer examples → ecosystem → news → FAQ → next steps. **[V]**
- **Siemens** leads with numeric proof points, then outcome metrics, a three-step "how it works", a three-point differentiator block, an FAQ, and a closing call to action. Dark navy hero with a teal accent. **[V]**
- **Ref 02** shows a vertically exploded pack on a light background: lid, internal layers, cross-members, cell blocks, and tray, separated along a single axis, in restrained greys with one small red-highlighted area. The illustration is credited to Henkel. **[V]**

### Technical implications

- A hero that plays a pre-rendered clip or poster and loads live 3D only on demand is what the leading reference actually does. It also satisfies the PRD requirement that the landing page work without WebGL.
- The Siemens pattern relies on real numbers. This project has none and must not invent any. Capability statements replace metric proof points.
- Single-axis explosion with restrained materials matches the approved "precision CAD" direction.
- **C3 and C1 have no observed reference behaviour.** Timing and easing cannot be derived from evidence gathered so far.

### Limitations

- No interaction states, orbit angles, or motion recordings were captured for any reference.
- Automated desktop captures of NVIDIA pages include a cookie dialog.
- The Visual Reference Guide lists a specific image file for Ref 02. The illustration seen on the page was viewed in context; the direct image URL was not opened separately.

### Recommendation and confidence

D10 in §1.3. **Confidence: medium** for landing-page structure, **low** for motion.

---

## 7. RQ7 — Frontend stack and static hosting

| Field | Content |
|---|---|
| **Research question** | Which frontend and 3D stack fits a static GitHub Pages deployment with instancing, clipping, and fallback needs? |
| **Why it matters** | Technology stack decision; resolves conflict C-03. |
| **Stopping criterion** | Official documentation confirms each required capability. Met, with two gaps noted. |

### Sources — all official documentation, no publication dates shown unless stated

| # | Source |
|---|---|
| S9 | GitHub Docs — GitHub Pages limits; What is GitHub Pages; Configuring a publishing source; Creating a custom 404 page |
| S10 | Vite — Deploying a Static Site (docs version shown: v8.3.7) |
| S11 | Next.js — Static Exports (last updated 9 Aug 2026) |
| S12 | three.js docs — InstancedMesh; Material; WebGLRenderer. Licence: MIT |
| S13 | React Three Fiber — Scaling performance (docs version shown: v9.8.2). Licence: MIT |

### Key findings

- GitHub Pages is a static hosting service for HTML, CSS, and JavaScript. **[S] S9**
- Limits: published site up to 1 GB; soft bandwidth limit of 100 GB per month; deployments time out after 10 minutes. **[S] S9**
- It is not intended for running an online business or commercial software service. **[S] S9** — consistent with the demonstrator decision.
- A project site is served at `https://<owner>.github.io/<repository>`. **[S] S9**
- Publishing from a GitHub Actions workflow uses `actions/checkout`, `actions/upload-pages-artifact`, and `actions/deploy-pages`, with the Pages source set to "GitHub Actions". **[S] S9**
- A custom `404.html` is supported. GitHub's documentation says nothing about using it as a single-page-app routing fallback. **[S] S9**
- Vite: for a project site, `base` must be `/<REPO>/`; build with `npm run build`; output directory `dist`; an official sample workflow exists. **[S] S10**
- Next.js static export disables a long list of features, including rewrites, redirects, headers, and default image optimization. **[S] S11**
- three.js `InstancedMesh` renders many objects sharing geometry and material with fewer draw calls, and supports a colour per instance. **[S] S12**
- three.js materials support clipping planes, enabled through the renderer's `localClippingEnabled`. **[S] S12**
- React Three Fiber guidance: each mesh is a draw call; keep to a few hundred, with about 1000 as the upper limit; use instancing, on-demand rendering, level of detail, and adaptive quality. **[S] S13**

### Technical implications

- Per-instance colour is the mechanism for a per-cell heatmap on an instanced cell array.
- Clipping planes are the mechanism for the cross-section slicer.
- Roughly a thousand cylindrical cells as individual meshes would sit at the stated upper limit, so instancing is required, not optional.
- Vite needs one setting (`base`) that depends on the real repository name. That value is unknown until Phase 6 and must not be guessed.
- Next.js adds features that static export then removes, with no benefit for this product.

### Limitations and assumptions

- **[A]** Picking an individual cell on an instanced mesh by pointer is possible. The page read does not state it.
- **[A]** A clipped solid will look hollow unless the cut face is capped; capping needs extra work. Not confirmed in the pages read.
- **[A]** Deep links such as `/simulator/lfp` on Pages need either hash-based routing or a `404.html` workaround. The workaround is not documented by GitHub. PRD §9 already allows the MVP to simplify to a landing page and one workspace.
- No frame-rate claim can be made. Nothing was measured.

### Recommendation and confidence

D6 in §1.3. **Confidence: high** for hosting fit, **medium** for the picking and capping details.

---

## 8. RQ8 — Engine language and execution location

| Field | Content |
|---|---|
| **Research question** | Is in-browser execution sufficient for the thermal model, and is Rust/WebAssembly justified over TypeScript? |
| **Why it matters** | Resolves conflict C-02 and the Rust and Python parts of the PRD proposal. |

### Sources

| # | Source |
|---|---|
| S14 | MDN — Compiling from Rust to WebAssembly (last modified 2 Nov 2026) |
| S4 | Mannapperuma et al. (model size) |

### Key findings

- Rust-to-WebAssembly for the browser needs the Rust toolchain, `wasm-pack`, the `wasm-bindgen` crate, and a `cdylib` crate type; `wasm-pack build --target web` produces a browser module. **[S] S14**
- The published pack model has four thermal states plus a handful of electrical and coolant states. **[S] S4**
- PRD §11.3 makes Rust conditional on a benchmark proving the need. **[V]**
- A Python/FastAPI service cannot run on GitHub Pages. **[S] S9**

### Technical implications

- A model of tens to a few hundred states is far below the scale where WebAssembly is normally needed. **[E]** — not benchmarked.
- Rust would add a second language, a second toolchain, and extra build steps in the deployment workflow, for no demonstrated benefit.
- The SoH baseline and the ROI calculator are closed-form arithmetic and need no service.

### Limitations

- No benchmark exists. If Phase 2 chooses a much finer model (for example, one node per cell with cell-to-cell coupling for a thousand cells), the estimate should be revisited.
- Running Python in the browser was not researched, because nothing in the MVP requires Python.

### Recommendation and confidence

**Original recommendation [R]:** TypeScript engine behind a narrow interface, in a Web Worker; adopt Rust only if measurement shows a need. **Confidence: medium.**

### User decision — 14 November 2026

The user chose to use **Rust, Python, and TypeScript**. This is a product-direction decision for a portfolio demonstrator. It is **not** supported by a performance benchmark, and the project MUST NOT describe Rust as having been chosen for measured performance.

How each language fits a static GitHub Pages site:

| Language | Proposed role | Hosting impact |
|---|---|---|
| Rust | Thermal engine, compiled to WebAssembly with `wasm-pack`, loaded in a Web Worker. **[S] S14** for the toolchain. | None at runtime — WebAssembly is a static file. The deployment workflow needs a Rust build step. |
| TypeScript | Application, UI, 3D layer, ROI calculator, and the interface to the engine. | None. |
| Python | Offline analysis: fitting degradation coefficients, cross-checking the thermal model against an independent implementation, producing versioned data files. | None — nothing Python runs in production. |

Open points for Phase 2:

- **The Python role is a proposal.** A hosted Python backend is the alternative, but it cannot run on GitHub Pages and would reopen conflict C-03.
- Python fitting needs data or published coefficients. Until the blocked papers (§10) are obtained, there is little for it to fit.
- A Python reference implementation of the thermal model would give the Rust engine an independent cross-check, which strengthens RQ5.
- PRD §11.3 ("Rust if a benchmark proves the need") and §11.4 need alignment with this decision.

---

## 9. RQ9 — Route to the 3D assets

| Field | Content |
|---|---|
| **Research question** | What is a legal, workable route to the 3D assets? |
| **Why it matters** | Risk R1 in the baseline report: without separable, legally usable models, exploded view and slicer cannot be built. |

No external source was consulted for this question. The options below are **analysis and recommendation [R]**. Phase 0 question Q3 (do you already have assets?) is still unanswered.

| Option | For | Against |
|---|---|---|
| **A. Procedural geometry in code**, from parametric dimensions | No licence risk. Stable component IDs by construction. Natural fit for instancing and deterministic exploded transforms. Cell dimensions for both architectures are sourced (RQ1). Clean, exact geometry suits the precision-CAD look. | Limited fine detail (BMS board, connectors, fasteners). Deviates from the UI/UX spec §5.5, which specifies GLB/glTF with an editable source file. |
| **B. Models authored in Blender**, exported as GLB | Matches the UI/UX spec. Unlimited detail. | Someone must model two packs. Claude Code cannot operate Blender for you in this workflow. |
| **C. Licensed third-party models** | Fast if a suitable model exists. | Licence review per model; unlikely to be separated per component or to match both architectures. |

### Recommendation and confidence

D9 in §1.3: option A for cells, plates, busbars, cooling channels, and enclosure; option B only for parts where procedural detail is not enough, if you choose to model them. Because this departs from an existing specification, it needs your explicit approval. **Confidence: medium.**

---

## 10. Sources that could not be read

Their contents are **not** used anywhere in this report.

| Source | Reason |
|---|---|
| ~~Gorsch et al., blade vs 4680 teardown, *Cell Reports Physical Science*~~ | Resolved — PDF supplied by the user and read; see §12 |
| NREL multi-node battery pack thermal model (report 63898) | Host did not resolve |
| Chalmers battery pack thermal model (publication 525493) | File larger than the fetch limit |
| Wang et al. 2011, LFP cycle-life model | HTTP 403 |
| Schmalstieg et al. 2014, NMC holistic aging model | HTTP 403 |
| Naumann et al. 2018, LFP calendar aging | Bot-protection page |
| Severson et al. 2019 dataset page (data.matr.io) | Page returned no content |
| NVIDIA BMW case study (Visual Reference 01) | HTTP 404 — page removed |

If you have institutional access, the three degradation papers and the Gorsch paper are the ones worth obtaining; they would supply the coefficients D5 and the pack facts D1 currently lack.

### Identifiers for the papers to obtain

DOIs below come from search results on 14 November 2026. None of the linked pages was opened successfully by Claude.

| Paper | DOI | DOI status |
|---|---|---|
| Wang et al. 2011, *J. Power Sources* 196(8), 3942–3948 | 10.1016/j.jpowsour.2010.11.134 | Confirmed by several bibliographic records |
| Schmalstieg et al. 2014, *J. Power Sources* | 10.1016/j.jpowsour.2014.02.012 | **Unconfirmed** — not shown in any result; check before relying on it |
| Naumann et al. 2018, *J. Energy Storage* 17, 153–169 | 10.1016/j.est.2018.01.019 | Confirmed by the TUM record. Dataset: Mendeley Data 10.17632/kxh42bfgtj.1 |
| Gorsch et al. 2025, *Cell Reports Physical Science* | 10.1016/j.xcrp.2025.102453 | Confirmed; listed as open access by the Fraunhofer repository |
| Ank et al. 2023, *J. Electrochem. Soc.* 170 120536 | 10.1149/1945-7111/ad14d0 | Verified; CC BY 4.0 |

---

## 12. Addendum — papers supplied by the user (14 November 2026)

Three PDF files were placed in `docs/research/`. Text was extracted locally with Ghostscript; one figure page was rendered and viewed.

| File | What it is |
|---|---|
| `Ank_2023_J._Electrochem._Soc._170_120536.pdf` | S1, full text |
| `PIIS2666386425000529.pdf` | **S15** — Gorsch et al., "Contrasting a BYD Blade prismatic cell and Tesla 4680 cylindrical cell with a teardown analysis of design and performance", *Cell Reports Physical Science* 6, 102453, 19 March 2025, DOI 10.1016/j.xcrp.2025.102453, CC BY 4.0 |
| `mmc3.pdf` | The same article with its supplemental information appended (electrode micrographs and element composition tables) |

Still not supplied: Wang 2011, Schmalstieg 2014, Naumann 2018. Decision D5 is unchanged.

### 12.1 Cell data — **[S] S15, Table 1**, measured at C/10 unless noted

| Property | 4680 cell (NMC811) | Blade cell (LFP) |
|---|---|---|
| Nominal capacity | 23.125 Ah | 135 Ah |
| Nominal energy | 85.56 Wh | 432 Wh |
| Nominal voltage | 3.7 V | 3.2 V |
| Weight | 355 g | 2.7 ± 0.3 kg |
| Volume | 133 mL | 1,216 mL |
| Gravimetric energy density | 241.01 Wh/kg | 160 Wh/kg |
| Volumetric energy density | 643.3 Wh/L | 355.26 Wh/L |
| Dimensions | 46 mm diameter × 80 mm | 965 × 90 × 14 mm |
| Can wall thickness (sides) | 0.4 mm | 0.3 mm |

Cross-check from S1 (full text now read): 4680 mean capacity 22.078 Ah at C/3; measured weight 355.9 g. **[S] S1** The two papers agree on mass and are within about 5% on capacity, measured at different rates.

**Discrepancy:** the secondary site S3 gives the blade cell as 960 × 90 × 12 mm and 138 Ah. S15 is peer-reviewed and measured the cell directly, so S15's values take precedence. **[R]**

### 12.2 Internal resistance and heating — **[S] S15**

- DC resistance was measured at 10% SOC steps and at 10, 20, and 40 °C, following ISO 12405-4, using 18-second 1C pulses.
- Resistance rises at lower temperature for both cells. For the 4680 cell it also rises at high SOC, especially when cold; for the blade cell it falls at higher SOC.
- Heating per volume was computed as `I(1C)² × R_average / V_cell`.
- The 4680 cell generates about **twice** the heat per volume of the blade cell at 1C. The authors conclude the LFP electrode design is more favourable for a fast-charging cooling strategy.
- The blade cell shows about half the energy losses per volume at the same C-rate.

Values **read by eye from Figure 8** — approximate, not tabulated in the paper:

| Quantity | 4680 cell | Blade cell |
|---|---|---|
| DC resistance, axis range across 10–40 °C and 20–90% SOC | about 5–11 mΩ | about 0.7–1.5 mΩ |
| Volume-specific heating at 1C, 20 °C | about 29–33 W/dm³ | about 14–17 W/dm³ |

Arithmetic check **[V]**: blade cell, 135 A² × 1.0 mΩ ÷ 1.216 dm³ ≈ 15 W/dm³; 4680 cell, 23.1 A² × 7.5 mΩ ÷ 0.133 dm³ ≈ 30 W/dm³. Both fall inside the ranges read from the figure.

### 12.3 Heat during fast charging — **[S] S1**

- Heat generation during 2C charging reaches up to 15 W per cell in the low-SOC region.
- Surface temperature reaches about 70 °C at 2C in a 25 °C chamber with no active cooling.
- The cells studied came from a pack with a side cooling system.

### 12.4 What this changes

1. **Irreversible heat generation can now be `Modelled` from sourced inputs** for both cell types: capacity, voltage, and resistance as a function of SOC and temperature. The resistance surface would have to be digitized from a figure, which must be disclosed as approximate.
2. **A real calibration target exists** for RQ5: an uncooled 4680 cell at 2C should produce up to about 15 W and approach 70 °C.
3. **The LFP-versus-NMC comparison has a sourced, quantitative basis** — roughly 2× heat per volume at 1C — while still depending on the scenario.
4. **Geometry for D9 is sourced** for both cells from a peer-reviewed measurement.

### 12.5 What is still missing

- Cell heat capacity and thermal conductivity. Neither paper's extracted text gives them.
- Entropic coefficients for reversible heat.
- Thermal resistance between cell and coolant, and its dependence on flow.
- Pack-level configuration from a reliable source.
- Degradation coefficients for both chemistries.

Thermal results therefore remain "Not yet validated", and the SoH projection remains `Illustrative`.

## 13. Free-access sources requested for missing parameters (14 November 2026)

Compiled for the user to download into `docs/research/`. Purpose: close risk T1 and decision G2-3 in `docs/design/07-acceptance-risks-prd-alignment.md`.

**Check column:** **PDF ✓** = the link returned a PDF to an automated request and its title page was read. **Page ✓** = the landing page responded. **Blocked** = the site refused automated access or showed a bot check; it was not bypassed. Blocked links are expected to work in a normal browser but are unverified.

| # | Fills | Source | Link | Check |
|---|---|---|---|---|
| F1 | Cell heat capacity, thermal conductivity | Steinhardt, Barreras, Ruan, Wu, Offer, Jossen — "Meta-analysis of experimental results for heat capacity and thermal conductivity in lithium-ion batteries: A critical review", *J. Power Sources* (accepted manuscript, Coventry University repository) | https://pure.coventry.ac.uk/ws/portalfiles/portal/60952125/POWER_S_21_06019_Manuscript.pdf | PDF ✓ |
| F2 | Coolant density, specific heat, viscosity, conductivity | MEGlobal, *Ethylene Glycol Product Guide* (manufacturer technical data) | https://www.meglobal.biz/wp-content/uploads/2019/01/Monoethylene-Glycol-MEG-Technical-Product-Brochure-PDF.pdf | PDF ✓ |
| F3 | Cold-plate heat transfer, Nusselt number | Gao et al., "Design and Thermal Performance Analysis of a Liquid Cooling Plate…for Lithium-Ion Batteries", *Processes* 13, 924, CC BY | https://mdpi-res.com/d_attachment/processes/processes-13-00924/article_deploy/processes-13-00924.pdf | PDF ✓ |
| F4 | 4680 thermal modelling inputs | Tranter, Timms, Shearing, Brett — "Prediction of Thermal Issues for Larger Format 4680 Cylindrical Cells…", *J. Electrochem. Soc.* 167, 160544 (2020), open access | https://discovery.ucl.ac.uk/id/eprint/10118283/1/Tranter_2020_J._Electrochem._Soc._167_160544.pdf | PDF ✓ |
| F5 | Prismatic cell calorimetry (supporting) | Lidbeck & Syed, *Experimental Characterization of Li-ion Battery cells for Thermal Management…*, MSc thesis, Chalmers, 2017 | https://publications.lib.chalmers.se/records/fulltext/252994/252994.pdf | PDF ✓ (20 MB) |
| F6 | 4680 OCV and raw measurements | Ank et al. dataset, mediaTUM — link stated in S1's Data Availability section | https://doi.org/10.14459/2023mp1725661 | Blocked |
| F7 | Entropic coefficient, LFP vs NMC | Giammichele et al., "Evaluation of the influence of lithium-ion battery composition on thermal power generation", *Sustainable Energy & Fuels* 8, 1566 (2024), post-print | https://iris.univpm.it/bitstream/11566/328234/3/Giammichele_Evaluation-influence-lithium-ion-battery_Post-print_2024.pdf | Blocked; repository notes an embargo |
| F8 | Entropic coefficient, NMC 18650 | MDPI *Batteries* 10, 248, CC BY (repository copy) | https://www.research.unipd.it/retrieve/1cb25cf7-0100-4cfa-8dd1-2effda4ecd62/batteries-10-00248-v2.pdf | Blocked |
| F9 | LFP degradation coefficients | Schimpe et al., "Comprehensive Modeling of Temperature-Dependent Degradation Mechanisms in Lithium Iron Phosphate Batteries", *J. Electrochem. Soc.* (2018), DOI 10.1149/2.1181714jes, open access | https://doi.org/10.1149/2.1181714jes | DOI confirmed on publisher search; PDF blocked |
| F10 | LFP calendar-ageing raw data | Naumann et al. 2018 dataset, Mendeley Data | https://data.mendeley.com/datasets/kxh42bfgtj/1 | Page ✓ |
| F11 | Degradation model method (chemistry to confirm) | Gasper, Gering, Dufek, Smith — "Challenging Practices of Algebraic Battery Life Models…", *J. Electrochem. Soc.* 168, 020502 (2021), NREL copy | https://www.nrel.gov/docs/fy21osti/78256.pdf | Blocked (host unreachable from this environment) |
| F12 | LFP prismatic OCV / thermal data (content unconfirmed) | "LIC" 280 Ah LFP prismatic cell dataset, EU project TEMPEST, Zenodo | https://zenodo.org/records/19632939 | Blocked |

**Gaps that remain even with these sources:** no open NMC degradation coefficient set was found under a CC BY licence; no blade-cell-specific heat capacity was found (F1 and F5 give values for other formats).

## 14. Sources received and used (14 November 2026)

| # | Received | Used for | Note |
|---|---|---|---|
| F1 | ✓ | Heat capacity by format (cylindrical 912, prismatic 1041, pouch 1168 J/(kg·K)); conductivity medians | Accepted manuscript; median of 52 full-cell measurements |
| F2 | ✓ | Ethylene glycol–water correlations | Manufacturer data; unit interpretation checked against water |
| F3 | ✓ | Laminar flow regime; ambient coefficient 5 W/(m²·K) | CFD study, CC BY; no general duct correlation |
| F4 | ✓ | Context only: 4680 cooling cases at 10–100 W/(m²·K) | No new parameter values |
| F5 | ✓ | Cross-check: an LFP prismatic cell measured at 1087 J/(kg·K) | MSc thesis |
| F6 | ✗ | — | Not obtainable; not used |
| F7 | ✓ | OCV and entropic coefficient vs SOC for LFP and NMC | Proxy cells: LFP 26650, NMC 21700 |
| F8 | ✓ | Cross-check for NMC entropic coefficient | 18650 NMC, CC BY |
| F9 | ✓ | LFP degradation coefficients | 26650 LFP, CC BY |
| F10–F12 | ✗ | — | Not obtainable or larger than 100 MB; not used, per the user |
| F13 | ✓ | Laminar fully developed Nusselt numbers (Table 7.4); hydraulic diameter (eqn. 7.61); thermal-entry correlations (eqn. 7.28) | Lienhard & Lienhard, *A Heat Transfer Textbook* v6.00, MIT, free |

The parameter register with all values is in `docs/design/05-simulation-and-data-design.md` §3.

---

## 11. Gate 1 checklist

- [x] Research findings and recommendations presented.
- [x] Decisions already supported by evidence identified (§1.1).
- [x] Decisions requiring user approval identified (§1.3).
- [x] Unresolved technical questions identified (§1.4).
- [x] Recommended project direction stated (§1.5).
- [ ] **User has explicitly approved the research.**

Phase 2 (design) does not begin until the last item is checked.
