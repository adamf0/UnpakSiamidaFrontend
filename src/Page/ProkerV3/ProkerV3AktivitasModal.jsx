import React, { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useAuth } from "@/Providers/AuthProvider";
import { useToast } from "@/Providers/ToastProvider";
import { apiClient, API_BASE_URL } from "@/Common/api";
import {
  BULAN_LIST,
  WEEKS,
  parseSlotArray,
  formatBytes,
  formatRupiah,
} from "./prokerConstants";
import {
  X,
  Calendar,
  Building2,
  Clock,
  Layers,
  FileText,
  DollarSign,
  User,
  Upload,
  Trash2,
  FileIcon,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Plus,
  Pencil,
  Save,
  Check,
  FolderOpen,
  Send,
  Eye,
} from "lucide-react";

export default function ProkerV3AktivitasModal({
  open,
  prokerUuid,
  onClose,
  onRefreshParent,
}) {
  const { getValidToken } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  // ==========================================
  // Form Anggaran & Luaran State
  // ==========================================
  const [anggaranInput, setAnggaranInput] = useState(0);
  const [luaranProdukInput, setLuaranProdukInput] = useState("");
  const [dokumenReferensiInput, setDokumenReferensiInput] = useState("");
  const [savingAnggaran, setSavingAnggaran] = useState(false);

  // Upload Dokumen Referensi Program State
  const [docRefFiles, setDocRefFiles] = useState([]);
  const [docRefKeterangan, setDocRefKeterangan] = useState("");
  const [uploadingDocRef, setUploadingDocRef] = useState(false);

  // ==========================================
  // Timeline Form State (Add / Edit)
  // ==========================================
  const [showTimelineForm, setShowTimelineForm] = useState(false);
  const [editingTimelineUuid, setEditingTimelineUuid] = useState(null);
  const [timelineNo, setTimelineNo] = useState(1);
  const [timelineNama, setTimelineNama] = useState("");
  const [timelinePic, setTimelinePic] = useState("");
  const [timelineTitikKontrol, setTimelineTitikKontrol] = useState("RK");
  const [timelineJadwalRkSlots, setTimelineJadwalRkSlots] = useState([]);
  const [timelineJadwalRSlots, setTimelineJadwalRSlots] = useState([]);
  const [timelineCapaian, setTimelineCapaian] = useState("");
  const [timelineMasalah, setTimelineMasalah] = useState("");
  const [timelinePemecahanMasalah, setTimelinePemecahanMasalah] = useState("");
  const [timelineStatus, setTimelineStatus] = useState("Belum Terlaksana");
  const [savingTimeline, setSavingTimeline] = useState(false);

  // File Upload State per timeline (Bukti Kegiatan)
  const [uploadingTimelineId, setUploadingTimelineId] = useState(null);
  const [selectedFilesByTimeline, setSelectedFilesByTimeline] = useState({});
  const [keteranganByTimeline, setKeteranganByTimeline] = useState({});

  // ==========================================
  // Fetch Detail Proker
  // ==========================================
  const fetchDetail = async () => {
    if (!prokerUuid) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/proker_v3/${prokerUuid}`);
      const json = res.data;
      setData(json);

      // Populate Anggaran & Luaran
      setAnggaranInput(json.Anggaran || 0);
      setLuaranProdukInput(json.LuaranProduk || "");
      setDokumenReferensiInput(json.DokumenReferensi || "");
    } catch (err) {
      addToast("error", err?.message || "Gagal memuat detail aktivitas program kerja");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && prokerUuid) {
      fetchDetail();
      setShowTimelineForm(false);
      setEditingTimelineUuid(null);
    } else {
      setData(null);
      setSelectedFilesByTimeline({});
      setKeteranganByTimeline({});
      setDocRefFiles([]);
      setDocRefKeterangan("");
    }
  }, [open, prokerUuid]);

  // ==========================================
  // Simpan Anggaran & Luaran Mata Program
  // ==========================================
  const handleSaveAnggaranLuaran = async () => {
    if (!prokerUuid) return;
    setSavingAnggaran(true);
    try {
      const payload = {
        anggaran: Number(anggaranInput) || 0,
        luaran_produk: luaranProdukInput.trim(),
        dokumen_referensi: dokumenReferensiInput.trim(),
      };

      await apiClient.put(
        `/proker_v3/${prokerUuid}/anggaran_luaran`,
        payload
      );

      addToast("success", "Anggaran & Luaran Produk berhasil disimpan");
      fetchDetail();
      onRefreshParent?.();
    } catch (err) {
      addToast("error", err?.message || "Terjadi kesalahan sistem");
    } finally {
      setSavingAnggaran(false);
    }
  };

  // ==========================================
  // Upload Dokumen Referensi Program
  // ==========================================
  const handleUploadDocRef = async () => {
    if (docRefFiles.length === 0) {
      addToast("warning", "Pilih minimal 1 file dokumen referensi untuk diunggah");
      return;
    }

    setUploadingDocRef(true);
    try {
      const formData = new FormData();
      docRefFiles.forEach((file) => {
        formData.append("files", file);
      });
      formData.append(
        "keterangan",
        docRefKeterangan.trim() || "Dokumen Referensi Program (TOR/Proposal/SOP)"
      );

      await apiClient.post(
        `/proker_v3/${prokerUuid}/dokumen_referensi`,
        formData
      );

      addToast("success", `${docRefFiles.length} Dokumen referensi berhasil diunggah`);
      setDocRefFiles([]);
      setDocRefKeterangan("");
      await fetchDetail();
      onRefreshParent?.();
    } catch (err) {
      addToast("error", err?.message || "Gagal mengunggah dokumen referensi");
    } finally {
      setUploadingDocRef(false);
    }
  };

  // ==========================================
  // Timeline Slot Toggle (RK & R)
  // ==========================================
  const toggleTimelineSlot = (type, slotKey) => {
    if (type === "RK") {
      setTimelineJadwalRkSlots((prev) =>
        prev.includes(slotKey) ? prev.filter((k) => k !== slotKey) : [...prev, slotKey]
      );
    } else {
      setTimelineJadwalRSlots((prev) =>
        prev.includes(slotKey) ? prev.filter((k) => k !== slotKey) : [...prev, slotKey]
      );
    }
  };

  // ==========================================
  // Open Add Timeline
  // ==========================================
  const handleOpenAddTimeline = () => {
    const nextNo = (data?.Timelines?.length || 0) + 1;
    setTimelineNo(nextNo);
    setTimelineNama("");
    setTimelinePic(data?.PIC || "");
    setTimelineTitikKontrol("RK");
    setTimelineJadwalRkSlots([]);
    setTimelineJadwalRSlots([]);
    setTimelineCapaian("");
    setTimelineMasalah("");
    setTimelinePemecahanMasalah("");
    setTimelineStatus("Belum Terlaksana");
    setEditingTimelineUuid(null);
    setShowTimelineForm(true);
  };

  // ==========================================
  // Open Edit Timeline
  // ==========================================
  const handleOpenEditTimeline = (tl) => {
    setTimelineNo(tl.NoAktivitas || 1);
    setTimelineNama(tl.NamaAktivitas || "");
    setTimelinePic(tl.PIC || "");
    setTimelineTitikKontrol(tl.TitikKontrol || "RK");
    setTimelineJadwalRkSlots(parseSlotArray(tl.JadwalRk));
    setTimelineJadwalRSlots(parseSlotArray(tl.JadwalR));
    setTimelineCapaian(tl.Capaian || "");
    setTimelineMasalah(tl.Masalah || "");
    setTimelinePemecahanMasalah(tl.PemecahanMasalah || "");
    setTimelineStatus(tl.Status || "Belum Terlaksana");
    setEditingTimelineUuid(tl.UUID);
    setShowTimelineForm(true);
  };

  // ==========================================
  // Save Timeline (Create / Update)
  // ==========================================
  const handleSaveTimeline = async (e) => {
    e.preventDefault();
    if (!timelineNama.trim()) {
      addToast("warning", "Nama aktivitas wajib diisi");
      return;
    }

    setSavingTimeline(true);
    try {
      const token = getValidToken();
      const payload = {
        no_aktivitas: Number(timelineNo) || 1,
        nama_aktivitas: timelineNama.trim(),
        pic: timelinePic.trim(),
        titik_kontrol: timelineTitikKontrol,
        tanggal_rk_awal: `${data?.Tahun || "2026"}-01-01`,
        tanggal_rk_akhir: `${data?.Tahun || "2026"}-12-31`,
        jadwal_rk: JSON.stringify(timelineJadwalRkSlots),
        jadwal_r: JSON.stringify(timelineJadwalRSlots),
        capaian: timelineCapaian.trim(),
        masalah: timelineMasalah.trim(),
        pemecahan_masalah: timelinePemecahanMasalah.trim(),
        status: timelineStatus,
      };

      if (editingTimelineUuid) {
        await apiClient.put(
          `/proker_v3/${prokerUuid}/timeline/${editingTimelineUuid}`,
          payload
        );
      } else {
        await apiClient.post(
          `/proker_v3/${prokerUuid}/timeline`,
          payload
        );
      }

      addToast(
        "success",
        editingTimelineUuid ? "Aktivitas berhasil diperbarui" : "Aktivitas baru berhasil ditambahkan"
      );
      setShowTimelineForm(false);
      setEditingTimelineUuid(null);
      await fetchDetail();
      onRefreshParent?.();
    } catch (err) {
      addToast("error", err?.message || "Terjadi kesalahan sistem");
    } finally {
      setSavingTimeline(false);
    }
  };

  // ==========================================
  // Delete Timeline
  // ==========================================
  const handleDeleteTimeline = async (tlUuid) => {
    if (!window.confirm("Yakin ingin menghapus aktivitas kegiatan ini?")) return;
    try {
      await apiClient.delete(`/proker_v3/${prokerUuid}/timeline/${tlUuid}`);
      addToast("success", "Aktivitas berhasil dihapus");
      await fetchDetail();
      onRefreshParent?.();
    } catch (err) {
      addToast("error", err?.message || "Gagal menghapus aktivitas");
    }
  };

  // ==========================================
  // Upload Bukti Kegiatan Timeline Files
  // ==========================================
  const handleUploadTimelineFiles = async (timeline) => {
    const files = selectedFilesByTimeline[timeline.Id] || [];
    if (files.length === 0) {
      addToast("warning", "Pilih minimal 1 file bukti fisik kegiatan");
      return;
    }

    setUploadingTimelineId(timeline.Id);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      formData.append(
        "keterangan",
        keteranganByTimeline[timeline.Id] || "Bukti Pelaksanaan Kegiatan"
      );

      await apiClient.post(
        `/proker_v3/timeline/${timeline.UUID}/files`,
        formData
      );

      addToast("success", `${files.length} file bukti kegiatan berhasil diunggah`);
      setSelectedFilesByTimeline((prev) => ({ ...prev, [timeline.Id]: [] }));
      setKeteranganByTimeline((prev) => ({ ...prev, [timeline.Id]: "" }));
      await fetchDetail();
      onRefreshParent?.();
    } catch (err) {
      addToast("error", err?.message || "Gagal mengunggah file");
    } finally {
      setUploadingTimelineId(null);
    }
  };

  // ==========================================
  // Delete File (Dokumen Referensi / Bukti Kegiatan)
  // ==========================================
  const handleDeleteFile = async (fileUuid) => {
    if (!window.confirm("Hapus berkas lampiran ini?")) return;
    try {
      await apiClient.delete(`/proker_v3/file/${fileUuid}`);
      addToast("success", "Berkas berhasil dihapus");
      await fetchDetail();
      onRefreshParent?.();
    } catch (err) {
      addToast("error", err?.message || "Gagal menghapus berkas");
    }
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-3 text-center sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-5xl border border-gray-100 flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-linear-to-r from-purple-50/70 via-white to-indigo-50/70">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-200 shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <Dialog.Title className="text-base sm:text-lg font-bold text-gray-900 leading-tight flex items-center gap-2">
                        <span>Aktivitas & Anggaran Program Kerja</span>
                        {data?.NoProker && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-100 text-purple-800">
                            No. {data.NoProker}
                          </span>
                        )}
                      </Dialog.Title>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {data?.NamaProgram || "Memuat detail program kerja..."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={fetchDetail}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                      title="Segarkan data"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {loading && !data ? (
                    <div className="py-16 text-center text-gray-500 space-y-3">
                      <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs font-medium">Memuat rincian aktivitas dan anggaran...</p>
                    </div>
                  ) : (
                    <>
                      {/* Ringkasan Matriks Header Proker */}
                      <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/30 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-gray-500 block text-[11px]">Unit Kerja:</span>
                          <span className="font-bold text-gray-800">
                            {data?.NamaFakultasUnit || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block text-[11px]">Tahun Renstra:</span>
                          <span className="font-mono font-bold text-purple-700">
                            {data?.Tahun || "2026"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block text-[11px]">Standar Renstra:</span>
                          <span className="font-medium text-gray-800 line-clamp-1" title={data?.StandarSubStandar}>
                            {data?.StandarSubStandar || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block text-[11px]">Indikator (IKU/IKT):</span>
                          <span className="font-medium text-gray-800 line-clamp-1" title={data?.IndikatorKinerja}>
                            {data?.IndikatorKinerja || "-"}
                          </span>
                        </div>
                      </div>

                      {/* =======================================================
                          BAGIAN 1: TABEL ANGGARAN & LUARAN MATA PROGRAM
                          ======================================================= */}
                      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
                        <div className="px-5 py-3.5 bg-linear-to-r from-emerald-50/60 to-teal-50/60 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-emerald-700" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                              Tabel Anggaran Program & Luaran / Produk Mata Program
                            </h3>
                          </div>
                          <span className="text-[11px] text-emerald-700 font-medium">
                            Total Anggaran: <b className="font-mono">{formatRupiah(anggaranInput)}</b>
                          </span>
                        </div>

                        <div className="p-5 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                            {/* Anggaran Program (Rp) */}
                            <div className="sm:col-span-5">
                              <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Anggaran Program (Rp)
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-2 text-xs font-bold text-gray-500">
                                  Rp
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  value={anggaranInput}
                                  onChange={(e) => setAnggaranInput(e.target.value)}
                                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                                  placeholder="0"
                                />
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1 font-mono">
                                Terbilang: {formatRupiah(anggaranInput)}
                              </p>
                            </div>

                            {/* Luaran / Produk Mata Program */}
                            <div className="sm:col-span-7">
                              <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Luaran / Produk Mata Program
                              </label>
                              <textarea
                                rows={2}
                                value={luaranProdukInput}
                                onChange={(e) => setLuaranProdukInput(e.target.value)}
                                placeholder="Contoh: Optimalisasi Server Database Cluster Aplikasi Prioritas"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                          </div>

                          {/* Tombol Simpan Anggaran & Luaran */}
                          <div className="flex justify-end pt-2 border-t border-gray-100">
                            <button
                              type="button"
                              onClick={handleSaveAnggaranLuaran}
                              disabled={savingAnggaran}
                              className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {savingAnggaran ? (
                                <>
                                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  Menyimpan...
                                </>
                              ) : (
                                <>
                                  <Save className="w-3.5 h-3.5" />
                                  Simpan Anggaran & Luaran
                                </>
                              )}
                            </button>
                          </div>

                          {/* =======================================================
                              SUB-SECTION: DOKUMEN REFERENSI PROGRAM (UPLOAD)
                              ======================================================= */}
                          <div className="pt-3 border-t border-dashed border-gray-200 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FolderOpen className="w-4 h-4 text-purple-600" />
                                <h4 className="text-xs font-bold text-gray-800">
                                  Dokumen Referensi Program (TOR / Proposal / SOP)
                                </h4>
                              </div>
                              <span className="text-[11px] text-gray-500">
                                Terunggah: <b>{data?.DokumenReferensiFiles?.length || 0} Berkas</b>
                              </span>
                            </div>

                            {/* Upload Area for Dokumen Referensi */}
                            <div className="p-3 bg-purple-50/40 rounded-xl border border-dashed border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex-1 space-y-1.5">
                                <input
                                  type="file"
                                  multiple
                                  onChange={(e) => setDocRefFiles(Array.from(e.target.files || []))}
                                  className="text-xs file:mr-2.5 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-purple-800 hover:file:bg-purple-200 cursor-pointer"
                                />
                                <input
                                  type="text"
                                  placeholder="Keterangan dokumen referensi (contoh: TOR, Proposal Anggaran, SOP 2026)"
                                  value={docRefKeterangan}
                                  onChange={(e) => setDocRefKeterangan(e.target.value)}
                                  className="w-full px-2.5 py-1 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={handleUploadDocRef}
                                disabled={docRefFiles.length === 0 || uploadingDocRef}
                                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-2xs transition disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                              >
                                {uploadingDocRef ? (
                                  <>
                                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Mengunggah...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-3.5 h-3.5" />
                                    Upload Dokumen Referensi {docRefFiles.length > 0 ? `(${docRefFiles.length})` : ""}
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Daftar Dokumen Referensi yang Sudah Diunggah */}
                            {data?.DokumenReferensiFiles && data.DokumenReferensiFiles.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                {data.DokumenReferensiFiles.map((file) => (
                                  <div
                                    key={file.Id}
                                    className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 bg-gray-50/80 hover:bg-white hover:border-purple-200 transition text-xs"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                        <FileIcon className="w-4 h-4" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-semibold text-gray-800 truncate" title={file.NamaFile || file.File}>
                                          {file.NamaFile || file.File}
                                        </p>
                                        <span className="text-[10px] text-gray-400 block">
                                          {formatBytes(file.FileSize)} • {file.Keterangan || "Dokumen Referensi"}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <a
                                        href={`${API_BASE_URL}/upload/proker_v3/${file.File}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 text-purple-600 hover:bg-purple-100 rounded-lg transition"
                                        title="Buka / Unduh Dokumen"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteFile(file.UUID)}
                                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                                        title="Hapus Dokumen"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* =======================================================
                          BAGIAN 2: JADWAL & TIMELINE AKTIVITAS (RK & R)
                          ======================================================= */}
                      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
                        <div className="px-5 py-3.5 bg-linear-to-r from-indigo-50/60 to-purple-50/60 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-indigo-700" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                              Jadwal Pelaksanaan & Monitoring Aktivitas (RK & R)
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={handleOpenAddTimeline}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition self-start sm:self-auto shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambah Aktivitas</span>
                          </button>
                        </div>

                        {/* Collapsible Form Tambah / Edit Aktivitas */}
                        {showTimelineForm && (
                          <div className="p-5 bg-indigo-50/30 border-b border-indigo-100 space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                                {editingTimelineUuid ? (
                                  <>
                                    <Pencil className="w-3.5 h-3.5" />
                                    <span>Edit Aktivitas Kegiatan</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Form Tambah Aktivitas Kegiatan Baru</span>
                                  </>
                                )}
                              </h4>
                              <button
                                type="button"
                                onClick={() => setShowTimelineForm(false)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            <form onSubmit={handleSaveTimeline} className="space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                <div className="sm:col-span-2">
                                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                    No. Aktivitas
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={timelineNo}
                                    onChange={(e) => setTimelineNo(e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 bg-white font-mono text-center font-bold"
                                  />
                                </div>
                                <div className="sm:col-span-7">
                                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                    Nama Aktivitas Kegiatan <span className="text-rose-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Analisis Kebutuhan Sistem / Pembelian Lisensi"
                                    value={timelineNama}
                                    onChange={(e) => setTimelineNama(e.target.value)}
                                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  />
                                </div>
                                <div className="sm:col-span-3">
                                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                    PIC Aktivitas
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="PIC"
                                    value={timelinePic}
                                    onChange={(e) => setTimelinePic(e.target.value)}
                                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  />
                                </div>
                              </div>

                              {/* Jadwal Matriks Selector (Januari - Desember x 4 Minggu) */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-gray-700">
                                    Tentukan Jadwal Mingguan (Klik kotak untuk memilih):
                                  </span>
                                  <div className="flex items-center gap-3 text-[10px]">
                                    <span className="inline-flex items-center gap-1 font-bold text-emerald-800">
                                      <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" />
                                      [RK] Rencana Kerja
                                    </span>
                                    <span className="inline-flex items-center gap-1 font-bold text-purple-800">
                                      <span className="w-2.5 h-2.5 rounded bg-purple-500 inline-block" />
                                      [R] Realisasi
                                    </span>
                                  </div>
                                </div>

                                <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white p-2">
                                  <div className="min-w-[800px] space-y-2">
                                    {/* Baris RK */}
                                    <div className="flex items-center gap-2">
                                      <span className="w-12 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-center shrink-0">
                                        RK
                                      </span>
                                      <div className="flex-1 grid grid-cols-12 gap-1.5">
                                        {BULAN_LIST.map((b) => (
                                          <div key={b.key} className="space-y-0.5 text-center">
                                            <span className="text-[9px] text-gray-400 font-bold block truncate">
                                              {b.short}
                                            </span>
                                            <div className="grid grid-cols-4 gap-0.5">
                                              {WEEKS.map((w) => {
                                                const slot = `${b.key}_${w}`;
                                                const active = timelineJadwalRkSlots.includes(slot);
                                                return (
                                                  <button
                                                    key={slot}
                                                    type="button"
                                                    onClick={() => toggleTimelineSlot("RK", slot)}
                                                    className={`h-5 text-[8px] font-mono rounded transition cursor-pointer flex items-center justify-center ${
                                                      active
                                                        ? "bg-emerald-600 text-white font-bold shadow-2xs"
                                                        : "bg-gray-100 text-gray-600 hover:bg-emerald-100 hover:text-emerald-800"
                                                    }`}
                                                    title={`RK: ${b.label} ${w}`}
                                                  >
                                                    {w.replace("M", "")}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Baris R */}
                                    <div className="flex items-center gap-2">
                                      <span className="w-12 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-center shrink-0">
                                        R
                                      </span>
                                      <div className="flex-1 grid grid-cols-12 gap-1.5">
                                        {BULAN_LIST.map((b) => (
                                          <div key={b.key} className="space-y-0.5 text-center">
                                            <div className="grid grid-cols-4 gap-0.5">
                                              {WEEKS.map((w) => {
                                                const slot = `${b.key}_${w}`;
                                                const active = timelineJadwalRSlots.includes(slot);
                                                return (
                                                  <button
                                                    key={slot}
                                                    type="button"
                                                    onClick={() => toggleTimelineSlot("R", slot)}
                                                    className={`h-5 text-[8px] font-mono rounded transition cursor-pointer flex items-center justify-center ${
                                                      active
                                                        ? "bg-purple-600 text-white font-bold shadow-2xs"
                                                        : "bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-800"
                                                    }`}
                                                    title={`Realisasi: ${b.label} ${w}`}
                                                  >
                                                    {w.replace("M", "")}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Capaian, Masalah, Pemecahan */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                    Capaian Aktivitas
                                  </label>
                                  <input
                                    type="text"
                                    value={timelineCapaian}
                                    onChange={(e) => setTimelineCapaian(e.target.value)}
                                    placeholder="Capaian"
                                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                    Kendala / Masalah
                                  </label>
                                  <input
                                    type="text"
                                    value={timelineMasalah}
                                    onChange={(e) => setTimelineMasalah(e.target.value)}
                                    placeholder="Kendala"
                                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                    Pemecahan Masalah
                                  </label>
                                  <input
                                    type="text"
                                    value={timelinePemecahanMasalah}
                                    onChange={(e) => setTimelinePemecahanMasalah(e.target.value)}
                                    placeholder="Solusi tindak lanjut"
                                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 bg-white"
                                  />
                                </div>
                              </div>

                              <div className="flex justify-end gap-2 pt-2">
                                <button
                                  type="button"
                                  onClick={() => setShowTimelineForm(false)}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
                                >
                                  Batal
                                </button>
                                <button
                                  type="submit"
                                  disabled={savingTimeline}
                                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition disabled:opacity-50 flex items-center gap-1.5"
                                >
                                  {savingTimeline ? (
                                    <>
                                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                      Menyimpan...
                                    </>
                                  ) : (
                                    <>
                                      <Save className="w-3.5 h-3.5" />
                                      Simpan Aktivitas
                                    </>
                                  )}
                                </button>
                              </div>
                            </form>
                          </div>
                        )}

                        {/* Daftar Timelines Aktivitas */}
                        <div className="p-5 space-y-4">
                          {!data?.Timelines || data.Timelines.length === 0 ? (
                            <div className="py-10 text-center text-gray-400 space-y-2 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                              <Calendar className="w-8 h-8 mx-auto text-gray-300" />
                              <p className="text-xs font-medium">Belum ada aktivitas kegiatan.</p>
                              <button
                                type="button"
                                onClick={handleOpenAddTimeline}
                                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition inline-flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Tambah Aktivitas Sekarang
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {data.Timelines.map((tl, idx) => {
                                const rkSlots = parseSlotArray(tl.JadwalRk);
                                const rSlots = parseSlotArray(tl.JadwalR);
                                const pendingFiles = selectedFilesByTimeline[tl.Id] || [];
                                const isUploading = uploadingTimelineId === tl.Id;

                                return (
                                  <div
                                    key={tl.Id || idx}
                                    className="p-4 rounded-xl border border-gray-200 bg-white hover:border-indigo-200 transition space-y-3"
                                  >
                                    {/* Baris Judul & Aksi */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                                          {tl.NoAktivitas || idx + 1}
                                        </span>
                                        <div className="min-w-0">
                                          <h4 className="text-xs font-bold text-gray-900 truncate">
                                            {tl.NamaAktivitas}
                                          </h4>
                                          <span className="text-[10px] text-gray-500 block">
                                            PIC: <b>{tl.PIC || "-"}</b> • Titik Kontrol: <b>{tl.TitikKontrol || "RK"}</b> • Status:{" "}
                                            <span className="font-semibold text-indigo-600">{tl.Status || "Terlaksana"}</span>
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditTimeline(tl)}
                                          className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition"
                                          title="Edit Aktivitas"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteTimeline(tl.UUID)}
                                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition"
                                          title="Hapus Aktivitas"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Grid Jadwal RK & R (Visual Sheet DETAIL PROGRAM) */}
                                    <div className="overflow-x-auto border border-gray-100 rounded-lg p-2 bg-gray-50/60">
                                      <div className="min-w-[760px] space-y-1.5">
                                        {/* Baris RK */}
                                        <div className="flex items-center gap-2">
                                          <span className="w-9 text-[9px] font-bold font-mono px-1 py-0.5 rounded bg-emerald-100 text-emerald-800 text-center shrink-0">
                                            RK
                                          </span>
                                          <div className="flex-1 grid grid-cols-12 gap-1 text-center">
                                            {BULAN_LIST.map((b) => (
                                              <div key={b.key} className="space-y-0.5">
                                                <span className="text-[8px] text-gray-400 font-semibold block truncate">
                                                  {b.short}
                                                </span>
                                                <div className="grid grid-cols-4 gap-0.5">
                                                  {WEEKS.map((w) => {
                                                    const slot = `${b.key}_${w}`;
                                                    const active = rkSlots.includes(slot);
                                                    return (
                                                      <span
                                                        key={slot}
                                                        className={`h-3.5 text-[7px] font-mono rounded flex items-center justify-center ${
                                                          active
                                                            ? "bg-emerald-600 text-white font-bold"
                                                            : "bg-gray-200/60 text-gray-400"
                                                        }`}
                                                        title={`RK: ${b.label} ${w}`}
                                                      >
                                                        {w.replace("M", "")}
                                                      </span>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>

                                        {/* Baris R */}
                                        <div className="flex items-center gap-2">
                                          <span className="w-9 text-[9px] font-bold font-mono px-1 py-0.5 rounded bg-purple-100 text-purple-800 text-center shrink-0">
                                            R
                                          </span>
                                          <div className="flex-1 grid grid-cols-12 gap-1 text-center">
                                            {BULAN_LIST.map((b) => (
                                              <div key={b.key} className="space-y-0.5">
                                                <div className="grid grid-cols-4 gap-0.5">
                                                  {WEEKS.map((w) => {
                                                    const slot = `${b.key}_${w}`;
                                                    const active = rSlots.includes(slot);
                                                    return (
                                                      <span
                                                        key={slot}
                                                        className={`h-3.5 text-[7px] font-mono rounded flex items-center justify-center ${
                                                          active
                                                            ? "bg-purple-600 text-white font-bold"
                                                            : "bg-gray-200/60 text-gray-400"
                                                        }`}
                                                        title={`Realisasi: ${b.label} ${w}`}
                                                      >
                                                        {w.replace("M", "")}
                                                      </span>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Capaian / Masalah if any */}
                                    {(tl.Capaian || tl.Masalah || tl.PemecahanMasalah) && (
                                      <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-[11px] grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <div>
                                          <span className="text-gray-400 block text-[10px]">Capaian:</span>
                                          <span className="text-gray-700 font-medium">{tl.Capaian || "-"}</span>
                                        </div>
                                        <div>
                                          <span className="text-gray-400 block text-[10px]">Kendala / Masalah:</span>
                                          <span className="text-gray-700 font-medium">{tl.Masalah || "-"}</span>
                                        </div>
                                        <div>
                                          <span className="text-gray-400 block text-[10px]">Pemecahan Masalah:</span>
                                          <span className="text-gray-700 font-medium">{tl.PemecahanMasalah || "-"}</span>
                                        </div>
                                      </div>
                                    )}

                                    {/* Bukti Fisik / Multiple Upload Section per Aktivitas */}
                                    <div className="pt-2 border-t border-dashed border-gray-100 space-y-2">
                                      <div className="flex items-center justify-between text-[11px]">
                                        <span className="font-semibold text-gray-700">
                                          Bukti Pelaksanaan Kegiatan ({tl.Files?.length || 0} berkas)
                                        </span>
                                      </div>

                                      {/* Upload Form Box */}
                                      <div className="p-2.5 bg-gray-50/70 rounded-xl border border-dashed border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                        <div className="flex-1 space-y-1">
                                          <input
                                            type="file"
                                            multiple
                                            onChange={(e) =>
                                              setSelectedFilesByTimeline((prev) => ({
                                                ...prev,
                                                [tl.Id]: Array.from(e.target.files || []),
                                              }))
                                            }
                                            className="text-xs file:mr-2 file:py-0.5 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-indigo-100 file:text-indigo-800 hover:file:bg-indigo-200 cursor-pointer"
                                          />
                                          <input
                                            type="text"
                                            placeholder="Keterangan bukti kegiatan (opsional)"
                                            value={keteranganByTimeline[tl.Id] || ""}
                                            onChange={(e) =>
                                              setKeteranganByTimeline((prev) => ({
                                                ...prev,
                                                [tl.Id]: e.target.value,
                                              }))
                                            }
                                            className="w-full px-2 py-0.5 text-xs rounded-lg border border-gray-200 bg-white"
                                          />
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleUploadTimelineFiles(tl)}
                                          disabled={pendingFiles.length === 0 || isUploading}
                                          className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition disabled:opacity-50 flex items-center gap-1 shrink-0"
                                        >
                                          {isUploading ? (
                                            <>
                                              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                              Mengunggah...
                                            </>
                                          ) : (
                                            <>
                                              <Upload className="w-3 h-3" />
                                              Upload Bukti {pendingFiles.length > 0 ? `(${pendingFiles.length})` : ""}
                                            </>
                                          )}
                                        </button>
                                      </div>

                                      {/* List File Bukti */}
                                      {tl.Files && tl.Files.length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                          {tl.Files.map((file) => (
                                            <div
                                              key={file.Id}
                                              className="flex items-center justify-between p-2 rounded-lg border border-gray-200 bg-white text-xs"
                                            >
                                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                                                  <FileIcon className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="min-w-0">
                                                  <p className="font-semibold text-gray-800 truncate" title={file.NamaFile || file.File}>
                                                    {file.NamaFile || file.File}
                                                  </p>
                                                  <span className="text-[10px] text-gray-400 block">
                                                    {formatBytes(file.FileSize)} • {file.Keterangan || "Bukti kegiatan"}
                                                  </span>
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-1 shrink-0">
                                                <a
                                                  href={`${API_BASE_URL}/upload/proker_v3/${file.File}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition"
                                                  title="Lihat berkas"
                                                >
                                                  <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                                <button
                                                  type="button"
                                                  onClick={() => handleDeleteFile(file.UUID)}
                                                  className="p-1 text-rose-500 hover:bg-rose-50 rounded transition"
                                                  title="Hapus berkas"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 border-t border-gray-200 bg-gray-50 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 transition"
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
  );
}
