# 02 — Design System

**Phase:** 2 · **Date:** 14 November 2026 · **Status:** Proposed, presented for Gate 2. **Not yet approved.**

Closes the items marked "pending" in the UI/UX Design Specification §2.1: final colours, typography, and spacing. Values below are proposals. Contrast ratios were **computed** today with the WCAG relative-luminance formula; they were not measured on a rendered screen.

---

## 1. Principles

1. Dark graphite/near-black foundation; restrained cyan/teal accents (approved direction).
2. Depth comes from tonal steps and thin borders, not from glow, blur, or glass.
3. Thermal colours appear **only** where a temperature is being shown.
4. One accent colour carries interaction; a second supports data.
5. Controls look like engineering software: flat, labelled, dense but legible.

---

## 2. Colour tokens

### 2.1 Foundation

| Token | Value | Use |
|---|---|---|
| `color.bg.base` | `#0B0D10` | Page and viewport background |
| `color.bg.raised` | `#12161B` | Section bands on the landing page |
| `color.surface.1` | `#181D23` | Panels, cards |
| `color.surface.2` | `#1F262E` | Inputs, hovered rows, nested cards |
| `color.border.subtle` | `#2A323C` | Dividers, card outlines (decorative) |
| `color.border.control` | `#6E7A88` | Outlines of inputs and other controls |
| `color.text.primary` | `#E8EDF2` | Main text |
| `color.text.secondary` | `#A3AFBD` | Supporting text |
| `color.text.muted` | `#8A96A4` | Captions, units, placeholders |
| `color.accent.primary` | `#38C7E0` | Primary actions, selection, focus |
| `color.accent.secondary` | `#2FB8A6` | Secondary data series, coolant path highlight |
| `color.accent.onPrimary` | `#06181C` | Text on a primary button |
| `color.focus.ring` | `#9BE7F5` | Keyboard focus outline |

### 2.2 Status — never used as a temperature colour

| Token | Value | Paired with |
|---|---|---|
| `color.status.info` | `#7FB2FF` | ⓘ icon + text |
| `color.status.warning` | `#F2B441` | ▲ icon + text |
| `color.status.danger` | `#F0625A` | ✕ icon + text |
| `color.status.neutral` | `#A3AFBD` | ● icon + text |

There is deliberately no green "safe" status. PRD §5.3 forbids reducing safety to a reassuring green indicator.

### 2.3 Computed contrast ratios

| Pair | Ratio | WCAG AA need | Result |
|---|---|---|---|
| `text.primary` on `bg.base` | 16.52 | 4.5 | Pass |
| `text.primary` on `surface.2` | 12.97 | 4.5 | Pass |
| `text.secondary` on `bg.base` | 8.73 | 4.5 | Pass |
| `text.secondary` on `surface.2` | 6.85 | 4.5 | Pass |
| `text.muted` on `bg.base` | 6.47 | 4.5 | Pass |
| `text.muted` on `surface.1` | 5.63 | 4.5 | Pass |
| `text.muted` on `surface.2` | 5.08 | 4.5 | Pass |
| `accent.primary` on `bg.base` | 9.65 | 4.5 | Pass |
| `accent.primary` on `surface.2` | 7.57 | 4.5 | Pass |
| `accent.secondary` on `bg.base` | 7.90 | 4.5 | Pass |
| `accent.onPrimary` on `accent.primary` | 9.02 | 4.5 | Pass |
| `border.control` on `bg.base` | 4.45 | 3.0 (UI) | Pass |
| `border.control` on `surface.1` | 3.88 | 3.0 (UI) | Pass |
| `border.control` on `surface.2` | 3.49 | 3.0 (UI) | Pass |
| `status.warning` on `surface.1` | 9.19 | 4.5 | Pass |
| `status.danger` on `surface.1` | 5.33 | 4.5 | Pass |
| `status.info` on `surface.1` | 7.84 | 4.5 | Pass |
| `focus.ring` on `bg.base` | 14.03 | 3.0 (UI) | Pass |

`border.subtle` is decorative and is not relied on to identify a control.

### 2.4 Thermal scale

Used only by the heatmap, the temperature legend, and temperature charts.

| Stop | Token | Value | Position |
|---|---|---|---|
| Cold | `color.thermal.0` | `#3B6FE0` | 0 % |
| Nominal | `color.thermal.1` | `#3FBF7F` | 33 % |
| Warm | `color.thermal.2` | `#F2D13D` | 60 % |
| Hot | `color.thermal.3` | `#F28C28` | 80 % |
| Critical | `color.thermal.4` | `#E5484D` | 100 % |

**Known weakness.** This follows the blue-green-yellow-red candidate in the UI/UX spec §8.1 and PRD FR-07. Its computed luminance is **not monotonic** (0.18 → 0.40 → 0.65 → 0.38 → 0.22): brightness peaks at yellow, so the order is not readable in greyscale or by some colour-blind users. Mitigations that are part of the design, not optional:

- A legend with numeric ticks is always visible while the heatmap is on.
- Hovering or selecting any zone shows its temperature as a number.
- The hotspot list gives the same information as text.
- The hottest zone carries an outline and a label, independent of colour.

**Alternative for your decision at Gate 2:** a scale whose brightness rises steadily from dark blue to light yellow. It is easier to read correctly but looks less like a conventional "thermal camera" image.

**Scale range.** The legend shows the actual minimum and maximum of the current scenario (PRD FR-07). In the comparator both packs share one range.

---

## 3. Typography

| Role | Typeface | Notes |
|---|---|---|
| Headings and body | **Inter** | Modern sans-serif |
| Numbers, IDs, units | **JetBrains Mono** | Monospace, tabular figures |

