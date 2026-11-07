import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import PageHeader from "@/Components/PageHeader";
import ConfirmDeleteDialog from "@/Components/ConfirmDeleteDialog";
import Tooltip from "@/Components/Tooltip";
import { useToast } from "@/Providers/ToastProvider";
import { useContent } from "@/Providers/ContentProvider";
import { useAuth } from "@/Providers/AuthProvider";
import { apiClient } from "@/Common/api";
import {
  Calendar,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  X,
  CalendarRange,
  Building2,
  Layers,
  Check,
  ChevronDown,
  Globe,
} from "lucide-react";

export default function JadwalProkerV3Page() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const {
    level,
    listLevel,
    setLevel,
    openChangeLevel,
    setOpenChangeLevel,
    positionYear,
  } = useContent();

  const curRole = String(
    localStorage.getItem("activeLevel") || level || user?.level || ""
  )
    .toLowerCase()
    .trim();
  const isAdmin = curRole === "admin";

  // Data & loading states
  const [loading, setLoading] = useState(false);
  const [jadwalList, setJadwalList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUnitType, setFilterUnitType] = useState("all"); // 'all' | 'global' | 'specific'
  const [unitOptions, setUnitOptions] = useState([]);

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create' | 'edit'
  const [submitting, setSubmitting] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Form inputs: tahun, tanggal_mulai, tanggal_akhir, id_fakultas_unit (edit), target_units (create multi)
  const [formData, setFormData] = useState({
    tahun: "2027",
    tanggal_mulai: "",
    tanggal_akhir: "",
    id_fakultas_unit: "",
    target_units: [],
  });

  // Dropdown search target states
  const [targetDropdownOpen, setTargetDropdownOpen] = useState(false);
  const [targetSearchQuery, setTargetSearchQuery] = useState("");
  const targetDropdownRef = useRef(null);

  useEffect(() => {
    if (!targetDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (
        targetDropdownRef.current &&
        !targetDropdownRef.current.contains(e.target)
      ) {
        setTargetDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [targetDropdownOpen]);

  // Delete dialog state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Fetch unit options
  const fetchUnitOptions = useCallback(async () => {
    try {
      const res = await apiClient.get("/proker_v3_options");
      const units = res?.data?.units || [];
      setUnitOptions(Array.isArray(units) ? units : []);
    } catch (e) {
      console.error("Gagal memuat opsi unit:", e);
    }
  }, []);

  useEffect(() => {
    fetchUnitOptions();
  }, [fetchUnitOptions]);

  // Fetch jadwal list
  const fetchJadwalList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/proker_v3/jadwal");
      const data = res?.data?.data || [];
      setJadwalList(Array.isArray(data) ? data : []);
    } catch (err) {
      addToast(
        "error",
        err?.response?.data?.error || err?.message || "Gagal memuat daftar jadwal proker"
      );
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchJadwalList();
  }, [fetchJadwalList]);

  // Filtered list
  const filteredList = useMemo(() => {
    let list = jadwalList;
    if (filterUnitType === "global") {
      list = list.filter((i) => !i.id_fakultas_unit || i.id_fakultas_unit === 0);
    } else if (filterUnitType === "specific") {
      list = list.filter((i) => i.id_fakultas_unit && i.id_fakultas_unit > 0);
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((item) => {
      const tahun = String(item.tahun ?? item.Tahun ?? "");
      const tMulai = String(item.tanggal_mulai ?? item.TanggalMulai ?? "");
      const tAkhir = String(item.tanggal_akhir ?? item.TanggalAkhir ?? "");
      const sLabel = String(item.status_label ?? item.StatusLabel ?? "");
      const uName = String(item.nama_fakultas_unit ?? item.NamaFakultasUnit ?? "");
      return (
        tahun.toLowerCase().includes(q) ||
        tMulai.toLowerCase().includes(q) ||
        tAkhir.toLowerCase().includes(q) ||
        sLabel.toLowerCase().includes(q) ||
        uName.toLowerCase().includes(q)
      );
    });
  }, [jadwalList, searchQuery, filterUnitType]);

  // Open Create Modal
  const handleOpenCreate = () => {
    if (!isAdmin) {
      addToast("warning", "Akses ditolak: Hanya admin yang dapat menambah jadwal");
      return;
    }
    setModalMode("create");
    setSelectedItem(null);
    setFormData({
      tahun: positionYear || "2027",
      tanggal_mulai: "",
      tanggal_akhir: "",
      id_fakultas_unit: "",
      target_units: [],
    });
    setTargetSearchQuery("");
    setTargetDropdownOpen(false);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    if (!isAdmin) {
      addToast("warning", "Akses ditolak: Hanya admin yang dapat mengubah jadwal");
      return;
    }
    setModalMode("edit");
    setSelectedItem(item);
    const unitId = item.id_fakultas_unit ?? item.IdFakultasUnit;
    setFormData({
      tahun: item.tahun ?? item.Tahun ?? "2027",
      tanggal_mulai: item.tanggal_mulai ?? item.TanggalMulai ?? "",
      tanggal_akhir: item.tanggal_akhir ?? item.TanggalAkhir ?? "",
      id_fakultas_unit: unitId ? String(unitId) : "",
      target_units: unitId ? [String(unitId)] : [],
    });
    setTargetSearchQuery("");
    setTargetDropdownOpen(false);
    setIsModalOpen(true);
  };

  // Target dropdown computed helpers
  const isCreateGlobal = useMemo(() => {
    return (
      formData.target_units.length === 0 ||
      formData.target_units.includes("global")
    );
  }, [formData.target_units]);

  const filteredDropdownUnits = useMemo(() => {
    if (!targetSearchQuery.trim()) return unitOptions;
    const q = targetSearchQuery.toLowerCase().trim();
    return unitOptions.filter((u) => {
      const nama = String(
        u.nama_fak_prod_unit ?? u.NamaFakProdUnit ?? u.nama ?? ""
      ).toLowerCase();
      const type = String(u.type ?? u.Type ?? "").toLowerCase();
      const fakultas = String(u.fakultas ?? u.Fakultas ?? "").toLowerCase();
      return nama.includes(q) || type.includes(q) || fakultas.includes(q);
    });
  }, [unitOptions, targetSearchQuery]);

  const editSelectedUnitObj = useMemo(() => {
    if (!formData.id_fakultas_unit) return null;
    return (
      unitOptions.find(
        (u) => String(u.id ?? u.Id ?? "") === String(formData.id_fakultas_unit)
      ) || null
    );
  }, [formData.id_fakultas_unit, unitOptions]);

  // Submit Create / Edit
  const handleSubmitForm = async (e) => {
    e.preventDefault();

    if (!formData.tahun.trim()) {
      addToast("warning", "Tahun program kerja wajib diisi");
      return;
    }
    if (!formData.tanggal_mulai) {
      addToast("warning", "Tanggal mulai wajib diisi");
      return;
    }
    if (!formData.tanggal_akhir) {
      addToast("warning", "Tanggal akhir wajib diisi");
      return;
    }
    if (new Date(formData.tanggal_akhir) < new Date(formData.tanggal_mulai)) {
      addToast("warning", "Tanggal akhir tidak boleh lebih awal dari tanggal mulai");
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === "create") {
        if (isCreateGlobal) {
          const fd = new FormData();
          fd.append("tahun", formData.tahun.trim());
          fd.append("tanggal_mulai", formData.tanggal_mulai);
          fd.append("tanggal_akhir", formData.tanggal_akhir);
          fd.append("id_fakultas_unit", "");
          await apiClient.post("/proker_v3/jadwal", fd);
          addToast("success", "Jadwal program kerja (Global) berhasil ditambahkan");
        } else {
          // Multiple requests: request sebanyak target unit yang dipilih
          const targets = formData.target_units.filter(
            (id) => id && id !== "global"
          );
          const requests = targets.map((unitId) => {
            const fd = new FormData();
            fd.append("tahun", formData.tahun.trim());
            fd.append("tanggal_mulai", formData.tanggal_mulai);
            fd.append("tanggal_akhir", formData.tanggal_akhir);
            fd.append("id_fakultas_unit", String(Number(unitId)));
            return apiClient.post("/proker_v3/jadwal", fd);
          });

          const results = await Promise.allSettled(requests);
          const successCount = results.filter(
            (r) => r.status === "fulfilled"
          ).length;
          const failCount = results.filter(
            (r) => r.status === "rejected"
          ).length;

          if (failCount === 0) {
            addToast(
              "success",
              `${successCount} jadwal program kerja unit berhasil ditambahkan`
            );
          } else {
            addToast(
              "warning",
              `${successCount} jadwal berhasil ditambahkan, ${failCount} gagal (kemungkinan sudah ada)`
            );
          }
        }
      } else {
        // Edit mode: tetap single item
        const fd = new FormData();
        fd.append("tahun", formData.tahun.trim());
        fd.append("tanggal_mulai", formData.tanggal_mulai);
        fd.append("tanggal_akhir", formData.tanggal_akhir);
        fd.append(
          "id_fakultas_unit",
          formData.id_fakultas_unit ? String(Number(formData.id_fakultas_unit)) : ""
        );
        const itemUuid = selectedItem?.uuid ?? selectedItem?.UUID;
        await apiClient.put(`/proker_v3/jadwal/${itemUuid}`, fd);
        addToast("success", "Jadwal program kerja berhasil diperbarui");
      }
      setIsModalOpen(false);
      fetchJadwalList();
    } catch (err) {
      addToast(
        "error",
        err?.response?.data?.error ||
          err?.message ||
          "Gagal menyimpan jadwal program kerja"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Trigger Delete
  const handleTriggerDelete = (item) => {
    if (!isAdmin) {
      addToast("warning", "Akses ditolak: Hanya admin yang dapat menghapus jadwal");
      return;
    }
    setItemToDelete(item);
    setConfirmDelete(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    const itemUuid = itemToDelete?.uuid ?? itemToDelete?.UUID;
    if (!itemUuid) return;
    try {
      await apiClient.delete(`/proker_v3/jadwal/${itemUuid}`);
      addToast("success", "Jadwal program kerja berhasil dihapus");
      fetchJadwalList();
    } catch (err) {
      addToast(
        "error",
        err?.response?.data?.error || err?.message || "Gagal menghapus jadwal program kerja"
      );
    } finally {
      setConfirmDelete(false);
      setItemToDelete(null);
    }
  };

  // Helper date formatter (ID)
  const formatDateID = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const cleanStr = String(dateStr).split("T")[0].trim();
      const parts = cleanStr.split("-");
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const dateObj = new Date(y, m, d);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          });
        }
      }
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Render Status Badge
  const renderStatusBadge = (status, label) => {
    if (status === "berjalan") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{label || "Sedang Dibuka"}</span>
        </span>
      );
    }
    if (status === "belum_dibuka") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3.5 h-3.5" />
          <span>{label || "Belum Dibuka"}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <XCircle className="w-3.5 h-3.5" />
        <span>{label || "Ditutup"}</span>
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <PageHeader
          icon={CalendarRange}
          title="Jadwal Program Kerja"
          subtitle="Pengaturan periode waktu pengajuan program kerja (berlaku untuk perencanaan audit 2027 / V3)"
        />

        {/* Info Banner */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider text-gray-500">
                  Aturan Pengajuan Proker V3 (2027):
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-indigo-100 text-indigo-800">
                  Wajib Sesuai Jadwal
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 font-medium mt-0.5">
                Operator unit hanya dapat mengajukan program kerja dan aktivitas jika tanggal pengajuan berada di dalam rentang tanggal mulai dan tanggal akhir yang telah ditentukan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs hover:shadow transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Jadwal</span>
              </button>
            )}
            <button
              type="button"
              onClick={fetchJadwalList}
              disabled={loading}
              className="inline-flex items-center justify-center p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 shadow-2xs transition cursor-pointer disabled:opacity-50"
              title="Muat Ulang"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Search bar & Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari tahun, unit, atau status..."
                className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-xl border border-gray-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            {/* Quick Segmented Filter */}
            <div className="inline-flex items-center bg-gray-100 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterUnitType("all")}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  filterUnitType === "all"
                    ? "bg-white text-gray-800 shadow-2xs font-bold"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setFilterUnitType("global")}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  filterUnitType === "global"
                    ? "bg-white text-indigo-700 shadow-2xs font-bold"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Global (Semua)
              </button>
              <button
                type="button"
                onClick={() => setFilterUnitType("specific")}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  filterUnitType === "specific"
                    ? "bg-white text-emerald-700 shadow-2xs font-bold"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Khusus Unit
              </button>
            </div>
          </div>

          <div className="text-xs text-gray-500 font-medium">
            Total Jadwal: <span className="font-bold text-gray-700">{filteredList.length}</span>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gray-50/80 text-gray-600 font-bold border-b border-gray-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 w-24">Tahun</th>
                  <th className="py-3 px-4">Target Unit / Fakultas</th>
                  <th className="py-3 px-4">Tanggal Mulai</th>
                  <th className="py-3 px-4">Tanggal Akhir</th>
                  <th className="py-3 px-4">Status Pengajuan</th>
                  {isAdmin && <th className="py-3 px-4 w-28 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                        <span className="text-xs font-medium">Memuat data jadwal proker...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CalendarRange className="w-10 h-10 text-gray-300 stroke-[1.5]" />
                        <span className="text-sm font-semibold text-gray-600">
                          {searchQuery || filterUnitType !== "all"
                            ? "Jadwal tidak ditemukan"
                            : "Belum Ada Jadwal Proker"}
                        </span>
                        <p className="text-xs text-gray-400 max-w-sm">
                          {searchQuery || filterUnitType !== "all"
                            ? "Coba sesuaikan kata kunci pencarian atau filter unit Anda."
                            : "Tambahkan jadwal pembukaan pengajuan program kerja untuk tahun 2027."}
                        </p>
                        {isAdmin && !searchQuery && filterUnitType === "all" && (
                          <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambah Jadwal Sekarang</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item, idx) => {
                    const itemUuid = item.uuid ?? item.UUID ?? idx;
                    const itemTahun = item.tahun ?? item.Tahun ?? "-";
                    const itemTanggalMulai = item.tanggal_mulai ?? item.TanggalMulai ?? "";
                    const itemTanggalAkhir = item.tanggal_akhir ?? item.TanggalAkhir ?? "";
                    const itemStatus = item.status ?? item.Status ?? "";
                    const itemStatusLabel = item.status_label ?? item.StatusLabel ?? "";
                    const itemUnitId = item.id_fakultas_unit ?? item.IdFakultasUnit ?? null;
                    const itemUnitName = item.nama_fakultas_unit ?? item.NamaFakultasUnit ?? "";
                    const itemUnitType = item.type_fakultas_unit ?? item.TypeFakultasUnit ?? "";

                    return (
                      <tr
                        key={itemUuid}
                        className="hover:bg-indigo-50/20 transition-colors"
                      >
                        <td className="py-3 px-4 text-center text-gray-400 font-medium">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-bold text-gray-800">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-xs">
                            {itemTahun}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {!itemUnitId || itemUnitId === 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold">
                              <Layers className="w-3.5 h-3.5" />
                              <span>Semua Unit (Global)</span>
                            </span>
                          ) : (
                            <div className="flex flex-col items-start gap-0.5">
                              <span className="inline-flex items-center gap-1.5 font-bold text-gray-800 text-xs">
                                <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <span>{itemUnitName || `Unit #${itemUnitId}`}</span>
                              </span>
                              {itemUnitType && (
                                <span className="text-[10px] uppercase font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded tracking-wider">
                                  {itemUnitType}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-700 font-medium">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span>{formatDateID(itemTanggalMulai)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-700 font-medium">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span>{formatDateID(itemTanggalAkhir)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {renderStatusBadge(itemStatus, itemStatusLabel)}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <Tooltip title="Ubah Jadwal">
                                <button
                                   type="button"
                                   onClick={() => handleOpenEdit(item)}
                                   className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition cursor-pointer"
                                 >
                                   <Pencil className="w-3.5 h-3.5" />
                                 </button>
                               </Tooltip>
                               <Tooltip title="Hapus Jadwal">
                                 <button
                                   type="button"
                                   onClick={() => handleTriggerDelete(item)}
                                   className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
                                 >
                                   <Trash2 className="w-3.5 h-3.5" />
                                 </button>
                               </Tooltip>
                             </div>
                           </td>
                         )}
                       </tr>
                     );
                   })
                 )}
               </tbody>
             </table>
           </div>
         </div>
      </main>

      {/* MODAL FORM TAMBAH / EDIT JADWAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg overflow-visible">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-gray-800 text-sm sm:text-base">
                  {modalMode === "create" ? "Tambah Jadwal Program Kerja" : "Ubah Jadwal Program Kerja"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Tahun Program Kerja <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.tahun}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, tahun: e.target.value }))
                  }
                  placeholder="Contoh: 2027"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Tentukan tahun berlakunya pengajuan program kerja (misal: 2027).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>
                    Target Fakultas / Unit <span className="text-rose-500">*</span>
                  </span>
                  {modalMode === "create" ? (
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                      Pilihan Ganda (Multi)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      Pilihan Tunggal (Single)
                    </span>
                  )}
                </label>

                {/* Searchable Dropdown Container */}
                <div className="relative" ref={targetDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setTargetDropdownOpen((prev) => !prev)}
                    className="w-full min-h-[42px] px-3.5 py-2 text-left rounded-xl border border-gray-200 bg-white hover:border-indigo-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition flex items-center justify-between gap-2 cursor-pointer shadow-2xs"
                  >
                    {modalMode === "create" ? (
                      // Multi-Select Trigger (Create Mode)
                      isCreateGlobal ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <Globe className="w-4 h-4 text-purple-600 shrink-0" />
                          <span className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
                            🌐 Semua Unit / Fakultas (Global)
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0 py-0.5">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-bold text-[11px] shrink-0">
                            {formData.target_units.length} Unit
                          </span>
                          {formData.target_units.slice(0, 2).map((uId) => {
                            const u = unitOptions.find(
                              (opt) => String(opt.id) === String(uId)
                            );
                            const name =
                              u?.nama_fak_prod_unit || u?.nama || `Unit #${uId}`;
                            return (
                              <span
                                key={uId}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-medium max-w-[140px] truncate"
                              >
                                <span className="truncate">{name}</span>
                              </span>
                            );
                          })}
                          {formData.target_units.length > 2 && (
                            <span className="text-xs text-gray-500 font-semibold">
                              +{formData.target_units.length - 2} lainnya
                            </span>
                          )}
                        </div>
                      )
                    ) : (
                      // Single-Select Trigger (Edit Mode)
                      !formData.id_fakultas_unit ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <Globe className="w-4 h-4 text-purple-600 shrink-0" />
                          <span className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
                            🌐 Semua Unit / Fakultas (Global)
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
                            {editSelectedUnitObj?.nama_fak_prod_unit ||
                              editSelectedUnitObj?.nama ||
                              `Unit #${formData.id_fakultas_unit}`}
                          </span>
                          {editSelectedUnitObj?.type && (
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 shrink-0">
                              {editSelectedUnitObj.type}
                            </span>
                          )}
                        </div>
                      )
                    )}

                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${
                        targetDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Popover Dropdown */}
                  {targetDropdownOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                      {/* Search Bar inside Popover */}
                      <div className="p-2.5 border-b border-gray-100 bg-gray-50/70">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={targetSearchQuery}
                            onChange={(e) => setTargetSearchQuery(e.target.value)}
                            placeholder="Cari nama fakultas, prodi, atau unit..."
                            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-gray-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                            autoFocus
                          />
                          {targetSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setTargetSearchQuery("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Quick Action Toolbar for Multi-Select (Create Mode) */}
                        {modalMode === "create" && (
                          <div className="flex items-center justify-between gap-1.5 mt-2 pt-2 border-t border-gray-200/60 text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    target_units: [],
                                  }));
                                }}
                                className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer ${
                                  isCreateGlobal
                                    ? "bg-purple-600 text-white"
                                    : "bg-gray-200/70 text-gray-600 hover:bg-gray-200"
                                }`}
                              >
                                🌐 Global
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    target_units: unitOptions.map((u) => String(u.id)),
                                  }));
                                }}
                                className="px-2 py-0.5 rounded-md bg-gray-200/70 hover:bg-indigo-100 hover:text-indigo-700 text-gray-600 font-semibold transition cursor-pointer"
                              >
                                Pilih Semua ({unitOptions.length})
                              </button>
                            </div>
                            {!isCreateGlobal && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    target_units: [],
                                  }));
                                }}
                                className="text-rose-600 hover:underline font-semibold cursor-pointer"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Options List */}
                      <div className="max-h-56 overflow-y-auto p-1.5 space-y-1 divide-y divide-gray-50">
                        {/* Option Global */}
                        <div
                          onClick={() => {
                            if (modalMode === "create") {
                              setFormData((prev) => ({
                                ...prev,
                                target_units: [],
                              }));
                            } else {
                              setFormData((prev) => ({
                                ...prev,
                                id_fakultas_unit: "",
                              }));
                              setTargetDropdownOpen(false);
                            }
                          }}
                          className={`px-3 py-2 rounded-xl cursor-pointer flex items-center justify-between text-xs transition ${
                            (modalMode === "create" ? isCreateGlobal : !formData.id_fakultas_unit)
                              ? "bg-purple-50 text-purple-900 font-bold border border-purple-200"
                              : "hover:bg-gray-50 text-gray-700 font-medium"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {modalMode === "create" ? (
                              <input
                                type="checkbox"
                                checked={isCreateGlobal}
                                readOnly
                                className="rounded text-purple-600 focus:ring-0 cursor-pointer"
                              />
                            ) : (
                              !formData.id_fakultas_unit && (
                                <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                              )
                            )}
                            <div className="flex items-center gap-1.5">
                              <Globe className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                              <span>🌐 Semua Unit / Fakultas (Global)</span>
                            </div>
                          </div>
                          <span className="text-[10px] uppercase font-bold text-purple-600 bg-purple-100/70 px-1.5 py-0.5 rounded">
                            Global
                          </span>
                        </div>

                        {/* Specific Units */}
                        <div className="pt-1 space-y-1">
                          {filteredDropdownUnits.length === 0 ? (
                            <div className="py-4 text-center text-gray-400 text-xs">
                              Tidak ada unit ditemukan untuk "{targetSearchQuery}"
                            </div>
                          ) : (
                            filteredDropdownUnits.map((u) => {
                              const uId = String(u.id ?? u.Id ?? "");
                              const uName =
                                u.nama_fak_prod_unit ?? u.NamaFakProdUnit ?? u.nama ?? "";
                              const uType = (u.type ?? u.Type ?? "").toUpperCase();
                              const isChecked =
                                modalMode === "create"
                                  ? formData.target_units.includes(uId)
                                  : String(formData.id_fakultas_unit) === uId;

                              return (
                                <div
                                  key={uId}
                                  onClick={() => {
                                    if (modalMode === "create") {
                                      setFormData((prev) => {
                                        const current = prev.target_units.filter(
                                          (id) => id !== "global"
                                        );
                                        const next = current.includes(uId)
                                          ? current.filter((id) => id !== uId)
                                          : [...current, uId];
                                        return { ...prev, target_units: next };
                                      });
                                    } else {
                                      setFormData((prev) => ({
                                        ...prev,
                                        id_fakultas_unit: uId,
                                      }));
                                      setTargetDropdownOpen(false);
                                    }
                                  }}
                                  className={`px-3 py-2 rounded-xl cursor-pointer flex items-center justify-between text-xs transition ${
                                    isChecked
                                      ? "bg-indigo-50/80 text-indigo-900 font-bold border border-indigo-200"
                                      : "hover:bg-gray-50 text-gray-700 font-medium"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {modalMode === "create" ? (
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        readOnly
                                        className="rounded text-indigo-600 focus:ring-0 cursor-pointer shrink-0"
                                      />
                                    ) : (
                                      isChecked && (
                                        <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                      )
                                    )}
                                    <span className="truncate">{uName}</span>
                                  </div>
                                  {uType && (
                                    <span
                                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ml-2 ${
                                        uType === "FAKULTAS"
                                          ? "bg-purple-100 text-purple-700"
                                          : uType === "PRODI"
                                          ? "bg-blue-100 text-blue-700"
                                          : "bg-emerald-100 text-emerald-700"
                                      }`}
                                    >
                                      {uType}
                                    </span>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-gray-400 mt-1">
                  {modalMode === "create"
                    ? "Pilih 'Semua Unit (Global)' atau tentukan satu/lebih unit spesifik. Jika memilih banyak unit, sistem akan membuat jadwal untuk masing-masing unit secara serentak."
                    : "Pilih 'Semua Unit (Global)' atau tentukan satu unit spesifik untuk jadwal ini."}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Tanggal Mulai Pengajuan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.tanggal_mulai}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, tanggal_mulai: e.target.value }))
                  }
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Tanggal Akhir Pengajuan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.tanggal_akhir}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, tanggal_akhir: e.target.value }))
                  }
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-2xs hover:shadow transition cursor-pointer disabled:opacity-50"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {modalMode === "create"
                      ? isCreateGlobal
                        ? "Simpan Jadwal (Global)"
                        : `Simpan ${formData.target_units.length} Jadwal`
                      : "Perbarui Jadwal"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDeleteDialog
        isOpen={confirmDelete}
        title="Hapus Jadwal Program Kerja"
        message={`Apakah Anda yakin ingin menghapus jadwal program kerja tahun ${itemToDelete?.tahun ?? itemToDelete?.Tahun ?? ""}?`}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setConfirmDelete(false);
          setItemToDelete(null);
        }}
      />
    </div>
  );
}
