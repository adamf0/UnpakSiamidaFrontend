export const BULAN_LIST = [
  { key: "JANUARI", label: "Januari", short: "Jan" },
  { key: "FEBRUARI", label: "Februari", short: "Feb" },
  { key: "MARET", label: "Maret", short: "Mar" },
  { key: "APRIL", label: "April", short: "Apr" },
  { key: "MEI", label: "Mei", short: "Mei" },
  { key: "JUNI", label: "Juni", short: "Jun" },
  { key: "JULI", label: "Juli", short: "Jul" },
  { key: "AGUSTUS", label: "Agustus", short: "Agu" },
  { key: "SEPTEMBER", label: "September", short: "Sep" },
  { key: "OKTOBER", label: "Oktober", short: "Okt" },
  { key: "NOVEMBER", label: "November", short: "Nov" },
  { key: "DESEMBER", label: "Desember", short: "Des" },
];

export const WEEKS = ["M1", "M2", "M3", "M4"];

export function parseSlotArray(str) {
  if (!str) return [];
  if (Array.isArray(str)) return str;
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    return str.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export function getSlotsFromDateRange(startStr, endStr) {
  if (!startStr || !endStr) return [];
  const s = new Date(startStr);
  const e = new Date(endStr);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return [];

  const year = s.getFullYear() || new Date().getFullYear();
  const slotToMonthIndex = {
    JANUARI: 0,
    PEBRUARI: 1,
    MARET: 2,
    APRIL: 3,
    MEI: 4,
    JUNI: 5,
    JULI: 6,
    AGUSTUS: 7,
    SEPTEMBER: 8,
    OKTOBER: 9,
    NOVEMBER: 10,
    DESEMBER: 11,
  };

  const weekToDayRange = {
    M1: [1, 7],
    M2: [8, 14],
    M3: [15, 21],
    M4: [22, 31],
  };

  const slots = [];
  BULAN_LIST.forEach((b) => {
    const mIdx = slotToMonthIndex[b.key];
    if (mIdx === undefined) return;
    WEEKS.forEach((w) => {
      const [dStart, dEnd] = weekToDayRange[w] || [1, 7];
      const weekStart = new Date(year, mIdx, dStart, 0, 0, 0);
      const weekEnd = new Date(year, mIdx, dEnd, 23, 59, 59);
      if (weekEnd >= s && weekStart <= e) {
        slots.push(`${b.key}_${w}`);
      }
    });
  });
  return slots;
}

export function getTimelineRkSlots(tl) {
  if (!tl) return [];
  const parsed = parseSlotArray(tl.JadwalRk);
  if (parsed && parsed.length > 0) return parsed;
  if (tl.TanggalRkAwal && tl.TanggalRkAkhir) {
    return getSlotsFromDateRange(tl.TanggalRkAwal, tl.TanggalRkAkhir);
  }
  return [];
}

export function getTimelineRSlots(tl) {
  if (!tl) return [];
  const parsed = parseSlotArray(tl.JadwalR);
  if (parsed && parsed.length > 0) return parsed;
  if (tl.TanggalRAwal && tl.TanggalRAkhir) {
    return getSlotsFromDateRange(tl.TanggalRAwal, tl.TanggalRAkhir);
  }
  return [];
}

export function summarizeSlots(slots) {
  if (!slots) return [];
  const list = Array.isArray(slots) ? slots : parseSlotArray(slots);
  if (!list || list.length === 0) return [];

  const monthWeeks = {};
  list.forEach((s) => {
    if (!s || typeof s !== "string" || !s.includes("_")) return;
    const [m, w] = s.split("_", 2);
    const mKey = m.toUpperCase() === "PEBRUARI" ? "FEBRUARI" : m.toUpperCase();
    const wNum = parseInt(w.replace(/\D/g, ""), 10);
    if (!isNaN(wNum) && wNum > 0) {
      if (!monthWeeks[mKey]) monthWeeks[mKey] = new Set();
      monthWeeks[mKey].add(wNum);
    }
  });

  const res = [];
  BULAN_LIST.forEach((b) => {
    const key = b.key;
    if (!monthWeeks[key] || monthWeeks[key].size === 0) return;
    const sortedWeeks = Array.from(monthWeeks[key]).sort((x, y) => x - y);

    const ranges = [];
    let start = sortedWeeks[0];
    let prev = sortedWeeks[0];
    for (let i = 1; i < sortedWeeks.length; i++) {
      const cur = sortedWeeks[i];
      if (cur === prev + 1) {
        prev = cur;
      } else {
        ranges.push(start === prev ? `M${start}` : `M${start}–M${prev}`);
        start = cur;
        prev = cur;
      }
    }
    ranges.push(start === prev ? `M${start}` : `M${start}–M${prev}`);

    res.push({
      key,
      text: `${key} (${ranges.join(", ")})`,
      title: `${b.label}: ` + sortedWeeks.map((w) => `Minggu ${w}`).join(", "),
    });
  });

  return res;
}

export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export const TIMELINE_MAX_FILE_SIZE_MB = 10;
export const TIMELINE_MAX_FILE_SIZE_BYTES =
  TIMELINE_MAX_FILE_SIZE_MB * 1024 * 1024;
export const TIMELINE_ALLOWED_FILE_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".csv",
  ".txt",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".zip",
  ".rar",
];
export const TIMELINE_FILE_ACCEPT = TIMELINE_ALLOWED_FILE_EXTENSIONS.join(",");
export const TIMELINE_ALLOWED_FILE_TYPES_LABEL =
  "PDF, Word (.doc/.docx), Excel (.xls/.xlsx), PowerPoint (.ppt/.pptx), Gambar (.jpg/.jpeg/.png/.webp), CSV, TXT, Arsip (.zip/.rar)";
