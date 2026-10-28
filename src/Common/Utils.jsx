import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { apiClient } from "@/Common/api";

export function formatDate(dateString) {
  const date = new Date(dateString);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";

  hours = hours % 12 || 12; // ubah 0 jadi 12

  return (
    <span className="flex gap-2">
      <p>{`${year}/${month}/${day}`}</p>
      <span className="text-[#e0e0e0] text-[16px]">|</span>
      <p>{`${hours}:${minutes} ${ampm}`}</p>
    </span>
  );
}

export const formatTanggalIndo = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

export const formatTanggalBulanTahun = (value) => {
  if (!value) return "-";
  const str = String(value).trim();

  const bulanIndo = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  // Jika string bukan tanggal sama sekali
  if (!/\d{4}/.test(str) && !/\d{1,2}/.test(str)) {
    return str;
  }

  // Handle format YYYY-MM-DD atau YYYY/MM/DD persis
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const monthIdx = parseInt(ymdMatch[2], 10) - 1;
    const day = String(parseInt(ymdMatch[3], 10)).padStart(2, "0");
    const month = bulanIndo[monthIdx] || ymdMatch[2];
    return `${day} ${month} ${year}`;
  }

  // Handle format DD-MM-YYYY atau DD/MM/YYYY persis
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = String(parseInt(dmyMatch[1], 10)).padStart(2, "0");
    const monthIdx = parseInt(dmyMatch[2], 10) - 1;
    const month = bulanIndo[monthIdx] || dmyMatch[2];
    const year = dmyMatch[3];
    return `${day} ${month} ${year}`;
  }

  // Jika berupa kalimat atau rentang tanggal (misal: "2027-12-01 s/d 2027-12-31" atau kalimat pemberitahuan)
  let res = str;
  if (/\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/.test(res)) {
    res = res.replace(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/g, (_, y, m, d) => {
      const mIdx = parseInt(m, 10) - 1;
      const dayStr = String(parseInt(d, 10)).padStart(2, "0");
      return `${dayStr} ${bulanIndo[mIdx] || m} ${y}`;
    });
  }
  if (/\b\d{1,2}[-/]\d{1,2}[-/]\d{4}\b/.test(res)) {
    res = res.replace(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/g, (_, d, m, y) => {
      const mIdx = parseInt(m, 10) - 1;
      const dayStr = String(parseInt(d, 10)).padStart(2, "0");
      return `${dayStr} ${bulanIndo[mIdx] || m} ${y}`;
    });
  }
  if (res !== str) {
    return res;
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, "0");
    const month = bulanIndo[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  }

  return str;
};

export function formatYMD(dateString) {
  if (!dateString) return "-";

  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-CA").format(date);
}

export function isValidDateTime(dateString) {
  if (isEmpty(dateString)) {
    return false;
  }

  const regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
  if (!regex.test(dateString)) return false;

  const parsed = new Date(dateString);
  return isValid(parsed);
}

export const isEmpty = (str) =>
  !str || str?.trim()?.length === 0 || str === undefined || str === null;

export const isNumeric = (val) => {
  if (val === null || val === undefined) return false;
  if (typeof val === "number") return !Number.isNaN(val);
  if (typeof val === "string" && val.trim() !== "") {
    return !Number.isNaN(Number(val));
  }
  return false;
};

export const get = (obj, path, defaultValue = undefined) => {
  if (!obj || !path) return defaultValue;
  const parts = Array.isArray(path)
    ? path
    : String(path)
        .replace(/\[(\w+)\]/g, ".$1")
        .split(".");
  let current = obj;
  for (const part of parts) {
    if (current == null) return defaultValue;
    current = current[part];
  }
  return current !== undefined ? current : defaultValue;
};

