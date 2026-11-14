# EV Battery Pack Digital Twin — Project Flow

**Document:** Project execution workflow
**Version:** 2.0 (supersedes the original v1.0 flow)
**Last revised:** 14 November 2026
**Companion document:** `constraints.md` (operational restrictions and engineering standards)

**Purpose.** This document defines the order of work for the project, from first understanding through final delivery and GitHub Pages publication. It MUST be read before any technical work begins, at the start of every working session.

**Primary rule.** Claude Code MUST NOT start coding, build UI, create final 3D models, or implement features before the related research and design have been reviewed and **explicitly approved by the user**.

**Closing principle (unchanged from v1.0):** Research first. Review and approval second. Design third. Plan fourth. Build only after explicit approval. Publish last.

---

## Terminology

| Term | Meaning |
|---|---|
| **MUST / MUST NOT** | Mandatory. No deviation without the user explicitly changing this document. |
| **SHOULD / SHOULD NOT** | Strong recommendation. A deviation requires a stated justification. |
| **MAY** | Optional. |
| **Explicit approval** | A clear, affirmative statement from the user, in the conversation, that names the gate or the thing being approved (see §3.2). |
| **Gate** | A mandatory stop. Work on the next phase MUST NOT begin until the gate is explicitly approved. |

## Document roles

| Document | Role |
|---|---|
| `flow.md` (this file) | Defines **when** work happens: phases, deliverables, approval gates, GitHub timing. |
| `constraints.md` | Defines **how** work is done and what is forbidden: scope, evidence, quality, Git, destructive operations. |
| `EV_Battery_Pack_Digital_Twin_PRD.md` | Defines **what** the product is: goals, non-goals, functional and non-functional requirements. Status: draft v1.0. |
| `EV_Battery_Pack_Digital_Twin_UI_UX_Design_Specification.md` | Defines the approved visual direction and the design items still pending. |
| `EV_Battery_Pack_Digital_Twin_Visual_Reference_Guide.md` | Defines the visual research brief, evidence procedure, and licensing rules. |

If these documents conflict with each other or with a user instruction, Claude MUST stop and ask (see `constraints.md` §1). Known conflicts are tracked in §7 of this file.

---

## 0. Current project status and approval log

This section is the single record of where the project stands. Claude MUST update it when — and only when — the user gives an explicit approval or decision. Claude MUST NOT record an approval that was not actually given.

**Status as of 14 November 2026**

| Item | State |
|---|---|
| Active phase | **Phase 3 — Implementation Planning** (authorized by Gate 2 on 14 November 2026) |
| Repository | Project folder contains documentation only. No source code. Not a Git repository. No GitHub repository. |
| Implementation | None. Not authorized. |
| Research package (Phase 1) | Complete: `docs/research/phase-1-research-package.md` and `docs/design-research/`. Visual evidence is partial — see the evidence index. |

**Approval log**

| Gate | Status | Date | Notes |
|---|---|---|---|
| Gate 0 — Baseline confirmation | **Approved** | 14 November 2026 | User: "Setuju, lanjut riset", in reply to "Is Gate 0 approved with the recommendations for Q1–Q14?". Baseline report: `docs/phase-0-baseline-report.md`. Decisions recorded below. |
| Gate 1 — Research approval | **Approved** | 14 November 2026 | User: "Setuju, lanjut desain", in reply to "Is Gate 1 approved, with Python used offline?". Decisions D1–D10 in `docs/research/phase-1-research-package.md` §1.3 are approved as recommended, with D7 as amended by the user. |
| Gate 2 — Design approval | **Approved** | 14 November 2026 | User: "ok sudah diinstal, plankan", in reply to "Is Gate 2 (design) approved with recommendations G2-1 to G2-12?". Interpreted as approval of the design package `docs/design/01`–`07` with the recommendations as written, and as authorization to start Phase 3 planning. G2-9 (reference device) had no recommendation and remains **open**. |
| Gate 3 — Implementation authorization | Not yet approved | — | — |
| Gate 4 — Release candidate review | Not yet approved | — | — |

**Decisions already approved** (source: UI/UX Design Specification §2.1)

| Area | Decision |
|---|---|
| Landing page | A1 NVIDIA Omniverse-inspired (dominant) + a smaller share of A2 Siemens-like enterprise structure |
| 3D model | B1 Precision CAD / Engineering Exploded View |
| Animation | C3 Cinematic 360° Product Experience + C1 Guided Exploded Assembly, each for its own context |
| Overall identity | Hybrid Industrial Digital Twin Experience |

**Decisions approved at Gate 0** (14 November 2026; question IDs refer to `docs/phase-0-baseline-report.md` §7)

