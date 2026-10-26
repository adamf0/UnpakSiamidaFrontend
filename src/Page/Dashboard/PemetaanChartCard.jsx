import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { apiClient } from "@/Common/api";
import { useContent } from "@/Providers/ContentProvider";
import { useAuth } from "@/Providers/AuthProvider";
import {
  makeCirclePoly,
  seedGroupPoints,
  computeVoronoiCells,
} from "./voronoiMath";
import PemetaanDetailModal from "./PemetaanDetailModal";
import DupeIncidentModal from "./DupeIncidentModal";
import PemetaanCompareSection from "./PemetaanCompareSection";
import { formatProdiWithJenjang, renderLabelFakultasUnit } from "@/Common/Utils";
import {
  Calendar,
  Filter,
  RefreshCw,
  Search,
  PieChart,
  Table as TableIcon,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Sparkles,
  Info,
  ChevronDown,
  Building2,
  GraduationCap,
  Boxes,
  Database,
  GripVertical,
  ArrowLeftRight,
} from "lucide-react";

/* =========================================================
   GROUP PALETTE (Aesthetic Inspired by Visual Capitalist)
========================================================= */
export const GROUP_CONFIGS = {
  HUKUM: {
    key: "HUKUM",
    name: "Fakultas Hukum",
    color: "#E06D53", // Coral / Terracotta (mirip Europe)
    badgeBg: "#C85339",
    tag: "FH",
  },
  "EKONOMI DAN BISNIS": {
    key: "EKONOMI DAN BISNIS",
    name: "Fakultas Ekonomi dan Bisnis",
    color: "#2E4057", // Deep Slate Indigo (mirip Asia)
    badgeBg: "#1C2A3A",
    tag: "FEB",
  },
  KIP: {
    key: "KIP",
    name: "FKIP",
    color: "#048A81", // Teal / Jade
    badgeBg: "#036760",
    tag: "FKIP",
  },
  ISIB: {
    key: "ISIB",
    name: "FISIB",
    color: "#A8577E", // Mulberry / Rose
    badgeBg: "#863C60",
    tag: "FISIB",
  },
  TEKNIK: {
    key: "TEKNIK",
    name: "Fakultas Teknik",
    color: "#4A6FA5", // Steel Blue (mirip North America)
    badgeBg: "#355482",
    tag: "FT",
  },
  MIPA: {
    key: "MIPA",
    name: "FMIPA",
    color: "#3E885B", // Forest Green
    badgeBg: "#2C6B44",
    tag: "FMIPA",
  },
  PASCASARJANA: {
    key: "PASCASARJANA",
    name: "Sekolah Pascasarjana",
    color: "#594157", // Deep Plum
    badgeBg: "#3F2C3D",
    tag: "PASCA",
  },
  VOKASI: {
    key: "VOKASI",
    name: "Sekolah Vokasi",
    color: "#D48C46", // Warm Amber (mirip Africa)
    badgeBg: "#AD6C2B",
    tag: "VOKASI",
  },
  UNIT: {
    key: "UNIT",
    name: "Unit Kerja / Universitas",
    color: "#6C757D", // Neutral Slate (mirip Oceania)
    badgeBg: "#495057",
    tag: "UNIT",
  },
};

// WARNA MERAH KHUSUS YANG TIDAK ADA PEMETAAN
export const UNMAPPED_CONFIG = {
  key: "UNMAPPED",
  name: "Belum Ada Pemetaan",
  color: "#DC2626", // Merah Terang
  badgeBg: "#991B1B",
  border: "#FFFFFF",
};

/**
 * Normalisasi Group Key berdasarkan data fakultas unit
 */
function resolveGroupKey(item) {
  if (item.Type === "unit") return "UNIT";

  const rawFak = (item.Fakultas || item.KodeFakultas || "").trim().toUpperCase();
  for (const k of Object.keys(GROUP_CONFIGS)) {
    if (k === "UNIT") continue;
    if (rawFak.includes(k) || k.includes(rawFak)) return k;
  }

  // Cek berdasarkan nama jika tipe fakultas
  if (item.Type === "fakultas") {
    const rawNama = (item.Nama || "").toUpperCase();
    for (const k of Object.keys(GROUP_CONFIGS)) {
      if (k === "UNIT") continue;
      if (rawNama.includes(k)) return k;
    }
  }

  return "UNIT";
}

/**
 * Helper untuk memberikan variasi kecerahan (shade) pada prodi di fakultas yang sama
 */