Both are believed to be under the SIL Open Font License. **This is from prior knowledge and must be verified against the font files' licence text before they are added** (`constraints.md` §10.3). Fonts are self-hosted with the site; no requests go to a third-party font service.

| Token | Size / line height | Weight | Use |
|---|---|---|---|
| `type.display` | 56 / 60 px | 700 | Landing hero headline (desktop) |
| `type.h1` | 40 / 46 px | 700 | Page titles; hero headline on mobile at 34 / 40 |
| `type.h2` | 28 / 34 px | 600 | Section titles |
| `type.h3` | 20 / 28 px | 600 | Card and panel titles |
| `type.body` | 16 / 24 px | 400 | Body text |
| `type.small` | 14 / 20 px | 400 | Panel content, table cells |
| `type.caption` | 12 / 16 px | 500 | Labels, units; uppercase labels use 0.06 em tracking |
| `type.data.lg` | 28 / 32 px | 500 mono | Headline metrics |
| `type.data` | 14 / 20 px | 500 mono | Values in tables and inputs |

Minimum text size is 12 px. Body text in the workspace panels is 14 px.

---

## 4. Spacing, grid, shape

| Token group | Values |
|---|---|
| Spacing scale | 4, 8, 12, 16, 24, 32, 48, 64, 96 px |
| Landing grid | 12 columns, 1200 px maximum content width, 24 px gutters; 4 columns below 768 px |
| Workspace | Fixed side panels (proposed 280 px and 380 px), fluid viewport |
| Radius | 2 px (inputs, badges), 4 px (buttons, cards), 8 px (sheets, dialogs) |
| Border | 1 px |
| Elevation | No drop shadows on panels. Overlays (menus, dialogs, the mobile sheet) use one shadow: `0 8px 24px rgba(0,0,0,0.5)` |
| Effects | No blur or glass. Glow is limited to a 1 px accent outline on the selected 3D part |

---

## 5. Iconography

- One outline icon set, 1.5 px stroke, 20 px default, 24 px in toolbars.
- A widely used open-licensed set is preferred over custom drawing. The specific set and its licence are chosen and verified in Phase 3.
- Every icon-only button has a text label for assistive technology and a tooltip.

---

## 6. Components

### 6.1 Inventory

| Group | Components |
|---|---|
| Navigation | Top bar, section navigation (landing), tabs, segmented control, breadcrumb (methodology) |
| Actions | Button (primary, secondary, ghost, icon), toggle button, link |
| Inputs | Slider with numeric field, number field, select, checkbox, search field |
| Data display | Metric tile, data-status badge, key–value list, table, hotspot list, legend, chart frame |
| Feedback | Progress bar, inline message (info / warning / danger), banner, toast, skeleton |
| Containers | Panel, card, bottom sheet, drawer, dialog, disclosure ("Calculation details") |
| 3D-specific | Viewport frame, view toolbar, mode toolbar, component tree row, temperature legend, timeline scrubber |

### 6.2 States every interactive component must define

Default · hover · focus-visible · active · selected (where relevant) · disabled · loading (where relevant) · error (inputs).

### 6.3 Data-status badge

| Label | Appearance | Meaning |
|---|---|---|
| `Illustrative` | Outline badge, `status.neutral`, ◇ icon | Demonstration values; not the output of a documented physical model |
| `Modelled` | Outline badge, `accent.primary`, ◆ icon | Output of the documented model for these inputs |
| `Measured` | Filled badge, `text.primary`, ● icon | Real measured data. **Not used in the MVP** |

A badge always sits beside the result title, and selecting it opens the assumptions for that result.

### 6.4 Slider with numeric field

```text
Charging power                                  [ 120 ] kW
├──────────────●───────────┤
10                        150        Above 2C for this pack ▲
```

- Label above, unit beside the field, range under the track.
- The field and the slider stay in sync; out-of-range input shows an error at the field and is not applied.
- A warning appears when a value leaves the range covered by source data.

---

## 7. Data visualization rules

1. Axis titles include the unit: "Temperature (°C)", "Time (min)", "State of health (%)".
2. Legends are placed next to the chart, never only in a tooltip.
3. Line series are distinguished by colour **and** by line style or marker.
4. Chart series use the accent colours and neutral greys. Thermal colours are reserved for temperature.
5. Uncertainty is drawn as a band where the model provides one. Where it does not, the chart says "No uncertainty estimate available".
6. Thresholds are labelled lines, with their meaning and source in the caption.
7. Tooltips show the exact value with unit; every chart also offers a table view.
8. No smoothing that invents intermediate values. Points are joined with straight segments.

---

## 8. 3D visual treatment

| Part | Material treatment |
|---|---|
| Enclosure | Satin dark grey metal, low reflectance |
| Cells — blade | Light neutral metal casing |
| Cells — cylindrical | Light neutral metal can, darker cap |
| Busbars | Copper tone, the only warm neutral in the scene |
| Cold plate / cooling channels | Mid-grey metal with visible channel geometry |
| Thermal interface layer | Flat, lighter matte tone so the layer reads as distinct |
| BMS | Dark board with a few pale blocks |
| Coolant inlet / outlet | Same metal as the plate, marked with a text label |

- Lighting: neutral studio setup, one key and soft fill, no coloured lights.
- Selection: 1 px `accent.primary` outline; non-selected parts dim slightly.
- When the heatmap is on, base materials are replaced by the thermal scale on parts that have a temperature; parts without a temperature turn neutral grey so they are not mistaken for "cold".
- Colour is never the only way to identify a part: the component tree and labels name each one.
