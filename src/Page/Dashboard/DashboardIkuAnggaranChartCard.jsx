import React, {
  useState,
  useMemo,
  useRef,
  useLayoutEffect,
  useCallback,
  useEffect,
  Fragment,
} from "react";
import { formatRupiah } from "@/Page/ProkerV3/prokerConstants";
import { fetchFakultasUnits } from "@/Common/Utils";
import { apiClient } from "@/Common/api";
import { useContent } from "@/Providers/ContentProvider";
import {
  SANKEY_DATA,
  calculateSankeySummary,
  getCorrelationMatrix,
  getRootCauseAnalysis,
  getAllFakultasProdiUnitOptions,
  MOCK_ALIASES,
} from "./sankeyMockData";
import { Dialog, Transition } from "@headlessui/react";
import {
  Workflow,
  GitBranch,
  Building2,
  Coins,
  CheckCircle2,
  Clock,
  Search,
  RotateCcw,
  X,
  Target,
  FileText,
  Activity,
  Layers,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ShieldAlert,
  Sparkles,
  Filter,
  BarChart3,
  HelpCircle,
  GraduationCap,
  Briefcase,
  AlertCircle,
  Eye,
  Check,
  Calendar,
} from "lucide-react";

// ==========================================
// REUSABLE SEARCHABLE DROPDOWN COMPONENT
// ==========================================
function SearchableDropdown({
  options = [],
  value,
  onChange,
  placeholder = "Pilih item...",
  searchPlaceholder = "Ketik untuk mencari...",
  className = "",
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption =
    options.find(
      (o) =>
        o.id === value ||
        o.uuid === value ||
        o.legacyId === value ||
        (MOCK_ALIASES &&
          (MOCK_ALIASES[o.id] === value || MOCK_ALIASES[o.uuid] === value)),
    ) || options[0];

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter(
      (o) =>
        (o.label && o.label.toLowerCase().includes(term)) ||
        (o.subtext && o.subtext.toLowerCase().includes(term)) ||
        (o.badge && o.badge.toLowerCase().includes(term)),
    );
  }, [options, searchTerm]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 rounded-lg shadow-xs hover:border-indigo-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-left transition-colors"
      >
        <div className="flex items-center gap-1.5 truncate">
          {selectedOption?.badge && (
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                selectedOption.badgeClass
                  ? selectedOption.badgeClass
                  : selectedOption.badge === "FAKULTAS"
                  ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                  : selectedOption.badge === "PRODI"
                  ? "bg-purple-100 text-purple-800 border border-purple-200"
                  : selectedOption.badge === "IKU"
                  ? "bg-sky-100 text-sky-800 border border-sky-200"
                  : selectedOption.badge === "PENDING" || selectedOption.badge === "BELUM"
                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                  : selectedOption.badge === "DONE" || selectedOption.badge === "SELESAI" || selectedOption.badge === "TERLAKSANA"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : selectedOption.badge === "DRAFT" || selectedOption.badge === "DRAF"
                  ? "bg-gray-100 text-gray-700 border border-gray-300"
                  : selectedOption.badge === "SEMUA"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : selectedOption.badge.startsWith("KUADRAN")
                  ? "bg-indigo-100 text-indigo-800 border border-indigo-300"
                  : "bg-emerald-100 text-emerald-800 border border-emerald-200"
              }`}
            >
              {selectedOption.badge}
            </span>
          )}
          <span className="truncate text-gray-900">
            {selectedOption?.label || placeholder}
          </span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 right-0 w-full min-w-[280px] max-w-md bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden py-1">
          {/* Search Box */}
          <div className="p-2 border-b border-gray-150 bg-gray-50/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                autoFocus
                className="w-full pl-8 pr-2.5 py-1 text-xs border border-gray-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-white"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-gray-50">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected =
                  opt.id === value ||
                  opt.uuid === value ||
                  opt.legacyId === value ||
                  (MOCK_ALIASES &&
                    (MOCK_ALIASES[opt.id] === value ||
                      MOCK_ALIASES[opt.uuid] === value));
                return (
                  <div
                    key={opt.id}
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between gap-2 hover:bg-indigo-50/80 transition-colors ${
                      isSelected
                        ? "bg-indigo-50 font-bold text-indigo-900"
                        : "text-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {opt.badge && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                            opt.badgeClass
                              ? opt.badgeClass
                              : opt.badge === "FAKULTAS"
                              ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                              : opt.badge === "PRODI"
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : opt.badge === "IKU"
                              ? "bg-sky-100 text-sky-800 border border-sky-200"
                              : opt.badge === "PENDING" || opt.badge === "BELUM"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : opt.badge === "DONE" || opt.badge === "SELESAI" || opt.badge === "TERLAKSANA"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : opt.badge === "DRAFT" || opt.badge === "DRAF"
                              ? "bg-gray-100 text-gray-700 border border-gray-300"
                              : opt.badge === "SEMUA"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : opt.badge.startsWith("KUADRAN")
                              ? "bg-indigo-100 text-indigo-800 border border-indigo-300"
                              : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {opt.badge}
                        </span>
                      )}
                      <span className="truncate">{opt.label}</span>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    )}
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-4 text-center text-xs text-gray-400 italic">
                Tidak ada hasil yang cocok
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardIkuAnggaranChartCard() {
  // Navigation Tabs: 'matrix' | 'rootcause' | 'boundary' | 'sankey'
  const [activeTab, setActiveTab] = useState("matrix");

  // Tab 1: Matriks Korelasi states
  const [matrixLevel, setMatrixLevel] = useState("iku"); // 'iku' | 'boundary' | 'prodi'
  const [selectedQuadrantFilter, setSelectedQuadrantFilter] = useState("all");
  const [selectedMatrixItem, setSelectedMatrixItem] = useState(null);

  // Tab 2: Root Cause Tracing states
  const [rootCauseFocusType, setRootCauseFocusType] = useState("iku"); // 'iku' | 'boundary' | 'prodi'
  const [rootCauseTargetId, setRootCauseTargetId] = useState("root-iku-5");
  const [rootCauseStatusFilter, setRootCauseStatusFilter] = useState("all"); // 'all' | 'Belum Terlaksana' | 'Terlaksana' | 'Draf'

  // Tab 3: Penataan Boundary Tree states
  const [expandedBoundaries, setExpandedBoundaries] = useState({
    "fak-mipa": true,
    "fak-vokasi": true,
    "unit-bpsi": true,
  });
  const [boundarySearchQuery, setBoundarySearchQuery] = useState("");
  const [boundaryStatusFilter, setBoundaryStatusFilter] = useState("all");

  // Tab 4: Diagram Alir Sankey states
  const [selectedIkuFilter, setSelectedIkuFilter] = useState("all");
  const [selectedFakultasProdiFilter, setSelectedFakultasProdiFilter] = useState("all");
  const [selectedKegiatanStatusFilter, setSelectedKegiatanStatusFilter] = useState("all");
  const [activePathId, setActivePathId] = useState(null);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  // Data riil v_fakultas_unit dari API /fakultasunits?mode=all
  const [realFakultasUnits, setRealFakultasUnits] = useState([]);

  // Filter Tahun Master dari master_tahun
  const { positionYear, activeYear } = useContent();
  const [selectedYear, setSelectedYear] = useState(() => {
    return String(positionYear || activeYear || "2026");
  });
  const [masterYears, setMasterYears] = useState(["2027", "2026", "2025", "2024", "2023"]);

  useEffect(() => {
    async function loadMasterYears() {
      try {
        const res = await apiClient.get("/mastertahuns?mode=all");
        const list = Array.isArray(res?.data) ? res?.data : [];
        const mapped = list
          .map((y) => String(y.Tahun || y.tahun || "").trim())
          .filter(Boolean);
        if (mapped.length > 0) {
          const unique = Array.from(new Set(mapped)).sort(
            (a, b) => Number(b) - Number(a)
          );
          setMasterYears(unique);
          if (!selectedYear || !unique.includes(selectedYear)) {
            setSelectedYear(
              positionYear && unique.includes(String(positionYear))
                ? String(positionYear)
                : unique[0]
            );
          }
        }
      } catch (e) {
        console.warn("Gagal memuat master_tahun:", e);
      }
    }
    loadMasterYears();
  }, [positionYear]);

  useEffect(() => {
    if (positionYear && masterYears.includes(String(positionYear))) {
      setSelectedYear(String(positionYear));
    }
  }, [positionYear, masterYears]);

  useEffect(() => {
    let active = true;
    fetchFakultasUnits()
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          setRealFakultasUnits(data);
        }
      })
      .catch((err) => {
        console.warn("Gagal load v_fakultas_unit dari API:", err);
      });
    return () => {
      active = false;
    };
  }, []);

  // Global Kegiatan Detail Modal
  const [selectedKegiatanDetail, setSelectedKegiatanDetail] = useState(null);

  // Sankey Bezier SVG Refs
  const containerRef = useRef(null);
  const nodeRefs = useRef({});
  const [ribbonPaths, setRibbonPaths] = useState([]);

  // Ringkasan Eksekutif
  const summary = useMemo(() => calculateSankeySummary(selectedYear), [selectedYear]);

  // Options untuk Tab 1: Filter Kuadran (Gambar 1)
  const quadrantFilterOptions = useMemo(
    () => [
      {
        id: "all",
        label: "Semua Kuadran (Tampilkan Seluruh)",
        badge: "SEMUA",
      },
      {
        id: "1",
        label: "Kuadran I: Optimal & Produktif",
        badge: "KUADRAN I",
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
      },
      {
        id: "2",
        label: "Kuadran II: Red Flag (Peringatan Audit)",
        badge: "KUADRAN II",
        badgeClass: "bg-red-100 text-red-800 border-red-300",
      },
      {
        id: "3",
        label: "Kuadran III: Mandek / Under-absorbed",
        badge: "KUADRAN III",
        badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
      },
      {
        id: "4",
        label: "Kuadran IV: Efisien / Hemat Anggaran",
        badge: "KUADRAN IV",
        badgeClass: "bg-sky-100 text-sky-800 border-sky-300",
      },
    ],
    [],
  );

  // Options untuk Tab 3: Filter Status Boundary (Gambar 2)
  const boundaryStatusFilterOptions = useMemo(
    () => [
      {
        id: "all",
        label: "Semua Status",
        badge: "SEMUA",
      },
      {
        id: "Terlaksana",
        label: "Hanya Terlaksana",
        badge: "SELESAI",
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
      },
      {
        id: "Belum Terlaksana",
        label: "Hanya Belum Terlaksana",
        badge: "BELUM",
        badgeClass: "bg-red-100 text-red-800 border-red-300",
      },
      {
        id: "Draf",
        label: "Hanya Draf",
        badge: "DRAF",
        badgeClass: "bg-gray-100 text-gray-800 border-gray-300",
      },
    ],
    [],
  );

  // Data Matriks Korelasi
  const correlationItems = useMemo(
    () => getCorrelationMatrix(matrixLevel),
    [matrixLevel],
  );

  // Filtered Matriks Korelasi
  const filteredMatrixItems = useMemo(() => {
    if (selectedQuadrantFilter === "all") return correlationItems;
    return correlationItems.filter((i) => i.kuadran === Number(selectedQuadrantFilter));
  }, [correlationItems, selectedQuadrantFilter]);

  // Data Root Cause Analysis
  const rootCauseData = useMemo(
    () =>
      getRootCauseAnalysis(
        rootCauseTargetId,
        rootCauseFocusType,
        rootCauseStatusFilter,
        realFakultasUnits,
      ),
    [rootCauseTargetId, rootCauseFocusType, rootCauseStatusFilter, realFakultasUnits],
  );

  // Options untuk Tab 2: Pilih Entitas (Gambar 3 - dengan opsi "Semua Prodi")
  const rootCauseEntityOptions = useMemo(() => {
    if (rootCauseFocusType === "iku") {
      return [
        {
          id: "all",
          label: "Semua Target IKU",
          badge: "SEMUA",
        },
        ...SANKEY_DATA.rootIkus.map((r) => ({
          id: r.id,
          label: `${r.kode} - ${r.nama}`,
          badge: "IKU",
        })),
      ];
    }
    if (rootCauseFocusType === "boundary") {
      return [
        {
          id: "all",
          label: "Semua Fakultas & Unit",
          badge: "SEMUA",
        },
        ...SANKEY_DATA.boundaries.map((b) => ({
          id: b.id,
          label: b.nama,
          badge: b.type === "fakultas" ? "FAKULTAS" : "UNIT",
        })),
      ];
    }
    // 'prodi'
    const prodiSources =
      realFakultasUnits.length > 0
        ? realFakultasUnits.filter((u) => u.type === "prodi")
        : getAllFakultasProdiUnitOptions().filter((o) => o.type === "prodi");

    return [
      {
        id: "all",
        label: "Semua Prodi",
        badge: "SEMUA",
      },
      ...prodiSources.map((p) => {
        const jenjangUpper = p.jenjang ? String(p.jenjang).toUpperCase() : "";
        const cleanName = p.nama_fak_prod_unit || p.pureName || p.label || p.nama || "";
        const hasJenjang =
          jenjangUpper && cleanName.toUpperCase().includes(`(${jenjangUpper})`);
        const label =
          jenjangUpper && !hasJenjang ? `${cleanName} (${jenjangUpper})` : cleanName;
        return {
          id: p.id || p.uuid,
          uuid: p.uuid,
          legacyId:
            p.legacyId ||
            (MOCK_ALIASES && (MOCK_ALIASES[p.uuid] || MOCK_ALIASES[String(p.id)])),
          rawId: p.rawId || p.id,
          label: label,
          badge: "PRODI",
          type: "prodi",
          prodiId: p.prodiId || p.id,
        };
      }),
    ];
  }, [rootCauseFocusType, realFakultasUnits]);

  // Options untuk Tab 2: Filter Status
  const rootCauseStatusOptions = useMemo(
    () => [
      { id: "all", label: "Semua Status (Belum / Terlaksana / Draf)" },
      {
        id: "Belum Terlaksana",
        label: "Belum Terlaksana",
        badge: "PENDING",
      },
      { id: "Terlaksana", label: "Terlaksana", badge: "DONE" },
      { id: "Draf", label: "Draf", badge: "DRAFT" },
    ],
    [],
  );

  // Options untuk Tab 4: Filter IKU Dropdown Search
  const sankeyIkuOptions = useMemo(
    () => [
      { id: "all", label: "Semua IKU", badge: "SEMUA" },
      ...SANKEY_DATA.rootIkus.map((r) => ({
        id: r.id,
        label: `${r.kode} - ${r.nama}`,
        badge: "IKU",
      })),
    ],
    [],
  );

  // Options untuk Tab 4: Filter Status Kegiatan (Terlaksana, Belum Terlaksana, Draf)
  const sankeyKegiatanStatusOptions = useMemo(
    () => [
      { id: "all", label: "Semua Status Kegiatan", badge: "SEMUA" },
      {
        id: "Terlaksana",
        label: "Terlaksana",
        badge: "DONE",
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
      },
      {
        id: "Belum Terlaksana",
        label: "Belum Terlaksana",
        badge: "PENDING",
        badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
      },
      {
        id: "Draf",
        label: "Draf",
        badge: "DRAFT",
        badgeClass: "bg-gray-100 text-gray-700 border-gray-300",
      },
    ],
    [],
  );

  // Options untuk Tab 4: Filter Fakultas/Unit Dropdown Search
  // (Gambar 4 - diambil langsung dari v_fakultas_unit dengan badge=type dan nama=nama_fakultas_prodi_unit (jenjang))
  const sankeyFakultasProdiOptions = useMemo(() => {
    const rawList =
      realFakultasUnits.length > 0
        ? realFakultasUnits.map((u) => {
            const typeUpper = String(u.type || u.badge || "unit").toUpperCase();
            const jenjangUpper = u.jenjang ? String(u.jenjang).toUpperCase() : "";
            const cleanName = u.nama_fak_prod_unit || u.pureName || u.label || u.nama || "";
            const hasJenjang =
              jenjangUpper && cleanName.toUpperCase().includes(`(${jenjangUpper})`);
            const label =
              jenjangUpper && !hasJenjang ? `${cleanName} (${jenjangUpper})` : cleanName;
            return {
              id: String(u.uuid || u.id),
              rawId: u.rawId || u.id,
              uuid: u.uuid,
              legacyId:
                u.legacyId ||
                (MOCK_ALIASES &&
                  (MOCK_ALIASES[u.uuid] || MOCK_ALIASES[String(u.id)])),
              label: label,
              badge: typeUpper,
              type: u.type,
              jenjang: u.jenjang,
              name: cleanName,
            };
          })
        : getAllFakultasProdiUnitOptions().map((o) => ({
            id: o.id,
            rawId: o.rawId,
            uuid: o.uuid,
            label: o.label,
            badge: o.badgeText,
            type: o.type,
            jenjang: o.jenjang,
            name: o.nama,
          }));

    const typeWeight = {
      fakultas: 1,
      prodi: 2,
      unit: 3,
    };

    const sortedList = [...rawList].sort((a, b) => {
      const wA = typeWeight[(a.type || "").toLowerCase()] || 99;
      const wB = typeWeight[(b.type || "").toLowerCase()] || 99;
      if (wA !== wB) return wA - wB;
      const nameCmp = (a.name || a.label || "").localeCompare(
        b.name || b.label || "",
        "id",
        { sensitivity: "base" },
      );
      if (nameCmp !== 0) return nameCmp;
      return (a.jenjang || "").localeCompare(b.jenjang || "");
    });

    return [
      {
        id: "all",
        label: "Semua Fakultas, Unit & Prodi",
        badge: "SEMUA",
      },
      ...sortedList,
    ];
  }, [realFakultasUnits]);

  // Filtered dataset untuk Tab 4 (Sankey Flow)
  const filteredSankeyData = useMemo(() => {
    let kegiatans = SANKEY_DATA.kegiatans;

    // Filter IKU
    if (selectedIkuFilter !== "all") {
      kegiatans = kegiatans.filter((k) => k.ikuId === selectedIkuFilter);
    }

    // Filter Fakultas / Unit / Prodi (mendukung item dari v_fakultas_unit)
    if (selectedFakultasProdiFilter !== "all") {
      const selectedOpt = sankeyFakultasProdiOptions.find(
        (o) => o.id === selectedFakultasProdiFilter,
      );
      const selName = (selectedOpt?.name || selectedOpt?.label || "").toLowerCase();

      kegiatans = kegiatans.filter((k) => {
        if (
          k.boundaryId === selectedFakultasProdiFilter ||
          k.prodiId === selectedFakultasProdiFilter
        ) {
          return true;
        }
        if (
          selectedOpt?.uuid &&
          (k.boundaryUuid === selectedOpt.uuid || k.prodiUuid === selectedOpt.uuid)
        ) {
          return true;
        }
        if (
          selectedOpt?.rawId &&
          (k.boundaryRawId === selectedOpt.rawId || k.prodiRawId === selectedOpt.rawId)
        ) {
          return true;
        }
        if (
          selName &&
          ((k.boundaryNama && k.boundaryNama.toLowerCase().includes(selName)) ||
            (k.prodiNama && k.prodiNama.toLowerCase().includes(selName)) ||
            (k.namaKegiatan && k.namaKegiatan.toLowerCase().includes(selName)))
        ) {
          return true;
        }
        return false;
      });
    }

    // Filter Status Kegiatan (Terlaksana / Belum Terlaksana / Draf)
    if (selectedKegiatanStatusFilter !== "all") {
      kegiatans = kegiatans.filter((k) => k.status === selectedKegiatanStatusFilter);
    }

    const activeBoundaryIds = new Set(kegiatans.map((k) => k.boundaryId));
    const boundaries = SANKEY_DATA.boundaries.filter((b) =>
      activeBoundaryIds.has(b.id),
    );

    const activeAktIds = new Set(kegiatans.map((k) => k.aktivitasId));
    const aktivitas = SANKEY_DATA.aktivitas.filter((a) =>
      activeAktIds.has(a.id),
    );

    const activeProkerIds = new Set(aktivitas.map((a) => a.prokerId));
    const prokers = SANKEY_DATA.prokers.filter((p) =>
      activeProkerIds.has(p.id),
    );

    const activeIndIds = new Set(kegiatans.map((k) => k.indikatorId));
    const indikators = SANKEY_DATA.indikators.filter((i) =>
      activeIndIds.has(i.id),
    );

    const activeChildIds = new Set(
      kegiatans.map((k) => k.subIkuId).filter(Boolean),
    );
    const childIkus = SANKEY_DATA.childIkus.filter((c) =>
      activeChildIds.has(c.id),
    );

    const activeRootIds = new Set(kegiatans.map((k) => k.ikuId));
    const rootIkus = SANKEY_DATA.rootIkus.filter((r) => activeRootIds.has(r.id));

    return {
      rootIkus,
      childIkus,
      indikators,
      boundaries,
      prokers,
      aktivitas,
      kegiatans,
    };
  }, [selectedIkuFilter, selectedFakultasProdiFilter, selectedKegiatanStatusFilter]);

  // Toggle boundary expand/collapse
  const toggleBoundary = (id) => {
    setExpandedBoundaries((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Navigasi instan dari Matriks ke Root Cause Tracing
  const handleTraceFromMatrix = (item) => {
    if (item.level === "iku") {
      setRootCauseFocusType("iku");
      setRootCauseTargetId(item.id);
    } else if (item.level === "boundary") {
      setRootCauseFocusType("boundary");
      setRootCauseTargetId(item.id);
    } else {
      setRootCauseFocusType("prodi");
      setRootCauseTargetId(item.id);
    }
    setActiveTab("rootcause");
    setSelectedMatrixItem(null);
  };

  // Traversal untuk Sankey Highlighting
  const connectedNodeIds = useMemo(() => {
    const targetId = hoveredNodeId || activePathId;
    if (!targetId) return null;

    const set = new Set();
    set.add(targetId);

    const { kegiatans } = SANKEY_DATA;

    const addKegChain = (k) => {
      set.add(k.id);
      if (k.ikuId) set.add(k.ikuId);
      if (k.subIkuId) set.add(k.subIkuId);
      if (k.indikatorId) set.add(k.indikatorId);
      if (k.boundaryId) set.add(k.boundaryId);
      if (k.aktivitasId) set.add(k.aktivitasId);
      const akt = SANKEY_DATA.aktivitas.find((a) => a.id === k.aktivitasId);
      if (akt?.prokerId) set.add(akt.prokerId);
    };

    const foundKeg = kegiatans.find((k) => k.id === targetId);
    if (foundKeg) {
      addKegChain(foundKeg);
      set.add("node-dana-utama");
      return set;
    }

    if (targetId.startsWith("akt-")) {
      const matchKegs = kegiatans.filter((k) => k.aktivitasId === targetId);
      matchKegs.forEach(addKegChain);
      const akt = SANKEY_DATA.aktivitas.find((a) => a.id === targetId);
      if (akt?.prokerId) {
        set.add(akt.prokerId);
        const p = SANKEY_DATA.prokers.find((px) => px.id === akt.prokerId);
        if (p?.boundaryId) set.add(p.boundaryId);
      }
      set.add("node-dana-utama");
      return set;
    }

    if (targetId.startsWith("proker-")) {
      const akts = SANKEY_DATA.aktivitas.filter((a) => a.prokerId === targetId);
      const aktIds = new Set(akts.map((a) => a.id));
      const matchKegs = kegiatans.filter((k) => aktIds.has(k.aktivitasId));
      matchKegs.forEach(addKegChain);
      akts.forEach((a) => set.add(a.id));
      const p = SANKEY_DATA.prokers.find((px) => px.id === targetId);
      if (p?.boundaryId) set.add(p.boundaryId);
      set.add("node-dana-utama");
      return set;
    }

    if (targetId.startsWith("fak-") || targetId.startsWith("unit-")) {
      const matchKegs = kegiatans.filter((k) => k.boundaryId === targetId);
      matchKegs.forEach(addKegChain);
      set.add("node-dana-utama");
      return set;
    }

    if (targetId.startsWith("ind-")) {
      const matchKegs = kegiatans.filter((k) => k.indikatorId === targetId);
      matchKegs.forEach(addKegChain);
      set.add("node-dana-utama");
      return set;
    }

    if (targetId.startsWith("child-iku") || targetId === "child-sub11") {
      const matchKegs = kegiatans.filter((k) => k.subIkuId === targetId);
      matchKegs.forEach(addKegChain);
      set.add("node-dana-utama");
      return set;
    }

    if (targetId.startsWith("root-iku")) {
      const matchKegs = kegiatans.filter((k) => k.ikuId === targetId);
      matchKegs.forEach(addKegChain);
      set.add("node-dana-utama");
      return set;
    }

    set.add("node-dana-utama");
    return set;
  }, [hoveredNodeId, activePathId]);

  // Menghitung pita Bezier SVG Sankey
  const recalculateRibbons = useCallback(() => {
    if (activeTab !== "sankey" || !containerRef.current) {
      setRibbonPaths([]);
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const newPaths = [];

    const getCenterRight = (id) => {
      const el = nodeRefs.current[id];
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: rect.right - containerRect.left,
        y: rect.top + rect.height / 2 - containerRect.top,
      };
    };

    const getCenterLeft = (id) => {
      const el = nodeRefs.current[id];
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: rect.left - containerRect.left,
        y: rect.top + rect.height / 2 - containerRect.top,
      };
    };

    const makeBezier = (start, end) => {
      const dx = (end.x - start.x) / 2;
      return `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`;
    };

    // 1. Dana Utama -> Root IKUs
    const danaPos = getCenterRight("node-dana-utama");
    if (danaPos) {
      filteredSankeyData.rootIkus.forEach((r) => {
        const rootPos = getCenterLeft(r.id);
        if (rootPos) {
          const isActive =
            connectedNodeIds &&
            connectedNodeIds.has("node-dana-utama") &&
            connectedNodeIds.has(r.id);
          newPaths.push({
            id: `path-dana-${r.id}`,
            d: makeBezier(danaPos, rootPos),
            color: r.color,
            isActive: Boolean(isActive),
          });
        }
      });
    }

    // 2. IKU 1 -> Sub-IKUs
    const iku1Pos = getCenterRight("root-iku-1");
    if (iku1Pos) {
      filteredSankeyData.childIkus.forEach((c) => {
        const subPos = getCenterLeft(c.id);
        if (subPos) {
          const isActive =
            connectedNodeIds &&
            connectedNodeIds.has("root-iku-1") &&
            connectedNodeIds.has(c.id);
          newPaths.push({
            id: `path-iku1-${c.id}`,
            d: makeBezier(iku1Pos, subPos),
            color: c.color,
            isActive: Boolean(isActive),
          });
        }
      });
    }

    // 3. Sub-IKUs -> Indikators
    filteredSankeyData.childIkus.forEach((c) => {
      const cPos = getCenterRight(c.id);
      if (!cPos) return;
      (c.indikatorIds || []).forEach((indId) => {
        const indPos = getCenterLeft(indId);
        if (indPos) {
          const isActive =
            connectedNodeIds &&
            connectedNodeIds.has(c.id) &&
            connectedNodeIds.has(indId);
          newPaths.push({
            id: `path-${c.id}-${indId}`,
            d: makeBezier(cPos, indPos),
            color: c.color,
            isActive: Boolean(isActive),
          });
        }
      });
    });

    // 4. Direct Root IKUs (IKU 2, 5, 7) -> Indikators
    filteredSankeyData.rootIkus.forEach((r) => {
      if (r.id === "root-iku-1") return;
      const rPos = getCenterRight(r.id);
      if (!rPos) return;
      (r.indikatorIds || []).forEach((indId) => {
        const indPos = getCenterLeft(indId);
        if (indPos) {
          const isActive =
            connectedNodeIds &&
            connectedNodeIds.has(r.id) &&
            connectedNodeIds.has(indId);
          newPaths.push({
            id: `path-direct-${r.id}-${indId}`,
            d: makeBezier(rPos, indPos),
            color: r.color,
            isActive: Boolean(isActive),
          });
        }
      });
    });

    // 5. Indikators -> Boundaries
    filteredSankeyData.indikators.forEach((ind) => {
      const indPos = getCenterRight(ind.id);
      if (!indPos) return;
      (ind.boundaryIds || []).forEach((bId) => {
        const bPos = getCenterLeft(bId);
        if (bPos) {
          const isActive =
            connectedNodeIds &&
            connectedNodeIds.has(ind.id) &&
            connectedNodeIds.has(bId);
          newPaths.push({
            id: `path-${ind.id}-${bId}`,
            d: makeBezier(indPos, bPos),
            color: ind.color,
            isActive: Boolean(isActive),
          });
        }
      });
    });

    // 6. Boundaries -> Prokers
    filteredSankeyData.boundaries.forEach((b) => {
      const bPos = getCenterRight(b.id);
      if (!bPos) return;
      const boundaryProkers = filteredSankeyData.prokers.filter(
        (p) => p.boundaryId === b.id
      );
      boundaryProkers.forEach((p) => {
        const pPos = getCenterLeft(p.id);
        if (pPos) {
          const isActive =
            connectedNodeIds &&
            connectedNodeIds.has(b.id) &&
            connectedNodeIds.has(p.id);
          newPaths.push({
            id: `path-${b.id}-${p.id}`,
            d: makeBezier(bPos, pPos),
            color: b.color || "#6366f1",
            isActive: Boolean(isActive),
          });
        }
      });
    });

    // 7. Prokers -> Aktivitas
    filteredSankeyData.prokers.forEach((p) => {
      const pPos = getCenterRight(p.id);
      if (!pPos) return;
      const bParent = filteredSankeyData.boundaries.find(
        (b) => b.id === p.boundaryId
      );
      (p.aktivitasIds || []).forEach((aktId) => {
        const aktPos = getCenterLeft(aktId);
        if (aktPos) {
          const isActive =
            connectedNodeIds &&
            connectedNodeIds.has(p.id) &&
            connectedNodeIds.has(aktId);
          newPaths.push({
            id: `path-${p.id}-${aktId}`,
            d: makeBezier(pPos, aktPos),
            color: bParent?.color || "#8b5cf6",
            isActive: Boolean(isActive),
          });
        }
      });
    });

    // 8. Aktivitas -> Kegiatan
    filteredSankeyData.aktivitas.forEach((a) => {
      const aktPos = getCenterRight(a.id);
      if (!aktPos) return;
      const pParent = filteredSankeyData.prokers.find(
        (p) => p.id === a.prokerId
      );
      const bParent = pParent
        ? filteredSankeyData.boundaries.find((b) => b.id === pParent.boundaryId)
        : null;
      (a.kegiatanIds || []).forEach((kegId) => {
        const kegPos = getCenterLeft(kegId);
        if (kegPos) {
          const isActive =
            connectedNodeIds &&
            connectedNodeIds.has(a.id) &&
            connectedNodeIds.has(kegId);
          newPaths.push({
            id: `path-${a.id}-${kegId}`,
            d: makeBezier(aktPos, kegPos),
            color: bParent?.color || "#a855f7",
            isActive: Boolean(isActive),
          });
        }
      });
    });

    setRibbonPaths(newPaths);
  }, [activeTab, filteredSankeyData, connectedNodeIds]);

  useLayoutEffect(() => {
    const timer = setTimeout(recalculateRibbons, 120);
    window.addEventListener("resize", recalculateRibbons);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", recalculateRibbons);
    };
  }, [recalculateRibbons]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden mb-6">
      {/* ======================================================== */}
      {/* 1. EXECUTIVE HEADER & HEALTH KPI SUMMARY                 */}
      {/* ======================================================== */}
      <div className="p-6 border-gray-100 bg-gradient-to-r from-gray-50/80 via-white to-gray-50/60">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2.5">
              Matriks Korelasi &amp; Pelaporan Kinerja IKU Berbasis Anggaran
            </h2>
            <p className="text-sm mt-1 max-w-3xl leading-relaxed">
              Mengevaluasi korelasi penyerapan dana terhadap keterlaksanaan kerja riil, investigasi akar masalah (*Root Cause Tracing*), dan penataan hierarki unit pelaksana (*Boundary Unit &amp; Prodi*) — Periode Tahun Anggaran {selectedYear}.
            </p>
          </div>

          {/* Quick Health Summary Pill */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="border border-emerald-600 px-3.5 py-2 rounded-xl text-left">
              <div className="text-[11px] font-medium text-emerald-600">Optimal (Kuadran I)</div>
              <div className="text-base font-bold text-emerald-500">11 Unit / Prodi</div>
            </div>
            <div className="border border-rose-600 px-3.5 py-2 rounded-xl text-left">
              <div className="text-[11px] font-medium text-rose-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-500" />
                Red Flag (Kuadran II)
              </div>
              <div className="text-base font-bold text-rose-500">4 Unit / Prodi</div>
            </div>
            <div className="border border-amber-600 px-3.5 py-2 rounded-xl text-left">
              <div className="text-[11px] font-medium text-amber-600">Mandek (Kuadran III)</div>
              <div className="text-base font-bold text-amber-500">1 Unit / Prodi</div>
            </div>
            <div className="border border-sky-600 px-3.5 py-2 rounded-xl text-left">
              <div className="text-[11px] font-medium text-sky-600">Efisien (Kuadran IV)</div>
              <div className="text-base font-bold text-sky-500">1 Unit / Prodi</div>
            </div>
          </div>
        </div>

        {/* 4 Key Metrik Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs mb-1">
              <span>Total Pagu Universitas ({selectedYear})</span>
              <Coins className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-lg font-bold tracking-tight">
              {formatRupiah(summary.totalDana)}
            </div>
            <div className="text-[11px] mt-0.5">Alokasi seluruh target IKU</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs mb-1">
              <span>Dana Terserap ({selectedYear})</span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                {summary.persenSerapan}%
              </span>
            </div>
            <div className="text-lg font-bold text-emerald-600 tracking-tight">
              {formatRupiah(summary.totalSerapan)}
            </div>
            <div className="text-[11px] mt-0.5">
              Sisa Pagu: {formatRupiah(summary.totalSisa)}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs mb-1">
              <span>Keterlaksanaan Kerja ({selectedYear})</span>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-500/20 px-1.5 py-0.5 rounded">
                {summary.persenKeterlaksanaan}%
              </span>
            </div>
            <div className="text-lg font-bold tracking-tight">
              {summary.kegiatanTerlaksana}{" "}
              <span className="text-sm font-normal">
                / {summary.totalKegiatan} Kegiatan
              </span>
            </div>
            <div className="text-[11px] text-rose-600 mt-0.5">
              {summary.kegiatanBelumTerlaksana} belum terlaksana • {summary.kegiatanDraf} draf
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs mb-1">
              <span>Cakupan Organisasi ({selectedYear})</span>
              <Building2 className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-lg font-bold tracking-tight">
              {summary.totalBoundary} Fakultas &amp; Unit
            </div>
            <div className="text-[11px] mt-0.5">
              17 Program Studi &amp; Unit Pusat
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. TAB NAVIGATION SWITCHER                               */}
      {/* ======================================================== */}
      <div className="px-6 py-3.5 bg-slate-50/80 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-gray-200/80 rounded-xl text-sm font-semibold">
          <button
            onClick={() => setActiveTab("matrix")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === "matrix"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Matriks Korelasi (Uang vs Capaian)
          </button>

          <button
            onClick={() => setActiveTab("rootcause")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === "rootcause"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            Root Cause Tracing
          </button>

          <button
            onClick={() => setActiveTab("boundary")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === "boundary"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Building2 className="w-4 h-4 text-teal-600" />
            Penataan Boundary Unit &amp; Pohon Proker
          </button>

          <button
            onClick={() => setActiveTab("sankey")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === "sankey"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Workflow className="w-4 h-4 text-sky-600" />
            Diagram Alir Alokasi (Sankey)
          </button>
        </div>

        {/* FILTER TAHUN MASTER IKU ANGGARAN */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-gray-300 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <label htmlFor="dashboard-iku-tahun-select" className="sr-only">Tahun Anggaran IKU</label>
            <select
              id="dashboard-iku-tahun-select"
              aria-label="Filter Tahun Master IKU Anggaran"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="text-xs font-semibold text-gray-700 bg-transparent border-none outline-none cursor-pointer"
            >
              {masterYears.map((yr) => (
                <option key={yr} value={yr}>
                  Tahun {yr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: MATRIKS KORELASI (UANG VS CAPAIAN KERJA)          */}
      {/* ======================================================== */}
      {activeTab === "matrix" && (
        <div className="p-6 space-y-6">
          {/* Controls: Level Switcher & Quadrant Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-150">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Tingkat Analisis:
              </span>
              <div className="inline-flex rounded-lg border border-gray-300 p-0.5 bg-gray-50 text-xs font-semibold">
                <button
                  onClick={() => setMatrixLevel("iku")}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    matrixLevel === "iku"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Per Target IKU (4)
                </button>
                <button
                  onClick={() => setMatrixLevel("boundary")}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    matrixLevel === "boundary"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Per Fakultas &amp; Unit (8)
                </button>
                <button
                  onClick={() => setMatrixLevel("prodi")}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    matrixLevel === "prodi"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Per Program Studi (17)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span className="text-xs font-semibold text-gray-500 shrink-0">Filter Kuadran:</span>
              <div className="w-64 sm:w-72">
                <SearchableDropdown
                  options={quadrantFilterOptions}
                  value={selectedQuadrantFilter}
                  onChange={setSelectedQuadrantFilter}
                  placeholder="Semua Kuadran"
                  searchPlaceholder="Cari kuadran..."
                />
              </div>
            </div>
          </div>

          {/* 4-QUADRANT MATRIX VISUALIZATION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* KUADRAN 4: EFISIEN / HEMAT (Kiri Atas) */}
            <div className="rounded-2xl border-2 border-sky-200 bg-sky-50/40 p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300">
                    KUADRAN IV: EFISIEN / HEMAT
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mt-1">
                    Serapan Rendah (&lt;75%) • Kinerja Tinggi (≥75%)
                  </h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Kegiatan tuntas terlaksana dengan efisiensi penggunaan dana anggaran.
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                  IV
                </div>
              </div>

              <div className="space-y-2.5">
                {filteredMatrixItems
                  .filter((i) => i.kuadran === 4)
                  .map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedMatrixItem(item)}
                      className="p-3 bg-white rounded-xl border border-sky-200 shadow-xs hover:border-sky-400 hover:shadow-sm cursor-pointer transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900">{item.nama}</span>
                        <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
                          {item.kode}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500 text-[11px]">Serapan Uang:</span>
                          <div className="font-semibold text-gray-800">
                            {formatRupiah(item.totalSerap)} ({item.persenSerap}%)
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[11px]">Keterlaksanaan:</span>
                          <div className="font-semibold text-emerald-600">
                            {item.doneKeg}/{item.totalKeg} Selesai ({item.persenKerja}%)
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                {filteredMatrixItems.filter((i) => i.kuadran === 4).length === 0 && (
                  <div className="text-center py-6 text-xs text-gray-400 italic">
                    Tidak ada item di kuadran ini
                  </div>
                )}
              </div>
            </div>

            {/* KUADRAN 1: OPTIMAL & PRODUKTIF (Kanan Atas) */}
            <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    KUADRAN I: OPTIMAL &amp; PRODUKTIF
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mt-1">
                    Serapan Tinggi (≥75%) • Kinerja Tinggi (≥75%)
                  </h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Anggaran terserap optimal dan output kegiatan berhasil diselesaikan penuh.
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  I
                </div>
              </div>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {filteredMatrixItems
                  .filter((i) => i.kuadran === 1)
                  .map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedMatrixItem(item)}
                      className="p-3 bg-white rounded-xl border border-emerald-200 shadow-xs hover:border-emerald-400 hover:shadow-sm cursor-pointer transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900">{item.nama}</span>
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {item.kode}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500 text-[11px]">Serapan Uang:</span>
                          <div className="font-semibold text-gray-800">
                            {formatRupiah(item.totalSerap)} ({item.persenSerap}%)
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[11px]">Keterlaksanaan:</span>
                          <div className="font-semibold text-emerald-600">
                            {item.doneKeg}/{item.totalKeg} Selesai ({item.persenKerja}%)
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                {filteredMatrixItems.filter((i) => i.kuadran === 1).length === 0 && (
                  <div className="text-center py-6 text-xs text-gray-400 italic">
                    Tidak ada item di kuadran ini
                  </div>
                )}
              </div>
            </div>

            {/* KUADRAN 3: MANDEK / UNDER-ABSORBED (Kiri Bawah) */}
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/40 p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    KUADRAN III: MANDEK / UNDER-ABSORBED
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mt-1">
                    Serapan Rendah (&lt;75%) • Kinerja Rendah (&lt;75%)
                  </h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Anggaran lambat terserap dan target pelaksanaan kerja tertunda. Butuh percepatan.
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                  III
                </div>
              </div>

              <div className="space-y-2.5">
                {filteredMatrixItems
                  .filter((i) => i.kuadran === 3)
                  .map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedMatrixItem(item)}
                      className="p-3 bg-white rounded-xl border border-amber-300 shadow-xs hover:border-amber-500 hover:shadow-sm cursor-pointer transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900">{item.nama}</span>
                        <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                          {item.kode}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500 text-[11px]">Serapan Uang:</span>
                          <div className="font-semibold text-amber-700">
                            {formatRupiah(item.totalSerap)} ({item.persenSerap}%)
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[11px]">Keterlaksanaan:</span>
                          <div className="font-semibold text-amber-700">
                            {item.doneKeg}/{item.totalKeg} Selesai ({item.persenKerja}%)
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                {filteredMatrixItems.filter((i) => i.kuadran === 3).length === 0 && (
                  <div className="text-center py-6 text-xs text-gray-400 italic">
                    Tidak ada item di kuadran ini
                  </div>
                )}
              </div>
            </div>

            {/* KUADRAN 2: RED FLAG (PERINGATAN AUDIT) (Kanan Bawah) */}
            {/* Uang telah banyak dicairkan tetapi pekerjaan belum tuntas / pekerjaan tuntas namun uang belum cair */}
            <div className="rounded-2xl border-2 border-rose-400 bg-rose-50/50 p-5 space-y-4 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    KUADRAN II: RED FLAG (PERINGATAN AUDIT)
                  </div>
                  <h3 className="text-sm font-bold text-rose-950 mt-1">
                    Anomali Penganggaran &amp; Realisasi Kerja
                  </h3>
                  <p className="text-xs text-rose-700 mt-0.5">
                    <strong>Peringatan Audit:</strong> Uang telah banyak dicairkan tetapi pekerjaan belum tuntas / pekerjaan tuntas namun uang belum cair.
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-rose-200 text-rose-800 flex items-center justify-center font-bold text-xs">
                  II
                </div>
              </div>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {filteredMatrixItems
                  .filter((i) => i.kuadran === 2)
                  .map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedMatrixItem(item)}
                      className="p-3 bg-white rounded-xl border-2 border-rose-300 shadow-xs hover:border-rose-500 hover:shadow-md cursor-pointer transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900">{item.nama}</span>
                        <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          {item.kode}
                        </span>
                      </div>

                      {/* Detail Anomali Badge */}
                      {item.anomalyType && (
                        <div className="mt-1 text-[10px] font-semibold text-rose-700 bg-rose-100/60 px-2 py-0.5 rounded inline-block">
                          ⚠️ {item.anomalyType}
                        </div>
                      )}

                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500 text-[11px]">Serapan Uang:</span>
                          <div className="font-bold text-rose-600">
                            {formatRupiah(item.totalSerap)} ({item.persenSerap}%)
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[11px]">Keterlaksanaan:</span>
                          <div className="font-bold text-rose-600">
                            {item.doneKeg}/{item.totalKeg} ({item.persenKerja}%)
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-rose-100 flex items-center justify-between text-[11px]">
                        <span className="text-rose-700 font-medium">
                          {item.pendingKeg > 0
                            ? `⚠️ ${item.pendingKeg} kegiatan macet/belum selesai`
                            : `⚠️ Uang terserap baru ${item.persenSerap}% (dana belum cair)`}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTraceFromMatrix(item);
                          }}
                          className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 underline"
                        >
                          Telusuri Root Cause &rarr;
                        </button>
                      </div>
                    </div>
                  ))}
                {filteredMatrixItems.filter((i) => i.kuadran === 2).length === 0 && (
                  <div className="text-center py-6 text-xs text-gray-400 italic">
                    Tidak ada item di kuadran ini
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: ROOT CAUSE TRACING (AKAR MASALAH)                 */}
      {/* ======================================================== */}
      {activeTab === "rootcause" && (
        <div className="p-6 space-y-6">
          {/* Target Selector & Searchable Dropdowns */}
          <div className="bg-slate-50 border border-gray-200 rounded-2xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Fokus Investigasi Hambatan:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setRootCauseFocusType("iku");
                    setRootCauseTargetId("root-iku-5");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    rootCauseFocusType === "iku"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  Berdasarkan Target IKU
                </button>
                <button
                  onClick={() => {
                    setRootCauseFocusType("boundary");
                    setRootCauseTargetId("fak-mipa");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    rootCauseFocusType === "boundary"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  Berdasarkan Unit / Fakultas
                </button>
                <button
                  onClick={() => {
                    setRootCauseFocusType("prodi");
                    setRootCauseTargetId("prodi-mipa-apt");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    rootCauseFocusType === "prodi"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  Berdasarkan Jenjang / Prodi
                </button>
              </div>
            </div>

            {/* Dropdown Search Pilih Entitas & Filter Status */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              <div className="w-full sm:w-72">
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Pilih Entitas:
                </label>
                <SearchableDropdown
                  options={rootCauseEntityOptions}
                  value={rootCauseTargetId}
                  onChange={setRootCauseTargetId}
                  searchPlaceholder="Cari IKU, Fakultas, atau Prodi..."
                />
              </div>

              <div className="w-full sm:w-60">
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Filter Status:
                </label>
                <SearchableDropdown
                  options={rootCauseStatusOptions}
                  value={rootCauseStatusFilter}
                  onChange={setRootCauseStatusFilter}
                  searchPlaceholder="Pilih status kegiatan..."
                />
              </div>
            </div>
          </div>

          {/* Root Cause Diagnostic Header */}
          <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  Diagnostik Hambatan: {rootCauseData.targetEntity?.kode || rootCauseData.targetEntity?.nama}
                </div>
                <h3 className="text-base font-bold text-gray-900 mt-1">
                  {rootCauseData.targetEntity?.nama}
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Menampilkan penelusuran kegiatan berdasarkan filter status (*{rootCauseStatusFilter === "all" ? "Semua Status" : rootCauseStatusFilter}*), dana anggaran, catatan kendala riil, dan pemecahannya.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-gray-500 font-medium">Uang Terancam / Tertahan:</div>
                  <div className="text-lg font-bold text-rose-600">
                    {formatRupiah(rootCauseData.blockedMoney)}
                  </div>
                </div>
                <div className="h-10 w-px bg-rose-200" />
                <div className="text-right">
                  <div className="text-xs text-gray-500 font-medium">Kegiatan Sesuai Filter:</div>
                  <div className="text-lg font-bold text-indigo-700">
                    {rootCauseData.totalFiltered} / {rootCauseData.totalKegiatan}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rantai Penelusuran (Traced Chains) */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Rantai Penelusuran Hilir (Root Cause Chains):
            </h4>

            {rootCauseData.chains.length > 0 ? (
              rootCauseData.chains.map((chain) => (
                <div
                  key={chain.kegiatanId}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs hover:border-indigo-300 transition-all space-y-4"
                >
                  {/* Step breadcrumb trail */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {chain.ikuKode}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                      {chain.indikatorKode}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {chain.boundaryNama}
                    </span>
                    {chain.prodiNama && (
                      <>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          {chain.prodiNama}
                        </span>
                      </>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-medium text-gray-600 truncate max-w-xs">
                      {chain.aktivitasNama}
                    </span>
                  </div>

                  {/* Kegiatan Header & Badges */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-gray-100">
                    <div>
                      <div className="text-sm font-bold text-gray-900">
                        {chain.namaKegiatan}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        PIC: <strong className="text-gray-700">{chain.pic}</strong> • Program: {chain.prokerNama}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[11px] text-gray-500">Pagu: {formatRupiah(chain.anggaran)}</div>
                        <div className="text-xs font-bold text-rose-600">
                          Serapan: {formatRupiah(chain.realisasi)} ({chain.persenSerapan}%)
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                          chain.status === "Terlaksana"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : chain.status === "Draf"
                            ? "bg-gray-100 text-gray-700 border-gray-300"
                            : "bg-amber-100 text-amber-800 border-amber-300"
                        }`}
                      >
                        {chain.status}
                      </span>
                    </div>
                  </div>

                  {/* Root Cause & Action Boxes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200">
                      <div className="text-xs font-bold text-rose-900 flex items-center gap-1.5 mb-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        Catatan Kendala / Akar Masalah:
                      </div>
                      <div className="text-xs text-rose-800 leading-relaxed font-medium">
                        {chain.masalah || "Belum ada catatan kendala spesifik dari PIC."}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                      <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Rencana Pemecahan Masalah / Tindak Lanjut:
                      </div>
                      <div className="text-xs text-emerald-800 leading-relaxed font-medium">
                        {chain.pemecahan_masalah || "Menunggu rekomendasi perbaikan dari pimpinan unit."}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-slate-50/80 rounded-2xl border border-gray-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-gray-900">
                  Tidak Ada Kegiatan dengan Filter Status Ini
                </h4>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  Semua kegiatan pada entitas ini telah diperiksa. Silakan ubah filter status ke <strong>Semua Status</strong> untuk melihat seluruh riwayat kegiatan.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: PENATAAN BOUNDARY UNIT & POHON PROKER             */}
      {/* ======================================================== */}
      {activeTab === "boundary" && (
        <div className="p-6 space-y-6">
          {/* Controls: Search and Status Filter */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-150">
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Hierarki Boundary
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                Struktur organisasi resmi Unpak dengan rincian dana, keterlaksanaan, dan kendala per unit kerja.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari Fakultas, Prodi, Kegiatan..."
                  value={boundarySearchQuery}
                  onChange={(e) => setBoundarySearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="w-56 shrink-0">
                <SearchableDropdown
                  options={boundaryStatusFilterOptions}
                  value={boundaryStatusFilter}
                  onChange={setBoundaryStatusFilter}
                  placeholder="Semua Status"
                  searchPlaceholder="Pilih status kegiatan..."
                />
              </div>
            </div>
          </div>

          {/* Boundary Accordion Tree */}
          <div className="space-y-4">
            {SANKEY_DATA.boundaries.map((boundary) => {
              const isExpanded = Boolean(expandedBoundaries[boundary.id]);
              const relatedKegiatans = SANKEY_DATA.kegiatans.filter(
                (k) => k.boundaryId === boundary.id,
              );
              const totalKeg = relatedKegiatans.length;
              const doneKeg = relatedKegiatans.filter(
                (k) => k.status === "Terlaksana",
              ).length;
              const persenSerap =
                boundary.pagu > 0
                  ? Number(((boundary.serapan / boundary.pagu) * 100).toFixed(1))
                  : 0;

              return (
                <div
                  key={boundary.id}
                  className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-xs"
                >
                  {/* Boundary Header Card */}
                  <div
                    onClick={() => toggleBoundary(boundary.id)}
                    className="p-4 bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                        {boundary.type === "fakultas" ? (
                          <GraduationCap className="w-5 h-5" />
                        ) : (
                          <Briefcase className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">
                            {boundary.nama}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 uppercase border border-indigo-200">
                            {boundary.type}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Pimpinan: {boundary.dekan || boundary.kepala || "Pimpinan Unit"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-5">
                      <div className="text-right">
                        <div className="text-xs font-bold text-gray-900">
                          {formatRupiah(boundary.serapan)}{" "}
                          <span className="text-gray-400 font-normal">
                            / {formatRupiah(boundary.pagu)}
                          </span>
                        </div>
                        <div className="text-[11px] font-semibold text-emerald-600">
                          Serapan: {persenSerap}% • {doneKeg}/{totalKeg} Kegiatan Terlaksana
                        </div>
                      </div>

                      <div className="w-6 h-6 rounded-lg bg-gray-200/60 flex items-center justify-center text-gray-600">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content: Unit Fakultas + Jenjang & Prodi / Central Proker */}
                  {isExpanded && (
                    <div className="p-4 pt-3 border-t border-gray-150 space-y-4 bg-white">
                      {/* 1. SEBELUM JENJANG: TAMBAHKAN TYPE UNIT FAKULTAS BESERTA PROKERNYA (Sesuai Permintaan Gambar 1) */}
                      {boundary.type === "fakultas" && boundary.unitFakultas && (
                        <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-600 text-white uppercase">
                                Unit
                              </span>
                            </div>
                          </div>

                          {/* Proker Tingkat Fakultas */}
                          {boundary.unitFakultas.proker && (
                            <div className="p-3 bg-white rounded-lg border border-indigo-200 shadow-2xs space-y-2">
                              <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                                📋 <span>Program Kerja Fakultas:</span>{" "}
                                <span className="font-semibold text-gray-800">
                                  {boundary.unitFakultas.proker.namaProker}
                                </span>
                              </div>

                              {/* Kegiatannya jika ada */}
                              {SANKEY_DATA.kegiatans
                                .filter((k) => k.boundaryId === boundary.id && !k.prodiId)
                                .map((keg) => (
                                  <div
                                    key={keg.id}
                                    onClick={() => setSelectedKegiatanDetail(keg)}
                                    className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-xs hover:border-indigo-400 cursor-pointer transition-all flex items-center justify-between gap-3"
                                  >
                                    <div>
                                      <div className="font-semibold text-gray-900">
                                        {keg.namaKegiatan}
                                      </div>
                                      <div className="text-[11px] text-gray-500">
                                        PIC: {keg.pic}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                      <div className="text-right">
                                        <div className="font-bold text-gray-800">
                                          {formatRupiah(keg.realisasi)}
                                        </div>
                                        <div className="text-[10px] text-gray-400">
                                          Pagu: {formatRupiah(keg.anggaran)}
                                        </div>
                                      </div>
                                      <span
                                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                          keg.status === "Terlaksana"
                                            ? "bg-emerald-100 text-emerald-800"
                                            : "bg-amber-100 text-amber-800"
                                        }`}
                                      >
                                        {keg.status}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 2. JENJANG DAN PRODI DI BAWAH FAKULTAS */}
                      {boundary.type === "fakultas" && boundary.jenjangList ? (
                        boundary.jenjangList.map((jenjang) => (
                          <div
                            key={jenjang.jenjang}
                            className="pl-4 border-l-2 border-indigo-200 space-y-3"
                          >
                            <div className="text-xs font-bold text-indigo-900 bg-indigo-50/80 px-2.5 py-1 rounded inline-block border border-indigo-150">
                              🎓 Jenjang: {jenjang.namaJenjang}
                            </div>

                            <div className="space-y-3 pl-2">
                              {jenjang.prodis.map((prodi) => {
                                const proker = SANKEY_DATA.prokers.find(
                                  (p) => p.prodiId === prodi.id,
                                );
                                const prodiKegiatans = SANKEY_DATA.kegiatans.filter(
                                  (k) => k.prodiId === prodi.id,
                                );

                                return (
                                  <div
                                    key={prodi.id}
                                    className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-200/80 space-y-3"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <div className="text-xs font-bold text-gray-900">
                                          {prodi.nama}
                                        </div>
                                        <div className="text-[11px] text-gray-500">
                                          Kaprodi: {prodi.kaprodi}
                                        </div>
                                      </div>
                                      <div className="text-right text-xs">
                                        <div className="font-bold text-gray-800">
                                          {formatRupiah(prodi.serapan)}
                                        </div>
                                        <div className="text-[11px] text-gray-500">
                                          Pagu: {formatRupiah(prodi.pagu)}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Program Kerja Prodi Tampil Jelas */}
                                    {proker && (
                                      <div className="text-xs text-indigo-900 bg-white p-2.5 rounded-lg border border-indigo-150 shadow-2xs font-medium">
                                        📋 <strong>Program Kerja:</strong> {proker.namaProker}
                                      </div>
                                    )}

                                    {/* Activities and Kegiatans under this Prodi */}
                                    <div className="space-y-2">
                                      {prodiKegiatans.map((keg) => (
                                        <div
                                          key={keg.id}
                                          onClick={() => setSelectedKegiatanDetail(keg)}
                                          className="p-2.5 bg-white rounded-lg border border-gray-200 text-xs hover:border-indigo-400 cursor-pointer transition-all flex items-center justify-between gap-3"
                                        >
                                          <div>
                                            <div className="font-semibold text-gray-900">
                                              {keg.namaKegiatan}
                                            </div>
                                            <div className="text-[11px] text-gray-500">
                                              PIC: {keg.pic}
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-3 shrink-0">
                                            <div className="text-right">
                                              <div className="font-bold text-gray-800">
                                                {formatRupiah(keg.realisasi)}
                                              </div>
                                              <div className="text-[10px] text-gray-400">
                                                Pagu: {formatRupiah(keg.anggaran)}
                                              </div>
                                            </div>

                                            <span
                                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                                keg.status === "Terlaksana"
                                                  ? "bg-emerald-100 text-emerald-800"
                                                  : keg.status === "Draf"
                                                  ? "bg-gray-100 text-gray-700"
                                                  : "bg-amber-100 text-amber-800"
                                              }`}
                                            >
                                              {keg.status}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      ) : (
                        // Unit Universitas (BPSI, LPPM, Tracer, dll.)
                        <div className="space-y-3">
                          {boundary.prokerId && (
                            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 text-xs font-semibold text-indigo-900">
                              📋 <strong>Program Kerja Unit:</strong>{" "}
                              {
                                SANKEY_DATA.prokers.find((p) => p.id === boundary.prokerId)
                                  ?.namaProker
                              }
                            </div>
                          )}

                          <div className="space-y-2">
                            {relatedKegiatans.map((keg) => (
                              <div
                                key={keg.id}
                                onClick={() => setSelectedKegiatanDetail(keg)}
                                className="p-3 bg-white rounded-xl border border-gray-200 text-xs hover:border-indigo-400 cursor-pointer transition-all flex items-center justify-between gap-3"
                              >
                                <div>
                                  <div className="font-semibold text-gray-900">
                                    {keg.namaKegiatan}
                                  </div>
                                  <div className="text-[11px] text-gray-500">
                                    PIC: {keg.pic}
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  <div className="text-right">
                                    <div className="font-bold text-gray-800">
                                      {formatRupiah(keg.realisasi)}
                                    </div>
                                    <div className="text-[10px] text-gray-400">
                                      Pagu: {formatRupiah(keg.anggaran)}
                                    </div>
                                  </div>

                                  <span
                                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                      keg.status === "Terlaksana"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : keg.status === "Draf"
                                        ? "bg-gray-100 text-gray-700"
                                        : "bg-amber-100 text-amber-800"
                                    }`}
                                  >
                                    {keg.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: DIAGRAM ALIR ALOKASI (SANKEY 6-KOLOM)             */}
      {/* Dilengkapi Filter IKU & Fakultas/Unit DROPDOWN SEARCH    */}
      {/* ======================================================== */}
      {activeTab === "sankey" && (
        <div className="p-6 space-y-6">
          {/* Sankey Searchable Dropdowns Filter Bar (Sesuai Permintaan Gambar 3) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-gray-150">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Filter IKU Dropdown Search */}
              <div className="w-full sm:w-64">
                <span className="text-xs font-semibold text-gray-600 block mb-1">
                  Filter IKU:
                </span>
                <SearchableDropdown
                  options={sankeyIkuOptions}
                  value={selectedIkuFilter}
                  onChange={setSelectedIkuFilter}
                  placeholder="Semua IKU"
                  searchPlaceholder="Cari Target IKU..."
                />
              </div>

              {/* Filter Fakultas / Unit / Prodi Dropdown Search */}
              {/* (itemnya badge=type fakultas unit, name=nama_fakultas_prodi_unit (jenjang)) */}
              <div className="w-full sm:w-80">
                <span className="text-xs font-semibold text-gray-600 block mb-1">
                  Fakultas / Unit / Prodi:
                </span>
                <SearchableDropdown
                  options={sankeyFakultasProdiOptions}
                  value={selectedFakultasProdiFilter}
                  onChange={setSelectedFakultasProdiFilter}
                  placeholder="Semua Unit & Prodi"
                  searchPlaceholder="Cari Fakultas, Unit, atau Prodi..."
                />
              </div>

              {/* Filter Status Kegiatan Dropdown Search */}
              <div className="w-full sm:w-64">
                <span className="text-xs font-semibold text-gray-600 block mb-1">
                  Status Kegiatan:
                </span>
                <SearchableDropdown
                  options={sankeyKegiatanStatusOptions}
                  value={selectedKegiatanStatusFilter}
                  onChange={setSelectedKegiatanStatusFilter}
                  placeholder="Semua Status"
                  searchPlaceholder="Cari status kegiatan..."
                />
              </div>
            </div>

            {/* Reset Filter Button */}
            {(selectedIkuFilter !== "all" ||
              selectedFakultasProdiFilter !== "all" ||
              selectedKegiatanStatusFilter !== "all") && (
              <button
                onClick={() => {
                  setSelectedIkuFilter("all");
                  setSelectedFakultasProdiFilter("all");
                  setSelectedKegiatanStatusFilter("all");
                }}
                className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 self-end sm:self-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Filter
              </button>
            )}
          </div>

          {/* Sankey Flow Columns Container */}
          <div
            ref={containerRef}
            className="relative overflow-x-auto min-h-[600px] pb-6"
          >
            {/* Background SVG Ribbons */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              {ribbonPaths.map((p) => (
                <path
                  key={p.id}
                  d={p.d}
                  fill="none"
                  stroke={p.color}
                  strokeWidth={p.isActive ? 4 : 1.5}
                  strokeOpacity={p.isActive ? 0.9 : 0.25}
                  strokeLinecap="round"
                  className="transition-all duration-200"
                />
              ))}
            </svg>

            {/* 8 Grid Columns */}
            <div className="relative z-10 grid grid-cols-8 gap-5 min-w-[1920px]">
              {/* KOLOM 1: DANA UTAMA */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  1. Dana Utama
                </div>
                <div
                  ref={(el) => (nodeRefs.current["node-dana-utama"] = el)}
                  onMouseEnter={() => setHoveredNodeId("node-dana-utama")}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  className="p-4 rounded-2xl bg-indigo-50 border-2 border-indigo-300 shadow-sm space-y-3 cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs">
                    <Coins className="w-4 h-4" />
                    Dana Universitas
                  </div>
                  <div>
                    <div className="text-lg font-bold text-indigo-950">
                      {formatRupiah(SANKEY_DATA.danaUtama.totalDana)}
                    </div>
                    <div className="text-xs font-semibold text-emerald-600 mt-0.5">
                      Terserap: {formatRupiah(SANKEY_DATA.danaUtama.totalSerapan)}
                    </div>
                  </div>
                </div>
              </div>

              {/* KOLOM 2: ROOT IKU */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  2. Target IKU ({filteredSankeyData.rootIkus.length})
                </div>
                <div className="space-y-3">
                  {filteredSankeyData.rootIkus.map((r) => (
                    <div
                      key={r.id}
                      ref={(el) => (nodeRefs.current[r.id] = el)}
                      onMouseEnter={() => setHoveredNodeId(r.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      className="p-3 bg-white rounded-xl border border-gray-200 shadow-xs hover:border-indigo-400 cursor-pointer transition-all space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-700">
                          {r.kode}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-400">
                          {r.childIds?.length > 0 ? "5 Sub-IKU ➔" : "Langsung ➔"}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-gray-900 line-clamp-2">
                        {r.nama}
                      </div>
                      <div className="text-[11px] font-medium text-gray-500">
                        {formatRupiah(r.serapan)} ({r.persenSerapan}%)
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* KOLOM 3: SUB-IKU (KHUSUS IKU 1) */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  3. Sub-IKU (Khusus IKU 1)
                </div>
                <div className="space-y-3">
                  {filteredSankeyData.childIkus.map((c) => (
                    <div
                      key={c.id}
                      ref={(el) => (nodeRefs.current[c.id] = el)}
                      onMouseEnter={() => setHoveredNodeId(c.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      className="p-3 bg-white rounded-xl border border-gray-200 shadow-xs hover:border-indigo-400 cursor-pointer transition-all space-y-1.5"
                    >
                      <div className="text-xs font-bold text-purple-700">
                        {c.kode}
                      </div>
                      <div className="text-xs font-bold text-gray-900">
                        {c.nama}
                      </div>
                      <div className="text-[11px] font-medium text-gray-500">
                        {formatRupiah(c.serapan)}
                      </div>
                    </div>
                  ))}
                  {filteredSankeyData.childIkus.length === 0 && (
                    <div className="p-4 rounded-xl border border-dashed border-gray-200 text-center text-xs text-gray-400 italic">
                      IKU terpilih langsung mengalir ke Indikator (tanpa sub-IKU)
                    </div>
                  )}
                </div>
              </div>

              {/* KOLOM 4: INDIKATOR RENSTRA */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  4. Indikator ({filteredSankeyData.indikators.length})
                </div>
                <div className="space-y-3">
                  {filteredSankeyData.indikators.map((ind) => (
                    <div
                      key={ind.id}
                      ref={(el) => (nodeRefs.current[ind.id] = el)}
                      onMouseEnter={() => setHoveredNodeId(ind.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      className="p-3 bg-white rounded-xl border border-gray-200 shadow-xs hover:border-indigo-400 cursor-pointer transition-all space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-sky-700">
                          {ind.kode}
                        </span>
                        <span
                          className="text-[10px] font-medium text-gray-400 truncate max-w-[100px]"
                          title={ind.standar}
                        >
                          {ind.standar}
                        </span>
                      </div>
                      <div
                        className="text-xs font-bold text-gray-900 line-clamp-2"
                        title={ind.nama}
                      >
                        {ind.nama}
                      </div>
                      <div className="pt-1.5 border-t border-gray-100 space-y-0.5 text-[11px]">
                        <div className="flex justify-between text-gray-600">
                          <span>Total Uang:</span>
                          <span className="font-semibold text-gray-800">
                            {formatRupiah(ind.pagu)}
                          </span>
                        </div>
                        <div className="flex justify-between text-emerald-700 font-semibold">
                          <span>Realisasi:</span>
                          <span>{formatRupiah(ind.serapan)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* KOLOM 5: BOUNDARY UNIT / FAKULTAS */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  5. Unit / Fakultas ({filteredSankeyData.boundaries.length})
                </div>
                <div className="space-y-3">
                  {filteredSankeyData.boundaries.map((b) => (
                    <div
                      key={b.id}
                      ref={(el) => (nodeRefs.current[b.id] = el)}
                      onMouseEnter={() => setHoveredNodeId(b.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      className="p-3 bg-white rounded-xl border border-gray-200 shadow-xs hover:border-indigo-400 cursor-pointer transition-all space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-700">
                          {b.kode ? `[${b.kode}] ${b.namaSingkat}` : b.namaSingkat}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 uppercase font-semibold">
                          {b.type}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-gray-900" title={b.nama}>
                        {b.nama}
                      </div>
                      <div className="pt-1.5 border-t border-gray-100 space-y-0.5 text-[11px]">
                        <div className="flex justify-between text-gray-600">
                          <span>Total Uang:</span>
                          <span className="font-semibold text-gray-800">
                            {formatRupiah(b.pagu)}
                          </span>
                        </div>
                        <div className="flex justify-between text-emerald-700 font-semibold">
                          <span>Realisasi:</span>
                          <span>{formatRupiah(b.serapan)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* KOLOM 6: PROGRAM KERJA */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  6. Proker ({filteredSankeyData.prokers.length})
                </div>
                <div className="space-y-3">
                  {filteredSankeyData.prokers.map((p) => (
                    <div
                      key={p.id}
                      ref={(el) => (nodeRefs.current[p.id] = el)}
                      onMouseEnter={() => setHoveredNodeId(p.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      className="p-3 bg-white rounded-xl border border-gray-200 shadow-xs hover:border-indigo-400 cursor-pointer transition-all space-y-1.5"
                    >
                      <div
                        className="text-xs font-bold text-indigo-700 line-clamp-2"
                        title={p.namaProker}
                      >
                        {p.namaProker}
                      </div>
                      <div className="pt-1.5 border-t border-gray-100 space-y-0.5 text-[11px]">
                        <div className="flex justify-between text-gray-600">
                          <span>Total Uang:</span>
                          <span className="font-semibold text-gray-800">
                            {formatRupiah(p.pagu)}
                          </span>
                        </div>
                        <div className="flex justify-between text-emerald-700 font-semibold">
                          <span>Realisasi:</span>
                          <span>{formatRupiah(p.serapan)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* KOLOM 7: AKTIVITAS */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  7. Aktivitas ({filteredSankeyData.aktivitas.length})
                </div>
                <div className="space-y-3">
                  {filteredSankeyData.aktivitas.map((a) => (
                    <div
                      key={a.id}
                      ref={(el) => (nodeRefs.current[a.id] = el)}
                      onMouseEnter={() => setHoveredNodeId(a.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      className="p-3 bg-white rounded-xl border border-gray-200 shadow-xs hover:border-indigo-400 cursor-pointer transition-all space-y-1.5"
                    >
                      <div
                        className="text-xs font-bold text-violet-700 line-clamp-2"
                        title={a.namaAktivitas}
                      >
                        {a.namaAktivitas}
                      </div>
                      <div className="pt-1.5 border-t border-gray-100 space-y-0.5 text-[11px]">
                        <div className="flex justify-between text-gray-600">
                          <span>Total Uang:</span>
                          <span className="font-semibold text-gray-800">
                            {formatRupiah(a.pagu)}
                          </span>
                        </div>
                        <div className="flex justify-between text-emerald-700 font-semibold">
                          <span>Realisasi:</span>
                          <span>{formatRupiah(a.serapan)}</span>
                        </div>
                      </div>
                      {a.pic && (
                        <div className="text-[10px] text-gray-400 truncate">
                          PIC: {a.pic}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* KOLOM 8: KEGIATAN RAB */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  8. Kegiatan RAB ({filteredSankeyData.kegiatans.length})
                </div>
                <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
                  {filteredSankeyData.kegiatans.map((k) => (
                    <div
                      key={k.id}
                      ref={(el) => (nodeRefs.current[k.id] = el)}
                      onMouseEnter={() => setHoveredNodeId(k.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      onClick={() => setSelectedKegiatanDetail(k)}
                      className="p-2.5 bg-white rounded-xl border border-gray-200 shadow-xs hover:border-indigo-500 cursor-pointer transition-all space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            k.status === "Terlaksana"
                              ? "bg-emerald-100 text-emerald-800"
                              : k.status === "Draf"
                              ? "bg-gray-100 text-gray-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {k.status}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {k.persenSerapan}%
                        </span>
                      </div>
                      <div
                        className="text-xs font-medium text-gray-800 line-clamp-2"
                        title={k.namaKegiatan}
                      >
                        {k.namaKegiatan}
                      </div>
                      <div className="pt-1.5 border-t border-gray-100 space-y-0.5 text-[11px]">
                        <div className="flex justify-between text-gray-600">
                          <span>Total Uang:</span>
                          <span className="font-semibold text-gray-800">
                            {formatRupiah(k.anggaran)}
                          </span>
                        </div>
                        <div className="flex justify-between text-emerald-700 font-semibold">
                          <span>Realisasi:</span>
                          <span>{formatRupiah(k.realisasi)}</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-400 truncate">
                        PIC: {k.pic}
                      </div>
                    </div>
                  ))}
                  {filteredSankeyData.kegiatans.length === 0 && (
                    <div className="p-4 rounded-xl border border-dashed border-gray-200 text-center text-xs text-gray-400 italic">
                      Tidak ada kegiatan yang sesuai dengan filter
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: DIAGNOSA KUADRAN DARI TAB MATRIKS              */}
      {/* ======================================================== */}
      <Transition appear show={Boolean(selectedMatrixItem)} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setSelectedMatrixItem(null)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all space-y-4">
                  <div className="flex items-start justify-between border-b pb-3">
                    <div>
                      <div className="text-xs font-bold text-indigo-600 uppercase">
                        Diagnosa Evaluasi Kinerja Kuadran {selectedMatrixItem?.kuadran}
                      </div>
                      <Dialog.Title
                        as="h3"
                        className="text-base font-bold text-gray-900 mt-0.5"
                      >
                        {selectedMatrixItem?.nama}
                      </Dialog.Title>
                    </div>
                    <button
                      onClick={() => setSelectedMatrixItem(null)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-gray-200">
                      <span className="text-gray-500 text-[11px]">Penyerapan Anggaran:</span>
                      <div className="text-base font-bold text-gray-900 mt-0.5">
                        {formatRupiah(selectedMatrixItem?.totalSerap)}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Pagu: {formatRupiah(selectedMatrixItem?.totalPagu)} (
                        {selectedMatrixItem?.persenSerap}%)
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-gray-200">
                      <span className="text-gray-500 text-[11px]">Keterlaksanaan Kerja:</span>
                      <div className="text-base font-bold text-gray-900 mt-0.5">
                        {selectedMatrixItem?.persenKerja}%
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {selectedMatrixItem?.doneKeg} Selesai • {selectedMatrixItem?.pendingKeg} Belum
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-bold text-gray-700">
                      Daftar Kegiatan di Bawah Entitas Ini:
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                      {selectedMatrixItem?.kegiatans?.map((keg) => (
                        <div
                          key={keg.id}
                          className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-xs flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="font-semibold text-gray-900">
                              {keg.namaKegiatan}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              PIC: {keg.pic}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              keg.status === "Terlaksana"
                                ? "bg-emerald-100 text-emerald-800"
                                : keg.status === "Draf"
                                ? "bg-gray-100 text-gray-700"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {keg.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t flex items-center justify-between">
                    <button
                      onClick={() => handleTraceFromMatrix(selectedMatrixItem)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      Buka di Root Cause Tracing &rarr;
                    </button>
                    <button
                      onClick={() => setSelectedMatrixItem(null)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-50"
                    >
                      Tutup
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* ======================================================== */}
      {/* MODAL 2: RINCIAN KEGIATAN RAB LENGKAP                    */}
      {/* ======================================================== */}
      <Transition appear show={Boolean(selectedKegiatanDetail)} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setSelectedKegiatanDetail(null)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all space-y-4">
                  <div className="flex items-start justify-between border-b pb-3">
                    <div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          selectedKegiatanDetail?.status === "Terlaksana"
                            ? "bg-emerald-100 text-emerald-800"
                            : selectedKegiatanDetail?.status === "Draf"
                            ? "bg-gray-100 text-gray-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        Status: {selectedKegiatanDetail?.status}
                      </span>
                      <Dialog.Title
                        as="h3"
                        className="text-base font-bold text-gray-900 mt-1"
                      >
                        {selectedKegiatanDetail?.namaKegiatan}
                      </Dialog.Title>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Penanggung Jawab (PIC):{" "}
                        <strong className="text-gray-700">
                          {selectedKegiatanDetail?.pic}
                        </strong>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedKegiatanDetail(null)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-gray-200">
                      <span className="text-gray-500 text-[10px]">Pagu RAB:</span>
                      <div className="font-bold text-gray-900 mt-0.5">
                        {formatRupiah(selectedKegiatanDetail?.anggaran)}
                      </div>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-gray-200">
                      <span className="text-gray-500 text-[10px]">Serapan Dana:</span>
                      <div className="font-bold text-emerald-600 mt-0.5">
                        {formatRupiah(selectedKegiatanDetail?.realisasi)}
                      </div>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-gray-200">
                      <span className="text-gray-500 text-[10px]">Sisa Anggaran:</span>
                      <div className="font-bold text-amber-600 mt-0.5">
                        {formatRupiah(selectedKegiatanDetail?.sisa)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                      <strong className="text-emerald-900 block mb-0.5">
                        Capaian Hasil Kerja:
                      </strong>
                      <span className="text-emerald-800">
                        {selectedKegiatanDetail?.capaian || "Kegiatan sedang berjalan sesuai timeline."}
                      </span>
                    </div>

                    {selectedKegiatanDetail?.masalah && (
                      <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200">
                        <strong className="text-rose-900 block mb-0.5">
                          Akar Kendala / Masalah:
                        </strong>
                        <span className="text-rose-800">
                          {selectedKegiatanDetail?.masalah}
                        </span>
                      </div>
                    )}

                    {selectedKegiatanDetail?.pemecahan_masalah && (
                      <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200">
                        <strong className="text-indigo-900 block mb-0.5">
                          Rencana Tindak Lanjut:
                        </strong>
                        <span className="text-indigo-800">
                          {selectedKegiatanDetail?.pemecahan_masalah}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t text-right">
                    <button
                      onClick={() => setSelectedKegiatanDetail(null)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl"
                    >
                      Tutup
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