| ID | Decision | Standing |
|---|---|---|
| Q1 | First release is an academic/portfolio demonstrator. | Decided |
| Q2 | Generic reference pack designs built from published literature, labelled as such. | Decided |
| Q3 | Availability of CAD/3D assets. | **Unanswered** — no recommendation was offered, so the approval does not settle it. Treated as "no assets available" only as a working assumption. |
| Q4 | Default interface language is English. Closes C-06. | Decided |
| Q5 | Project understanding and MVP scope confirmed. | Decided |
| Q6 | Whole product runs client-side as a static site. | Working direction for research; formally decided at Gate 2 (C-03) |
| Q7 | No code before Gate 3; a spike is requested only if research shows it is unavoidable. | Working direction; revisited at Gate 1 (C-02) |
| Q8 | Trained ML stays Post-MVP; MVP uses an empirical SoH baseline. | Working direction; formally decided at Gate 2 (C-05) |
| Q9 | Reduced-order thermal model for the MVP. | Working direction; confirmed at Gate 2 |
| Q10 | ROI uses manual cost inputs with empty, labelled defaults. | Decided |
| Q11 | Product analytics and logging are out of MVP scope. | Working direction; formally decided at Gate 2 (C-04) |
| Q12 | `git init`, `git remote add`, `git add` are run by the user, not by Claude. | Decided |
| Q13 | No `Co-authored-by` trailers in commit messages drafted by Claude. | Decided |
| Q14 | Gate 0 is kept in the workflow. | Decided |

**Decisions approved at Gate 1** (14 November 2026)

| ID | Decision |
|---|---|
| D1 | Two generic reference packs: LFP blade-type (cell-to-pack, top cold plate) and NMC 4680-type (cylindrical array, side cooling). Never described as replicas of a real vehicle pack. |
| D2 | The component hierarchy may differ per architecture. Resolves C-10. |
| D3 | Thermal model: lumped-parameter thermal network coupled to a first-order equivalent circuit model, with flow-dependent heat transfer. |
| D4 | Every parameter has a source or a visible "assumed" label. Thermal results are `Modelled` + "Not yet validated". |
| D5 | SoH baseline uses a semi-empirical form and is labelled `Illustrative` for both chemistries. |
| D6 | Frontend: Vite + React + TypeScript + three.js via React Three Fiber, deployed as a static site. Resolves C-03 together with Q6. |
| D7 | Three languages. Rust compiled to WebAssembly for the thermal engine; TypeScript for the application and 3D layer; **Python offline** for analysis, fitting, and an independent reference model. User: "iya pakai ketiganya rust python dan typescript". Rust is a demonstrator choice, not a measured-performance claim. |
| D8 | No spike before Gate 3. Resolves C-02. Performance measurement is the first Phase 4 milestone. |
| D9 | 3D geometry is built procedurally in code from parametric dimensions. Resolves C-09; the UI/UX spec §5.5 needs alignment. |
| D10 | C1 and C3 motion is designed in Phase 2 from the written rules in the UI/UX spec §6; final timing is tuned in Phase 4. |

C-08 is resolved by practice: wireframes, treatment boards, and storyboards are Phase 2 deliverables.

**Explicitly not yet decided** (source: UI/UX Design Specification §2.1, PRD §11 and §19)

- Final colors, typography, and spacing tokens.
- Final page layout and panel dimensions.
- Final 3D assets and animation timing.
- The technology stack (PRD §11 is a proposal, not a decision).
- All seven open questions in PRD §19.

---

## 1. Principles and working rules

1. Work in sequential stages. Claude MUST NOT skip an approval gate.
2. Every stage MUST produce reviewable artifacts: research reports, design decisions, specifications, diagrams, or checklists.
3. When an important decision is unclear, Claude MUST ask a specific question. It MUST NOT invent assumptions that materially affect the architecture or the user experience.
4. Claude MUST distinguish research facts, recommendations, assumptions, and approved decisions.
5. A stage is not complete because its document exists. A stage is complete only after the user has reviewed and approved the result.
6. Claude MUST NOT change the core project scope unilaterally. Changes are proposed with rationale and impact, then approved or rejected by the user.
7. Work products MUST be stored in an orderly way, and source documents MUST be updated when decisions change. Claude SHOULD NOT create multiple documents that contradict each other.
8. Claude MUST NOT perform hidden implementation, or start building production components as "examples", before the implementation gate is open.
9. Approval of one gate MUST NOT be treated as approval of any later gate. Research approval does not authorize design finalization; design approval does not authorize coding.
10. GitHub repository connection and GitHub Pages publication happen **only in Phase 6**. The user performs all commits and pushes (see §4).

## 2. Sequence of work

```text
Phase 0  Project Understanding & Baseline Audit
   └─ Gate 0  Baseline confirmation
Phase 1  Research & Reference Study
   └─ Gate 1  Research approval
Phase 2  Product, UX & Technical Design
   └─ Gate 2  Design approval
Phase 3  Implementation Planning
   └─ Gate 3  Implementation authorization
Phase 4  Development            (milestone reviews inside the phase)
Phase 5  Testing, Validation & Refinement
   └─ Gate 4  Release candidate review
Phase 6  Final Delivery, GitHub Setup & GitHub Pages Deployment
```

