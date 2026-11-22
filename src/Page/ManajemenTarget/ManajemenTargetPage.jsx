import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Eye,
  EyeOff,
  Pencil,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import PageHeader from "@/Components/PageHeader";
import AdminOnlyBlockCard from "@/Components/AdminOnlyBlockCard";
import Tooltip from "@/Components/Tooltip";
import { useContent } from "@/Providers/ContentProvider";
import { useAuth } from "@/Providers/AuthProvider";
import { useToast } from "@/Providers/ToastProvider";
import { apiClient } from "@/Common/api";
import ManajemenTargetRenameModal from "./ManajemenTargetRenameModal";

const TYPE_STYLES = {
  fakultas: "bg-blue-50 text-blue-700 border-blue-200",
  prodi: "bg-indigo-50 text-indigo-700 border-indigo-200",
  unit: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const TYPE_LABELS = {
  fakultas: "Fakultas",
  prodi: "Prodi",
  unit: "Unit",
};

const ManajemenTargetPage = () => {
  const { addToast } = useToast();
  const { user } = useAuth();
  const {
    level,
    listLevel,
    setLevel,
    openChangeLevel,
    setOpenChangeLevel,
  } = useContent();

  const isAdmin =
    String(level || "").toLowerCase().trim() === "admin" ||
    String(user?.level || "").toLowerCase().trim() === "admin";

  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [togglingUuid, setTogglingUuid] = useState(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [renameTarget, setRenameTarget] = useState(null);

  const fetchTargets = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.get("/fakultasunits?mode=all&include_hidden=true");
      const raw = res?.data ?? res ?? [];
      const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
      setTargets(list);
    } catch (err) {
      const msg = err?.message || "Gagal memuat data target v_fakultas_unit";
      setErrorMsg(msg);
      addToast("error", msg);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (isAdmin) {
      fetchTargets();
    }
  }, [isAdmin, fetchTargets]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, statusFilter, pageSize]);

  const counts = useMemo(() => {
    let active = 0;
    let hidden = 0;
    let fakultas = 0;
    let prodi = 0;
    let unit = 0;

    for (const item of targets) {
      if (item.IsActive === false) hidden += 1;
      else active += 1;

      const t = String(item.Type || "").toLowerCase();
      if (t === "fakultas") fakultas += 1;
      else if (t === "prodi") prodi += 1;
      else if (t === "unit") unit += 1;
    }

    return { total: targets.length, active, hidden, fakultas, prodi, unit };
  }, [targets]);

  const filteredTargets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return targets.filter((item) => {
      const itemType = String(item.Type || "").toLowerCase();
      if (typeFilter !== "all" && itemType !== typeFilter) return false;

      const isActive = item.IsActive !== false;
      if (statusFilter === "active" && !isActive) return false;
      if (statusFilter === "hidden" && isActive) return false;

      if (!q) return true;
      const haystack = [
        item.Nama,
        item.NamaRaw,
        item.Fakultas,
        item.Jenjang,
        item.KodeFakultas,
        item.Type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [targets, search, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTargets.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedTargets = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredTargets.slice(start, start + pageSize);
  }, [filteredTargets, safePage, pageSize]);

  const handleToggleVisibility = async (row) => {
    if (!row?.UUID || togglingUuid) return;
    const nextActive = row.IsActive === false;
    setTogglingUuid(row.UUID);

    try {
      const res = await apiClient.put(`/fakultasunit/${row.UUID}`, {
        is_active: nextActive,
      });
      const updated = res?.data;

      setTargets((prev) =>
        prev.map((item) =>
          item.UUID === row.UUID
            ? updated && updated.UUID
              ? updated
              : { ...item, IsActive: nextActive }
            : item
        )
      );

      addToast(
        "success",
        nextActive
          ? `Target "${row.Nama}" ditampilkan pada seluruh pilihan input`
          : `Target "${row.Nama}" disembunyikan dari pilihan input`
      );
    } catch (err) {
      addToast(
        "error",
        err?.response?.data?.Message ||
          err?.message ||
          "Gagal mengubah visibilitas target"
      );
    } finally {
      setTogglingUuid(null);
    }
  };

  const handleRenameSuccess = (updated, targetUuid, fallbackNama) => {
    setTargets((prev) =>
      prev.map((item) => {
        if (item.UUID !== targetUuid) return item;
        if (updated && updated.UUID) return updated;
        const nextDisplay =
          String(item.Type || "").toLowerCase() === "prodi" && item.Jenjang
            ? `${fallbackNama} (${String(item.Jenjang).toUpperCase()})`
            : fallbackNama;
        return {
          ...item,
          Nama: nextDisplay,
          NamaRaw: fallbackNama,
        };
      })
    );
  };

  return (
    <>
      <Navbar
        renderChangeLevelModal={() => (
          <ChangeLevelModal
            open={openChangeLevel}
            onClose={() => setOpenChangeLevel(false)}
            levels={listLevel}
            currentLevel={level}
            onSubmit={(val) => {
              setLevel(val);
              setOpenChangeLevel(false);
            }}
          />
        )}
      />

      <div className="p-4 sm:p-6 bg-gray-50 min-h-screen space-y-4">
        <PageHeader
          icon={Building2}
          title="Manajemen Target"
          subtitle="Atur tampil/sembunyikan dan ubah nama target Fakultas, Prodi, dan Unit (v_fakultas_unit)"
        />

        {!isAdmin ? (
          <AdminOnlyBlockCard
            pageTitle="Manajemen Target"
            curRole={level}
            activeRoleUnit={{ name: user?.fakultas_unit || user?.nama_fakultas_unit }}
            onChangeLevel={() => setOpenChangeLevel(true)}
          />
        ) : (
          <>
            {/* Ringkasan Status & Filter Cepat */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`text-left p-4 rounded-xl border transition cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-white border-purple-400 ring-1 ring-purple-200 shadow-xs"
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="text-xs font-medium text-gray-500">Total Target</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {counts.total}
                </p>
                <p className="text-[11px] text-gray-500 mt-1">
                  {counts.fakultas} Fakultas · {counts.prodi} Prodi · {counts.unit} Unit
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  setStatusFilter((prev) => (prev === "active" ? "all" : "active"))
                }
                className={`text-left p-4 rounded-xl border transition cursor-pointer ${
                  statusFilter === "active"
                    ? "bg-white border-emerald-400 ring-1 ring-emerald-200 shadow-xs"
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-500">Tampil di Input</p>
                  <Eye className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-emerald-700 mt-1">
                  {counts.active}
                </p>
                <p className="text-[11px] text-gray-500 mt-1">
                  Aktif muncul pada form Template &amp; pilihan target
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  setStatusFilter((prev) => (prev === "hidden" ? "all" : "hidden"))
                }
                className={`text-left p-4 rounded-xl border transition cursor-pointer ${
                  statusFilter === "hidden"
                    ? "bg-white border-slate-400 ring-1 ring-slate-200 shadow-xs"
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-500">Disembunyikan</p>
                  <EyeOff className="w-4 h-4 text-gray-500" />
                </div>
                <p className="text-2xl font-bold text-gray-700 mt-1">
                  {counts.hidden}
                </p>
                <p className="text-[11px] text-gray-500 mt-1">
                  Tidak tampil di form input, data historis tetap aman
                </p>
              </button>
            </div>

            {/* Tabel Utama */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
              {/* Toolbar Pencarian & Filter Tipe */}
              <div className="p-4 border-b border-gray-150 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: "all", label: `Semua (${counts.total})` },
                    { id: "fakultas", label: `Fakultas (${counts.fakultas})` },
                    { id: "prodi", label: `Prodi (${counts.prodi})` },
                    { id: "unit", label: `Unit (${counts.unit})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setTypeFilter(tab.id)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                        typeFilter === tab.id
                          ? "bg-purple-700 text-white border-purple-700"
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-72">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Cari nama target, fakultas, jenjang..."
                      className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                        aria-label="Hapus pencarian"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <Tooltip content="Muat ulang data">
                    <button
                      type="button"
                      onClick={fetchTargets}
                      disabled={loading}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition cursor-pointer disabled:opacity-50 shrink-0"
                      aria-label="Muat ulang data"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                      />
                    </button>
                  </Tooltip>
                </div>
              </div>

              {/* Error State */}
              {errorMsg && (
                <div className="m-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between gap-2">
                  <span>{errorMsg}</span>
                  <button
                    type="button"
                    onClick={fetchTargets}
                    className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 font-semibold hover:bg-rose-100 cursor-pointer"
                  >
                    Coba Lagi
                  </button>
                </div>
              )}

              {/* Data Table */}
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider w-14 text-center">
                        No
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Nama Target
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">
                        Tipe
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">
                        Jenjang
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Fakultas
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider w-44 text-center">
                        Tampil / Sembunyikan
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider w-36 text-center">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading && targets.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-12 text-center text-xs text-gray-500"
                        >
                          Memuat data target...
                        </td>
                      </tr>
                    ) : pagedTargets.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-12 text-center text-xs text-gray-500"
                        >
                          Tidak ada data target yang sesuai filter.
                        </td>
                      </tr>
                    ) : (
                      pagedTargets.map((row, idx) => {
                        const rowNumber = (safePage - 1) * pageSize + idx + 1;
                        const isActive = row.IsActive !== false;
                        const typeKey = String(row.Type || "").toLowerCase();
                        const isBusy = togglingUuid === row.UUID;

                        return (
                          <tr
                            key={row.UUID || row.ID}
                            className={`transition-colors ${
                              isActive
                                ? "bg-white hover:bg-gray-50/70"
                                : "bg-gray-50/70 hover:bg-gray-100/70"
                            }`}
                          >
                            <td className="px-4 py-3 text-xs text-gray-500 text-center">
                              {rowNumber}
                            </td>
                            <td className="px-4 py-3">
                              <div
                                className={`text-sm font-medium ${
                                  isActive ? "text-gray-900" : "text-gray-500"
                                }`}
                              >
                                {row.Nama || "-"}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${
                                  TYPE_STYLES[typeKey] ||
                                  "bg-gray-100 text-gray-600 border-gray-200"
                                }`}
                              >
                                {TYPE_LABELS[typeKey] || row.Type || "-"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-700 uppercase font-medium">
                              {row.Jenjang || "-"}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-700">
                              {row.Fakultas || "-"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2.5">
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={isActive}
                                  disabled={isBusy}
                                  onClick={() => handleToggleVisibility(row)}
                                  aria-label={
                                    isActive
                                      ? `Sembunyikan ${row.Nama}`
                                      : `Tampilkan ${row.Nama}`
                                  }
                                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors cursor-pointer disabled:opacity-60 ${
                                    isActive
                                      ? "bg-emerald-600 border-emerald-600"
                                      : "bg-gray-300 border-gray-300"
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                                      isActive ? "translate-x-5.5" : "translate-x-1"
                                    }`}
                                  />
                                </button>
                                <span
                                  className={`text-xs font-medium min-w-[82px] ${
                                    isActive ? "text-emerald-700" : "text-gray-500"
                                  }`}
                                >
                                  {isBusy
                                    ? "Menyimpan..."
                                    : isActive
                                    ? "Tampil"
                                    : "Disembunyikan"}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => setRenameTarget(row)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Ubah Nama</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div className="px-4 py-3 border-t border-gray-150 bg-gray-50/40 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <span>
                    Menampilkan{" "}
                    <strong className="text-gray-800">
                      {filteredTargets.length === 0
                        ? 0
                        : (safePage - 1) * pageSize + 1}
                    </strong>
                    –
                    <strong className="text-gray-800">
                      {Math.min(safePage * pageSize, filteredTargets.length)}
                    </strong>{" "}
                    dari{" "}
                    <strong className="text-gray-800">
                      {filteredTargets.length}
                    </strong>{" "}
                    target
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="ml-2 px-2 py-1 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:border-purple-500"
                    aria-label="Jumlah baris per halaman"
                  >
                    <option value={15}>15 / hal</option>
                    <option value={30}>30 / hal</option>
                    <option value={50}>50 / hal</option>
                    <option value={200}>Semua</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>
                  <span className="px-2 font-medium text-gray-700">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <ManajemenTargetRenameModal
              open={Boolean(renameTarget)}
              data={renameTarget}
              onClose={() => setRenameTarget(null)}
              onSuccess={handleRenameSuccess}
            />
          </>
        )}
      </div>
    </>
  );
};

export default ManajemenTargetPage;