export function buildHeaders(old, token, isjson = true) {
  let latitude = old.lat;
  let longitude = old.lng;

  // Extract ASN number: "AS24203 PT XL Axiata" → 24203
  let asnNumber = null;
  if (old.org) {
    const match = old.org.match(/AS(\d+)/i);
    if (match) asnNumber = match[1];
  }

  // Extract ISP: "AS24203 PT XL Axiata" → "PT XL Axiata"
  let isp = null;
  if (old.org) {
    const parts = old.org.split(" ");
    parts.shift(); // remove "AS24203"
    isp = parts.join(" ");
  }

  const base = {
    Authorization: `Bearer ${token}`,
    ip_address: old.ip || null,
    country: old.country || null,
    state: old.region || null,
    city: old.city || null,
    latitude: latitude,
    longitude: longitude,
    "asn-number": asnNumber,
    "asn-organization": old.org || null,
    isp: isp,
    "postal-code": old.postal || null,
  };

  // ONLY set JSON content-type if needed
  if (isjson) {
    base["Content-Type"] = "application/json";
  }

  return base;
}
export function mappedText(text, user, positionYear, unitOptions = []) {
  const low = String(text || "").toLowerCase().trim();
  if (low === "admin") {
    return "Admin";
  }
  if (low === "auditee") {
    return "Auditee";
  }
  if (low === "auditor1") {
    return "Auditor Utama";
  }
  if (low === "auditor2") {
    return "Auditor Pendamping";
  }
  if (low === "fakultas") {
    return "Fakultas";
  }
  if (low === "upml") {
    return "UPML (Unit Penjaminan Mutu Lembaga)";
  }
  if (low === "upmf") {
    return "UPMF (Unit Penjaminan Mutu Fakultas)";
  }
  if (low === "upms") {
    return "UPMS (Unit Penjaminan Mutu Sekolah)";
  }
  if (low === "anggaran" || low === "keuangan") {
    return "Tim Anggaran";
  }
  if (low === "evaluator") {
    return "Evaluator";
  }
  if (low === "user") {
    let targetName = "";
    if (user) {
      if (Array.isArray(user?.extra_role) && user.extra_role.length > 0) {
        const match =
          user.extra_role.find(
            (r) =>
              String(r.role || "").toLowerCase() === "user" &&
              (!positionYear || String(r.tahun ?? r.Tahun) === String(positionYear)) &&
              (r.nama_fakultas_unit || r.NamaFakultasUnit)
          ) ||
          user.extra_role.find(
            (r) =>
              String(r.role || "").toLowerCase() === "user" &&
              (r.nama_fakultas_unit || r.NamaFakultasUnit)
          );
        if (match?.nama_fakultas_unit || match?.NamaFakultasUnit) {
          targetName = match.nama_fakultas_unit || match.NamaFakultasUnit;
        }
      }

      if (!targetName) {
        const rawFu = user?.fakultas_unit ?? user?.id_fakultas_unit ?? user?.FakultasUnit;
        const fuStr = String(rawFu ?? "").trim();
        const hasValidFu = fuStr !== "" && fuStr !== "0" && fuStr !== "null" && fuStr !== "undefined";

        if (hasValidFu) {
          const rawFuName = user?.nama_fakultas_unit || user?.NamaFakultasUnit;
          if (
            rawFuName &&
            String(rawFuName).trim() !== "" &&
            String(rawFuName).trim() !== "null" &&
            String(rawFuName).trim() !== "-"
          ) {
            targetName = rawFuName;
          } else if (Array.isArray(unitOptions) && unitOptions.length > 0) {
            const found = unitOptions.find((u) => {
              const uid = String(u.id ?? u.Id ?? "").trim();
              const uuid = String(u.uuid ?? u.UUID ?? "").trim().toLowerCase();
              const uName = String(u.Nama ?? u.nama ?? u.nama_fak_prod_unit ?? "").trim().toLowerCase();
              return (
                (uid !== "" && uid === fuStr) ||
                (uuid !== "" && uuid === fuStr.toLowerCase()) ||
                (uName !== "" && uName === fuStr.toLowerCase())
              );
            });
            if (found) {
              targetName = renderLabelFakultasUnit(found);
            }
          }
        }
      }
    }
    return targetName ? `User (${targetName})` : "User";
  }
  return text ? text.toUpperCase() : "User";
}

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const isValidationError = (code) =>
  typeof code === "string" && code.endsWith(".Validation");