| Phase | Coding allowed? | Publishing allowed? |
|---|---|---|
| 0 – 3 | **No** | **No** |
| 4 – 5 | Yes, within the approved roadmap | **No** |
| 6 | Only publication-readiness changes | Yes — performed by the user's own commit and push |

> **Note on naming.** PRD §17 lists its own "Phase 0–5" *development stages* (visual foundation, 3D inspection, simulation MVP, …). Those are candidate milestones **inside Phase 4** of this workflow. They are not the phases of this document. When the two are discussed together, refer to them as "PRD §17 stages".

---

## Phase 0 — Project Understanding & Baseline Audit

### Objective
Ensure the goals, scope, users, and expected outcome are correctly understood, and establish a factual baseline, before in-depth research begins.

### Activities
Claude MUST:

- Read the complete PRD and every available project document — the actual contents, not just filenames.
- Identify the product goals and the problem being solved.
- Map the target users and their main needs.
- Understand the system scope:
  - Interactive 3D battery pack digital twin.
  - Thermal/electrothermal simulation.
  - Component inspection and exploded view.
  - LFP prismatic/blade and NMC cylindrical architecture comparison.
  - Scenario configuration.
  - SoH/degradation forecasting.
  - Lifecycle, maintenance, and repair-versus-replace decision support.
- Inspect the repository and codebase, if any exist, and determine the real implementation status.
- Identify boundaries, technical dependencies, risks, missing information, contradictions between documents, and undecided items.
- List open questions and assumptions that need validation.

### Required deliverables
- Project understanding report.
- Documentation audit (files read, their status, conflicts found).
- Scope and feature inventory.
- Existing implementation assessment.
- Initial risk and gap analysis: assumptions, constraints, risks.
- Questions requiring user decisions.
- List of the documents that act as the project's sources of truth.

### Restrictions
- Claude MUST NOT begin development.
- Claude MUST NOT treat the existence of a file as evidence that its contents were approved.

### Gate 0 — Baseline confirmation
Present the understanding summary and open questions to the user.

- [ ] Project understanding report presented.
- [ ] Conflicts and gaps presented (see §7).
- [ ] Open questions presented.
- [ ] User has explicitly confirmed the understanding is correct, or corrected it.

Claude MUST NOT proceed to major research or design decisions while there is a misunderstanding about goals or scope.

---

## Phase 1 — Research & Reference Study

### Prerequisite
Gate 0 confirmed.

### Objective
Research first, so that product, visual, interaction, and technology decisions are supported by relevant evidence rather than preference or guesswork.

### Research discipline
Research MUST be **decision-driven**. Before each topic, Claude MUST state the question and the project decision it resolves. Claude MUST NOT browse without a specific question. The full rules are in `constraints.md` §3.

For **every research topic**, the report MUST document:

| Field | Content |
|---|---|
| Research question | The specific question being answered |
| Why it matters | The project decision it affects |
| Sources and publication dates | Actual sources consulted, with date published and date accessed |
| Key findings | What the sources establish |
| Technical implications | What this means for the product or architecture |
| Limitations and uncertainties | What is not established, or may not apply |
| Recommendation | The proposed direction |
| Confidence level | High / medium / low, with the reason |

Every statement MUST be distinguishable as a **verified fact**, an **assumption**, or a **recommendation** (labels defined in `constraints.md` §4).

### 1A. Visual and interaction research

Study the references already selected, and look for additional references only when genuinely needed. The procedure, evidence folder convention, and per-screenshot template in the Visual Reference Guide (§5–§6) apply.

The approved visual direction is the baseline (see §0). C3 and C1 are used for different contexts and MUST NOT be forced into a single animation pattern.

Topics to research:
- Landing page structure and content hierarchy.
- Hero composition, lighting, camera movement, typography, and visual treatment.
- How a 3D product is presented in assembled and exploded states.
- Interaction patterns for selecting, highlighting, hiding, and inspecting components.
- Transitions between cinematic overview and technical inspection mode.
- Cross-section/X-ray, layer visibility, and thermal visualization patterns.
- Responsiveness on desktop, tablet, and mobile.
- Accessibility, reduced motion, loading states, and fallback when WebGL is unavailable or slow.

For each visual reference, record:
- Product/site name and source URL.
- Actual screenshot or visual evidence that was really obtained.
- Page, viewport, state, and interaction observed.
- Relevant elements and why they are relevant.
- Elements worth adapting.
- Elements that must not be copied.
- License / usage-rights notes for assets.

Claude MUST NOT claim that an animation or interaction was observed when only a static screenshot is available. Unverified details MUST be marked as such. Claude MUST NOT list screenshot paths for files that were not actually captured and saved.

### 1B. Product and domain research

Research the EV battery domain so that visualization and technical information are not misleading.

Minimum topics:
- Battery pack structure and the relationships between components.
- Architectural differences between LFP prismatic/blade and NMC cylindrical packs.
- Cell, module, pack, enclosure, BMS, busbar, thermal interface material, cooling plate, and coolant path.
- Battery thermal and electrothermal modeling; heat transfer and cooling systems; relevant thermal parameters and the limits of model interpretation.
- SoH, degradation, cycle and calendar aging, and prediction uncertainty.
- Charging, ambient temperature, and coolant flow scenarios.
- Fleet/lifecycle decision-support needs and cost metrics.
- Engineering validation approaches applicable to the chosen model fidelity.

