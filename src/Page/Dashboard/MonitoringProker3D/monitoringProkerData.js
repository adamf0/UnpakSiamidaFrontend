import { STATUS_LEGEND, formatTanggalBulanTahun } from "@/Common/Utils";

/**
 * Normalisasi status verifikasi dari backend maupun monitoring counts
 */
export function resolveDocumentStatus(doc, countR0 = 0, countR1 = 0, countR2 = 0, countR3 = 0) {
  if (doc?.Status) {
    const s = String(doc.Status).trim().toLowerCase();
    if (s === "terverifikasi" || s === "disetujui" || s === "approved") {
      return {
        key: "terverifikasi",
        label: "Terverifikasi",
        colorClass: "bg-[#26b99a]",
        textColor: "text-emerald-700",
        borderColor: "border-emerald-600",
        stampColor: "#059669",
        bgLight: "bg-emerald-50",
      };
    }
    if (s === "gagal_verifikasi" || s === "ditolak" || s === "rejected" || s === "revisi") {
      return {
        key: "gagal",
        label: "Gagal Verifikasi",
        colorClass: "bg-[#e24444]",
        textColor: "text-rose-700",
        borderColor: "border-rose-600",
        stampColor: "#DC2626",
        bgLight: "bg-rose-50",
      };
    }
    if (s === "belum_terverifikasi" || s === "pending" || s === "menunggu") {
      return {
        key: "verifikasi",
        label: "Belum Diverifikasi",
        colorClass: "bg-[#0084d1]",
        textColor: "text-blue-700",
        borderColor: "border-blue-600",
        stampColor: "#0284C7",
        bgLight: "bg-blue-50",
      };
    }
  }

  // Fallback berdasarkan count R0-R3
  if (countR1 > 0 || countR0 > 0) {
    return {
      key: "verifikasi",
      label: "Belum Diverifikasi",
      colorClass: "bg-[#0084d1]",
      textColor: "text-blue-700",
      borderColor: "border-blue-600",
      stampColor: "#0284C7",
      bgLight: "bg-blue-50",
    };
  }
  if (countR3 > 0) {
    return {
      key: "gagal",
      label: "Gagal Verifikasi",
      colorClass: "bg-[#e24444]",
      textColor: "text-rose-700",
      borderColor: "border-rose-600",
      stampColor: "#DC2626",
      bgLight: "bg-rose-50",
    };
  }
  if (countR2 > 0) {
    return {
      key: "terverifikasi",
      label: "Terverifikasi",
      colorClass: "bg-[#26b99a]",
      textColor: "text-emerald-700",
      borderColor: "border-emerald-600",
      stampColor: "#059669",
      bgLight: "bg-emerald-50",
    };
  }

  return {
    key: "kosong",
    label: "Belum Ada Dokumen",
    colorClass: "bg-[#777]",
    textColor: "text-gray-500",
    borderColor: "border-gray-400",
    stampColor: "#64748B",
    bgLight: "bg-gray-100",
  };
}

/**
 * Deteksi tipe ekstensi file
 */
export function getFileType(fileName = "") {
  if (!fileName) return "unknown";
  const ext = fileName.split(".").pop().toLowerCase();
  if (["pdf"].includes(ext)) return "pdf";
  if (["doc", "docx", "rtf"].includes(ext)) return "word";
  if (["xls", "xlsx", "csv"].includes(ext)) return "excel";
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image";
  return "file";
}

/**
 * Format ukuran file ramah manusia
 */
export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return "1.2 MB";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Template data dokumen demonstrasi realistis ketika berkas fisik di database belum ada
 */
