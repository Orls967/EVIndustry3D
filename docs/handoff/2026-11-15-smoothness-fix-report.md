# Laporan Perbaikan Performa Rendering 3D & State — EV Pack Twin

**Tanggal:** 15 November 2026  
**Ruang kerja:** `/Users/orl123456/Documents/EVIndustry`  
**Lampiran pengukuran mentah:**  
- Baseline live: `docs/handoff/smoothness-baseline-live.json`  
- Sesudah perbaikan (build subpath lokal `/EVIndustry3D/`): `docs/handoff/smoothness-after-local.json`

> Seluruh perubahan **dibiarkan uncommitted** di working tree. Tidak ada `git commit`, `git push`, pembuatan tag, maupun perubahan identitas Git. Angka fisika, data JSON, parameter register, kata-kata klaim ilmiah, serta perilaku aksesibilitas tidak diubah.

---

## 1. Perbaikan per Penyebab (1–8)

### Penyebab 1 — Playback heatmap melompat (`setInterval(120)` + write store global)
- **File & simbol:**
  - `app/src/scene/controllers/playbackController.ts` (baru): `PLAYBACK_SAMPLE_INTERVAL_MS`, `computeFractionalSampleIndex`, `computeThermalResultRange`, `interpolateZoneTemperatures`.
  - `app/src/scene/PackCanvas.tsx`: `SceneAnimationDrivers`, `sampleIndexRef`, `lastCommittedSampleRef`, `colorDirtyRef`, `LiveThermalLegend`, `PackLiveRegion`.
  - `app/src/scene/components/LfpBladeAssembly.tsx` & `app/src/scene/components/Nmc4680Assembly.tsx`: `useFrame`, `applyColors` membaca `sampleIndexRef` dan `interpolateZoneTemperatures`.
  - `app/src/routes/WorkspacePage.tsx`: menghapus `setInterval(..., 120)` di root komponen, memisahkan `PlaybackBottomStrip`.
  - `app/src/scene/scene.test.ts`: menambahkan unit test untuk `interpolateZoneTemperatures`, `computeFractionalSampleIndex`, dan `computeThermalResultRange`.
- **Mengapa memperbaiki penyebab:**  
  Alih-alih menaikkan `simPlaybackSampleIndex` tiap 120 ms lewat timer React yang memicu re-render satu halaman, `SceneAnimationDrivers` menjalankan kemajuan indeks pecahan (fractional sample index) murni di `useFrame` berdasarkan `delta` waktu nyata dan memanggil `invalidate()`. Tiap frame, `LfpBladeAssembly` dan `Nmc4680Assembly` menginterpolasi suhu antarsampel bersebelahan lewat `interpolateZoneTemperatures` dan menulis warna instance langsung ke `InstancedMesh` melalui `setColorAt` + `instanceColor.needsUpdate = true`. Store global (`setPlaybackSampleIndex`) hanya diperbarui ketika indeks bilangan bulat berubah (untuk scrubber, legenda, hotspot card, dan live region), bukan untuk pembaruan visual warna 3D.

### Penyebab 2 — Langganan seluruh store (`useWorkspaceStore()` tanpa selector)
- **File & simbol:**
  - `app/src/routes/WorkspacePage.tsx`: `WorkspacePage`, `PlaybackBottomStrip`, `InspectZoneTempCard`.
  - `app/src/scene/PackCanvas.tsx`: `PackCanvas`, `LiveThermalLegend`, `PackLiveRegion`.
  - `app/src/features/SimulatePanel.tsx`: `SimulatePanel`, `HotspotZonesList`.
  - `app/src/features/ForecastPanel.tsx`: `ForecastPanel`.
  - `app/src/features/DecidePanel.tsx`: `DecidePanel`.
  - `app/src/routes/ComparePage.tsx`: `ComparePage`.
