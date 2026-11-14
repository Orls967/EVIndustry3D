# EV Battery Pack Digital Twin — UI/UX Design Specification

**Document:** UI/UX Design Specification  
**Version:** 1.0  
**Date:** 14 November 2026  
**Status:** Direction approved; detailed visual design pending reference validation  
**Related document:** `EV_Battery_Pack_Digital_Twin_PRD.md`

---

## 1. Purpose

Dokumen ini menerjemahkan keputusan visual yang telah disepakati menjadi arahan desain yang dapat digunakan oleh UI/UX designer dan coding agent pada tahap implementasi berikutnya.

**Penting: dokumen ini bukan izin untuk langsung melakukan implementasi.** Tahap saat ini adalah design definition dan reference research. Jangan membuat atau mengubah halaman aplikasi, komponen frontend, asset 3D final, atau animasi produksi sebelum design direction dan reference evidence disetujui.

## 2. Approved Design Direction

Nama arah visual:

# Hybrid Industrial Digital Twin Experience

Karakter yang ingin dicapai:
- Futuristic dan cinematic seperti NVIDIA Omniverse.
- Memiliki struktur, keterbacaan, dan kredibilitas industrial enterprise seperti Siemens.
- Menggunakan model 3D bergaya precision CAD engineering.
- Menggabungkan cinematic 360° presentation dan guided exploded assembly.
- Terlihat sebagai engineering product yang serius, bukan game, sci-fi dashboard, atau website company profile generik.

### 2.1 Keputusan yang sudah disetujui

| Area | Keputusan | Status |
|---|---|---|
| Landing page | A1 NVIDIA Omniverse + sedikit A2 Siemens | Approved |
| 3D model | B1 Precision CAD / Engineering Exploded View | Approved |
| Animation | C1 Guided Exploded Assembly + C3 Cinematic 360° | Approved |
| Overall identity | Hybrid Industrial Digital Twin Experience | Approved |
| Final colors, typography, spacing | Didefinisikan di `docs/design/02-design-system.md` | Approved (Gate 2, 14 Nov 2026) |
| Final page layout | Wireframe di `docs/design/01-product-ux-specification.md` | Approved (Gate 2); lebar panel disetel di Phase 4 |
| Final 3D asset and animation timing | Spesifikasi di `docs/design/03` dan `06` | Approved (Gate 2); timing disetel pada model nyata di Phase 4 |

Persentase A1/A2 tidak dianggap rasio literal yang wajib diukur. Secara kualitatif, landing page harus lebih dominan cinematic/futuristic, sementara prinsip Siemens masuk sebagai struktur enterprise, clarity, hierarchy, dan industrial credibility.

## 3. Design Principles

1. **Engineering credibility over decoration** — setiap visual harus membantu pengguna memahami sistem atau meningkatkan kepercayaan.
2. **Cinematic, not chaotic** — visual dramatis boleh digunakan, tetapi tidak mengganggu informasi.
3. **Precision over abstraction** — bentuk baterai dan komponennya harus terbaca sebagai objek engineering.
4. **Data has meaning** — warna thermal, status, dan angka harus memiliki semantik konsisten.
5. **Progressive disclosure** — tampilkan ringkasan dahulu, detail teknis saat dibutuhkan.
6. **Interaction must explain** — animasi harus membantu pengguna memahami struktur, proses, atau perubahan data.
7. **Responsive by design** — pengalaman 3D desktop menjadi baseline, tetapi mobile tetap memiliki fallback yang layak.
8. **Truthful visualization** — data ilustratif, modelled, dan measured harus dibedakan.

## 4. Landing Page Design — A1 + A2

### 4.1 Visual direction

**Primary influence:** NVIDIA Omniverse  
**Secondary influence:** Siemens industrial digitalization

