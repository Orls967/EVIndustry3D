# 06 — 3D Asset & Component Specification

**Phase:** 2 · **Date:** 14 November 2026 · **Status:** Proposed, presented for Gate 2. **Not yet approved.**

Under approved decision D9, geometry is **built procedurally in code** from parametric dimensions. There are no downloaded models and no third-party assets. This replaces the GLB-with-source-file route in the UI/UX Design Specification §5.5; the alignment is listed in `07-acceptance-risks-prd-alignment.md` §4.

**Fidelity statement, to be shown in the product:** "Illustrative engineering model. Cell dimensions follow published measurements; pack layout and all other parts are generic. Not manufacturing CAD."

---

## 1. Conventions

| Topic | Rule |
|---|---|
| Units | Metres in the scene; millimetres in data files |
| Axes | X along pack length, Y up, Z across pack width |
| Origin | Centre of the lower enclosure's top face |
| IDs | Lower-case, dot-separated, stable across releases |
| Single definition | Dimensions live in `data/packs/*.json`; the scene builder and the thermal model both read them |

---

## 2. Component hierarchy

Base IDs follow the UI/UX Design Specification §5.2. Cooling differs by architecture (decision D2).

### 2.1 LFP blade-type

| ID | Part | Count | Selectable | Has temperature |
|---|---|---|---|---|
| `pack.upper_enclosure` | Lid | 1 | Yes | No |
| `pack.bms` | Battery management unit | 1 | Yes | No |
| `pack.busbars` | Busbars | group | Yes (as group) | No |
| `pack.cooling_plate` | Top cold plate with internal channels | 1 | Yes | Coolant segments |
| `pack.coolant_inlet` | Inlet port | 1 | Yes | Inlet temperature |
| `pack.coolant_outlet` | Outlet port | 1 | Yes | Outlet temperature |
| `pack.thermal_interface` | Interface layer between plate and cells | 1 | Yes | No |
| `pack.cells` | Blade cell array | 120 | Yes, per cell | Zone temperature |
| `pack.zone_01` … `pack.zone_10` | Logical zones of 12 cells | 10 | Via tree and hotspot list | Yes |
| `pack.lower_enclosure` | Tray with cross-members | 1 | Yes | No |

Individual cells: `cell_<zone>_<index>`, for example `cell_03_07`.

### 2.2 NMC 4680-type

| ID | Part | Count | Selectable | Has temperature |
|---|---|---|---|---|
| `pack.upper_enclosure` | Lid | 1 | Yes | No |
| `pack.bms` | Battery management unit | 1 | Yes | No |
| `pack.busbars` | Current collectors | group | Yes (as group) | No |
| `pack.cooling_channels` | Side cooling channels between cell rows | group | Yes (as group) | Coolant segments |
| `pack.coolant_inlet` | Inlet port | 1 | Yes | Inlet temperature |
| `pack.coolant_outlet` | Outlet port | 1 | Yes | Outlet temperature |
| `pack.thermal_interface` | Interface layer between channel and cell wall | group | Yes (as group) | No |
| `pack.cells` | Cylindrical cell array | 828 | Yes, per cell | Zone temperature |
| `pack.zone_01` … `pack.zone_12` | Logical zones of 69 cells | 12 | Via tree and hotspot list | Yes |
| `pack.lower_enclosure` | Structural base | 1 | Yes | No |

`pack.modules` from the UI/UX spec is replaced by `pack.zone_*`: these generic packs are cell-to-pack designs without separate module housings. `pack.cooling_plate` exists only in the LFP pack; `pack.cooling_channels` only in the NMC pack.

---

## 3. Geometry definitions

### 3.1 Sourced dimensions

| Part | Dimension | Source |
|---|---|---|
| Blade cell | 965 × 90 × 14 mm | S15 Table 1 |
| 4680 cell | 46 mm diameter × 80 mm | S15 Table 1; S1 |

### 3.2 Derived layout — estimates, labelled as generic

| Pack | Arrangement | Approximate envelope |
|---|---|---|
| LFP | 120 blades standing on edge, stacked along X, long axis across Z | About 1.7 m × 1.0 m, cell height 90 mm |
| NMC | 36 columns × 23 rows, upright; each zone is 3 columns | About 1.7 m × 1.1 m, cell height 80 mm |

Envelopes are **estimates** from cell size and count with a small assumed gap. Cell pitch, gaps, wall thicknesses, and enclosure dimensions are **assumed design values**, fixed in Phase 3 and listed in the parameter register.

Arithmetic **[verified]**: 120 × 14 mm = 1.68 m; 36 × 23 = 828; 36 ÷ 3 = 12 zones; 3 × 23 = 69 cells per zone.

### 3.3 Shapes

| Part | Construction |
|---|---|
| Blade cell | Box with small edge radius; terminals as small blocks at the ends |
| 4680 cell | Cylinder with a cap ring |
| Cold plate | Flat plate; a shallow serpentine channel pattern visible on the cut face |
| Cooling channels | Thin vertical ribbons weaving between cell rows |
| Interface layer | Thin slab or sleeve |
| Busbars | Extruded bars following the series path |
| BMS | Box with a few surface blocks |
| Enclosure | Tray with rim and cross-members; lid as a shallow shell |
| Ports | Short tubes with a collar |

All parts are closed solids so that cross-sections can be filled.

---

## 4. Rendering budget — proposed, unmeasured

| Item | LFP | NMC |
|---|---|---|
| Cells | 1 instanced mesh, 120 instances | 1 instanced mesh, 828 instances |
| Other parts | About 15 meshes | About 30 meshes |
| Draw calls, assembled | Under 40 | Under 60 |
| Triangles, high tier | Under 150,000 | Under 400,000 |
| Textures | None — solid materials only | None |

No textures means no texture licensing and a very small download. Budgets are confirmed by measurement in the first Phase 4 milestone.

**Low tier:** cylinder segments reduced; edge radii removed; channel detail simplified.

---

## 5. Behaviour hooks

| Feature | Data required per part |
|---|---|
| Exploded view | Stage number and offset vector (`03-interaction-motion-specification.md` §3) |
| Selection | Component ID; for cells, instance index → cell ID → zone ID |
| Visibility | Component ID |
| Cross-section | Closed geometry; one clipping plane shared by all materials |
| Heatmap | Zone ID for every cell and coolant segment |
| Camera focus | Bounding box per component |
| Labels | Anchor point per component |

Cells take the colour of **their zone's temperature**. No interpolation between zones is applied, so the picture never shows detail the model does not have.

---

## 6. Static fallbacks and stills

The application needs images for: the landing hero poster, architecture cards, showcase sections, and the no-WebGL fallback.

- They are rendered **from this project's own model** once it exists, in Phase 4.
- Until then, placeholders are neutral boxes labelled "image pending". No stock or third-party imagery is used.

---

## 7. Asset checklist

- [ ] `data/packs/lfp-blade.json` and `data/packs/nmc-4680.json` with all dimensions and sources.
- [ ] Component metadata for every ID in §2.
- [ ] Exploded stage and offset for every part.
- [ ] Zone assignment for every cell.
- [ ] Generic educational descriptions and failure modes per component.
- [ ] Poster and fallback stills, rendered from the model.
- [ ] Fidelity statement shown in the workspace and on the methodology page.
