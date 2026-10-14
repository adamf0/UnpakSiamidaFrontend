import React, { useState, useMemo } from "react";
import {
  BarChart3,
  PieChart,
  Layers,
  GraduationCap,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Eye,
  ChevronDown,
  Info,
  Download,
  FileSpreadsheet,
  X,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  ArrowUpDown,
  BookOpen,
  Building2,
  User,
  Clock,
  Folder,
  FolderOpen,
  ChevronsUpDown,
  ChevronUp,
  FileText,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import {
  exportAllTemuanToExcel,
  exportSpecificProdiToExcel,
  exportSpecificGroupToExcel,
  formatTargetIndikator,
} from "../utils/reportExportExcel";

export const STATUS_ORDER = [
  "belum_dibuat",
  "draf",
  "menunggu_verif_auditee",
  "tolak_auditee",
  "terima_auditee",
  "menunggu_penyelesaian",
  "tindakan_penyelesaian",
  "tutup_kts",
];

export const STATUS_KTS_CONFIG = {
  belum_dibuat: {
    key: "belum_dibuat",
    label: "Belum Dibuat",
    shortLabel: "Belum Dibuat",
    badgeClass: "bg-zinc-100 text-zinc-700 border-zinc-200",
    headerBadgeClass: "bg-zinc-100 text-zinc-700 border border-zinc-200",
    icon: AlertCircle,
  },
  draf: {
    key: "draf",
    label: "Draf",
    shortLabel: "Draf",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    headerBadgeClass: "bg-slate-100 text-slate-700 border border-slate-200",
    icon: FileText,
  },
  menunggu_verif_auditee: {
    key: "menunggu_verif_auditee",
    label: "Menunggu Verifikasi Auditee",
    shortLabel: "Verif Auditee",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-200",
    headerBadgeClass: "bg-orange-100 text-orange-800 border border-orange-200",
    icon: Clock,
  },
  tolak_auditee: {
    key: "tolak_auditee",
    label: "Ditolak Auditee",
    shortLabel: "Ditolak",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
    headerBadgeClass: "bg-rose-100 text-rose-800 border border-rose-200",
    icon: XCircle,
  },
  terima_auditee: {
    key: "terima_auditee",
    label: "Diterima Auditee",
    shortLabel: "Diterima",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
    headerBadgeClass: "bg-blue-100 text-blue-800 border border-blue-200",
    icon: CheckCircle2,
  },
  menunggu_penyelesaian: {
    key: "menunggu_penyelesaian",
    label: "Menunggu Penyelesaian",
    shortLabel: "Tunggu Solusi",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-200",
    headerBadgeClass: "bg-purple-100 text-purple-800 border border-purple-200",
    icon: Clock,
  },
  tindakan_penyelesaian: {
    key: "tindakan_penyelesaian",
    label: "Tindakan Penyelesaian",
    shortLabel: "Tindakan Solusi",
    badgeClass: "bg-teal-100 text-teal-800 border-teal-200",
    headerBadgeClass: "bg-teal-100 text-teal-800 border border-teal-200",
    icon: CheckCircle2,
  },
  tutup_kts: {
    key: "tutup_kts",
    label: "Closed (Tutup KTS)",
    shortLabel: "Closed",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200 font-medium",
    headerBadgeClass: "bg-emerald-100 text-emerald-800 border border-emerald-200 font-medium",
    icon: CheckCircle2,
  },
};

export function normalizeStatusKey(item) {
  if (!item) return "draf";
  const rawStatus = (item.Status || "").toLowerCase().trim();
  const rawKet = (item.Keterangan || "").toLowerCase().trim();
  if (rawStatus === "tutup_kts" || rawKet === "close") {
    return "tutup_kts";
  }
  if (!rawStatus) return "draf";
  return rawStatus;
}

export function getStatusMeta(statusKey) {
  if (STATUS_KTS_CONFIG[statusKey]) {
    return STATUS_KTS_CONFIG[statusKey];
  }
  const formatted = String(statusKey || "Draf")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    key: statusKey,
    label: formatted,
    shortLabel: formatted,
    badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
    headerBadgeClass: "bg-gray-100 text-gray-700 border border-gray-200",
    icon: Clock,
  };
}

