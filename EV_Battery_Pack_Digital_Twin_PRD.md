# Product Requirements Document (PRD)
## EV Battery Pack Digital Twin: Interactive 3D Thermal Simulator & Lifecycle Decision Support System

**Versi:** 1.1  
**Tanggal:** 14 November 2026  
**Status:** Diselaraskan dengan keputusan Gate 0–2 (lihat `flow.md` §0 dan `docs/design/07-acceptance-risks-prd-alignment.md` §4). Functional requirements dan acceptance criteria tidak diubah.  
**Bahasa produk:** English-first dengan opsi Bahasa Indonesia  
**Platform:** Responsive web application

---

## 1. Ringkasan Produk

EV Battery Pack Digital Twin adalah platform web interaktif untuk mengeksplorasi anatomi battery pack kendaraan listrik, menjalankan simulasi termal berbasis skenario, membandingkan arsitektur baterai LFP dan NMC, serta menerjemahkan hasil teknis menjadi proyeksi kesehatan baterai dan keputusan perawatan berbasis biaya.

Produk menggabungkan tiga lapisan pengalaman:

1. **Engineering visualization:** model 3D battery pack, exploded view, cross-section/X-ray slicer, component inspector, dan thermal heatmap.
2. **Simulation & analytics:** parameter sandbox, perhitungan termal, perbandingan arsitektur, dan proyeksi State of Health (SoH).
3. **Business decision support:** estimasi biaya perawatan, perbandingan repair-versus-replacement, dan ROI preventive maintenance.

Produk ini ditujukan untuk demonstrasi engineering, pembelajaran, eksplorasi skenario, dan dukungan keputusan awal. Hasil simulasi tidak boleh diposisikan sebagai diagnosis keselamatan atau pengganti pengujian laboratorium, data BMS aktual, maupun prosedur OEM.

## 2. Visi, Tujuan, dan Non-Goals

### 2.1 Visi

Membuat perilaku dan struktur internal battery pack lebih mudah dipahami melalui digital twin interaktif, sekaligus menghubungkan dampak teknis dengan konsekuensi umur pakai dan biaya.

### 2.2 Tujuan produk

- Memvisualisasikan struktur internal battery pack tanpa perlu membongkar unit fisik.
- Menjelaskan perbedaan susunan dan karakteristik arsitektur LFP prismatic/blade dan NMC cylindrical.
- Memungkinkan pengguna mengubah kondisi operasi dan melihat respons termal model.
- Menunjukkan lokasi hotspot serta jalur pelepasan panas menuju sistem pendingin.
- Menampilkan proyeksi SoH multi-horizon berdasarkan skenario dan asumsi yang transparan.
- Menghitung estimasi biaya servis dan membandingkan opsi tindakan.
- Menyediakan pengalaman web yang responsif, mudah dipahami, dan dapat digunakan untuk demo akademis maupun bisnis.

### 2.3 Non-goals untuk versi awal

- Menggantikan perangkat BMS, alat diagnostik OEM, atau sistem keselamatan kendaraan.
- Mengklaim simulasi CFD 3D fidelity tinggi setara solver komersial tanpa validasi eksperimental.
- Menghasilkan diagnosis kerusakan nyata hanya dari model visual atau parameter generik.
- Menyediakan digital twin live dari kendaraan aktual tanpa integrasi telemetri dan autentikasi perangkat.
- Menghasilkan rekomendasi servis yang mengikat secara legal atau keselamatan.
- Memodelkan thermal runaway secara lengkap untuk tujuan sertifikasi keselamatan.
- Mengklaim prediksi SoH dengan akurasi tertentu sebelum tersedia dataset, baseline, dan validasi.

## 3. Target Pengguna dan Jobs-to-be-Done

| Persona | Kebutuhan utama | Pekerjaan yang ingin diselesaikan |
|---|---|---|
| EV Fleet Manager / Operator | Memahami risiko biaya dan umur baterai | Membandingkan skenario pemakaian, biaya perawatan, dan penggantian |
| Teknisi Diagnostik / Automotive Engineer | Memahami struktur dan perilaku termal | Memeriksa komponen, hotspot, dan aliran pendinginan secara visual |
| Mahasiswa / Peneliti | Belajar arsitektur dan prinsip termal | Mengeksplorasi LFP vs NMC dan menguji skenario simulasi |

### 3.1 Hak akses konseptual

Untuk MVP, aplikasi dapat berjalan tanpa akun. Jika autentikasi ditambahkan kemudian:
- **Viewer:** eksplorasi model dan preset skenario.
- **Analyst:** mengubah parameter, menyimpan skenario, membandingkan hasil.
- **Admin/Researcher:** mengelola parameter model, dataset, dan metadata komponen.

## 4. Ruang Lingkup Produk

### 4.1 MVP (wajib)

