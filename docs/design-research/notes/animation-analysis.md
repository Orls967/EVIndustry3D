# Animation Analysis

**Date:** 14 November 2026
**Evidence:** REF-AN-01 in `../README.md`.

## 1. Reference 03 — Sequenz WebGL Viewer Multifix

### Observed
- The page loads. Its text (in German) describes an interactive viewer with "explosion, rotation and zoom", started by clicking the product.
- The page embeds the viewer as a 910 × 910 px frame.
- **The viewer displayed only a flat green area.** This was the same in headless Chrome and in a normal browser pane.
- The browser console reported several "404 Not Found" resource errors.
- One click inside the viewer produced no change after five seconds.
- The product shown in the page's own description is an electrical installation product, not a battery.

### Not observed
- The assembled state, any orbit, the exploded state, component selection, camera transitions, timing, or easing.

### Consequence
**This reference provided no evidence about motion.** Nothing below about C1 or C3 behaviour is derived from it.

## 2. What is known about C3 and C1

The only basis today is the written rules already approved in the UI/UX Design Specification §6:

| Mode | Approved rule (not new) |
|---|---|
| C3 — Cinematic 360° | Slow rotation or user orbit; stops on interaction; pause available; no fast spins. |
| C1 — Guided Exploded Assembly | Parts move along defined assembly axes, in grouped stages; pause, reverse, reset; no physics-driven motion. |
| Both | Respect reduced-motion preference; never the only way to reach information. |

Durations, easing curves, stage groupings, and camera paths are **undetermined**.

## 3. Adopt / Adapt / Reject

| Pattern | Decision | Reason |
|---|---|---|
| Viewer that starts only after a click | **Adapt** | Keeps first load light. Seen as a described behaviour, not observed working. |
| Anything about Reference 03's motion | **No decision possible** | Not observed. |

## 4. Options for closing the gap

1. You capture a working reference manually (a short screen recording of any exploded-view product viewer you like).
2. Phase 2 designs C1 and C3 from the written rules, proposes timing as a storyboard, and you review it there. Final timing is then tuned on the real model in Phase 4, as the UI/UX spec §6.1 already anticipates.

Option 2 needs nothing further from you now.

## 5. Confidence
**Low.** This pillar has the weakest evidence of the three.
