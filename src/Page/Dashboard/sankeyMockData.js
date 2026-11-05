// Data Hardcode Realistis untuk Pelaporan Eksekutif, Matriks Korelasi (Uang vs Capaian Kerja),
// Root Cause Tracing, dan Penataan Boundary Fakultas/Unit x Proker x Aktivitas x Kegiatan x Uang.
//
// Struktur Boundary:
// 1. Fakultas (Fakultas MIPA, Sekolah Vokasi, FKIP, FEB, Fakultas Hukum)
//    -> Unit Tingkat Fakultas (Dekanat & UPMF) -> Proker Fakultas
//    -> Jenjang (D3, D4, Profesi, S1, S2, S3)
//       -> Program Studi (S1 Ilmu Komputer, S1 Farmasi, Profesi Apoteker, dll.)
// 2. Unit Universitas (BPSI, Tracer Study & Karir, LPPM, LPM)
//
// Status Kegiatan: "Terlaksana" | "Belum Terlaksana" | "Draf"
// Kuadran II (Red Flag):
// - Kasus A: Uang banyak dicairkan (>=75%) tetapi pekerjaan belum tuntas (<75%)
// - Kasus B: Pekerjaan tuntas (>=75%) namun uang belum cair (<30%)

import { V_FAKULTAS_UNIT_ROWS, MOCK_ALIASES } from "./vFakultasUnitData.js";

