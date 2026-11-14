# Laporan Investigasi & Perbaikan Playback Heatmap Situs Live — EV Pack Twin

**Tanggal:** 15 November 2026  
**Ruang kerja:** `/Users/orl123456/Documents/EVIndustry`  
**Commit dasar (`HEAD`):** `eee2cfd` (`perf: smooth 3D rendering, heatmap playback, and hover picking`, `2026-11-15 02:25:54 +0800`)

> Seluruh perubahan **dibiarkan uncommitted** di working tree. Tidak ada `git commit`, `git push`, pembuatan tag, maupun perubahan identitas Git. Tidak ada perubahan pada angka fisika, data, parameter register, maupun klaim ilmiah.

---

## 1. Penyebab yang Terkonfirmasi & Bukti Instrumentasi

### A. Temuan saat reproduksi di live & perbedaan CDN vs lokal
1. **Bukti live saat tugas dimulai (`02:38–02:42 +0800`):**
   - Menjalankan `node docs/handoff/probe_playback.mjs https://orls967.github.io/EVIndustry3D/` sebanyak **4 kali** (3 run standar dan 1 run dengan emulasi jaringan `LAT=150`) semuanya langsung mencatat:
     - `rafPerSec`: `61`
     - `drawFramesPerSec`: **`60.5`** (`before: "00:40 / 58:44"`, `after: "03:20–03:30 / 58:44"`)
   - Menjalankan `node docs/handoff/measure_smoothness.mjs https://orls967.github.io/EVIndustry3D/` juga mencatat `nmcHeatmapPlayback` **`240` renders, `60` fps, `p50: 16.6 ms`, `p95: 17.5 ms`, `max: 18.1 ms`, `gaps50: 0`, `loafCount: 0`**, dan `nmcDrag` `60 fps` (`loafCount: 0`).
2. **Penjelasan mengapa rekaman sebelumnya (`02:35 +0800`, `docs/handoff/smoothness-after-live.json`) masih menunjukkan `13.8 fps` / `11.5–15 fps`:**
   - Header HTTP situs live yang diambil via `curl -sI https://orls967.github.io/EVIndustry3D/` menunjukkan:
     - `last-modified: Sat, 14 Nov 2026 18:28:35 GMT` (`02:28:35 +0800`)
     - `cache-control: max-age=600` (TTL CDN Fastly GitHub Pages = 10 menit)
     - `age: 412` pada `date: Sat, 14 Nov 2026 18:39:35 GMT` (berarti POP CDN `cache-sin-wsap440043-SIN` baru memperbarui cache `index.html` sekitar `18:32:43 GMT` / `02:32:43 +0800`, dan POP lain memiliki `max-age=600` hingga `18:38:35 GMT` / `02:38:35 +0800`).
   - Pada `docs/handoff/smoothness-after-live.json` (dibuat `02:35 +0800`), stack LoAF pada `nmcDrag` masih mencantumkan **`"@three-CSXGxhrc.js:5"` / `"zv@three-CSXGxhrc.js:40"`**, yakni hash bundle `three` sebelum commit `eee2cfd`, sedangkan bundle `eee2cfd` di live saat ini (dan di build lokal) menggunakan **`three-B9hfL9w8.js`** (`965,360` byte), `PackCanvas-yXmo_tsT.js`, dan `ev_pack_wasm_bg-KGpvfzZH.wasm` (`287,657` byte, dibanding `284,002` byte lokal).
   - **Kejujuran reproduksi lokal:** gejala `11.5–15 drawFramesPerSec` pada build `eee2cfd` **tidak tereproduksi secara lokal** baik lewat HTTP preview (`/EVIndustry3D/`) maupun origin **HTTPS** lokal (`https://127.0.0.1:4177/EVIndustry3D/` dengan sertifikat self-signed) — keduanya langsung berjalan di `60.5–61 drawFramesPerSec`.