1. Landing page produk dengan CTA menuju simulator.
2. Simulator workspace dengan pilihan arsitektur LFP dan NMC.
3. Model 3D pack untuk masing-masing arsitektur menggunakan asset 3D terpisah.
4. Orbit, zoom, pan, preset kamera, reset view.
5. Exploded view dengan animasi dan pemilihan komponen.
6. Component inspector yang menampilkan informasi teknis dan fungsi komponen.
7. Cross-section slicer pada minimal satu sumbu di MVP; desain data dan kontrol disiapkan untuk X/Y/Z.
8. Thermal heatmap yang menampilkan distribusi temperatur dari data simulasi.
9. Parameter sandbox: daya pengisian, temperatur lingkungan, dan laju aliran coolant.
10. Preset skenario operasi (normal, hot ambient, fast charging, reduced cooling).
11. Dashboard hasil simulasi: temperatur maksimum, rata-rata, hotspot, dan status relatif terhadap batas model.
12. Comparator LFP vs NMC dengan parameter yang tersedia dan asumsi yang jelas.
13. SoH projection berbasis model baseline/empiris dengan rentang proyeksi 1–8 tahun.
14. ROI / maintenance calculator dengan input biaya yang dapat diedit.
15. Disclaimer model, satuan, asumsi, dan keterbatasan yang terlihat oleh pengguna.

### 4.2 Post-MVP

- Cross-section multi-axis dengan clipping plane yang lebih presisi.
- Visualisasi temperatur internal/core-to-surface jika data/model mendukung.
- Simpan, duplikasi, dan ekspor skenario.
- Ekspor laporan PDF/CSV.
- Dataset baterai eksperimental dan kalibrasi parameter.
- Model degradation berbasis ML yang dilatih dan divalidasi dengan dataset yang relevan.
- Integrasi telemetri BMS atau data fleet.
- Multi-user workspace dan role-based access.
- Thermal runaway propagation untuk riset keselamatan setelah validasi dan safety review.

## 5. Prinsip Produk dan Akurasi Ilmiah

### 5.1 Pisahkan visualisasi, simulasi, dan prediksi

UI harus membedakan:
- **Visual representation:** bentuk dan susunan komponen 3D.
- **Physics simulation:** hasil perhitungan model termal sesuai parameter masukan.
- **Forecast:** estimasi SoH/umur pakai yang bergantung pada model dan asumsi.
- **Business estimate:** estimasi biaya berdasarkan input pengguna.

Jangan menampilkan angka seolah-olah berasal dari sensor nyata apabila angka tersebut merupakan data sintetis atau hasil model.

### 5.2 Transparansi model

Setiap hasil simulasi harus menyediakan:
- status data: `Illustrative`, `Modelled`, atau `Measured`.
- satuan dan rentang parameter.
- asumsi material, geometri, kapasitas, resistance, dan pendinginan.
- versi model/engine.
- timestamp dan konfigurasi skenario.
- catatan bahwa hasil adalah estimasi, bukan sertifikasi atau diagnosis OEM.

### 5.3 Batas klaim

- Hindari klaim “real-time CFD akurat” sebelum dibandingkan dengan hasil solver tervalidasi atau eksperimen.
- Target 60 FPS berlaku untuk rendering dan interaksi 3D pada perangkat yang memenuhi spesifikasi; bukan janji bahwa solver fisika penuh selalu berjalan pada 60 FPS.
- Thermal runaway dan keselamatan tegangan tinggi tidak boleh disederhanakan menjadi indikator hijau/merah yang memberi rasa aman palsu.
- Prediksi SoH harus menampilkan rentang/ketidakpastian jika metodologinya memungkinkan. Jika belum, tampilkan sebagai baseline ilustratif.

## 6. Informasi Arsitektur Baterai

### 6.1 LFP Prismatic / Blade

Informasi yang perlu ditampilkan:
- tipe sel: prismatic/blade (konfigurasi model yang dipilih harus disebutkan secara spesifik).
- tata letak sel/modul.
- busbar dan koneksi listrik.
- cooling plate dan jalur coolant.
- enclosure dan lapisan interface termal.

### 6.2 NMC Cylindrical

Informasi yang perlu ditampilkan:
- tipe sel cylindrical (contoh 4680 sebagai konfigurasi referensi).
- tata letak array sel.
- koneksi seri/paralel dan busbar.
- celah antar-sel dan jalur pendinginan.
- enclosure dan cooling plate.

### 6.3 Aturan komparasi

Jangan mengasumsikan semua LFP selalu lebih aman atau semua NMC selalu lebih padat energi dalam setiap desain. Perbandingan harus berbasis konfigurasi model dan sumber parameter yang ditampilkan. Pengguna dapat melihat:
- chemistry dan form factor.
- konfigurasi seri/paralel.
- kapasitas nominal dan energi.
- massa/volume jika tersedia.
- parameter termal dan resistance jika tersedia.
- jenis pendinginan.
- hasil skenario yang sama pada kedua arsitektur.

## 7. Functional Requirements

### FR-01 — Landing Page

**Deskripsi:** Memperkenalkan platform dan mengarahkan pengguna menuju pengalaman simulator.

**Elemen minimum:**
- hero headline dan subheadline yang menjelaskan manfaat utama.
- visual utama berupa battery pack 3D/thermal visualization.
- CTA utama `Launch Simulator`.
- CTA sekunder `Explore the Technology` atau `How It Works`.
- ringkasan tiga kemampuan: Inspect, Simulate, Decide.
- section arsitektur LFP vs NMC.
- section workflow penggunaan.
- section use cases/persona.
- disclaimer singkat dan footer.