export const SANKEY_DATA = {
  // ==========================================
  // 1. DANA UNIVERSITAS (KOLOM 1)
  // ==========================================
  danaUtama: {
    id: "node-dana-utama",
    judul: "Total Dana Universitas",
    subjudul: "Pagu Anggaran & Realisasi RAB",
    totalDana: 520000000,
    totalSerapan: 428500000,
    totalSisa: 91500000,
    persenSerapan: 82.4,
    color: "#6366f1",
  },

  // ==========================================
  // 2. TARGET IKU ROOT (KOLOM 2)
  // ==========================================
  rootIkus: [
    {
      id: "root-iku-1",
      kode: "IKU 1",
      nama: "Angka Efisiensi Edukasi Perguruan Tinggi (AEE PT)",
      pagu: 165000000,
      serapan: 138500000,
      sisa: 26500000,
      persenSerapan: 83.94,
      color: "#6366f1",
      childIds: [
        "child-iku-1a",
        "child-iku-1b",
        "child-iku-1c",
        "child-iku-1e",
        "child-sub11",
      ],
      indikatorIds: [],
    },
    {
      id: "root-iku-2",
      kode: "IKU 2",
      nama: "Lulusan Mendapatkan Pekerjaan Layak & Wirausaha",
      pagu: 135000000,
      serapan: 114000000,
      sisa: 21000000,
      persenSerapan: 84.44,
      color: "#0284c7",
      childIds: [],
      indikatorIds: ["ind-01", "ind-02", "ind-03", "ind-04"],
    },
    {
      id: "root-iku-5",
      kode: "IKU 5",
      nama: "Keluaran Riset & Inovasi Dosen Digunakan Masyarakat / Industri",
      pagu: 115000000,
      serapan: 100000000,
      sisa: 15000000,
      persenSerapan: 86.96,
      color: "#0d9488",
      childIds: [],
      indikatorIds: ["ind-05", "ind-08", "ind-09"],
    },
    {
      id: "root-iku-7",
      kode: "IKU 7",
      nama: "Kelas Kolaboratif dan Partisipatif (Case Method / PjBL)",
      pagu: 105000000,
      serapan: 76000000,
      sisa: 29000000,
      persenSerapan: 72.38,
      color: "#059669",
      childIds: [],
      indikatorIds: ["ind-05", "ind-06", "ind-07"],
    },
  ],

  // ==========================================
  // 3. SUB-IKU (KOLOM 3 - KHUSUS IKU 1)
  // ==========================================
  childIkus: [
    {
      id: "child-iku-1a",
      rootId: "root-iku-1",
      kode: "IKU 1 - a",
      nama: "D1* (Vokasi)",
      target: "80%",
      pagu: 15000000,
      serapan: 13500000,
      sisa: 1500000,
      color: "#6366f1",
      indikatorIds: ["ind-10"],
    },
    {
      id: "child-iku-1b",
      rootId: "root-iku-1",
      kode: "IKU 1 - b",
      nama: "D2* (Vokasi)",
      target: "85%",
      pagu: 15000000,
      serapan: 13500000,
      sisa: 1500000,
      color: "#4f46e5",
      indikatorIds: ["ind-10"],
    },
    {
      id: "child-iku-1c",
      rootId: "root-iku-1",
      kode: "IKU 1 - c",
      nama: "D3* (Vokasi)",
      target: "90%",
      pagu: 35000000,
      serapan: 29000000,
      sisa: 6000000,
      color: "#7c3aed",
      indikatorIds: ["ind-03", "ind-06"],
    },
    {
      id: "child-iku-1e",
      rootId: "root-iku-1",
      kode: "IKU 1 - e",
      nama: "S1 (Fakultas)",
      target: "90%",
      pagu: 80000000,
      serapan: 65000000,
      sisa: 15000000,
      color: "#8b5cf6",
      indikatorIds: ["ind-01", "ind-03", "ind-06", "ind-09", "ind-10"],
    },
    {
      id: "child-sub11",
      rootId: "root-iku-1",
      kode: "Sub IKU 1.1",
      nama: "Pascasarjana (S2/S3)",
      target: "10%",
      pagu: 20000000,
      serapan: 17500000,
      sisa: 2500000,
      color: "#a855f7",
      indikatorIds: ["ind-08"],
    },
  ],

  // ==========================================
  // 4. INDIKATOR RENSTRA (10 Unik dari DB)
  // ==========================================
  indikators: [
    {
      id: "ind-01",
      kode: "IND 01",
      nama: "Lulusan memiliki sertifikat kompetensi atau Bahasa asing",
      standar: "Standar Kompetensi Lulusan",
      pagu: 65000000,
      serapan: 58500000,
      sisa: 6500000,
      rootIkuIds: ["root-iku-2"],
      childIkuIds: ["child-iku-1e"],
      boundaryIds: ["fak-mipa", "fak-vokasi", "fak-fkip", "fak-feb", "unit-tracer"],
      color: "#0ea5e9",
    },
    {
      id: "ind-02",
      kode: "IND 02",
      nama: "Lulusan bekerja pada ruang lingkup nasional",
      standar: "Standar Kompetensi Lulusan",
      pagu: 45000000,
      serapan: 40000000,
      sisa: 5000000,
      rootIkuIds: ["root-iku-2"],
      childIkuIds: [],
      boundaryIds: ["fak-fh", "unit-tracer"],
      color: "#0284c7",
    },
    {
      id: "ind-03",
      kode: "IND 03",
      nama: "Persentase jumlah lulusan yang terlacak (Tracer Study)",
      standar: "Standar Kompetensi Lulusan",
      pagu: 60000000,
      serapan: 54500000,
      sisa: 5500000,
      rootIkuIds: ["root-iku-2"],
      childIkuIds: ["child-iku-1c", "child-iku-1e"],
      boundaryIds: ["unit-bpsi", "unit-tracer"],
      color: "#2563eb",
    },
    {
      id: "ind-04",
      kode: "IND 04",
      nama: "Tingkat kepuasan pengguna lulusan kategori baik dan sangat baik (%)",
      standar: "Standar Penilaian Pembelajaran",
      pagu: 35000000,
      serapan: 31000000,
      sisa: 4000000,
      rootIkuIds: ["root-iku-2"],
      childIkuIds: [],
      boundaryIds: ["fak-mipa", "unit-bpsi"],
      color: "#3b82f6",
    },
    {
      id: "ind-05",
      kode: "IND 05",
      nama: "Jumlah mata kuliah yang mengintegrasikan hasil penelitian dan PKM",
      standar: "Standar Isi Pembelajaran",
      pagu: 55000000,
      serapan: 48000000,
      sisa: 7000000,
      rootIkuIds: ["root-iku-5", "root-iku-7"],
      childIkuIds: [],
      boundaryIds: ["fak-mipa"],
      color: "#10b981",
    },
    {
      id: "ind-06",
      kode: "IND 06",
      nama: "Persentase Prodi Vokasi dan S1 yang mengimplementasikan MBKM",
      standar: "Standar Proses Pembelajaran",
      pagu: 50000000,
      serapan: 39000000,
      sisa: 11000000,
      rootIkuIds: ["root-iku-7"],
      childIkuIds: ["child-iku-1c", "child-iku-1e"],
      boundaryIds: ["fak-mipa", "fak-vokasi"],
      color: "#059669",
    },
    {
      id: "ind-07",
      kode: "IND 07",
      nama: "Proses pembelajaran berbasis PBL dan/atau PjBL tiap semester",
      standar: "Standar Proses Pembelajaran",
      pagu: 55000000,
      serapan: 37000000,
      sisa: 18000000,
      rootIkuIds: ["root-iku-7"],
      childIkuIds: [],
      boundaryIds: ["fak-mipa", "fak-fkip"],
      color: "#14b8a6",
    },
    {
      id: "ind-08",
      kode: "IND 08",
      nama: "Jumlah publikasi ilmiah bereputasi nasional dan internasional",
      standar: "Standar Hasil Penelitian",
      pagu: 60000000,
      serapan: 52000000,
      sisa: 8000000,
      rootIkuIds: ["root-iku-5"],
      childIkuIds: ["child-sub11"],
      boundaryIds: ["fak-mipa", "unit-lppm"],
      color: "#d97706",
    },
    {
      id: "ind-09",
      kode: "IND 09",
      nama: "Peningkatan jumlah karya inovasi dan paten mahasiswa/dosen",
      standar: "Standar Hasil Penelitian",
      pagu: 45000000,
      serapan: 38000000,
      sisa: 7000000,
      rootIkuIds: ["root-iku-5"],
      childIkuIds: ["child-iku-1e"],
      boundaryIds: ["fak-vokasi", "fak-feb", "unit-lppm"],
      color: "#ea580c",
    },
    {
      id: "ind-10",
      kode: "IND 10",
      nama: "Persentase kelulusan mahasiswa tepat waktu (%)",
      standar: "Standar Pengelolaan Pembelajaran",
      pagu: 50000000,
      serapan: 20000000,
      sisa: 30000000,
      rootIkuIds: ["root-iku-1"],
      childIkuIds: ["child-iku-1a", "child-iku-1b", "child-iku-1e"],
      boundaryIds: ["fak-fkip", "fak-fh"],
      color: "#9333ea",
    },
  ],

  // ==========================================
  // 5. BOUNDARY ORGANISASI (FAKULTAS & UNIT)
  // Dilengkapi Unit Tingkat Fakultas (Dekanat & UPMF)
  // ==========================================
  boundaries: [
    {
      id: "fak-mipa",
      kode: "06",
      nama: "Fakultas MIPA",
      namaSingkat: "FMIPA",
      type: "fakultas",
      dekan: "Dr. Prasetyowati, M.Si",
      pagu: 125000000,
      serapan: 107000000,
      sisa: 18000000,
      color: "#6366f1",
      // Unit Tingkat Fakultas (Dekanat / UPMF)
      unitFakultas: {
        id: "unit-mipa-dekanat",
        nama: "Dekanat & Tata Usaha FMIPA",
        pimpinan: "Dr. Prasetyowati, M.Si",
        pagu: 20000000,
        serapan: 16000000,
        sisa: 4000000,
        proker: {
          id: "proker-mipa-dekanat",
          namaProker: "Penguatan Tata Kelola Mutu & Akreditasi Unggul FMIPA",
          aktivitas: [
            {
              id: "akt-mipa-dekanat-1",
              namaAktivitas: "Audit Mutu Internal (AMI) & Penyusunan Dokumen Akreditasi ASIIN",
              pic: "Dr. Prasetyowati, M.Si",
              pagu: 20000000,
              serapan: 16000000,
              sisa: 4000000,
              kegiatans: ["keg-mipa-dekanat-1a"],
            },
          ],
        },
      },
      jenjangList: [
        {
          jenjang: "s1",
          namaJenjang: "Strata 1 (S1)",
          prodis: [
            {
              id: "prodi-mipa-cs",
              nama: "S1 Ilmu Komputer",
              jenjang: "s1",
              kaprodi: "Asep Mulyana, M.Kom",
              pagu: 50000000,
              serapan: 40500000,
              sisa: 9500000,
              prokerId: "proker-mipa-cs",
            },
            {
              id: "prodi-mipa-farm",
              nama: "S1 Farmasi",
              jenjang: "s1",
              kaprodi: "Apt. Dwi Lestari, M.Farm",
              pagu: 25000000,
              serapan: 22500000,
              sisa: 2500000,
              prokerId: "proker-mipa-farm",
            },
            {
              id: "prodi-mipa-bio",
              nama: "S1 Biologi",
              jenjang: "s1",
              kaprodi: "Dr. Sri Astuti, M.Si",
              pagu: 15000000,
              serapan: 10000000,
              sisa: 5000000,
              prokerId: "proker-mipa-bio",
            },
          ],
        },
        {
          jenjang: "profesi",
          namaJenjang: "Profesi",
          prodis: [
            {
              id: "prodi-mipa-apt",
              nama: "Profesi Apoteker",
              jenjang: "profesi",
              kaprodi: "Apt. Hendra Kusuma, M.Si",
              pagu: 20000000,
              serapan: 18000000,
              sisa: 2000000,
              prokerId: "proker-mipa-apt",
            },
          ],
        },
        {
          jenjang: "s2",
          namaJenjang: "Magister (S2)",
          prodis: [
            {
              id: "prodi-mipa-s2cs",
              nama: "Magister Ilmu Komputer",
              jenjang: "s2",
              kaprodi: "Dr. Ir. Ridwan Siregar, MT",
              pagu: 15000000,
              serapan: 10000000,
              sisa: 5000000,
              prokerId: "proker-mipa-s2cs",
            },
          ],
        },
      ],
    },
    {
      id: "fak-vokasi",
      kode: "08",
      nama: "Sekolah Vokasi",
      namaSingkat: "Vokasi",
      type: "fakultas",
      dekan: "Dr. Ir. Gunawan, MM",
      pagu: 75000000,
      serapan: 58000000,
      sisa: 17000000,
      color: "#0891b2",
      unitFakultas: {
        id: "unit-vokasi-dekanat",
        nama: "Pengelola Sekolah Vokasi",
        pimpinan: "Dr. Ir. Gunawan, MM",
        pagu: 10000000,
        serapan: 6000000,
        sisa: 4000000,
        proker: {
          id: "proker-vokasi-dekanat",
          namaProker: "Pusat Pengembangan Pendidikan Vokasi Terapan",
          aktivitas: [],
        },
      },
      jenjangList: [
        {
          jenjang: "d3",
          namaJenjang: "Diploma 3 (D3)",
          prodis: [
            {
              id: "prodi-vok-mi",
              nama: "D3 Manajemen Informatika",
              jenjang: "d3",
              kaprodi: "Rina Marlina, M.Kom",
              pagu: 25000000,
              serapan: 18000000,
              sisa: 7000000,
              prokerId: "proker-vok-mi",
            },
            {
              id: "prodi-vok-akt",
              nama: "D3 Akuntansi",
              jenjang: "d3",
              kaprodi: "Eko Purwanto, M.Ak",
              pagu: 15000000,
              serapan: 12000000,
              sisa: 3000000,
              prokerId: "proker-vok-akt",
            },
          ],
        },
        {
          jenjang: "d4",
          namaJenjang: "Sarjana Terapan (D4)",
          prodis: [
            {
              id: "prodi-vok-ai",
              nama: "D4 Kecerdasan Buatan dan Robotik",
              jenjang: "d4",
              kaprodi: "Teguh Santoso, ST, M.Sc",
              pagu: 25000000,
              serapan: 22000000,
              sisa: 3000000,
              prokerId: "proker-vok-ai",
            },
          ],
        },
      ],
    },
    {
      id: "fak-fkip",
      kode: "03",
      nama: "Fakultas Keguruan dan Ilmu Pendidikan",
      namaSingkat: "FKIP",
      type: "fakultas",
      dekan: "Prof. Dr. H. Entis Sutisna, M.Pd",
      pagu: 80000000,
      serapan: 54000000,
      sisa: 26000000,
      color: "#059669",
      unitFakultas: {
        id: "unit-fkip-dekanat",
        nama: "Dekanat FKIP",
        pimpinan: "Prof. Dr. H. Entis Sutisna, M.Pd",
        pagu: 10000000,
        serapan: 8000000,
        sisa: 2000000,
        proker: {
          id: "proker-fkip-dekanat",
          namaProker: "Pusat Inovasi Kurikulum Pedagogik & MBKM",
          aktivitas: [],
        },
      },
      jenjangList: [
        {
          jenjang: "s1",
          namaJenjang: "Strata 1 (S1)",
          prodis: [
            {
              id: "prodi-fkip-bio",
              nama: "S1 Pendidikan Biologi",
              jenjang: "s1",
              kaprodi: "Dr. Rita Rahayu, M.Pd",
              pagu: 35000000,
              serapan: 30000000,
              sisa: 5000000,
              prokerId: "proker-fkip-bio",
            },
            {
              id: "prodi-fkip-ing",
              nama: "S1 Pendidikan Bahasa Inggris",
              jenjang: "s1",
              kaprodi: "Nurul Hidayati, M.Hum",
              pagu: 25000000,
              serapan: 21000000,
              sisa: 4000000,
              prokerId: "proker-fkip-ing",
            },
          ],
        },
        {
          jenjang: "profesi",
          namaJenjang: "Profesi",
          prodis: [
            {
              // KASUS RED FLAG B: PEKERJAAN TUNTAS (100%), TETAPI UANG BELUM CAIR (15% serapan)
              id: "prodi-fkip-ppg",
              nama: "Pendidikan Profesi Guru (PPG)",
              jenjang: "profesi",
              kaprodi: "Dr. Sudrajat, M.Pd",
              pagu: 20000000,
              serapan: 3000000,
              sisa: 17000000,
              prokerId: "proker-fkip-ppg",
            },
          ],
        },
      ],
    },
    {
      id: "fak-feb",
      kode: "02",
      nama: "Fakultas Ekonomi dan Bisnis",
      namaSingkat: "FEB",
      type: "fakultas",
      dekan: "Dr. Hendro Sasongko, Ak, MM",
      pagu: 45000000,
      serapan: 38000000,
      sisa: 7000000,
      color: "#ea580c",
      jenjangList: [
        {
          jenjang: "s1",
          namaJenjang: "Strata 1 (S1)",
          prodis: [
            {
              id: "prodi-feb-man",
              nama: "S1 Manajemen",
              jenjang: "s1",
              kaprodi: "Dewi Sartika, SE, MM",
              pagu: 25000000,
              serapan: 21500000,
              sisa: 3500000,
              prokerId: "proker-feb-man",
            },
            {
              id: "prodi-feb-akt",
              nama: "S1 Akuntansi",
              jenjang: "s1",
              kaprodi: "Bambang Sudibyo, M.Ak",
              pagu: 20000000,
              serapan: 16500000,
              sisa: 3500000,
              prokerId: "proker-feb-akt",
            },
          ],
        },
      ],
    },
    {
      id: "fak-fh",
      kode: "01",
      nama: "Fakultas Hukum",
      namaSingkat: "Fakultas Hukum",
      type: "fakultas",
      dekan: "Dr. Iwan Taruna, SH, MH",
      pagu: 30000000,
      serapan: 22000000,
      sisa: 8000000,
      color: "#7c3aed",
      jenjangList: [
        {
          jenjang: "s1",
          namaJenjang: "Strata 1 (S1)",
          prodis: [
            {
              id: "prodi-fh-hkm",
              nama: "S1 Ilmu Hukum",
              jenjang: "s1",
              kaprodi: "Budi Purnomo, SH, LL.M",
              pagu: 30000000,
              serapan: 22000000,
              sisa: 8000000,
              prokerId: "proker-fh-hkm",
            },
          ],
        },
      ],
    },
    {
      id: "unit-bpsi",
      kode: "U1",
      nama: "BPSI",
      namaSingkat: "BPSI",
      namaLengkap: "Badan Pengembangan Sistem Informasi",
      type: "unit",
      kepala: "Dr. Ir. Hendra, M.Kom",
      pagu: 55000000,
      serapan: 50000000,
      sisa: 5000000,
      color: "#6366f1",
      prokerId: "proker-bpsi",
    },
    {
      id: "unit-tracer",
      kode: "U6",
      nama: "Tracer Study & Karir",
      namaSingkat: "Tracer Karir",
      namaLengkap: "Kantor Pengembangan Karir dan Tracer Study",
      type: "unit",
      kepala: "Siti Rahmawati, M.Psi",
      pagu: 45000000,
      serapan: 40500000,
      sisa: 4500000,
      color: "#0284c7",
      prokerId: "proker-tracer",
    },
    {
      id: "unit-lppm",
      kode: "U8",
      nama: "LPPM",
      namaSingkat: "LPPM",
      namaLengkap: "Lembaga Penelitian dan Pengabdian kepada Masyarakat",
      type: "unit",
      kepala: "Prof. Dr. Ir. Budi Santoso",
      pagu: 75000000,
      serapan: 68000000,
      sisa: 7000000,
      color: "#0d9488",
      prokerId: "proker-lppm",
    },
  ],

  // ==========================================
  // 6. PROGRAM KERJA (Mata Program)
  // ==========================================
  prokers: [
    {
      id: "proker-mipa-dekanat",
      boundaryId: "fak-mipa",
      prodiId: null,
      namaProker: "Penguatan Tata Kelola Mutu & Akreditasi Unggul FMIPA",
      pagu: 20000000,
      serapan: 16000000,
      sisa: 4000000,
      aktivitasIds: ["akt-mipa-dekanat-1"],
    },
    {
      id: "proker-mipa-cs",
      boundaryId: "fak-mipa",
      prodiId: "prodi-mipa-cs",
      namaProker: "Pengembangan Kurikulum Cloud & AI Center of Excellence",
      pagu: 50000000,
      serapan: 40500000,
      sisa: 9500000,
      aktivitasIds: ["akt-mipa-cs-1", "akt-mipa-cs-2", "akt-mipa-cs-3"],
    },
    {
      id: "proker-mipa-farm",
      boundaryId: "fak-mipa",
      prodiId: "prodi-mipa-farm",
      namaProker: "Standardisasi Lab Farmasi Klinis & Riset Obat Herbal",
      pagu: 25000000,
      serapan: 22500000,
      sisa: 2500000,
      aktivitasIds: ["akt-mipa-farm-1"],
    },
    {
      id: "proker-mipa-apt",
      boundaryId: "fak-mipa",
      prodiId: "prodi-mipa-apt",
      namaProker: "Pelatihan & Simulasi Uji Kompetensi Apoteker Indonesia (UKAI)",
      pagu: 20000000,
      serapan: 18000000,
      sisa: 2000000,
      aktivitasIds: ["akt-mipa-apt-1"],
    },
    {
      id: "proker-mipa-bio",
      boundaryId: "fak-mipa",
      prodiId: "prodi-mipa-bio",
      namaProker: "Penerapan Pembelajaran Lapangan Bio-Konservasi PjBL",
      pagu: 15000000,
      serapan: 10000000,
      sisa: 5000000,
      aktivitasIds: ["akt-mipa-bio-1"],
    },
    {
      id: "proker-mipa-s2cs",
      boundaryId: "fak-mipa",
      prodiId: "prodi-mipa-s2cs",
      namaProker: "Akselerasi Tesis & Publikasi Jurnal Internasional Terindeks",
      pagu: 15000000,
      serapan: 10000000,
      sisa: 5000000,
      aktivitasIds: ["akt-mipa-s2cs-1"],
    },
    {
      id: "proker-vok-mi",
      boundaryId: "fak-vokasi",
      prodiId: "prodi-vok-mi",
      namaProker: "Magang Bersertifikat Industri Software House 6 Bulan",
      pagu: 25000000,
      serapan: 18000000,
      sisa: 7000000,
      aktivitasIds: ["akt-vok-mi-1"],
    },
    {
      id: "proker-vok-ai",
      boundaryId: "fak-vokasi",
      prodiId: "prodi-vok-ai",
      namaProker: "FabLab Robotika & Kompetisi Robot Nasional (KRI)",
      pagu: 25000000,
      serapan: 22000000,
      sisa: 3000000,
      aktivitasIds: ["akt-vok-ai-1"],
    },
    {
      id: "proker-vok-akt",
      boundaryId: "fak-vokasi",
      prodiId: "prodi-vok-akt",
      namaProker: "Sertifikasi Teknisi Akuntansi Ahli & Tax Center Brevet",
      pagu: 15000000,
      serapan: 12000000,
      sisa: 3000000,
      aktivitasIds: ["akt-vok-akt-1"],
    },
    {
      id: "proker-fkip-bio",
      boundaryId: "fak-fkip",
      prodiId: "prodi-fkip-bio",
      namaProker: "Implementasi Teaching Grant Berbasis Project Based Learning",
      pagu: 35000000,
      serapan: 30000000,
      sisa: 5000000,
      aktivitasIds: ["akt-fkip-bio-1"],
    },
    {
      id: "proker-fkip-ing",
      boundaryId: "fak-fkip",
      prodiId: "prodi-fkip-ing",
      namaProker: "Program Microteaching Digital & English Proficiency Test (TOEFL)",
      pagu: 25000000,
      serapan: 21000000,
      sisa: 4000000,
      aktivitasIds: ["akt-fkip-ing-1"],
    },
    {
      id: "proker-fkip-ppg",
      boundaryId: "fak-fkip",
      prodiId: "prodi-fkip-ppg",
      namaProker: "Uji Kompetensi Pendidikan Profesi Guru (UKPPPG) Kemendikbudristek",
      pagu: 20000000,
      serapan: 3000000,
      sisa: 17000000,
      aktivitasIds: ["akt-fkip-ppg-1"],
    },
    {
      id: "proker-feb-man",
      boundaryId: "fak-feb",
      prodiId: "prodi-feb-man",
      namaProker: "Inkubasi Bisnis Start-Up Mahasiswa & Pasar Modal (Yuk Nabung Saham)",
      pagu: 25000000,
      serapan: 21500000,
      sisa: 3500000,
      aktivitasIds: ["akt-feb-man-1"],
    },
    {
      id: "proker-feb-akt",
      boundaryId: "fak-feb",
      prodiId: "prodi-feb-akt",
      namaProker: "Uji Kompetensi Certified Public Accountant (CPA) Mahasiswa",
      pagu: 20000000,
      serapan: 16500000,
      sisa: 3500000,
      aktivitasIds: ["akt-feb-akt-1"],
    },
    {
      id: "proker-fh-hkm",
      boundaryId: "fak-fh",
      prodiId: "prodi-fh-hkm",
      namaProker: "Pemberdayaan Pos Bantuan Hukum & Peradilan Semu Nasional",
      pagu: 30000000,
      serapan: 22000000,
      sisa: 8000000,
      aktivitasIds: ["akt-fh-hkm-1"],
    },
    {
      id: "proker-bpsi",
      boundaryId: "unit-bpsi",
      prodiId: null,
      namaProker: "Modernisasi Infrastruktur Data Warehouse & Portal Tracer Terintegrasi",
      pagu: 55000000,
      serapan: 50000000,
      sisa: 5000000,
      aktivitasIds: ["akt-bpsi-1", "akt-bpsi-2"],
    },
    {
      id: "proker-tracer",
      boundaryId: "unit-tracer",
      prodiId: null,
      namaProker: "Pelaksanaan Tracer Study Nasional & Unpak Career Days 2026",
      pagu: 45000000,
      serapan: 40500000,
      sisa: 4500000,
      aktivitasIds: ["akt-tracer-1", "akt-tracer-2"],
    },
    {
      id: "proker-lppm",
      boundaryId: "unit-lppm",
      prodiId: null,
      namaProker: "Hilirisasi Riset Terapan & Insentif Publikasi Bereputasi Scopus/WoS",
      pagu: 75000000,
      serapan: 68000000,
      sisa: 7000000,
      aktivitasIds: ["akt-lppm-1", "akt-lppm-2", "akt-lppm-3"],
    },
  ],

  // ==========================================
  // 7. AKTIVITAS PROKER
  // ==========================================
  aktivitas: [
    {
      id: "akt-mipa-dekanat-1",
      prokerId: "proker-mipa-dekanat",
      namaAktivitas: "Workshop Penjaminan Mutu & Penyusunan Dokumen Akreditasi",
      pic: "Dr. Prasetyowati, M.Si",
      pagu: 20000000,
      serapan: 16000000,
      sisa: 4000000,
      kegiatanIds: ["keg-mipa-dekanat-1a"],
    },
    {
      id: "akt-mipa-cs-1",
      prokerId: "proker-mipa-cs",
      namaAktivitas: "Bootcamp Cloud Computing & Ujian Sertifikasi AWS / Google Cloud",
      pic: "Asep Mulyana, M.Kom",
      pagu: 25000000,
      serapan: 22500000,
      sisa: 2500000,
      kegiatanIds: ["keg-mipa-cs-1a", "keg-mipa-cs-1b"],
    },
    {
      id: "akt-mipa-cs-2",
      prokerId: "proker-mipa-cs",
      namaAktivitas: "Workshop Capstone Project Berbasis Kasus Industri Nyata",
      pic: "Ir. Fajar Setiawan, MT",
      pagu: 20000000,
      serapan: 18000000,
      sisa: 2000000,
      kegiatanIds: ["keg-mipa-cs-2a"],
    },
    {
      id: "akt-mipa-cs-3",
      prokerId: "proker-mipa-cs",
      namaAktivitas: "Penyusunan Kurikulum Kolaborasi AI dengan Industri Mitra (2027)",
      pic: "Asep Mulyana, M.Kom",
      pagu: 5000000,
      serapan: 0,
      sisa: 5000000,
      kegiatanIds: ["keg-mipa-cs-3a"],
    },
    {
      id: "akt-mipa-farm-1",
      prokerId: "proker-mipa-farm",
      namaAktivitas: "Validasi Metode Analisis Ekstrak Herbal & Uji Laboratorium",
      pic: "Apt. Dwi Lestari, M.Farm",
      pagu: 25000000,
      serapan: 22500000,
      sisa: 2500000,
      kegiatanIds: ["keg-mipa-farm-1a", "keg-mipa-farm-1b"],
    },
    {
      id: "akt-mipa-apt-1",
      prokerId: "proker-mipa-apt",
      namaAktivitas: "Try Out Nasional UKAI & Pembekalan Praktik Apotek Komunitas",
      pic: "Apt. Hendra Kusuma, M.Si",
      pagu: 20000000,
      serapan: 18000000,
      sisa: 2000000,
      kegiatanIds: ["keg-mipa-apt-1a", "keg-mipa-apt-1b"],
    },
    {
      id: "akt-mipa-bio-1",
      prokerId: "proker-mipa-bio",
      namaAktivitas: "Eksplorasi Keanekaragaman Hayati TN Gunung Gede Pangrango",
      pic: "Dr. Sri Astuti, M.Si",
      pagu: 15000000,
      serapan: 10000000,
      sisa: 5000000,
      kegiatanIds: ["keg-mipa-bio-1a"],
    },
    {
      id: "akt-mipa-s2cs-1",
      prokerId: "proker-mipa-s2cs",
      namaAktivitas: "Kolokium Riset Kecerdasan Artifisial & Submit Jurnal Scopus",
      pic: "Dr. Ir. Ridwan Siregar, MT",
      pagu: 15000000,
      serapan: 10000000,
      sisa: 5000000,
      kegiatanIds: ["keg-mipa-s2cs-1a"],
    },
    {
      id: "akt-vok-mi-1",
      prokerId: "proker-vok-mi",
      namaAktivitas: "Penempatan Mahasiswa Magang MBKM di Startup Mitra Banten & Jabar",
      pic: "Rina Marlina, M.Kom",
      pagu: 25000000,
      serapan: 18000000,
      sisa: 7000000,
      kegiatanIds: ["keg-vok-mi-1a", "keg-vok-mi-1b"],
    },
    {
      id: "akt-vok-ai-1",
      prokerId: "proker-vok-ai",
      namaAktivitas: "Pengembangan Purwarupa Robot Otonom & Pendampingan Lomba KRI",
      pic: "Teguh Santoso, ST, M.Sc",
      pagu: 25000000,
      serapan: 22000000,
      sisa: 3000000,
      kegiatanIds: ["keg-vok-ai-1a", "keg-vok-ai-1b"],
    },
    {
      id: "akt-vok-akt-1",
      prokerId: "proker-vok-akt",
      namaAktivitas: "Pelatihan Software Akuntansi Accurate & Ujian Kompetensi BNSP",
      pic: "Eko Purwanto, M.Ak",
      pagu: 15000000,
      serapan: 12000000,
      sisa: 3000000,
      kegiatanIds: ["keg-vok-akt-1a"],
    },
    {
      id: "akt-fkip-bio-1",
      prokerId: "proker-fkip-bio",
      namaAktivitas: "Pengembangan E-Modul Pembelajaran Biologi Berbasis Problem Solving",
      pic: "Dr. Rita Rahayu, M.Pd",
      pagu: 35000000,
      serapan: 30000000,
      sisa: 5000000,
      kegiatanIds: ["keg-fkip-bio-1a", "keg-fkip-bio-1b"],
    },
    {
      id: "akt-fkip-ing-1",
      prokerId: "proker-fkip-ing",
      namaAktivitas: "Simulasi Tes TOEFL ITP Bagi Calon Lulusan FKIP se-Universitas",
      pic: "Nurul Hidayati, M.Hum",
      pagu: 25000000,
      serapan: 21000000,
      sisa: 4000000,
      kegiatanIds: ["keg-fkip-ing-1a"],
    },
    {
      id: "akt-fkip-ppg-1",
      prokerId: "proker-fkip-ppg",
      namaAktivitas: "Pelaksanaan Uji Kinerja & Pengetahuan Uji Kompetensi Mahasiswa PPG",
      pic: "Dr. Sudrajat, M.Pd",
      pagu: 20000000,
      serapan: 3000000,
      sisa: 17000000,
      kegiatanIds: ["keg-fkip-ppg-1a"],
    },
    {
      id: "akt-feb-man-1",
      prokerId: "proker-feb-man",
      namaAktivitas: "Pameran Gelar Produk Kewirausahaan Mahasiswa & Business Pitching",
      pic: "Dewi Sartika, SE, MM",
      pagu: 25000000,
      serapan: 21500000,
      sisa: 3500000,
      kegiatanIds: ["keg-feb-man-1a", "keg-feb-man-1b"],
    },
    {
      id: "akt-feb-akt-1",
      prokerId: "proker-feb-akt",
      namaAktivitas: "Bootcamp Audit Forensik & Ujian Sertifikasi Teknisi Akuntan",
      pic: "Bambang Sudibyo, M.Ak",
      pagu: 20000000,
      serapan: 16500000,
      sisa: 3500000,
      kegiatanIds: ["keg-feb-akt-1a"],
    },
    {
      id: "akt-fh-hkm-1",
      prokerId: "proker-fh-hkm",
      namaAktivitas: "Klinik Advokasi Hukum Masyarakat Desa & Simulasi Sidang Semu",
      pic: "Budi Purnomo, SH, LL.M",
      pagu: 30000000,
      serapan: 22000000,
      sisa: 8000000,
      kegiatanIds: ["keg-fh-hkm-1a", "keg-fh-hkm-1b"],
    },
    {
      id: "akt-bpsi-1",
      prokerId: "proker-bpsi",
      namaAktivitas: "Sinkronisasi Data PDDIKTI & Modul Single Sign-On SIAKAD-Tracer",
      pic: "Dr. Ir. Hendra, M.Kom",
      pagu: 30000000,
      serapan: 27500000,
      sisa: 2500000,
      kegiatanIds: ["keg-bpsi-1a", "keg-bpsi-1b"],
    },
    {
      id: "akt-bpsi-2",
      prokerId: "proker-bpsi",
      namaAktivitas: "Pengembangan Dashboard Analytics Kepuasan Pengguna Lulusan",
      pic: "Ahmad Zaki, S.Kom",
      pagu: 25000000,
      serapan: 22500000,
      sisa: 2500000,
      kegiatanIds: ["keg-bpsi-2a", "keg-bpsi-2b"],
    },
    {
      id: "akt-tracer-1",
      prokerId: "proker-tracer",
      namaAktivitas: "Pengumpulan Data Alumni Terlacak Periode 2024-2025 (Tracer Nasional)",
      pic: "Siti Rahmawati, M.Psi",
      pagu: 25000000,
      serapan: 23000000,
      sisa: 2000000,
      kegiatanIds: ["keg-tracer-1a", "keg-tracer-1b"],
    },
    {
      id: "akt-tracer-2",
      prokerId: "proker-tracer",
      namaAktivitas: "Penyelenggaraan Unpak Job Fair & MoU Rekrutmen 25 BUMN/Swasta",
      pic: "Rudi Hartono, SE",
      pagu: 20000000,
      serapan: 17500000,
      sisa: 2500000,
      kegiatanIds: ["keg-tracer-2a", "keg-tracer-2b"],
    },
    {
      id: "akt-lppm-1",
      prokerId: "proker-lppm",
      namaAktivitas: "Inkubasi Prototipe Dosen-Industri & Pendaftaran HKI/Paten",
      pic: "Prof. Dr. Ir. Budi Santoso",
      pagu: 35000000,
      serapan: 32000000,
      sisa: 3000000,
      kegiatanIds: ["keg-lppm-1a", "keg-lppm-1b"],
    },
    {
      id: "akt-lppm-2",
      prokerId: "proker-lppm",
      namaAktivitas: "Insentif Publikasi Internasional Bereputasi Scopus Q1-Q2 & WoS",
      pic: "Dr. Lina Marlina, M.Si",
      pagu: 35000000,
      serapan: 36000000,
      sisa: -1000000,
      kegiatanIds: ["keg-lppm-2a", "keg-lppm-2b"],
    },
    {
      id: "akt-lppm-3",
      prokerId: "proker-lppm",
      namaAktivitas: "Sosialisasi Panduan Skema Riset Terapan Kemendikbud 2027",
      pic: "Prof. Dr. Ir. Budi Santoso",
      pagu: 5000000,
      serapan: 0,
      sisa: 5000000,
      kegiatanIds: ["keg-lppm-3a"],
    },
  ],

  // ==========================================
  // 8. KEGIATAN RAB (Timeline & Serapan Riil)
  // Termasuk status: "Terlaksana", "Belum Terlaksana", "Draf"
  // ==========================================
  kegiatans: [
    // --- FMIPA: Dekanat (Unit Fakultas) ---
    {
      id: "keg-mipa-dekanat-1a",
      aktivitasId: "akt-mipa-dekanat-1",
      boundaryId: "fak-mipa",
      prodiId: null,
      namaKegiatan: "Audit Mutu Internal (AMI) & Sinkronisasi Borang ASIIN FMIPA",
      pic: "Dr. Prasetyowati, M.Si",
      anggaran: 20000000,
      realisasi: 16000000,
      sisa: 4000000,
      persenSerapan: 80.0,
      status: "Terlaksana",
      capaian: "Dokumen evaluasi diri fakultas selesai diverifikasi tim asesor internal.",
      masalah: "Keterlambatan data dukung tracer dari beberapa lulusan lama.",
      pemecahan_masalah: "Koordinasi terpadu dengan BPSI untuk migrasi data histori.",
      indikatorId: "ind-04",
      ikuId: "root-iku-2",
      subIkuId: null,
    },

    // --- FMIPA: S1 Ilmu Komputer ---
    {
      id: "keg-mipa-cs-1a",
      aktivitasId: "akt-mipa-cs-1",
      boundaryId: "fak-mipa",
      prodiId: "prodi-mipa-cs",
      namaKegiatan: "Pengadaan Lisensi Ujian Sertifikasi Cloud Practitioner (50 Mhs)",
      pic: "Asep Mulyana, M.Kom",
      anggaran: 15000000,
      realisasi: 13500000,
      sisa: 1500000,
      persenSerapan: 90.0,
      status: "Terlaksana",
      capaian: "48 dari 50 mahasiswa lulus sertifikasi internasional (96% kelulusan).",
      masalah: "Keterlambatan pembukaan voucher dari Pearson VUE termin awal.",
      pemecahan_masalah: "Koordinasi langsung via distributor resmi edukasi.",
      indikatorId: "ind-01",
      ikuId: "root-iku-2",
      subIkuId: "child-iku-1e",
    },
    {
      id: "keg-mipa-cs-1b",
      aktivitasId: "akt-mipa-cs-1",
      boundaryId: "fak-mipa",
      prodiId: "prodi-mipa-cs",
      namaKegiatan: "Honor Instruktur Bersertifikat & Workshop Intensive Cloud Architect",
      pic: "Asep Mulyana, M.Kom",
      anggaran: 10000000,
      realisasi: 9000000,
      sisa: 1000000,
      persenSerapan: 90.0,
      status: "Terlaksana",
      capaian: "Selesai 8 sesi workshop praktikum cloud hybrid.",
      masalah: "Jadwal instruktur bentrok dengan proyek rilis.",
      pemecahan_masalah: "Dibuatkan kelas pengganti daring akhir pekan.",
      indikatorId: "ind-01",
      ikuId: "root-iku-2",
      subIkuId: "child-iku-1e",
    },
    {
      id: "keg-mipa-cs-2a",
      aktivitasId: "akt-mipa-cs-2",
      boundaryId: "fak-mipa",
      prodiId: "prodi-mipa-cs",
      namaKegiatan: "Implementasi Case Method Kurikulum Bersama PT Telkom & Bank Mandiri",
      pic: "Ir. Fajar Setiawan, MT",
      anggaran: 20000000,
      realisasi: 18000000,
      sisa: 2000000,
      persenSerapan: 90.0,
      status: "Terlaksana",
      capaian: "5 proyek capstone diadopsi untuk prototipe internal mitra perbankan.",
      masalah: "Kerahasiaan data NDA perusahaan.",
      pemecahan_masalah: "Menggunakan dummy data setara production dari mitra.",
      indikatorId: "ind-07",
      ikuId: "root-iku-7",
      subIkuId: null,
    },
    {
      id: "keg-mipa-cs-3a",
      aktivitasId: "akt-mipa-cs-3",
      boundaryId: "fak-mipa",
      prodiId: "prodi-mipa-cs",
      namaKegiatan: "FGD Penyelarasan Capaian Pembelajaran Lulusan dengan Asosiasi AI",
      pic: "Asep Mulyana, M.Kom",
      anggaran: 5000000,
      realisasi: 0,
      sisa: 5000000,
      persenSerapan: 0,
      status: "Draf",
      capaian: "Draft silabus dan SK dekan sedang disusun.",
      masalah: "Menunggu pengesahan matriks kurikulum nasional 2027.",
      pemecahan_masalah: "Rapat koordinasi daring persiapan pra-FGD.",
      indikatorId: "ind-06",
      ikuId: "root-iku-7",
      subIkuId: "child-iku-1e",
    },

    // --- FMIPA: S1 Farmasi ---
    {
      id: "keg-mipa-farm-1a",
      aktivitasId: "akt-mipa-farm-1",
      boundaryId: "fak-mipa",
      prodiId: "prodi-mipa-farm",
      namaKegiatan: "Pengadaan Bahan Kimia Analitik & Reagen Standar BPOM Lab Farmasi",
      pic: "Apt. Dwi Lestari, M.Farm",
      anggaran: 15000000,
      realisasi: 13500000,
      sisa: 1500000,
      persenSerapan: 90.0,
      status: "Terlaksana",
      capaian: "Reagen tiba tepat waktu dan praktikum formulasi berjalan penuh.",
      masalah: "Kenaikan kurs pengadaan bahan baku impor.",
      pemecahan_masalah: "Realokasi sisa bahan praktikum tahun lalu.",
      indikatorId: "ind-05",
      ikuId: "root-iku-5",
      subIkuId: null,
    },
    {
      id: "keg-mipa-farm-1b",
      aktivitasId: "akt-mipa-farm-1",
      boundaryId: "fak-mipa",
      prodiId: "prodi-mipa-farm",
      namaKegiatan: "Penyusunan Modul Praktikum Integrasi Riset Fitofarmaka Dosen",
      pic: "Apt. Dwi Lestari, M.Farm",
      anggaran: 10000000,
      realisasi: 9000000,
      sisa: 1000000,
      persenSerapan: 90.0,
      status: "Terlaksana",
      capaian: "Tercetak 200 buku panduan lab ber-ISBN.",
      masalah: "Revisi layout buku panduan terlambat dari percetakan.",
      pemecahan_masalah: "Distribusi e-book versi sementara sebelum fisik terbit.",
      indikatorId: "ind-05",
      ikuId: "root-iku-5",
      subIkuId: null,
    },

    // --- FMIPA: Profesi Apoteker (RED FLAG KASUS A: Uang Cair 90%, Pekerjaan 0% Selesai) ---
    {
      id: "keg-mipa-apt-1a",
      aktivitasId: "akt-mipa-apt-1",
      boundaryId: "fak-mipa",
      prodiId: "prodi-mipa-apt",
      namaKegiatan: "Pendaftaran CBT & Pelaksanaan Uji Kompetensi Apoteker Indonesia",
      pic: "Apt. Hendra Kusuma, M.Si",
      anggaran: 12000000,
      realisasi: 11000000,
      sisa: 1000000,
      persenSerapan: 91.67,
      status: "Belum Terlaksana",
      capaian: "Tahap pendaftaran selesai, namun jadwal ujian diundur oleh Panitia Nasional UKAI.",
      masalah: "Penundaan jadwal serentak se-Indonesia dari Asosiasi Pendidikan Tinggi Farmasi (APTFI).",
      pemecahan_masalah: "Mengadakan try-out internal tambahan agar mahasiswa tetap siap ujian.",
      indikatorId: "ind-01",
      ikuId: "root-iku-2",
      subIkuId: "child-iku-1e",
    },
    {
      id: "keg-mipa-apt-1b",
      aktivitasId: "akt-mipa-apt-1",
      boundaryId: "fak-mipa",
      prodiId: "prodi-mipa-apt",
      namaKegiatan: "Workshop Preseptor & Penjajakan Wahana PKPA di RSUD Kota Bogor",
      pic: "Apt. Hendra Kusuma, M.Si",
      anggaran: 8000000,
      realisasi: 7000000,
      sisa: 1000000,
      persenSerapan: 87.5,
      status: "Belum Terlaksana",
      capaian: "Draft PKS telah diajukan ke dinas kesehatan, menunggu tanda tangan pimpinan daerah.",
      masalah: "Birokrasi perizinan kerja sama di rumah sakit rujukan pemerintah.",
      pemecahan_masalah: "Eskalasi permohonan rekomendasi melalui Rektorat ke Walikota Bogor.",
      indikatorId: "ind-01",
      ikuId: "root-iku-2",
      subIkuId: "child-iku-1e",
    },

    // --- FMIPA: S1 Biologi ---
    {
      id: "keg-mipa-bio-1a",
      aktivitasId: "akt-mipa-bio-1",
      boundaryId: "fak-mipa",
      prodiId: "prodi-mipa-bio",
      namaKegiatan: "Kuliah Lapangan Ekologi Terrestrial & Pemetaan Flora Endemik",
      pic: "Dr. Sri Astuti, M.Si",
      anggaran: 15000000,
      realisasi: 10000000,
      sisa: 5000000,
      persenSerapan: 66.67,
      status: "Terlaksana",
      capaian: "Katalog herbarium digital 85 spesimen flora hutan tropis selesai.",
      masalah: "Kendala cuaca hujan ekstrem di pos riset Gunung Gede.",
      pemecahan_masalah: "Pengambilan sampel dibagi ke dua shift tim ekspedisi.",
      indikatorId: "ind-07",
      ikuId: "root-iku-7",
      subIkuId: null,
    },

    // --- FMIPA: Magister Ilmu Komputer (S2) ---
    {
      id: "keg-mipa-s2cs-1a",
      aktivitasId: "akt-mipa-s2cs-1",
      boundaryId: "fak-mipa",
      prodiId: "prodi-mipa-s2cs",
      namaKegiatan: "Bimbingan Penulisan Publikasi Scopus & Proofreading Bahasa Akademik",
      pic: "Dr. Ir. Ridwan Siregar, MT",
      anggaran: 15000000,
      realisasi: 10000000,
      sisa: 5000000,
      persenSerapan: 66.67,
      status: "Terlaksana",
      capaian: "4 artikel mahasiswa S2 accepted pada konferensi internasional IEEE.",
      masalah: "Biaya proofreading Native Speaker melebihi pagu satuan.",
      pemecahan_masalah: "Menggunakan layanan lembaga bahasa resmi universitas.",
      indikatorId: "ind-08",
      ikuId: "root-iku-5",
      subIkuId: "child-sub11",
    },

    // --- VOKASI: D3 Manajemen Informatika (MANDEK / UNDER-ABSORBED) ---
    {
      id: "keg-vok-mi-1a",
      aktivitasId: "akt-vok-mi-1",
      boundaryId: "fak-vokasi",
      prodiId: "prodi-vok-mi",
      namaKegiatan: "Subsidi Biaya Transportasi & Uang Saku Magang Industri Mitra 6 Bulan",
      pic: "Rina Marlina, M.Kom",
      anggaran: 15000000,
      realisasi: 10000000,
      sisa: 5000000,
      persenSerapan: 66.67,
      status: "Terlaksana",
      capaian: "25 mahasiswa D3 aktif magang di perusahaan fintech terkemuka.",
      masalah: "Sebagian mahasiswa telat mengurus berkas administrasi izin ortu.",
      pemecahan_masalah: "Dibuat formulir persetujuan digital via SIAMIDA.",
      indikatorId: "ind-06",
      ikuId: "root-iku-7",
      subIkuId: "child-iku-1c",
    },
    {
      id: "keg-vok-mi-1b",
      aktivitasId: "akt-vok-mi-1",
      boundaryId: "fak-vokasi",
      prodiId: "prodi-vok-mi",
      namaKegiatan: "Monitoring & Evaluasi Kunjungan Dosen Pembimbing Lapangan Magang",
      pic: "Rina Marlina, M.Kom",
      anggaran: 10000000,
      realisasi: 8000000,
      sisa: 2000000,
      persenSerapan: 80.0,
      status: "Belum Terlaksana",
      capaian: "Kunjungan fisik baru mencakup 30% perusahaan mitra karena masa UTS.",
      masalah: "Jadwal supervisi dosen bentrok dengan masa input nilai semester.",
      pemecahan_masalah: "Melaksanakan monev secara hybrid (online progress review).",
      indikatorId: "ind-06",
      ikuId: "root-iku-7",
      subIkuId: "child-iku-1c",
    },

    // --- VOKASI: D4 Kecerdasan Buatan dan Robotik ---
    {
      id: "keg-vok-ai-1a",
      aktivitasId: "akt-vok-ai-1",
      boundaryId: "fak-vokasi",
      prodiId: "prodi-vok-ai",
      namaKegiatan: "Pengadaan Mikrokontroler, Sensor LiDAR & Komponen Mekatronika KRI",
      pic: "Teguh Santoso, ST, M.Sc",
      anggaran: 15000000,
      realisasi: 13500000,
      sisa: 1500000,
      persenSerapan: 90.0,
      status: "Terlaksana",
      capaian: "Robot sepak bola otonom berhasil dirakit dan lolos seleksi wilayah.",
      masalah: "Waktu pengiriman spare part mikrokontroler dari luar negeri.",
      pemecahan_masalah: "Pre-order komponen dari distributor cadangan lokal.",
      indikatorId: "ind-09",
      ikuId: "root-iku-5",
      subIkuId: "child-iku-1e",
    },
    {
      id: "keg-vok-ai-1b",
      aktivitasId: "akt-vok-ai-1",
      boundaryId: "fak-vokasi",
      prodiId: "prodi-vok-ai",
      namaKegiatan: "Akomodasi & Uji Coba Lapangan Tim Robotika Tingkat Regional",
      pic: "Teguh Santoso, ST, M.Sc",
      anggaran: 10000000,
      realisasi: 8500000,
      sisa: 1500000,
      persenSerapan: 85.0,
      status: "Terlaksana",
      capaian: "Meraih Juara 2 Kategori Robot Cerdas Wilayah 2 Banten-Jabar.",
      masalah: "Kebutuhan daya baterai robot cepat panas saat running test.",
      pemecahan_masalah: "Memodifikasi sistem pendingin heatsink aluminium.",
      indikatorId: "ind-09",
      ikuId: "root-iku-5",
      subIkuId: "child-iku-1e",
    },

    // --- VOKASI: D3 Akuntansi (RED FLAG KASUS A) ---
    {
      id: "keg-vok-akt-1a",
      aktivitasId: "akt-vok-akt-1",
      boundaryId: "fak-vokasi",
      prodiId: "prodi-vok-akt",
      namaKegiatan: "Uji Kompetensi Teknisi Akuntansi Junior Bersertifikasi BNSP",
      pic: "Eko Purwanto, M.Ak",
      anggaran: 15000000,
      realisasi: 12000000,
      sisa: 3000000,
      persenSerapan: 80.0,
      status: "Belum Terlaksana",
      capaian: "Uang tes telah disetorkan ke LSP, jadwal asesor dari pusat ditunda.",
      masalah: "Ketersediaan jadwal asesor eksternal BNSP yang terbatas.",
      pemecahan_masalah: "Meminta penjadwalan ulang asesmen prioritas di bulan depan.",
      indikatorId: "ind-01",
      ikuId: "root-iku-2",
      subIkuId: "child-iku-1c",
    },

    // --- FKIP: S1 Pendidikan Biologi ---
    {
      id: "keg-fkip-bio-1a",
      aktivitasId: "akt-fkip-bio-1",
      boundaryId: "fak-fkip",
      prodiId: "prodi-fkip-bio",
      namaKegiatan: "Penyusunan Media Pembelajaran Digital Virtual Lab untuk Guru SMA",
      pic: "Dr. Rita Rahayu, M.Pd",
      anggaran: 20000000,
      realisasi: 17500000,
      sisa: 2500000,
      persenSerapan: 87.5,
      status: "Terlaksana",
      capaian: "Aplikasi Virtual Lab Biologi selesai diujicobakan pada 10 sekolah mitra.",
      masalah: "Keterbatasan kuota internet guru saat workshop luring.",
      pemecahan_masalah: "Disediakan modem portabel dedicated dari panitia.",
      indikatorId: "ind-07",
      ikuId: "root-iku-7",
      subIkuId: null,
    },
    {
      id: "keg-fkip-bio-1b",
      aktivitasId: "akt-fkip-bio-1",
      boundaryId: "fak-fkip",
      prodiId: "prodi-fkip-bio",
      namaKegiatan: "Diseminasi Karya Pembelajaran Inovatif ke MGMP Biologi Bogor",
      pic: "Dr. Rita Rahayu, M.Pd",
      anggaran: 15000000,
      realisasi: 12500000,
      sisa: 2500000,
      persenSerapan: 83.33,
      status: "Terlaksana",
      capaian: "120 guru terdaftar dan aktif mengimplementasikan modul di kelas.",
      masalah: "Tempat aula pertemuan sekolah mitra sedang renovasi.",
      pemecahan_masalah: "Dialihkan ke Gedung Graha Pakuan Unpak.",
      indikatorId: "ind-07",
      ikuId: "root-iku-7",
      subIkuId: null,
    },

    // --- FKIP: S1 Pendidikan Bahasa Inggris ---
    {
      id: "keg-fkip-ing-1a",
      aktivitasId: "akt-fkip-ing-1",
      boundaryId: "fak-fkip",
      prodiId: "prodi-fkip-ing",
      namaKegiatan: "Pelaksanaan Ujian TOEFL Prediction Massal Bagi Calon Lulusan",
      pic: "Nurul Hidayati, M.Hum",
      anggaran: 25000000,
      realisasi: 21000000,
      sisa: 4000000,
      persenSerapan: 84.0,
      status: "Terlaksana",
      capaian: "350 mahasiswa mengikuti tes dengan skor rata-rata meningkat 42 poin.",
      masalah: "Server ujian lab bahasa down sesaat di kloter pertama.",
      pemecahan_masalah: "Restart container dan load balancing ke server cadangan BPSI.",
      indikatorId: "ind-01",
      ikuId: "root-iku-2",
      subIkuId: "child-iku-1e",
    },

    // --- FKIP: Profesi PPG (RED FLAG KASUS B: Pekerjaan Tuntas 100%, Namun Uang Belum Cair: Serapan 15%) ---
    {
      id: "keg-fkip-ppg-1a",
      aktivitasId: "akt-fkip-ppg-1",
      boundaryId: "fak-fkip",
      prodiId: "prodi-fkip-ppg",
      namaKegiatan: "Uji Kompetensi Peserta PPG Prajabatan & Pembekalan Sertifikasi Pendidik",
      pic: "Dr. Sudrajat, M.Pd",
      anggaran: 20000000,
      realisasi: 3000000,
      sisa: 17000000,
      persenSerapan: 15.0,
      status: "Terlaksana",
      capaian: "Uji kompetensi 120 mahasiswa PPG selesai 100% dan kelulusan 98%.",
      masalah: "Pencairan dana bantuan operasional termin 2 dari Kemendikbudristek tersendat di KPPN.",
      pemecahan_masalah: "Mengajukan reimbursement talangan dana internal universitas ke WR2.",
      indikatorId: "ind-10",
      ikuId: "root-iku-1",
      subIkuId: "child-iku-1e",
    },

    // --- FEB: S1 Manajemen ---
    {
      id: "keg-feb-man-1a",
      aktivitasId: "akt-feb-man-1",
      boundaryId: "fak-feb",
      prodiId: "prodi-feb-man",
      namaKegiatan: "Pendampingan Legalitas Usaha & NIB 30 Usaha Mahasiswa Binaan",
      pic: "Dewi Sartika, SE, MM",
      anggaran: 15000000,
      realisasi: 13000000,
      sisa: 2000000,
      persenSerapan: 86.67,
      status: "Terlaksana",
      capaian: "28 usaha mahasiswa resmi mengantongi legalitas NIB dan P-IRT.",
      masalah: "Proses verifikasi OSS RBA sempat maintenance nasional.",
      pemecahan_masalah: "Asistensi pendampingan langsung dengan verifikator dinas.",
      indikatorId: "ind-09",
      ikuId: "root-iku-5",
      subIkuId: "child-iku-1e",
    },
    {
      id: "keg-feb-man-1b",
      aktivitasId: "akt-feb-man-1",
      boundaryId: "fak-feb",
      prodiId: "prodi-feb-man",
      namaKegiatan: "Fasilitasi Stand Pameran Expo Kewirausahaan Kampus Merdeka",
      pic: "Dewi Sartika, SE, MM",
      anggaran: 10000000,
      realisasi: 8500000,
      sisa: 1500000,
      persenSerapan: 85.0,
      status: "Terlaksana",
      capaian: "Total omzet penjualan stand mahasiswa mencapai Rp 45.000.000 dalam 3 hari.",
      masalah: "Pasokan listrik booth indoor overload di jam puncak.",
      pemecahan_masalah: "Penambahan genset mobile bantuan dari BAUM.",
      indikatorId: "ind-09",
      ikuId: "root-iku-5",
      subIkuId: "child-iku-1e",
    },

    // --- FEB: S1 Akuntansi (RED FLAG KASUS A) ---
    {
      id: "keg-feb-akt-1a",
      aktivitasId: "akt-feb-akt-1",
      boundaryId: "fak-feb",
      prodiId: "prodi-feb-akt",
      namaKegiatan: "Ujian Sertifikasi CA (Chartered Accountant) Level Dasar IAPI",
      pic: "Bambang Sudibyo, M.Ak",
      anggaran: 20000000,
      realisasi: 16500000,
      sisa: 3500000,
      persenSerapan: 82.5,
      status: "Belum Terlaksana",
      capaian: "Registrasi dan pembayaran ujian rampung, jadwal resmi ditunda ke bulan depan.",
      masalah: "Keterlambatan pembukaan sistem pendaftaran dari IAPI pusat.",
      pemecahan_masalah: "Melakukan bimbingan intensif try-out daring mingguan.",
      indikatorId: "ind-01",
      ikuId: "root-iku-2",
      subIkuId: "child-iku-1e",
    },

    // --- FAKULTAS HUKUM: S1 Ilmu Hukum (EFISIEN / HEMAT) ---
    {
      id: "keg-fh-hkm-1a",
      aktivitasId: "akt-fh-hkm-1",
      boundaryId: "fak-fh",
      prodiId: "prodi-fh-hkm",
      namaKegiatan: "Penyuluhan Hukum Restorative Justice & Bantuan Hukum Warga Pra-Sejahtera",
      pic: "Budi Purnomo, SH, LL.M",
      anggaran: 15000000,
      realisasi: 11000000,
      sisa: 4000000,
      persenSerapan: 73.33,
      status: "Terlaksana",
      capaian: "30 perkara konsultasi hukum warga tertangani gratis dan berhasil mediasi.",
      masalah: "Warga enggan hadir di balai desa saat siang hari.",
      pemecahan_masalah: "Penyuluhan dialihkan ke malam hari setelah jam kerja warga.",
      indikatorId: "ind-02",
      ikuId: "root-iku-2",
      subIkuId: null,
    },
    {
      id: "keg-fh-hkm-1b",
      aktivitasId: "akt-fh-hkm-1",
      boundaryId: "fak-fh",
      prodiId: "prodi-fh-hkm",
      namaKegiatan: "Kompetisi Peradilan Semu Tingkat Nasional Piala Bergilir Mahkamah Agung",
      pic: "Budi Purnomo, SH, LL.M",
      anggaran: 15000000,
      realisasi: 11000000,
      sisa: 4000000,
      persenSerapan: 73.33,
      status: "Terlaksana",
      capaian: "Delegasi FH Unpak masuk 4 besar nasional dan meraih Berkas Perkara Terbaik.",
      masalah: "Perubahan jadwal sidang semu dari panitia penyelenggara universitas tuan rumah.",
      pemecahan_masalah: "Penyesuaian tiket transportasi delegasi tanpa pinalti denda.",
      indikatorId: "ind-10",
      ikuId: "root-iku-1",
      subIkuId: "child-iku-1e",
    },

    // --- UNIT: BPSI (SANGAT OPTIMAL) ---
    {
      id: "keg-bpsi-1a",
      aktivitasId: "akt-bpsi-1",
      boundaryId: "unit-bpsi",
      prodiId: null,
      namaKegiatan: "Integrasi API PDDIKTI Feeder & Sinkronisasi Status Kelulusan",
      pic: "Dr. Ir. Hendra, M.Kom",
      anggaran: 18000000,
      realisasi: 16500000,
      sisa: 1500000,
      persenSerapan: 91.67,
      status: "Terlaksana",
      capaian: "Data 2.450 lulusan tersinkronisasi 100% tanpa anomali NIK/NIM.",
      masalah: "Limit koneksi API Kemendikbud di jam kerja sibuk.",
      pemecahan_masalah: "Proses sinkronisasi diatur otomatis tengah malam via cronjob.",
      indikatorId: "ind-03",
      ikuId: "root-iku-2",
      subIkuId: null,
    },
    {
      id: "keg-bpsi-1b",
      aktivitasId: "akt-bpsi-1",
      boundaryId: "unit-bpsi",
      prodiId: null,
      namaKegiatan: "Peningkatan Keamanan Server Database Tracer Study & Sertifikat SSL",
      pic: "Dr. Ir. Hendra, M.Kom",
      anggaran: 12000000,
      realisasi: 11000000,
      sisa: 1000000,
      persenSerapan: 91.67,
      status: "Terlaksana",
      capaian: "Uptime server 99.9% dan hasil penetration test grade A.",
      masalah: "Serangan brute force bot pada form login alumni.",
      pemecahan_masalah: "Memasang Cloudflare Turnstile & rate limiting.",
      indikatorId: "ind-03",
      ikuId: "root-iku-2",
      subIkuId: null,
    },
    {
      id: "keg-bpsi-2a",
      aktivitasId: "akt-bpsi-2",
      boundaryId: "unit-bpsi",
      prodiId: null,
      namaKegiatan: "Penyusunan Modul Dashboard Visualisasi Real-Time Pengguna Lulusan",
      pic: "Ahmad Zaki, S.Kom",
      anggaran: 15000000,
      realisasi: 13500000,
      sisa: 1500000,
      persenSerapan: 90.0,
      status: "Terlaksana",
      capaian: "Dashboard live diakses pimpinan universitas dan dekanat.",
      masalah: "Penyesuaian filter data multi-prodi yang rumit.",
      pemecahan_masalah: "Optimasi query indexing database SQL.",
      indikatorId: "ind-04",
      ikuId: "root-iku-2",
      subIkuId: null,
    },
    {
      id: "keg-bpsi-2b",
      aktivitasId: "akt-bpsi-2",
      boundaryId: "unit-bpsi",
      prodiId: null,
      namaKegiatan: "Integrasi Notifikasi WhatsApp Blast & Email Reminder Alumni",
      pic: "Ahmad Zaki, S.Kom",
      anggaran: 10000000,
      realisasi: 9000000,
      sisa: 1000000,
      persenSerapan: 90.0,
      status: "Terlaksana",
      capaian: "Open rate kuesioner meningkat dari 35% menjadi 78%.",
      masalah: "Pemblokiran nomor blast oleh meta.",
      pemecahan_masalah: "Beralih ke WhatsApp Official Business API resmi terverifikasi.",
      indikatorId: "ind-03",
      ikuId: "root-iku-2",
      subIkuId: null,
    },

    // --- UNIT: TRACER STUDY & KARIR ---
    {
      id: "keg-tracer-1a",
      aktivitasId: "akt-tracer-1",
      boundaryId: "unit-tracer",
      prodiId: null,
      namaKegiatan: "Insentif Pengisian Kuesioner Tracer Study & Pengundian Doorprize",
      pic: "Siti Rahmawati, M.Psi",
      anggaran: 15000000,
      realisasi: 14000000,
      sisa: 1000000,
      persenSerapan: 93.33,
      status: "Terlaksana",
      capaian: "Responden terlacak mencapai target nasional 82.5%.",
      masalah: "Banyak nomor HP alumni tidak aktif lagi.",
      pemecahan_masalah: "Meminta bantuan ikatan alumni (IKA) tiap fakultas.",
      indikatorId: "ind-03",
      ikuId: "root-iku-2",
      subIkuId: null,
    },
    {
      id: "keg-tracer-1b",
      aktivitasId: "akt-tracer-1",
      boundaryId: "unit-tracer",
      prodiId: null,
      namaKegiatan: "Penyusunan Buku Laporan Analisis Kesenjangan Keterampilan Kerja",
      pic: "Siti Rahmawati, M.Psi",
      anggaran: 10000000,
      realisasi: 9000000,
      sisa: 1000000,
      persenSerapan: 90.0,
      status: "Terlaksana",
      capaian: "Buku analisis tersampaikan ke seluruh kaprodi untuk bahan tinjauan kurikulum.",
      masalah: "Penulisan bab rekomendasi kualitatif butuh waktu konfirmasi pakar.",
      pemecahan_masalah: "FGD kilat bersama dewan pakar industri.",
      indikatorId: "ind-02",
      ikuId: "root-iku-2",
      subIkuId: null,
    },
    {
      id: "keg-tracer-2a",
      aktivitasId: "akt-tracer-2",
      boundaryId: "unit-tracer",
      prodiId: null,
      namaKegiatan: "Pelaksanaan Unpak Career Days 2026 & Walk-in Interview",
      pic: "Rudi Hartono, SE",
      anggaran: 12000000,
      realisasi: 11000000,
      sisa: 1000000,
      persenSerapan: 91.67,
      status: "Terlaksana",
      capaian: "1.200 pelamar hadir dan 140 lulusan langsung diterima kerja on the spot.",
      masalah: "Antrean pelamar membeludak di lobby rektorat.",
      pemecahan_masalah: "Penerapan sistem tiket antrean berbasis QR Code online.",
      indikatorId: "ind-01",
      ikuId: "root-iku-2",
      subIkuId: null,
    },
    {
      id: "keg-tracer-2b",
      aktivitasId: "akt-tracer-2",
      boundaryId: "unit-tracer",
      prodiId: null,
      namaKegiatan: "Penyusunan PKS Kemitraan Rekrutmen Kampus dengan 10 Perusahaan Multinasional",
      pic: "Rudi Hartono, SE",
      anggaran: 8000000,
      realisasi: 6500000,
      sisa: 1500000,
      persenSerapan: 81.25,
      status: "Belum Terlaksana",
      capaian: "6 perusahaan telah menandatangani MoU, 4 perusahaan masih review legalitas.",
      masalah: "Proses tinjauan hukum klausul magang dari kantor pusat mitra di Jakarta.",
      pemecahan_masalah: "Follow-up mingguan bersama tim legal kerja sama Unpak.",
      indikatorId: "ind-02",
      ikuId: "root-iku-2",
      subIkuId: null,
    },

    // --- UNIT: LPPM (RED FLAG KASUS A) ---
    {
      id: "keg-lppm-1a",
      aktivitasId: "akt-lppm-1",
      boundaryId: "unit-lppm",
      prodiId: null,
      namaKegiatan: "Bantuan Biaya Pendaftaran Paten Sederhana & Hak Cipta Dosen",
      pic: "Prof. Dr. Ir. Budi Santoso",
      anggaran: 20000000,
      realisasi: 18500000,
      sisa: 1500000,
      persenSerapan: 92.5,
      status: "Terlaksana",
      capaian: "32 sertifikat Hak Cipta dan 4 Paten resmi tercatat di DJKI Kemenkumham.",
      masalah: "Ketidaklengkapan dokumen deskripsi klaim paten dosen inventor.",
      pemecahan_masalah: "Klinik pendampingan intensif bersama konsultan paten tersertifikasi.",
      indikatorId: "ind-09",
      ikuId: "root-iku-5",
      subIkuId: null,
    },
    {
      id: "keg-lppm-1b",
      aktivitasId: "akt-lppm-1",
      boundaryId: "unit-lppm",
      prodiId: null,
      namaKegiatan: "Fasilitasi Pameran Produk Inovasi Dosen di InaRI Expo BRIN Jakarta",
      pic: "Prof. Dr. Ir. Budi Santoso",
      anggaran: 15000000,
      realisasi: 13500000,
      sisa: 1500000,
      persenSerapan: 90.0,
      status: "Belum Terlaksana",
      capaian: "Uang pendaftaran booth dan akomodasi telah dibayarkan, pelaksanaan expo diundur BRIN.",
      masalah: "Penjadwalan ulang agenda tahunan InaRI Expo oleh pihak penyelenggara BRIN.",
      pemecahan_masalah: "Menyempurnakan display prototipe dan leaflet promosi selama masa jeda.",
      indikatorId: "ind-09",
      ikuId: "root-iku-5",
      subIkuId: null,
    },
    {
      id: "keg-lppm-2a",
      aktivitasId: "akt-lppm-2",
      boundaryId: "unit-lppm",
      prodiId: null,
      namaKegiatan: "Insentif Publikasi Artikel Jurnal Bereputasi Internasional (Scopus Q1/Q2)",
      pic: "Dr. Lina Marlina, M.Si",
      anggaran: 25000000,
      realisasi: 23000000,
      sisa: 2000000,
      persenSerapan: 92.0,
      status: "Terlaksana",
      capaian: "Insentif telah dicairkan untuk 18 naskah publikasi dosen berstatus published.",
      masalah: "Kenaikan APC (Article Processing Charge) jurnal internasional.",
      pemecahan_masalah: "Pemberlakuan plafon maksimal insentif per judul artikel.",
      indikatorId: "ind-08",
      ikuId: "root-iku-5",
      subIkuId: null,
    },
    {
      id: "keg-lppm-2b",
      aktivitasId: "akt-lppm-2",
      boundaryId: "unit-lppm",
      prodiId: null,
      namaKegiatan: "Coaching Clinic Penulisan Artikel Ilmiah Bersama Editor Jurnal Bereputasi",
      pic: "Dr. Lina Marlina, M.Si",
      anggaran: 10000000,
      realisasi: 9000000,
      sisa: 1000000,
      persenSerapan: 90.0,
      status: "Belum Terlaksana",
      capaian: "Honorarium narasumber internasional telah dialokasikan, workshop tahap 2 tertunda.",
      masalah: "Narasumber utama asal Belanda sakit dan meminta penjadwalan ulang bulan depan.",
      pemecahan_masalah: "Melaksanakan sesi bimbingan reviewer lokal sembari menunggu pemulihan narasumber.",
      indikatorId: "ind-08",
      ikuId: "root-iku-5",
      subIkuId: null,
    },
    {
      id: "keg-lppm-3a",
      aktivitasId: "akt-lppm-3",
      boundaryId: "unit-lppm",
      prodiId: null,
      namaKegiatan: "Penyusunan Rencana Induk Riset (RIR) Unpak Periode 2027-2032",
      pic: "Prof. Dr. Ir. Budi Santoso",
      anggaran: 5000000,
      realisasi: 0,
      sisa: 5000000,
      persenSerapan: 0,
      status: "Draf",
      capaian: "Tahap pengumpulan borang usulan topik riset prioritas fakultas.",
      masalah: "Menunggu masukan dari dewan pakar eksternal.",
      pemecahan_masalah: "FGD pra-evaluasi internal tim LPPM.",
      indikatorId: "ind-08",
      ikuId: "root-iku-5",
      subIkuId: null,
    },
  ],
};