Landing page harus:
- Memiliki hero visual 3D yang besar dan kuat.
- Menggunakan dark graphite/near-black sebagai kandidat background utama.
- Memakai pencahayaan cinematic, refleksi material yang terkendali, dan accent cyan/teal.
- Menyusun informasi seperti produk enterprise: headline jelas, proof points, workflow, capability, dan CTA.
- Memiliki whitespace dan grid yang rapi; jangan memenuhi seluruh layar dengan panel.
- Menggunakan copywriting engineering yang spesifik, bukan jargon marketing kosong.

### 4.2 Suggested page structure

1. **Navigation**
   - Logo / product name.
   - Product overview.
   - Technology.
   - Architectures.
   - Methodology.
   - CTA: `Launch Simulator`.

2. **Hero**
   - Headline yang menjelaskan digital twin battery pack.
   - Subheadline yang menyebut inspect, simulate, forecast, decide.
   - Primary CTA: `Launch Simulator`.
   - Secondary CTA: `Explore the Technology`.
   - Cinematic 3D battery pack visual, dengan motion yang subtle dan dapat dihentikan.
   - Hero harus tetap bekerja jika 3D gagal dimuat: gunakan poster image/video fallback.

3. **Capability strip**
   - Inspect: explore internal battery architecture.
   - Simulate: test thermal scenarios.
   - Decide: understand lifecycle and maintenance impact.

4. **How it works**
   - Select architecture.
   - Inspect components.
   - Run thermal simulation.
   - Evaluate lifecycle and maintenance.

5. **Architecture comparison teaser**
   - LFP Prismatic/Blade.
   - NMC Cylindrical.
   - Jelaskan bahwa perbandingan bergantung pada konfigurasi model dan asumsi.

6. **Engineering visualization showcase**
   - Exploded view.
   - Cross-section slicer.
   - Thermal heatmap.

7. **Decision support showcase**
   - SoH forecast.
   - Repair-versus-replace estimate.
   - ROI / maintenance planning.

8. **Methodology and trust**
   - Model status.
   - Assumptions and data provenance.
   - Limitations / not an OEM diagnostic tool.

9. **Final CTA and footer**

### 4.3 Landing page do / don't

**Do**
- Gunakan satu visual hero yang kuat.
- Gunakan industrial typography dan structured content.
- Tampilkan data/diagram sebagai bukti kemampuan.
- Gunakan motion untuk mengarahkan perhatian.
- Pastikan CTA terlihat jelas.

**Don't**
- Menyalin layout atau branding NVIDIA/Siemens.
- Menggunakan neon glow di semua elemen.
- Membuat hero terlalu ramai dengan angka yang tidak bermakna.
- Menggunakan animasi berat sebelum konten utama tampil.
- Menggunakan warna thermal sebagai dekorasi umum.

## 5. 3D Battery Model — B1 Precision CAD Engineering

### 5.1 Visual target

Model harus tampak seperti engineering CAD visualization yang telah dipoles untuk presentasi digital:
- Proporsi dan hubungan antarkomponen masuk akal.
- Komponen memiliki batas mesh yang jelas.
- Material membedakan aluminium, steel, polymer, copper busbar, cell casing, TIM, dan cooling plate.
- Detail visual cukup untuk inspeksi, tetapi tidak berlebihan hingga mengganggu performa.
- Pencahayaan studio/industrial membuat bentuk terbaca.
- Model harus bisa dilihat dari assembled, exploded, dan cross-section states.

### 5.2 Required component hierarchy

Minimal component IDs:
- `pack.upper_enclosure`
- `pack.lower_enclosure`
- `pack.bms`
- `pack.busbars`
- `pack.modules`
- `pack.cells`
- `pack.thermal_interface`
- `pack.cooling_plate`
- `pack.coolant_inlet`
- `pack.coolant_outlet`

Tambahkan ID individual untuk modul/sel yang dapat dipilih, misalnya `module_03` atau `cell_03_12`, bila detail asset dan data mendukung.