**Acceptance criteria:**
- CTA utama membuka simulator.
- landing page tetap informatif tanpa animasi atau WebGL.
- hero visual memiliki fallback untuk perangkat yang tidak mendukung WebGL.
- navigasi dan CTA dapat digunakan dengan keyboard dan touch.

### FR-02 — Architecture Selection

**Deskripsi:** Pengguna memilih LFP atau NMC sebelum masuk ke simulator.

**Acceptance criteria:**
- pilihan arsitektur terlihat jelas.
- setiap pilihan memiliki ringkasan karakteristik dan spesifikasi model.
- mengganti arsitektur memuat model dan metadata yang sesuai.
- skenario sebelumnya tidak diam-diam diterapkan ke konfigurasi yang tidak kompatibel; tampilkan konfirmasi atau reset yang jelas.

### FR-03 — 3D Viewer

**Kontrol:**
- rotate/orbit.
- zoom in/out.
- pan.
- reset camera.
- preset view: isometric, top, front, side.
- auto-rotate opsional dan dapat dimatikan.

**Acceptance criteria:**
- model tidak terpotong pada ukuran layar yang didukung.
- kontrol touch tersedia di mobile.
- loading state dan error state tersedia.
- kualitas render menyesuaikan kemampuan perangkat.

### FR-04 — Exploded View

**Deskripsi:** Memisahkan komponen battery pack sesuai urutan assembly.

**Komponen yang ditampilkan:**
- upper enclosure.
- lower enclosure.
- BMS/electronics.
- busbars.
- battery cells/modules.
- thermal interface material.
- liquid cooling plate dan coolant channels.

**Catatan v1.1:** daftar komponen berbeda per arsitektur karena letak pendinginnya berbeda (keputusan D2). Pack LFP memakai cold plate di atas sel; pack NMC memakai saluran pendingin di sisi baris sel. Rincian: `docs/design/06-3d-asset-specification.md` §2.

**Acceptance criteria:**
- tombol atau slider mengatur tingkat pemisahan.
- animasi memiliki easing halus dan dapat dihentikan/reverse.
- posisi komponen tidak saling menembus secara mencolok.
- pemilihan komponen tetap berfungsi saat exploded.
- `Reset Assembly` mengembalikan posisi awal.

### FR-05 — Component Inspector

**Data komponen:**
- nama dan kategori.
- fungsi.
- material (jika diketahui).
- lokasi pada pack.
- parameter teknis yang relevan.
- failure modes umum.
- dampak kegagalan.
- status simulasi (jika tersedia).

**Acceptance criteria:**
- klik/tap mesh atau item daftar memilih komponen yang sama.
- komponen terpilih diberi highlight.
- panel detail dapat ditutup dan tidak menutupi kontrol penting.
- konten menjelaskan apakah data merupakan contoh edukatif atau spesifikasi aktual.

### FR-06 — X-Ray / Cross-Section Slicer

**Deskripsi:** Memotong model menggunakan clipping plane untuk melihat bagian dalam.

**MVP:** minimal satu sumbu yang berfungsi penuh, dengan fondasi teknis untuk X/Y/Z.

**Acceptance criteria:**
- pengguna dapat mengaktifkan/nonaktifkan clipping.
- slider menggeser posisi bidang potong.
- orientasi dan arah potongan terlihat.
- tombol reset mengembalikan posisi default.
- clipping tidak merusak atau mengubah geometri sumber.
- kompatibel dengan exploded state atau memberi tahu pengguna bila dua mode tidak dapat digunakan bersamaan.

### FR-07 — Thermal Heatmap

**Deskripsi:** Memetakan nilai temperatur pada permukaan/komponen model.

**Legend:** skala temperatur berlabel angka dan satuan °C. Warna biru-hijau-kuning-merah dapat digunakan, tetapi tidak boleh menjadi satu-satunya pembawa informasi.

**Acceptance criteria:**
- legend selalu menunjukkan rentang aktual skenario.
- nilai minimum, maksimum, dan hotspot ditampilkan.
- pengguna dapat mengaktifkan/nonaktifkan heatmap.
- nilai temperatur dapat diperiksa melalui hover/tap atau daftar hotspot.
- status kritis memakai teks/icon selain warna.
- heatmap berasal dari output engine atau dataset simulasi yang ditandai dengan benar.

### FR-08 — Parameter Sandbox

**Input MVP:**
- charging power (kW).
- ambient temperature (°C).
- coolant flow rate (gunakan satuan yang konsisten, mis. L/min).
- optional: initial SoC / load duration jika model mendukung.

**Fitur:**
- slider dan numeric input.
- preset skenario.
- tombol `Run Simulation`.
- tombol `Reset Parameters`.

**Acceptance criteria:**
- validasi nilai minimum/maksimum.
- nilai dan satuan terlihat.
- preset mengisi semua parameter relevan.
- perubahan input tidak dianggap sebagai hasil baru sampai simulasi dijalankan, kecuali sistem memang mendukung live preview.
- status komputasi: idle, running, completed, failed.

### FR-09 — Thermal Simulation Results