// ==========================================
// HELPER PERHITUNGAN DAN AGREGASI EKSEKUTIF
// ==========================================

export function calculateSankeySummary(year = "2026") {
  const { danaUtama, kegiatans, rootIkus, boundaries } = SANKEY_DATA;
  const yNum = Number(year) || 2026;
  const factor =
    yNum === 2027
      ? 1.2
      : yNum === 2025
      ? 0.88
      : yNum === 2024
      ? 0.78
      : yNum === 2023
      ? 0.65
      : 1.0;

  const totalDana = Math.round(danaUtama.totalDana * factor);
  const totalSerapan = Math.round(danaUtama.totalSerapan * factor);
  const totalSisa = totalDana - totalSerapan;
  const persenSerapan = Number(((totalSerapan / totalDana) * 100).toFixed(1));

  const totalKegiatan = kegiatans.length;
  const kegiatanTerlaksana = kegiatans.filter(
    (k) => k.status === "Terlaksana",
  ).length;
  const kegiatanBelumTerlaksana = kegiatans.filter(
    (k) => k.status === "Belum Terlaksana",
  ).length;
  const kegiatanDraf = kegiatans.filter((k) => k.status === "Draf").length;
  const persenKeterlaksanaan = Number(
    ((kegiatanTerlaksana / totalKegiatan) * 100).toFixed(1),
  );

  return {
    totalDana,
    totalSerapan,
    totalSisa,
    persenSerapan,
    totalKegiatan,
    kegiatanTerlaksana,
    kegiatanBelumTerlaksana,
    kegiatanDraf,
    persenKeterlaksanaan,
    totalRootIku: rootIkus.length,
    totalBoundary: boundaries.length,
  };
}

