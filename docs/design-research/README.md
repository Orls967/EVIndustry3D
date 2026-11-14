# Design Research — Evidence Index

**Capture date:** 14 November 2026, about 08:45 UTC
**Method:** Headless Google Chrome for saved screenshots; a normal browser pane for reading page structure.
**Status:** Research evidence only. These files are **not** production assets and must not be embedded in the product (Visual Reference Guide §9).

Analysis notes are in `notes/`. The research summary is `docs/research/phase-1-research-package.md` §6.

## 1. Files actually captured

All files are under `screenshots/`. Sizes are in pixels.

| ID | File | Source URL | Viewport | What it shows | Usable |
|---|---|---|---|---|---|
| REF-LP-01 | `nvidia/case-study-desktop-hero.png` | https://www.nvidia.com/en-us/case-studies/paving-the-future-of-factories-with-nvidia-omniverse/ | 1440 × 1000 | NVIDIA "page missing" screen behind a cookie dialog | No — page is gone |
| REF-LP-02 | `nvidia/case-study-desktop-full.png` | same | 1440 × 6000 | Same error page | No |
| REF-LP-03 | `nvidia/case-study-mobile.png` | same | 390 × 844 | Same error page | No |
| REF-LP-04 | `nvidia/omniverse-desktop-hero.png` | https://www.nvidia.com/en-us/omniverse/ | 1440 × 1000 | Hero, section navigation, start of overview; cookie dialog covers the centre | Partly |
| REF-LP-05 | `nvidia/omniverse-desktop-full.png` | same | 1440 × 6000 | Upper 6000 px of the page | Partly |
| REF-LP-06 | `nvidia/omniverse-mobile.png` | same | 390 × 844 | Mobile hero | Not reviewed |
| REF-LP-07 | `siemens/desktop-hero.png` | https://www.siemens.com/en-us/company/digital-transformation/ | 1440 × 1000 | "Confirm you are human" verification page | No — blocked |
| REF-LP-08 | `siemens/desktop-full.png` | same | 1440 × 6000 | Same verification page | No |
| REF-LP-09 | `siemens/mobile.png` | same | 390 × 844 | Dark hero with product mark; cookie banner covers the lower half | Partly |
| REF-3D-01 | `battery-cad/source-page-desktop.png` | https://www.emobility-engineering.com/sealing-solutions/ | 1440 × 1000 | Site header and top of the article | Context only |
| REF-3D-02 | `battery-cad/source-page-desktop-full.png` | same | 1440 × 6000 | Whole article, including the exploded battery pack illustration | Yes |
| REF-3D-03 | `battery-cad/source-page-mobile.png` | same | 390 × 844 | Mobile top of page | Not reviewed |
| REF-AN-01 | `sequenz/desktop-viewer.png` | https://sequenz.com/sneak-peeks/webgl-viewer-multifix | 1440 × 1000 | Page header and the top of the viewer area, which is a blank green block | Page only |
| REF-AN-02 | `sequenz/desktop-full.png` | same | 1440 × 5000 | Whole page | Not reviewed |
| REF-AN-03 | `sequenz/mobile.png` | same | 390 × 844 | Mobile top of page | Not reviewed |

"Not reviewed" means the file was saved but not opened and inspected. No conclusion is drawn from it.

## 2. What could not be captured

| Item required by the Visual Reference Guide §5 | Outcome |
|---|---|
| Reference 01 source page | The URL returns HTTP 404. Confirmed in two browsers. |
| Siemens desktop page by automation | A human-verification step appeared. It was not bypassed. The page did load in a normal browser pane, where its headings were read, but no desktop screenshot file was saved. |
| Reference 03 assembled, orbit, exploded, and selected-component states | The embedded viewer (`/assets/models/se-multifix-webgl/dist/`) rendered a blank area in both browsers. The browser console reported 404 errors for its resources. One click on the viewer changed nothing. |
| Screen recordings of motion | None. No motion was observed anywhere. |
| Clean NVIDIA desktop captures | The cookie dialog is present in the saved files. Optional cookies were declined in the browser pane; that view was read but not saved to a file. |

## 3. Observed versus inferred

- **Observed:** everything described in `notes/` under "Observed".
- **Inferred, not observed:** any statement about how an animation moves, how long it lasts, or how an exploded view is triggered. None of the references showed motion in this session.

## 4. What you can capture manually, if you want stronger evidence

1. Siemens desktop page, after passing its verification yourself.
2. A working interactive 3D product viewer with exploded view, to replace Reference 03.
3. A replacement for Reference 01. The NVIDIA "Industrial Facility Digital Twins" page (https://www.nvidia.com/en-us/use-cases/industrial-facility-digital-twins/) loaded in this session and is already listed as a supporting source in the Visual Reference Guide §4.

## 5. Rights

| Material | Owner | Use in this project |
|---|---|---|
| NVIDIA pages and imagery | NVIDIA | Reference only |
| Siemens pages and imagery | Siemens | Reference only |
| Exploded pack illustration on the E-Mobility Engineering page | Credited on the page as courtesy of Henkel | Reference only |
| Sequenz viewer and product model | Sequenz / Schneider Electric | Reference only |