export const normalizeValidationMessage = (messageObj) => {
  if (!messageObj || typeof messageObj !== "object") return "Validasi gagal";

  return Object.entries(messageObj)
    .map(([field, msg]) => `${field} : ${msg}`)
    .join("\n");
};

export const isOverlap = (aStart, aEnd, bStart, bEnd) => {
  if (!aStart || !aEnd || !bStart || !bEnd) return false;

  const s1 = new Date(aStart);
  const e1 = new Date(aEnd);
  const s2 = new Date(bStart);
  const e2 = new Date(bEnd);

  return s1 <= e2 && s2 <= e1;
};

export const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export const STATUS_LEGEND = {
  verifikasi: {
    label: "Belum Diverifikasi",
    color: "bg-[#1a82c3]",
  },
  gagal: {
    label: "Gagal Verifikasi",
    color: "bg-[#d9534f]",
  },
  sukses: {
    label: "Terverifikasi",
    color: "bg-[#26b99a]",
  },
  kosong: {
    label: "Belum Ada Dokumen",
    color: "bg-[#777]",
  },
};

export function getBackground({ r0 = 0, r1 = 0, r2 = 0, r3 = 0 } = {}) {
  if (r1 > 0 || r0 > 0) return STATUS_LEGEND.verifikasi.color;
  if (r3 > 0) return STATUS_LEGEND.gagal.color;
  if (r2 > 0) return STATUS_LEGEND.sukses.color;
  return STATUS_LEGEND.kosong.color;
}

export function getStatusText({ r0 = 0, r1 = 0, r2 = 0, r3 = 0 } = {}) {
  if (r1 > 0 || r0 > 0) return STATUS_LEGEND.verifikasi.label;
  if (r3 > 0) return STATUS_LEGEND.gagal.label;
  if (r2 > 0) return STATUS_LEGEND.sukses.label;
  return STATUS_LEGEND.kosong.label;
}

export function cleanDuplicateJenjang(str) {
  if (!str) return "";
  let res = String(str).trim();
  // Tangani duplikasi berulang seperti "(S1) (S1)", "(s1) (S1)", "(D3) (D3)", dll
  res = res.replace(/(\((?:S1|S2|S3|D3|D4|Profesi)\))\s*(?:\1)+/gi, "$1");
  // Tangani duplikasi kurung apapun yang berulang seperti "(XXX) (XXX)"
  res = res.replace(/(\([^)]+\))\s*(?:\1)+/gi, "$1");
  return res.trim();
}

export function formatProdiWithJenjang(nama, jenjang, type) {
  if (!nama) return "-";
  let strNama = cleanDuplicateJenjang(String(nama).trim());
  const strJenjang = String(jenjang || "").trim().toUpperCase();
  const strType = String(type || "").trim().toLowerCase();

  // Jika bertipe prodi atau memiliki jenjang, dan nama belum mengandung jenjang
  if ((strType === "prodi" || strJenjang) && strJenjang) {
    const regex = new RegExp(`\\(${strJenjang}\\)|\\b${strJenjang}\\b`, "i");
    if (!regex.test(strNama)) {
      strNama = `${strNama} (${strJenjang})`;
    }
  }
  return cleanDuplicateJenjang(strNama);
}

export function renderLabelFakultasUnit(row) {
  if (!row) return "-";
  if (typeof row === "string") return row;

  const label =
    row?.NamaFakultasUnit ??
    row?.nama_fak_prod_unit ??
    row?.nama_fakultas_unit ??
    row?.FakultasUnit ??
    row?.TargetAudit ??
    row?.target_audit ??
    row?.Nama ??
    row?.nama;

  if (!label || label === "-") {
    const role = String(
      row?.Role || row?.role || row?.ComputedRole || row?.computed_role || ""
    ).toLowerCase();
    if (role === "upms") {
      return "Seluruh Unit (Tingkat Universitas / Sekolah)";
    }
    return "-";
  }

  const jenjang =
    row?.Jenjang ??
    row?.jenjang ??
    row?.KodeJenjang ??
    row?.kode_jenjang ??
    row?.JenjangFakultasUnit ??
    row?.jenjang_fakultas_unit;

  const type =
    row?.Type ??
    row?.type ??
    row?.TypeFakultasUnit ??
    row?.type_fakultas_unit;

  return formatProdiWithJenjang(label, jenjang, type);
}