**Pembaruan Gate 2 (keputusan D2):** kedua pack referensi adalah desain cell-to-pack tanpa housing modul, sehingga `pack.modules` diganti `pack.zone_01`…`pack.zone_n` (zona termal logis). Pack NMC memakai `pack.cooling_channels` sebagai pengganti `pack.cooling_plate`. Daftar lengkap: `docs/design/06-3d-asset-specification.md` §2.

### 5.3 Architecture-specific models

**LFP**
- Gunakan konfigurasi prismatic/blade yang spesifik.
- Tampilkan susunan sel yang sesuai dengan reference design.
- Jangan menyebut semua LFP sebagai satu geometri universal.

**NMC**
- Gunakan cylindrical form factor yang dinyatakan secara spesifik, misalnya 4680.
- Tampilkan cell array, electrical connections, spacing, dan cooling arrangement sesuai reference design.

Kedua model tidak boleh sekadar mengganti bentuk sel pada satu pack generik jika struktur dan cooling architecture yang diklaim berbeda.

### 5.4 Material and rendering guidance

Kandidat awal:
- Enclosure: matte/satin aluminum atau coated metal.
- Busbar: copper dengan metallic response yang realistis.
- Cells: restrained industrial finish; hindari warna mencolok tanpa alasan.
- Cooling plate: aluminium/metal dengan channel detail yang terlihat saat cutaway.
- TIM: material layer yang kontras secara visual agar mudah dikenali.
- BMS: PCB/electronics detail yang cukup untuk identifikasi.

Warna material final harus dikonfirmasi dari reference board. Jangan mengandalkan warna untuk menyampaikan informasi teknis tanpa label.

### 5.5 3D asset preparation requirements

**Pembaruan Gate 1–2 (keputusan D9):** geometri dibangun secara prosedural di kode dari data dimensi; tidak ada file GLB/glTF dan tidak ada file sumber Blender/CAD. Butir yang menyebut GLB, file sumber, atau pivot hasil export tidak berlaku; butir lainnya tetap berlaku. Spesifikasi: `docs/design/06-3d-asset-specification.md`.

- ~~Format runtime utama: GLB/glTF.~~
- Setiap komponen interaktif memiliki stable ID.
- Pivot/origin disiapkan untuk exploded animation.
- Mesh naming mengikuti component ID convention.
- Siapkan LOD atau quality variants jika model terlalu berat.
- Pertimbangkan instancing untuk banyak sel identik.
- Pisahkan visual mesh dan metadata.
- Pastikan clipping plane tidak menghasilkan visual artifacts yang mengganggu.
- Model final harus punya source file yang dapat diedit (mis. Blender/CAD), bukan hanya GLB final.

## 6. Animation System — C1 + C3

Kedua gaya animasi digunakan untuk dua tujuan berbeda. Jangan menjadikan satu sebagai pengganti yang lain.

### 6.1 C3 — Cinematic 360° Product Experience

**Primary use**
- Landing page hero.
- Product overview.
- Simulator initial assembled state.
- Camera transitions antar-mode.

**Behavior**
- Model berputar perlahan atau memberi kontrol orbit kepada pengguna.
- Camera move dapat mengarahkan perhatian ke detail tertentu.
- Lighting dan material memberi kesan premium.
- Motion tidak boleh membuat pengguna kehilangan orientasi.
- Auto-rotation harus berhenti saat pengguna melakukan drag/interaksi.
- Sediakan pause/reduced-motion behavior.

**Motion direction**
- Smooth, restrained, premium.
- Ease-in/ease-out.
- Tidak menggunakan spin cepat atau gerakan kamera agresif.
- Durasi dan easing final ditentukan setelah prototype motion review.

### 6.2 C1 — Guided Exploded Assembly

**Primary use**
- Simulator inspection mode.
- Component education.
- Exploded view storytelling.