- **Mengapa memperbaiki penyebab:**  
  Seluruh pemanggilan `useWorkspaceStore()` tanpa selector diganti menjadi selector granular per-field (dengan `useShallow` dari `zustand/react/shallow` untuk objek kecil) dan pemanggilan aksi melalui `useWorkspaceStore.getState()` di event handler. Komponen statis/berat seperti `TemperatureVsTimeChart`, panel parameter, daftar komponen, dan canvas induk `WorkspacePage` tidak ikut me-render ulang ketika field yang tidak mereka pakai berubah.
- **Catatan batasan:**  
  Saat `heatmapPlayback` aktif, indeks bilangan bulat tetap di-commit ke store ~8,3 kali/detik agar `PlaybackBottomStrip` (scrubber & waktu `MM:SS`), `HotspotZonesList`, `LiveThermalLegend`, `InspectZoneTempCard`, dan `PackLiveRegion` tetap sinkron dengan tampilan 3D. Karena komponen daun tersebut berada di dalam subtree `<WorkspacePage>`, React `<Profiler id="WorkspacePage">` tetap mencatat ~9 subtree commit/detik untuk daun UI tersebut, sedangkan fungsi komponen `WorkspacePage` itu sendiri serta scene 3D tidak di-render ulang oleh perubahan `simPlaybackSampleIndex`.

### Penyebab 3 — Telemetri render menulis state React & store global tiap ~400 ms dan angkanya keliru saat idle
- **File & simbol:**
  - `app/src/scene/components/CameraAndClipControllers.tsx`: `CameraRig` (efek `addAfterEffect` dari `@react-three/fiber` dan `telemetryElRef`).
  - `app/src/scene/PackCanvas.tsx`: elemen pill telemetri DOM via `telemetryElRef`, penghapusan state lokal metrik & penulisan store per sampel (`setSceneRenderMetrics` tidak lagi dipanggil setiap frame render loop).
- **Mengapa memperbaiki penyebab:**  
  `CameraRig` melampirkan listener ke `addAfterEffect` dan memfilter hanya ketika `gl.info.render.frame` benar-benar bertambah. Teks telemetri ditulis langsung via `telemetryElRef.current.textContent` sehingga menghasilkan **0 React commit** dan **0 store write**. Dalam `frameloop="demand"`, interval > 120 ms diperlakukan sebagai jeda idle antar interaksi sehingga pill menampilkan `"idle"` secara jujur saat diam, dan menampilkan `fps (ms avg)` hanya jika minimal 2 frame aktif berdekatan (`<= 120 ms`) terekam pada jendela ukur.

### Penyebab 4 — Explode playback menulis store global setiap `requestAnimationFrame`
- **File & simbol:**
  - `app/src/scene/PackCanvas.tsx`: `SceneAnimationDrivers`, `explodePercentRef`, `explodeSliderRef`, `explodeLabelRef`, `handleToggleExplodePlay`, `handleExplodeFinished`.
  - `app/src/scene/components/LfpBladeAssembly.tsx` & `app/src/scene/components/Nmc4680Assembly.tsx`: group ref (`upperRef`, `bmsRef`, `cellsGroupRef`, `sideChannelsRef`, dsb.) diperbarui langsung di `useFrame` dari `computeExplodeOffsets(pack.architecture, explodePercentRef.current)`.
- **Mengapa memperbaiki penyebab:**  
  Animasi explode (`EXPLODE_DURATION_MS = 2400`) memajukan `explodePercentRef.current` di `useFrame`, memperbarui posisi `<group>` di 3D dan DOM `explodeSliderRef.current.value` / `explodeLabelRef.current.textContent` secara langsung. Nilai akhir baru di-commit satu kali ke `useWorkspaceStore.getState().setExplodePercent(...)` saat animasi selesai atau dijeda.

