# 03 — Interaction & Motion Specification

**Phase:** 2 · **Date:** 14 November 2026 · **Status:** Proposed, presented for Gate 2. **Not yet approved.**

**Evidence basis.** No reference animation was observed during research (`docs/design-research/notes/animation-analysis.md`). Under approved decision D10, the behaviour below is designed from the written rules in the UI/UX Design Specification §6. **All durations and easing values are starting proposals. They have not been seen in motion and are to be tuned on the real model in Phase 4.**

---

## 1. Two motion modes, two purposes

| | C3 — Cinematic 360° | C1 — Guided Exploded Assembly |
|---|---|---|
| Purpose | Present the pack; give a sense of quality | Explain how the pack is built |
| Where | Landing hero; workspace assembled state; camera transitions | Workspace inspection |
| Character | Smooth, slow, restrained | Precise, mechanical, deliberate |
| Driver | Time (auto-rotate) or the user's orbit | A single 0–100 % "explode" value |
| Stops when | The user interacts, pauses, or prefers reduced motion | The user releases the slider or pauses |

They are never blended: auto-rotation is off whenever the explode value is above 0.

---

## 2. C3 — Cinematic 360°

### 2.1 Behaviour
- The pack rotates about its vertical axis at a constant slow rate. Proposed: one turn in **60 s**.
- The camera sits at a three-quarter view, slightly above the pack.
- **Any** pointer, touch, or keyboard input on the viewport stops the rotation at once.
- Rotation does not resume on its own in the workspace. In the landing hero it resumes after **8 s** without interaction.
- A pause/play control is always visible while rotation is possible.

### 2.2 Storyboard

| Frame | Time | Camera | Pack | Interface |
|---|---|---|---|---|
| 1 | 0 s | Three-quarter view, front-left | Assembled, lid on | Hero text visible; pause control shown |
| 2 | 15 s | Same position | Rotated 90° — long side toward viewer | — |
| 3 | 30 s | Same | Rotated 180° — coolant ports visible | — |
| 4 | 45 s | Same | Rotated 270° | — |
| 5 | 60 s | Same | Back to frame 1 | Loop |
| — | User drags | User-controlled orbit | Rotation stopped | Pause control shows "play" |

### 2.3 Camera transitions

Used for view presets, focusing a selected part, and entering a mode.

- Duration proposed **600 ms**; easing: ease-in-out (cubic).
- The camera moves along a smooth arc around the pack; it never passes through geometry.
- The look-at target moves together with the position, so the pack never leaves the frame.
- A new transition requested during one in progress starts from the current position.

---

## 3. C1 — Guided Exploded Assembly

### 3.1 Control
- A segmented control switches **Assembled / Exploded**.
- A slider sets the explode value from 0 to 100 %. Dragging it scrubs the animation directly, forward or backward.
- Pressing **Exploded** animates 0 → 100 %; pressing **Assembled** or **Reset assembly** animates back to 0.
- Proposed full-range duration: **2.4 s**; easing per stage: ease-out.
- A play/pause button steps through the stages one at a time for guided explanation.

### 3.2 Principle
Each part has a fixed, authored offset vector along the pack's assembly axis (vertical), plus a stage number. The explode value maps to stage progress. Nothing is simulated physically; the same value always gives the same positions (UI/UX spec §6.2).

### 3.3 Stages — LFP blade-type

| Stage | Explode range | Part | Direction |
|---|---|---|---|
| 1 | 0 – 25 % | Upper enclosure | Up, furthest |
| 2 | 25 – 45 % | BMS and busbars | Up |
| 3 | 45 – 65 % | Top cold plate with coolant ports | Up |
| 4 | 65 – 80 % | Thermal interface layer | Up, small |
| 5 | 80 – 100 % | Blade cell array | Stays; cells spread slightly along the pack length to show they are separate |
| — | — | Lower enclosure / tray | Fixed reference |

### 3.4 Stages — NMC 4680-type

| Stage | Explode range | Part | Direction |
|---|---|---|---|
| 1 | 0 – 25 % | Upper enclosure | Up, furthest |
| 2 | 25 – 45 % | BMS and busbars / current collectors | Up |
| 3 | 45 – 75 % | Cell rows | Up, moderate |
| 4 | 75 – 100 % | Side cooling channels | Stay at mid height while rows lift, so the channels become visible between rows |
| — | — | Lower enclosure / structural base | Fixed reference |

The two sequences differ because the cooling sits in different places (decision D2).

### 3.5 Storyboard — LFP

| Frame | Explode | What the viewer sees |
|---|---|---|
| 1 | 0 % | Closed pack |
| 2 | 25 % | Lid lifted clear; electronics and busbars visible on top of the plate |
| 3 | 45 % | Electronics lifted; the full cold plate is visible |
| 4 | 65 % | Cold plate lifted; thermal interface layer visible on the cell tops |
| 5 | 80 % | Interface layer lifted; cell tops visible |
| 6 | 100 % | Cells spread apart; every layer separated and readable |