/**
 * Format satu item fakultas / prodi / unit untuk SearchSelect dropdown options.
 * Menghasilkan badge fu.Type.toUpperCase() di samping kiri nama item.
 */
export const formatFakultasUnitOption = (f) => {
  if (!f) return null;
  const type = String(f.type || f.Type || "unit").toLowerCase().trim();
  const rawBaseName = f.Nama || f.nama_fak_prod_unit || f.nama || "";
  const baseName = cleanDuplicateJenjang(rawBaseName);
  const jenjang = f.Jenjang || f.jenjang || f.KodeJenjang || f.kode_jenjang || "";

  let label = baseName;
  if (type === "prodi") {
    label = formatProdiWithJenjang(baseName, jenjang);
  } else {
    label = baseName;
  }

  // fu.Type.toUpperCase() untuk badge di samping kiri nama item
  const rawType = String(
    f.Type || f.type || (type === "prodi" ? "PRODI" : type === "fakultas" ? "FAKULTAS" : "UNIT")
  ).toUpperCase().trim();
  const badgeText = rawType || "UNIT";

  let badgeClass = "bg-purple-50 text-purple-700 border border-purple-200";
  if (type === "fakultas" || badgeText === "FAKULTAS" || type === "sekolah") {
    badgeClass = "bg-indigo-50 text-indigo-700 border border-indigo-200";
  } else if (type === "unit" || badgeText === "UNIT" || badgeText.includes("LEMBAGA")) {
    badgeClass = "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }

  const uuid = f.UUID || f.uuid;
  const numericId = f.ID || f.id;

  return {
    ...f,
    id: uuid || numericId,
    uuid: uuid,
    rawId: numericId,
    id_numeric: numericId,
    nama: label,
    label: label,
    display_name: label,
    pureName: baseName,
    type: type,
    badge: badgeText,
    badgeClass: badgeClass,
  };
};

/**
 * Single refactored function untuk mengambil master fakultas, prodi, dan unit
 * dari API /fakultasunits?mode=all dengan format badge di samping kiri nama item.
 */
export const fetchFakultasUnits = async () => {
  const res = await apiClient.get("/fakultasunits?mode=all");
  const list = res?.data ?? res ?? [];
  const safe = Array.isArray(list) ? list : (list.data || []);
  return safe.map(formatFakultasUnitOption).filter(Boolean);
};

export const fetchFakultas = fetchFakultasUnits;
export const fetchFakultasUnitOptions = fetchFakultasUnits;

export async function throwIfResponseNotOk(
  res,
  fallbackMsg = "Gagal memuat data"
) {
  if (res.ok) return;
  let detail = `HTTP ${res.status}`;
  try {
    const text = await res.text();
    if (text) {
      try {
        const json = JSON.parse(text);
        detail =
          json?.message ||
          json?.Message ||
          json?.error ||
          json?.Error ||
          detail;
      } catch {
        detail = text.slice(0, 120);
      }
    }
  } catch {
    // ignore body read error
  }
  const err = new Error(`[BE Golang] ${detail}`);
  err.source = "BE Golang";
  err.status = res.status;
  err.fallback = fallbackMsg;
  throw err;
}

export function formatFetchError(err, fallbackMsg = "Gagal memuat data") {
  if (!err) return null;
  if (typeof err === "string") {
    if (err.startsWith("[Network]") || err.startsWith("[BE Golang]")) {
      return err;
    }
    return `[BE Golang] ${err}`;
  }
  const msg = err?.message || "";
  if (msg.startsWith("[Network]") || msg.startsWith("[BE Golang]")) {
    return msg;
  }
  if (err?.source === "BE Golang" || err?.status) {
    return `[BE Golang] ${msg || fallbackMsg}`;
  }
  return `[Network] Layanan tidak dapat dihubungi (${msg || fallbackMsg})`;
}

