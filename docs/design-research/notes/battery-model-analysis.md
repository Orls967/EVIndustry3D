# Battery Model Analysis

**Date:** 14 November 2026
**Evidence:** REF-3D-02 in `../README.md`. Structural facts are from `docs/research/phase-1-research-package.md` §2.

## 1. Reference 02 — E-Mobility Engineering, "Sealing"

### Observed
- An exploded battery pack illustration sits about one third of the way down the article, credited on the page as courtesy of Henkel.
- **Layout.** Parts are separated vertically along a single axis. From top to bottom: a flat lid; a thin sheet layer; a frame of dark cross-members; rectangular cell blocks; a further layer with a small red-highlighted area; a dark perimeter tray with mounting tabs.
- **Treatment.** Light background, restrained greys and near-black, one accent colour used once. No glow, no labels on the image itself.
- **Scale on the page.** The illustration is small and wrapped by text; it is a supporting figure, not an interactive element.

### Not observed
- Any interactivity. It is a static image.
- The specific image file named in the Visual Reference Guide was not opened separately from the page.

### Caution
The illustration shows rectangular cell blocks. It is not evidence for the layout of a cylindrical pack, and it is not evidence of correct engineering geometry for either reference pack.

## 2. Structural facts from technical sources

| Aspect | LFP blade-type | NMC 4680-type |
|---|---|---|
| Cell form | Long, thin prismatic; one documented example is 960 × 90 × 12 mm | Cylinder, 46 mm diameter × 80 mm |
| Arrangement | Cells run across the pack, side by side | Dense upright array, hundreds of cells |
| Cooling | One large plate on the top face of the cells | Serpentine channels along the side of the cells |
| Confidence | Medium (secondary source) | Medium for the cell (peer-reviewed), low for pack figures |

## 3. Adopt / Adapt / Reject

| Pattern | Decision | Reason |
|---|---|---|
| Single-axis vertical explosion | **Adopt** | Readable; matches C1 "deterministic, along an assembly axis". |
| Restrained neutral materials with one accent | **Adopt** | Matches precision-CAD direction and keeps thermal colours free for data. |
| Layer order as drawn in Reference 02 | **Reject** | It is one illustration of one design. Order must follow each reference pack. |
| One shared component list for both packs | **Reject** | The two architectures place cooling differently. |
| The illustration's geometry | **Reject** | Owned by a third party. |

## 4. Proposed component hierarchy — for Phase 2 review, not final

| Component | LFP blade-type | NMC 4680-type |
|---|---|---|
| Upper enclosure | Yes | Yes |
| Cooling | Top cold plate | Side cooling channels between cell rows |
| Thermal interface layer | Between plate and cell tops | Between channel and cell wall |
| Cells | Blade array | Cylindrical array (instanced) |
| Busbars / interconnects | Yes | Yes |
| BMS / electronics | Yes | Yes |
| Lower enclosure / tray | Yes | Yes |
| Coolant inlet and outlet | Yes | Yes |

The UI/UX spec §5.2 base IDs need a mapping for the NMC cooling parts.

## 5. Complexity estimate
- LFP: of the order of 100 cell meshes — manageable without instancing, simpler with it.
- NMC: of the order of 800–1000 cells — instancing required.
- These are **estimates** from secondary sources. No scene has been built or measured.
