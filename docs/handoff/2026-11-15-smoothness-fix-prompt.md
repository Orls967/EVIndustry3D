# Prompt: fix 3D smoothness in EV Pack Twin

Copy everything below the line into the fixing agent.

---

You are working in `/Users/orl123456/Documents/EVIndustry` (EV Pack Twin: Vite + React 19 + TypeScript + React Three Fiber in `app/`, Rust/Wasm engine in `engine/`). The live site https://orls967.github.io/EVIndustry3D/ feels "not smooth". The causes below were diagnosed and measured on 15 November 2026. **Fix all of them**, prove each fix with measurements, and finish with the report described at the end.

## Rules

- Do **not** `git commit`, `git push`, create tags, or change Git identity. Leave all changes uncommitted in the working tree; they are validated before anything is pushed.
- Never add `Co-authored-by` or any Claude/AI attribution anywhere.
- Do not change physics, data, numbers shown to the user, wording of scientific claims, or the parameter register. This is a rendering/state-performance task only.
- Do not add runtime network requests or new heavy dependencies. `three-mesh-bvh` (MIT) is acceptable if you choose it; state why in the report.
- Keep accessibility behaviour (live region text, keyboard shortcuts, reduced motion, WebGL fallback) working exactly as before.

## Baseline measurement (live site, Chrome with Metal GPU, Apple M4, 1440×900 at DPR 2)

Measured with `docs/handoff/measure_smoothness.mjs`, which counts frames that actually issue WebGL draw calls and records Long Animation Frames. Raw output is in `docs/handoff/smoothness-baseline-live.json`.

| Scenario | 3D frames/s | p95 gap | Worst |
|---|---|---|---|
| Landing auto-rotate | 60 | 17.2 ms | — |
| LFP / NMC auto-orbit | 60 | 17.5 ms | — |
| NMC explode playback | 60 | 17.3 ms | — |
| NMC orbit drag | 59.8 | 17.7 ms | **52 ms long frame inside three.js (raycasting)** |
| **NMC heatmap playback** | **15.1** | **133.7 ms** | 32 gaps > 50 ms |

## Root causes to fix

1. **Heatmap playback is stepped, not animated.** `routes/WorkspacePage.tsx` (~line 40) advances `simPlaybackSampleIndex` with `setInterval(…, 120)`. Each tick is a global store write, so the heatmap jumps once every 120 ms (about 8 steps/s; measured 15 renders/s with 105–134 ms gaps). Colours never interpolate between samples.
   *Fix:* drive playback with `requestAnimationFrame` / `useFrame` on elapsed time, interpolate zone temperatures between neighbouring samples, and write instance colours directly to the mesh (refs) instead of through React state every frame. Update the store index at a low rate (e.g. when the integer sample changes) for the scrubber, chart cursor and live text only.

2. **Whole-store subscriptions re-render the entire workspace on every store write.** `const store = useWorkspaceStore()` with no selector appears in `routes/WorkspacePage.tsx`, `scene/PackCanvas.tsx`, `features/SimulatePanel.tsx`, `features/ForecastPanel.tsx`, `features/DecidePanel.tsx`. Every write (playback index, explode percent, render metrics) re-renders the page, all panels and the 3D tree.
   *Fix:* use per-field selectors (with `useShallow` where returning objects); actions via `useWorkspaceStore.getState()` or stable selectors.

3. **Render-metrics telemetry writes React and global state about every 400 ms while anything renders.** `scene/components/CameraAndClipControllers.tsx` (~line 152) calls `onReportMetrics`, and `scene/PackCanvas.tsx` (~line 435) does `setLocalMetrics(m)` **and** `store.setSceneRenderMetrics(m)`. Combined with cause 2, this re-renders the whole workspace about 2.5 times a second during orbit and auto-rotate. The "ms" value is also wrong: with `frameloop="demand"` it is the gap since the previous frame (e.g. "416.35 ms" when idle), not the frame cost.
   *Fix:* update the telemetry text through a DOM ref (no React state, no store write per sample). Show a truthful value: average frame interval or fps only while frames are actually rendering, labelled accordingly (or show "idle").

4. **Explode playback writes the global store on every animation frame.** `scene/PackCanvas.tsx` (~line 126) calls `store.setExplodePercent(Math.round(…))` per `requestAnimationFrame`. That re-renders everything each frame and recomputes all 828 NMC instance matrices.
   *Fix:* animate the explode factor through a ref read in `useFrame`, and commit the final value (and the slider) at a low rate or at the end.

