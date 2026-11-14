# EV Battery Pack Digital Twin — Visual Reference & Research Guide

**Document:** Visual Reference & Research Guide  
**Version:** 1.0  
**Date:** 14 November 2026  
**Status:** Research brief; no implementation authorized  
**Related document:** `EV_Battery_Pack_Digital_Twin_UI_UX_Design_Specification.md`

---

## 1. Purpose

Dokumen ini menjadi instruksi untuk melakukan riset visual lanjutan pada website dan showcase yang telah dipilih. Tujuannya bukan menyalin website referensi, melainkan mengidentifikasi pola visual, interaksi, motion, struktur informasi, dan teknik presentasi yang relevan untuk EV Battery Pack Digital Twin.

**Research-only phase.** Jangan mengimplementasikan website atau mengubah source code proyek. Hasil yang diminta adalah evidence board, screenshot, catatan analisis, dan rekomendasi desain.

## 2. Approved Direction to Research

| Area | Direction |
|---|---|
| Landing page | NVIDIA Omniverse cinematic/futuristic + Siemens industrial/enterprise clarity |
| 3D model | Precision CAD / Engineering Exploded View |
| Animation | C3 Cinematic 360° + C1 Guided Exploded Assembly |

Research harus menjawab:
- Elemen apa yang membuat referensi terasa premium dan profesional?
- Pola apa yang dapat diterapkan tanpa meniru desain proprietary?
- Bagaimana pengalaman tetap informatif untuk engineer dan fleet manager?
- Apa yang realistis dilakukan dengan React + Three.js/WebGL?

## 3. Three Primary Visual References

**Status per 14 November 2026 (teramati saat riset Phase 1):** halaman Reference 01 sudah dihapus penerbitnya (HTTP 404). Viewer 3D Reference 03 tidak tampil (area kosong; resource-nya 404). Rincian: `docs/design-research/README.md`.

Tiga gambar berikut dipilih sebagai visual anchors awal. Gambar adalah contoh referensi, bukan aset yang boleh langsung dipakai sebagai asset produk. Buka halaman sumber untuk konteks penuh, screenshot halaman pada kondisi aktual, dan dokumentasikan tanggal pengambilan.

### Reference 01 — Industrial Digital Twin / Landing Visual

**Source:** NVIDIA — BMW factory digital twin case study  
**Page:** https://www.nvidia.com/en-us/case-studies/paving-the-future-of-factories-with-nvidia-omniverse/  
**Image source:** https://images.nvidia.com/aem-dam/Solutions/wordpress/P90417349_highRes-1.jpg