export default function TemuanCharts({
  tahun = "2024",
  jenjangData = [],
  jenjangProdiData = [],
  rawTemuan = [],
  loading = false,
}) {
  // Filters & State
  const [searchProdi, setSearchProdi] = useState("");
  const [sortBy, setSortBy] = useState("total-desc");
  const [selectedProdiModal, setSelectedProdiModal] = useState(null);
  const [modalTagFilter, setModalTagFilter] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [prodiPage, setProdiPage] = useState(1);
  const prodiPageSize = 10;

  // Grouped table states (per Fakultas / Unit)
  const [expandedGroups, setExpandedGroups] = useState({});
  const [selectedSubFilter, setSelectedSubFilter] = useState({});
  const [groupTypeFilter, setGroupTypeFilter] = useState("all"); // "all" | "fakultas" | "unit"
  const [groupPages, setGroupPages] = useState({});
  const [groupTagFilter, setGroupTagFilter] = useState({}); // { [groupKey]: { type: 'klasifikasi'|'status', value: string, label: string } }

  // Overall metrics calculation
  const overallMetrics = useMemo(() => {
    let major = 0;
    let minor = 0;
    let observe = 0;
    let closed = 0;
    const statusCounts = {};

    rawTemuan.forEach((item) => {
      const k = (item.Klasifikasi || "").toLowerCase().trim();
      if (k === "major") major++;
      else if (k === "minor") minor++;
      else if (k === "observe") observe++;

      const sKey = normalizeStatusKey(item);
      statusCounts[sKey] = (statusCounts[sKey] || 0) + 1;

      if (sKey === "tutup_kts") {
        closed++;
      }
    });

    const total = major + minor + observe;
    return {
      total,
      major,
      minor,
      observe,
      closed,
      open: total - closed,
      statusCounts,
      closedPercent: total > 0 ? Math.round((closed / total) * 100) : 0,
      majorPercent: total > 0 ? Math.round((major / total) * 100) : 0,
      minorPercent: total > 0 ? Math.round((minor / total) * 100) : 0,
      observePercent: total > 0 ? Math.round((observe / total) * 100) : 0,
    };
  }, [rawTemuan]);

  // Filtered & sorted Prodi data for Cards
  const filteredProdiData = useMemo(() => {
    let result = [...jenjangProdiData];

    if (searchProdi.trim()) {
      const q = searchProdi.toLowerCase();
      result = result.filter(
        (p) =>
          p.target.toLowerCase().includes(q) ||
          p.jenjang.toLowerCase().includes(q) ||
          p.fakultas.toLowerCase().includes(q)
      );
    }

    if (sortBy === "total-desc") {
      result.sort((a, b) => b.total - a.total);
    } else if (sortBy === "major-desc") {
      result.sort((a, b) => b.major - a.major || b.total - a.total);
    } else if (sortBy === "minor-desc") {
      result.sort((a, b) => b.minor - a.minor || b.total - a.total);
    } else if (sortBy === "observe-desc") {
      result.sort((a, b) => b.observe - a.observe || b.total - a.total);
    } else if (sortBy === "name-asc") {
      result.sort((a, b) => a.target.localeCompare(b.target));
    }

    return result;
  }, [jenjangProdiData, searchProdi, sortBy]);

  const totalProdiPages = Math.ceil(filteredProdiData.length / prodiPageSize);
  const paginatedProdiData = useMemo(() => {
    return filteredProdiData.slice((prodiPage - 1) * prodiPageSize, prodiPage * prodiPageSize);
  }, [filteredProdiData, prodiPage, prodiPageSize]);

  // Raw temuan for Hierarchical Detail Table (all findings)
  const filteredRawTemuan = rawTemuan;

  // Export handlers
  const handleExportAll = async () => {
    try {
      setExporting(true);
      await exportAllTemuanToExcel({
        tahun,
        jenjangProdiData,
        hierarchicalUnitGroups,
        rawTemuan,
      });
    } catch (err) {
      console.error("Gagal export excel:", err);
      alert("Gagal mengunduh file Excel: " + (err.message || "Error"));
    } finally {
      setExporting(false);
    }
  };

  const handleExportProdi = async (pItem, e) => {
    if (e) e.stopPropagation();
    try {
      setExporting(true);
      await exportSpecificProdiToExcel({
        tahun,
        prodi: pItem,
        items: pItem.items || [],
      });
    } catch (err) {
      console.error("Gagal export prodi excel:", err);
      alert("Gagal mengunduh file Excel Prodi: " + (err.message || "Error"));
    } finally {
      setExporting(false);
    }
  };

  // Grouping helper: format Fakultas title
  const formatFakultasName = (raw) => {
    if (!raw) return "Lainnya";
    const s = String(raw).trim();
    const lower = s.toLowerCase();
    if (lower === "hukum") return "Fakultas Hukum";
    if (lower === "kip" || lower === "fkip") return "Fakultas Keguruan dan Ilmu Pendidikan (FKIP)";
    if (lower === "ekonomi" || lower === "feb") return "Fakultas Ekonomi dan Bisnis (FEB)";
    if (lower === "teknik" || lower === "ft") return "Fakultas Teknik (FT)";
    if (lower === "mipa" || lower === "fmipa") return "Fakultas MIPA (FMIPA)";
    if (lower === "ilmu sosial dan ilmu budaya" || lower === "fisib") return "Fakultas Ilmu Sosial dan Ilmu Budaya (FISIB)";
    if (lower === "pascasarjana") return "Sekolah Pascasarjana";
    if (lower === "vokasi") return "Sekolah Vokasi";
    if (!lower.startsWith("fakultas") && !lower.startsWith("sekolah") && !lower.startsWith("unit")) {
      return `Fakultas ${s}`;
    }
    return s;
  };

  // Helper: clean jenjang extraction
  const getCleanJenjang = (item) => {
    const raw = (item.Jenjang || "").trim();
    if (raw) {
      if (raw.toLowerCase() === "profesi") return "Profesi";
      if (raw.toLowerCase() === "spesialis") return "Spesialis";
      return raw.toUpperCase();
    }
    const match = (item.Target || "").match(/\((S1|S2|S3|D3|D4|Profesi|Spesialis)\)/i);
    if (match) return match[1].toUpperCase();
    if (item.Type === "fakultas") return "Fakultas";
    if (item.Type === "unit") return "Unit";
    return "Lainnya";
  };

  // Hierarchical grouping: Fakultas (Dekanat + Prodis) and Unit Kerja
  const hierarchicalUnitGroups = useMemo(() => {
    const groupsMap = {};

    filteredRawTemuan.forEach((item) => {
      // 1. Identify Group Key & Title
      let groupKey = "";
      let groupTitle = "";
      let groupType = "unit"; // "fakultas" | "unit"

      const hasFakultas = item.Fakultas && item.Fakultas.trim() !== "" && item.Fakultas.trim() !== "-";

      if (hasFakultas) {
        groupKey = `FAK_${item.Fakultas.trim().toUpperCase()}`;
        groupTitle = formatFakultasName(item.Fakultas);
        groupType = "fakultas";
      } else if (item.Type === "fakultas") {
        groupKey = `FAK_${(item.Target || "FAKULTAS").trim().toUpperCase()}`;
        groupTitle = formatFakultasName(item.Target);
        groupType = "fakultas";
      } else if (item.Type === "unit") {
        groupKey = `UNIT_${(item.Target || "UNIT").trim().toUpperCase()}`;
        groupTitle = item.Target || "Unit Kerja";
        groupType = "unit";
      } else {
        const targetClean = (item.Target || "Unit Kerja").trim();
        groupKey = `UNIT_${targetClean.toUpperCase()}`;
        groupTitle = targetClean;
        groupType = "unit";
      }

      if (!groupsMap[groupKey]) {
        groupsMap[groupKey] = {
          key: groupKey,
          title: groupTitle,
          type: groupType,
          total: 0,
          major: 0,
          minor: 0,
          observe: 0,
          closed: 0,
          statusCounts: {},
          subGroupsMap: {},
        };
      }

      const grp = groupsMap[groupKey];

      // 2. Identify SubGroup Key & Title
      let subKey = "";
      let subTitle = "";
      let subJenjang = "";

      if (groupType === "fakultas") {
        const isDekanat =
          item.Type === "fakultas" ||
          (!item.Jenjang && !item.Target.includes("("));

        if (isDekanat) {
          subKey = "DEKANAT";
          subTitle = "Tingkat Fakultas (Dekanat)";
          subJenjang = "Fakultas";
        } else {
          subKey = `PRODI_${(item.Target || "PRODI").trim().toUpperCase()}`;
          subTitle = item.Target || "Program Studi";
          subJenjang = getCleanJenjang(item);
        }
      } else {
        subKey = `UNIT_SUB_${(item.Target || "MAIN").trim().toUpperCase()}`;
        subTitle = item.Target || "Unit Kerja";
        subJenjang = "Unit";
      }

      if (!grp.subGroupsMap[subKey]) {
        grp.subGroupsMap[subKey] = {
          key: subKey,
          title: subTitle,
          jenjang: subJenjang,
          total: 0,
          major: 0,
          minor: 0,
          observe: 0,
          closed: 0,
          statusCounts: {},
          items: [],
        };
      }

      const sub = grp.subGroupsMap[subKey];

      // Klasifikasi & Status
      const klas = (item.Klasifikasi || "").toLowerCase().trim();
      const sKey = normalizeStatusKey(item);

      if (klas === "major") {
        sub.major++;
        grp.major++;
      } else if (klas === "minor") {
        sub.minor++;
        grp.minor++;
      } else if (klas === "observe") {
        sub.observe++;
        grp.observe++;
      }

      sub.total++;
      grp.total++;

      sub.statusCounts[sKey] = (sub.statusCounts[sKey] || 0) + 1;
      grp.statusCounts[sKey] = (grp.statusCounts[sKey] || 0) + 1;

      if (sKey === "tutup_kts") {
        sub.closed++;
        grp.closed++;
      }

      sub.items.push(item);
    });

    // 3. Convert subGroupsMap to sorted Array
    const jenjangSortOrder = ["Fakultas", "S1", "S2", "S3", "D3", "D4", "Profesi", "Unit", "Lainnya"];

    const facultyOrder = [
      "FAKULTAS HUKUM",
      "FAKULTAS KEGURUAN DAN ILMU PENDIDIKAN (FKIP)",
      "FAKULTAS EKONOMI DAN BISNIS (FEB)",
      "FAKULTAS TEKNIK (FT)",
      "FAKULTAS MIPA (FMIPA)",
      "FAKULTAS ILMU SOSIAL DAN ILMU BUDAYA (FISIB)",
      "SEKOLAH PASCASARJANA",
      "SEKOLAH VOKASI",
    ];

    const result = Object.values(groupsMap).map((grp) => {
      const subGroups = Object.values(grp.subGroupsMap).sort((a, b) => {
        if (a.key === "DEKANAT") return -1;
        if (b.key === "DEKANAT") return 1;
        const idxA = jenjangSortOrder.indexOf(a.jenjang);
        const idxB = jenjangSortOrder.indexOf(b.jenjang);
        if (idxA !== -1 && idxB !== -1 && idxA !== idxB) return idxA - idxB;
        if (idxA !== -1 && idxB === -1) return -1;
        if (idxB !== -1 && idxA === -1) return 1;
        return a.title.localeCompare(b.title);
      });

      return {
        ...grp,
        subGroups,
      };
    });

    // 4. Sort Groups (Fakultas first with standard order, then Unit alphabetically)
    result.sort((a, b) => {
      if (a.type === "fakultas" && b.type !== "fakultas") return -1;
      if (a.type !== "fakultas" && b.type === "fakultas") return 1;

      if (a.type === "fakultas" && b.type === "fakultas") {
        const idxA = facultyOrder.indexOf(a.title.toUpperCase());
        const idxB = facultyOrder.indexOf(b.title.toUpperCase());
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.title.localeCompare(b.title);
      }

      return a.title.localeCompare(b.title);
    });

    return result;
  }, [filteredRawTemuan]);

  // Filtered groups based on groupTypeFilter
  const displayedGroups = useMemo(() => {
    if (groupTypeFilter === "fakultas") {
      return hierarchicalUnitGroups.filter((g) => g.type === "fakultas");
    }
    if (groupTypeFilter === "unit") {
      return hierarchicalUnitGroups.filter((g) => g.type === "unit");
    }
    return hierarchicalUnitGroups;
  }, [hierarchicalUnitGroups, groupTypeFilter]);

  const countFakultasGroups = useMemo(() => {
    return hierarchicalUnitGroups.filter((g) => g.type === "fakultas").length;
  }, [hierarchicalUnitGroups]);

  const countUnitGroups = useMemo(() => {
    return hierarchicalUnitGroups.filter((g) => g.type === "unit").length;
  }, [hierarchicalUnitGroups]);

  // Hierarchical group handlers
  const toggleGroup = (groupKey) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const handleExpandAll = () => {
    const all = {};
    displayedGroups.forEach((g) => {
      all[g.key] = true;
    });
    setExpandedGroups(all);
  };

  const handleCollapseAll = () => {
    setExpandedGroups({});
  };

  const handleSubFilterChange = (groupKey, subKey) => {
    setSelectedSubFilter((prev) => ({
      ...prev,
      [groupKey]: subKey,
    }));
    setGroupPages((prev) => ({
      ...prev,
      [groupKey]: 1,
    }));
  };

  const handleToggleTagFilter = (groupKey, type, value, label, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Pastikan accordion grup ini terbuka agar tabel langsung terlihat
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: true,
    }));

    // Reset pagination grup ini ke halaman 1
    setGroupPages((prev) => ({
      ...prev,
      [groupKey]: 1,
    }));

    setGroupTagFilter((prev) => {
      const current = prev[groupKey];
      // Jika tag yang sama diklik lagi, batalkan filter (tampilkan semua)
      if (current && current.type === type && current.value === value) {
        return {
          ...prev,
          [groupKey]: null,
        };
      }
      return {
        ...prev,
        [groupKey]: { type, value, label },
      };
    });
  };

  const handleOpenProdiModalWithFilter = (p, type, value, label, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSelectedProdiModal(p);
    setModalTagFilter({ type, value, label });
  };

  const handleToggleModalTagFilter = (type, value, label) => {
    setModalTagFilter((prev) => {
      if (prev && prev.type === type && prev.value === value) {
        return null;
      }
      return { type, value, label };
    });
  };

  const handleExportGroup = async (group, e) => {
    if (e) e.stopPropagation();
    try {
      setExporting(true);
      await exportSpecificGroupToExcel({
        tahun,
        group,
      });
    } catch (err) {
      console.error("Gagal export grup excel:", err);
      alert("Gagal mengunduh file Excel: " + (err.message || "Error"));
    } finally {
      setExporting(false);
    }
  };

  const getJenjangBadgeStyle = (jenjang) => {
    const j = (jenjang || "").toUpperCase();
    if (j === "S1") return "bg-blue-50 text-blue-700 border-blue-200";
    if (j === "S2") return "bg-purple-50 text-purple-700 border-purple-200";
    if (j === "S3") return "bg-indigo-50 text-indigo-700 border-indigo-200";
    if (j === "D3") return "bg-amber-50 text-amber-700 border-amber-200";
    if (j === "D4") return "bg-orange-50 text-orange-700 border-orange-200";
    if (j.includes("PROFESI")) return "bg-rose-50 text-rose-700 border-rose-200";
    if (j === "FAKULTAS") return "bg-slate-100 text-slate-700 border-slate-200";
    if (j === "UNIT") return "bg-teal-50 text-teal-700 border-teal-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  // Loading state
  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-16 text-center shadow-xs">
        <div className="inline-block h-9 w-9 animate-spin rounded-full border-3 border-blue-600 border-r-transparent mb-3" />
        <h4 className="text-sm font-semibold text-gray-800">Menghitung & Memproses Data Temuan...</h4>
        <p className="text-xs text-gray-500 mt-1">Mengumpulkan akumulasi temuan KTS berdasarkan Jenjang dan Prodi</p>
      </div>
    );
  }

  // Empty state
  if (rawTemuan.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-white p-14 text-center shadow-xs">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
          <BarChart3 size={28} />
        </div>
        <h4 className="text-base font-bold text-gray-900">Belum Ada Temuan KTS</h4>
        <p className="text-xs text-gray-500 mt-1.5 max-w-md mx-auto">
          Tidak ditemukan temuan audit dengan klasifikasi Minor, Major, atau Observe pada tahun {tahun}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* TOOLBAR HEADER & EXPORT ACTIONS                           */}
      {/* ========================================================= */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-white/10 rounded-xl backdrop-blur-xs text-blue-200">
              <BarChart3 size={22} />
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                Analitik & Visualisasi Grafik Temuan KTS
              </h2>
              <p className="text-xs text-blue-200/80 mt-0.5">
                Tahun Renstra {tahun} • Total {overallMetrics.total.toLocaleString()} Temuan Teridentifikasi
              </p>
            </div>
          </div>
        </div>

        {/* EXPORT ALL EXCEL BUTTON */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleExportAll}
            disabled={exporting}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-60 cursor-pointer"
            title="Download seluruh data laporan dalam file Excel (.xlsx) dengan 4 lembar kerja (Ringkasan, Jenjang, Prodi, dan Detail)"
          >
            <FileSpreadsheet size={16} />
            <span>{exporting ? "Menyiapkan Excel..." : "Export Semua (XLSX)"}</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* METRIC KPI SUMMARY CARDS                                  */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* TOTAL TEMUAN */}
        <div className="p-4 rounded-xl border border-gray-100 bg-white shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Temuan</span>
            <Layers size={16} className="text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{overallMetrics.total.toLocaleString()}</div>
          <p className="text-[11px] text-gray-500 mt-1">Akumulasi seluruh jenjang</p>
        </div>

        {/* MAJOR */}
        <div className="p-4 rounded-xl border border-red-200/70 bg-red-50/50 shadow-xs">
          <div className="flex items-center justify-between text-red-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Major</span>
            <ShieldAlert size={16} className="text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-700">{overallMetrics.major.toLocaleString()}</div>
          <p className="text-[11px] text-red-600/80 mt-1 font-medium">
            {overallMetrics.majorPercent}% dari total
          </p>
        </div>

        {/* MINOR */}
        <div className="p-4 rounded-xl border border-amber-200/70 bg-amber-50/50 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Minor</span>
            <AlertCircle size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700">{overallMetrics.minor.toLocaleString()}</div>
          <p className="text-[11px] text-amber-600/80 mt-1 font-medium">
            {overallMetrics.minorPercent}% dari total
          </p>
        </div>

        {/* OBSERVE */}
        <div className="p-4 rounded-xl border border-sky-200/70 bg-sky-50/50 shadow-xs">
          <div className="flex items-center justify-between text-sky-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Observe</span>
            <Eye size={16} className="text-sky-500" />
          </div>
          <div className="text-2xl font-bold text-sky-700">{overallMetrics.observe.toLocaleString()}</div>
          <p className="text-[11px] text-sky-600/80 mt-1 font-medium">
            {overallMetrics.observePercent}% dari total
          </p>
        </div>

        {/* CLOSED RATE */}
        <div className="p-4 rounded-xl border border-emerald-200/70 bg-emerald-50/50 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Closed KTS</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{overallMetrics.closed.toLocaleString()}</div>
          <div className="w-full bg-emerald-200/60 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              style={{ width: `${overallMetrics.closedPercent}%` }}
              className="bg-emerald-600 h-full rounded-full"
            />
          </div>
          <p className="text-[10px] text-emerald-700 mt-1">
            {overallMetrics.closedPercent}% ({overallMetrics.closed}/{overallMetrics.total}) selesai
          </p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION 1: RINCIAN SPESIFIK TEMUAN: JENJANG x PRODI       */}
      {/* ========================================================= */}
      <div className="rounded-2xl border bg-white p-5 sm:p-6 shadow-xs space-y-4">
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-3.5 border-b border-gray-100 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                <BarChart3 size={20} />
              </span>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  1. Rincian Spesifik Temuan: Jenjang &times; Program Studi
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Data spesifik temuan per Program Studi & Unit. Klik pada kartu untuk melihat rincian temuan audit.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT CONTROLS: SEARCH & SORT */}
          <div className="flex flex-wrap items-center gap-2">
            {/* SEARCH PRODI INPUT */}
            <div className="relative min-w-[210px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari program studi / unit..."
                value={searchProdi}
                onChange={(e) => {
                  setSearchProdi(e.target.value);
                  setProdiPage(1);
                }}
                className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-gray-200 text-xs bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-hidden"
              />
              {searchProdi && (
                <button
                  onClick={() => {
                    setSearchProdi("");
                    setProdiPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* SORT SELECTOR */}
            <div className="flex items-center gap-1.5 text-xs">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-700 bg-white outline-hidden cursor-pointer hover:border-gray-300"
              >
                <option value="total-desc">Temuan Terbanyak</option>
                <option value="major-desc">Major Terbanyak</option>
                <option value="minor-desc">Minor Terbanyak</option>
                <option value="observe-desc">Observe Terbanyak</option>
                <option value="name-asc">Nama Prodi (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* COLOR LEGEND & COUNTER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs bg-gray-50/80 px-3.5 py-2 rounded-xl gap-2">
          <span className="text-gray-500 font-medium">
            Menampilkan {paginatedProdiData.length} dari {filteredProdiData.length} Program Studi / Unit
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-gray-600 font-medium">Major</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-gray-600 font-medium">Minor</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              <span className="text-gray-600 font-medium">Observe</span>
            </span>
          </div>
        </div>

        {/* PRODI CARDS GRID (MIRRORING SECTION 1 ACCORDING TO USER'S REQUEST) */}
        {filteredProdiData.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-400 border border-dashed rounded-xl">
            Tidak ada data program studi yang sesuai dengan kata kunci pencarian.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {paginatedProdiData.map((p, idx) => {
              const majorWidth = p.total > 0 ? (p.major / p.total) * 100 : 0;
              const minorWidth = p.total > 0 ? (p.minor / p.total) * 100 : 0;
              const observeWidth = p.total > 0 ? (p.observe / p.total) * 100 : 0;
              const actualIdx = (prodiPage - 1) * prodiPageSize + idx + 1;
              const badgeStyle = getJenjangBadgeStyle(p.jenjang);

              return (
                <div
                  key={p.key}
                  onClick={() => setSelectedProdiModal(p)}
                  className="p-4 rounded-xl border border-gray-200/90 hover:border-purple-400 hover:bg-purple-50/15 hover:shadow-xs transition group flex flex-col justify-between cursor-pointer bg-white"
                >
                  <div>
                    {/* CARD HEADER */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="text-xs font-bold text-gray-400 w-5">
                          #{actualIdx}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${badgeStyle}`}>
                          {p.jenjang}
                        </span>
                        <h4 className="text-sm font-bold text-gray-900 group-hover:text-purple-900 transition line-clamp-1" title={p.target}>
                          {p.target}
                        </h4>
                      </div>

                      {/* EXPORT SPESIFIK BUTTON */}
                      <button
                        onClick={(e) => handleExportProdi(p, e)}
                        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition border border-emerald-200 cursor-pointer"
                        title={`Export data temuan ${p.target} ke Excel (.xlsx)`}
                      >
                        <FileSpreadsheet size={13} />
                        <span>Export XLSX</span>
                      </button>
                    </div>

                    {p.fakultas && p.fakultas !== "-" && (
                      <p className="text-[11px] text-gray-500 mb-2 truncate">
                        Fakultas: {p.fakultas}
                      </p>
                    )}

                    {/* METRIC PILLS (4 COLUMNS LIKE OLD SECTION 1) */}
                    <div className="grid grid-cols-4 gap-2 text-center my-3">
                      <button
                        type="button"
                        onClick={(e) => handleOpenProdiModalWithFilter(p, "klasifikasi", "major", "Major", e)}
                        className="p-2 rounded-lg bg-red-50/70 hover:bg-red-100 border border-red-100 transition cursor-pointer text-left sm:text-center group/btn"
                        title="Klik untuk melihat hanya temuan Major prodi ini"
                      >
                        <div className="text-xs text-red-600 font-medium group-hover/btn:underline">Major</div>
                        <div className="text-sm font-bold text-red-700">{p.major}</div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleOpenProdiModalWithFilter(p, "klasifikasi", "minor", "Minor", e)}
                        className="p-2 rounded-lg bg-amber-50/70 hover:bg-amber-100 border border-amber-100 transition cursor-pointer text-left sm:text-center group/btn"
                        title="Klik untuk melihat hanya temuan Minor prodi ini"
                      >
                        <div className="text-xs text-amber-600 font-medium group-hover/btn:underline">Minor</div>
                        <div className="text-sm font-bold text-amber-700">{p.minor}</div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleOpenProdiModalWithFilter(p, "klasifikasi", "observe", "Observe", e)}
                        className="p-2 rounded-lg bg-sky-50/70 hover:bg-sky-100 border border-sky-100 transition cursor-pointer text-left sm:text-center group/btn"
                        title="Klik untuk melihat hanya temuan Observe prodi ini"
                      >
                        <div className="text-xs text-sky-600 font-medium group-hover/btn:underline">Observe</div>
                        <div className="text-sm font-bold text-sky-700">{p.observe}</div>
                      </button>
                      <div className="p-2 rounded-lg bg-gray-100 border border-gray-200">
                        <div className="text-xs text-gray-600 font-medium">Total</div>
                        <div className="text-sm font-bold text-gray-900">{p.total}</div>
                      </div>
                    </div>

                    {/* STATUS TAGS FOR THIS PRODI */}
                    <div className="flex items-center gap-1.5 flex-wrap my-2.5">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        Status:
                      </span>
                      {STATUS_ORDER.map((sKey) => {
                        const sCount = p.statusCounts?.[sKey] || 0;
                        if (sCount <= 0) return null;
                        const meta = getStatusMeta(sKey);
                        const IconComp = meta.icon;
                        return (
                          <button
                            type="button"
                            key={sKey}
                            onClick={(e) => handleOpenProdiModalWithFilter(p, "status", sKey, meta.label, e)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium inline-flex items-center gap-1 border transition hover:scale-105 active:scale-95 cursor-pointer ${meta.badgeClass}`}
                            title={`${sCount} Temuan berstatus ${meta.label} (Klik untuk filter)`}
                          >
                            {IconComp && <IconComp size={10} />}
                            <span>{sCount} {meta.shortLabel}</span>
                          </button>
                        );
                      })}
                      {Object.entries(p.statusCounts || {})
                        .filter(([k, v]) => !STATUS_ORDER.includes(k) && v > 0)
                        .map(([k, v]) => {
                          const meta = getStatusMeta(k);
                          const IconComp = meta.icon;
                          return (
                            <button
                              type="button"
                              key={k}
                              onClick={(e) => handleOpenProdiModalWithFilter(p, "status", k, meta.label, e)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium inline-flex items-center gap-1 border transition hover:scale-105 active:scale-95 cursor-pointer ${meta.badgeClass}`}
                              title={`${v} Temuan berstatus ${meta.label} (Klik untuk filter)`}
                            >
                              {IconComp && <IconComp size={10} />}
                              <span>{v} {meta.shortLabel}</span>
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  {/* STACKED COMPARATIVE BAR */}
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                      <span>Distribusi Klasifikasi Temuan</span>
                      <span className="font-semibold text-gray-700">
                        {Math.round((p.total / overallMetrics.total) * 100)}% dari univ ({p.total} / {overallMetrics.total})
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-lg h-4 overflow-hidden flex shadow-inner">
                      {p.major > 0 && (
                        <div
                          style={{ width: `${majorWidth}%` }}
                          className="bg-red-500 h-full flex items-center justify-center text-[9px] text-white font-bold"
                          title={`Major: ${p.major} (${Math.round(majorWidth)}%)`}
                        >
                          {majorWidth >= 15 && p.major}
                        </div>
                      )}
                      {p.minor > 0 && (
                        <div
                          style={{ width: `${minorWidth}%` }}
                          className="bg-amber-500 h-full flex items-center justify-center text-[9px] text-white font-bold"
                          title={`Minor: ${p.minor} (${Math.round(minorWidth)}%)`}
                        >
                          {minorWidth >= 15 && p.minor}
                        </div>
                      )}
                      {p.observe > 0 && (
                        <div
                          style={{ width: `${observeWidth}%` }}
                          className="bg-sky-500 h-full flex items-center justify-center text-[9px] text-white font-bold"
                          title={`Observe: ${p.observe} (${Math.round(observeWidth)}%)`}
                        >
                          {observeWidth >= 15 && p.observe}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* PAGINATION CONTROLS FOR PRODI CARDS */}
        {totalProdiPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-gray-100 text-xs text-gray-500">
            <div>
              Menampilkan{" "}
              <span className="font-semibold text-gray-700">
                {(prodiPage - 1) * prodiPageSize + 1}
              </span>{" "}
              s/d{" "}
              <span className="font-semibold text-gray-700">
                {Math.min(prodiPage * prodiPageSize, filteredProdiData.length)}
              </span>{" "}
              dari{" "}
              <span className="font-semibold text-gray-700">{filteredProdiData.length}</span> Program Studi / Unit
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={prodiPage === 1}
                onClick={() => setProdiPage((prev) => Math.max(1, prev - 1))}
                className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Sebelumnya
              </button>

              <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800 font-semibold text-xs">
                {prodiPage} / {totalProdiPages}
              </span>

              <button
                disabled={prodiPage === totalProdiPages}
                onClick={() => setProdiPage((prev) => Math.min(totalProdiPages, prev + 1))}
                className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* SECTION 2: TABEL DATA LENGKAP TEMUAN KTS                  */}
      {/* ========================================================= */}
      <div className="rounded-2xl border bg-white p-5 sm:p-6 shadow-xs space-y-5">
        {/* SECTION HEADER & TOP CONTROLS */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between pb-4 border-b border-gray-100 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <BookOpen size={20} />
              </span>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  2. Tabel Data Lengkap Temuan KTS (Dikelompokkan per Unit & Fakultas)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Dikelompokkan secara hierarkis per Fakultas (Dekanat & Program Studi per Jenjang) serta Unit Kerja non-fakultas
                </p>
              </div>
            </div>
          </div>

            {/* RIGHT CONTROLS: ENTITY FILTER PILLS & EXPAND/COLLAPSE ALL */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
              {/* ENTITY TYPE FILTER */}
              <div className="flex items-center p-1 bg-gray-100 rounded-xl text-xs font-medium text-gray-600">
                <button
                  onClick={() => setGroupTypeFilter("all")}
                  className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
                    groupTypeFilter === "all"
                      ? "bg-white text-gray-900 shadow-2xs font-bold"
                      : "hover:text-gray-900"
                  }`}
                >
                  Semua ({hierarchicalUnitGroups.length})
                </button>
                <button
                  onClick={() => setGroupTypeFilter("fakultas")}
                  className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
                    groupTypeFilter === "fakultas"
                      ? "bg-white text-gray-900 shadow-2xs font-bold"
                      : "hover:text-gray-900"
                  }`}
                >
                  Fakultas ({countFakultasGroups})
                </button>
                <button
                  onClick={() => setGroupTypeFilter("unit")}
                  className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
                    groupTypeFilter === "unit"
                      ? "bg-white text-gray-900 shadow-2xs font-bold"
                      : "hover:text-gray-900"
                  }`}
                >
                  Unit Kerja ({countUnitGroups})
                </button>
              </div>

              {/* BUKA / TUTUP SEMUA */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleExpandAll}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition cursor-pointer"
                  title="Buka seluruh kelompok entitas"
                >
                  Buka Semua
                </button>
                <button
                  onClick={handleCollapseAll}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition cursor-pointer"
                  title="Tutup seluruh kelompok entitas"
                >
                  Tutup Semua
                </button>
              </div>
            </div>
          </div>

          {/* GROUPS LIST (ACCORDION CARDS) */}
          {displayedGroups.length === 0 ? (
            <div className="p-12 text-center border border-dashed rounded-xl bg-gray-50/50">
              <p className="text-sm font-semibold text-gray-600">Tidak ada data unit atau fakultas yang sesuai filter</p>
              <p className="text-xs text-gray-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter klasifikasi Anda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedGroups.map((group) => {
                const isExpanded = !!expandedGroups[group.key];
                const currentSubKey = selectedSubFilter[group.key] || "all";
                const activeTag = groupTagFilter[group.key] || null;

                // Active items for this group
                let activeItems = [];
                if (currentSubKey === "all") {
                  activeItems = group.subGroups.flatMap((s) =>
                    s.items.map((item) => ({
                      ...item,
                      _subTitle: s.title,
                      _subJenjang: s.jenjang,
                    }))
                  );
                } else {
                  const activeSub = group.subGroups.find((s) => s.key === currentSubKey);
                  if (activeSub) {
                    activeItems = activeSub.items.map((item) => ({
                      ...item,
                      _subTitle: activeSub.title,
                      _subJenjang: activeSub.jenjang,
                    }));
                  }
                }

                // Filter by activeTag (Klasifikasi atau Status KTS)
                if (activeTag) {
                  if (activeTag.type === "klasifikasi") {
                    activeItems = activeItems.filter(
                      (item) => (item.Klasifikasi || "").toLowerCase().trim() === activeTag.value
                    );
                  } else if (activeTag.type === "status") {
                    activeItems = activeItems.filter(
                      (item) => normalizeStatusKey(item) === activeTag.value
                    );
                  }
                }

                // Card pagination
                const cardPageSize = 15;
                const currentCardPage = groupPages[group.key] || 1;
                const totalCardPages = Math.ceil(activeItems.length / cardPageSize);
                const paginatedItems = activeItems.slice(
                  (currentCardPage - 1) * cardPageSize,
                  currentCardPage * cardPageSize
                );

                return (
                  <div
                    key={group.key}
                    className="rounded-2xl border border-gray-200/90 bg-white shadow-2xs transition hover:border-gray-300 overflow-hidden"
                  >
                    {/* GROUP CARD HEADER */}
                    <div
                      onClick={() => toggleGroup(group.key)}
                      className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer transition select-none ${
                        isExpanded ? "bg-slate-50/80 border-b border-gray-200" : "bg-white hover:bg-gray-50/60"
                      }`}
                    >
                      {/* LEFT: ICON & TITLE */}
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2.5 rounded-xl ${
                            group.type === "fakultas"
                              ? "bg-indigo-100/70 text-indigo-700"
                              : "bg-teal-100/70 text-teal-700"
                          }`}
                        >
                          {group.type === "fakultas" ? <Building2 size={22} /> : <Layers size={22} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm sm:text-base font-bold text-gray-900">{group.title}</h4>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                group.type === "fakultas"
                                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                  : "bg-teal-50 text-teal-700 border border-teal-200"
                              }`}
                            >
                              {group.type === "fakultas" ? "Fakultas" : "Unit Kerja"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {group.subGroups.length}{" "}
                            {group.type === "fakultas" ? "Sub-Unit / Prodi" : "Bagian"} • Total{" "}
                            <span className="font-semibold text-gray-800">{group.total}</span> temuan
                          </p>
                        </div>
                      </div>

                      {/* RIGHT: BADGES & ACTIONS */}
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between md:justify-end">
                        {/* METRIC BADGES / BUTTONS */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {group.major > 0 && (() => {
                            const isTagActive = activeTag?.type === "klasifikasi" && activeTag?.value === "major";
                            return (
                              <button
                                type="button"
                                onClick={(e) => handleToggleTagFilter(group.key, "klasifikasi", "major", "Major", e)}
                                className={`px-2 py-0.5 rounded-md font-bold text-[11px] inline-flex items-center gap-1 transition-all cursor-pointer ${
                                  isTagActive
                                    ? "bg-red-600 text-white ring-2 ring-red-400 ring-offset-1 shadow-xs scale-105"
                                    : "bg-red-100 text-red-800 hover:bg-red-200 hover:scale-105 active:scale-95"
                                }`}
                                title={isTagActive ? "Klik untuk membatalkan filter Major" : `${group.major} Temuan Major (Klik untuk filter tabel)`}
                              >
                                <span>{group.major} Major</span>
                                {isTagActive && <X size={11} className="ml-0.5" />}
                              </button>
                            );
                          })()}
                          {group.minor > 0 && (() => {
                            const isTagActive = activeTag?.type === "klasifikasi" && activeTag?.value === "minor";
                            return (
                              <button
                                type="button"
                                onClick={(e) => handleToggleTagFilter(group.key, "klasifikasi", "minor", "Minor", e)}
                                className={`px-2 py-0.5 rounded-md font-bold text-[11px] inline-flex items-center gap-1 transition-all cursor-pointer ${
                                  isTagActive
                                    ? "bg-amber-600 text-white ring-2 ring-amber-400 ring-offset-1 shadow-xs scale-105"
                                    : "bg-amber-100 text-amber-800 hover:bg-amber-200 hover:scale-105 active:scale-95"
                                }`}
                                title={isTagActive ? "Klik untuk membatalkan filter Minor" : `${group.minor} Temuan Minor (Klik untuk filter tabel)`}
                              >
                                <span>{group.minor} Minor</span>
                                {isTagActive && <X size={11} className="ml-0.5" />}
                              </button>
                            );
                          })()}
                          {group.observe > 0 && (() => {
                            const isTagActive = activeTag?.type === "klasifikasi" && activeTag?.value === "observe";
                            return (
                              <button
                                type="button"
                                onClick={(e) => handleToggleTagFilter(group.key, "klasifikasi", "observe", "Observe", e)}
                                className={`px-2 py-0.5 rounded-md font-bold text-[11px] inline-flex items-center gap-1 transition-all cursor-pointer ${
                                  isTagActive
                                    ? "bg-sky-600 text-white ring-2 ring-sky-400 ring-offset-1 shadow-xs scale-105"
                                    : "bg-sky-100 text-sky-800 hover:bg-sky-200 hover:scale-105 active:scale-95"
                                }`}
                                title={isTagActive ? "Klik untuk membatalkan filter Observe" : `${group.observe} Temuan Observe (Klik untuk filter tabel)`}
                              >
                                <span>{group.observe} Observe</span>
                                {isTagActive && <X size={11} className="ml-0.5" />}
                              </button>
                            );
                          })()}
                          {/* STATUS BADGES / BUTTONS */}
                          {STATUS_ORDER.map((sKey) => {
                            const count = group.statusCounts?.[sKey] || 0;
                            if (count <= 0) return null;
                            const meta = getStatusMeta(sKey);
                            const IconComp = meta.icon;
                            const isTagActive = activeTag?.type === "status" && activeTag?.value === sKey;
                            return (
                              <button
                                type="button"
                                key={sKey}
                                onClick={(e) => handleToggleTagFilter(group.key, "status", sKey, meta.label, e)}
                                className={`px-2 py-0.5 rounded-md text-[11px] font-medium inline-flex items-center gap-1 transition-all cursor-pointer ${
                                  isTagActive
                                    ? "bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1 shadow-xs scale-105 font-bold"
                                    : `${meta.headerBadgeClass} hover:opacity-85 hover:scale-105 active:scale-95`
                                }`}
                                title={isTagActive ? `Klik untuk membatalkan filter ${meta.label}` : `${count} Temuan dengan status ${meta.label} (Klik untuk filter tabel)`}
                              >
                                {IconComp && <IconComp size={11} />}
                                <span>{count} {meta.shortLabel}</span>
                                {isTagActive && <X size={11} className="ml-0.5" />}
                              </button>
                            );
                          })}
                          {Object.entries(group.statusCounts || {})
                            .filter(([k, v]) => !STATUS_ORDER.includes(k) && v > 0)
                            .map(([k, v]) => {
                              const meta = getStatusMeta(k);
                              const IconComp = meta.icon;
                              const isTagActive = activeTag?.type === "status" && activeTag?.value === k;
                              return (
                                <button
                                  type="button"
                                  key={k}
                                  onClick={(e) => handleToggleTagFilter(group.key, "status", k, meta.label, e)}
                                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium inline-flex items-center gap-1 transition-all cursor-pointer ${
                                    isTagActive
                                      ? "bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1 shadow-xs scale-105 font-bold"
                                      : `${meta.headerBadgeClass} hover:opacity-85 hover:scale-105 active:scale-95`
                                  }`}
                                  title={isTagActive ? `Klik untuk membatalkan filter ${meta.label}` : `${v} Temuan dengan status ${meta.label} (Klik untuk filter tabel)`}
                                >
                                  {IconComp && <IconComp size={11} />}
                                  <span>{v} {meta.shortLabel}</span>
                                  {isTagActive && <X size={11} className="ml-0.5" />}
                                </button>
                              );
                            })}
                        </div>

                        {/* EXPORT GROUP BUTTON */}
                        <button
                          onClick={(e) => handleExportGroup(group, e)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 transition border border-emerald-200 cursor-pointer shadow-2xs"
                          title={`Export seluruh temuan ${group.title} ke file Excel (.xlsx)`}
                        >
                          <FileSpreadsheet size={14} />
                          <span className="hidden sm:inline">Export XLSX</span>
                        </button>

                        {/* TOGGLE CHEVRON */}
                        <div className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </div>
                    </div>

                    {/* GROUP CARD BODY (ACCORDION CONTENT) */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 space-y-4 animate-in fade-in duration-150">
                        {/* ACTIVE FILTER TAG BANNER */}
                        {activeTag && (
                          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-indigo-50/90 border border-indigo-200 text-xs text-indigo-950 animate-in fade-in">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="p-1 rounded-md bg-indigo-200/80 text-indigo-800">
                                <Filter size={13} />
                              </span>
                              <span>
                                Menampilkan temuan terfilter berdasarkan:{" "}
                                <span className="font-bold bg-white px-2 py-0.5 rounded-md border border-indigo-200 text-indigo-700">
                                  {activeTag.label}
                                </span>{" "}
                                ({activeItems.length} data ditemukan)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) =>
                                handleToggleTagFilter(
                                  group.key,
                                  activeTag.type,
                                  activeTag.value,
                                  activeTag.label,
                                  e
                                )
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 active:bg-indigo-200 font-semibold text-[11px] transition cursor-pointer shadow-2xs shrink-0"
                              title="Hapus filter tag ini dan tampilkan seluruh data"
                            >
                              <X size={12} />
                              <span>Reset Filter</span>
                            </button>
                          </div>
                        )}

                        {/* SUB-UNIT FILTER PILLS (IF MULTIPLE SUBGROUPS) */}
                        {group.subGroups.length > 1 && (
                          <div className="space-y-1.5">
                            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                              <Filter size={12} />
                              Pilih Sub-Unit / Program Studi ({group.subGroups.length}):
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                onClick={() => handleSubFilterChange(group.key, "all")}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                                  currentSubKey === "all"
                                    ? "bg-indigo-600 text-white font-bold shadow-xs"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200/80"
                                }`}
                              >
                                Semua Sub-Unit ({group.total})
                              </button>

                              {group.subGroups.map((sub) => {
                                const isActive = currentSubKey === sub.key;
                                const badgeStyle = getJenjangBadgeStyle(sub.jenjang);

                                return (
                                  <button
                                    key={sub.key}
                                    onClick={() => handleSubFilterChange(group.key, sub.key)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer inline-flex items-center gap-1.5 ${
                                      isActive
                                        ? "bg-indigo-600 text-white font-bold shadow-xs"
                                        : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                                    }`}
                                  >
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                        isActive ? "bg-white/20 text-white" : badgeStyle
                                      }`}
                                    >
                                      {sub.jenjang}
                                    </span>
                                    <span>{sub.title}</span>
                                    <span
                                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                        isActive ? "bg-indigo-800 text-white" : "bg-gray-100 text-gray-700"
                                      }`}
                                    >
                                      {sub.total}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* TABLE OF FINDINGS FOR THIS GROUP */}
                        <div className="overflow-x-auto rounded-xl border border-gray-200/80 bg-white">
                          <table className="w-full min-w-[1050px] text-left text-xs">
                            <thead className="bg-gray-50/90 text-gray-600 font-semibold border-b border-gray-200">
                              <tr>
                                <th className="px-3.5 py-3 w-12 text-center">No</th>
                                <th className="px-3.5 py-3 w-48">Sub-Unit / Program Studi</th>
                                <th className="px-3.5 py-3 w-20 text-center">Jenjang</th>
                                <th className="px-3.5 py-3 w-24 text-center">Klasifikasi</th>
                                <th className="px-3.5 py-3 min-w-[200px]">Standar & Indikator Temuan</th>
                                <th className="px-3.5 py-3 w-32 text-center" title="Target Indikator (Nilai/Range/Kategori yang harus dilalui)">Target Indikator</th>
                                <th className="px-3.5 py-3 w-28 text-center" title="Penilaian mandiri oleh Auditee">Penilaian Auditee</th>
                                <th className="px-3.5 py-3 w-28 text-center" title="Skor evaluasi oleh Auditor">Nilai Auditor</th>
                                <th className="px-3.5 py-3 w-32 text-center">Status KTS</th>
                                <th className="px-3.5 py-3 w-36">Auditor</th>
                                <th className="px-3.5 py-3 w-36">Auditee</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {paginatedItems.length === 0 ? (
                                <tr>
                                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                                    {activeTag ? (
                                      <div className="space-y-2">
                                        <p>
                                          Tidak ada temuan dengan filter{" "}
                                          <span className="font-semibold text-gray-800">
                                            {activeTag.label}
                                          </span>{" "}
                                          pada pilihan sub-unit ini.
                                        </p>
                                        <button
                                          type="button"
                                          onClick={(e) =>
                                            handleToggleTagFilter(
                                              group.key,
                                              activeTag.type,
                                              activeTag.value,
                                              activeTag.label,
                                              e
                                            )
                                          }
                                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium text-xs cursor-pointer"
                                        >
                                          <X size={12} />
                                          <span>Hapus Filter Tag</span>
                                        </button>
                                      </div>
                                    ) : (
                                      "Tidak ada temuan di sub-unit ini."
                                    )}
                                  </td>
                                </tr>
                              ) : (
                                paginatedItems.map((row, idx) => {
                                  const klas = (row.Klasifikasi || "").toLowerCase().trim();
                                  const isClosed =
                                    row.Status === "tutup_kts" || row.Keterangan === "Close";
                                  const actualIndex =
                                    (currentCardPage - 1) * cardPageSize + idx + 1;

                                  return (
                                    <tr key={idx} className="hover:bg-indigo-50/20 transition">
                                      <td className="px-3.5 py-3 text-center text-gray-400 font-mono">
                                        {actualIndex}
                                      </td>
                                      <td className="px-3.5 py-3">
                                        <div className="font-semibold text-gray-900">
                                          {row._subTitle || row.Target || "-"}
                                        </div>
                                      </td>
                                      <td className="px-3.5 py-3 text-center">
                                        <span
                                          className={`px-2 py-0.5 rounded-md font-semibold text-[10px] border ${getJenjangBadgeStyle(
                                            row._subJenjang || row.Jenjang || row.Type
                                          )}`}
                                        >
                                          {row._subJenjang || row.Jenjang || row.Type || "-"}
                                        </span>
                                      </td>
                                      <td className="px-3.5 py-3 text-center">
                                        <span
                                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                                            klas === "major"
                                              ? "bg-red-100 text-red-800"
                                              : klas === "minor"
                                              ? "bg-amber-100 text-amber-800"
                                              : "bg-sky-100 text-sky-800"
                                          }`}
                                        >
                                          {row.Klasifikasi || "-"}
                                        </span>
                                      </td>
                                      <td className="px-3.5 py-3">
                                        <div className="font-medium text-gray-900 leading-snug line-clamp-2">
                                          {row.Indikator || "-"}
                                        </div>
                                        {row.NamaStandar && (
                                          <div className="text-[10px] text-gray-500 mt-0.5">
                                            {row.NamaStandar}
                                          </div>
                                        )}
                                        {row.TindakanPerbaikan && (
                                          <div className="text-[10px] text-teal-700 bg-teal-50/80 rounded px-1.5 py-0.5 mt-1 inline-block">
                                            <span className="font-semibold">Perbaikan:</span>{" "}
                                            {row.TindakanPerbaikan}
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-3.5 py-3 text-center">
                                        <span
                                          className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200/80 font-mono text-[11px] font-semibold inline-block max-w-[140px] truncate"
                                          title={`Target: ${formatTargetIndikator(row)} (${row.TipeTarget || "Kriteria"})`}
                                        >
                                          {formatTargetIndikator(row)}
                                        </span>
                                      </td>
                                      <td className="px-3.5 py-3 text-center font-mono font-medium text-gray-700">
                                        <span
                                          className="bg-gray-50 border border-gray-200/70 rounded-md px-2 py-0.5 text-xs inline-block"
                                          title={`Penilaian mandiri Auditee: ${row.Capaian || "-"}`}
                                        >
                                          {row.Capaian || "-"}
                                        </span>
                                      </td>
                                      <td className="px-3.5 py-3 text-center font-mono font-medium text-gray-900">
                                        <span
                                          className="bg-amber-50 border border-amber-200/70 text-amber-900 font-bold rounded-md px-2 py-0.5 text-xs inline-block"
                                          title={`Nilai evaluasi Auditor: ${row.CapaianAuditor || "-"}`}
                                        >
                                          {row.CapaianAuditor || "-"}
                                        </span>
                                      </td>
                                      <td className="px-3.5 py-3 text-center">
                                        {(() => {
                                          const sKey = normalizeStatusKey(row);
                                          const meta = getStatusMeta(sKey);
                                          const IconComp = meta.icon;
                                          return (
                                            <span
                                              className={`px-2 py-0.5 rounded-full font-medium text-[11px] inline-flex items-center gap-1 border ${meta.badgeClass}`}
                                              title={meta.label}
                                            >
                                              {IconComp && <IconComp size={11} />}
                                              {meta.shortLabel}
                                            </span>
                                          );
                                        })()}
                                      </td>
                                      <td className="px-3.5 py-3 text-gray-600">
                                        <div
                                          className="truncate max-w-[140px] font-medium"
                                          title={row.NamaAuditor1 || row.NamaAuditor2 || row.Auditor1 || "-"}
                                        >
                                          {row.NamaAuditor1 || row.NamaAuditor2 || row.Auditor1 || "-"}
                                        </div>
                                      </td>
                                      <td className="px-3.5 py-3 text-gray-600">
                                        <div
                                          className="truncate max-w-[140px] font-medium"
                                          title={row.NamaAuditee || row.Auditee || "-"}
                                        >
                                          {row.NamaAuditee || row.Auditee || "-"}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* PAGINATION CONTROLS FOR THIS CARD */}
                        {totalCardPages > 1 && (
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 text-xs text-gray-500">
                            <div>
                              Menampilkan{" "}
                              <span className="font-semibold text-gray-700">
                                {(currentCardPage - 1) * cardPageSize + 1}
                              </span>{" "}
                              s/d{" "}
                              <span className="font-semibold text-gray-700">
                                {Math.min(currentCardPage * cardPageSize, activeItems.length)}
                              </span>{" "}
                              dari{" "}
                              <span className="font-semibold text-gray-700">{activeItems.length}</span> temuan
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                disabled={currentCardPage === 1}
                                onClick={() =>
                                  setGroupPages((prev) => ({
                                    ...prev,
                                    [group.key]: Math.max(1, currentCardPage - 1),
                                  }))
                                }
                                className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              >
                                Sebelumnya
                              </button>

                              <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800 font-semibold text-xs">
                                {currentCardPage} / {totalCardPages}
                              </span>

                              <button
                                disabled={currentCardPage === totalCardPages}
                                onClick={() =>
                                  setGroupPages((prev) => ({
                                    ...prev,
                                    [group.key]: Math.min(totalCardPages, currentCardPage + 1),
                                  }))
                                }
                                className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              >
                                Selanjutnya
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      {/* ========================================================= */}
      {/* MODAL: DETAIL TEMUAN SPESIFIK PRODI                        */}
      {/* ========================================================= */}
      {selectedProdiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-gray-100">
            {/* MODAL HEADER */}
            <div className="p-5 border-b border-gray-100 bg-gray-50/80 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-800 text-xs font-bold">
                      {selectedProdiModal.jenjang}
                    </span>
                    <h3 className="text-base font-bold text-gray-900">
                      {selectedProdiModal.target}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Fakultas: {selectedProdiModal.fakultas || "-"} • Total {selectedProdiModal.total} Temuan
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* EXPORT SPESIFIK EXCEL */}
                  <button
                    onClick={() => handleExportProdi(selectedProdiModal)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition border border-emerald-200 cursor-pointer"
                    title="Unduh temuan prodi ini ke Excel (.xlsx)"
                  >
                    <FileSpreadsheet size={14} />
                    <span>Export XLSX</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedProdiModal(null);
                      setModalTagFilter(null);
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* MODAL FILTER TAG BADGES */}
              <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-gray-200/60">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Filter Tag:
                </span>
                {selectedProdiModal.major > 0 && (() => {
                  const isTagActive = modalTagFilter?.type === "klasifikasi" && modalTagFilter?.value === "major";
                  return (
                    <button
                      type="button"
                      onClick={() => handleToggleModalTagFilter("klasifikasi", "major", "Major")}
                      className={`px-2 py-0.5 rounded-md font-bold text-[11px] inline-flex items-center gap-1 transition-all cursor-pointer ${
                        isTagActive
                          ? "bg-red-600 text-white ring-2 ring-red-400 ring-offset-1 shadow-xs scale-105"
                          : "bg-red-100 text-red-800 hover:bg-red-200"
                      }`}
                      title={isTagActive ? "Klik untuk membatalkan filter Major" : `${selectedProdiModal.major} Temuan Major (Klik untuk filter)`}
                    >
                      <span>{selectedProdiModal.major} Major</span>
                      {isTagActive && <X size={11} className="ml-0.5" />}
                    </button>
                  );
                })()}
                {selectedProdiModal.minor > 0 && (() => {
                  const isTagActive = modalTagFilter?.type === "klasifikasi" && modalTagFilter?.value === "minor";
                  return (
                    <button
                      type="button"
                      onClick={() => handleToggleModalTagFilter("klasifikasi", "minor", "Minor")}
                      className={`px-2 py-0.5 rounded-md font-bold text-[11px] inline-flex items-center gap-1 transition-all cursor-pointer ${
                        isTagActive
                          ? "bg-amber-600 text-white ring-2 ring-amber-400 ring-offset-1 shadow-xs scale-105"
                          : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                      }`}
                      title={isTagActive ? "Klik untuk membatalkan filter Minor" : `${selectedProdiModal.minor} Temuan Minor (Klik untuk filter)`}
                    >
                      <span>{selectedProdiModal.minor} Minor</span>
                      {isTagActive && <X size={11} className="ml-0.5" />}
                    </button>
                  );
                })()}
                {selectedProdiModal.observe > 0 && (() => {
                  const isTagActive = modalTagFilter?.type === "klasifikasi" && modalTagFilter?.value === "observe";
                  return (
                    <button
                      type="button"
                      onClick={() => handleToggleModalTagFilter("klasifikasi", "observe", "Observe")}
                      className={`px-2 py-0.5 rounded-md font-bold text-[11px] inline-flex items-center gap-1 transition-all cursor-pointer ${
                        isTagActive
                          ? "bg-sky-600 text-white ring-2 ring-sky-400 ring-offset-1 shadow-xs scale-105"
                          : "bg-sky-100 text-sky-800 hover:bg-sky-200"
                      }`}
                      title={isTagActive ? "Klik untuk membatalkan filter Observe" : `${selectedProdiModal.observe} Temuan Observe (Klik untuk filter)`}
                    >
                      <span>{selectedProdiModal.observe} Observe</span>
                      {isTagActive && <X size={11} className="ml-0.5" />}
                    </button>
                  );
                })()}
                {STATUS_ORDER.map((sKey) => {
                  const count = selectedProdiModal.statusCounts?.[sKey] || 0;
                  if (count <= 0) return null;
                  const meta = getStatusMeta(sKey);
                  const IconComp = meta.icon;
                  const isTagActive = modalTagFilter?.type === "status" && modalTagFilter?.value === sKey;
                  return (
                    <button
                      type="button"
                      key={sKey}
                      onClick={() => handleToggleModalTagFilter("status", sKey, meta.label)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium inline-flex items-center gap-1 transition-all cursor-pointer ${
                        isTagActive
                          ? "bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1 shadow-xs scale-105 font-bold"
                          : `${meta.headerBadgeClass} hover:opacity-85`
                      }`}
                      title={isTagActive ? `Klik untuk membatalkan filter ${meta.label}` : `${count} Temuan dengan status ${meta.label} (Klik untuk filter)`}
                    >
                      {IconComp && <IconComp size={11} />}
                      <span>{count} {meta.shortLabel}</span>
                      {isTagActive && <X size={11} className="ml-0.5" />}
                    </button>
                  );
                })}
                {Object.entries(selectedProdiModal.statusCounts || {})
                  .filter(([k, v]) => !STATUS_ORDER.includes(k) && v > 0)
                  .map(([k, v]) => {
                    const meta = getStatusMeta(k);
                    const IconComp = meta.icon;
                    const isTagActive = modalTagFilter?.type === "status" && modalTagFilter?.value === k;
                    return (
                      <button
                        type="button"
                        key={k}
                        onClick={() => handleToggleModalTagFilter("status", k, meta.label)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium inline-flex items-center gap-1 transition-all cursor-pointer ${
                          isTagActive
                            ? "bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1 shadow-xs scale-105 font-bold"
                            : `${meta.headerBadgeClass} hover:opacity-85`
                        }`}
                        title={isTagActive ? `Klik untuk membatalkan filter ${meta.label}` : `${v} Temuan dengan status ${meta.label} (Klik untuk filter)`}
                      >
                        {IconComp && <IconComp size={11} />}
                        <span>{v} {meta.shortLabel}</span>
                        {isTagActive && <X size={11} className="ml-0.5" />}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* MODAL BODY (TABLE) */}
            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              {/* MODAL ACTIVE FILTER BANNER */}
              {modalTagFilter && (
                <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 animate-in fade-in">
                  <div className="flex items-center gap-1.5">
                    <Filter size={13} className="text-indigo-600" />
                    <span>
                      Filter aktif: <span className="font-bold underline">{modalTagFilter.label}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalTagFilter(null)}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-[11px] font-semibold cursor-pointer shadow-2xs"
                  >
                    <X size={11} />
                    <span>Reset Filter</span>
                  </button>
                </div>
              )}
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-left text-xs min-w-[900px]">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2.5 w-10 text-center">No</th>
                      <th className="px-3 py-2.5 w-20 text-center">Klasifikasi</th>
                      <th className="px-3 py-2.5 min-w-[200px]">Standar & Indikator Temuan</th>
                      <th className="px-3 py-2.5 w-28 text-center" title="Target Indikator">Target Indikator</th>
                      <th className="px-3 py-2.5 w-24 text-center" title="Penilaian Auditee">Penilaian Auditee</th>
                      <th className="px-3 py-2.5 w-24 text-center" title="Nilai Auditor">Nilai Auditor</th>
                      <th className="px-3 py-2.5 w-28 text-center">Status</th>
                      <th className="px-3 py-2.5 w-32">Auditor</th>
                      <th className="px-3 py-2.5 w-32">Auditee</th>
                      <th className="px-3 py-2.5 w-40">Tindakan Perbaikan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(() => {
                      const filteredModalItems = (selectedProdiModal.items || []).filter((item) => {
                        if (!modalTagFilter) return true;
                        if (modalTagFilter.type === "klasifikasi") {
                          return (item.Klasifikasi || "").toLowerCase().trim() === modalTagFilter.value;
                        }
                        if (modalTagFilter.type === "status") {
                          return normalizeStatusKey(item) === modalTagFilter.value;
                        }
                        return true;
                      });

                      if (filteredModalItems.length === 0) {
                        return (
                          <tr>
                            <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                              {modalTagFilter ? (
                                <div className="space-y-2">
                                  <p>
                                    Tidak ada temuan dengan filter{" "}
                                    <span className="font-semibold text-gray-800">{modalTagFilter.label}</span>.
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => setModalTagFilter(null)}
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-medium cursor-pointer"
                                  >
                                    <X size={12} />
                                    <span>Reset Filter</span>
                                  </button>
                                </div>
                              ) : (
                                "Tidak ada temuan pada program studi ini."
                              )}
                            </td>
                          </tr>
                        );
                      }

                      return filteredModalItems.map((item, idx) => {
                        const klas = (item.Klasifikasi || "").toLowerCase().trim();
                        return (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="px-3 py-2.5 text-center text-gray-400">{idx + 1}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                                  klas === "major"
                                    ? "bg-red-100 text-red-800"
                                    : klas === "minor"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-sky-100 text-sky-800"
                                }`}
                              >
                                {item.Klasifikasi}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="font-medium text-gray-900">{item.Indikator}</div>
                              {item.NamaStandar && (
                                <div className="text-[10px] text-gray-400 mt-0.5">
                                  {item.NamaStandar}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span
                                className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200/80 font-mono text-[10px] font-semibold inline-block max-w-[120px] truncate"
                                title={`Target: ${formatTargetIndikator(item)}`}
                              >
                                {formatTargetIndikator(item)}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono text-xs text-gray-700">
                              {item.Capaian || "-"}
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono text-xs font-bold text-gray-900">
                              {item.CapaianAuditor || "-"}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {(() => {
                                const sKey = normalizeStatusKey(item);
                                const meta = getStatusMeta(sKey);
                                const IconComp = meta.icon;
                                return (
                                  <span
                                    className={`px-2 py-0.5 rounded-full font-medium text-[10px] inline-flex items-center gap-1 border ${meta.badgeClass}`}
                                    title={meta.label}
                                  >
                                    {IconComp && <IconComp size={10} />}
                                    {meta.shortLabel}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-3 py-2.5 text-gray-600">
                              <div
                                className="truncate max-w-[120px]"
                                title={item.NamaAuditor1 || item.NamaAuditor2 || item.Auditor1 || "-"}
                              >
                                {item.NamaAuditor1 || item.NamaAuditor2 || item.Auditor1 || "-"}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-gray-600">
                              <div
                                className="truncate max-w-[120px]"
                                title={item.NamaAuditee || item.Auditee || "-"}
                              >
                                {item.NamaAuditee || item.Auditee || "-"}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-gray-600 text-[11px]">
                              {item.TindakanPerbaikan || "-"}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="p-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
              <button
                onClick={() => setSelectedProdiModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