### Penyebab 5 — Hover pointer & raycast terhadap `InstancedMesh` + `<Edges>` mahal
- **File & simbol:**
  - `app/src/scene/controllers/instancedPicking.ts` (baru): `pickNmcCylinderCells`, `pickLfpBladeCells`, `InstancePickResult`.
  - `app/src/scene/controllers/sceneInteractionBus.ts` (baru): `createHoverBus`, `HoverBus`.
  - `app/src/scene/components/Nmc4680Assembly.tsx` & `app/src/scene/components/LfpBladeAssembly.tsx`: `customRaycast` dipasang ke `<instancedMesh raycast={customRaycast}>`.
  - `app/src/scene/components/SelectableMesh.tsx`: `SelectablePart`, `OutlineShaderPrewarm`, `SHARED_OUTLINE_MATERIAL` (`<lineSegments>` dengan `THREE.EdgesGeometry` dibuat 1x per geometri dan hanya mengubah `.visible` lewat langganan `hoverBus`; `raycast={_noopRaycast}` pada outline).
  - `app/src/scene/PackCanvas.tsx`: `createCanvasEvents` (membungkus `createPointerEvents` R3F agar mengabaikan `onPointerMove` saat `isOrbitDraggingRef.current === true` dan men-throttle pointer move ke `requestAnimationFrame`), `hoverChipRef` dikontrol DOM langsung (menggunakan `visibility` + `opacity` agar tidak memicu relayout `display: none/block`).
  - `app/src/scene/components/CameraAndClipControllers.tsx`: `OrbitControls` `onStart` / `onEnd` mengatur `isOrbitDraggingRef`.
  - `app/src/scene/scene.test.ts`: unit test akurasi `pickNmcCylinderCells` dan `pickLfpBladeCells`.
- **Mengapa memperbaiki penyebab:**  
  1. Saat orbit drag, tidak ada hover raycast sama sekali (menghilangkan LoAF 52 ms inside three.js raycasting yang muncul pada baseline `nmcDrag`).  
  2. Pointer move di-throttle ke `requestAnimationFrame`.  
  3. Picking instanced cell tidak lagi mengiterasi ribuan segitiga pada 828 silinder (`24` segmen radial) di Three.js `InstancedMesh.raycast`, melainkan melakukan pre-test AABB keseluruhan pack dan uji interseksi analitik silinder vertikal (NMC) atau AABB per sel (LFP), tetap mengembalikan `instanceId`, `distance`, dan `point` yang tepat.  
  4. Hover outline tidak lagi melakukan mount/unmount `<Edges>` atau menghitung `EdgesGeometry` di hover; shader garis `SHARED_OUTLINE_MATERIAL` juga di-prewarm saat mount lewat `OutlineShaderPrewarm` pada `WebGLRenderTarget` 1×1 agar tidak memicu kompilasi PSO `GL_LINES` saat hover pertama kali.  
  5. Chip label hover dan status hover part dikelola di DOM/material/visibility via `hoverBus` + `hoverChipRef` tanpa re-render React.
- **Catatan kecil yang masih tersisa:**  
  Pada sweep hover pertama kali di `nmcHover` headless Chrome, masih tercatat 1 gap 45,7 ms (`gaps33: 1`, `gaps50: 0`, `loafCount: 0`), kemungkinan dari rasterisasi/paint awal chip teks atau inisiasi pointer di Chrome; seluruh frame tetap `< 50 ms` dan `renderFps` 60 fps.

### Penyebab 6 — Draw call & triangle NMC berlipat ganda saat bagian non-sel dipilih ketika heatmap/inspeksi aktif
- **Penjelasan & temuan akar masalah:**  
  Lihat rincian lengkap pada **Bagian 4** di bawah (`Material` pada `MeshStandardMaterial` memakai `side: THREE.DoubleSide` bersama `transparent: true` saat `dimmed = true` tanpa `forceSinglePass: true`).
- **File & simbol:**
  - `app/src/scene/components/SelectableMesh.tsx`: `SelectablePart` (`side: clippingPlanes.length > 0 ? THREE.DoubleSide : THREE.FrontSide`, `forceSinglePass: true`).
  - `app/src/scene/components/Nmc4680Assembly.tsx` & `app/src/scene/components/LfpBladeAssembly.tsx`: material `<instancedMesh>` diberi `side: clippingPlanes.length > 0 ? THREE.DoubleSide : THREE.FrontSide` dan `forceSinglePass: true`.