function adjustColorBrightness(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return (
    "#" +
    (
      0x1000000 +
      (R < 255 ? (R < 0 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 0 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 0 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}

/**
 * Memformat nama unit menjadi 1 atau 2 baris agar muat rapi di dalam sel poligon
 */
function formatCellLines(nama, maxCharsPerLine = 12) {
  if (!nama) return [""];
  const clean = nama.trim();
  const words = clean.split(/\s+/);
  if (words.length === 1) {
    return [
      clean.length > maxCharsPerLine
        ? clean.slice(0, Math.max(3, maxCharsPerLine - 1)) + ".."
        : clean,
    ];
  }
  const line1 = [];
  const line2 = [];
  let count1 = 0;
  for (const w of words) {
    if (count1 + w.length <= maxCharsPerLine || line1.length === 0) {
      line1.push(w);
      count1 += w.length + 1;
    } else {
      line2.push(w);
    }
  }
  const str1 = line1.join(" ");
  const str2 = line2.join(" ");
  const cleanStr1 =
    str1.length > maxCharsPerLine
      ? str1.slice(0, Math.max(3, maxCharsPerLine - 1)) + ".."
      : str1;

  if (!str2) return [cleanStr1];
  const cleanStr2 =
    str2.length > maxCharsPerLine
      ? str2.slice(0, Math.max(3, maxCharsPerLine - 1)) + ".."
      : str2;
  return [cleanStr1, cleanStr2];
}

export default function PemetaanChartCard() {
  const { positionYear, level } = useContent();
  const { user } = useAuth();
  const currentLevel = String(level || user?.level || "").toLowerCase().trim();
  const isAdmin = currentLevel === "admin";

  /* ================= STATE ================= */
  const [selectedTahun, setSelectedTahun] = useState(() => {
    const yr = String(positionYear || "2026").trim();
    return yr !== "2023" && Number(yr) >= 2024 ? yr : "2026";
  });
  const [availableYears, setAvailableYears] = useState([
    "2027",
    "2026",
    "2025",
    "2024",
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Raw data
  const [fakultasUnits, setFakultasUnits] = useState([]);
  const [templateRenstra, setTemplateRenstra] = useState([]);
  const [templateDokumen, setTemplateDokumen] = useState([]);

  // UI States
  const [filterType, setFilterType] = useState("all"); // "all" | "mapped" | "unmapped" | "prodi" | "fakultas" | "unit"
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("chart"); // "chart" | "table"
  const [hoveredItem, setHoveredItem] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectedDetailUnit, setSelectedDetailUnit] = useState(null);
  const [activeGroupHighlight, setActiveGroupHighlight] = useState(null);
  const [showDupeModal, setShowDupeModal] = useState(false);

  // States untuk Perbandingan (Compare Target 1 vs Target 2)
  const [compareTarget1, setCompareTarget1] = useState(null);
  const [compareTarget2, setCompareTarget2] = useState(null);
  const [draggedUnit, setDraggedUnit] = useState(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [hoveredDropSlot, setHoveredDropSlot] = useState(null); // 1 | 2 | null

  const dragStateRef = useRef({
    isDown: false,
    isDragging: false,
    cell: null,
    startX: 0,
    startY: 0,
  });
  const justFinishedDragRef = useRef(false);

  const containerRef = useRef(null);

  const scrollToCompare = () => {
    setTimeout(() => {
      const el = document.getElementById("pemetaan-compare-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  };

  /* ================= FETCH DATA TAHUN ================= */
  useEffect(() => {
    async function loadYears() {
      try {
        const [resRenstra, resProker] = await Promise.allSettled([
          apiClient.get("/tahunrenstras?mode=all"),
          apiClient.get("/mastertahuns?mode=all"),
        ]);
        const ySet = new Set(["2027", "2026", "2025", "2024"]);
        if (resRenstra.status === "fulfilled" && Array.isArray(resRenstra.value?.data)) {
          resRenstra.value.data.forEach((y) => {
            const yr = String(y.Tahun || y.tahun || "").trim();
            // Pemetaan Renstra & Dokumen Tambahan berlaku 2024 ke atas (tidak ada 2023)
            if (yr && yr !== "2023" && Number(yr) >= 2024) ySet.add(yr);
          });
        }
        if (resProker.status === "fulfilled" && Array.isArray(resProker.value?.data)) {
          resProker.value.data.forEach((y) => {
            const yr = String(y.Tahun || y.tahun || "").trim();
            if (yr && yr !== "2023" && Number(yr) >= 2024) ySet.add(yr);
          });
        }
        // Hapus 2023 jika ada
        ySet.delete("2023");
        const sorted = Array.from(ySet)
          .filter((yr) => yr !== "2023" && Number(yr) >= 2024)
          .sort((a, b) => Number(b) - Number(a));

        setAvailableYears(sorted);
        if (!selectedTahun || selectedTahun === "2023" || !sorted.includes(selectedTahun)) {
          setSelectedTahun(sorted[0] || "2026");
        }
      } catch (e) {
        console.warn("Gagal memuat list tahun master:", e);
      }
    }
    loadYears();
  }, []);

  // Update selectedTahun jika positionYear berubah (kecualikan 2023)
  useEffect(() => {
    if (positionYear) {
      const yr = String(positionYear).trim();
      if (yr !== "2023" && Number(yr) >= 2024) {
        setSelectedTahun(yr);
      } else if (!selectedTahun || selectedTahun === "2023") {
        setSelectedTahun("2026");
      }
    }
  }, [positionYear]);

  /* ================= FETCH MAPPING DATA ================= */
  const fetchData = useCallback(async (targetTahun = selectedTahun) => {
    if (!targetTahun) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch Fakultas/Unit, Template Renstra, & Template Dokumen Tambahan
      const [resUnits, resRenstra, resDokumen] = await Promise.all([
        apiClient.get("/fakultasunits?mode=all"),
        apiClient
          .get(`/templaterenstras?mode=all&filters=tahun:eq:${targetTahun}`)
          .catch(() => ({ data: [] })),
        apiClient
          .get(
            `/templatedokumentambahans?mode=all&filters=tahun:eq:${targetTahun}`
          )
          .catch(() => ({ data: [] })),
      ]);

      const unitsData = Array.isArray(resUnits?.data) ? resUnits.data : [];
      const renstraData = Array.isArray(resRenstra?.data)
        ? resRenstra.data
        : Array.isArray(resRenstra)
        ? resRenstra
        : [];
      const dokumenData = Array.isArray(resDokumen?.data)
        ? resDokumen.data
        : Array.isArray(resDokumen)
        ? resDokumen
        : [];

      setFakultasUnits(unitsData);
      setTemplateRenstra(renstraData);
      setTemplateDokumen(dokumenData);
    } catch (err) {
      console.error("Gagal memuat data pemetaan:", err);
      setError("Gagal memuat data pemetaan untuk tahun " + targetTahun);
    } finally {
      setLoading(false);
    }
  }, [selectedTahun]);

  useEffect(() => {
    fetchData(selectedTahun);
  }, [selectedTahun, fetchData]);

  /* ================= DATA MATCHER & STATS ================= */
  const processedData = useMemo(() => {
    if (!fakultasUnits || fakultasUnits.length === 0) return [];

    // 1. Group master template renstra by indicator (agar tidak duplikat)
    const indicatorMap = new Map();
    (templateRenstra || []).forEach((tr) => {
      const indId =
        tr.IndikatorRenstraID ||
        tr.indikator ||
        tr.IndikatorRenstraUuid ||
        tr.Indikator;
      if (!indId) return;
      const key = String(indId);

      if (!indicatorMap.has(key)) {
        indicatorMap.set(key, {
          key,
          indikatorId: tr.IndikatorRenstraID,
          indikatorUuid: tr.IndikatorRenstraUuid,
          indikator: tr.Indikator,
          standarRenstra: tr.StandarRenstra,
          standarRenstraId: tr.StandarRenstraID,
          klasifikasi: tr.Klasifikasi,
          target: tr.Target,
          satuan: tr.Satuan,
          rawRows: [],
        });
      }
      indicatorMap.get(key).rawRows.push(tr);
    });

    // 2. Group master template dokumen tambahan by jenis file / pertanyaan
    const dokumenMap = new Map();
    (templateDokumen || []).forEach((td) => {
      const docId =
        td.JenisFileID ||
        td.JenisFileUuid ||
        td.JenisFile ||
        td.Pertanyaan ||
        td.ID;
      if (!docId) return;
      const key = String(docId);

      if (!dokumenMap.has(key)) {
        dokumenMap.set(key, {
          key,
          jenisFileId: td.JenisFileID,
          jenisFileUuid: td.JenisFileUuid,
          jenisFile: td.JenisFile,
          pertanyaan: td.Pertanyaan,
          klasifikasi: td.Klasifikasi,
          rawRows: [],
        });
      }
      dokumenMap.get(key).rawRows.push(td);
    });

    // 3. Helper matcher untuk row Renstra
    const doesRowMatchUnit = (row, unit) => {
      const uId = Number(unit.ID || unit.id || 0);
      const rId = Number(
        row.FakultasUnitID || row.fakultas_unit || row.FakultasUnitId || 0
      );

      // 1. Direct ID Match: jika row sudah ditargetkan untuk FakultasUnitID spesifik (> 0)
      if (rId > 0 && uId > 0) {
        return rId === uId;
      }

      // 2. Direct UUID Match
      const rUuid = row.FakultasUnitUUID || row.fakultas_unit_uuid;
      const uUuid = unit.UUID || unit.uuid;
      if (rUuid && uUuid) {
        return rUuid === uUuid;
      }

      // 3. Kategori Match: HANYA jika row TIDAK memiliki FakultasUnitID spesifik
      if (row.Kategori) {
        const [kType, kJenjang] = row.Kategori.toLowerCase().split("#");
        const uType = (unit.Type || unit.type || "").toLowerCase();
        const uJenjang = (unit.Jenjang || unit.jenjang || "").toLowerCase();

        if (kType === uType) {
          if (!kJenjang || kJenjang === "all") return true;
          if (kJenjang === uJenjang) return true;
        }
        return false;
      }

      // 4. Direct Name Match: HANYA jika TIDAK ADA FakultasUnitID/UUID dan TIDAK ADA Kategori
      const rName = (row.FakultasUnit || "").trim().toLowerCase();
      const uName = (unit.Nama || unit.nama || "").trim().toLowerCase();
      if (rName && uName) {
        const uType = (unit.Type || unit.type || "").toLowerCase();
        const uJenjang = (unit.Jenjang || unit.jenjang || "").toLowerCase();

        if (uType === "prodi") {
          if (uJenjang && (rName.includes(`(${uJenjang})`) || rName.endsWith(` ${uJenjang}`))) {
            return rName.startsWith(uName);
          }
          return rName === uName;
        }
        return rName === uName;
      }
      return false;
    };

    // 4. Helper matcher untuk row Dokumen Tambahan
    const doesDocMatchUnit = (target, unit) => {
      if (!target) return false;
      const clean = target.trim().toLowerCase();
      const uType = (unit.Type || unit.type || "").toLowerCase();
      const uJenjang = (unit.Jenjang || unit.jenjang || "").toLowerCase();
      const uName = (unit.Nama || unit.nama || "").trim().toLowerCase();

      if (clean === "fakultas#all" && uType === "fakultas") return true;
      if (clean === "prodi#all" && uType === "prodi") return true;
      if (clean === "unit#all" && uType === "unit") return true;
      if (clean.includes("#")) {
        const [tType, tJenjang] = clean.split("#");
        if (tType === uType) {
          if (!tJenjang || tJenjang === "all") return true;
          if (tJenjang === uJenjang) return true;
        }
        return false;
      }
      if (clean === String(unit.ID || unit.id)) return true;
      if (uName && clean === uName) return true;
      return false;
    };

    // 5. Hitung pemetaan per unit (dengan deduplikasi penuh & identifikasi penerima)
    return fakultasUnits.map((unit) => {
      // A. Indikator Renstra (Tampil 1 per Indikator, tidak duplikat)
      const matchingRenstra = [];

      indicatorMap.forEach((ind) => {
        const matchedRowsForUnit = ind.rawRows.filter((r) =>
          doesRowMatchUnit(r, unit)
        );

        if (matchedRowsForUnit.length > 0) {
          const sample = matchedRowsForUnit[0];

          // Tugas auditor yang terkait untuk unit ini
          const tugasSet = new Set();
          const taskRowsMap = {};
          matchedRowsForUnit.forEach((r) => {
            const t = (r.Tugas || "default").trim();
            if (t) tugasSet.add(t);
            taskRowsMap[t] = (taskRowsMap[t] || []).concat(r);
          });

          // Cek apakah ada tugas yang memiliki row duplikat untuk unit ini
          let hasDupe = false;
          let dupeCount = 0;
          const dupeRowIds = [];
          Object.values(taskRowsMap).forEach((rArr) => {
            if (rArr.length > 1) {
              hasDupe = true;
              dupeCount += rArr.length - 1;
              dupeRowIds.push(...rArr.map((r) => r.ID || r.UUID));
            }
          });

          // Kumpulkan siapa saja yang dapat indikator ini (di seluruh universitas)
          const recipientUnitsMap = new Map();
          const recipientKategoriSet = new Set();

          ind.rawRows.forEach((r) => {
            if (r.Kategori) recipientKategoriSet.add(r.Kategori);

            const rFuId = r.FakultasUnitID || r.fakultas_unit || r.FakultasUnitId;
            if (rFuId) {
              const fu = fakultasUnits.find(
                (u) => Number(u.ID || u.id) === Number(rFuId)
              );
              if (fu) {
                recipientUnitsMap.set(
                  String(fu.ID || fu.id),
                  formatProdiWithJenjang(
                    fu.Nama || fu.nama,
                    fu.Jenjang || fu.jenjang,
                    fu.Type || fu.type
                  )
                );
              } else {
                let fallbackJenjang = r.Jenjang || r.jenjang;
                if (!fallbackJenjang && r.Kategori && r.Kategori.includes("#")) {
                  fallbackJenjang = r.Kategori.split("#")[1];
                }
                const formatted = formatProdiWithJenjang(
                  r.FakultasUnit,
                  fallbackJenjang,
                  r.FakultasUnitType || "prodi"
                );
                recipientUnitsMap.set(String(rFuId), formatted);
              }
            } else if (r.Kategori) {
              fakultasUnits.forEach((fu) => {
                if (doesRowMatchUnit(r, fu)) {
                  recipientUnitsMap.set(
                    String(fu.ID || fu.id),
                    formatProdiWithJenjang(
                      fu.Nama || fu.nama,
                      fu.Jenjang || fu.jenjang,
                      fu.Type || fu.type
                    )
                  );
                }
              });
            } else if (r.FakultasUnit) {
              const foundFu = fakultasUnits.find(
                (u) =>
                  (u.Nama || u.nama || "").toLowerCase().trim() ===
                  String(r.FakultasUnit).toLowerCase().trim()
              );
              if (foundFu) {
                recipientUnitsMap.set(
                  String(foundFu.ID || foundFu.id),
                  formatProdiWithJenjang(
                    foundFu.Nama || foundFu.nama,
                    foundFu.Jenjang || foundFu.jenjang,
                    foundFu.Type || foundFu.type
                  )
                );
              } else {
                recipientUnitsMap.set(r.FakultasUnit, r.FakultasUnit);
              }
            }
          });

          matchingRenstra.push({
            indikatorId: ind.indikatorId,
            indikatorUuid: ind.indikatorUuid,
            Indikator: ind.indikator,
            StandarRenstra: ind.standarRenstra,
            StandarRenstraID: ind.standarRenstraId,
            Klasifikasi: sample.Klasifikasi || ind.klasifikasi || "minor",
            Target: sample.Target || ind.target || "-",
            Satuan: sample.Satuan || ind.satuan || "",
            Tugas: Array.from(tugasSet).join(", "),
            tugasList: Array.from(tugasSet),
            // Data siapa yang dapat
            recipientUnits: Array.from(recipientUnitsMap.values()),
            recipientCategories: Array.from(recipientKategoriSet),
            recipientCount: recipientUnitsMap.size,
            // Deteksi duplikasi di DB untuk unit ini
            hasDupe,
            dupeCount,
            dupeRowIds,
          });
        }
      });

      // B. Dokumen Tambahan (Tampil 1 per Dokumen, tidak duplikat)
      const matchingDokumen = [];

      dokumenMap.forEach((doc) => {
        const matchedRowsForUnit = doc.rawRows.filter((r) =>
          doesDocMatchUnit(r.FakultasProdiUnit, unit)
        );

        if (matchedRowsForUnit.length > 0) {
          const sample = matchedRowsForUnit[0];

          const tugasSet = new Set();
          const taskRowsMap = {};
          matchedRowsForUnit.forEach((r) => {
            const t = (r.Tugas || "default").trim();
            if (t) tugasSet.add(t);
            taskRowsMap[t] = (taskRowsMap[t] || []).concat(r);
          });

          let hasDupe = false;
          let dupeCount = 0;
          const dupeRowIds = [];
          Object.values(taskRowsMap).forEach((rArr) => {
            if (rArr.length > 1) {
              hasDupe = true;
              dupeCount += rArr.length - 1;
              dupeRowIds.push(...rArr.map((r) => r.ID || r.UUID));
            }
          });

          // Kumpulkan siapa saja yang dapat dokumen ini
          const recipientUnitsMap = new Map();
          const recipientTargetsSet = new Set();

          doc.rawRows.forEach((r) => {
            if (r.FakultasProdiUnit) recipientTargetsSet.add(r.FakultasProdiUnit);
            fakultasUnits.forEach((fu) => {
              if (doesDocMatchUnit(r.FakultasProdiUnit, fu)) {
                recipientUnitsMap.set(
                  String(fu.ID || fu.id),
                  formatProdiWithJenjang(
                    fu.Nama || fu.nama,
                    fu.Jenjang || fu.jenjang,
                    fu.Type || fu.type
                  )
                );
              }
            });
          });

          matchingDokumen.push({
            jenisFileId: doc.jenisFileId,
            jenisFileUuid: doc.jenisFileUuid,
            JenisFile: doc.jenisFile || "Dokumen Tambahan",
            Pertanyaan: doc.pertanyaan || "-",
            Klasifikasi: sample.Klasifikasi || doc.klasifikasi || "minor",
            Tugas: Array.from(tugasSet).join(", "),
            tugasList: Array.from(tugasSet),
            // Data siapa yang dapat
            recipientUnits: Array.from(recipientUnitsMap.values()),
            recipientTargets: Array.from(recipientTargetsSet),
            recipientCount: recipientUnitsMap.size,
            hasDupe,
            dupeCount,
            dupeRowIds,
          });
        }
      });

      const renstraCount = matchingRenstra.length;
      const dokumenCount = matchingDokumen.length;
      const totalPemetaan = renstraCount + dokumenCount;
      const isUnmapped = totalPemetaan === 0;

      const renstraDupeCount = matchingRenstra.filter((r) => r.hasDupe).length;
      const dokumenDupeCount = matchingDokumen.filter((d) => d.hasDupe).length;
      const dupeIncidentCount = renstraDupeCount + dokumenDupeCount;

      const groupKey = resolveGroupKey(unit);
      const groupConfig = GROUP_CONFIGS[groupKey] || GROUP_CONFIGS.UNIT;

      return {
        id: unit.ID,
        uuid: unit.UUID,
        nama: unit.Nama,
        namaFormatted: formatProdiWithJenjang(
          unit.Nama,
          unit.Jenjang,
          unit.Type
        ),
        jenjang: unit.Jenjang || "",
        kodeJenjang: unit.KodeJenjang || "",
        type: unit.Type || "prodi",
        fakultas: unit.Fakultas || groupConfig.name,
        kodeFakultas: unit.KodeFakultas || "",
        groupKey,
        groupConfig,
        renstraCount,
        renstraList: matchingRenstra,
        dokumenTambahanCount: dokumenCount,
        dokumenTambahanList: matchingDokumen,
        totalPemetaan,
        isUnmapped,
        dupeIncidentCount,
      };
    });
  }, [fakultasUnits, templateRenstra, templateDokumen]);

  /* ================= USER ACCESSIBILITY RESTRICTION ================= */
  // Card terbuka untuk seluruh stakeholder/user layaknya admin tanpa batasan unit
  const accessibleUnitMatcher = null;
  const userActiveUnit = null;

  /* ================= DETEKSI INSIDEN DUPLIKASI DATABASE ================= */
  const dupeIncidents = useMemo(() => {
    const list = [];
    const seenSignatures = new Set();

    // 1. Ambil insiden duplikasi dari penugasan per-unit (Unit-Level Assignment Overlap)
    // Menangkap kasus penugasan ganda pada suatu Prodi/Fakultas (tumpang tindih FakultasUnitID vs Kategori broadcast)
    if (processedData && processedData.length > 0) {
      processedData.forEach((unit) => {
        // A. Renstra dupe pada unit ini
        (unit.renstraList || []).forEach((ren) => {
          if (ren.hasDupe) {
            const signature = `renstra_${unit.id}_${ren.indikatorId}_${ren.Tugas}`;
            if (!seenSignatures.has(signature)) {
              seenSignatures.add(signature);
              list.push({
                type: "renstra",
                signature,
                indikator: ren.Indikator || `Indikator #${ren.indikatorId}`,
                indikatorId: ren.indikatorId,
                standar: ren.StandarRenstra || "-",
                unitNama: formatProdiWithJenjang(
                  unit.nama,
                  unit.jenjang,
                  unit.type
                ),
                unitJenjang: unit.jenjang,
                unitType: unit.type,
                unitId: unit.id,
                tugas: ren.Tugas || "-",
                tahun: selectedTahun,
                count: (ren.dupeCount || 0) + 1,
                rowIds: ren.dupeRowIds || [],
                reason: "Tumpang tindih penugasan (Kategori broadcast vs Unit langsung)",
              });
            }
          }
        });

        // B. Dokumen tambahan dupe pada unit ini
        (unit.dokumenTambahanList || []).forEach((doc) => {
          if (doc.hasDupe) {
            const signature = `dokumen_${unit.id}_${doc.jenisFileId}_${doc.Tugas}`;
            if (!seenSignatures.has(signature)) {
              seenSignatures.add(signature);
              const formattedName = formatProdiWithJenjang(
                unit.nama,
                unit.jenjang,
                unit.type
              );
              list.push({
                type: "dokumen",
                signature,
                jenisFile: doc.JenisFile || `File #${doc.jenisFileId}`,
                pertanyaan: doc.Pertanyaan || "-",
                target: formattedName,
                unitNama: formattedName,
                unitJenjang: unit.jenjang,
                unitType: unit.type,
                unitId: unit.id,
                tugas: doc.Tugas || "-",
                tahun: selectedTahun,
                count: (doc.dupeCount || 0) + 1,
                rowIds: doc.dupeRowIds || [],
                reason: "Tumpang tindih penugasan dokumen tambahan",
              });
            }
          }
        });
      });
    }

    // 2. Scan Duplikasi Literal Mentah di Database (jika ada baris yang kolomnya 100% identik)
    if (templateRenstra && templateRenstra.length > 0) {
      const renstraKeyMap = new Map();
      templateRenstra.forEach((row) => {
        const indKey = row.IndikatorRenstraID || row.indikator || row.Indikator || "";
        const unitKey = row.FakultasUnitID || row.fakultas_unit || row.FakultasUnit || row.Kategori || "";
        const tugasKey = (row.Tugas || row.tugas || "semua").trim().toLowerCase();
        const signature = `raw_renstra_${row.Tahun || selectedTahun}_${indKey}_${unitKey}_${tugasKey}`;

        if (!renstraKeyMap.has(signature)) {
          renstraKeyMap.set(signature, [row]);
        } else {
          renstraKeyMap.get(signature).push(row);
        }
      });

      renstraKeyMap.forEach((rows, sig) => {
        if (rows.length > 1) {
          const first = rows[0];
          const ids = rows.map((r) => r.ID || r.UUID || "?");
          const alreadyCaptured = list.some((item) =>
            item.rowIds && ids.some((id) => item.rowIds.includes(id))
          );
          if (!alreadyCaptured) {
            const fuFound = fakultasUnits.find(
              (u) =>
                Number(u.ID || u.id) ===
                Number(first.FakultasUnitID || first.fakultas_unit)
            );
            const unitFormatted = fuFound
              ? formatProdiWithJenjang(
                  fuFound.Nama || fuFound.nama,
                  fuFound.Jenjang || fuFound.jenjang,
                  fuFound.Type || fuFound.type
                )
              : first.FakultasUnit || first.Kategori || "-";

            list.push({
              type: "renstra",
              signature: sig,
              indikator: first.Indikator || `Indikator #${first.IndikatorRenstraID}`,
              indikatorId: first.IndikatorRenstraID,
              standar: first.StandarRenstra || "-",
              unitNama: unitFormatted,
              unitJenjang: fuFound?.Jenjang || fuFound?.jenjang || "",
              unitType: fuFound?.Type || fuFound?.type || "",
              unitId: first.FakultasUnitID,
              tugas: first.Tugas || "-",
              tahun: first.Tahun || selectedTahun,
              count: rows.length,
              rowIds: ids,
              reason: "Baris duplikat mentah identik di database",
            });
          }
        }
      });
    }

    // 3. Scan Duplikasi Literal Mentah Dokumen Tambahan
    if (templateDokumen && templateDokumen.length > 0) {
      const docKeyMap = new Map();
      templateDokumen.forEach((row) => {
        const docKey = row.JenisFileID || row.JenisFile || row.Pertanyaan || "";
        const targetKey = (row.FakultasProdiUnit || "").trim().toLowerCase();
        const tugasKey = (row.Tugas || "semua").trim().toLowerCase();
        const signature = `raw_doc_${row.Tahun || selectedTahun}_${docKey}_${targetKey}_${tugasKey}`;

        if (!docKeyMap.has(signature)) {
          docKeyMap.set(signature, [row]);
        } else {
          docKeyMap.get(signature).push(row);
        }
      });

      docKeyMap.forEach((rows, sig) => {
        if (rows.length > 1) {
          const first = rows[0];
          const ids = rows.map((r) => r.ID || r.UUID || "?");
          const alreadyCaptured = list.some((item) =>
            item.rowIds && ids.some((id) => item.rowIds.includes(id))
          );
          if (!alreadyCaptured) {
            list.push({
              type: "dokumen",
              signature: sig,
              jenisFile: first.JenisFile || `File #${first.JenisFileID}`,
              pertanyaan: first.Pertanyaan || "-",
              target: first.FakultasProdiUnit || "-",
              unitNama: first.FakultasProdiUnit || "-",
              tugas: first.Tugas || "-",
              tahun: first.Tahun || selectedTahun,
              count: rows.length,
              rowIds: ids,
              reason: "Baris duplikat mentah identik di database",
            });
          }
        }
      });
    }

    return list;
  }, [processedData, templateRenstra, templateDokumen, selectedTahun]);

  const totalExtraRows = useMemo(() => {
    return dupeIncidents.reduce((acc, inc) => acc + (inc.count - 1), 0);
  }, [dupeIncidents]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalUnit = processedData.length;
    const mappedUnits = processedData.filter((d) => !d.isUnmapped).length;
    const unmappedUnits = totalUnit - mappedUnits;
    const totalAllPemetaan = processedData.reduce(
      (acc, d) => acc + d.totalPemetaan,
      0
    );
    const totalRenstra = processedData.reduce(
      (acc, d) => acc + d.renstraCount,
      0
    );
    const totalDokumen = processedData.reduce(
      (acc, d) => acc + d.dokumenTambahanCount,
      0
    );
    const percentageMapped = totalUnit > 0 ? ((mappedUnits / totalUnit) * 100).toFixed(1) : "0";
    const dupeUnitsCount = processedData.filter((d) => d.dupeIncidentCount > 0).length;

    return {
      totalUnit,
      mappedUnits,
      unmappedUnits,
      totalAllPemetaan,
      totalRenstra,
      totalDokumen,
      percentageMapped,
      dupeUnitsCount,
    };
  }, [processedData]);

  /* ================= FILTERED & GROUPED FOR VORONOI ================= */
  const filteredData = useMemo(() => {
    let result = [...processedData];

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (d) =>
          d.nama.toLowerCase().includes(q) ||
          d.fakultas.toLowerCase().includes(q) ||
          d.jenjang.toLowerCase().includes(q) ||
          d.type.toLowerCase().includes(q)
      );
    }

    // Filter by Type / Mapping Status
    if (filterType === "mapped") {
      result = result.filter((d) => !d.isUnmapped);
    } else if (filterType === "unmapped") {
      result = result.filter((d) => d.isUnmapped);
    } else if (filterType === "prodi") {
      result = result.filter((d) => d.type === "prodi");
    } else if (filterType === "fakultas") {
      result = result.filter((d) => d.type === "fakultas");
    } else if (filterType === "unit") {
      result = result.filter((d) => d.type === "unit");
    } else if (filterType === "dupe") {
      result = result.filter((d) => d.dupeIncidentCount > 0);
    }

    return result;
  }, [processedData, searchQuery, filterType]);

  // Group items by Fakultas/Unit for circular clustering
  const clusteredGroups = useMemo(() => {
    const groupsMap = {};
    Object.keys(GROUP_CONFIGS).forEach((k) => {
      groupsMap[k] = {
        key: k,
        name: GROUP_CONFIGS[k].name,
        color: GROUP_CONFIGS[k].color,
        items: [],
      };
    });

    filteredData.forEach((item) => {
      const k = item.groupKey || "UNIT";
      if (!groupsMap[k]) {
        groupsMap[k] = {
          key: k,
          name: item.fakultas || k,
          color: GROUP_CONFIGS.UNIT.color,
          items: [],
        };
      }
      groupsMap[k].items.push(item);
    });

    // Urutkan grup agar memiliki susunan visual yang harmonis
    return Object.values(groupsMap).filter((g) => g.items.length > 0);
  }, [filteredData]);

  /* ================= COMPUTE VORONOI CELLS ================= */
  const chartRadius = 380;
  const chartCenter = 420;

  const voronoiCells = useMemo(() => {
    if (clusteredGroups.length === 0) return [];
    // 1. Seeding koordinat per sektor
    const seeded = seedGroupPoints(
      clusteredGroups,
      chartCenter,
      chartCenter,
      chartRadius
    );
    // 2. Relaksasi Lloyd untuk menghitung polygon Voronoi
    const cells = computeVoronoiCells(
      seeded,
      chartCenter,
      chartCenter,
      chartRadius,
      4
    );

    // 3. Warna dan persentase untuk setiap sel
    const totalPemetaanAll = stats.totalAllPemetaan || 1;
    return cells.map((cell, idx) => {
      let cellColor;
      let badgeColor;
      let textColor = "#FFFFFF";

      if (cell.isUnmapped) {
        // MERAH KHUSUS YANG TIDAK ADA PEMETAAN
        cellColor = UNMAPPED_CONFIG.color;
        badgeColor = UNMAPPED_CONFIG.badgeBg;
      } else {
        // Warna Fakultas dengan sedikit variasi shade
        const baseColor = cell.groupConfig?.color || GROUP_CONFIGS.UNIT.color;
        const shadeOffset = ((idx % 3) - 1) * 6; // -6%, 0%, +6%
        cellColor = adjustColorBrightness(baseColor, shadeOffset);
        badgeColor = cell.groupConfig?.badgeBg || cellColor;
      }

      const percent =
        cell.totalPemetaan > 0
          ? ((cell.totalPemetaan / totalPemetaanAll) * 100).toFixed(1)
          : "0.0";

      return {
        ...cell,
        cellColor,
        badgeColor,
        textColor,
        percent,
      };
    });
  }, [clusteredGroups, stats.totalAllPemetaan]);

  /* ================= INTERACTION HANDLERS ================= */
  const handleMouseMove = (e, item) => {
    if (!containerRef.current) return;
    if (accessibleUnitMatcher && !accessibleUnitMatcher.checkUnit(item)) {
      setHoveredItem(null);
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setHoveredItem(item);
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };

  const handleCellClick = (item) => {
    if (justFinishedDragRef.current) return;
    if (accessibleUnitMatcher && !accessibleUnitMatcher.checkUnit(item)) return;
    setSelectedDetailUnit(item);
  };

  /* ================= UNIVERSAL POINTER DRAG & DROP DARI CHART ================= */
  const handleCellPointerDown = (e, cell) => {
    if (!isAdmin) return;
    // Tanggapi hanya klik kiri mouse / touch
    if (e.button !== 0) return;
    dragStateRef.current = {
      isDown: true,
      isDragging: false,
      cell,
      startX: e.clientX,
      startY: e.clientY,
    };
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      const state = dragStateRef.current;
      if (!state.isDown) return;

      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;
      const distance = Math.hypot(dx, dy);

      if (!state.isDragging && distance > 5) {
        state.isDragging = true;
        setDraggedUnit(state.cell);
        setHoveredItem(null); // Tutup tooltip saat drag aktif
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";
      }

      if (state.isDragging) {
        setCursorPos({ x: e.clientX, y: e.clientY });

        // Auto-scroll halus saat kursor berada dekat tepi atas/bawah layar
        if (e.clientY > window.innerHeight - 90) {
          window.scrollBy({ top: 12, behavior: "auto" });
        } else if (e.clientY < 90) {
          window.scrollBy({ top: -12, behavior: "auto" });
        }

        // Hit testing koordinat kursor ke drop zone Target 1 dan Target 2
        const checkPointInEl = (id) => {
          const el = document.getElementById(id);
          if (!el) return false;
          const r = el.getBoundingClientRect();
          return (
            e.clientX >= r.left &&
            e.clientX <= r.right &&
            e.clientY >= r.top &&
            e.clientY <= r.bottom
          );
        };

        const inSlot1 =
          checkPointInEl("compare-drop-zone-1") ||
          checkPointInEl("quick-drop-slot-1");
        const inSlot2 =
          checkPointInEl("compare-drop-zone-2") ||
          checkPointInEl("quick-drop-slot-2");

        if (inSlot1) {
          setHoveredDropSlot(1);
        } else if (inSlot2) {
          setHoveredDropSlot(2);
        } else {
          setHoveredDropSlot(null);
        }
      }
    };

    const handlePointerUp = (e) => {
      const state = dragStateRef.current;
      if (!state.isDown) return;

      document.body.style.userSelect = "";
      document.body.style.cursor = "";

      if (state.isDragging) {
        justFinishedDragRef.current = true;
        setTimeout(() => {
          justFinishedDragRef.current = false;
        }, 150);

        const checkPointInEl = (id) => {
          const el = document.getElementById(id);
          if (!el) return false;
          const r = el.getBoundingClientRect();
          return (
            e.clientX >= r.left &&
            e.clientX <= r.right &&
            e.clientY >= r.top &&
            e.clientY <= r.bottom
          );
        };

        const inSlot1 =
          checkPointInEl("compare-drop-zone-1") ||
          checkPointInEl("quick-drop-slot-1");
        const inSlot2 =
          checkPointInEl("compare-drop-zone-2") ||
          checkPointInEl("quick-drop-slot-2");

        if (inSlot1) {
          setCompareTarget1(state.cell);
          scrollToCompare();
        } else if (inSlot2) {
          setCompareTarget2(state.cell);
          scrollToCompare();
        }
      }

      dragStateRef.current = {
        isDown: false,
        isDragging: false,
        cell: null,
        startX: 0,
        startY: 0,
      };
      setDraggedUnit(null);
      setHoveredDropSlot(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, []);

  return (
    <section className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300">
      {/* SECTION HEADER */}
      <div className="p-6 sm:p-7 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 via-white to-gray-50/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Pemetaan Instrumen Renstra &amp; Dokumen Tambahan
            </h2>
            <p className="text-sm text-gray-600 max-w-2xl leading-relaxed">
              Distribusi visual pemetaan indikator renstra dan template dokumen tambahan per Program Studi (berbagai jenjang) dan Fakultas/Unit. Unit tanpa pemetaan otomatis ditandai dengan <strong>warna merah</strong>.
            </p>
          </div>

          {/* CONTROLS */}
          <div className="flex flex-wrap items-center gap-3">
            {/* FILTER STATUS / TIPE */}
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-gray-300 shadow-2xs">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <label htmlFor="filter-status-select" className="sr-only">Filter Status Pemetaan</label>
              <select
                id="filter-status-select"
                aria-label="Filter Status atau Tipe Unit"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="text-xs font-medium text-gray-700 bg-transparent border-none outline-none cursor-pointer"
              >
                <option value="all">Semua Unit ({stats.totalUnit})</option>
                <option value="mapped">Terpetakan ({stats.mappedUnits})</option>
                <option value="unmapped">Belum Terpetakan 🔴 ({stats.unmappedUnits})</option>
                <option value="prodi">Hanya Program Studi</option>
                <option value="fakultas">Hanya Fakultas</option>
                <option value="unit">Hanya Unit Kerja</option>
                <option value="dupe">⚠️ Terdeteksi Dupe DB ({stats.dupeUnitsCount})</option>
              </select>
            </div>

            {/* VIEW MODE TOGGLE */}
            <div className="flex rounded-xl bg-gray-100 p-1 border border-gray-200">
              <button
                onClick={() => setViewMode("chart")}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  viewMode === "chart"
                    ? "bg-white text-indigo-700 shadow-2xs font-bold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                title="Tampilan Chart Voronoi"
              >
                <PieChart className="w-3.5 h-3.5" />
                {/* <span className="hidden sm:inline">Voronoi Chart</span> */}
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  viewMode === "table"
                    ? "bg-white text-indigo-700 shadow-2xs font-bold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                title="Tampilan Tabel Data"
              >
                <TableIcon className="w-3.5 h-3.5" />
                {/* <span className="hidden sm:inline">Tabel Rincian</span> */}
              </button>
            </div>

          </div>
        </div>

        {/* SUMMARY KPI CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6">
          <div className="bg-white rounded-2xl p-4 border border-gray-150 shadow-2xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total Stakeholder
              </p>
              <Layers className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-black text-gray-900 mt-1">
              {stats.totalUnit}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Prodi, Fakultas &amp; Unit Kerja
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-2xs bg-gradient-to-br from-emerald-50/20 to-transparent">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                Terpetakan
              </p>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-700 mt-1">
              {stats.mappedUnits}
              <span className="text-xs font-medium text-emerald-600 ml-1.5">
                ({stats.percentageMapped}%)
              </span>
            </p>
            <p className="text-[11px] text-emerald-600 mt-0.5">
              Memiliki instrumen mutu
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-rose-200/80 shadow-2xs bg-gradient-to-br from-rose-50/30 to-transparent">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
                Belum Terpetakan
              </p>
              <AlertCircle className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-2xl font-black text-rose-600 mt-1">
              {stats.unmappedUnits}
              <span className="text-xs font-bold text-rose-600 ml-1.5 px-1.5 py-0.5 rounded bg-rose-100">
                Warna Merah
              </span>
            </p>
            <p className="text-[11px] text-rose-600 mt-0.5">
              0 indikator / dokumen
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-indigo-200/80 shadow-2xs bg-gradient-to-br from-indigo-50/20 to-transparent">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                Total Pemetaan
              </p>
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-black text-indigo-700 mt-1">
              {stats.totalAllPemetaan}
            </p>
            <p className="text-[11px] text-indigo-600 mt-0.5">
              {stats.totalRenstra} Renstra • {stats.totalDokumen} Dokumen
            </p>
          </div>
        </div>

        {/* DETEKSI DUPE INDIKATOR BANNER (INSIDEN BAD CODE / BAD EXECUTE SQL) - HANYA UNTUK ADMIN */}
        {isAdmin && (
          dupeIncidents.length > 0 ? (
            <div className="mt-4 p-4 bg-amber-50/90 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 border border-amber-300 shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5 text-amber-700" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-xs font-bold text-amber-950">
                      Terdeteksi {stats.dupeUnitsCount > 0 ? `${stats.dupeUnitsCount} Unit Mengalami Duplikasi Penugasan` : `${dupeIncidents.length} Indikator/Dokumen Duplikat`} ({totalExtraRows} baris berlebih)
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200 text-amber-800">
                      Insiden Bad Code / SQL
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Terdapat baris template ganda untuk tahun {selectedTahun} akibat tumpang tindih penugasan kategori broadcast vs penugasan unit langsung pada tabel MySQL.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDupeModal(true)}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl transition shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                Inspeksi
              </button>
            </div>
          ) : (
            <div className="mt-4 px-4 py-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center justify-between text-xs text-emerald-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">Integritas Data Master Bersih:</span>
                <span className="text-emerald-700">Tidak ada duplikasi baris database pada template {selectedTahun}.</span>
              </div>
              <button
                onClick={() => setShowDupeModal(true)}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
              >
                Status Audit
              </button>
            </div>
          )
        )}
      </div>

      {/* BODY CONTENT */}
      <div className="p-6 sm:p-8" ref={containerRef}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div>
            <p className="text-sm font-semibold text-gray-600">
              Menghitung partisi Voronoi pemetaan tahun {selectedTahun}...
            </p>
          </div>
        ) : error ? (
          <div className="py-16 text-center bg-rose-50/50 rounded-2xl border border-rose-200 max-w-xl mx-auto p-6">
            <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-3" />
            <h4 className="text-base font-bold text-gray-900">{error}</h4>
            <p className="text-xs text-gray-600 mt-1">
              Pastikan endpoint backend aktif dan Anda memiliki hak akses.
            </p>
            <button
              onClick={() => fetchData(selectedTahun)}
              className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition"
            >
              Coba Lagi
            </button>
          </div>
        ) : viewMode === "table" ? (
          /* ================= TABEL RINCIAN ================= */
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama prodi, fakultas, atau jenjang..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-400 outline-none transition"
                />
              </div>
              <span className="text-xs text-gray-500 font-medium">
                Menampilkan <strong>{filteredData.length}</strong> stakeholder
              </span>
            </div>

            <div className="overflow-x-auto border rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Nama Stakeholder</th>
                    <th className="py-3 px-4">Fakultas / Induk</th>
                    <th className="py-3 px-4 text-center">Tipe &amp; Jenjang</th>
                    <th className="py-3 px-4 text-center">Renstra</th>
                    <th className="py-3 px-4 text-center">Dok. Tambahan</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Total</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap min-w-[120px]">Status</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredData.map((row) => {
                    const isAccessible = !accessibleUnitMatcher || accessibleUnitMatcher.checkUnit(row);
                    const isDisabled = !isAccessible;

                    return (
                      <tr
                        key={row.uuid || row.id}
                        draggable={!isDisabled && isAdmin}
                        onDragStart={
                          !isDisabled && isAdmin
                            ? (e) => {
                                e.dataTransfer.setData(
                                  "application/json",
                                  JSON.stringify({
                                    id: row.id,
                                    uuid: row.uuid,
                                    nama: row.nama,
                                  })
                                );
                                e.dataTransfer.effectAllowed = "copy";
                                setDraggedUnit(row);
                              }
                            : (e) => e.preventDefault()
                        }
                        onDragEnd={!isDisabled && isAdmin ? () => setDraggedUnit(null) : undefined}
                        className={`transition ${
                          isDisabled
                            ? "opacity-35 bg-gray-50/80 cursor-not-allowed select-none"
                            : isAdmin
                            ? "hover:bg-indigo-50/40 cursor-grab active:cursor-grabbing"
                            : "hover:bg-indigo-50/40 cursor-pointer"
                        } ${row.isUnmapped && !isDisabled ? "bg-rose-50/20" : ""}`}
                        onClick={isDisabled ? undefined : () => setSelectedDetailUnit(row)}
                        title={
                          isDisabled
                            ? "Akses dinonaktifkan: Bukan unit kerja Anda"
                            : isAdmin
                            ? "Klik untuk detail atau drag ke kotak Target 1 / Target 2 di bawah"
                            : "Klik untuk melihat detail pemetaan"
                        }
                      >
                        <td className="py-3 px-4 font-semibold text-gray-900">
                          <div className="flex items-center gap-2">
                            {isAdmin && (
                              <GripVertical className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            )}
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{
                                backgroundColor: row.isUnmapped
                                  ? UNMAPPED_CONFIG.color
                                  : row.groupConfig?.color,
                              }}
                            ></span>
                            <span>
                              {formatProdiWithJenjang(
                                row.nama,
                                row.jenjang,
                                row.type
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{row.fakultas}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 font-medium text-gray-700">
                            {row.type?.toUpperCase()} {row.jenjang ? `(${row.jenjang})` : ""}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-gray-800">
                          {row.renstraCount}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-gray-800">
                          {row.dokumenTambahanCount}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-gray-900">
                          <div>{row.totalPemetaan}</div>
                          {isAdmin && row.dupeIncidentCount > 0 && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              ⚠️ {row.dupeIncidentCount} dupe di DB
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {row.isUnmapped ? (
                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap bg-rose-100 text-rose-700 border border-rose-200 shadow-2xs">
                              Belum Ada
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-2xs">
                              Terpetakan
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              disabled={isDisabled}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isDisabled) setSelectedDetailUnit(row);
                              }}
                              className={`px-2 py-1 text-xs font-semibold rounded-lg transition ${
                                isDisabled
                                  ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                                  : "text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 cursor-pointer"
                              }`}
                            >
                              {isDisabled ? "Terkunci" : "Detail"}
                            </button>
                            {!isDisabled && isAdmin && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCompareTarget1(row);
                                    scrollToCompare();
                                  }}
                                  className="px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition cursor-pointer"
                                  title="Set Target 1 di Komparasi"
                                >
                                  + T1
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCompareTarget2(row);
                                    scrollToCompare();
                                  }}
                                  className="px-2 py-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition cursor-pointer"
                                  title="Set Target 2 di Komparasi"
                                >
                                  + T2
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ================= CHART VORONOI TREEMAP (VISUAL CAPITALIST) ================= */
          <div className="space-y-6">
            {/* SEARCH & QUICK LEGEND BAR */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari &amp; sorot nama unit/prodi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-400 outline-none transition"
                />
              </div>

              {/* INDIKATOR WARNA RINGKAS */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                <div className="flex items-center gap-1.5 font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                  <span className="w-3 h-3 rounded-full bg-rose-600"></span>
                  <span>Belum Terpetakan ({stats.unmappedUnits})</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
                  <span className="w-3 h-3 rounded-full bg-indigo-600"></span>
                  <span>Terpetakan ({stats.mappedUnits})</span>
                </div>
                {isAdmin && stats.dupeUnitsCount > 0 && (
                  <button
                    onClick={() => setFilterType(filterType === "dupe" ? "all" : "dupe")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition cursor-pointer ${
                      filterType === "dupe"
                        ? "bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-400"
                        : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
                    <span>⚠️ Terdeteksi Dupe ({stats.dupeUnitsCount})</span>
                  </button>
                )}
              </div>
            </div>

            {/* CHART CANVAS WRAPPER */}
            <div className="relative flex flex-col lg:flex-row items-center justify-center gap-8 py-4">
              {/* SVG VORONOI CIRCLE */}
              <div className="relative w-full max-w-[760px] aspect-square flex items-center justify-center">
                <svg
                  viewBox="0 0 840 840"
                  className="w-full h-full drop-shadow-md select-none overflow-visible"
                >
                  <defs>
                    {/* Shadow Filter */}
                    <filter
                      id="voronoi-cell-shadow"
                      x="-10%"
                      y="-10%"
                      width="120%"
                      height="120%"
                    >
                      <feDropShadow
                        dx="0"
                        dy="2"
                        stdDeviation="3"
                        floodOpacity="0.12"
                      />
                    </filter>

                    {/* Filter Glow untuk Badge Dupe */}
                    <filter
                      id="dupe-badge-glow"
                      x="-30%"
                      y="-30%"
                      width="160%"
                      height="160%"
                    >
                      <feDropShadow
                        dx="0"
                        dy="0"
                        stdDeviation="2.5"
                        floodColor="#F59E0B"
                        floodOpacity="0.85"
                      />
                    </filter>

                    {/* Shadow & Glow Khusus Unit Aktif Non-Admin (misal: BPSI) */}
                    <filter
                      id="active-unit-aura"
                      x="-40%"
                      y="-40%"
                      width="180%"
                      height="180%"
                    >
                      <feDropShadow
                        dx="0"
                        dy="0"
                        stdDeviation="5"
                        floodColor="#4F46E5"
                        floodOpacity="0.85"
                      />
                    </filter>

                    {/* Gradient background untuk outer circle */}
                    <radialGradient
                      id="outer-circle-glow"
                      cx="50%"
                      cy="50%"
                      r="50%"
                    >
                      <stop offset="0%" stopColor="#1E293B" stopOpacity="0.03" />
                      <stop offset="90%" stopColor="#0F172A" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="#0F172A" stopOpacity="0.16" />
                    </radialGradient>

                    {/* Path melingkar untuk teks di pojok kiri atas seperti Visual Capitalist */}
                    <path
                      id="arc-text-path"
                      d={`M ${chartCenter - chartRadius - 16},${chartCenter} A ${
                        chartRadius + 16
                      } ${chartRadius + 16} 0 0 1 ${chartCenter},${
                        chartCenter - chartRadius - 16
                      }`}
                      fill="none"
                    />
                  </defs>

                  {/* Outer Circular Boundary Rim - Rapat Tanpa Celah */}
                  <circle
                    cx={chartCenter}
                    cy={chartCenter}
                    r={chartRadius}
                    fill="url(#outer-circle-glow)"
                    stroke="#94A3B8"
                    strokeWidth="2"
                  />

                  {/* TEKS MELINGKAR (TOTAL PEMETAAN INSTRUMEN MUTU) */}
                  <text className="text-[11px] font-black fill-gray-500 uppercase tracking-widest">
                    <textPath href="#arc-text-path" startOffset="6%">
                      Total Pemetaan Instrumen Mutu ({selectedTahun})
                    </textPath>
                  </text>

                  {/* VORONOI CELLS (100% GAPLESS TESSELLATION) */}
                  <g>
                    {voronoiCells.map((cell) => {
                      const isAccessible = !accessibleUnitMatcher || accessibleUnitMatcher.checkUnit(cell);
                      const isDisabled = !isAccessible;
                      const isHovered = hoveredItem?.uuid === cell.uuid;
                      const isMatchedSearch =
                        searchQuery &&
                        cell.nama.toLowerCase().includes(searchQuery.toLowerCase());
                      const isHighlightedGroup =
                        activeGroupHighlight &&
                        cell.groupKey === activeGroupHighlight;

                      // Area threshold untuk adaptasi teks
                      const isLarge = cell.area > 6200;
                      const isMedium = cell.area > 2600 && !isLarge;
                      const isSmall = cell.area <= 2600;

                      // Format teks nama unit menjadi 1 atau 2 baris (panjang dibatasi ketat agar pas di sel)
                      const lines = formatCellLines(
                        cell.nama,
                        isLarge ? 14 : isMedium ? 11 : 8
                      );

                      return (
                        <g
                          key={cell.uuid || cell.id}
                          draggable={!isDisabled && isAdmin}
                          onPointerDown={
                            !isDisabled && isAdmin
                              ? (e) => handleCellPointerDown(e, cell)
                              : undefined
                          }
                          onDragStart={
                            !isDisabled && isAdmin
                              ? (e) => {
                                  e.dataTransfer.setData(
                                    "application/json",
                                    JSON.stringify({
                                      id: cell.id,
                                      uuid: cell.uuid,
                                      nama: cell.nama,
                                    })
                                  );
                                  e.dataTransfer.effectAllowed = "copy";
                                  setDraggedUnit(cell);
                                }
                              : (e) => e.preventDefault()
                          }
                          onDragEnd={!isDisabled && isAdmin ? () => setDraggedUnit(null) : undefined}
                          onMouseMove={isDisabled ? undefined : (e) => handleMouseMove(e, cell)}
                          onMouseLeave={isDisabled ? undefined : handleMouseLeave}
                          onClick={isDisabled ? undefined : () => handleCellClick(cell)}
                          className={
                            isDisabled
                              ? "cursor-not-allowed select-none transition-all duration-150"
                              : isAdmin
                              ? "transition-all duration-150 cursor-grab active:cursor-grabbing hover:scale-[1.01]"
                              : "transition-all duration-150 cursor-pointer hover:scale-[1.01]"
                          }
                          aria-disabled={isDisabled}
                        >
                          {/* Poligon Sel - Rapat Menempel Sempurna ke Tetangga */}
                          <path
                            d={cell.pathD}
                            fill={isDisabled ? "#94A3B8" : cell.cellColor}
                            stroke={
                              isDisabled
                                ? "#CBD5E1"
                                : isHovered
                                ? "#3B82F6"
                                : isAdmin && cell.dupeIncidentCount > 0
                                ? "#F59E0B"
                                : "#FFFFFF"
                            }
                            strokeWidth={
                              isDisabled
                                ? 0.75
                                : isHovered
                                ? 3.8
                                : isAdmin && cell.dupeIncidentCount > 0
                                ? 2.5
                                : 1.75
                            }
                            strokeLinejoin="round"
                            opacity={
                              isDisabled
                                ? 0.16
                                : isAdmin && filterType === "dupe" && cell.dupeIncidentCount === 0
                                ? 0.15
                                : activeGroupHighlight && !isHighlightedGroup
                                ? 0.35
                                : searchQuery && !isMatchedSearch
                                ? 0.35
                                : isHovered
                                ? 1.0
                                : 0.98
                            }
                            style={{
                              transition: "all 0.15s ease-out",
                            }}
                          />

                          {/* LABEL & BADGE DI TENGAH SEL */}
                          {cell.centroid && (
                            <g
                              transform={`translate(${cell.centroid.x}, ${cell.centroid.y})`}
                              pointerEvents="none"
                              opacity={isDisabled ? 0.25 : 1}
                              className={isDisabled ? "select-none" : ""}
                            >
                              {cell.isUnmapped ? (
                                /* UNMAPPED CELL (MERAH): HANYA NAMA + ANGKA NUMERIK 0 (MENCEGAH OVERLAY) */
                                <>
                                  {lines.length > 1 ? (
                                    <>
                                      <text
                                        y="-6"
                                        textAnchor="middle"
                                        className={
                                          isLarge
                                            ? "text-[10px] font-bold fill-white tracking-tight"
                                            : isMedium
                                            ? "text-[9px] font-bold fill-white tracking-tight"
                                            : "text-[7.5px] font-bold fill-white tracking-tight"
                                        }
                                        style={{
                                          textShadow: "0 1px 2px rgba(0,0,0,0.85)",
                                        }}
                                      >
                                        {lines[0]}
                                      </text>
                                      <text
                                        y="5"
                                        textAnchor="middle"
                                        className={
                                          isLarge
                                            ? "text-[9.5px] font-bold fill-white tracking-tight"
                                            : isMedium
                                            ? "text-[8.5px] font-bold fill-white tracking-tight"
                                            : "text-[7px] font-bold fill-white tracking-tight"
                                        }
                                        style={{
                                          textShadow: "0 1px 2px rgba(0,0,0,0.85)",
                                        }}
                                      >
                                        {lines[1]}
                                      </text>
                                    </>
                                  ) : (
                                    <text
                                      y="-4"
                                      textAnchor="middle"
                                      className={
                                        isLarge
                                          ? "text-[10.5px] font-bold fill-white tracking-tight"
                                          : isMedium
                                          ? "text-[9.5px] font-bold fill-white tracking-tight"
                                          : "text-[8px] font-bold fill-white tracking-tight"
                                      }
                                      style={{
                                        textShadow: "0 1px 2px rgba(0,0,0,0.85)",
                                      }}
                                    >
                                      {lines[0]}
                                    </text>
                                  )}

                                  {/* ANGKA NUMERIK 0 */}
                                  <text
                                    y={lines.length > 1 ? "18" : "10"}
                                    textAnchor="middle"
                                    className={
                                      isLarge
                                        ? "text-[12px] font-black fill-white"
                                        : isMedium
                                        ? "text-[11px] font-black fill-white"
                                        : "text-[9.5px] font-black fill-white"
                                    }
                                    style={{
                                      textShadow: "0 1px 3px rgba(0,0,0,0.9)",
                                    }}
                                  >
                                    0
                                  </text>
                                </>
                              ) : isLarge ? (
                                /* 1. SEL BESAR TERPETAKAN */
                                <>
                                  {/* Baris 1 Nama Unit */}
                                  <text
                                    y={lines.length > 1 ? "-7" : "-2"}
                                    textAnchor="middle"
                                    className="text-[11px] font-extrabold fill-white tracking-tight"
                                    style={{
                                      textShadow: "0 1px 2px rgba(0,0,0,0.85)",
                                    }}
                                  >
                                    {lines[0]}
                                  </text>

                                  {/* Baris 2 Nama Unit (jika ada) */}
                                  {lines.length > 1 && (
                                    <text
                                      y="4"
                                      textAnchor="middle"
                                      className="text-[10px] font-extrabold fill-white tracking-tight"
                                      style={{
                                        textShadow: "0 1px 2px rgba(0,0,0,0.85)",
                                      }}
                                    >
                                      {lines[1]}
                                    </text>
                                  )}

                                  {/* Metric NUMERIK TOTAL PEMETAAN */}
                                  <text
                                    y={lines.length > 1 ? "18" : "13"}
                                    textAnchor="middle"
                                    className="text-[13px] font-black fill-white"
                                    style={{
                                      textShadow: "0 1px 3px rgba(0,0,0,0.9)",
                                    }}
                                  >
                                    {cell.totalPemetaan}
                                  </text>
                                </>
                              ) : isMedium ? (
                                /* 2. SEL SEDANG TERPETAKAN */
                                <>
                                  {/* Baris 1 Nama */}
                                  <text
                                    y={lines.length > 1 ? "-7" : "-3"}
                                    textAnchor="middle"
                                    className="text-[9.5px] font-bold fill-white tracking-tight"
                                    style={{
                                      textShadow: "0 1px 2px rgba(0,0,0,0.85)",
                                    }}
                                  >
                                    {lines[0]}
                                  </text>

                                  {/* Baris 2 Nama (jika ada) */}
                                  {lines.length > 1 && (
                                    <text
                                      y="3"
                                      textAnchor="middle"
                                      className="text-[9px] font-bold fill-white tracking-tight"
                                      style={{
                                        textShadow: "0 1px 2px rgba(0,0,0,0.85)",
                                      }}
                                    >
                                      {lines[1]}
                                    </text>
                                  )}

                                  {/* Metric NUMERIK TOTAL PEMETAAN */}
                                  <text
                                    y={lines.length > 1 ? "16" : "10"}
                                    textAnchor="middle"
                                    className="text-[11.5px] font-black fill-white"
                                    style={{
                                      textShadow: "0 1px 2px rgba(0,0,0,0.9)",
                                    }}
                                  >
                                    {cell.totalPemetaan}
                                  </text>
                                </>
                              ) : (
                                /* 3. SEL KECIL TERPETAKAN */
                                <>
                                  <text
                                    y="-3"
                                    textAnchor="middle"
                                    className="text-[8px] font-bold fill-white"
                                    style={{
                                      textShadow: "0 1px 2px rgba(0,0,0,0.85)",
                                    }}
                                  >
                                    {cell.type === "prodi" && cell.jenjang && !lines[0].toLowerCase().includes(cell.jenjang.toLowerCase())
                                      ? `${lines[0]} ${cell.jenjang.toUpperCase()}`
                                      : lines[0]}
                                  </text>
                                  <text
                                    y="9"
                                    textAnchor="middle"
                                    className="text-[9.5px] font-black fill-white"
                                    style={{
                                      textShadow: "0 1px 2px rgba(0,0,0,0.9)",
                                    }}
                                  >
                                    {cell.totalPemetaan}
                                  </text>
                                </>
                              )}
                            </g>
                          )}
                        </g>
                      );
                    })}
                  </g>
                </svg>

                {/* FLOATING INTERACTIVE TOOLTIP */}
                {hoveredItem && (
                  <div
                    className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-full mb-3 bg-gray-900/95 text-white p-3.5 rounded-2xl shadow-2xl border border-gray-700/60 backdrop-blur-md w-64 animate-in fade-in zoom-in-95 duration-100"
                    style={{
                      left: tooltipPos.x,
                      top: tooltipPos.y,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-gray-800 pb-2 mb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{
                              backgroundColor: hoveredItem.isUnmapped
                                ? UNMAPPED_CONFIG.color
                                : hoveredItem.cellColor,
                            }}
                          ></span>
                          <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                            {hoveredItem.fakultas}
                          </span>
                        </div>
                        <h4 className="text-sm font-extrabold text-white mt-0.5 leading-snug">
                          {formatProdiWithJenjang(
                            hoveredItem.nama,
                            hoveredItem.jenjang,
                            hoveredItem.type
                          )}
                        </h4>
                      </div>
                      {hoveredItem.jenjang && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-gray-200 border border-gray-700 shrink-0">
                          {hoveredItem.jenjang}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Status Pemetaan:</span>
                        {hoveredItem.isUnmapped ? (
                          <span className="font-bold text-rose-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Belum Ada (0)
                          </span>
                        ) : (
                          <span className="font-bold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Terpetakan
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Indikator Renstra:</span>
                        <strong className="text-white">
                          {hoveredItem.renstraCount} template
                        </strong>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Dokumen Tambahan:</span>
                        <strong className="text-white">
                          {hoveredItem.dokumenTambahanCount} template
                        </strong>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-gray-800 font-bold">
                        <span className="text-gray-300">Total Pemetaan:</span>
                        <span className="text-indigo-300 text-sm">
                          {hoveredItem.totalPemetaan} template
                        </span>
                      </div>

                      {isAdmin && hoveredItem.dupeIncidentCount > 0 && (
                        <div className="space-y-1.5 mt-1.5 pt-1 border-t border-gray-800 pointer-events-auto">
                          <div className="flex items-center justify-between text-amber-300 font-bold text-[11px] bg-amber-950/80 px-2.5 py-1.5 rounded-xl border border-amber-500/60 shadow-sm animate-pulse">
                            <span className="flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                              <span>Duplikasi di DB</span>
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-amber-500 text-amber-950 font-black text-[10px]">
                              {hoveredItem.dupeIncidentCount} Insiden
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>

              {/* SIDEBAR LEGEND (PERSIS SEPERTI POJOK KANAN ATAS GAMBAR) */}
              <div className="w-full lg:w-72 bg-gray-50/70 p-5 rounded-2xl border border-gray-200/80 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                  <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest">
                    Indikator Warna Kategori
                  </h4>
                  {activeGroupHighlight && (
                    <button
                      onClick={() => setActiveGroupHighlight(null)}
                      className="text-[11px] font-semibold text-indigo-600 hover:underline"
                    >
                      Reset Sorot
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {/* UNMAPPED INDICATOR (MERAH - ATAS) */}
                  <div
                    onClick={() => setFilterType(filterType === "unmapped" ? "all" : "unmapped")}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                      filterType === "unmapped"
                        ? "bg-rose-100 border-rose-300 ring-2 ring-rose-400"
                        : "bg-white border-rose-200 hover:bg-rose-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-4 h-4 rounded-full bg-rose-600 shrink-0 shadow-2xs"></span>
                      <div>
                        <p className="text-xs font-bold text-rose-700">
                          Belum Ada Pemetaan
                        </p>
                        <p className="text-[10px] text-rose-600">
                          0 template (diwarnai merah)
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 text-xs font-extrabold rounded-md bg-rose-200 text-rose-800">
                      {stats.unmappedUnits}
                    </span>
                  </div>

                  {/* DUPE INDICATOR (AMBER) */}
                  {stats.dupeUnitsCount > 0 && (
                    <div
                      onClick={() => setFilterType(filterType === "dupe" ? "all" : "dupe")}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                        filterType === "dupe"
                          ? "bg-amber-100 border-amber-300 ring-2 ring-amber-400"
                          : "bg-white border-amber-200 hover:bg-amber-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-4 h-4 rounded-full bg-amber-500 shrink-0 shadow-2xs flex items-center justify-center text-[9px] text-white font-black animate-pulse">
                          !
                        </span>
                        <div>
                          <p className="text-xs font-bold text-amber-900">
                            Terdeteksi Dupe di DB
                          </p>
                          <p className="text-[10px] text-amber-700">
                            Insiden SQL / Bad Generate
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 text-xs font-extrabold rounded-md bg-amber-200 text-amber-900">
                        {stats.dupeUnitsCount}
                      </span>
                    </div>
                  )}

                  {/* KATEGORI FAKULTAS & UNIT */}
                  {Object.values(GROUP_CONFIGS).map((g) => {
                    const countInGroup = processedData.filter(
                      (d) => d.groupKey === g.key
                    ).length;
                    const unmappedInGroup = processedData.filter(
                      (d) => d.groupKey === g.key && d.isUnmapped
                    ).length;
                    const isSelected = activeGroupHighlight === g.key;

                    if (countInGroup === 0) return null;

                    return (
                      <div
                        key={g.key}
                        onClick={() =>
                          setActiveGroupHighlight(isSelected ? null : g.key)
                        }
                        className={`flex items-center justify-between p-2 rounded-xl border transition cursor-pointer ${
                          isSelected
                            ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-400 shadow-2xs"
                            : "bg-white border-gray-150 hover:bg-gray-100/70"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: g.color }}
                          ></span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">
                              {g.name}
                            </p>
                            {unmappedInGroup > 0 && (
                              <p className="text-[10px] text-rose-600 font-medium">
                                {unmappedInGroup} belum terpetakan
                              </p>
                            )}
                          </div>
                        </div>

                        <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-gray-100 text-gray-700 shrink-0">
                          {countInGroup}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SEKSI KOMPARASI INTERAKTIF (3 KOLOM SESUAI SKETSA GAMBAR USER) - HANYA UNTUK ADMIN */}
      {isAdmin && (
        <div className="border-t border-gray-100 bg-gray-50/30">
          <PemetaanCompareSection
            allUnits={processedData}
            selectedTahun={selectedTahun}
            target1={compareTarget1}
            setTarget1={setCompareTarget1}
            target2={compareTarget2}
            setTarget2={setCompareTarget2}
            draggedUnit={draggedUnit}
            setDraggedUnit={setDraggedUnit}
            isHoveringDrop1={hoveredDropSlot === 1}
            isHoveringDrop2={hoveredDropSlot === 2}
          />
        </div>
      )}

      {/* DETAIL MODAL PEMETAAN */}
      <PemetaanDetailModal
        open={Boolean(selectedDetailUnit)}
        onClose={() => setSelectedDetailUnit(null)}
        data={selectedDetailUnit}
        tahun={selectedTahun}
        fakultasUnits={fakultasUnits}
        isAdmin={isAdmin}
        onSetTarget1={
          isAdmin
            ? (unit) => {
                setCompareTarget1(unit);
                setSelectedDetailUnit(null);
                scrollToCompare();
              }
            : undefined
        }
        onSetTarget2={
          isAdmin
            ? (unit) => {
                setCompareTarget2(unit);
                setSelectedDetailUnit(null);
                scrollToCompare();
              }
            : undefined
        }
      />

      {/* MODAL DETEKSI DUPLIKASI DATABASE (INSIDEN BAD CODE / BAD EXECUTE SQL) - HANYA UNTUK ADMIN */}
      {isAdmin && (
        <DupeIncidentModal
          open={showDupeModal}
          onClose={() => setShowDupeModal(false)}
          incidents={dupeIncidents}
          tahun={selectedTahun}
          isAdmin={isAdmin}
        />
      )}

      {/* FLOATING DRAG GHOST BADGE (MENGIKUTI POSISI KURSOR SAAT DRAG DARI CHART) */}
      {isAdmin && draggedUnit && (
        <div
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: cursorPos.x,
            top: cursorPos.y,
          }}
        >
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gray-950/95 text-white shadow-2xl border-2 border-indigo-400 backdrop-blur-md rotate-2 scale-105">
            <div
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
              style={{
                backgroundColor: draggedUnit.isUnmapped
                  ? UNMAPPED_CONFIG.color
                  : draggedUnit.groupConfig?.color || "#6366F1",
              }}
            />
            <div className="flex flex-col">
              <span className="text-xs font-black tracking-tight leading-none text-white max-w-[200px] truncate">
                {draggedUnit.nama}
              </span>
              <span className="text-[10px] text-indigo-300 font-bold mt-1">
                {hoveredDropSlot === 1
                  ? "✨ Lepaskan untuk TARGET 1"
                  : hoveredDropSlot === 2
                  ? "✨ Lepaskan untuk TARGET 2"
                  : "🎯 Lepas di Target 1 atau Target 2"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* DOCK QUICK DROP TARGET MELAYANG DI BAWAH (MEMUDAHKAN DRAG TANPA PERLU SCROLL JAUH) */}
      {isAdmin && draggedUnit && (
        <div className="fixed bottom-6 inset-x-0 mx-auto max-w-xl z-50 pointer-events-auto flex items-center justify-center gap-4 px-4 py-3 bg-gray-950/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-gray-700/80 animate-in slide-in-from-bottom-6 duration-200">
          {/* SLOT 1 */}
          <div
            id="quick-drop-slot-1"
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border-2 transition-all duration-150 cursor-pointer ${
              hoveredDropSlot === 1
                ? "bg-emerald-500/30 border-emerald-400 scale-105 ring-4 ring-emerald-400/40 text-emerald-300 shadow-lg"
                : "bg-gray-800/80 border-dashed border-emerald-500/50 text-emerald-400 hover:bg-emerald-950/30"
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider">
              {hoveredDropSlot === 1
                ? "Lepaskan: TARGET 1"
                : "🎯 Drop ke Target 1"}
            </span>
          </div>

          {/* SLOT 2 */}
          <div
            id="quick-drop-slot-2"
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border-2 transition-all duration-150 cursor-pointer ${
              hoveredDropSlot === 2
                ? "bg-blue-500/30 border-blue-400 scale-105 ring-4 ring-blue-400/40 text-blue-300 shadow-lg"
                : "bg-gray-800/80 border-dashed border-blue-500/50 text-blue-400 hover:bg-blue-950/30"
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider">
              {hoveredDropSlot === 2
                ? "Lepaskan: TARGET 2"
                : "🎯 Drop ke Target 2"}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
