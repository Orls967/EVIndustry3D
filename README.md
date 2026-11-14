# EV Pack Twin — EV Battery Pack Digital Twin

An interactive, browser-only demonstrator that compares two **generic reference** EV battery packs — an LFP blade-type cell-to-pack design and an NMC 4680-type cylindrical array — in 3D, simulates their thermal behaviour during charging, projects an illustrative state-of-health (SoH) trend, and supports a simple maintenance-versus-replacement cost decision.

**Live demo:** https://orls967.github.io/EVIndustry3D/

> **Academic / portfolio demonstrator.** The packs are generic designs built from published literature. They are not replicas of any real vehicle pack. Thermal results are *modelled and not yet validated against pack measurements*; SoH projections are *illustrative*. Every parameter in the app is either sourced or visibly labelled as assumed (see the Methodology page).

## What it does

| Area | What you can do |
|---|---|
| Landing | Product overview with a rotating 3D preview (static image on mobile or with reduced motion) |
| Architecture selection | Choose the LFP blade pack or the NMC 4680 pack |
| 3D exploration | Orbit, select components, guided exploded view, cross-section clipping |
| Thermal simulation | Presets or custom inputs (charging power, ambient and coolant temperature, coolant flow); zone heatmap on the 3D model, temperature chart with table view, hottest-zone readout, Reynolds-number and C-rate warnings |
| Comparison | Both packs side by side at equal power or equal C-rate, shared temperature scale |
| SoH forecast | LFP: Schimpe et al. 2018 degradation model (illustrative). NMC: requires your own fade coefficients — no defaults are invented |
| Decide | Maintenance-vs-replacement rules using cost inputs you enter (empty by default; no prices are invented) |
| Methodology | Equations, parameter register with sources, verification checks V1–V6, limitations, licences |

## How it is built

| Layer | Technology | Location |
|---|---|---|
| Application and 3D | React 19, TypeScript, Vite, three.js via React Three Fiber | `app/` |
| Thermal and SoH engine | Rust compiled to WebAssembly, run in a Web Worker | `engine/` |
| Offline analysis | Python: chart digitization, reference model, validation | `analysis/` |
| Shared data | JSON packs, parameter register, tables, test vectors, schemas | `data/` |

The whole product is a static site: no backend, no analytics, no data leaves the browser. Routing is hash-based (`#/simulator/lfp`), so every link works on GitHub Pages. 3D geometry is generated procedurally in code; there are no downloaded 3D models.

Design and planning documents: [`docs/design/`](docs/design) (architecture in `04-technical-architecture.md`, simulation and parameter register in `05-simulation-and-data-design.md`) and [`docs/plan/`](docs/plan).

## Run locally

Requirements: Node.js 24, Rust (stable) with the `wasm32-unknown-unknown` target, `wasm-pack` 0.15, Python 3.14 (only for the analysis scripts).

```bash
# 1. Build the WebAssembly engine (the app imports engine/wasm/pkg)
cd engine
wasm-pack build wasm --target web --out-dir pkg

# 2. Start the app
cd ../app
npm ci
npm run dev
```

Production build: `npm run build` in `app/` writes `app/dist/`. Set `VITE_BASE_PATH` to the sub-path the site is served from (for example `/EVIndustry3D/` on GitHub Pages; default `/`). It is the only configuration value and it is public, not a secret — see `.env.example`.

## Tests and validation

| Check | Command |
|---|---|
| Rust engine, incl. V6 cross-check against Python vectors | `cd engine && cargo test` |
| Python reference model | `cd analysis && python -m pytest` |
| Regenerate validation report and test vectors | `analysis/.venv/bin/python analysis/validation/run_checks.py` |
| Data schemas | `cd app && npm run validate:data` |
| Type check and unit tests | `cd app && npm run typecheck && npm test` |
| Browser end-to-end + accessibility (needs Google Chrome) | `cd app && npm run build && node scripts/verify_e2e_m4_m6.mjs main` |

Results and the release-candidate review are in [`docs/phase-5-validation-report.md`](docs/phase-5-validation-report.md).

## Deployment

`.github/workflows/deploy-pages.yml` runs the Rust, Python and app checks on every push to `main`, builds the site for the repository sub-path, and deploys it to GitHub Pages. Repository setting required once: **Settings → Pages → Source: GitHub Actions**.

## Known limitations

- Thermal model is a reduced-order lumped network with a resistance-only electrical model; not validated against measured pack data.
- OCV and entropic-heat curves come from proxy cells (LFP 26650, NMC 21700), not from the reference cells.
- Cell resistance lookup is clamped outside 20–90 % SOC and 10–40 °C; coolant heat transfer assumes laminar flow and warns when the Reynolds number leaves that range.
- SoH for LFP uses coefficients fitted on a 3 Ah 26650 cell; NMC has no open coefficient set, so it needs user inputs.
- Cross-section shows open cell shells (no solid caps).
- Tested on desktop Chrome (Apple M4, macOS); no physical low-end mobile device test yet.

## Sources

Parameter sources are cited by ID (S1–S15, F1–F13) in [`docs/research/phase-1-research-package.md`](docs/research/phase-1-research-package.md) and shown in the app's Methodology page. The source PDFs themselves are not redistributed in this repository.

## Backlog

- Validate thermal results against measured pack data.
- First-order RC electrical model once parameters are sourced.
- Open NMC degradation coefficient set.
- Solid cross-section caps for cylindrical cells.
- Physical mobile-device testing; ESLint and `cargo clippy` in CI.
- Choose a licence for the code.