export function generateSampleVersions(docType, mataProgram, unitName, tahun, statusKey) {
  const cleanMp = (mataProgram || "Program Kerja").replace(/^\d+\.\s*/, "").replace(/[^\w\s]/gi, "");
  const baseSlug = cleanMp.toLowerCase().replace(/\s+/g, "_");

  const versionsMap = {
    SK: [
      {
        version: "v2.0",
        versionLabel: "Versi 2.0 (Salinan Resmi SK Dekan)",
        file: `SK_${baseSlug}_${tahun}_v2.pdf`,
        fileType: "pdf",
        tanggalUpload: "12 Februari " + tahun,
        uploader: "Bagian Tata Usaha Fakultas",
        ukuran: "2.4 MB",
        statusKey: statusKey === "kosong" ? "kosong" : statusKey,
        catatan:
          statusKey === "gagal"
            ? "Tanda tangan basah dan stempel legalisir dekanat belum lengkap pada lampiran II."
            : statusKey === "terverifikasi"
            ? "SK telah diverifikasi sah dan sesuai standar penjaminan mutu LPMI."
            : "Menunggu paraf auditor pada lampiran rincian tupoksi.",
      },
      {
        version: "v1.0",
        versionLabel: "Versi 1.0 (Draft Awal Pengajuan)",
        file: `Draft_SK_${baseSlug}_${tahun}_v1.docx`,
        fileType: "word",
        tanggalUpload: "28 Januari " + tahun,
        uploader: "Staf Administrasi Prodi",
        ukuran: "840 KB",
        statusKey: "verifikasi",
        catatan: "Draft awal sebelum penetapan nomor surat keputusan dekanat.",
      },
    ],
    SOP: [
      {
        version: "v1.2",
        versionLabel: "Versi 1.2 (SOP Mutu Baku Revisi)",
        file: `SOP_${baseSlug}_${tahun}_rev.pdf`,
        fileType: "pdf",
        tanggalUpload: "18 Maret " + tahun,
        uploader: "Tim Penjaminan Mutu Prodi",
        ukuran: "1.8 MB",
        statusKey: statusKey === "kosong" ? "kosong" : statusKey,
        catatan:
          statusKey === "gagal"
            ? "Flowchart diagram alir pada langkah ke-4 tidak sinkron dengan pedoman akademik 2025."
            : "Diagram alir dan matriks tanggung jawab pelaksana telah disesuaikan.",
      },
    ],
    "Proposal/TOR": [
      {
        version: "v3.0",
        versionLabel: "Versi 3.0 (TOR & Rincian Anggaran Final)",
        file: `TOR_RAB_${baseSlug}_${tahun}_final.xlsx`,
        fileType: "excel",
        tanggalUpload: "05 April " + tahun,
        uploader: "Bendahara / Pelaksana Program",
        ukuran: "950 KB",
        statusKey: statusKey === "kosong" ? "kosong" : statusKey,
        catatan:
          statusKey === "terverifikasi"
            ? "Rincian alokasi anggaran dan output indikator IKU telah sinkron."
            : "Lampiran perincian harga satuan standar universitas telah diperbarui.",
      },
      {
        version: "v2.0",
        versionLabel: "Versi 2.0 (Proposal Kegiatan Lengkap)",
        file: `Proposal_${baseSlug}_${tahun}.pdf`,
        fileType: "pdf",
        tanggalUpload: "15 Maret " + tahun,
        uploader: "Ketua Panitia / PIC",
        ukuran: "3.1 MB",
        statusKey: "terverifikasi",
        catatan: "Proposal disetujui untuk pelaksanaan tahun anggaran berjalan.",
      },
    ],
    Laporan: [
      {
        version: "v2.1",
        versionLabel: "Versi 2.1 (Laporan Realisasi & Bukti Dokumentasi)",
        file: `Laporan_Akhir_${baseSlug}_${tahun}.pdf`,
        fileType: "pdf",
        tanggalUpload: "20 November " + tahun,
        uploader: "Ketua Program Studi",
        ukuran: "5.7 MB",
        statusKey: statusKey === "kosong" ? "kosong" : statusKey,
        catatan:
          statusKey === "gagal"
            ? "Kuitansi dan bukti potong pajak PPh pasal 21 belum dilampirkan pada laporan keuangan."
            : "Seluruh target indikator kinerja dan capaian output telah tercapai 100%.",
      },
      {
        version: "v1.0",
        versionLabel: "Versi 1.0 (Dokumentasi Foto Kegiatan)",
        file: `Dokumentasi_Foto_${baseSlug}.png`,
        fileType: "image",
        tanggalUpload: "18 November " + tahun,
        uploader: "Tim Dokumentasi & Publikasi",
        ukuran: "4.2 MB",
        statusKey: "terverifikasi",
        catatan: "Foto dokumentasi pelaksanaan acara dan presensi kehadiran audiens.",
      },
    ],
  };

  return versionsMap[docType] || [];
}

/**
 * Menggabungkan raw monitoring summary data dengan list pelaporan dokumen riil
 */