export const TIMELINE_MAX_LINK_URL_LENGTH = 500;

export function validateTimelineUploadFile(file) {
  if (!file) {
    return { valid: false, error: "Pilih berkas file terlebih dahulu." };
  }
  const fileName = String(file.name || "").trim();
  const dotIdx = fileName.lastIndexOf(".");
  const ext = dotIdx >= 0 ? fileName.slice(dotIdx).toLowerCase() : "";
  if (!TIMELINE_ALLOWED_FILE_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Format file "${ext || "tanpa ekstensi"}" tidak didukung. Gunakan: ${TIMELINE_ALLOWED_FILE_TYPES_LABEL}.`,
    };
  }
  if (
    typeof file.size === "number" &&
    file.size > TIMELINE_MAX_FILE_SIZE_BYTES
  ) {
    return {
      valid: false,
      error: `Ukuran file (${formatBytes(file.size)}) melebihi batas maksimal ${TIMELINE_MAX_FILE_SIZE_MB} MB.`,
    };
  }
  return { valid: true, error: "" };
}

export function validateTimelineLinkUrl(rawUrl) {
  const trimmed = String(rawUrl || "").trim();
  if (!trimmed) {
    return {
      valid: false,
      normalizedUrl: "",
      fallbackName: "",
      error: "URL tautan bukti wajib diisi.",
    };
  }
  if (/\s/.test(trimmed)) {
    return {
      valid: false,
      normalizedUrl: "",
      fallbackName: "",
      error: "URL tautan tidak boleh mengandung spasi.",
    };
  }
  if (trimmed.length > TIMELINE_MAX_LINK_URL_LENGTH) {
    return {
      valid: false,
      normalizedUrl: "",
      fallbackName: "",
      error: `URL tautan maksimal ${TIMELINE_MAX_LINK_URL_LENGTH} karakter.`,
    };
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      valid: false,
      normalizedUrl: "",
      fallbackName: "",
      error:
        "Format URL tidak valid. Gunakan awalan http:// atau https:// (contoh: https://drive.google.com/...).",
    };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      valid: false,
      normalizedUrl: "",
      fallbackName: "",
      error: "URL tautan bukti harus diawali http:// atau https://.",
    };
  }

  const host = parsed.hostname || "";
  if (!host || (!host.includes(".") && host.toLowerCase() !== "localhost")) {
    return {
      valid: false,
      normalizedUrl: "",
      fallbackName: "",
      error: "Nama host URL tidak valid. Pastikan alamat domain lengkap.",
    };
  }

  const normalizedUrl = parsed.toString();
  if (normalizedUrl.length > TIMELINE_MAX_LINK_URL_LENGTH) {
    return {
      valid: false,
      normalizedUrl: "",
      fallbackName: "",
      error: `URL tautan maksimal ${TIMELINE_MAX_LINK_URL_LENGTH} karakter.`,
    };
  }

  const cleanPath =
    parsed.pathname && parsed.pathname !== "/"
      ? parsed.pathname.replace(/\/+$/, "")
      : "";
  const fallbackName = (parsed.host + cleanPath).slice(0, 255);
  return { valid: true, normalizedUrl, fallbackName, error: "" };
}

export function isTimelineLinkRecord(file) {
  if (!file) return false;
  const fileType = String(file.FileType || file.file_type || "")
    .trim()
    .toLowerCase();
  const fileUrl = String(file.FileURL || file.file_url || "").trim();
  const filePath = String(file.File || file.file || "").trim();
  return (
    fileType === "link" ||
    /^https?:\/\//i.test(fileUrl) ||
    /^https?:\/\//i.test(filePath)
  );
}

export function resolveProkerFileUrl(file, apiBaseUrl = "") {
  if (!file) return null;
  const rawUrl = String(file.FileURL || file.file_url || "").trim();
  const rawFile = String(file.File || file.file || "").trim();
  const candidate = rawUrl || rawFile;
  if (!candidate) return null;
  if (/^https?:\/\//i.test(candidate)) {
    return candidate;
  }
  const base = String(apiBaseUrl || "").replace(/\/+$/, "");
  if (
    !rawUrl &&
    rawFile &&
    !rawFile.includes("/") &&
    !rawFile.includes("\\")
  ) {
    return `${base}/upload/proker_v3/${rawFile}`;
  }
  const normalizedPath = candidate.replace(/^\.\//, "").replace(/^\/+/, "");
  return `${base}/${normalizedPath}`;
}

export function formatRupiah(val, isCensored = false) {
  if (isCensored) return "***";
  if (!val && val !== 0) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);
}

export function hasRealisasiAnggaran(item) {
  if (!item) return false;
  const val = item.Realisasi !== undefined ? item.Realisasi : item.realisasi;
  return val !== null && val !== undefined && val !== "" && !isNaN(Number(val)) && Number(val) >= 0;
}

export function getRealisasiAnggaran(item) {
  if (!item) return null;
  const val = item.Realisasi !== undefined ? item.Realisasi : item.realisasi;
  return val !== null && val !== undefined && val !== "" && !isNaN(Number(val)) ? Number(val) : null;
}

export function isAnggaranRevised(item) {
  if (!item || !hasRealisasiAnggaran(item)) return false;
  const ang = Number(item.Anggaran !== undefined ? item.Anggaran : item.anggaran) || 0;
  const real = getRealisasiAnggaran(item);
  if (real === null || real === undefined) return false;
  return ang !== Number(real);
}

export const JENIS_DOKUMEN_PROKER = [
  {
    id: "SK",
    text: "SK (Wajib)",
    required: true,
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    id: "SOP",
    text: "SOP (Wajib)",
    required: true,
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    id: "PROPOSAL/TOR",
    text: "Proposal/TOR (Wajib)",
    required: true,
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    id: "LAPORAN",
    text: "Laporan (Wajib)",
    required: true,
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    id: "DOCUMENT PENDUKUNG",
    text: "Dokumen Pendukung",
    required: false,
    badgeClass: "bg-gray-100 text-gray-700 border-gray-300",
  },
];
