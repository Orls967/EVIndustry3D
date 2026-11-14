# Landing Page Analysis

**Date:** 14 November 2026
**Evidence:** REF-LP-04, REF-LP-05, REF-LP-09 in `../README.md`, plus page structure read in a browser pane.

## 1. NVIDIA Omniverse — https://www.nvidia.com/en-us/omniverse/

### Observed
- **Hero.** Dark band about 460 px tall at 1440 px width. Left-aligned text: a small category label, a bold headline (computed style 50 px, weight 700), one sentence of supporting copy, one solid green button, and two underlined text links.
- **Hero visual.** The right half is a photoreal industrial scene with thin coloured wireframe boxes drawn over objects. It fades into the dark background on the left.
- **Media.** The page contains two video elements and no canvas element. The hero is not live 3D.
- **Section navigation.** A dark bar directly under the hero lists nine in-page sections and repeats the primary button at the far right.
- **Body.** Below that bar the page is **light**: white background, dark text, a bordered card on the right.
- **Order of sections.** What it is → core capabilities (four items) → getting started (three) → use cases (six) → customer examples (three) → ecosystem → latest news → FAQ → next steps.
- **Length.** About 8,400 px tall at desktop width.

### Not observed
- Any animation or scroll behaviour. The mobile capture was saved but not reviewed.

## 2. Siemens — https://www.siemens.com/en-us/company/digital-transformation/

### Observed
- **Mobile hero.** Dark navy background, white wordmark, a geometric teal/green product mark overlapping a photograph of people, a small uppercase category label, then the headline.
- **Order of sections** (from headings): headline → three numeric proof points → value statement → "real results" with three outcome metrics → "how it works" in three steps → three differentiators → FAQ → closing call to action.

### Not observed
- Desktop layout. The automated capture was blocked by a verification page.

## 3. Reference 01 — NVIDIA BMW case study
The page no longer exists (HTTP 404). Nothing was observed.

## 4. Adopt / Adapt / Reject

| Pattern | Decision | Reason |
|---|---|---|
| Left-aligned hero: label, headline, one sentence, one primary button, secondary links | **Adopt** | Clear hierarchy; matches PRD FR-01. |
| Hero media as video or poster rather than live 3D | **Adapt** | Satisfies "informative without WebGL". Live 3D can load after interaction. |
| Technical wireframe overlay on a rendered object | **Adapt** | Suits a battery pack if overlays carry real labels. Must not become decoration. |
| In-page section navigation with a repeated primary button | **Adopt** | Keeps "Launch Simulator" always reachable. |
| Three-step "how it works" | **Adopt** | Maps to inspect → simulate → decide. |
| FAQ and closing call to action | **Adopt** | Natural home for methodology and limitations. |
| Numeric proof points and outcome metrics | **Reject** | This project has no real metrics and must not invent them. Use capability statements. |
| Light page body under a dark hero | **Open** | The approved direction says dark foundation. NVIDIA's own page is light below the hero. Decide in Phase 2. |
| Brand colours, logos, wording, photography | **Reject** | Proprietary. |

## 5. Implementation implications
- One hero composition, one dominant call to action.
- Capability, workflow, architecture comparison, methodology, and closing sections, in that order, fit both references and UI/UX spec §4.2.
- **Confidence:** medium. Desktop Siemens and all motion remain unobserved.