// Menghitung Matriks Korelasi (Uang vs Capaian Kerja)
// Kuadran II: Red Flag (Peringatan Audit)
// Mengakomodasi 2 kasus anomali:
// 1. Uang banyak dicairkan (>=75%) tetapi pekerjaan belum tuntas (<75%)
// 2. Pekerjaan tuntas (>=75%) namun uang belum cair (<30%)
export function getCorrelationMatrix(level = "iku") {
  const { kegiatans, rootIkus, boundaries } = SANKEY_DATA;

  const classifyQuadrant = (persenSerap, persenKerja) => {
    // KASUS RED FLAG:
    // A: Uang banyak dicairkan tapi pekerjaan belum tuntas
    // B: Pekerjaan tuntas namun uang belum cair
    if (
      (persenSerap >= 75 && persenKerja < 75) ||
      (persenKerja >= 75 && persenSerap < 30)
    ) {
      return {
        kuadran: 2,
        labelKuadran: "Red Flag (Peringatan Audit)",
        statusColor: "rose",
        anomalyType:
          persenSerap >= 75
            ? "Uang banyak dicairkan tapi pekerjaan belum tuntas"
            : "Pekerjaan tuntas namun uang belum cair",
      };
    }

    // KUADRAN I: Optimal & Produktif
    if (persenSerap >= 75 && persenKerja >= 75) {
      return {
        kuadran: 1,
        labelKuadran: "Optimal & Produktif",
        statusColor: "emerald",
      };
    }

    // KUADRAN III: Mandek / Under-absorbed
    if (persenSerap < 75 && persenKerja < 75) {
      return {
        kuadran: 3,
        labelKuadran: "Mandek / Under-absorbed",
        statusColor: "amber",
      };
    }

    // KUADRAN IV: Efisien / Hemat Anggaran
    return {
      kuadran: 4,
      labelKuadran: "Efisien / Hemat Anggaran",
      statusColor: "blue",
    };
  };

  if (level === "iku") {
    return rootIkus.map((iku) => {
      const relatedKegiatans = kegiatans.filter((k) => k.ikuId === iku.id);
      const totalKeg = relatedKegiatans.length;
      const doneKeg = relatedKegiatans.filter(
        (k) => k.status === "Terlaksana",
      ).length;
      const pendingKeg = relatedKegiatans.filter(
        (k) => k.status === "Belum Terlaksana",
      ).length;
      const draftKeg = relatedKegiatans.filter((k) => k.status === "Draf").length;
      const totalPagu = relatedKegiatans.reduce((acc, k) => acc + k.anggaran, 0);
      const totalSerap = relatedKegiatans.reduce(
        (acc, k) => acc + k.realisasi,
        0,
      );
      const persenSerap =
        totalPagu > 0 ? Number(((totalSerap / totalPagu) * 100).toFixed(1)) : 0;
      const persenKerja =
        totalKeg > 0 ? Number(((doneKeg / totalKeg) * 100).toFixed(1)) : 0;

      const q = classifyQuadrant(persenSerap, persenKerja);

      return {
        id: iku.id,
        kode: iku.kode,
        nama: iku.nama,
        level: "iku",
        totalPagu,
        totalSerap,
        persenSerap,
        totalKeg,
        doneKeg,
        pendingKeg,
        draftKeg,
        persenKerja,
        kuadran: q.kuadran,
        labelKuadran: q.labelKuadran,
        statusColor: q.statusColor,
        anomalyType: q.anomalyType,
        kegiatans: relatedKegiatans,
      };
    });
  }

  if (level === "boundary") {
    return boundaries.map((b) => {
      const relatedKegiatans = kegiatans.filter((k) => k.boundaryId === b.id);
      const totalKeg = relatedKegiatans.length;
      const doneKeg = relatedKegiatans.filter(
        (k) => k.status === "Terlaksana",
      ).length;
      const pendingKeg = relatedKegiatans.filter(
        (k) => k.status === "Belum Terlaksana",
      ).length;
      const draftKeg = relatedKegiatans.filter((k) => k.status === "Draf").length;
      const totalPagu = relatedKegiatans.reduce((acc, k) => acc + k.anggaran, 0);
      const totalSerap = relatedKegiatans.reduce(
        (acc, k) => acc + k.realisasi,
        0,
      );
      const persenSerap =
        totalPagu > 0 ? Number(((totalSerap / totalPagu) * 100).toFixed(1)) : 0;
      const persenKerja =
        totalKeg > 0 ? Number(((doneKeg / totalKeg) * 100).toFixed(1)) : 0;

      const q = classifyQuadrant(persenSerap, persenKerja);

      return {
        id: b.id,
        kode: b.kode || b.namaSingkat,
        nama: b.nama,
        type: b.type,
        level: "boundary",
        totalPagu,
        totalSerap,
        persenSerap,
        totalKeg,
        doneKeg,
        pendingKeg,
        draftKeg,
        persenKerja,
        kuadran: q.kuadran,
        labelKuadran: q.labelKuadran,
        statusColor: q.statusColor,
        anomalyType: q.anomalyType,
        kegiatans: relatedKegiatans,
      };
    });
  }

  // Level 'prodi'
  const prodiItems = [];

  boundaries.forEach((b) => {
    if (b.type === "fakultas" && b.jenjangList) {
      b.jenjangList.forEach((j) => {
        j.prodis.forEach((p) => {
          const relatedKegiatans = kegiatans.filter((k) => k.prodiId === p.id);
          const totalKeg = relatedKegiatans.length;
          const doneKeg = relatedKegiatans.filter(
            (k) => k.status === "Terlaksana",
          ).length;
          const pendingKeg = relatedKegiatans.filter(
            (k) => k.status === "Belum Terlaksana",
          ).length;
          const draftKeg = relatedKegiatans.filter(
            (k) => k.status === "Draf",
          ).length;
          const totalPagu = relatedKegiatans.reduce(
            (acc, k) => acc + k.anggaran,
            0,
          );
          const totalSerap = relatedKegiatans.reduce(
            (acc, k) => acc + k.realisasi,
            0,
          );
          const persenSerap =
            totalPagu > 0
              ? Number(((totalSerap / totalPagu) * 100).toFixed(1))
              : 0;
          const persenKerja =
            totalKeg > 0 ? Number(((doneKeg / totalKeg) * 100).toFixed(1)) : 0;

          const q = classifyQuadrant(persenSerap, persenKerja);

          prodiItems.push({
            id: p.id,
            kode: j.namaJenjang,
            nama: `${p.nama} (${b.namaSingkat})`,
            fakultasNama: b.nama,
            jenjangNama: j.namaJenjang,
            level: "prodi",
            totalPagu,
            totalSerap,
            persenSerap,
            totalKeg,
            doneKeg,
            pendingKeg,
            draftKeg,
            persenKerja,
            kuadran: q.kuadran,
            labelKuadran: q.labelKuadran,
            statusColor: q.statusColor,
            anomalyType: q.anomalyType,
            kegiatans: relatedKegiatans,
          });
        });
      });
    } else {
      const relatedKegiatans = kegiatans.filter((k) => k.boundaryId === b.id);
      const totalKeg = relatedKegiatans.length;
      const doneKeg = relatedKegiatans.filter(
        (k) => k.status === "Terlaksana",
      ).length;
      const pendingKeg = relatedKegiatans.filter(
        (k) => k.status === "Belum Terlaksana",
      ).length;
      const draftKeg = relatedKegiatans.filter((k) => k.status === "Draf").length;
      const totalPagu = relatedKegiatans.reduce((acc, k) => acc + k.anggaran, 0);
      const totalSerap = relatedKegiatans.reduce(
        (acc, k) => acc + k.realisasi,
        0,
      );
      const persenSerap =
        totalPagu > 0 ? Number(((totalSerap / totalPagu) * 100).toFixed(1)) : 0;
      const persenKerja =
        totalKeg > 0 ? Number(((doneKeg / totalKeg) * 100).toFixed(1)) : 0;

      const q = classifyQuadrant(persenSerap, persenKerja);

      prodiItems.push({
        id: b.id,
        kode: "Unit Pusat",
        nama: `${b.nama} (Unit Universitas)`,
        fakultasNama: "Universitas",
        jenjangNama: "Non-Prodi",
        level: "prodi",
        totalPagu,
        totalSerap,
        persenSerap,
        totalKeg,
        doneKeg,
        pendingKeg,
        draftKeg,
        persenKerja,
        kuadran: q.kuadran,
        labelKuadran: q.labelKuadran,
        statusColor: q.statusColor,
        anomalyType: q.anomalyType,
        kegiatans: relatedKegiatans,
      });
    }
  });

  return prodiItems;
}

