# Prompt: heatmap playback is still slow on the live site only

Copy everything below the line into the fixing agent.

---

You are working in `/Users/orl123456/Documents/EVIndustry`. The smoothness fix from `docs/handoff/2026-11-15-smoothness-fix-report.md` is committed (`eee2cfd`) and deployed. Everything passes locally and live **except heatmap playback on the live site** https://orls967.github.io/EVIndustry3D/. Find the cause and fix it. Finish with the report described at the end.

## Rules

- Do **not** `git commit`, `git push`, create tags, or change Git identity. Leave changes uncommitted.
- Never add `Co-authored-by` or any Claude/AI attribution anywhere.
- Do not change physics, data, numbers shown to the user, the parameter register, or scientific claims.

## Evidence (validated 15 November 2026, headless Chrome with Metal GPU, Apple M4, DPR 2)

Probe used: `docs/handoff/probe_playback.mjs <base-url>`. It opens `#/simulator/nmc`, runs the simulation, presses Play, then counts for 2 s the page's `requestAnimationFrame` ticks and the frames that issue WebGL draw calls.

| Served from | rAF/s | 3D draw frames/s | Timeline advance in 2 s |
|---|---|---|---|
| Live `https://orls967.github.io/EVIndustry3D/` (3 runs) | 61 | **11.5–15** | 00:20 → 03:00 |
| Local `vite preview` of the same commit, `/EVIndustry3D/` | 61 | 60.5 | 00:40 → 03:30 |
| Local + 150 ms emulated network latency | 61.5 | 61 | same |
| Local build with the live `.wasm` swapped in | 61 | 60.5 | same |

Already ruled out:

- **Code differences.** Live `index.html`, `index-*.js`, `PackCanvas-*.js`, `three-*.js` and `thermal.worker-*.js` are byte-identical to the local build once file hashes are normalized. Only the `.wasm` differs (CI 287,657 bytes vs local 284,002, a newer Rust in CI), and swapping it in locally does not reproduce the problem.
- **Network latency.**
- **CDN serving an old `index.html`.**

Other live results (`docs/handoff/smoothness-after-live.json`): every other scenario is about 60 fps. Two exceptions:

- `nmcDrag` had one 55 ms Long Animation Frame.
- `nmcHover` had a max gap of 46 ms.

**Interpretation:** on live the page's rAF still runs at 60/s, and the timeline advances, but R3F renders only about as often as the integer sample index is committed to the store (every 120 ms, plus a few more). So the per-frame `invalidate()` inside `SceneAnimationDrivers`' `useFrame` (`app/src/scene/PackCanvas.tsx`, around line 48) is not sustaining the demand loop on live. Something origin- or timing-dependent differs. Possibilities, not confirmed:

- HTTPS/secure context.
- Load order of the lazy `PackCanvas` chunk vs the worker.
- The canvas or root being re-created (e.g. `AdaptiveDprController` or the `canvasKey` path) after the driver captured `invalidate`.
- `useFrame` priority or registration order.
- R3F's demand-loop frame counter.

## What to do

1. Reproduce on the live URL with `probe_playback.mjs`. If you need an HTTPS origin locally, serve `app/dist` under `/EVIndustry3D/` over HTTPS, e.g. `vite preview --https` with a self-signed cert or `mkcert`, to test whether the secure context matters.
2. Instrument a **temporary**, local-only build to find out:
   - how often the driver's `useFrame` runs during playback;
   - whether `invalidate` is called;
   - whether the R3F root, store or `invalidate` identity changes;
   - what `state.internal.frames` and `state.frameloop` are.
   Remove all instrumentation afterwards.
3. Fix the root cause so playback renders every frame regardless of origin. A robust option is to switch the canvas to `frameloop="always"` only while playback or explode is playing (via `setFrameloop`), then back to `"demand"`. Explain why your fix addresses the cause you found.
4. You may not push. To prove the fix on an HTTPS origin, use the local HTTPS reproduction from step 1. If you could not reproduce locally, say so plainly.

## Acceptance criteria

- `probe_playback.mjs` shows **≥ 55 draw frames/s** during playback on the HTTPS reproduction (or live, once deployed by the reviewer) and on plain local preview.
- `measure_smoothness.mjs` passes on local preview, as before: every scenario ≥ 55 fps, p95 ≤ 20 ms, no frame > 50 ms.
- Simulation results for NMC "normal" are unchanged: max 32.1 °C, average 30.1 °C, ΔT 3.0 °C, hottest `pack.zone_12`, heat removed 73.7 %, Re 267.
- All checks pass:
  - `cd engine && cargo test`
  - `cd analysis && .venv/bin/python -m pytest -q`
  - `cd app && npm run validate:data && npm run typecheck && npm test && npm run build`
  - `node scripts/verify_e2e_m4_m6.mjs main`, with 0 axe violations, 0 console errors, 0 failed and 0 external requests
  - `VITE_BASE_PATH=/EVIndustry3D/ npm run build` followed by `E2E_SUBPATH=/EVIndustry3D/ node scripts/verify_e2e_m4_m6.mjs subpath`
- **Serving tip:** run `vite preview` with the same `VITE_BASE_PATH` as the build, in a separate process from the measuring script. Never use `execSync` against a server in the same process; it deadlocks.

## Report (required)

Write `docs/handoff/2026-11-15-live-playback-fix-report.md` in **Bahasa Indonesia**:

1. The confirmed root cause, with the instrumentation evidence.
2. What you changed (files and functions), and why it fixes the cause.
3. Before/after probe numbers: local, HTTPS reproduction, and live if available.
4. The result of every check in the acceptance list.
5. `git status --short`, confirming nothing was committed or pushed.