- **Mengapa memperbaiki penyebab:**  
  `THREE.WebGLRenderer.renderObject` hanya merender satu pass per mesh meskipun `transparent: true` aktif, alih-alih dua pass (`BackSide` lalu `FrontSide`).

### Penyebab 7 — Efek pembaruan `InstancedMesh` menggabung matriks dan warna dalam satu `useEffect`
- **File & simbol:**
  - `app/src/scene/components/Nmc4680Assembly.tsx` & `app/src/scene/components/LfpBladeAssembly.tsx`: memisahkan helper `applyMatrices` dan `applyColors` ke dua `useLayoutEffect`/`useEffect` terpisah, serta menjaga `<instancedMesh visible={cellsVisible}>` tetap terpasang (bukan mount/unmount bersyarat). Komputasi warna per zona dihitung sekali per zona (12 zona untuk NMC, 10 zona untuk LFP) lalu didistribusikan ke 828 / 120 instance.
- **Mengapa memperbaiki penyebab:**  
  Perubahan warna (seleksi, heatmap on/off, perpindahan frame playback) tidak lagi menghitung ulang dan mengunggah 828 `instanceMatrix` (`Matrix4`), dan perubahan offset statis tidak menghitung ulang `instanceColor`.

### Penyebab 8 — Tidak adanya adaptive DPR untuk perangkat lebih lemah
- **File & simbol:**
  - `app/src/scene/controllers/adaptiveDpr.ts` (baru): `AdaptiveDprController`, `DEFAULT_ADAPTIVE_DPR_CONFIG`.
  - `app/src/scene/components/CameraAndClipControllers.tsx`: integrasi `AdaptiveDprController` di `CameraRig` (`useFrame` & `setDpr`), memfilter jeda `frameloop="demand"` (> 120 ms) sebagai idle gap (`idleGapCutoffMs: 120`) agar scene diam tidak disalahartikan sebagai drop FPS.
  - `app/src/scene/scene.test.ts`: unit test histeresis `AdaptiveDprController` termasuk pengecualian idle gap demand-mode.
- **Mengapa memperbaiki penyebab:**  
  Saat `qualityTier` di `High` atau `Medium` (`targetMaxDpr` tetap sesuai pilihan selector kualitas: `High` cap 2 / 1,5, `Medium` 1,5, `Low` 1), jika perangkat mengalami penurunan frame berturut-turut, DPR diturunkan bertahap hingga batas aman lalu dinaikkan kembali secara lambat jika frame kembali cepat, tanpa mengubah arti selector `Quality: High / Medium / Low`.

*(Tambahan lintas-halaman untuk Compare drag):* Di `app/src/routes/ComparePage.tsx` dan `app/src/scene/controllers/sceneInteractionBus.ts`, sinkronisasi kamera tertaut (`createCameraSyncBus`) dialihkan agar tidak memicu write state React pada setiap frame drag di halaman Compare.

---

## 2. Tabel Sebelum / Sesudah (`measure_smoothness.mjs`)

> **Catatan sumber baseline:**  
> - Baseline pada `docs/handoff/smoothness-baseline-live.json` diukur terhadap build live (`https://orls967.github.io/EVIndustry3D/`) sebelum skrip diperluas; karena itu `nmcHover` dan `compareDrag` belum ada di JSON tersebut (`N/A`).  
> - Pada run baseline lokal sebelum perbaikan, `compareDrag` tercatat `60.3 fps · p95 18.2 ms · max 18.8 ms · gaps50 0 · LoAF 0`.  
> - Seluruh angka **Sesudah** di bawah berasal dari `docs/handoff/smoothness-after-local.json` terhadap build subpath lokal (`/EVIndustry3D/`, Chrome headless `--use-angle=metal`, `1440×900` DPR 2).