**Behavior**
- Komponen bergerak ke arah yang telah ditentukan oleh assembly axis.
- Urutan pemisahan dapat dikelompokkan: enclosure → electronics/busbars → cells/modules → thermal layers → cooling plate.
- Setiap komponen berhenti pada posisi yang dapat dibaca.
- Pengguna dapat pause, reverse, reset, dan memilih komponen.
- Komponen yang dipilih dapat di-highlight dan kamera dapat melakukan focus transition.
- Exploded state tidak boleh membuat komponen bertumpuk secara visual.

**Motion direction**
- Precise, mechanical, deliberate.
- Pergerakan mengikuti transform yang telah ditentukan, bukan physics animation acak.
- Easing halus namun tetap memberi kesan komponen mekanis.

### 6.3 Combined interaction flow

1. Assembled state tampil dengan C3.
2. Pengguna memilih `Exploded View`.
3. C1 memisahkan komponen secara bertahap.
4. Pengguna memilih satu komponen.
5. Kamera berpindah secara halus dan inspector terbuka.
6. Pengguna mengembalikan model ke assembled state.
7. Pengguna mengaktifkan X-Ray/cross-section.
8. Clipping plane bergerak untuk memperlihatkan struktur internal.
9. Thermal mode menampilkan heatmap berdasarkan output simulasi.

### 6.4 Motion accessibility and performance

- Hormati `prefers-reduced-motion`.
- Sediakan tombol pause/stop untuk motion otomatis.
- Jangan membuat informasi hanya dapat diakses melalui animasi.
- Jangan mengunci scroll karena animasi 3D.
- Gunakan fallback image jika WebGL tidak tersedia.
- Turunkan kualitas render berdasarkan kemampuan perangkat.
- Animasi tidak boleh menghambat kontrol parameter atau pembacaan data.

## 7. Simulator Workspace — Design Direction

### 7.1 Desktop layout concept

- **Top bar:** product identity, architecture selector, scenario name/status, help.
- **Left rail/panel:** component tree, layer visibility, inspection tools.
- **Center viewport:** 3D model dan primary controls.
- **Right inspector panel:** component details, simulation parameters, result tabs.
- **Bottom region:** simulation timeline, playback, temperature legend, status.

Jangan mengunci lebar panel atau grid final sebelum wireframe dan usability review.

### 7.2 Core viewport controls

- Orbit / pan / zoom.
- Camera presets.
- Reset camera.
- Assembled / exploded.
- Cross-section / clipping.
- Thermal heatmap.
- Component selection.
- Screenshot/export action jika masuk scope.

### 7.3 Mobile behavior

- 3D viewport tetap menjadi fokus.
- Kontrol utama berada di toolbar yang mudah dijangkau.
- Inspector menggunakan bottom sheet.
- Parameter dan hasil dibuka melalui tab/drawer.
- Hindari panel desktop yang dipaksa menjadi kolom sempit.
- Sediakan low-quality 3D mode atau static fallback.

## 8. Color, Typography, and UI Tokens — Proposed, Not Final

Ini adalah starting point untuk eksplorasi, bukan keputusan warna final. **Pembaruan Gate 2:** token final (warna, tipografi, spacing, skala thermal) ada di `docs/design/02-design-system.md`.

### 8.1 Candidate palette

| Token | Candidate | Usage |
|---|---|---|
| Background | Graphite / near-black | Landing hero dan simulator shell |
| Surface | Charcoal / dark slate | Panel dan cards |
| Primary accent | Cyan / electric blue | Primary actions, selected states |
| Secondary accent | Teal | Secondary data and system highlights |
| Text primary | Off-white | Main content |
| Text secondary | Cool gray | Supporting information |
| Border | Muted slate | Panel boundaries |
| Thermal cold | Blue | Temperature scale |
| Thermal nominal | Green | Temperature scale |
| Thermal warm | Yellow/orange | Temperature scale |
| Thermal critical | Red | Temperature scale |

Thermal colors hanya digunakan pada konteks temperatur. Status kritis harus disertai label, angka, atau icon; jangan mengandalkan warna saja.

### 8.2 Typography direction