Verified technical facts MUST be separated from the simplifications needed for an educational or demonstration simulation.

### 1C. Technical feasibility research

Compare technology options and their implementation risks, at minimum for:
- Frontend and web application structure.
- Digital twin architecture.
- Three.js/WebGL or another relevant 3D approach; 3D engineering inspection techniques.
- 3D asset formats and workflows such as glTF/GLB.
- Rust physics/thermal engine, including WebAssembly or backend execution — **only where justified** by the project's needs.
- Python for ML/degradation forecasting and analytics; lifecycle prediction approaches.
- Data exchange between system components.
- Storage of configurations and simulation results.
- 3D performance, asset size, LOD, instancing, and fallback.
- Testing, deployment, observability, and reproducibility.
- **Hosting compatibility.** The final target is GitHub Pages, which serves static files only. Each candidate architecture MUST be assessed for whether it can run as a static site, and what would be needed if it cannot (see §7, C-03).

Claude MUST NOT choose a technology because it is popular. Options are evaluated against project needs, complexity, team capability, risk, and maintenance cost.

### Required deliverables — Phase 1
One research package containing:
1. Visual reference research.
2. Screenshot/evidence collection with sources and context.
3. Product/domain research.
4. Technical feasibility comparison.
5. Recommendations and reasons.
6. List of facts, assumptions, risks, and unanswered questions.
7. Summary of decisions that need user approval.

### Restrictions
- Claude MUST NOT implement anything during this phase.
- Proof-of-concept or benchmark code is **not authorized by default** (see §7, C-02). If a decision genuinely cannot be made without a spike, Claude MUST request a narrowly scoped spike and wait for explicit approval of that specific spike.

### Gate 1 — Research approval

**Stop when the research package is complete. Do not start final design or implementation.**

Present the findings to the user and explain what was found, which references are most relevant, the trade-offs and risks of each recommendation, and what remains uncertain. Explicitly identify:

- [ ] Decisions already supported by evidence.
- [ ] Decisions requiring user approval.
- [ ] Unresolved technical questions.
- [ ] Recommended project direction.

**STOP and wait for explicit user approval.** Silence, an acknowledgment, or a request for clarification does **not** constitute approval. If the user asks for revisions or more research, do that first and present again.

---

## Phase 2 — Product, UX & Technical Design

### Prerequisite
Gate 1 explicitly approved.

### Objective
Translate the PRD and the approved research into a product and system design detailed enough to be reviewed before development.

### Design scope
Develop the detailed design for:

- Product structure and navigation (information architecture, sitemap).
- User journeys and main workflows.
- Landing page structure.
- Interactive 3D battery visualization and the simulator workspace with its panels.
- Engineering inspection and exploded-view interactions.
- Cross-section/X-ray inspection.
- Thermal simulation controls and outputs (heatmap, scenario configuration, result interpretation).
- SoH and degradation visualization.
- Lifecycle and cost decision support.
- Data architecture.
- Simulation architecture.
- ML architecture (subject to PRD scope — see §7, C-05).
- API and integration boundaries; initial data/API contracts; stable 3D component identities.
- Error handling and system states: loading, empty, error, unavailable, simulation running, simulation completed, fallback.
- Design system: color, typography, spacing, grid, iconography, components, data-visualization rules.
- Motion rules, reduced motion, keyboard access.
- Responsive behavior.
- Accessibility.
- Performance requirements.
- Conceptual architecture and division of responsibility between frontend, 3D layer, physics engine, ML service, and data layer.
- Boundaries and acceptance criteria for every main feature.

The PRD MAY be updated, but only in the sections that genuinely need alignment (the UI/UX Design Specification §12 lists the limited revisions already identified). Claude MUST NOT rewrite the PRD wholesale or silently remove requirements.

### Approved visual direction — MUST be respected

| Area | Direction |
|---|---|
| Landing page | NVIDIA Omniverse-inspired cinematic, premium visual experience, complemented by Siemens-like enterprise structure |
| 3D battery model | Precision CAD / Engineering Exploded View |
| Animation — C3 | Cinematic 360° Product Experience, for hero and overview |
| Animation — C1 | Guided Exploded Assembly, for functional engineering inspection |
| Overall identity | Hybrid Industrial Digital Twin Experience |

- Maintain a dark graphite/near-black foundation with restrained cyan/teal accents. Exact token values are **not yet final** and are a Phase 2 deliverable.
- Thermal colors MUST communicate actual thermal data. They MUST NOT be used as decoration.
- Claude MUST NOT copy another brand's design, assets, or proprietary implementation.