5. **Pointer hover is expensive.** R3F raycasts on every pointer move against the 828-instance cylinder `instancedMesh` (`scene/components/Nmc4680Assembly.tsx`, ~line 110; 24 radial segments on High) and every `SelectablePart`. Hover in/out sets React state `hoveredId` in `PackCanvas`, which re-renders the scene, and `SelectableMesh.tsx` mounts a drei `<Edges>` on hover, computing an EdgesGeometry synchronously. All 12 cooling ribbons share one component id, so one hover builds many outlines at once. The measured 52 ms frame during orbit drag is in three.js raycasting.
   *Fix:*
   - Skip hover raycasting while OrbitControls is dragging (`onStart`/`onEnd`).
   - Throttle hover raycasts to animation frames.
   - Make instanced picking cheap: a bounding-box pre-test, a BVH, or a low-poly picking proxy; clicking must still return the correct `instanceId`.
   - Build edge outlines once (memoized per part) and toggle `visible` instead of mounting and unmounting.
   - Keep hover state out of the React tree (ref plus direct material/visibility change), or at least avoid re-rendering the whole assembly.

6. **The NMC scene doubles when the heatmap is on.** Telemetry showed 31 draw calls / 79,848 triangles normally, but 62 calls / 159,756 triangles after a simulation with the heatmap on. Find out why (a duplicated mesh, a second pass, or an overlay) and remove the duplication if it is not needed. Explain it in the report.

7. **The instance update effect does too much.** In `Nmc4680Assembly.tsx` (~line 50) and the LFP equivalent, one effect rewrites all matrices **and** all colours whenever any dependency changes: explode offset, selection, heatmap, or temperatures.
   *Fix:* split the work so matrices update only when positions change and colours only when colours change.

8. **Adaptive quality, for weaker machines.** The canvas uses `dpr={[1, 2]}` with MSAA at full width. Add adaptive resolution, e.g. drei `PerformanceMonitor` lowering DPR when frames drop, without changing the High/Medium/Low selector's meaning.

## How to measure (must do before and after)

1. Build the sub-path release:

   ```bash
   cd engine && wasm-pack build wasm --target web --out-dir pkg
   cd ../app && VITE_BASE_PATH=/EVIndustry3D/ npm run build
   ```

2. Serve `app/dist` under `/EVIndustry3D/` locally. The existing `scripts/verify_e2e_m4_m6.mjs subpath` server pattern, `E2E_SUBPATH=/EVIndustry3D/`, works.
3. Run:

   ```bash
   node docs/handoff/measure_smoothness.mjs http://127.0.0.1:<port>/EVIndustry3D/
   ```

   Extend the script to also cover hover (move the pointer over the NMC pack without pressing a button for 3 s) and a compare-page orbit drag.
4. Count React commits per second during heatmap playback, explode playback and orbit drag (React Profiler `onRender` counter, or a temporary dev-only counter you remove afterwards).

## Acceptance criteria (all required)

- Every measured scenario, including **heatmap playback**, hover, and compare drag: ≥ 55 rendered frames/s, p95 frame gap ≤ 20 ms, **zero** frames > 50 ms, and **zero** Long Animation Frames > 50 ms.
- Heatmap playback visibly interpolates between samples (no colour jumps). Scrubber, chart cursor and live text stay in sync with the 3D view.
- During orbit drag, auto-rotate, and explode playback, the workspace page component does **not** re-render per animation frame. Report commits/s before and after.
- NMC draw calls and triangles with the heatmap on are explained and, if they were a duplication, fixed.
- Telemetry text is truthful and no longer causes state updates.
- Clicking cells, zones and components still selects exactly what it did before. Keyboard shortcuts (arrows, +/−, R, E, X, H, Escape), reduced motion, and the WebGL-off fallback are unchanged.
- All existing checks still pass:
  - `cd engine && cargo test`
  - `cd analysis && .venv/bin/python -m pytest -q`
  - `cd app && npm run validate:data && npm run typecheck && npm test && npm run build`
  - `node scripts/verify_e2e_m4_m6.mjs main`, with 0 axe violations, 0 console errors, 0 failed and 0 external requests
  - `E2E_SUBPATH=/EVIndustry3D/ node scripts/verify_e2e_m4_m6.mjs subpath`
- Add unit tests for the new playback interpolation and anything else that is pure logic.

## Report (required, at the end)

Write `docs/handoff/2026-11-15-smoothness-fix-report.md` in **Bahasa Indonesia** containing:

1. Per root cause 1–8: what you changed (files and functions), and why it fixes the cause. Note anything you could not fix and why.
2. A before/after table from `measure_smoothness.mjs` for every scenario: frames/s, p50, p95, max gap, frames > 50 ms, Long Animation Frames. Attach the raw JSON as `docs/handoff/smoothness-after-local.json`.
3. React commits per second before/after for heatmap playback, explode playback and orbit drag.
4. NMC draw calls and triangles before/after with the heatmap on, and the explanation from cause 6.
5. The exact command output summary of every check in the acceptance list (pass/fail counts).
6. A list of every changed file (`git status --short`), confirming nothing was committed or pushed.
7. Remaining risks or anything the reviewer should check by hand on a real display (e.g. 120 Hz ProMotion).
