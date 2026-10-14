import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Award,
  Layers,
  FileSpreadsheet,
  RefreshCw,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { renderLabelFakultasUnit } from "@/Common/Utils";

export default function InformasiIndikatorTab({
  data = [],
  loading = false,
  selectedIndikator = null,
  onRefresh,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [jenjangFilter, setJenjangFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("nama"); // "nama", "capaian"
  const [sortOrder, setSortOrder] = useState("asc"); // "asc", "desc"

  // Distinct jenjang
  const availableJenjang = useMemo(() => {
    const set = new Set();
    data.forEach((row) => {
      if (row.Jenjang) set.add(row.Jenjang);
      else if (row.Type) set.add(row.Type);
    });
    return Array.from(set);
  }, [data]);

  // Helper to format target display
  const formatTarget = (row) => {
    if (!row) return "-";
    if (row.TipeTarget === "range") {
      if (row.RangeTarget) {
        return `${row.RangeTarget} ${row.Satuan || ""}`.trim();
      }
      if (row.TargetMin != null || row.TargetMax != null) {
        return `${row.TargetMin ?? 0} - ${row.TargetMax ?? 0} ${row.Satuan || ""}`.trim();
      }
    }
    if (row.Target != null && row.Target !== "") {
      const op = row.Operator ? `${row.Operator} ` : "";
      const sat = row.Satuan ? ` ${row.Satuan}` : "";
      return `${op}${row.Target}${sat}`.trim();
    }
    return "-";
  };

  // Helper to check if auditor score fulfills target
  const checkStatusTarget = (row) => {
    const auditorVal = Number(row.NormalizedCapaianAuditor ?? row.CapaianAuditor ?? 0);

    if (row.TipeTarget === "range") {
      const min = Number(row.TargetMin ?? 0);
      const max = Number(row.TargetMax ?? 100);
      return auditorVal >= min && auditorVal <= max;
    }

    if (row.TipeTarget === "numerik" && row.Target != null && row.Target !== "") {
      const targetNum = Number(row.Target);
      if (!isNaN(targetNum)) {
        const op = (row.Operator || ">=").trim();
        if (op === ">=") return auditorVal >= targetNum;
        if (op === "<=") return auditorVal <= targetNum;
        if (op === ">") return auditorVal > targetNum;
        if (op === "<") return auditorVal < targetNum;
        if (op === "=") return auditorVal === targetNum;
      }
    }

    if (row.TipeTarget === "kategori") {
      return auditorVal >= 100;
    }

    return auditorVal >= 80;
  };

  // Helper to calculate progress bar percentage (100% if target tercapai/auditorVal >= target)
  const calculateProgressPercent = (row, auditorVal, isHigh) => {
    if (isHigh) return 100;

    // Jika belum tercapai, hitung proporsi ketercapaian terhadap target
    if (row.TipeTarget === "numerik" && row.Target != null && row.Target !== "") {
      const targetNum = Number(row.Target);
      if (!isNaN(targetNum) && targetNum > 0) {
        const op = (row.Operator || ">=").trim();
        if (op === "<=" || op === "<") {
          return Math.max(0, Math.min(Math.round((targetNum / Math.max(auditorVal, 1)) * 100), 99));
        }
        return Math.max(0, Math.min(Math.round((auditorVal / targetNum) * 100), 99));
      }
    }

    if (row.TipeTarget === "range") {
      const min = Number(row.TargetMin ?? 0);
      if (min > 0) {
        return Math.max(0, Math.min(Math.round((auditorVal / min) * 100), 99));
      }
    }

    return Math.max(0, Math.min(Math.round(auditorVal), 99));
  };

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    let result = [...data];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (row) =>
          (row.FakultasUnit && row.FakultasUnit.toLowerCase().includes(q)) ||
          (row.Jenjang && row.Jenjang.toLowerCase().includes(q)) ||
          (row.Fakultas && row.Fakultas.toLowerCase().includes(q))
      );
    }

    if (jenjangFilter !== "all") {
      result = result.filter(
        (row) =>
          (row.Jenjang && row.Jenjang.toLowerCase() === jenjangFilter.toLowerCase()) ||
          (row.Type && row.Type.toLowerCase() === jenjangFilter.toLowerCase())
      );
    }

    if (statusFilter === "tercapai") {
      result = result.filter((row) => checkStatusTarget(row));
    } else if (statusFilter === "kurang") {
      result = result.filter((row) => !checkStatusTarget(row));
    }

    result.sort((a, b) => {
      if (sortField === "capaian") {
        const valA = Number(a.NormalizedCapaianAuditor ?? a.CapaianAuditor ?? 0);
        const valB = Number(b.NormalizedCapaianAuditor ?? b.CapaianAuditor ?? 0);
        return sortOrder === "asc" ? valA - valB : valB - valA;
      } else {
        const nameA = a.FakultasUnit || "";
        const nameB = b.FakultasUnit || "";
        return sortOrder === "asc"
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      }
    });

    return result;
  }, [data, searchQuery, jenjangFilter, statusFilter, sortField, sortOrder]);

  // Statistics calculation
  const stats = useMemo(() => {
    if (!data.length) {
      return { total: 0, sum: 0, avg: 0, highCount: 0, lowCount: 0 };
    }

    const values = data.map((r) => Number(r.NormalizedCapaianAuditor ?? r.CapaianAuditor ?? 0));
    const sum = values.reduce((acc, v) => acc + v, 0);
    const avg = values.length ? sum / values.length : 0;
    const highCount = data.filter((r) => checkStatusTarget(r)).length;
    const lowCount = data.length - highCount;

    return {
      total: data.length,
      sum,
      avg,
      highCount,
      lowCount,
    };
  }, [data]);


  // Export CSV handler
  const handleExportCSV = () => {
    if (!filteredData.length) return;

    const headers = [
      "No",
      "Fakultas / Prodi / Unit",
      "Jenjang",
      "Type",
      "Target",
      "Range Target",
      "Operator",
      "Satuan",
      "Capaian Auditee",
      "Capaian Auditor",
      "Status",
    ];
    const rows = filteredData.map((row, idx) => [
      idx + 1,
      `"${row.FakultasUnit || ""}"`,
      `"${row.Jenjang || ""}"`,
      `"${row.Type || ""}"`,
      `"${row.Target || ""}"`,
      `"${row.RangeTarget || (row.TargetMin ? `${row.TargetMin}-${row.TargetMax}` : "")}"`,
      `"${row.Operator || ""}"`,
      `"${row.Satuan || ""}"`,
      row.TipeTarget === "kategori"
        ? `"${row.Capaian || (row.NormalizedCapaian >= 100 ? "Terlaksana" : "Belum Terlaksana")}"`
        : (row.NormalizedCapaian ?? row.Capaian ?? 0),
      row.TipeTarget === "kategori"
        ? `"${row.CapaianAuditor || (row.NormalizedCapaianAuditor >= 100 ? "Terlaksana" : "Belum Terlaksana")}"`
        : (row.NormalizedCapaianAuditor ?? row.CapaianAuditor ?? 0),
      checkStatusTarget(row) ? "Tercapai" : "Belum Tercapai",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `laporan_indikator_${selectedIndikator?.Pointing || "monitoring"}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* KPI METRIC CARDS                                          */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL PRODI / UNIT */}
        <div className="p-4 rounded-xl border bg-white shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Total Target Unit</span>
            <Layers size={16} className="text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <p className="text-xs text-gray-500 mt-1">Fakultas, Prodi & Unit Teraudit</p>
        </div>

        {/* RATA-RATA CAPAIAN */}
        <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/40 shadow-xs">
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Rata-rata Capaian</span>
            <TrendingUp size={16} className="text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-700">{stats.avg.toFixed(2)}</div>
          <p className="text-xs text-blue-600/80 mt-1">Dari total capaian {stats.sum.toFixed(1)}</p>
        </div>

        {/* TARGET TERCAPAI */}
        <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Tercapai</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{stats.highCount}</div>
          <p className="text-xs text-emerald-600/80 mt-1">
            {stats.total > 0 ? `${Math.round((stats.highCount / stats.total) * 100)}% dari target` : "0%"}
          </p>
        </div>

        {/* BELUM TERCAPAI */}
        <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/40 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Belum Tercapai</span>
            <AlertCircle size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700">{stats.lowCount}</div>
          <p className="text-xs text-amber-600/80 mt-1">
            {stats.total > 0 ? `${Math.round((stats.lowCount / stats.total) * 100)}% dari target` : "0%"}
          </p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* DATA TABLE CONTAINER WITH FILTER CONTROLS                 */}
      {/* ========================================================= */}
      <div className="rounded-2xl border bg-white shadow-xs overflow-hidden">
        {/* TABLE TOOLBAR */}
        <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-bold text-gray-900">
              {selectedIndikator?.nama || "Tabel Monitoring Capaian Indikator"}
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Rincian capaian penilaian auditor dan auditee pada masing-masing target prodi/unit
            </p>
          </div>

          {/* ACTION BUTTONS & SEARCH */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* SEARCH */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari prodi / fakultas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden"
              />
            </div>

            {/* JENJANG FILTER */}
            <select
              value={jenjangFilter}
              onChange={(e) => setJenjangFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 bg-white outline-hidden cursor-pointer"
            >
              <option value="all">Semua Jenjang</option>
              {availableJenjang.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>

            {/* STATUS FILTER */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 bg-white outline-hidden cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="tercapai">Tercapai</option>
              <option value="kurang">Belum Tercapai</option>
            </select>

            {/* EXPORT CSV */}
            <button
              onClick={handleExportCSV}
              disabled={filteredData.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 shadow-2xs transition disabled:opacity-50 cursor-pointer"
              title="Unduh data sebagai file CSV"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* TABLE CONTENT */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/40 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3.5 w-12 text-center">No</th>
                <th
                  onClick={() => toggleSort("nama")}
                  className="px-5 py-3.5 cursor-pointer hover:text-gray-900 transition select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Fakultas / Prodi / Unit</span>
                    {sortField === "nama" &&
                      (sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </div>
                </th>
                <th className="px-5 py-3.5 w-32">Jenjang / Tipe</th>
                <th className="px-5 py-3.5 w-40 text-center">Target Indikator</th>
                <th className="px-5 py-3.5 w-36 text-center">Capaian Auditee</th>
                <th
                  onClick={() => toggleSort("capaian")}
                  className="px-5 py-3.5 w-44 cursor-pointer hover:text-gray-900 transition select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Nilai Auditor</span>
                    {sortField === "capaian" &&
                      (sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </div>
                </th>
                <th className="px-5 py-3.5 w-36 text-center">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500 text-xs">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-r-transparent mb-2" />
                    <p>Memuat data monitoring indikator...</p>
                  </td>
                </tr>
              )}

              {!loading && filteredData.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 text-xs">
                    Tidak ada data indikator yang sesuai dengan filter.
                  </td>
                </tr>
              )}

              {!loading &&
                filteredData.map((row, idx) => {
                  const auditorVal = Number(row.NormalizedCapaianAuditor ?? row.CapaianAuditor ?? 0);
                  const auditeeVal = Number(row.NormalizedCapaian ?? row.Capaian ?? 0);
                  const isHigh = checkStatusTarget(row);
                  const progressPercent = calculateProgressPercent(row, auditorVal, isHigh);

                  return (
                    <tr key={idx} className="hover:bg-blue-50/20 transition">
                      <td className="px-5 py-3.5 text-center text-xs text-gray-400">{idx + 1}</td>
                      <td className="px-5 py-3.5 font-medium text-gray-900">
                        {renderLabelFakultasUnit(row)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {row.Jenjang ? (
                            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-semibold">
                              {row.Jenjang}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs">
                              {row.Type || "Unit"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center text-xs">
                        <span className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-800 font-medium font-mono">
                          {formatTarget(row)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center text-xs text-gray-600">
                        {row.TipeTarget === "kategori" ? (
                          <span className="capitalize font-medium text-gray-700">
                            {row.Capaian || (auditeeVal >= 100 ? "Terlaksana" : "Belum Terlaksana")}
                          </span>
                        ) : (
                          auditeeVal
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-gray-900">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              style={{ width: `${progressPercent}%` }}
                              className={`h-full rounded-full ${
                                isHigh ? "bg-emerald-500" : "bg-amber-500"
                              }`}
                            />
                          </div>
                          <span className="tabular-nums text-xs">
                            {row.TipeTarget === "kategori" ? (
                              <span className="capitalize font-medium">
                                {row.CapaianAuditor || (auditorVal >= 100 ? "Terlaksana" : "Belum Terlaksana")}
                              </span>
                            ) : (
                              auditorVal
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {isHigh ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium inline-flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            Tercapai
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-medium inline-flex items-center gap-1">
                            <AlertCircle size={12} />
                            Belum Tercapai
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>

            {!loading && filteredData.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50/80 font-bold text-gray-800 text-xs">
                  <td colSpan={5} className="px-5 py-3.5 text-right uppercase tracking-wider">
                    Total Akumulasi
                  </td>
                  <td className="px-5 py-3.5 text-right text-blue-700 tabular-nums">
                    {stats.sum.toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5" />
                </tr>
                <tr className="border-t border-gray-200 bg-gray-50 font-bold text-gray-800 text-xs">
                  <td colSpan={5} className="px-5 py-3.5 text-right uppercase tracking-wider">
                    Rata-rata Capaian
                  </td>
                  <td className="px-5 py-3.5 text-right text-emerald-700 tabular-nums">
                    {stats.avg.toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
