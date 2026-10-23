/**
 * Konfigurasi Versioning Aplikasi Unpak Siamida
 * - v1 (maintenance, audit 2023)
 * - v2 (current, audit 2024-2026)
 * - v3 (new, 2027)
 */

export const APP_VERSIONS = [
  {
    id: "v1",
    code: "v1",
    label: "v1 (Legacy, Maintenance, Audit 2023)",
    shortLabel: "v1 • 2023",
    menuLabel: "Versi 1 (Legacy)",
    tag: "Maintenance",
    tagColor: "bg-amber-100 text-amber-800 border-amber-300",
    years: "2023",
    description: "Fitur V1: Standar Mutu, Standar Non Mutu, Schedule Audit",
    statusText: "Maintenance Mode",
    defaultYear: "2023",
  },
  {
    id: "v2",
    code: "v2",
    label: "v2 (Current, Audit 2024–2026)",
    shortLabel: "v2 • 2024–2026",
    menuLabel: "Versi 2 (Current)",
    tag: "Current",
    tagColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
    years: "2024 - 2026",
    description: "Fitur V2: Renstra, Dokumen, Proker, Schedule Audit",
    statusText: "Aktif Saat Ini",
    defaultYear: "2025",
  },
  {
    id: "v3",
    code: "v3",
    label: "v3 (New, 2027)",
    shortLabel: "v3 • 2027",
    menuLabel: "Versi 3 (New)",
    tag: "Development",
    tagColor: "bg-indigo-100 text-indigo-800 border-indigo-300",
    years: "2027",
    description: "Fitur V3: Renstra, Dokumen, Proker, Schedule Audit",
    statusText: "New (2027)",
    defaultYear: "2027",
  },
];

/**
 * Daftar path menu yang merupakan fitur spesifik V2
 */
export const V2_FEATURE_PATHS = [
  "/template_renstra",
  "/template_dokumen_tambahan",
  "/standar_renstra",  
  "/indikator_renstra",
  "/mata_program",
  "/aktivitas",
  "/pelaporan_pelaksanaan",
  "/pelaporan_dokumen",
  "/schedule_audit",
];

export const isV2FeaturePath = (path) => {
  return V2_FEATURE_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
};

/**
 * Daftar path menu yang merupakan fitur eksklusif V3
 */
export const V3_FEATURE_PATHS = [
  "/swot",
  "/analisis_swot",
  "/risk_assessment",
  "/analisis_resiko",
  "/analisis_risiko",
  "/proker_v3",
];

export const isV3FeaturePath = (path) => {
  return V3_FEATURE_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
};

export const getVersionConfig = (versionId = "v2") => {
  return APP_VERSIONS.find((v) => v.id === versionId) || APP_VERSIONS[0];
};

/**
 * Menentukan apakah suatu menu ditampilkan berdasarkan versi yang dipilih
 */
export const isMenuVisibleForVersion = (path, versionId = "v2") => {
  if (!versionId || versionId === "all") return true;

  // Fitur eksklusif V3: Analisis SWOT & Analisis Risiko HANYA muncul di v3
  if (isV3FeaturePath(path)) {
    return versionId === "v3";
  }

  const isV2 = isV2FeaturePath(path);
  if (versionId === "v2") {
    // V2 menampilkan fitur spesifik V2 dan fitur universal
    return true;
  }
  if (versionId === "v1") {
    // V1 menyembunyikan fitur spesifik V2 dan fitur V3
    return !isV2;
  }
  if (versionId === "v3") {
    // V3 menampilkan fitur V3 dan fitur lainnya
    return true;
  }
  return true;
};

/**
 * Menentukan apakah Monitoring Dokumen Proker tampil di Dashboard
 * Aktif pada seluruh versi (v1, v2, dan v3 dengan sumber matrix_proker_dokumen)
 */
export const isDashboardProkerVisibleForVersion = (versionId = "v2") => {
  return versionId === "v1" || versionId === "v2" || versionId === "v3";
};