| Skenario | Sebelum: Renders | Sebelum: FPS | Sebelum: p50 (ms) | Sebelum: p95 (ms) | Sebelum: Max (ms) | Sebelum: Gaps >50 ms | Sebelum: LoAF | Sesudah: Renders | Sesudah: FPS | Sesudah: p50 (ms) | Sesudah: p95 (ms) | Sesudah: Max (ms) | Sesudah: Gaps >50 ms | Sesudah: LoAF |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `landingAutoRotate` | 240 | 60 | 16.7 | 17.2 | 17.8 | 0 | 0 | 240 | 60 | 16.7 | 17.1 | 17.9 | 0 | 0 |
| `lfpAutoOrbit` | 240 | 60 | 16.7 | 17.5 | 18 | 0 | 0 | 240 | 60 | 16.7 | 17.4 | 17.7 | 0 | 0 |
| `nmcAutoOrbit` | 241 | 60 | 16.7 | 17.4 | 17.7 | 0 | 0 | 240 | 60 | 16.7 | 17.3 | 17.8 | 0 | 0 |
| `nmcHover` | *N/A di baseline JSON* | — | — | — | — | — | — | 180 | 60 | 16.6 | 17.6 | 45.7 | 0 | 0 |
| `nmcDrag` | 179 | 59.8 | 16.7 | 17.7 | 37.5 | 0 | 1 (52 ms @ `three`) | 179 | 60 | 16.7 | 17.7 | 18.3 | 0 | 0 |
| `nmcExplodePlay` | 181 | 60 | 16.7 | 17.3 | 17.7 | 0 | 0 | 182 | 60 | 16.6 | 17.4 | 18.1 | 0 | 0 |
| **`nmcHeatmapPlayback`** | **61** | **15.1** | **105** | **133.7** | **133.8** | **32** | **0** | **240** | **60** | **16.6** | **17.6** | **18** | **0** | **0** |
| `compare` (diam) | 0 | 0 | — | — | — | 0 | 0 | 0 | 0 | — | — | — | 0 | 0 |
| `compareDrag` | *N/A di JSON (lokal: 60.3)* | — | — | 18.2 | 18.8 | 0 | 0 | 180 | 60 | 16.6 | 17.6 | 18.3 | 0 | 0 |

---

## 3. React Commits / Detik Sebelum & Sesudah

Diukur pada Vite dev server menggunakan wrapper sementara `<React.Profiler id="WorkspacePage" onRender={...}>` di `app/src/App.tsx` (dihapus kembali setelah pengukuran; `git diff -- app/src/App.tsx` bersih):

| Skenario | Sebelum (commits/detik) | Sesudah (commits/detik) | Keterangan |
|---|---:|---:|---|
| `orbitDrag` | **8.40** (21 commits / 2,5 s) | **0.20** (1 commit / 5,02 s) | Tidak ada commit React per frame orbit maupun telemetri; 1 commit berasal dari interaksi klik/hover awal. |
| `explodePlayback` | **61.60** (154 commits / 2,5 s) | **1.60** (4 commits / 2,5 s) | Animasi explode berjalan di `useFrame` + DOM slider ref; commit hanya terjadi saat tombol play/state akhir berubah. |
| `heatmapPlayback` | **9.33** (28 commits / 3,0 s) | **9.00** (27 commits / 3,0 s) | Komponen root `WorkspacePage` & 3D Canvas tidak lagi re-render; ~9 subtree commits/s pada `<Profiler id="WorkspacePage">` merupakan pembaruan komponen daun UI (`PlaybackBottomStrip`, `HotspotZonesList`, `LiveThermalLegend`, `PackLiveRegion`) saat indeks sampel bilangan bulat berganti setiap 120 ms, sedangkan animasi warna 3D berlangsung mulus pada 60 fps di `useFrame`. |

---

## 4. Draw Calls & Triangles NMC (Penjelasan Penyebab 6)