**Metrik MVP:**
- maximum temperature.
- average temperature.
- hottest cell/module identifier.
- temperature spread (max-min).
- cooling condition indicator.
- simulation duration / time horizon.

**Acceptance criteria:**
- hasil terhubung ke ID skenario dan konfigurasi model.
- grafik memiliki sumbu, unit, dan tooltip.
- error solver ditampilkan secara terbaca.
- hasil lama tidak tertukar dengan hasil skenario terbaru.
- setiap hasil memiliki status `Modelled` atau `Illustrative`.

### FR-10 — LFP vs NMC Comparator

**Deskripsi:** Membandingkan dua arsitektur dengan skenario operasi yang sama atau konfigurasi yang dinormalisasi.

**Acceptance criteria:**
- pengguna dapat melihat side-by-side atau toggle compare.
- parameter yang dibandingkan memiliki satuan dan definisi yang sama.
- perbedaan konfigurasi yang tidak setara ditampilkan sebagai catatan.
- heatmap dan metrik hasil dapat dibandingkan.
- tidak menyimpulkan pemenang universal; kesimpulan bergantung skenario.

### FR-11 — SoH & Degradation Forecast

**Input:**
- baseline SoH.
- usage intensity / cycle assumption.
- temperature exposure dari skenario.
- charging/discharging profile jika tersedia.
- model chemistry-specific yang dipilih.

**Output:**
- kurva SoH untuk horizon 1–8 tahun.
- titik waktu ketika SoH mencapai threshold yang dipilih (mis. 80%) jika dapat dihitung.
- perbandingan LFP dan NMC.
- rentang ketidakpastian jika tersedia.

**Acceptance criteria:**
- horizon dapat diubah.
- baseline dan asumsi ditampilkan.
- proyeksi tidak disajikan sebagai kepastian.
- jika input atau dataset tidak memadai, tampilkan `Illustrative projection` dan bukan prediksi ML.
- model ML hanya digunakan setelah training, testing, dan dokumentasi dataset selesai.

### FR-12 — Economic ROI & Maintenance Calculator

**Input editable:**
- biaya inspeksi/servis.
- biaya penggantian modul.
- biaya penggantian pack.
- downtime cost per day (opsional).
- estimasi durasi downtime.
- horizon analisis.
- nilai aset atau biaya awal baterai (opsional).

**Output:**
- estimasi biaya tindakan sekarang.
- estimasi biaya jika tindakan ditunda (berdasarkan asumsi pengguna).
- repair vs replace comparison.
- potential savings.
- ROI atau payback period jika relevan.
- rekomendasi tindakan berbasis aturan yang transparan.

**Acceptance criteria:**
- seluruh angka finansial memiliki sumber: input pengguna atau asumsi default yang diberi label.
- mata uang default IDR dan dapat diubah.
- rumus dapat diperiksa melalui `Calculation details`.
- tidak mengarang harga suku cadang atau biaya servis.
- rekomendasi dinyatakan sebagai estimasi keputusan, bukan instruksi keselamatan.

### FR-13 — Scenario Management

**MVP:** preset skenario bawaan dan kemampuan reset.

**Post-MVP:** simpan, rename, duplicate, compare, dan export skenario.

### FR-14 — Reporting

**Post-MVP:** ekspor ringkasan simulasi ke PDF/CSV dengan konfigurasi, parameter, hasil, asumsi, dan disclaimer.

## 8. User Journey

### Journey A — Eksplorasi anatomi

1. Pengguna membuka landing page.
2. Memilih `Launch Simulator`.
3. Memilih LFP atau NMC.
4. Model 3D tampil dalam assembled state.
5. Pengguna memutar dan memperbesar model.
6. Mengaktifkan Exploded View.
7. Memilih komponen.
8. Inspector menampilkan fungsi, material, dan failure information.
9. Pengguna mengembalikan model ke assembled state.

### Journey B — Simulasi thermal

1. Pengguna memilih arsitektur.
2. Membuka Simulation Parameters.
3. Memilih preset atau memasukkan parameter sendiri.
4. Menjalankan simulasi.
5. Engine menghitung hasil.
6. UI memperbarui heatmap dan metrik.
7. Pengguna membuka hotspot list.
8. Mengaktifkan cross-section untuk melihat area internal yang relevan.
9. Membandingkan hasil dengan skenario lain.

### Journey C — Keputusan servis

1. Pengguna menjalankan simulasi.
2. Membuka SoH Forecast.
3. Memeriksa proyeksi umur dan asumsi.
4. Membuka Maintenance & ROI.
5. Memasukkan biaya modul, pack, dan downtime.
6. Membandingkan tindakan sekarang dengan penundaan.
7. Membaca rekomendasi dan calculation details.

## 9. Information Architecture dan Halaman

| Route konseptual | Halaman | Tujuan |
|---|---|---|
| `/` | Landing | Memperkenalkan produk dan mengarahkan ke simulator |
| `/simulator` | Architecture selection / workspace | Memilih model dan memulai eksplorasi |
| `/simulator/lfp` | LFP workspace | Eksplorasi dan simulasi LFP |
| `/simulator/nmc` | NMC workspace | Eksplorasi dan simulasi NMC |
| `/compare` | Comparator | Perbandingan hasil dua arsitektur |
| `/methodology` | Methodology | Menjelaskan model, sumber data, asumsi, batasan |