### 3.6 Rules
- Parts never intersect at any explode value. Offsets are authored so that separation increases monotonically.
- Selection works at every explode value.
- At 100 % the whole exploded stack must fit the viewport; the camera pulls back automatically during the animation.
- Hidden parts (visibility off in the tree) stay hidden.

---

## 4. Component selection

| Step | Behaviour |
|---|---|
| Hover (pointer) | Part shows a faint outline; a small label with its name appears |
| Select | Click or tap the part, or its row in the tree. Both select the same component ID |
| Result | Accent outline on the part; other parts dim; inspector opens on the **Inspect** tab; camera focuses the part (transition per §2.3) |
| Instanced cells | Selecting a cell selects that single cell, and the inspector also names its zone |
| Deselect | Click empty space, press `Esc`, or close the inspector |

Focus transitions can be turned off in settings for users who find camera movement disorienting.

---

## 5. Cross-section (X-ray)

### 5.1 Control
- A toggle turns the section plane on. MVP: one axis — along the pack length. Data structures allow three axes later (PRD FR-06).
- A slider moves the plane from one end of the pack to the other.
- A "flip" button reverses which side is removed.
- **Reset** returns the plane to the middle.

### 5.2 Storyboard

| Frame | State | What the viewer sees |
|---|---|---|
| 1 | Toggle on | A thin accent-coloured frame appears at mid-length showing the plane and an arrow for the removed side; geometry on that side disappears over 300 ms |
| 2 | Slider to 25 % | Plane moves; more of the pack is removed; cut faces show a flat fill |
| 3 | Slider to 75 % | Less removed; internal layers visible in section |
| 4 | Flip | The other side is removed instead |
| 5 | Reset | Plane returns to the middle |

### 5.3 Rules
- Clipping is a rendering effect; source geometry is never changed (PRD FR-06).
- Cut faces are filled so parts look solid. If filled faces prove impractical for instanced cells, the fallback is an outlined section with a visible note; this is a known technical uncertainty (`07-acceptance-risks-prd-alignment.md`, risk T3).
- **Cross-section and exploded view together:** allowed. The plane clips parts at their exploded positions. If this proves visually confusing in Phase 4, the fallback is to make the modes exclusive and tell the user, which PRD FR-06 permits.
- With the heatmap on, cut faces show the temperature of their zone.

---

## 6. Thermal heatmap and playback

| Element | Behaviour |
|---|---|
| Toggle | Disabled until a simulation has completed |
| Turning on | Base materials cross-fade to thermal colours over 400 ms |
| Legend | Vertical bar with numeric ticks, unit, and the scenario's minimum and maximum |
| Readout | Hovering or selecting a zone shows its temperature at the current time |
| Timeline | A scrubber over the simulated period; dragging updates colours and metrics immediately |
| Playback | Play/pause; speed 1×, 4×, 16× of a base rate that plays the whole run in 20 s |
| Colour change | Interpolated between stored time steps so colours never flicker |
| Hottest zone | Outlined and labelled at all times while the heatmap is on |

Playback shows **simulated time from a completed run**. It is labelled "Simulation playback" so it cannot be mistaken for live data.

---

## 7. Mode combinations

| | Exploded | Cross-section | Heatmap |
|---|---|---|---|
| **Auto-rotate (C3)** | Off when explode > 0 | Off while the plane is on | Allowed |
| **Exploded** | — | Allowed (fallback: exclusive) | Allowed |
| **Cross-section** | | — | Allowed |

---

## 8. Reduced motion

When the user's system requests reduced motion, or the in-app "Reduce motion" setting is on:

| Normal | Reduced |
|---|---|
| Auto-rotation | Off; static three-quarter view |
| Exploded animation | Jumps between stages with a 150 ms cross-fade; the slider still scrubs |
| Camera transitions | Instant cut with a 150 ms cross-fade |
| Heatmap cross-fade | Instant |
| Playback | Available only by explicit play; never starts by itself |
| Landing hero | Static poster |

No information is available only through motion.

---

## 9. Interface motion

| Element | Motion |
|---|---|
| Panel collapse / expand | 200 ms, ease-out |
| Bottom sheet | Follows the finger; settles in 250 ms |
| Tabs | Instant content swap |
| Page changes | 150 ms fade |
| Buttons | Colour change only; no scale or bounce |

Not used anywhere: parallax, scroll-jacking, glitch effects, looping decorative animation.

---

## 10. Performance rules for motion

- The viewport renders only when something changes (camera, explode value, plane, time, selection). An idle scene costs nothing.
- Auto-rotation is the only continuous animation.
- No per-frame memory allocation in animation code (`constraints.md` §7).
- If the measured frame rate stays low, quality steps down automatically (`04-technical-architecture.md` §8) before motion is affected.