### Pengamatan sebelum vs sesudah
- **Keadaan normal (heatmap mati, tanpa seleksi):** `31 calls · 79,848 tris` (1 `InstancedMesh` berisi 828 silinder × 96 segitiga = 79.488 tris + 30 `SelectablePart` box × 12 tris = 360 tris).
- **Heatmap aktif tanpa ada part dipilih:** tetap `31 calls · 79,848 tris` baik sebelum maupun sesudah.
- **Sebelum perbaikan, saat heatmap/inspeksi aktif dan ada komponen non-sel dipilih (misalnya `Upper enclosure (lid)`):** telemetri melonjak menjadi **`62 calls · 159,756 tris`** (`zone_12` dipilih: `61–63` calls).
- **Sesudah perbaikan:**
  - Heatmap aktif tanpa seleksi: **`31 calls · 79,848 tris`**
  - Heatmap aktif + `Upper enclosure (lid)` dipilih: **`32 calls · 79,848 tris`** (hanya +1 call untuk garis outline seleksi `<lineSegments>`)
  - Heatmap aktif + `zone_12` (`pack.cells`) dipilih: **`31 calls · 79,848 tris`**

### Mengapa bisa dobel?
Ketika komponen atau zona dipilih, komponen lain diberi status `dimmed = true` yang mengaktifkan `transparent: true` dengan `opacity < 1` pada `MeshStandardMaterial`. Sebelumnya material tersebut juga memakai `side: THREE.DoubleSide` tanpa `forceSinglePass: true`. Pada `THREE.WebGLRenderer.renderObject`, setiap mesh dengan `material.transparent === true && material.side === THREE.DoubleSide && material.forceSinglePass === false` dirender dalam **dua pass** (`BackSide` lalu `FrontSide`). Akibatnya seluruh 29 `SelectablePart` yang diredupkan (29 × 2 = 58 call) plus `InstancedMesh` 828 sel (1 × 2 = 2 call) plus 1 part terpilih + 1 outline menyatu menjadi **62 draw calls** dan hampir **2× jumlah triangles** (`159,756 tris`).  
Perbaikan: menggunakan `THREE.FrontSide` saat clipping plane nonaktif (`DoubleSide` hanya bila `clippingPlanes.length > 0`) dan menetapkan `forceSinglePass: true` pada `MeshStandardMaterial`.

---

## 5. Ringkasan Hasil Semua Test & Verifikasi

Semua pengecekan dijalankan **setelah seluruh edit kode final selesai**:

1. `cd engine && cargo test` → **LULUS**
   - `ev_pack_core`: `4 passed; 0 failed; 0 ignored` (`version_is_non_empty`, `soh_matches_python_vectors_within_0_01_pct`, `v2_v3_v4_verification_checks`, `v6_matches_python_thermal_vectors_within_0_005_c`).
   - `ev_pack_wasm` unit & doc-tests: `0 passed; 0 failed`.
2. `cd analysis && .venv/bin/python -m pytest -q` → **LULUS**
   - `10 passed in 6.38s`.
3. `cd app && npm run validate:data` → **LULUS**
   - `Schema check complete: 11 file(s) checked, 0 failed.`
4. `cd app && npm run typecheck` (`tsc --noEmit`) → **LULUS** (exit code 0).
5. `cd app && npm test` (`vitest run`) → **LULUS**
   - `4 passed (4)` file test, **`17 passed (17)`** test (`protocol.test.ts` 1, `workspaceStore.test.ts` 3, `domain.test.ts` 6, `scene.test.ts` 7).
6. Build produksi:
   - `cd app && VITE_BASE_PATH=/EVIndustry3D/ npm run build` → **LULUS** (`✓ built in 388ms`).
   - `cd app && npm run build` → **LULUS** (`✓ built in 459ms`).
7. `cd app && E2E_SUBPATH=/EVIndustry3D/ node scripts/verify_e2e_m4_m6.mjs subpath` → **LULUS**
   - `subpathSimulationOk: true`, `consoleErrors: []`, `failedRequests: []`, `externalRequests: []`.