// Root Cause Tracing: Menelusuri rantai penyebab hambatan
export function getRootCauseAnalysis(
  targetId,
  type = "iku",
  statusFilter = "all",
  fakultasUnits = [],
) {
  const { kegiatans, rootIkus, childIkus, indikators, boundaries, prokers, aktivitas } =
    SANKEY_DATA;

  let targetEntity = null;
  let relevantKegiatans = [];

  const fuList =
    Array.isArray(fakultasUnits) && fakultasUnits.length > 0
      ? fakultasUnits
      : V_FAKULTAS_UNIT_ROWS;

  if (type === "iku") {
    targetEntity = rootIkus.find((r) => r.id === targetId) || rootIkus[0];
    relevantKegiatans = kegiatans.filter((k) => k.ikuId === targetEntity.id);
  } else if (type === "boundary") {
    targetEntity = boundaries.find((b) => b.id === targetId) || boundaries[0];
    relevantKegiatans = kegiatans.filter((k) => k.boundaryId === targetEntity.id);
  } else if (type === "prodi") {
    if (targetId === "all") {
      targetEntity = {
        id: "all",
        nama: "Semua Program Studi",
        fakultasNama: "Universitas Pakuan",
        jenjangNama: "Semua Jenjang",
        type: "prodi",
      };
      // Tampilkan seluruh kegiatan tingkat program studi
      relevantKegiatans = kegiatans.filter((k) => k.prodiId);
    } else {
      const resolvedTargetId = MOCK_ALIASES[targetId] || targetId;

      // 1. Prioritaskan lookup dari fuList (v_fakultas_unit / API) agar nama & format 100% konsisten dengan dropdown
      const fu = fuList.find(
        (r) =>
          r.uuid === targetId ||
          r.uuid === resolvedTargetId ||
          r.id === targetId ||
          String(r.id) === String(targetId) ||
          String(r.rawId) === String(targetId) ||
          MOCK_ALIASES[r.uuid] === targetId ||
          MOCK_ALIASES[r.uuid] === resolvedTargetId ||
          MOCK_ALIASES[String(r.id)] === targetId ||
          MOCK_ALIASES[String(r.id)] === resolvedTargetId ||
          (r.nama_fak_prod_unit &&
            r.nama_fak_prod_unit.toLowerCase() === targetId?.toLowerCase()),
      );

      if (fu) {
        const jUpper = (fu.jenjang || "").toUpperCase();
        const base = fu.nama_fak_prod_unit || fu.pureName || fu.nama || "";
        const formattedNama =
          jUpper && !base.toUpperCase().includes(`(${jUpper})`)
            ? `${base} (${jUpper})`
            : base;

        let fakNama = fu.fakultas || "Fakultas Terkait";
        for (const b of boundaries) {
          if (b.jenjangList) {
            for (const j of b.jenjangList) {
              const found = j.prodis.find(
                (p) =>
                  p.id === resolvedTargetId ||
                  p.id === targetId ||
                  p.uuid === targetId ||
                  String(p.rawId) === String(targetId),
              );
              if (found) {
                fakNama = b.nama;
                break;
              }
            }
          }
          if (fakNama !== (fu.fakultas || "Fakultas Terkait")) break;
        }

        targetEntity = {
          id: fu.uuid || String(fu.id),
          nama: formattedNama,
          fakultasNama: fakNama,
          jenjangNama: jUpper ? `Strata (${jUpper})` : "Prodi",
          type: "prodi",
        };
        relevantKegiatans = kegiatans.filter(
          (k) =>
            k.prodiId === resolvedTargetId ||
            k.prodiId === targetId ||
            k.prodiId === fu.uuid ||
            String(k.prodiId) === String(fu.id),
        );
      } else {
        for (const b of boundaries) {
          if (b.jenjangList) {
            for (const j of b.jenjangList) {
              const found = j.prodis.find(
                (p) =>
                  p.id === resolvedTargetId ||
                  p.id === targetId ||
                  p.uuid === targetId ||
                  String(p.rawId) === String(targetId),
              );
              if (found) {
                const jUpper = (
                  found.jenjang ||
                  j.jenjang ||
                  j.namaJenjang ||
                  ""
                ).toUpperCase();
                const base = (found.nama || "").toUpperCase();
                const formattedNama =
                  jUpper && !base.includes(`(${jUpper})`)
                    ? `${base} (${jUpper})`
                    : base;
                targetEntity = {
                  ...found,
                  nama: formattedNama,
                  fakultasNama: b.nama,
                  jenjangNama: j.namaJenjang,
                };
                break;
              }
            }
          }
          if (targetEntity) break;
        }

        if (!targetEntity) {
          targetEntity = {
            id: "all",
            nama: "Semua Program Studi",
            fakultasNama: "Universitas Pakuan",
            jenjangNama: "Semua Jenjang",
            type: "prodi",
          };
          relevantKegiatans = kegiatans.filter((k) => k.prodiId);
        } else {
          relevantKegiatans = kegiatans.filter(
            (k) =>
              k.prodiId === targetEntity.id ||
              k.prodiId === resolvedTargetId ||
              k.prodiId === targetId,
          );
        }
      }
    }
  } else {
    targetEntity = rootIkus.find((r) => r.id === "root-iku-5") || rootIkus[0];
    relevantKegiatans = kegiatans.filter((k) => k.ikuId === targetEntity.id);
  }

  // Filter status jika dipilih
  let filteredKegiatans = relevantKegiatans;
  if (statusFilter !== "all") {
    filteredKegiatans = relevantKegiatans.filter((k) => k.status === statusFilter);
  }

  const blockedKegiatans = filteredKegiatans.filter(
    (k) => k.status === "Belum Terlaksana",
  );
  const doneKegiatans = filteredKegiatans.filter(
    (k) => k.status === "Terlaksana",
  );
  const draftKegiatans = filteredKegiatans.filter((k) => k.status === "Draf");

  const blockedMoney = blockedKegiatans.reduce((acc, k) => acc + k.realisasi, 0);
  const pendingBudget = blockedKegiatans.reduce((acc, k) => acc + k.anggaran, 0);

  // Buat rantai penelusuran
  const chains = filteredKegiatans.map((keg) => {
    const akt = aktivitas.find((a) => a.id === keg.aktivitasId);
    const proker = prokers.find((p) => p.id === (akt?.prokerId || keg.prokerId));
    const bound = boundaries.find((b) => b.id === keg.boundaryId);
    const ind = indikators.find((i) => i.id === keg.indikatorId);
    const iku = rootIkus.find((r) => r.id === keg.ikuId);
    const subIku = childIkus.find((c) => c.id === keg.subIkuId);

    let prodiNama = null;
    if (keg.prodiId) {
      // Prioritaskan format resmi dari fuList agar seragam dengan dropdown
      const fu = fuList.find(
        (r) =>
          r.uuid === keg.prodiId ||
          r.id === keg.prodiId ||
          String(r.id) === String(keg.prodiId) ||
          String(r.rawId) === String(keg.prodiId) ||
          MOCK_ALIASES[r.uuid] === keg.prodiId ||
          MOCK_ALIASES[String(r.id)] === keg.prodiId ||
          MOCK_ALIASES[String(r.rawId)] === keg.prodiId,
      );
      if (fu) {
        const jUpper = (fu.jenjang || "").toUpperCase();
        const base = fu.nama_fak_prod_unit || fu.pureName || fu.nama || "";
        prodiNama =
          jUpper && !base.toUpperCase().includes(`(${jUpper})`)
            ? `${base} (${jUpper})`
            : base;
      } else if (bound?.jenjangList) {
        for (const j of bound.jenjangList) {
          const found = j.prodis.find((p) => p.id === keg.prodiId);
          if (found) {
            const jUpper = (
              found.jenjang ||
              j.jenjang ||
              j.namaJenjang ||
              ""
            ).toUpperCase();
            const base = (found.nama || "").toUpperCase();
            prodiNama =
              jUpper && !base.includes(`(${jUpper})`)
                ? `${base} (${jUpper})`
                : base;
            break;
          }
        }
      }
    }

    return {
      kegiatanId: keg.id,
      namaKegiatan: keg.namaKegiatan,
      pic: keg.pic,
      anggaran: keg.anggaran,
      realisasi: keg.realisasi,
      sisa: keg.sisa,
      persenSerapan: keg.persenSerapan,
      status: keg.status,
      capaian: keg.capaian,
      masalah: keg.masalah,
      pemecahan_masalah: keg.pemecahan_masalah,
      aktivitasNama: akt?.namaAktivitas || "Aktivitas Terkait",
      prokerNama: proker?.namaProker || "Program Kerja Terkait",
      boundaryNama: bound?.nama || "Unit Pelaksana",
      prodiNama,
      indikatorKode: ind?.kode || "IND",
      indikatorNama: ind?.nama || "Indikator Renstra",
      ikuKode: iku?.kode || "IKU",
      ikuNama: iku?.nama || "Target IKU",
      subIkuKode: subIku?.kode,
    };
  });

  return {
    targetEntity,
    type,
    statusFilter,
    totalKegiatan: relevantKegiatans.length,
    totalFiltered: filteredKegiatans.length,
    totalDone: doneKegiatans.length,
    totalBlocked: blockedKegiatans.length,
    totalDraft: draftKegiatans.length,
    blockedMoney,
    pendingBudget,
    healthScore:
      relevantKegiatans.length > 0
        ? Number(
            (
              (doneKegiatans.length / relevantKegiatans.length) *
              100
            ).toFixed(1),
          )
        : 100,
    chains,
  };
}

