import { V_FAKULTAS_UNIT_ROWS, MOCK_ALIASES } from "./vFakultasUnitData.js";

// Fallback kode_fakultas ketika data unit statis offline belum membawa kolom KodeFakultas dari API
export const STATIC_KODE_FAKULTAS_BY_ID = {
  // 01: HUKUM
  "91": "01",
  "1": "01",
  // 02: EKONOMI DAN BISNIS
  "94": "02",
  "2": "02",
  "3": "02",
  "4": "02",
  // 03: KIP
  "97": "03",
  "5": "03",
  "6": "03",
  "7": "03",
  "8": "03",
  "9": "03",
  "10": "03",
  "11": "03",
  "76": "03",
  "77": "03",
  "78": "03",
  "86": "03",
  "87": "03",
  "128": "03",
  "129": "03",
  "130": "03",
  "131": "03",
  // 04: ISIB
  "100": "04",
  "12": "04",
  "13": "04",
  "14": "04",
  "15": "04",
  // 05: TEKNIK
  "103": "05",
  "16": "05",
  "17": "05",
  "18": "05",
  "19": "05",
  "20": "05",
  // 06: MIPA
  "106": "06",
  "21": "06",
  "22": "06",
  "23": "06",
  "24": "06",
  "25": "06",
  "127": "06",
  "73": "06",
  "74": "06",
  "79": "06",
  "80": "06",
  "81": "06",
  "82": "06",
  "83": "06",
  "84": "06",
  "85": "06",
  // 07: PASCASARJANA
  "109": "07",
  "26": "07",
  "27": "07",
  "28": "07",
  "29": "07",
  "30": "07",
  "31": "07",
  "32": "07",
  "33": "07",
  "34": "07",
  "35": "07",
  "126": "07",
  // 08: VOKASI
  "112": "08",
  "36": "08",
  "37": "08",
  "38": "08",
  "39": "08",
  "40": "08",
  "121": "08",
};

export const FAKULTAS_KODE_TO_BOUNDARY_ID = {
  "01": "fak-fh",
  "02": "fak-feb",
  "03": "fak-fkip",
  "06": "fak-mipa",
  "08": "fak-vokasi",
};

const WAREK_FALLBACK_IDS = new Set(["65", "66", "67", "122"]);

const JENJANG_LABELS = {
  d3: "Diploma 3 (D3)",
  d4: "Sarjana Terapan (D4)",
  s1: "Strata 1 (S1)",
  s2: "Magister (S2)",
  s3: "Doktor (S3)",
  profesi: "Profesi",
};

export function getUnitRawId(u) {
  if (!u || typeof u !== "object") return null;
  const candidate = u.rawId ?? u.id_numeric ?? u.ID ?? u.id;
  if (candidate === null || candidate === undefined || candidate === "") return null;
  const numStr = String(candidate).trim();
  if (/^\d+$/.test(numStr)) return numStr;
  return null;
}

export function getUnitUuid(u) {
  if (!u || typeof u !== "object") return "";
  return String(u.uuid ?? u.UUID ?? "").trim();
}

export function getUnitType(u) {
  if (!u || typeof u !== "object") return "";
  return String(u.type ?? u.Type ?? "").toLowerCase().trim();
}

export function getUnitName(u) {
  if (!u || typeof u !== "object") return "";
  return String(
    u.pureName ?? u.nama_fak_prod_unit ?? u.Nama ?? u.nama ?? u.label ?? ""
  ).trim();
}

export function getUnitJenjang(u) {
  if (!u || typeof u !== "object") return "";
  return String(u.jenjang ?? u.Jenjang ?? "").trim();
}

export function getUnitKodeFakultas(u) {
  if (!u || typeof u !== "object") return "";
  const explicit = String(u.kode_fakultas ?? u.KodeFakultas ?? "").trim();
  if (explicit) return explicit;
  const rawId = getUnitRawId(u);
  if (rawId && STATIC_KODE_FAKULTAS_BY_ID[rawId]) {
    return STATIC_KODE_FAKULTAS_BY_ID[rawId];
  }
  return "";
}

export function getUnitFakultasName(u) {
  if (!u || typeof u !== "object") return "";
  return String(u.fakultas ?? u.Fakultas ?? "").trim();
}