### B. Bukti Instrumentasi & Kerentanan Struktural pada `frameloop="demand"` R3F
Untuk memastikan tidak ada kelemahan tersembunyi di driver animasi, dilakukan instrumentasi sementara (`window.__drvDiag`, sudah dihapus kembali) di [`SceneAnimationDrivers`](file:///Users/orl123456/Documents/EVIndustry/app/src/scene/PackCanvas.tsx#L48) pada build subpath HTTPS lokal (`https://127.0.0.1:4177/EVIndustry3D/`):

- `probe`: `rafPerSec: 61.5`, `drawFramesPerSec: 61`, `before: "00:40 / 58:44"`, `after: "03:30 / 58:44"`
- `useFrameCalls`: **`153`** dalam jendela ukur (~2,5 s dari klik `Play`)
- `invalidateCalls`: **`154`**
- `invalidateChanges`: **`0`** (identitas `invalidate` dari `useThree()` stabil sepanjang playback)
- `glChanges`: **`0`** (`WebGLRenderer` / canvas root tidak pernah di-recreate)
- `frameloops`: **`["demand"]`**
- `internalFramesSamples` (dibaca di awal `useFrame`): `[2, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 1]`

**Analisis kode sumber `@react-three/fiber` (`app/node_modules/@react-three/fiber/dist/events-e51d7528.esm.js` baris `17539–17609`):**
- Saat `frameloop === "demand"`, pola memanggil `invalidate()` di dalam `useFrame` bergantung pada variabel global modul R3F `useFrameInProgress`:
  - Jika `useFrameInProgress === true`, `invalidate()` menyetel `state.internal.frames = 2`, lalu di akhir `update()` nilai tersebut dikurangi 1 (`2 - 1 = 1`) sehingga loop rAF terus berlanjut (`repeat > 0`).
  - Namun, bila ada pemanggilan `invalidate()` dari luar `useFrame` (`useFrameInProgress === false`, misalnya dari effect React, subscription store, atau interaksi pointer/UI) dengan parameter bawaan `frames = 1`, R3F mengeksekusi **`state.internal.frames = 1`** secara langsung (baris `17601`), menimpa nilai `2` menjadi `1`. Saat `update()` selesai, `frames` dikurangi menjadi `0` (`repeat === 0`), **mematikan loop rAF demand** hingga event eksternal berikutnya — yakni penulisan store `setPlaybackSampleIndex(intIdx)` setiap 120 ms (~8,3 Hz, sehingga hanya tersisa ~8–15 draw frame/detik sementara `requestAnimationFrame` halaman tetap 60/detik).

---

## 2. Perubahan yang Dilakukan & Mengapa Mengatasi Penyebab

- **File & fungsi:** [`app/src/scene/PackCanvas.tsx`](file:///Users/orl123456/Documents/EVIndustry/app/src/scene/PackCanvas.tsx#L48-L115) — fungsi [`SceneAnimationDrivers`](file:///Users/orl123456/Documents/EVIndustry/app/src/scene/PackCanvas.tsx#L48).
- **Detail perubahan:**
  1. Mengambil `invalidate` dan `setFrameloop` secara selektif via `useThree((s) => s.invalidate)` dan `useThree((s) => s.setFrameloop)`.
  2. Menghitung `isContinuousAnimating = Boolean(playbackPlaying && effectiveResult && effectiveResult.nSamples > 1) || explodePlaying`.
  3. Melalui `useEffect`, selama `isContinuousAnimating` bernilai `true`, memanggil `setFrameloop("always")` dan `invalidate()` awal; saat berhenti/jeda atau unmount, cleanup `useEffect` memanggil `setFrameloop("demand")`.
  4. Menghapus panggilan `invalidate()` berulang di setiap tick `useFrame` selama animasi kontinu, dan hanya memanggil `invalidate()` satu kali saat animasi explode mencapai `100%` (agar frame akhir tetap tergambar setelah kembali ke `"demand"`).
- **Mengapa mengatasi penyebab:**  
  Pada `update()` R3F (`events-e51d7528.esm.js` baris `17541`), selama `state.frameloop === "always"`, `update()` selalu mengembalikan `1` tanpa membaca `state.internal.frames`. Oleh karena itu, playback heatmap maupun animasi explode tidak pernah bisa terhenti oleh kondisi balapan `useFrameInProgress` atau penimpaan `state.internal.frames` dari mana pun, terlepas dari origin (HTTP/HTTPS), urutan load chunk, atau timing event. Ketika animasi berhenti/dijeda, canvas langsung kembali ke `"demand"` sehingga scene diam tetap `0 renders/s` (hemat GPU/baterai).

---

## 3. Angka Probe Sebelum / Sesudah (`probe_playback.mjs`)

| Target Pengukuran | Sebelum: `rafPerSec` | Sebelum: `drawFramesPerSec` | Sebelum: Timeline (2 s) | Sesudah: `rafPerSec` | Sesudah: `drawFramesPerSec` | Sesudah: Timeline (2 s) |
|---|---:|---:|---|---:|---:|---|
| Live `https://orls967.github.io/EVIndustry3D/` | 61 *(saat prompt ditulis)* | 11.5–15 *(3 run di prompt; CDN lama)*; 60.5 *(post-TTL `eee2cfd` pada 02:38–02:42)* | `00:20 → 03:00` / `00:40 → 03:30` | *(belum di-push sesuai aturan)* | *(sama seperti post-TTL lokal/HTTPS; siap deploy)* | — |
| Lokal HTTP preview (`/EVIndustry3D/`) | 61 | 60.5 | `00:40 → 03:30` | **61** | **60.5** | `00:40 → 03:20` |
| Reproduksi HTTPS lokal (`https://127.0.0.1:4177/EVIndustry3D/`) | 61.5 *(instrumented `eee2cfd`)* | 61 | `00:40 → 03:30` | **61** | **60.5** | `00:40 → 03:30` |

*(Semua angka sesudah pada tabel diukur setelah edit final `setFrameloop("always"/"demand")` dan penghapusan seluruh instrumentasi.)*

---

## 4. Hasil Seluruh Check di Acceptance Criteria

Semua check di bawah dijalankan **setelah edit final** dan penghapusan instrumentasi sementara:

1. **`probe_playback.mjs` (HTTP lokal `/EVIndustry3D/` & HTTPS lokal):**
   - HTTP lokal `http://127.0.0.1:4174/EVIndustry3D/`: `rafPerSec: 61`, **`drawFramesPerSec: 60.5`** (`≥ 55` **LULUS**).
   - HTTPS lokal `https://127.0.0.1:4177/EVIndustry3D/` (`--ignore-certificate-errors`): `rafPerSec: 61`, **`drawFramesPerSec: 60.5`** (`≥ 55` **LULUS**).
2. **`measure_smoothness.mjs` pada local preview `/EVIndustry3D/` (`docs/handoff/smoothness-after-local.json`):**
   - `landingAutoRotate`: `240` renders · **60 fps** · `p50 16.7` · `p95 17.5` · `max 17.6` · `gaps50: 0` · `loafCount: 0`
   - `lfpAutoOrbit`: `240` renders · **60 fps** · `p50 16.7` · `p95 17.5` · `max 18.1` · `gaps50: 0` · `loafCount: 0`
   - `nmcAutoOrbit`: `240` renders · **60 fps** · `p50 16.6` · `p95 17.5` · `max 17.8` · `gaps50: 0` · `loafCount: 0`
   - `nmcHover`: `179` renders · **59.7 fps** · `p50 16.7` · `p95 17.6` · `max 46.8` · `gaps50: 0` · `loafCount: 0`
   - `nmcDrag`: `180` renders · **60 fps** · `p50 16.7` · `p95 17.6` · `max 18.1` · `gaps50: 0` · `loafCount: 0`
   - `nmcExplodePlay`: `182` renders · **60 fps** · `p50 16.6` · `p95 17.3` · `max 18.2` · `gaps50: 0` · `loafCount: 0`
   - `nmcHeatmapPlayback`: `239` renders · **60 fps** · `p50 16.7` · `p95 17.4` · `max 18.3` · `gaps50: 0` · `loafCount: 0`
   - `compare` (diam): `0` renders · `"demand"` pulih penuh
   - `compareDrag`: `180` renders · **60 fps** · `p50 16.6` · `p95 17.6` · `max 17.9` · `gaps50: 0` · `loafCount: 0`
   → **Semua skenario ≥ 55 fps, p95 ≤ 20 ms, 0 frame > 50 ms, 0 LoAF.**
3. **Hasil simulasi NMC "normal" (tidak berubah):**
   - `Max temperature`: **`32.1 °C`**
   - `Pack average`: **`30.1 °C`**
   - `Zone spread ΔT`: **`3.0 °C`**
   - `Hottest zone`: **`pack.zone_12`**
   - `Heat removed`: **`73.7 %`**
   - `Coolant ΔT / Re`: **`3.4 °C · Re 267`**
4. **`cd engine && cargo test`:** **LULUS** (`ev_pack_core`: `4 passed; 0 failed; 0 ignored`; `ev_pack_wasm`: `0 passed; 0 failed`).
5. **`cd analysis && .venv/bin/python -m pytest -q`:** **LULUS** (`10 passed in 6.52s`).
6. **`cd app && npm run validate:data`:** **LULUS** (`Schema check complete: 11 file(s) checked, 0 failed.`).
7. **`cd app && npm run typecheck`:** **LULUS** (`tsc --noEmit`, exit code 0).
8. **`cd app && npm test` (`vitest run`):** **LULUS** (`4` file test passed, **`17 passed (17)`**).
9. **Subpath build & E2E (`VITE_BASE_PATH=/EVIndustry3D/ npm run build` + `E2E_SUBPATH=/EVIndustry3D/ node scripts/verify_e2e_m4_m6.mjs subpath`):** **LULUS** (`subpathSimulationOk: true`, `consoleErrors: []`, `failedRequests: []`, `externalRequests: []`).
10. **Main build & E2E (`npm run build` + `node scripts/verify_e2e_m4_m6.mjs main`):** **LULUS** (semua assertion `landing`, `journeyA`, `journeyB`, `journeyC`, `methodology`, `responsive`, `keyboard`, `reducedMotion`, `webglFallback` = `true`; **0 pelanggaran axe** di 7 rute/viewport; `consoleErrors: []`, `failedRequests: []`, `externalRequests: []`).

---

## 5. Daftar File yang Berubah (`git status --short`)

```text
 M app/src/scene/PackCanvas.tsx
 M docs/handoff/smoothness-after-local.json
?? docs/handoff/2026-11-15-live-playback-fix-prompt.md
?? docs/handoff/2026-11-15-live-playback-fix-report.md
?? docs/handoff/probe_playback.mjs
?? docs/handoff/smoothness-after-live.json
```

Dikonfirmasi bahwa **tidak ada `git commit`, `git push`, pembuatan tag, maupun perubahan identitas Git** yang dilakukan. Seluruh perubahan tetap uncommitted di working tree.

---

## Catatan validator (15 November 2026)

- Hasil "11,5–15 fps" pada `smoothness-after-live.json` dan probe live sebelumnya **berasal dari bundle lama yang masih disajikan cache CDN GitHub Pages** (`cache-control: max-age=600`). Bukti: jejak Long Animation Frame di file itu memuat `three-CSXGxhrc.js`, yaitu bundle sebelum commit `eee2cfd`. Setelah cache diperbarui, live `eee2cfd` (tanpa perubahan `setFrameloop`) diukur 60,5 draw frame/detik dalam dua run, dengan aset `three-B9hfL9w8.js` dan `PackCanvas-yXmo_tsT.js`.
- Dengan demikian, perubahan `setFrameloop("always"/"demand")` di laporan ini adalah **pengaman tambahan** untuk demand loop, bukan perbaikan atas masalah yang terbukti terjadi di live.
- Pelajaran untuk verifikasi berikutnya: setelah deploy, tunggu cache (±10 menit) atau cek nama aset yang benar-benar dimuat browser (`performance.getEntriesByType('resource')`) sebelum mengukur.