// Menghasilkan daftar seluruh entitas fakultas_unit_prodi untuk dropdown search
// Diambil langsung dari view v_fakultas_unit (87 entitas lengkap)
// Format: badge = type (fakultas, unit, prodi), name = nama_fakultas_prodi_unit (jenjang)
export function getAllFakultasProdiUnitOptions() {
  const typeWeight = { fakultas: 1, prodi: 2, unit: 3 };

  return V_FAKULTAS_UNIT_ROWS.map((r) => {
    const typeUpper = (r.type || "UNIT").toUpperCase();
    const jenjangUpper = r.jenjang ? String(r.jenjang).toUpperCase() : "";
    const cleanName = r.nama_fak_prod_unit || "";
    const hasJenjang = jenjangUpper && cleanName.toUpperCase().includes(`(${jenjangUpper})`);
    const label = jenjangUpper && !hasJenjang ? `${cleanName} (${jenjangUpper})` : cleanName;
    const legacyId = MOCK_ALIASES[r.uuid] || MOCK_ALIASES[String(r.id)] || r.uuid;
    return {
      id: r.uuid || String(r.id),
      legacyId,
      rawId: r.id,
      uuid: r.uuid,
      type: r.type,
      badgeText: typeUpper,
      badge: typeUpper,
      nama: cleanName,
      jenjang: r.jenjang,
      label: label,
      boundaryId: r.uuid || String(r.id),
      prodiId: r.type === "prodi" ? (r.uuid || String(r.id)) : null,
    };
  }).sort((a, b) => {
    const wA = typeWeight[(a.type || "").toLowerCase()] || 99;
    const wB = typeWeight[(b.type || "").toLowerCase()] || 99;
    if (wA !== wB) return wA - wB;
    const nameCmp = (a.nama || "").localeCompare(b.nama || "", "id", {
      sensitivity: "base",
    });
    if (nameCmp !== 0) return nameCmp;
    return (a.jenjang || "").localeCompare(b.jenjang || "");
  });
}

export { V_FAKULTAS_UNIT_ROWS, MOCK_ALIASES };