Untuk MVP, route dapat disederhanakan menjadi landing dan satu simulator workspace dengan state arsitektur.

## 10. UI/UX Requirements

### 10.1 Arah visual (disetujui)

Arah visual yang disetujui: **Hybrid Industrial Digital Twin Experience** (UI/UX Design Specification §2.1). Token final ada di `docs/design/02-design-system.md`.
- industrial-scientific, bukan gaming/cyberpunk.
- dark graphite/near-black sebagai basis landing page dan workspace.
- cyan/teal sebagai accent untuk data dan kontrol.
- warna thermal map hanya untuk data temperatur.
- tipografi sans-serif modern untuk UI, monospace hanya untuk angka teknis/telemetri.
- panel dan grid yang rapi, hierarchy jelas, whitespace cukup.

### 10.2 Landing page

- hero cinematic yang terinspirasi NVIDIA Omniverse, dengan struktur informasi enterprise yang terinspirasi Siemens (A1 + sebagian A2).
- hero dengan headline yang spesifik dan visual battery pack.
- satu CTA utama yang dominan.
- scroll storytelling singkat: inspect → simulate → forecast → decide.
- jangan membuat landing page terlalu padat dengan seluruh metrik dashboard.
- optimalkan first load dan sediakan poster fallback untuk visual 3D.

### 10.3 Simulator workspace

Layout desktop yang disarankan:
- **Top bar:** logo, architecture switcher, scenario name, status, help.
- **Main viewport:** 3D battery pack, toolbar kamera, exploded, slicer, heatmap.
- **Left panel:** component tree / layer visibility.
- **Right panel:** selected component / simulation parameters / result tabs.
- **Bottom strip:** timeline, simulation playback, temperature legend, status.

Layout mobile:
- viewport 3D menjadi area utama.
- kontrol penting berbentuk toolbar yang mudah dijangkau.
- panel detail tampil sebagai bottom sheet.
- parameter dan hasil berada pada tab/drawer, bukan kolom sempit.
- touch target minimal 44×44 CSS px.

### 10.4 Motion design

Dua mode animasi dengan tujuan berbeda (spesifikasi: `docs/design/03-interaction-motion-specification.md`):
- **C3 — Cinematic 360°:** hero, overview, dan state assembled; berhenti saat pengguna berinteraksi.
- **C1 — Guided Exploded Assembly:** inspeksi komponen; bertahap, deterministik, dapat di-pause, dibalik, dan di-reset.

Animasi harus membantu pemahaman:
- exploded view: gerakan terarah, bertahap, dapat dibalik.
- camera transition: perpindahan halus ke komponen yang dipilih.
- heatmap: transisi temperatur yang halus, tidak berkedip.
- simulation playback: perubahan waktu dapat dikendalikan pengguna.
- page transition: ringan dan tidak menghambat navigasi.

Hindari:
- animasi dekoratif yang terus berjalan tanpa tujuan.
- parallax berlebihan.
- efek glitch/neon yang mengurangi keterbacaan.
- animasi wajib untuk memahami informasi.
- motion yang mengabaikan `prefers-reduced-motion`.

## 11. Technical Architecture (Disetujui di Gate 1–2)

Arsitektur disetujui berdasarkan riset Phase 1 dan desain Phase 2; tidak menunggu proof-of-concept (keputusan D8). Spesifikasi lengkap: `docs/design/04-technical-architecture.md`. Aplikasi sepenuhnya berjalan di browser sebagai situs statis di GitHub Pages; tidak ada backend.

### 11.1 Frontend

- React + TypeScript dengan Vite; routing berbasis hash (`#/simulator/lfp`) agar semua link berfungsi di GitHub Pages.
- Three.js / React Three Fiber untuk rendering 3D.
- Zustand atau state management ringan untuk state workspace.
- charting library untuk SoH, temperature profile, dan cost comparison.
- UI component system dengan design tokens.

### 11.2 3D asset pipeline

**v1.1 (keputusan D9):** geometri dibangun secara prosedural di kode dari data dimensi parametrik (`data/packs/*.json`); tidak ada model 3D unduhan atau aset pihak ketiga. Spesifikasi: `docs/design/06-3d-asset-specification.md`. Butir di bawah tetap berlaku kecuali yang menyebut Blender/GLB.

- ~~Model dibuat/dirapikan di Blender atau CAD pipeline.~~ Diganti geometri prosedural.
- ~~Export GLB/glTF dengan mesh terpisah per komponen.~~ Setiap komponen dibangun sebagai mesh terpisah oleh kode.
- Setiap mesh memiliki stable component ID.
- Asset manifest menyimpan nama, kategori, transform, metadata, dan material.
- Optimasi geometry, texture, LOD, compression, dan loading per model.
- Jangan membuat geometri detail baterai ribuan sel secara naif jika instancing dapat digunakan.

### 11.3 Simulation engine

