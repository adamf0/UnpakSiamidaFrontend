import React, { useState, useEffect, useMemo, useRef } from "react";
import { apiClient } from "@/Common/api";
import { useContent } from "@/Providers/ContentProvider";
import { formatRupiah } from "@/Page/ProkerV3/prokerConstants";
import {
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Building,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  FileText,
  Wallet,
  DollarSign,
  Layers,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";

export default function DashboardProkerAktivitasRabCard({ currentYear }) {
  const contentCtx = useContent();
  const effectiveYear = currentYear || contentCtx?.positionYear || localStorage.getItem("positionYear") || "2027";
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [unitOptions, setUnitOptions] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState("all");
  const [selectedYear, setSelectedYear] = useState(effectiveYear);

  useEffect(() => {
    if (currentYear) {
      setSelectedYear(currentYear);
    } else if (contentCtx?.positionYear) {
      setSelectedYear(contentCtx.positionYear);
    }
  }, [currentYear, contentCtx?.positionYear]);

  const yearOptions = useMemo(() => {
    const set = new Set(["2027", "2026", "2025", "2024"]);
    if (Array.isArray(contentCtx?.availableYears)) {
      contentCtx.availableYears.forEach((item) => {
        const y = String(item.Tahun ?? item.tahun ?? "").trim();
        if (y) set.add(y);
      });
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [contentCtx?.availableYears]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allowed, setAllowed] = useState(false);
  const [roleType, setRoleType] = useState("");
  const [userName, setUserName] = useState("");
  const [expandedProker, setExpandedProker] = useState({});
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
  const [unitSearch, setUnitSearch] = useState("");
  const dropdownRef = useRef(null);

  // Close dropdown when clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsUnitDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get("/proker_v3/dashboard_monitoring", {
        params: {
          tahun: selectedYear,
          id_fakultas_unit: selectedUnit !== "all" ? selectedUnit : undefined,
          search: searchKeyword.trim() || undefined,
        },
      });

      const resData = res.data || {};
      setAllowed(Boolean(resData.allowed));
      setRoleType(resData.role_type || "");
      setUserName(resData.user_name || "");
      setData(resData.data || []);
      setSummary(resData.summary || null);

      if (resData.unit_options && Array.isArray(resData.unit_options)) {
        setUnitOptions(resData.unit_options);
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setAllowed(false);
      } else {
        setError(err.response?.data?.message || err.message || "Gagal memuat data monitoring");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedUnit]);

  // Handle Search on Enter or debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  const toggleExpandProker = (id) => {
    setExpandedProker((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleExpandAll = () => {
    const allExpanded = data.every((p) => expandedProker[p.id]);
    const newState = {};
    data.forEach((p) => {
      newState[p.id] = !allExpanded;
    });
    setExpandedProker(newState);
  };

  const filteredUnitOptions = useMemo(() => {
    if (!unitSearch.trim()) return unitOptions;
    const term = unitSearch.toLowerCase();
    return unitOptions.filter((opt) =>
      String(opt.nama || "").toLowerCase().includes(term)
    );
  }, [unitOptions, unitSearch]);

  const activeUnitLabel = useMemo(() => {
    if (selectedUnit === "all") {
      const allOpt = unitOptions.find((o) => o.id === "all");
      return allOpt?.nama || "Semua Fakultas & Unit";
    }
    const found = unitOptions.find((o) => String(o.id) === String(selectedUnit));
    return found?.nama || `Unit #${selectedUnit}`;
  }, [unitOptions, selectedUnit]);

  if (!allowed && !loading) {
    return null; // Gracefully hidden for users not in executive / faculty tier
  }

  const getPencairanBadge = (statusPencairan, pencairanNominal) => {
    switch (statusPencairan) {
      case "cair":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Cair (100%)
          </span>
        );
      case "tidak_penuh":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-600" />
            Cair Sebagian / Tidak Penuh
          </span>
        );
      case "cair_kelebihan":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-300">
            <AlertTriangle className="w-3 h-3 text-purple-600" />
            Cair (Kelebihan)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-300">
            <Clock className="w-3 h-3 text-gray-500" />
            Belum Dicairkan
          </span>
        );
    }
  };

  const getStatusBadge = (status, isBatal) => {
    if (isBatal) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <AlertCircle className="w-3 h-3 text-rose-600" />
          Dibatalkan
        </span>
      );
    }
    const cleanStatus = String(status || "").toLowerCase();
    if (cleanStatus.includes("terima") || cleanStatus.includes("setuju")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Terima Anggaran
        </span>
      );
    }
    if (cleanStatus.includes("tolak")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertCircle className="w-3 h-3 text-rose-600" />
          Ditolak
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3 h-3 text-amber-600" />
        {status || "Draft"}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all">
      {/* HEADER SECTION */}
      <div className="p-5 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 via-white to-indigo-50/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                <Building className="w-3.5 h-3.5 text-indigo-600" />
                {roleType === "warek"
                  ? "Akses Eksekutif: Wakil Rektor"
                  : roleType === "fakultas"
                  ? "Akses Dekanat: Tingkat Fakultas"
                  : "Monitoring Program Kerja"}
              </span>
              <span className="text-xs text-gray-500 font-medium">
                Periode Tahun Anggaran {selectedYear}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
              Monitoring Program Kerja
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              {roleType === "warek" || roleType === "admin"
                ? "Pemantauan komprehensif seluruh program kerja, aktivitas kegiatan, serta rincian biaya anggaran satuan (RAB) lintas unit/fakultas di lingkungan Universitas Pakuan."
                : "Pemantauan proker, aktivitas, dan rincian belanja anggaran (RAB) program studi di bawah naungan fakultas."}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-center">
            {/* Year Selector */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-xs hover:border-gray-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-gray-800"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  Tahun {y}
                </option>
              ))}
            </select>

            {/* Refresh Button */}
            <button
              onClick={fetchData}
              disabled={loading}
              title="Muat ulang data"
              className="p-2 text-gray-600 hover:text-indigo-600 bg-white border border-gray-300 rounded-lg shadow-xs hover:border-gray-400 focus:outline-hidden disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* CONTROLS BAR: SEARCHABLE DROPDOWN & KEYWORD SEARCH */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-3 pt-4 border-t border-gray-150">
          {/* SEARCHABLE UNIT DROPDOWN */}
          <div className="md:col-span-6 lg:col-span-5 relative" ref={dropdownRef}>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
              Fakultas / Program Studi / Unit
            </label>
            <button
              type="button"
              onClick={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)}
              className="w-full flex items-center justify-between gap-2 px-3.5 py-2 text-xs font-semibold bg-white border border-gray-300 rounded-xl shadow-xs hover:border-indigo-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-left transition-colors"
            >
              <div className="flex items-center gap-2 truncate">
                <Building className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="truncate text-gray-900">{activeUnitLabel}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
            </button>

            {isUnitDropdownOpen && (
              <div className="absolute left-0 right-0 z-30 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <div className="p-2 border-b border-gray-100 bg-gray-50/70">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Cari fakultas atau program studi..."
                      value={unitSearch}
                      onChange={(e) => setUnitSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-gray-800"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-gray-50 p-1">
                  {filteredUnitOptions.length === 0 ? (
                    <div className="p-3 text-center text-xs text-gray-500">
                      Unit tidak ditemukan
                    </div>
                  ) : (
                    filteredUnitOptions.map((opt) => (
                      <button
                        key={String(opt.id)}
                        type="button"
                        onClick={() => {
                          setSelectedUnit(opt.id);
                          setIsUnitDropdownOpen(false);
                          setUnitSearch("");
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-left rounded-lg transition-colors ${
                          String(selectedUnit) === String(opt.id)
                            ? "bg-indigo-50 text-indigo-900 font-bold"
                            : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <span className="truncate">{opt.nama}</span>
                        {opt.type && opt.type !== "all" && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                              opt.type === "fakultas"
                                ? "bg-indigo-100 text-indigo-700"
                                : opt.type === "prodi"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {opt.type}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* KEYWORD SEARCH */}
          <div className="md:col-span-6 lg:col-span-5">
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
              Pencarian Kata Kunci Proker / Aktivitas
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Ketik nama proker, aktivitas, atau PIC..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-white border border-gray-300 rounded-xl shadow-xs hover:border-gray-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-gray-900"
              />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword("")}
                  className="absolute right-2.5 top-2.5 text-xs text-gray-400 hover:text-gray-600 px-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* TOGGLE EXPAND ALL */}
          <div className="md:col-span-12 lg:col-span-2 flex items-end">
            <button
              type="button"
              onClick={toggleExpandAll}
              disabled={data.length === 0}
              className="w-full py-2 px-3 text-xs font-semibold rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 shadow-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500" />
              <span>{data.every((p) => expandedProker[p.id]) ? "Tutup Semua" : "Buka Semua"}</span>
            </button>
          </div>
        </div>

        {/* STAT SUMMARY CARDS */}
        {summary && (
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>Total Proker</span>
              </div>
              <div className="text-xl font-bold text-gray-900 mt-1">
                {summary.total_proker}
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                <FileText className="w-4 h-4 text-purple-500" />
                <span>Total Aktivitas</span>
              </div>
              <div className="text-xl font-bold text-purple-700 mt-1">
                {summary.total_aktivitas}
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                <Wallet className="w-4 h-4 text-emerald-500" />
                <span>Total Anggaran (RAB)</span>
              </div>
              <div className="text-sm sm:text-base font-bold text-emerald-700 mt-1 truncate">
                {formatRupiah(summary.total_anggaran || 0)}
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                <DollarSign className="w-4 h-4 text-blue-500" />
                <span>Total Pencairan</span>
              </div>
              <div className="text-sm sm:text-base font-bold text-blue-700 mt-1 truncate">
                {formatRupiah(summary.total_pencairan || 0)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CONTENT BODY: PROKER & NESTED AKTIVITAS + RAB */}
      <div className="p-5 sm:p-6 space-y-4">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
            <p className="text-sm font-semibold text-gray-700">Memuat data program kerja &amp; rincian biaya...</p>
            <p className="text-xs text-gray-400 mt-1">Menghubungkan ke database SIAMIDA</p>
          </div>
        ) : error ? (
          <div className="py-8 px-4 bg-rose-50 border border-rose-200 rounded-xl text-center">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-rose-800">Gagal Mengambil Data</h4>
            <p className="text-xs text-rose-600 mt-1 max-w-md mx-auto">{error}</p>
            <button
              onClick={fetchData}
              className="mt-3 px-4 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow-xs"
            >
              Coba Lagi
            </button>
          </div>
        ) : data.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-gray-700">Tidak Ada Program Kerja</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Tidak ditemukan data proker yang sesuai dengan unit terpilih atau kata kunci pencarian.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((proker, index) => {
              const isExpanded = Boolean(expandedProker[proker.id]);
              return (
                <div
                  key={proker.id}
                  className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-2xs hover:border-gray-300 transition-all"
                >
                  {/* PROKER HEADER ROW */}
                  <div
                    onClick={() => toggleExpandProker(proker.id)}
                    className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 cursor-pointer bg-white hover:bg-gray-50/70 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        type="button"
                        aria-label="Expand proker"
                        className="mt-0.5 p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-200">
                            #{index + 1}
                          </span>
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {proker.nama_fakultas_unit || "Unit"}
                          </span>
                          {getStatusBadge(proker.status_anggaran || proker.status, proker.is_batal)}
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-snug">
                          {proker.nama_program || "Program Kerja Tanpa Judul"}
                        </h3>

                        {proker.indikator_kinerja && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                            <span className="font-semibold text-gray-700">Indikator:</span>{" "}
                            {proker.indikator_kinerja}
                          </p>
                        )}

                        {Boolean(proker.is_batal) && (
                          <div className="mt-2.5 flex items-start gap-1.5 p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs shadow-2xs max-w-xl">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="font-bold text-rose-700 text-[10px] uppercase tracking-wider">
                                Catatan Pembatalan Proker:
                              </span>
                              <span className="italic break-words text-rose-950 font-medium">
                                "{proker.catatan_batal || "Program kerja ini dibatalkan"}"
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PROKER TOTALS & STATS */}
                    <div className="flex items-center gap-4 self-end lg:self-center shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100 w-full lg:w-auto justify-between lg:justify-end">
                      <div className="text-left lg:text-right">
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                          Total Anggaran RAB
                        </p>
                        <p className="text-sm sm:text-base font-extrabold text-emerald-700 font-mono">
                          {formatRupiah(proker.total_anggaran || 0)}
                        </p>
                      </div>

                      <div className="text-left lg:text-right pl-3 border-l border-gray-200">
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                          Pencairan
                        </p>
                        <p className="text-sm font-bold text-blue-700 font-mono">
                          {formatRupiah(proker.total_pencairan || 0)}
                        </p>
                      </div>

                      <div className="text-left lg:text-right pl-3 border-l border-gray-200">
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                          Aktivitas
                        </p>
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-bold bg-purple-100 text-purple-800">
                          {proker.total_aktivitas}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* PROKER EXPANDED CONTENT: DETAIL TARGET & LIST OF AKTIVITAS */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50/50 p-4 sm:p-5 space-y-4">
                      {/* TARGET CAPAIAN SUMMARY */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white rounded-lg border border-gray-200/80 text-xs text-gray-600">
                        <div>
                          <span className="font-semibold text-gray-700 block">Target Unpak:</span>
                          <span className="font-medium text-gray-800">{proker.target_unpak || "-"}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-700 block">Target Unit:</span>
                          <span className="font-medium text-gray-800">{proker.target_unit || "-"}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-700 block">PIC Proker:</span>
                          <span className="font-medium text-gray-800">{proker.pic || "-"}</span>
                        </div>
                      </div>

                      {/* LIST OF AKTIVITAS */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-indigo-500" />
                            Daftar Aktivitas Kegiatan ({proker.aktivitas.length})
                          </h4>
                        </div>

                        {proker.aktivitas.length === 0 ? (
                          <div className="p-4 bg-white rounded-lg border border-gray-200 text-center text-xs text-gray-500">
                            Belum ada aktivitas yang terdaftar pada program kerja ini.
                          </div>
                        ) : (
                          proker.aktivitas.map((akt, aktIdx) => (
                            <div
                              key={akt.id}
                              className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs space-y-3"
                            >
                              {/* AKTIVITAS HEADER */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-150">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[11px] font-bold text-gray-600">
                                      Aktivitas #{aktIdx + 1}:
                                    </span>
                                    <span className="text-xs sm:text-sm font-bold text-gray-900">
                                      {akt.aktivitas}
                                    </span>
                                    {getStatusBadge(akt.status_anggaran || akt.status, akt.is_batal)}
                                    {getPencairanBadge(akt.status_pencairan, akt.pencairan)}
                                  </div>
                                  <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-3">
                                    <span>
                                      <strong>PIC:</strong> {akt.pic || "-"}
                                    </span>
                                    {akt.capaian && (
                                      <span>
                                        <strong>Capaian:</strong> {akt.capaian}
                                      </span>
                                    )}
                                  </div>

                                  {Boolean(akt.is_batal || proker.is_batal) && (
                                    <div className="mt-2 flex items-start gap-1.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs shadow-2xs max-w-lg">
                                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                                      <div className="flex flex-col gap-0.5 min-w-0">
                                        <span className="font-bold text-rose-700 text-[10px] uppercase tracking-wider">
                                          Catatan Pembatalan Aktivitas:
                                        </span>
                                        <span className="italic break-words text-rose-950 font-medium">
                                          "{akt.catatan_batal || proker.catatan_batal || "Aktivitas ini dibatalkan"}"
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  {(akt.catatan_revisi_anggaran || "").trim() !== "" && (
                                    <div className="mt-2 flex items-start gap-1.5 p-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 text-xs shadow-2xs max-w-lg">
                                      <FileText className="w-3.5 h-3.5 text-amber-800 shrink-0 mt-0.5" />
                                      <div className="flex flex-col gap-0.5 min-w-0">
                                        <span className="font-bold text-amber-900 text-[10px] uppercase tracking-wider">
                                          Catatan Revisi Anggaran:
                                        </span>
                                        <p className="break-words whitespace-pre-wrap text-amber-950 font-medium leading-snug">
                                          {akt.catatan_revisi_anggaran}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="text-left sm:text-right shrink-0">
                                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                                    Subtotal RAB Aktivitas
                                  </p>
                                  {akt.realisasi !== null &&
                                  akt.realisasi !== undefined &&
                                  Number(akt.realisasi) !== Number(akt.total_rab || 0) ? (
                                    <div>
                                      <p className="text-xs text-gray-500 line-through decoration-rose-500 font-mono">
                                        {formatRupiah(akt.total_rab || 0)}
                                      </p>
                                      <p className="text-sm font-extrabold text-emerald-700 font-mono">
                                        {formatRupiah(akt.realisasi)}
                                      </p>
                                    </div>
                                  ) : (
                                    <p className="text-sm font-extrabold text-emerald-700 font-mono">
                                      {formatRupiah(
                                        akt.realisasi !== null && akt.realisasi !== undefined
                                          ? akt.realisasi
                                          : akt.total_rab || 0,
                                      )}
                                    </p>
                                  )}
                                  {akt.pencairan !== null && akt.pencairan !== undefined && (
                                    <p className="text-[11px] text-blue-700 font-medium">
                                      Dicairkan: {formatRupiah(akt.pencairan)}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* DETAIL TABEL BIAYA (RAB) */}
                              <div>
                                <h5 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                                  <Wallet className="w-3 h-3 text-emerald-600" />
                                  Rincian Item Belanja (aktivitasv2_rab)
                                </h5>

                                {akt.rab.length === 0 ? (
                                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center text-xs text-gray-500 italic">
                                    Belum ada rincian belanja RAB untuk aktivitas ini.
                                  </div>
                                ) : (
                                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="w-full text-left text-xs">
                                      <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                                        <tr>
                                          <th className="py-2 px-3 w-10 text-center">No</th>
                                          <th className="py-2 px-3">Kategori</th>
                                          <th className="py-2 px-3">Rincian Belanja</th>
                                          <th className="py-2 px-3 text-center">Volume / Qty</th>
                                          <th className="py-2 px-3 text-right">SBU / Satuan (Rp)</th>
                                          <th className="py-2 px-3 text-right">Total Biaya (Rp)</th>
                                          <th className="py-2 px-3">Keterangan</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-150 bg-white">
                                        {akt.rab.map((item, rIdx) => (
                                          <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="py-2 px-3 text-center text-gray-500 font-medium">
                                              {rIdx + 1}
                                            </td>
                                            <td className="py-2 px-3 text-gray-800 font-medium whitespace-nowrap">
                                              <span className="inline-block px-2 py-0.5 text-[10px] rounded bg-gray-100 text-gray-700 font-semibold border border-gray-200">
                                                {item.kategori || "-"}
                                              </span>
                                            </td>
                                            <td className="py-2 px-3 text-gray-900 font-medium">
                                              {item.rincian || "-"}
                                            </td>
                                            <td className="py-2 px-3 text-center text-gray-700 whitespace-nowrap">
                                              {item.qty_satuan} x {item.qty_paket}
                                            </td>
                                            <td className="py-2 px-3 text-right text-gray-700 font-mono whitespace-nowrap">
                                              {formatRupiah(item.sbu || 0)}
                                            </td>
                                            <td className="py-2 px-3 text-right font-bold text-emerald-700 font-mono whitespace-nowrap">
                                              {formatRupiah(item.total || 0)}
                                            </td>
                                            <td className="py-2 px-3 text-gray-500 text-[11px] max-w-xs truncate">
                                              {item.keterangan || "-"}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                      <tfoot className="bg-gray-50/90 font-bold border-t border-gray-200 text-gray-900">
                                        <tr>
                                          <td colSpan={5} className="py-2 px-3 text-right text-gray-700">
                                            Total Biaya RAB:
                                          </td>
                                          <td className="py-2 px-3 text-right text-emerald-800 font-mono font-extrabold">
                                            {formatRupiah(akt.total_rab || 0)}
                                          </td>
                                          <td></td>
                                        </tr>
                                      </tfoot>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