export function getUnitMockAlias(u) {
  if (!u || typeof u !== "object") return "";
  const uuid = getUnitUuid(u);
  const rawId = getUnitRawId(u);
  const id = String(u.id ?? "").trim();
  return (
    u.legacyId ||
    (uuid && MOCK_ALIASES[uuid]) ||
    (rawId && MOCK_ALIASES[rawId]) ||
    (id && MOCK_ALIASES[id]) ||
    ""
  );
}

export function isWakilRektorName(name) {
  const cleaned = String(name || "").trim();
  if (!cleaned) return false;
  return /^wakil\s+rektor(\b|\s|$)/i.test(cleaned);
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function findMatchingUnit(unitList, refIdOrName, fallbackName = "") {
  const refStr = String(refIdOrName ?? "").trim();
  const refNorm = normalizeText(refStr);
  const nameNorm = normalizeText(fallbackName);

  const isEmptyRef =
    !refStr || refStr === "0" || refNorm === "null" || refNorm === "undefined";
  if (isEmptyRef && !nameNorm) return null;

  if (!isEmptyRef) {
    const byIdOrUuid = unitList.find((u) => {
      const rawId = getUnitRawId(u);
      const id = String(u.id ?? "").trim();
      const uuid = getUnitUuid(u).toLowerCase();
      return (
        (rawId && rawId === refStr) ||
        (id && id === refStr) ||
        (uuid && uuid === refNorm)
      );
    });
    if (byIdOrUuid) return byIdOrUuid;
  }

  const targetName = !isEmptyRef ? refNorm : nameNorm;
  if (targetName) {
    const byName = unitList.find((u) => {
      const uName = normalizeText(getUnitName(u));
      const uRawNama = normalizeText(u.nama_fak_prod_unit || u.Nama || "");
      return (uName && uName === targetName) || (uRawNama && uRawNama === targetName);
    });
    if (byName) return byName;
  }

  if (nameNorm && nameNorm !== refNorm) {
    const byFallbackName = unitList.find((u) => {
      const uName = normalizeText(getUnitName(u));
      const uRawNama = normalizeText(u.nama_fak_prod_unit || u.Nama || "");
      return (uName && uName === nameNorm) || (uRawNama && uRawNama === nameNorm);
    });
    if (byFallbackName) return byFallbackName;
  }

  return null;
}

export function resolveUserTargetFakultasUnit(
  user,
  fakultasUnits = [],
  positionYear = null
) {
  if (!user || typeof user !== "object") return null;

  const unitSource =
    Array.isArray(fakultasUnits) && fakultasUnits.length > 0
      ? fakultasUnits
      : V_FAKULTAS_UNIT_ROWS;

  let refId = "";
  let refName = "";

  // Penugasan target unit role "user" via ABAC (matching tahun aktif terlebih dulu)
  if (Array.isArray(user.extra_role) && user.extra_role.length > 0) {
    const yearStr = positionYear ? String(positionYear).trim() : "";
    const hasValidRef = (r) => {
      const idVal = String(
        r.id_fakultas_unit ?? r.IdFakultasUnit ?? r.uuid_fakultas_unit ?? ""
      ).trim();
      const nmVal = String(r.nama_fakultas_unit ?? r.NamaFakultasUnit ?? "").trim();
      const validId =
        idVal !== "" && idVal !== "0" && idVal !== "null" && idVal !== "undefined";
      return validId || (nmVal !== "" && nmVal !== "null" && nmVal !== "-");
    };

    const match =
      user.extra_role.find(
        (r) =>
          String(r.role ?? r.Role ?? "").toLowerCase().trim() === "user" &&
          (!yearStr || String(r.tahun ?? r.Tahun ?? "").trim() === yearStr) &&
          hasValidRef(r)
      ) ||
      user.extra_role.find(
        (r) =>
          String(r.role ?? r.Role ?? "").toLowerCase().trim() === "user" &&
          hasValidRef(r)
      );

    if (match) {
      refId = String(
        match.id_fakultas_unit ?? match.IdFakultasUnit ?? match.uuid_fakultas_unit ?? ""
      ).trim();
      refName = String(
        match.nama_fakultas_unit ?? match.NamaFakultasUnit ?? ""
      ).trim();
    }
  }

  if (!refId && !refName) {
    refId = String(
      user.fakultas_unit ??
        user.id_fakultas_unit ??
        user.FakultasUnit ??
        user.uuid_fakultas_unit ??
        ""
    ).trim();
    refName = String(user.nama_fakultas_unit ?? user.NamaFakultasUnit ?? "").trim();
  }

  const invalidRefId =
    !refId || refId === "0" || refId === "null" || refId === "undefined";
  const invalidRefName =
    !refName || refName === "null" || refName === "undefined" || refName === "-";

  if (invalidRefId && invalidRefName) {
    return null;
  }

  const matched = findMatchingUnit(unitSource, invalidRefId ? "" : refId, invalidRefName ? "" : refName);
  if (matched) {
    const rawId = getUnitRawId(matched);
    const uuid = getUnitUuid(matched);
    const kodeFakultas = getUnitKodeFakultas(matched);
    const aliasBoundary =
      (kodeFakultas && FAKULTAS_KODE_TO_BOUNDARY_ID[kodeFakultas]) ||
      getUnitMockAlias(matched) ||
      null;
    return {
      id: uuid || rawId || String(matched.id ?? ""),
      rawId,
      uuid,
      type: getUnitType(matched),
      nama: getUnitName(matched) || refName,
      kodeFakultas,
      fakultasNama: getUnitFakultasName(matched) || getUnitName(matched),
      boundaryId: aliasBoundary,
    };
  }

  // Fallback jika daftar API belum lengkap tetapi nama/ID unit sudah ada di profil user
  const fallbackRawId = !invalidRefId && /^\d+$/.test(refId) ? refId : null;
  const fallbackKode = fallbackRawId
    ? STATIC_KODE_FAKULTAS_BY_ID[fallbackRawId] || ""
    : "";
  return {
    id: !invalidRefId ? refId : refName,
    rawId: fallbackRawId,
    uuid: "",
    type: "",
    nama: !invalidRefName ? refName : refId,
    kodeFakultas: fallbackKode,
    fakultasNama: !invalidRefName ? refName : "",
    boundaryId:
      (fallbackKode && FAKULTAS_KODE_TO_BOUNDARY_ID[fallbackKode]) ||
      (!invalidRefId && MOCK_ALIASES[refId]) ||
      null,
  };
}

export function resolveIkuAnggaranAccess({
  level,
  user,
  fakultasUnits = [],
  positionYear = null,
}) {
  const currentLevel = String(level || user?.level || "")
    .toLowerCase()
    .trim();

  if (currentLevel === "admin" || currentLevel === "anggaran") {
    return {
      allowed: true,
      mode: "all",
      roleType: currentLevel,
      scopeLabel: currentLevel === "admin" ? "Administrator (Semua Unit)" : "Tim Anggaran (Semua Unit)",
      targetUnit: null,
      facultyKode: null,
      facultyName: null,
      boundaryId: null,
    };
  }

  if (currentLevel !== "user") {
    return {
      allowed: false,
      mode: "none",
      roleType: "denied",
      scopeLabel: "",
      targetUnit: null,
      facultyKode: null,
      facultyName: null,
      boundaryId: null,
    };
  }

  const target = resolveUserTargetFakultasUnit(user, fakultasUnits, positionYear);
  if (!target) {
    return {
      allowed: false,
      mode: "none",
      roleType: "denied",
      scopeLabel: "",
      targetUnit: null,
      facultyKode: null,
      facultyName: null,
      boundaryId: null,
    };
  }

  const isWarekByName = isWakilRektorName(target.nama);
  const isWarekById =
    target.rawId && WAREK_FALLBACK_IDS.has(String(target.rawId)) && !target.nama;

  if (isWarekByName || isWarekById) {
    return {
      allowed: true,
      mode: "all",
      roleType: "warek",
      scopeLabel: target.nama || "Wakil Rektor",
      targetUnit: target,
      facultyKode: null,
      facultyName: null,
      boundaryId: null,
    };
  }

  if (target.type === "fakultas") {
    const facultyKode = target.kodeFakultas || null;
    const boundaryId =
      (facultyKode && FAKULTAS_KODE_TO_BOUNDARY_ID[facultyKode]) ||
      target.boundaryId ||
      null;

    return {
      allowed: true,
      mode: "fakultas",
      roleType: "fakultas",
      scopeLabel: target.nama || "Fakultas",
      targetUnit: target,
      facultyKode,
      facultyName: target.nama || "Fakultas",
      boundaryId,
    };
  }

  return {
    allowed: false,
    mode: "none",
    roleType: "denied",
    scopeLabel: "",
    targetUnit: target,
    facultyKode: null,
    facultyName: null,
    boundaryId: null,
  };
}

export function filterUnitsForAccessScope(units = [], accessScope) {
  if (!Array.isArray(units)) return [];
  if (!accessScope || !accessScope.allowed || accessScope.mode === "none") {
    return [];
  }
  if (accessScope.mode === "all") {
    return units;
  }

  const facultyKode = String(accessScope.facultyKode || "").trim();
  const facultyNameNorm = normalizeText(accessScope.facultyName);
  const targetUuid = String(accessScope.targetUnit?.uuid || "").toLowerCase();
  const targetRawId = String(accessScope.targetUnit?.rawId || "").trim();

  return units.filter((u) => {
    const uUuid = getUnitUuid(u).toLowerCase();
    const uRawId = String(getUnitRawId(u) || "").trim();
    if (
      (targetUuid && uUuid && uUuid === targetUuid) ||
      (targetRawId && uRawId && uRawId === targetRawId)
    ) {
      return true;
    }

    const uKode = getUnitKodeFakultas(u);
    if (facultyKode && uKode) {
      return uKode === facultyKode;
    }

    const uFakName = normalizeText(getUnitFakultasName(u));
    if (facultyNameNorm && uFakName && uFakName === facultyNameNorm) {
      return true;
    }

    return false;
  });
}

// Bangun struktur boundary dari v_fakultas_unit ketika fakultas belum punya entri di data mock
export function buildStructuralBoundaryFromUnits(accessScope, scopedUnits = []) {
  if (!accessScope || accessScope.mode !== "fakultas") return null;

  const facultyName = accessScope.facultyName || "Fakultas";
  const units = scopedUnits.filter((u) => getUnitType(u) === "unit");
  const prodis = scopedUnits.filter((u) => getUnitType(u) === "prodi");

  const byJenjang = new Map();
  prodis.forEach((p) => {
    const j = (getUnitJenjang(p) || "lainnya").toLowerCase();
    if (!byJenjang.has(j)) byJenjang.set(j, []);
    byJenjang.get(j).push({
      id: p.uuid || String(p.id || getUnitRawId(p)),
      nama:
        p.nama ||
        p.label ||
        getUnitName(p) ||
        p.pureName ||
        p.nama_fak_prod_unit ||
        p.Nama ||
        "Program Studi",
      jenjang: j,
      kaprodi: "-",
      pagu: 0,
      serapan: 0,
      sisa: 0,
      prokerId: null,
    });
  });

  const jenjangOrder = ["d3", "d4", "s1", "profesi", "s2", "s3", "lainnya"];
  const jenjangList = Array.from(byJenjang.entries())
    .sort((a, b) => {
      const ia = jenjangOrder.indexOf(a[0]);
      const ib = jenjangOrder.indexOf(b[0]);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    })
    .map(([jenjang, list]) => ({
      jenjang,
      namaJenjang: JENJANG_LABELS[jenjang] || jenjang.toUpperCase(),
      prodis: list.sort((a, b) => a.nama.localeCompare(b.nama, "id")),
    }));

  return {
    id: accessScope.boundaryId || `structural-${accessScope.facultyKode || "fak"}`,
    kode: accessScope.facultyKode || "",
    nama: facultyName,
    namaSingkat: facultyName,
    type: "fakultas",
    dekan: "Pimpinan Fakultas",
    pagu: 0,
    serapan: 0,
    sisa: 0,
    color: "#6366f1",
    isStructuralEmpty: true,
    unitList: units.map((u) => ({
      id: u.uuid || String(u.id || getUnitRawId(u)),
      nama: getUnitName(u),
    })),
    jenjangList,
  };
}