**v1.1 (keputusan D7):** engine termal dan proyeksi SoH ditulis dalam **Rust**, dikompilasi ke **WebAssembly**, dan berjalan di Web Worker di browser. Rust dipilih untuk tujuan demonstrator, bukan karena hasil benchmark; proyek tidak boleh mengklaim Rust dipilih karena performa terukur. Tidak ada backend service.

MVP disarankan dimulai dengan reduced-order/lumped thermal model yang terukur dan dapat dijelaskan, bukan langsung mengklaim solver CFD penuh. Model harus mendefinisikan:
- heat generation approximation.
- thermal mass dan thermal resistance.
- cell-to-cell thermal coupling.
- boundary conditions.
- coolant heat transfer approximation.
- time step dan stability constraints.

### 11.4 Python (offline)

**v1.1 (keputusan D7):** Python dipakai **offline** di mesin pengembang, tidak berjalan di produksi dan tidak ada FastAPI. Tugasnya:
- mendigitalkan grafik dari sumber menjadi tabel data.
- fitting atau transkripsi koefisien degradasi.
- implementasi model termal pembanding untuk verifikasi silang engine Rust.
- laporan dan grafik validasi.

Kalkulasi ROI yang deterministik berjalan di frontend (TypeScript). ML terlatih tetap Post-MVP.

### 11.5 Data flow

1. UI mengirim `SimulationConfig`.
2. Validation layer memeriksa range, unit, dan compatibility.
3. Simulation engine menerima config + architecture model.
4. Engine mengembalikan time-series/summary thermal output.
5. Frontend memetakan output ke heatmap dan charts.
6. Analytics service menerima output terpilih + usage assumptions.
7. Forecast service mengembalikan SoH projection.
8. Cost calculator menggabungkan hasil forecast, hotspot, dan biaya yang diinput.
9. UI menampilkan hasil bersama provenance dan disclaimer.

### 11.6 Kontrak data konseptual

**v1.1:** kontrak di bawah adalah versi konseptual awal. Kontrak yang berlaku ada di `docs/design/04-technical-architecture.md` §5 (mis. `LFP_BLADE` / `NMC_4680`, status validasi, versi parameter).

```ts
type Architecture = "LFP_PRISMATIC" | "NMC_CYLINDRICAL";

type SimulationConfig = {
  architecture: Architecture;
  chargingPowerKw: number;
  ambientTemperatureC: number;
  coolantFlowLpm: number;
  initialSocPercent?: number;
  durationMinutes: number;
  modelVersion: string;
};

type ThermalResult = {
  scenarioId: string;
  dataStatus: "ILLUSTRATIVE" | "MODELLED" | "MEASURED";
  maxTemperatureC: number;
  averageTemperatureC: number;
  temperatureSpreadC: number;
  hottestComponentId: string;
  timeSeries: Array<{
    timeSeconds: number;
    maxTemperatureC: number;
    averageTemperatureC: number;
  }>;
  componentTemperatures: Array<{
    componentId: string;
    temperatureC: number;
  }>;
  assumptions: string[];
};

type SoHForecast = {
  baselineSohPercent: number;
  horizonYears: number;
  dataStatus: "ILLUSTRATIVE" | "MODELLED";
  points: Array<{
    year: number;
    sohPercent: number;
    lowerBoundPercent?: number;
    upperBoundPercent?: number;
  }>;
  modelName: string;
  assumptions: string[];
};
```

## 12. Data Requirements

### 12.1 Data yang harus disiapkan

- Geometri/model 3D LFP dan NMC.
- Komponen dan metadata per mesh.
- Kapasitas, tegangan, konfigurasi seri/paralel, dan massa/volume jika dipakai.
- Parameter thermal mass, conductivity, heat capacity, resistance, dan cooling boundary.
- Parameter internal resistance dan heat generation yang relevan.
- Coolant properties dan flow assumptions.
- Baseline degradation dataset atau literatur yang dapat ditelusuri.
- Harga modul, pack, inspeksi, servis, dan downtime — atau input manual dari pengguna.
- Referensi sumber dan versi untuk setiap parameter.

### 12.2 Data provenance

Setiap parameter perlu memiliki:
- value dan unit.
- source/reference.
- kondisi pengukuran atau asumsi.
- model applicability.
- confidence/quality note.
- last reviewed date.

### 12.3 Data yang tidak boleh diada-adakan

- harga suku cadang.
- threshold keselamatan universal.
- material property tanpa sumber atau label asumsi.
- data SoH aktual.
- angka penghematan/umur tambahan yang tidak keluar dari model yang terdokumentasi.

## 13. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Performance | Target 60 FPS pada desktop kelas menengah untuk scene yang dioptimasi; graceful degradation pada perangkat lemah |
| Loading | Tampilkan loading/progress untuk asset 3D dan simulasi |
| Responsiveness | Desktop, tablet, dan mobile; mobile dapat menggunakan model dengan detail lebih rendah |
| Accessibility | Keyboard navigation, focus states, contrast memadai, label kontrol, reduced motion |
| Reliability | Error state dan retry untuk model/simulation service |
| Maintainability | Komponen UI, 3D scene, engine, dan analytics dipisahkan |
| Observability | Logging error, simulation duration, model version, dan scenario ID — **MVP: hanya ke console browser; tidak ada data yang dikirim ke mana pun** (Gate 0 Q11, G2-11) |
| Security | Validasi input, sanitasi data, HTTPS; tidak menyimpan data sensitif tanpa kebutuhan |
| Browser support | Versi modern Chrome, Edge, Firefox, Safari; fallback jika WebGL tidak tersedia |
| Localization | Unit dan mata uang eksplisit; format angka sesuai locale |