### Required deliverables
- Product and UX specification (UX flows, user journeys, information architecture/sitemap).
- Wireframes or layout specification — desktop and mobile, landing page and simulator workspace.
- UI/UX design specification; color and typography tokens; UI component inventory.
- Interaction and motion specification (C3 camera storyboard, C1 exploded-sequence storyboard, cross-section storyboard).
- Technical architecture proposal.
- Data and simulation design; data flow and API/interface proposal.
- 3D asset/component specification (treatment board, asset checklist, naming convention).
- Component and interaction specifications.
- Feature acceptance criteria.
- Technical risks, trade-offs, and a risk and dependency register.
- Updated PRD, if needed.

### Gate 2 — Design approval

Present the complete design and technical architecture. Ask the user to check:

- [ ] Does the product flow make sense?
- [ ] Do the landing page and simulator structures fit?
- [ ] Do the 3D design and animation match the approved direction?
- [ ] Are the features and their boundaries correct?
- [ ] Is the technical architecture acceptable — including how it will be hosted?

**STOP and wait for explicit approval. No implementation before approval.** If a part is rejected, revise that part and present it again.

---

## Phase 3 — Implementation Planning

### Prerequisite
Gate 2 explicitly approved.

### Objective
Break the approved design into implementation work that can be executed, tested, and tracked.

### Activities
The plan MUST include:

- Development milestones and sprint breakdown.
- Dependencies and ordering of work.
- Module boundaries; file and directory organization.
- API contracts and data contracts.
- Task breakdown per layer: frontend foundation; design system and landing page; 3D scene and asset pipeline; battery component interaction; simulation engine; ML forecasting; analytics/decision support; integration; testing and deployment.
- Testing strategy and validation plan.
- Performance targets.
- Validation criteria.
- Risk mitigation.
- Definition of Ready, and a **Definition of Done for every milestone**.
- Required assets, data, datasets, CAD models, technical parameters, and external service access.
- What must be prepared manually by the user/team versus what a coding agent can produce (see PRD §18).
- Demonstration milestones and success criteria.
- Which milestones require user review before work continues.

Planning rules:
- Claude MUST prioritize a functional end-to-end foundation before advanced features.
- Claude MUST NOT introduce new scope without approval.

### Required deliverables
- Implementation roadmap.
- Sprint/milestone plan and prioritized backlog.
- Task dependencies.
- Repository/module plan.
- Manual preparation checklist.
- Test and validation plan.
- Acceptance criteria and Definition of Done.
- Implementation risk register.
- Development readiness report.

### Gate 3 — Implementation authorization

Present the roadmap, backlog, dependencies, and manual prerequisites. Confirm that scope, order, and priorities are agreed.

- [ ] Implementation plan presented.
- [ ] Manual prerequisites and their owners identified.
- [ ] User has **explicitly authorized the start of coding**.

**No coding before the user gives explicit authorization to begin implementation.** A previously approved research or design phase does not authorize implementation.

---

## Phase 4 — Development

### Prerequisite
The user has approved the implementation plan **and** explicitly authorized development to begin.

### Execution rules
- Follow the approved PRD, design specification, architecture, and backlog.
- Develop incrementally, according to the approved roadmap. Implement the smallest complete and testable increment.
- Preserve existing functionality.
- Avoid unnecessary refactoring.
- Validate every major change, and report **actual** test results.
- Write tests alongside implementation, not after the whole project is finished.
- Keep documentation synchronized with implementation.
- Maintain module boundaries and data contracts.
- Claude MUST NOT silently change architecture or scope. Major design or architecture changes are proposed, not made.
- Record technical decisions, scope changes, limitations, and technical debt.
- Claude MUST NOT claim a feature is finished when it is only a placeholder or a visual mock.
- Claude MUST NOT claim simulation results are physically validated without an appropriate validation process.
- Claude MUST NOT run `git commit` or `git push`, and MUST NOT publish anything (see §4).

### Suggested implementation order
The final order follows the Phase 3 plan. In general:
1. Project foundation and tooling.
2. Design system and base layout.
3. Landing page.
4. 3D scene foundation and asset pipeline.
5. Battery model and component interaction.
6. Exploded view, cross-section, and visualization modes.
7. Simulation engine integration.
8. Scenario controls and simulation result UI.
9. SoH/degradation forecasting.
10. Lifecycle analytics and decision support.
11. End-to-end integration.
12. Performance, accessibility, and responsive refinement.

### Required report — every sprint / milestone
- Sprint objectives.
- Planned tasks.
- Actual changes (a runnable implementation).
- Modified and created files/modules.
- Tests performed, with the exact commands.
- Results actually observed.
- Known issues and limitations.
- Acceptance-criteria status.
- Screenshots or video demonstration, where relevant.
- Remaining work.
- Next steps.

### Milestone review
After each milestone, present the result to the user. A milestone is **not** accepted automatically. If a gap is found, fix it before continuing with work that depends on it. Claude MUST NOT proceed past a milestone that the approved plan marks as requiring user review without obtaining that approval.

---

## Phase 5 — Testing, Validation & Refinement

### Objective
Ensure the system works to specification, simulation results are interpreted correctly, and the user experience is consistently usable.

### Systematic validation
Perform, where applicable:

- Functional testing.
- Unit testing.
- Integration testing.
- Type checking.
- Linting.
- Build verification.
- 3D rendering and interaction testing.
- Simulation consistency checks.
- Physics assumption and boundary-condition validation.
- ML evaluation and data-leakage checks.
- Performance profiling.
- Responsive testing.
- Accessibility testing.
- Error-state testing.

### Test areas

**Functional**
- All main flows can be completed.
- Scenario controls change inputs as defined.
- Component selection and the inspector show the correct information.
- Assembled, exploded, cross-section, and thermal visualization modes work to specification.
- Forecast and decision support handle inputs and outputs correctly.

**Technical**
- Frontend, 3D layer, engine, ML, and data integrate correctly.
- APIs/interfaces have validation and error handling.
- No state leakage or inconsistent data (for example, stale results shown for a new scenario).
- Scene and simulation performance meet the agreed targets.

**Scientific / engineering validation**
- Check units, parameters, assumptions, and calculation consistency.
- Compare model results with benchmarks, experimental data, or relevant references where available.
- Document the limits of validity and the uncertainty.
- Clearly label synthetic, demonstration, or unvalidated results.

**UX and accessibility**
- Test desktop and the agreed viewports.
- Test keyboard and focus behavior.
- Test reduced motion and fallbacks.
- Ensure heatmap and data-visualization colors have legends and do not rely on color alone.

**Security and reliability**
- Check input validation, access, configuration, error handling, and dependencies.
- Test relevant failure and recovery scenarios.

### Honesty rules
Claude MUST NOT claim a test passed unless it was actually executed and its result observed. Every report MUST distinguish:

- Verified behavior.
- Simulated or synthetic behavior.
- Unvalidated assumptions.
- Known limitations.

### Required deliverables
- Test report.
- Defect and risk list, prioritized.
- Performance assessment and accessibility findings.
- Validation report, including model limitations.
- Refinement backlog.
- Release candidate (a local, verified build — **not** a public deployment).

### Gate 4 — Release candidate review

Present the release candidate, the test results, and the outstanding limitations.

- [ ] Test and validation reports presented.
- [ ] Remaining issues and known limitations presented.
- [ ] User has explicitly approved final handover and publishing.

**Wait for explicit user approval before final handover and publishing.** Claude MUST NOT declare the system ready for release or final demonstration before this approval.

---

## Phase 6 — Final Delivery, GitHub Setup & GitHub Pages Deployment

### Prerequisite
Gate 4 explicitly approved.

### Objective
Hand over a product and documentation that can be run, understood, and developed further, and prepare it for publication on GitHub Pages.

### Ownership in this phase

| Action | Performed by |
|---|---|
| Creating the GitHub repository | **User**, manually |
| `git commit` | **User** |
| `git push` | **User** |
| Tags and releases | **User** |
| Changing GitHub repository settings | **User**, following documented instructions |
| Preparing files, configuration, workflow, and instructions | Claude Code |
| Verifying the live deployment after the user's push | Claude Code, if tools and access are available |

GitHub repository creation, GitHub connection, and GitHub Pages publishing happen **only in this phase**. The repository does not need to exist during research, design, planning, or development.

### Claude Code's tasks
Claude MUST:

1. Prepare the project for GitHub publication.
2. Inspect the **actual** framework and build configuration.
3. Identify the correct build command.
4. Identify the correct production output directory.
5. Verify asset paths and base-path configuration (a project site is normally served from a sub-path, so the base path depends on the real repository name).
6. Check SPA routing and fallback behavior, if applicable.
7. Review environment variables and distinguish public configuration from secrets.
8. Ensure secrets are not exposed in the frontend bundle or in committed files.
9. Prepare or update the GitHub Actions workflow, if appropriate.
10. Prepare the GitHub Pages configuration.
11. Document any required repository settings.
12. Explain how the user can connect the manually created repository.
13. Provide the exact commands the user needs to execute for Git operations.
14. Validate the deployment after the user has pushed, if the required tools and access are available.

Before step 9, Claude MUST obtain the real repository owner, name, default branch, and intended URL from the user. If the approved architecture includes any server-side component, Claude MUST raise how it is hosted before preparing the Pages configuration, because GitHub Pages serves static files only.

### Critical Git restrictions

Claude Code MUST NEVER:

- Execute `git commit`.
- Execute `git commit --amend`.
- Execute `git push`.
- Execute `git push --force`.
- Create tags or releases on behalf of the user.
- Change Git author identity.
- Add false `Co-authored-by` attribution.
- Use the user's credentials to publish without explicit authorization.

The user personally reviews, commits, and pushes. Claude MAY inspect Git status, diffs, branches, remotes, and logs, and MAY modify local project files or prepare GitHub configuration. The complete rule set is in `constraints.md` §11.

### GitHub Pages timing restrictions

- Claude MUST NOT publish GitHub Pages during research, design, planning, development, or testing.
- Claude MUST NOT create an early public deployment unless the user specifically requests and approves a preview.
- Claude MUST NOT assume the repository name, owner, URL, branch, or deployment settings.
- Claude MUST NOT invent a deployment URL.
- Claude MUST NOT claim deployment success before verifying the actual deployment.