- Modern sans-serif untuk heading dan body.
- Monospace untuk numeric telemetry, IDs, dan technical values.
- Hindari terlalu banyak typefaces.
- Pastikan readability pada ukuran kecil dan kontras memadai.

### 8.3 UI component direction

- Panel memiliki hierarchy yang jelas.
- Border tipis dan restrained.
- Shadow digunakan secukupnya.
- Controls terlihat seperti engineering software, bukan gaming HUD.
- Buttons dan sliders harus memiliki label, unit, focus state, dan disabled/loading state.

## 9. Content and Data Presentation

- Setiap angka selalu memiliki unit.
- Setiap chart memiliki axis label dan legend.
- Setiap hasil menampilkan status `Illustrative`, `Modelled`, atau `Measured`.
- Temperature status memiliki angka dan threshold yang dijelaskan.
- SoH projection menampilkan assumptions dan model name.
- ROI menampilkan input biaya dan calculation details.
- Hindari angka dummy yang terlihat seperti data real.
- Gunakan placeholder yang secara eksplisit bertuliskan sample/demo data.

## 10. Deliverables Required Before Implementation

Tahap desain harus menghasilkan:
1. Approved visual reference board.
2. Landing page wireframe desktop/mobile.
3. Simulator workspace wireframe desktop/mobile.
4. Color and typography tokens.
5. UI component inventory.
6. 3D model visual treatment board.
7. Exploded-view sequence storyboard.
8. Cinematic camera/motion storyboard.
9. Cross-section interaction storyboard.
10. Responsive behavior specification.
11. Asset checklist and naming convention.
12. Design review approval.

## 11. Design Review Checklist

- [ ] Landing page memadukan cinematic NVIDIA-like quality dan Siemens-like industrial clarity.
- [ ] Landing page tidak meniru logo, layout, copy, atau aset proprietary referensi.
- [ ] 3D model terbaca sebagai engineering CAD.
- [ ] LFP dan NMC menggunakan konfigurasi model yang spesifik.
- [ ] Exploded view menjelaskan assembly relationship.
- [ ] Cinematic 360° dan guided exploded memiliki tujuan berbeda.
- [ ] X-Ray/cross-section tetap mudah dipahami.
- [ ] Thermal palette hanya dipakai untuk data temperatur.
- [ ] Data modelled/illustrative dibedakan dari measured.
- [ ] Reduced-motion dan fallback telah dirancang.
- [ ] Desktop dan mobile wireframes tersedia.
- [ ] Referensi dan screenshot evidence terdokumentasi.

## 12. PRD Alignment Notes

PRD v1.0 tidak perlu ditulis ulang. Sebelum development, lakukan revisi terbatas:
- Perbarui **Section 10.1 Visual direction** menjadi Hybrid Industrial Digital Twin Experience (A1 + A2).
- Perjelas **Section 10.2 Landing page** dengan hero cinematic dan enterprise information hierarchy.
- Perbarui **Section 10.4 Motion design** untuk memisahkan C3 cinematic motion dan C1 guided exploded animation.
- Tambahkan requirement bahwa 3D asset memakai precision CAD treatment dan stable component IDs.
- Ganti daftar referensi awal di Section 20 dengan referensi terverifikasi dari `EV_Battery_Pack_Digital_Twin_Visual_Reference_Guide.md`.
- Functional requirements dan acceptance criteria inti tidak berubah, kecuali ada keputusan desain yang memengaruhi interaksi atau aksesibilitas.

## 13. Explicit No-Implementation Gate

Sampai design review disetujui:
- Jangan mulai implementasi landing page.
- Jangan membuat simulator dashboard final.
- Jangan membuat animasi produksi.
- Jangan mengunduh atau menggunakan model 3D berlisensi tanpa pemeriksaan lisensi.
- Jangan mengubah business logic, physics engine, atau backend.
- Jangan menganggap screenshot sebagai spesifikasi lengkap.

**Next milestone:** complete the visual reference research and prepare wireframes/storyboards for review.