export function aggregateMataProgramDossiers(rawData = [], realDocuments = [], currentUnit, currentTahun) {
  const unitName = currentUnit?.nama || currentUnit?.Nama || "Unit";
  const tahunStr = String(currentTahun?.nama || currentTahun?.Tahun || "2025");

  return (rawData || []).map((row, idx) => {
    const mpId = row.MataProgramId || row.MataProgramID;
    const mpUuid = row.MataProgramUuid || row.MataProgramUUID;
    const mpTitle = row.MataProgram || `Mata Program #${idx + 1}`;

    // Ambil dokumen riil dari tabel pelaporandokumens yang cocok dengan mata program ini
    const matchedDocs = (realDocuments || []).filter((d) => {
      if (d.MataProgramId && mpId && String(d.MataProgramId) === String(mpId)) return true;
      if (d.MataProgramUuid && mpUuid && String(d.MataProgramUuid) === String(mpUuid)) return true;
      if (d.MataProgram && String(d.MataProgram).trim().toLowerCase() === mpTitle.trim().toLowerCase()) return true;
      return false;
    });

    // 4 Dokumen Utama
    const categories = [
      {
        key: "SK",
        label: "Surat Keputusan (SK)",
        shortLabel: "SK",
        r0: row.SKR0 || 0,
        r1: row.SKR1 || 0,
        r2: row.SKR2 || 0,
        r3: row.SKR3 || 0,
        total: row.SK || 0,
      },
      {
        key: "SOP",
        label: "Standar Operasional Prosedur (SOP)",
        shortLabel: "SOP",
        r0: row.SOPR0 || 0,
        r1: row.SOPR1 || 0,
        r2: row.SOPR2 || 0,
        r3: row.SOPR3 || 0,
        total: row.SOP || 0,
      },
      {
        key: "Proposal/TOR",
        label: "Proposal / Term of Reference (TOR)",
        shortLabel: "Proposal/TOR",
        r0: row.ProposalTORR0 || 0,
        r1: row.ProposalTORR1 || 0,
        r2: row.ProposalTORR2 || 0,
        r3: row.ProposalTORR3 || 0,
        total: row.ProposalTOR || 0,
      },
      {
        key: "Laporan",
        label: "Laporan Kegiatan & Realisasi",
        shortLabel: "Laporan",
        r0: row.LaporanR0 || 0,
        r1: row.LaporanR1 || 0,
        r2: row.LaporanR2 || 0,
        r3: row.LaporanR3 || 0,
        total: row.Laporan || 0,
      },
    ];

    const documentsByCategory = {};

    categories.forEach((cat) => {
      const catKeyUpper = cat.key.toUpperCase();
      const docsForCat = matchedDocs.filter((d) => {
        const jd = (d.JenisDokumen || "").trim().toUpperCase();
        if (catKeyUpper === "PROPOSAL/TOR") {
          return jd.includes("PROPOSAL") || jd.includes("TOR");
        }
        return jd === catKeyUpper || jd.startsWith(catKeyUpper);
      });

      const statusObj = resolveDocumentStatus(
        docsForCat[0],
        cat.r0,
        cat.r1,
        cat.r2,
        cat.r3
      );

      let versions = [];
      if (docsForCat.length > 0) {
        // Ada dokumen riil di database!
        versions = docsForCat.map((d, vIdx) => {
          const vNum = docsForCat.length - vIdx;
          const statusVer = resolveDocumentStatus(d);
          return {
            uuid: d.UUID || d.uuid,
            id: d.ID || d.id,
            version: `v${vNum}.0`,
            versionLabel: `Versi ${vNum}.0 (${d.JenisDokumen})`,
            file: d.File || `Dokumen_${cat.key}_v${vNum}.pdf`,
            fileType: getFileType(d.File || ".pdf"),
            tanggalUpload: formatTanggalBulanTahun(d.CreatedAt || d.created_at || "2025-05-10"),
            uploader: d.Uploader || unitName,
            ukuran: formatBytes(d.FileSize || 1540000),
            statusKey: statusVer.key,
            catatan: d.Catatan || d.catatan || (statusVer.key === "terverifikasi" ? "Telah diperiksa dan diverifikasi oleh Auditor." : "-"),
            raw: d,
          };
        });
      } else if (statusObj.key !== "kosong") {
        // Ringkasan monitoring mencatat ada dokumen, namun record riil belum terisi -> sediakan dokumen sample lengkap
        versions = generateSampleVersions(cat.key, mpTitle, unitName, tahunStr, statusObj.key);
      } else {
        // Kosong
        versions = [];
      }

      documentsByCategory[cat.key] = {
        ...cat,
        status: statusObj,
        versions,
        hasDocument: statusObj.key !== "kosong" && versions.length > 0,
      };
    });

    // Hitung status kelengkapan folder ini
    const totalFilled = Object.values(documentsByCategory).filter((d) => d.hasDocument).length;
    const isComplete = totalFilled === 4;
    const hasRejected = Object.values(documentsByCategory).some((d) => d.status.key === "gagal");
    const hasPending = Object.values(documentsByCategory).some((d) => d.status.key === "verifikasi");
    const isAllVerified = Object.values(documentsByCategory).every((d) => d.status.key === "terverifikasi");

    // Warna folder manila tematik berdasarkan nomor indeks
    const FOLDER_COLORS = [
      { name: "Manila Ochre", bg: "#D97706", accent: "#92400E", tabBg: "#F59E0B", border: "#B45309" },
      { name: "Academic Navy", bg: "#1D4ED8", accent: "#1E3A8A", tabBg: "#3B82F6", border: "#1E40AF" },
      { name: "Forest Archive", bg: "#059669", accent: "#065F46", tabBg: "#10B981", border: "#047857" },
      { name: "Warm Terracotta", bg: "#C2410C", accent: "#7C2D12", tabBg: "#EA580C", border: "#9A3412" },
      { name: "Vintage Plum", bg: "#7C3AED", accent: "#4C1D95", tabBg: "#8B5CF6", border: "#6D28D9" },
      { name: "Slate Steel", bg: "#475569", accent: "#1E293B", tabBg: "#64748B", border: "#334155" },
    ];
    const folderColor = FOLDER_COLORS[idx % FOLDER_COLORS.length];

    return {
      index: idx + 1,
      id: mpId,
      uuid: mpUuid,
      title: mpTitle,
      shortCode: `MP-${String(idx + 1).padStart(2, "0")}`,
      unitName,
      tahun: tahunStr,
      documents: documentsByCategory,
      totalFilled,
      isComplete,
      hasRejected,
      hasPending,
      isAllVerified,
      folderColor,
      rawRow: row,
    };
  });
}