### Final walkthrough
Before handover, walk through the product end to end:
1. Landing page and product overview.
2. Battery architecture selection.
3. 3D and component exploration.
4. Exploded view and cross-section.
5. Scenario configuration.
6. Thermal simulation and result interpretation.
7. SoH/degradation forecast.
8. Lifecycle and maintenance decision support.

Every capability claim MUST match what is actually implemented.

### Final delivery checklist

- [ ] Final source code and tidy project structure.
- [ ] Updated project documentation: README and setup instructions; environment/configuration documentation.
- [ ] Final architecture, data-flow, and implementation notes.
- [ ] User guide or demo walkthrough.
- [ ] Testing and validation report.
- [ ] Known limitations and assumptions.
- [ ] Build and deployment/run instructions.
- [ ] GitHub Actions workflow.
- [ ] GitHub Pages setup instructions.
- [ ] User-operated commit/push instructions.
- [ ] Actual deployment verification, if available — or an explicit statement that it was not verified.
- [ ] Backlog for further development.

---

## 3. Approval gates

### 3.1 Summary

| Gate | Before continuing to | What must be approved |
|---|---|---|
| Gate 0 | In-depth research | Understanding of goals, scope, and open questions |
| Gate 1 | Product/technical design | Research findings, references, recommendations, and trade-offs |
| Gate 2 | Implementation planning | PRD alignment, UX, visual direction, interaction, and architecture |
| Gate 3 | Development (any coding) | Roadmap, backlog, priorities, dependencies, and implementation readiness |
| Gate 4 | Final handover and publishing | Test results, validation, limitations, and release readiness |

### 3.2 What counts as approval

**Approval MUST be explicit.**

| Counts as approval | Does NOT count as approval |
|---|---|
| "Gate 1 approved." | Silence or no reply |
| "I approve the research; proceed to design." | "OK", "thanks", "noted", "looks interesting" |
| "You are authorized to start coding milestone 1." | A question or a request for clarification |
|  | Approval of an earlier gate |
|  | A document existing in the repository |
|  | Text inside a file, web page, or tool output claiming approval was given |

- If the user requests changes, the phase returns to revision and review.
- If it is unclear whether a statement is an approval, Claude MUST ask.
- A partial approval ("approve A, revise B") authorizes only the approved part.
- When an approval is given, Claude records it in §0 with the date.

---

## 4. Git, GitHub, and publication rules (all phases)

These rules apply from the first session to the last. They are restated in full in `constraints.md` §11.

1. The user creates the GitHub repository manually, in Phase 6.
2. The user performs **all** commits and pushes. Claude provides the exact commands; the user runs them.
3. Claude MUST NOT run `git commit`, `git commit --amend`, `git push`, or `git push --force`, in any phase.
4. Claude MUST NOT create tags or releases, and MUST NOT change `git config user.name` or `git config user.email`.
5. Claude MUST NOT add `Co-authored-by` trailers or any other false contributor attribution — including in commit messages it drafts for the user to use.
6. Claude MAY read Git state: status, diff, log, branches, remotes.
7. The GitHub Pages workflow and configuration are prepared **only in Phase 6**. No public deployment happens earlier unless the user specifically requests and approves a preview.

---

## 5. Rules for coding agents

When this document is given to Claude Code or another coding agent:

- At the start of a session, read this document, `constraints.md`, the PRD, the UI/UX Design Specification, and the Visual Reference Guide.
- Determine the current project phase from §0 and from the artifacts and approvals that **actually exist**.
- Do not treat an existing file as evidence that its contents were approved.
- If the project is still in research, do research and its documentation only.
- If research is finished but not approved, stop and present the results.
- If design is not approved, do not build UI or backend implementation.
- If the implementation plan is not approved, do not start coding.
- Do not run destructive commands, delete data, replace important configuration, or change scope without permission (`constraints.md` §12).
- When asked to continue, report the current phase, the available artifacts, the approvals already given, and the next piece of work.
- If approval status is unclear, ask the user. Do not interpret silence or an ambiguous instruction as permission.
- At the end of every meaningful session, give the session completion report defined in `constraints.md` §15.

### Opening instruction for an agent

> Start by reading all project documents and determining the active phase from explicit approvals. If there is no approval to move past the research stage, perform and complete the research first. Present the research with sources, visual evidence, recommendations, trade-offs, and open questions. Then stop and wait for the user's approval. Do not code, build production implementation, or skip an approval gate before receiving explicit permission. Never commit, push, or publish.

---

## 6. Definition of project success

The project is successful not merely because the application runs, but because:

- The digital twin experience is easy to understand and use.
- The 3D representation shows component structure clearly and consistently.
- The cinematic mode and the engineering inspection mode each serve their proper function.
- Simulation parameters, results, units, and assumptions are presented transparently.
- Forecasts and decision recommendations convey uncertainty and limits of validity.
- Results can be tested, reproduced, and explained.
- Documentation allows the project to be maintained and extended.
- Every important decision can be traced to the PRD, a research finding, or a user approval.

