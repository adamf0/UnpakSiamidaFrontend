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

  const year = s.getFullYear() || 2026;
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
  return val !== null && val !== undefined && val !== "" && !isNaN(Number(val)) && Number(val) > 0;
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