![NVIDIA BMW factory digital twin visual reference](https://images.nvidia.com/aem-dam/Solutions/wordpress/P90417349_highRes-1.jpg)

**Why it fits**
- Dark, cinematic industrial environment.
- Technical wireframe and rendered geometry coexist.
- Gives a sense of scale, engineering precision, and simulation.
- Useful as a reference for hero lighting, contrast, and technical visual language.

**What to implement from the reference**
- A dark, restrained hero environment.
- A hero composition with a large 3D battery pack as the visual focal point.
- Controlled technical overlays and small data labels, only when meaningful.
- A professional hierarchy for headline, product description, and CTA.
- Industrial credibility inspired by Siemens: clear sections, capability statements, use cases, and methodology.

**What NOT to copy**
- BMW vehicle, factory scene, NVIDIA branding, logos, copy, or proprietary visual assets.
- A factory-like environment that is unrelated to a battery product.
- Dense technical overlays that make the hero unreadable.

### Reference 02 — Precision Battery Pack CAD / Exploded View

**Source:** E-Mobility Engineering — battery pack construction illustration  
**Page:** https://www.emobility-engineering.com/sealing-solutions/  
**Image source:** https://www.emobility-engineering.com/content/uploads/2021/09/battery-pack-cylindrical-cell-plate-interior-teardown-illustration-min-1365x1536.png

![EV battery pack exploded engineering reference](https://www.emobility-engineering.com/content/uploads/2021/09/battery-pack-cylindrical-cell-plate-interior-teardown-illustration-min-1365x1536.png)

**Why it fits**
- Shows a layered battery pack structure.
- Helps communicate the relationship between enclosure, modules/cells, busbars, and cooling plate.
- Supports the precision CAD / engineering direction better than abstract sci-fi battery imagery.
- Useful as a reference for component separation and assembly hierarchy.

**What to implement from the reference**
- A technically plausible exploded assembly.
- Separate selectable meshes for upper/lower enclosure, cells/modules, busbars, thermal layers, and cooling plate.
- Clear spatial relationships and assembly axes.
- Material differentiation and restrained engineering lighting.
- Component labels and inspector data linked to stable mesh IDs.

**What NOT to copy**
- Treat the pictured design as a universal EV battery layout.
- Assume every battery pack has the same cooling plate or module construction.
- Reuse the image or its geometry as a production asset without permission.
- Invent hidden details that are not supported by the selected reference battery architecture.

### Reference 03 — Interactive 3D Viewer / Exploded Animation

**Source:** Sequenz — WebGL Viewer Multifix  
**Page:** https://sequenz.com/sneak-peeks/webgl-viewer-multifix  
**Image source:** https://sequenz.com/media/pages/sneak-peeks/webgl-viewer-multifix/dc91eb7fd5-1719566769/sequenz_se_multifix_webgl_screenmovie_1200x630.jpg

![Sequenz interactive WebGL exploded product viewer reference](https://sequenz.com/media/pages/sneak-peeks/webgl-viewer-multifix/dc91eb7fd5-1719566769/sequenz_se_multifix_webgl_screenmovie_1200x630.jpg)

**Why it fits**
- Presents a dark 3D product viewport.
- Internal parts are separated and remain visually related to the assembled product.
- A useful reference for C1 guided exploded inspection and 3D product presentation.
- Can inform camera control, component focus, and 360° exploration.

**What to implement from the reference**
- User-controlled orbit, pan, and zoom.
- A cinematic assembled state (C3) with subtle auto-rotation that stops on interaction.
- A separate guided exploded mode (C1) with staged, deterministic component movement.
- Focus-camera transitions when a component is selected.
- Pause, reverse, reset, and reduced-motion behavior.
- Clear separation between presentation motion and engineering inspection controls.

**What NOT to copy**
- The reference product geometry, branding, colors, or exact interaction design.
- Continuous rotation that interferes with inspection.
- Exploded movement that obscures component relationships.

---

## 4. Supporting Sources to Inspect

### Landing page / industrial digitalization

1. NVIDIA Omniverse: https://www.nvidia.com/en-us/omniverse/  
   Inspect hero composition, typography, section hierarchy, industrial use cases, and how simulation-ready 3D assets are described.

2. NVIDIA Industrial Facility Digital Twins: https://www.nvidia.com/en-us/use-cases/industrial-facility-digital-twins/  
   Inspect how technical capability, operational benefits, and enterprise messaging are connected.

3. Siemens Digital Transformation: https://www.siemens.com/en-us/company/digital-transformation/  
   Inspect structured enterprise storytelling, content hierarchy, and industrial credibility. Use as a secondary influence, not a layout to clone.

### Battery model / engineering visualization

4. MDPI — Design, Prototyping, and Integration of Battery Modules: https://www.mdpi.com/2673-4826/6/4/63  
   Inspect CAD pack/module views and sectional cooling-channel details. Use the paper as technical context; confirm applicability before using parameters.

5. MathWorks — Electrothermal Modeling and Analysis of Battery Packs (PDF): https://fr.mathworks.com/content/dam/mathworks/mathworks-dot-com/images/events/automotive/de-mac-2023/electrothermal-modeling-and-analysis-of-battery-packs.pdf  
   Inspect the pack/cooling plate assembly and relationship between cells and liquid cooling.

6. COMSOL — Optimizing Battery Pack Lifetime Using Simulation-Aided Design: https://www.comsol.com/blogs/optimizing-battery-pack-lifetime-using-simulation-aided-design  
   Inspect how thermal simulation results and engineering explanations are presented.

### 3D interaction / motion

7. Product Viewer Web (Three.js/WebGPU): https://github.com/Elia-Youssef/interactive-web-product-showcase  
   Inspect the documented interaction patterns, product manifest concept, exploded view, and WebGL fallback. Treat this as a technical reference; inspect license before reusing code.

8. INTR Interactive 3D Product Page: https://www.3dintr.com/en/services/interactive-3d-product-page/  
   Inspect 360° interaction, hotspots, and exploded product storytelling.

9. Awwwards — 3D Scroll / My Gest: https://www.awwwards.com/inspiration/3d-scroll-my-gest  
   Inspect how scroll-driven motion can tell an assembly story. Do not adopt scroll hijacking if it harms accessibility.

---

## 5. Required Browser Research Procedure

Use a browser with desktop and mobile viewport support (for example, Playwright, browser devtools, or an approved browser automation tool).

For each primary reference:

1. Open the actual source page, not only the direct image URL.
2. Record the exact URL and date/time accessed.
3. Capture a full-page screenshot at desktop width (suggested 1440 × 1000 viewport).
4. Capture the hero/primary interaction region separately.
5. Capture a mobile screenshot (suggested 390 × 844 viewport).
6. If there is interactive 3D:
   - capture assembled/default state;
   - capture one orbit angle;
   - capture exploded state;
   - capture selected-component or hotspot state if present;
   - capture relevant motion as a short screen recording or GIF where permitted.
7. Record what interaction was performed to obtain each state.
8. Add a short note describing what is observed versus what is inferred.
9. If the website blocks automated access, use a normal browser manually. Do not bypass access controls or scrape restricted resources.
10. If a reference has changed or is unavailable, record that fact and choose a clearly labeled alternative.

### Evidence folder convention

```text
docs/
  design-research/
    README.md
    screenshots/
      nvidia/
        desktop-full.png
        desktop-hero.png
        mobile.png
        interaction-01.png
      battery-cad/
        source-page.png
        exploded-view.png
        detail-view.png
      sequenz/
        desktop-viewer.png
        assembled-state.png
        exploded-state.png
        interaction-recording.mp4
    notes/
      landing-page-analysis.md
      battery-model-analysis.md
      animation-analysis.md
```

Do not invent screenshot paths. Only list files that have actually been captured and saved.

## 6. Analysis Template for Every Screenshot

For each screenshot, document:

| Field | Description |
|---|---|
| Reference ID | Unique ID, e.g. `REF-LP-01` |
| Source | Page URL |
| Capture date | Actual date of capture |
| Viewport | Desktop/mobile dimensions |
| State | Hero, assembled, exploded, selected component, etc. |
| Observations | What is visibly present |
| Interaction | What action produced the state |
| Adopt | Which pattern is relevant to our product |
| Adapt | What must change for EV battery context |
| Reject | What should not be copied |
| Implementation implication | Design/3D/animation requirement |
| Confidence | High / medium / low |

## 7. What the Research Must Translate Into Our Product

### 7.1 Landing page

Deliver:
- hero composition proposal.
- background and lighting treatment.
- typography and CTA hierarchy.
- section order and content density.
- industrial/enterprise information patterns.
- desktop and mobile screenshots or wireframes.

### 7.2 3D model

Deliver:
- proposed assembled view.
- proposed exploded view.
- component hierarchy and IDs.
- material treatment board.
- LFP and NMC model differences.
- asset complexity/performance estimate.
- source asset/license notes.

### 7.3 Animation

Deliver:
- C3 camera/orbit storyboard.
- C1 exploded sequence storyboard.
- camera focus transition storyboard.
- X-Ray/clipping transition storyboard.
- timing/easing proposal.
- reduced-motion and mobile behavior.

## 8. Technical Feasibility Notes

- Browser 3D implementation can use Three.js / React Three Fiber, but final choices depend on the existing project architecture.
- GLB/glTF is a reasonable runtime asset format; keep editable source assets separately.
- Use mesh instancing where many repeated cells are present.
- Use clipping planes for cross-section prototypes, but verify material and geometry behavior.
- Use explicit transforms for exploded view rather than relying on arbitrary physical simulation.
- Use progressive loading, LOD, and static fallbacks.
- Do not promise 60 FPS until profiling on target hardware.
- Reference websites may use proprietary rendering pipelines; reproduce the design outcome with feasible web technologies rather than assuming their implementation can be copied.

## 9. Asset, Copyright, and Licensing Rules

- Screenshots are research evidence, not production assets.
- Do not download and embed third-party assets into the app without checking license and permission.
- Do not copy logos, trademarks, brand identity, text, source code, or exact layouts.
- Record the author/owner and license for any 3D model considered for use.
- Prefer original CAD/Blender assets or explicitly licensed models.
- If a source requires login or restricts downloads, do not attempt to bypass it.
- Attribute reference material in internal research documentation.

## 10. Deliverables and Approval Gate

Research is complete only when these deliverables exist:

- [ ] Three primary reference pages reviewed.
- [ ] Desktop and mobile screenshots captured for each accessible source.
- [ ] Interactive states captured where relevant.
- [ ] Evidence folder populated with actual files.
- [ ] Analysis notes completed for all three design pillars.
- [ ] Adopt / Adapt / Reject decisions documented.
- [ ] Landing page wireframe proposal ready.
- [ ] 3D asset treatment board ready.
- [ ] C1 and C3 storyboard ready.
- [ ] License/provenance notes recorded.
- [ ] Design review completed and approved.

**Do not begin implementation until the user explicitly approves the research findings and design deliverables.**

## 11. Source Notes

The primary sources are:
- NVIDIA case study and Omniverse pages for industrial digital twin presentation.
- E-Mobility Engineering battery pack illustration for component-layering reference.
- Sequenz WebGL viewer for interactive 3D product/exploded-view patterns.

The sources provide visual and interaction inspiration. They do not establish the correct engineering geometry, thermal parameters, or safety limits for the project's LFP/NMC reference packs. Those require separate technical validation.