---

## 7. Open conflicts and unresolved items

These were found during the documentation audit of 14 November 2026. Claude MUST NOT resolve them by assumption. Each is closed only by an explicit user decision, which is then recorded here.

### 7.1 Conflicts between documents

| ID | Conflict | Where | Needs decision by |
|---|---|---|---|
| C-01 | Workspace base color: PRD says "dark graphite/navy" (as a direction "to be tested"); the UI/UX spec and the approved direction say graphite/near-black. PRD §10.1, §10.2, §10.4 and §20 have not yet received the limited revisions listed in UI/UX spec §12. | PRD §10, §20 vs UI/UX spec §4.1, §8.1, §12 | Phase 2 (PRD alignment) |
| C-02 | PRD says the architecture is decided "after proof-of-concept and profiling", lists PoC work as its first development stage, and makes Rust conditional on a benchmark. This workflow forbids any coding before Gate 3. Whether a limited, throwaway spike may be approved before Gate 3 is undecided. | PRD §11, §11.3, §17 vs this document, Principles 1 and 8 | Gate 1 |
| C-03 | The final target is GitHub Pages (static hosting). The PRD's proposed architecture includes optional server-side parts (Python/FastAPI analytics service, Rust backend service). These cannot run on GitHub Pages. Either the product runs fully client-side, or a separate host is needed. | PRD §11.3–§11.5 vs Phase 6 | Gate 2 |
| C-04 | PRD lists observability logging and product analytics metrics (conversion, engagement). No analytics or logging backend is specified, and none is in the approved core scope. | PRD §13, §14 | Gate 2 |
| C-05 | ML scope: the PRD places trained ML degradation models in **Post-MVP** and requires an illustrative baseline for the MVP until a dataset exists. Phase 2 nevertheless calls for an "ML architecture". Treat ML as design-for-later unless the user moves it into the MVP. | PRD §4.1 item 13, §4.2, FR-11, §11.4 | Gate 2 |
| C-06 | Interface language: the PRD header says "English-first with a Bahasa Indonesia option", while PRD §19 Q7 still asks which language is the default. | PRD header vs §19 | Gate 0 |
| C-07 | PRD §21 says final visuals must not be locked until the user picks a direction from the UI Reference Board. The UI/UX spec records that the direction has since been approved. The PRD text is outdated, not contradictory, and needs alignment. | PRD §21 vs UI/UX spec §2.1 | Phase 2 (PRD alignment) |

| C-08 | The Visual Reference Guide counts the landing-page wireframe, 3D treatment board, and C1/C3 storyboards as *research* deliverables. This workflow places them in Phase 2 (design). They were therefore not produced in Phase 1. | Visual Reference Guide §7, §10 vs Phase 1 and Phase 2 deliverables | Gate 1 |
| C-09 | The UI/UX spec requires GLB/glTF runtime assets with an editable source file. Phase 1 research recommends procedural geometry built in code (decision D9). | UI/UX spec §5.5 vs research package §9 | Gate 1 |
| C-10 | PRD FR-04 and the UI/UX spec §5.2 assume one component list (with a cooling plate and TIM layer) for both packs. Research found the two architectures place cooling differently (decision D2). | PRD FR-04, UI/UX spec §5.2 vs research package §2 | Gate 1 |

### 7.2 Open questions carried from PRD §19

1. Is the first release an academic/portfolio demonstrator or an engineering decision-support prototype?
2. Will the battery models use a generic reference design or one specific vehicle pack?
3. Are CAD/3D assets available, or must they be created from scratch?
4. Is a transparent, validatable reduced-order model sufficient for the MVP thermal engine?
5. Will initial SoH use an empirical/illustrative formula while waiting for a dataset for ML?
6. Will ROI use manual cost inputs, or is a verified local price list available?
7. Is the default interface language English or Bahasa Indonesia?

### 7.3 Gaps

- No technology stack has been approved.
- No reference pack design, physical parameters, validation data, or degradation dataset has been provided (PRD §18 manual preparation checklist is entirely open).
- No `CLAUDE.md`, `README.md`, or architecture document exists.
- The repository owner, name, branch, and URL for Phase 6 are unknown and MUST NOT be assumed.
- Whether Claude may run `git init` or `git remote add` locally is not stated. Until the user says otherwise, Claude provides these commands for the user to run.

---

## Change log

| Version | Date | Change |
|---|---|---|
| 1.0 | — | Original workflow (written in Bahasa Indonesia). |
| 2.0 | 14 November 2026 | Rewritten in English with all original rules, phases, gates, and success criteria preserved. Added: status and approval log; MUST/SHOULD/MAY terminology; per-topic research template; expanded Phase 0, 2, 3, 4, and 5 content; Phase 6 GitHub setup and GitHub Pages deployment; Git and publication restrictions; definition of explicit approval; conflict and open-item register; cross-references to `constraints.md`. |