## 14. Analytics dan Product Success Metrics

**v1.1:** metrik produk di bawah **tidak dikumpulkan di MVP**, karena MVP tidak memiliki layanan analytics atau backend (Gate 0 Q11, G2-11). Metrik ilmiah/teknis tetap diuji di Phase 5.

Metrik produk yang dapat diukur (Post-MVP):
- landing-to-simulator conversion.
- architecture selection rate.
- exploded-view activation rate.
- component inspector interaction count.
- simulation run completion rate.
- scenario comparison usage.
- SoH forecast engagement.
- ROI calculator completion rate.
- median time to first successful simulation.
- WebGL load failure rate dan average frame rate pada perangkat yang diukur.

Metrik ilmiah/teknis yang harus diuji terpisah:
- error terhadap dataset atau eksperimen referensi.
- sensitivitas hasil terhadap perubahan parameter.
- konsistensi unit dan konservasi energi pada model yang digunakan.
- repeatability untuk konfigurasi yang sama.
- forecast error pada data uji yang tidak dipakai saat training.

## 15. Acceptance Criteria Global

MVP dapat dinyatakan siap demo ketika:
1. Pengguna dapat membuka landing page dan masuk simulator.
2. Kedua arsitektur memiliki model dan metadata yang benar.
3. Pengguna dapat rotate, zoom, explode, dan memilih komponen.
4. Inspector menampilkan informasi yang sesuai dengan komponen terpilih.
5. Cross-section minimum satu sumbu dapat digerakkan dan di-reset.
6. Parameter dapat divalidasi dan simulasi dapat dijalankan.
7. Hasil simulasi mengubah heatmap serta metrik yang ditampilkan.
8. Pengguna dapat menjalankan skenario pada kedua arsitektur dan membandingkan hasil.
9. SoH chart dan ROI calculator bekerja dengan asumsi yang terlihat.
10. Semua data sintetis/modelled diberi label.
11. Tidak ada angka biaya atau prediksi yang disajikan sebagai fakta tanpa sumber.
12. Pengalaman inti tetap dapat digunakan pada ukuran tablet dan desktop; mobile memiliki mode interaksi yang layak.

## 16. Risiko, Dependensi, dan Mitigasi

| Risiko / dependensi | Dampak | Mitigasi |
|---|---|---|
| Tidak tersedia CAD battery pack yang terpisah per komponen | Exploded view dan slicer sulit dibuat | Siapkan asset Blender/CAD dengan mesh IDs sejak awal |
| Parameter fisika tidak lengkap | Hasil simulasi tidak kredibel | Mulai dari reduced-order model dan dokumentasikan asumsi |
| Tidak ada dataset degradasi yang cocok | ML SoH tidak valid | Tampilkan baseline ilustratif; tunda klaim ML |
| Scope CFD terlalu besar | Waktu dan kompleksitas membengkak | Pecah menjadi tahapan model termal sederhana → validasi → peningkatan fidelity |
| WebGL berat pada mobile | UX buruk | LOD, instancing, texture compression, quality presets |
| Perbandingan LFP/NMC tidak setara | Kesimpulan menyesatkan | Normalisasi kapasitas/energi atau tampilkan perbedaan konfigurasi |
| Angka biaya tidak tersedia | ROI tidak bermakna | Input manual dan default kosong/placeholder yang diberi label |
| Visual terlihat seperti data sensor aktual | Pengguna salah mengartikan | Badge status data, provenance, timestamp, methodology page |

## 17. Tahapan Pengembangan yang Disarankan

### Phase 0 — Product & technical validation
- finalisasi product scope.
- tetapkan arsitektur referensi dan parameter model.
- audit ketersediaan CAD/3D assets.
- buat proof-of-concept clipping, exploded animation, dan heatmap.
- pilih pendekatan solver berdasarkan benchmark.

### Phase 1 — Visual foundation
- design system.
- landing page.
- simulator shell/layout.
- asset pipeline dan 3D viewer.
- architecture switcher.

### Phase 2 — 3D inspection
- exploded view.
- component tree dan inspector.
- cross-section slicer.
- hotspot selection.

### Phase 3 — Simulation MVP
- parameter sandbox.
- reduced-order thermal engine.
- heatmap dan result charts.
- scenario presets dan comparator.

### Phase 4 — Lifecycle & business analytics
- baseline SoH projection.
- degradation model integration jika dataset siap.
- ROI calculator.
- maintenance decision explanation.

### Phase 5 — Validation & release
- engineering validation.
- responsive/accessibility testing.
- performance profiling.
- usability test.
- dokumentasi model dan disclaimer.

## 18. Manual Preparation Checklist

Hal yang tidak dapat diselesaikan hanya dengan coding assistant dan harus disiapkan/ditinjau manusia:

