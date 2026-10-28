import React, { useState, useEffect, useMemo, useCallback } from "react";
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

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create' | 'edit'
  const [submitting, setSubmitting] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Form inputs (strictly: tahun, tanggal_mulai, tanggal_akhir)
  const [formData, setFormData] = useState({
    tahun: "2027",
    tanggal_mulai: "",
    tanggal_akhir: "",
  });

  // Delete dialog state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

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
    if (!searchQuery.trim()) return jadwalList;
    const q = searchQuery.toLowerCase().trim();
    return jadwalList.filter((item) => {
      const tahun = String(item.tahun ?? item.Tahun ?? "");
      const tMulai = String(item.tanggal_mulai ?? item.TanggalMulai ?? "");
      const tAkhir = String(item.tanggal_akhir ?? item.TanggalAkhir ?? "");
      const sLabel = String(item.status_label ?? item.StatusLabel ?? "");
      return (
        tahun.toLowerCase().includes(q) ||
        tMulai.toLowerCase().includes(q) ||
        tAkhir.toLowerCase().includes(q) ||
        sLabel.toLowerCase().includes(q)
      );
    });
  }, [jadwalList, searchQuery]);

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
    });
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
    setFormData({
      tahun: item.tahun ?? item.Tahun ?? "2027",
      tanggal_mulai: item.tanggal_mulai ?? item.TanggalMulai ?? "",
      tanggal_akhir: item.tanggal_akhir ?? item.TanggalAkhir ?? "",
    });
    setIsModalOpen(true);
  };

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
        await apiClient.post("/proker_v3/jadwal", {
          tahun: formData.tahun.trim(),
          tanggal_mulai: formData.tanggal_mulai,
          tanggal_akhir: formData.tanggal_akhir,
        });
        addToast("success", "Jadwal program kerja berhasil ditambahkan");
      } else {
        const itemUuid = selectedItem?.uuid ?? selectedItem?.UUID;
        await apiClient.put(`/proker_v3/jadwal/${itemUuid}`, {
          tahun: formData.tahun.trim(),
          tanggal_mulai: formData.tanggal_mulai,
          tanggal_akhir: formData.tanggal_akhir,
        });
        addToast("success", "Jadwal program kerja berhasil diperbarui");
      }
      setIsModalOpen(false);
      fetchJadwalList();
    } catch (err) {
      addToast(
        "error",
        err?.response?.data?.error || err?.message || "Gagal menyimpan jadwal program kerja"
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

        {/* Search bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari tahun atau status..."
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-xl border border-gray-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
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
                  <th className="py-3 px-4 w-28">Tahun</th>
                  <th className="py-3 px-4">Tanggal Mulai</th>
                  <th className="py-3 px-4">Tanggal Akhir</th>
                  <th className="py-3 px-4">Status Pengajuan</th>
                  {isAdmin && <th className="py-3 px-4 w-28 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                        <span className="text-xs font-medium">Memuat data jadwal proker...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CalendarRange className="w-10 h-10 text-gray-300 stroke-[1.5]" />
                        <span className="text-sm font-semibold text-gray-600">
                          {searchQuery ? "Jadwal tidak ditemukan" : "Belum Ada Jadwal Proker"}
                        </span>
                        <p className="text-xs text-gray-400 max-w-sm">
                          {searchQuery
                            ? "Coba ubah kata kunci pencarian Anda."
                            : "Tambahkan jadwal pembukaan pengajuan program kerja untuk tahun 2027."}
                        </p>
                        {isAdmin && !searchQuery && (
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
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
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

            {/* Modal Body: ONLY 3 fields as requested */}
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
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
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
                  <span>{modalMode === "create" ? "Simpan Jadwal" : "Perbarui Jadwal"}</span>
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