8. `cd app && node scripts/verify_e2e_m4_m6.mjs main` → **LULUS**
   - `landing`, `journeyA`, `journeyB`, `journeyC`, `methodology`, `responsive`, `keyboard`, `reducedMotion`, `webglFallback`: seluruh assertion `true`.
   - Audit **axe-core** pada 7 rute/viewport (`landing_1440`, `select_1440`, `workspace_lfp_1440`, `workspace_nmc_1440`, `compare_1440`, `methodology_1440`, `workspace_lfp_390`): **`0` pelanggaran** (`violations: []`).
   - `consoleErrors: []`, `failedRequests: []`, `externalRequests: []`.

*(Verifikasi perilaku tambahan pada build subpath lokal)*:  
- Telemetri menampilkan `"idle"` saat pause/diam (`31 calls · 79,848 tris · idle`) dan nilai aktif jujur saat bergerak/playback (`31 calls · 79,848 tris · 60 fps (16.6 ms avg)`).  
- Selama `heatmapPlayback`, scrubber (`s1="5"` → `s2="14"`), timestamp & SOC (`00:50 / 58:44 · SOC 11%` → `02:20 / 58:44 · SOC 13%`), dan legenda hotspots (`zone_12` `25.3 °C` → `25.8 °C`) tetap bergerak sinkron.

---

## 6. Daftar File yang Berubah (`git status --short`)

```text
 M .DS_Store
 M app/src/features/DecidePanel.tsx
 M app/src/features/ForecastPanel.tsx
 M app/src/features/SimulatePanel.tsx
 M app/src/routes/ComparePage.tsx
 M app/src/routes/WorkspacePage.tsx
 M app/src/scene/PackCanvas.tsx
 M app/src/scene/components/CameraAndClipControllers.tsx
 M app/src/scene/components/LfpBladeAssembly.tsx
 M app/src/scene/components/Nmc4680Assembly.tsx
 M app/src/scene/components/SelectableMesh.tsx
 M app/src/scene/scene.test.ts
?? app/src/scene/controllers/adaptiveDpr.ts
?? app/src/scene/controllers/instancedPicking.ts
?? app/src/scene/controllers/playbackController.ts
?? app/src/scene/controllers/sceneInteractionBus.ts
?? docs/handoff/
```

Catatan: `docs/handoff/` berisi `2026-11-15-smoothness-fix-prompt.md` (input), `smoothness-baseline-live.json` (baseline live), `measure_smoothness.mjs` (skrip ukur yang diperluas untuk `nmcHover` dan `compareDrag`), `smoothness-after-local.json`, dan laporan ini (`2026-11-15-smoothness-fix-report.md`). Tidak ada `git commit`, `git push`, tag, atau modifikasi config Git yang dilakukan.

---

## 7. Hal yang Perlu Dicek Manual di Layar Sungguhan

1. **Layar ProMotion 120 Hz & high-DPI nyata:** Chrome headless pada macOS berjalan di v-sync 60 Hz; uji langsung di MacBook/display 120 Hz untuk memastikan `AdaptiveDprController` (`dpr` 1–2) tidak turun terlalu agresif di frame awal dan transisi playback/orbit terasa 120 Hz yang stabil.
2. **Kelembutan visual transisi warna heatmap & klik sel NMC 4680:** Pastikan gradien interpolasi warna antarsampel terlihat mulus dengan mata telanjang, dan klik langsung ke sel individu di sudut maupun tengah array 828 sel NMC (maupun sel bilah LFP saat `explode > 0`) selalu menyorot sel & zona yang tepat.
3. **Compare page linked camera & clipping plane:** Coba drag kedua kanvas pada `/#/compare` dalam mode linked camera dan aktifkan slider `Cross-section` pada part berlapis (`DoubleSide`) untuk memastikan tidak ada artefak z-fighting atau back-face culling yang mengganggu inspeksi bagian dalam.
4. **Mesin GPU lemah / mode hemat baterai:** Pastikan `AdaptiveDprController` menurunkan DPR secara bertahap bila terjadi frame >22 ms beruntun tanpa memengaruhi label maupun fungsi selector `Quality: High / Medium / Low`.