- [ ] Tentukan battery pack reference design untuk LFP dan NMC.
- [ ] Sediakan CAD/Blender model yang legal digunakan dan dapat dipisah per komponen.
- [ ] Verifikasi nama, susunan, dan fungsi komponen.
- [ ] Kumpulkan parameter fisika beserta sumbernya.
- [ ] Tentukan boundary conditions dan skenario operasi.
- [ ] Sediakan data referensi untuk memvalidasi thermal model.
- [ ] Sediakan dataset degradasi yang sesuai chemistry dan form factor.
- [ ] Tentukan harga modul/pack/servis atau kebijakan input manual.
- [ ] Minta review engineer/battery specialist untuk asumsi dan interpretasi.
- [ ] Tentukan apakah produk hanya demo akademis atau akan digunakan untuk keputusan operasional nyata.

## 19. Open Questions Sebelum Development — dijawab (v1.1)

1. Target rilis pertama → **academic/portfolio demonstrator** (Gate 0, Q1).
2. Desain pack → **referensi generik** dari literatur publik, diberi label (Q2, D1).
3. CAD/3D assets → tidak dijawab; **geometri dibuat prosedural di kode**, sehingga tidak diperlukan (D9).
4. Thermal engine MVP → **reduced-order lumped thermal network** (Q9, D3).
5. SoH awal → **semi-empiris, berlabel `Illustrative`**: LFP memakai koefisien Schimpe et al. 2018; NMC memakai input fade rate manual (D5, G2-3).
6. ROI → **input biaya manual**, default kosong dan berlabel (Q10).
7. Bahasa default → **English** (Q4).

## 20. Referensi Visual Awal

**v1.1:** daftar di bawah adalah referensi awal dan dipertahankan sebagai catatan sejarah. Referensi yang berlaku ada di `EV_Battery_Pack_Digital_Twin_Visual_Reference_Guide.md`, dengan bukti dan analisis di `docs/design-research/`.

Referensi berikut adalah inspirasi arah desain dan teknik visual, bukan template untuk disalin mentah-mentah.

### A. Landing page / product identity

1. **NVIDIA Omniverse** — https://www.nvidia.com/en-us/omniverse/  
   Referensi untuk positioning industrial digital twin, hero visual skala besar, dan storytelling teknologi.

2. **Siemens Xcelerator** — https://www.siemens.com/en-us/company/digital-transformation/  
   Referensi untuk kredibilitas enterprise, struktur informasi industri, dan penjelasan manfaat bisnis.

3. **COMSOL Multiphysics** — https://www.comsol.com/  
   Referensi untuk komunikasi engineering/simulation yang jelas, edukatif, dan tidak terlalu consumer-oriented.

### B. 3D model / battery visualization

1. **Siemens / Forsee Power battery CFD case study** — https://resources.sw.siemens.com/en-US/case-study-forsee-power/  
   Referensi exploded battery pack dan visualisasi sistem baterai dalam konteks engineering.

2. **Henkel e-mobility simulation** — https://www.henkel.com/press-and-media/press-releases-and-kits/2025-02-26-charging-ahead-henkel-launches-new-modeling-and-simulation-capabilities-for-e-mobility-2040942  
   Referensi layer thermal interface, cooling plate, dan hubungan antara material dengan manajemen panas.

3. **COMSOL battery pack lifetime simulation** — https://www.comsol.com/blogs/optimizing-battery-pack-lifetime-using-simulation-aided-design  
   Referensi heatmap, distribusi temperatur, dan komunikasi hasil simulasi.

### C. Animation / interaction

1. **INTR Interactive 3D Product Page** — https://www.3dintr.com/en/services/interactive-3d-product-page/  
   Referensi orbit 360°, hotspot, exploded view, dan interaksi produk di browser.

2. **Modelwright** — https://modelwright.de/en/  
   Referensi guided camera, exploded/function view, dan transisi antara penjelasan dengan interaksi model.

3. **Product Viewer Web (Three.js / WebGPU)** — https://github.com/Elia-Youssef/interactive-web-product-showcase  
   Referensi arsitektur interaksi 3D berbasis model, hotspot, dan pengalaman desktop/mobile.

---

## 21. Rekomendasi Keputusan Produk

Untuk menghindari scope yang terlalu besar, rekomendasi awal adalah:

- Bangun **landing page yang editorial-industrial** dan tidak terlalu ramai.
- Jadikan **3D viewer sebagai pusat perhatian** pada simulator workspace.
- Gunakan **exploded view yang presisi dan terarah**, bukan animasi sci-fi.
- Mulai dari **reduced-order thermal model** yang dapat dijelaskan dan diuji.
- Jadikan SoH/ROI sebagai **decision-support estimates** sampai data dan validasi memadai.
- ~~Jangan mengunci detail visual final sebelum pengguna memilih satu arah dari UI Reference Board.~~ Arah visual sudah dipilih dan disetujui (v1.1).

**Dokumen ini adalah PRD v1.1.** Keputusan visual, desain referensi battery pack, parameter model, dan tingkat fidelity simulasi telah dikunci di Gate 1–2. Rincian ada di `docs/design/`.
