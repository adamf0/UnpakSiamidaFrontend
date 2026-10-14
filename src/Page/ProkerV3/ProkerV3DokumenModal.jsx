import React, { Fragment, useEffect, useState, useRef, useMemo } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useAuth } from "@/Providers/AuthProvider";
import { useToast } from "@/Providers/ToastProvider";
import { apiClient, API_BASE_URL } from "@/Common/api";
import Tooltip from "@/Components/Tooltip";
import ConfirmDeleteDialog from "@/Components/ConfirmDeleteDialog";
import {
  JENIS_DOKUMEN_PROKER,
  formatBytes,
} from "./prokerConstants";
import {
  X,
  Upload,
  FileText,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Play,
  Pause,
  FolderOpen,
  Info,
  Check,
  Building2,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";

export default function ProkerV3DokumenModal({
  open,
  proker,
  onClose,
  onRefreshParent,
}) {
  const { getValidToken } = useAuth();
  const { addToast } = useToast();

  const fileInputRef = useRef(null);

  // Data states
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState("all");

  // Form input defaults for new files
  const [selectedJenisDok, setSelectedJenisDok] = useState("SK");
  const [keterangan, setKeterangan] = useState("");

  // Upload Queue State: Array of { id, file, jenisDokumen, keterangan, progress, status, error, xhr }
  // Status: "waiting" | "uploading" | "success" | "error" | "canceled"
  const [queue, setQueue] = useState([]);

  // Confirm delete dialog state
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch Documents
  const fetchDocuments = async () => {
    if (!proker?.UUID) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/proker_v3/${proker.UUID}/dokumen`);
      setDocuments(res.data?.data || []);
    } catch (err) {
      console.error("Gagal memuat dokumen proker:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && proker?.UUID) {
      fetchDocuments();
      setQueue([]);
    }
  }, [open, proker?.UUID]);

  // Handle file selection (multiple)
  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const newQueueItems = selectedFiles.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      jenisDokumen: selectedJenisDok,
      keterangan: keterangan.trim(),
      progress: 0,
      status: "waiting",
      error: null,
      xhr: null,
    }));

    setQueue((prev) => [...prev, ...newQueueItems]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Upload a single queue item
  const startUploadItem = (item) => {
    if (!proker?.UUID) return;

    const token = getValidToken();
    const formData = new FormData();
    formData.append("file", item.file);
    formData.append("jenis_dokumen", item.jenisDokumen);
    if (item.keterangan) {
      formData.append("keterangan", item.keterangan);
    }

    const xhr = new XMLHttpRequest();

    // Update item with xhr reference & status
    setQueue((prev) =>
      prev.map((q) =>
        q.id === item.id
          ? { ...q, status: "uploading", progress: 0, error: null, xhr }
          : q
      )
    );

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, progress: percent } : q))
        );
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: "success", progress: 100, xhr: null }
              : q
          )
        );
        fetchDocuments();
        onRefreshParent?.();
      } else {
        let msg = "Gagal mengunggah file";
        try {
          const res = JSON.parse(xhr.responseText);
          msg = res?.error || res?.message || msg;
        } catch {
          // ignore
        }
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: "error", error: msg, xhr: null }
              : q
          )
        );
      }
    };

    xhr.onerror = () => {
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? { ...q, status: "error", error: "Jaringan bermasalah", xhr: null }
            : q
        )
      );
    };

    xhr.onabort = () => {
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id ? { ...q, status: "canceled", xhr: null } : q
        )
      );
    };

    xhr.open("POST", `${API_BASE_URL}/proker_v3/${proker.UUID}/dokumen`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.send(formData);
  };

  // Cancel an ongoing upload
  const cancelUploadItem = (item) => {
    if (item.xhr && typeof item.xhr.abort === "function") {
      item.xhr.abort();
    } else {
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: "canceled" } : q))
      );
    }
  };

  // Remove an item from the queue
  const removeFromQueue = (itemId) => {
    setQueue((prev) => {
      const target = prev.find((q) => q.id === itemId);
      if (target?.xhr) {
        target.xhr.abort();
      }
      return prev.filter((q) => q.id !== itemId);
    });
  };

  // Upload all waiting/retry items in parallel
  const uploadAllParallel = () => {
    const pendingItems = queue.filter(
      (q) => q.status === "waiting" || q.status === "error" || q.status === "canceled"
    );
    pendingItems.forEach((item) => {
      startUploadItem(item);
    });
  };

  // Cancel all ongoing uploads
  const cancelAll = () => {
    queue.forEach((item) => {
      if (item.status === "uploading" && item.xhr) {
        item.xhr.abort();
      }
    });
  };

  // Clear completed items from queue
  const clearCompletedQueue = () => {
    setQueue((prev) => prev.filter((q) => q.status !== "success"));
  };

  // Delete an uploaded document from Golang
  const handleDeleteDoc = async () => {
    if (!docToDelete?.UUID) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/proker_v3/dokumen/${docToDelete.UUID}`);
      addToast("success", "Dokumen berhasil dihapus dari sistem");
      setDocuments((prev) => prev.filter((d) => d.UUID !== docToDelete.UUID));
      onRefreshParent?.();
    } catch (err) {
      addToast("error", err?.message || "Layanan tidak dapat dihubungi");
    } finally {
      setDeleting(false);
      setDeleteDialog(false);
      setDocToDelete(null);
    }
  };

  // Filtered documents by active tab
  const filteredDocuments = useMemo(() => {
    if (activeTab === "all") return documents;
    return documents.filter((d) => d.JenisDokumen === activeTab);
  }, [documents, activeTab]);

  // Mandatory documents checklist stats
  const checklistStats = useMemo(() => {
    const uploadedTypes = new Set(documents.map((d) => d.JenisDokumen));
    return JENIS_DOKUMEN_PROKER.map((j) => ({
      ...j,
      isUploaded: uploadedTypes.has(j.id),
      count: documents.filter((d) => d.JenisDokumen === j.id).length,
    }));
  }, [documents]);

  const allMandatoryUploaded = checklistStats
    .filter((c) => c.required)
    .every((c) => c.isUploaded);

  return (
    <>
      <Transition appear show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all flex flex-col max-h-[90vh]">
                  {/* Modal Header */}
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50/70 to-indigo-50/40">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <Dialog.Title className="text-base font-bold text-gray-900 flex items-center gap-2">
                          <span>Dokumen Matriks Program Kerja</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            matrix_proker_dokumen
                          </span>
                        </Dialog.Title>
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {proker?.NamaProgram || "Program Kerja"} • {proker?.NamaFakultasUnit || "Unit"} (Tahun {proker?.Tahun || "2026"})
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Proker Info Card & Folder Path Info */}
                    <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80 space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-gray-400 block text-[11px]">Unit Kerja:</span>
                          <span className="font-semibold text-gray-800 line-clamp-1">
                            {proker?.NamaFakultasUnit || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px]">Tahun Renstra:</span>
                          <span className="font-semibold text-purple-700 font-mono">
                            {proker?.Tahun || "2026"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px]">Standar:</span>
                          <span className="font-medium text-gray-700 line-clamp-1" title={proker?.StandarSubStandar}>
                            {proker?.StandarSubStandar || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px]">Indikator:</span>
                          <span className="font-medium text-gray-700 line-clamp-1" title={proker?.IndikatorKinerja}>
                            {proker?.IndikatorKinerja || "-"}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-200/60 flex items-center gap-1.5 text-[11px] text-gray-500 font-mono">
                        <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="text-gray-400">Lokasi Simpan Server:</span>
                        <span className="text-gray-700 truncate font-semibold">
                          upload/prokerv2/{proker?.NamaFakultasUnit || "unit"}/{proker?.Tahun || "2026"}/{proker?.StandarSubStandar?.slice(0, 30) || "standar"}/.../[jenis]
                        </span>
                      </div>
                    </div>

                    {/* Mandatory Checklist Status Banner */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                        <span>Kelengkapan Dokumen Proker:</span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            allMandatoryUploaded
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {allMandatoryUploaded
                            ? "✓ Seluruh Dokumen Wajib Lengkap"
                            : "Perhatian: Ada Dokumen Wajib Belum Diunggah"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {checklistStats.map((item) => (
                          <div
                            key={item.id}
                            className={`p-2 rounded-xl border text-xs flex flex-col justify-between transition ${
                              item.isUploaded
                                ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                                : item.required
                                ? "bg-rose-50/40 border-rose-200 text-rose-800"
                                : "bg-gray-50 border-gray-200 text-gray-600"
                            }`}
                          >
                            <div className="font-bold text-[11px] line-clamp-1" title={item.text}>
                              {item.text}
                            </div>
                            <div className="flex items-center justify-between mt-1 pt-1 border-t border-black/5 text-[10px]">
                              <span>{item.count} Berkas</span>
                              {item.isUploaded ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              ) : item.required ? (
                                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Upload Box & Multi-file Selector */}
                    <div className="p-4 bg-purple-50/40 rounded-2xl border border-purple-200 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-purple-900 uppercase tracking-wider">
                        <Upload className="w-4 h-4 text-purple-600" />
                        <span>Form Unggah Berkas Baru (Mendukung Paralel & Multiple)</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        {/* Dropdown Jenis Dokumen */}
                        <div className="sm:col-span-5">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Jenis Dokumen <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={selectedJenisDok}
                            onChange={(e) => setSelectedJenisDok(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold text-gray-800 cursor-pointer"
                          >
                            {JENIS_DOKUMEN_PROKER.map((j) => (
                              <option key={j.id} value={j.id}>
                                {j.text}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Keterangan */}
                        <div className="sm:col-span-7">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Catatan / Keterangan Dokumen (Opsional)
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: SK Rektor penetapan nomor..."
                            value={keterangan}
                            onChange={(e) => setKeterangan(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>

                      {/* Dropzone & File Input */}
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-purple-300 hover:border-purple-500 rounded-xl p-5 text-center bg-white cursor-pointer transition hover:bg-purple-50/20 group"
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={handleFileSelect}
                        />
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <div className="w-10 h-10 rounded-full bg-purple-100 group-hover:bg-purple-200 text-purple-600 flex items-center justify-center transition">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div className="text-xs font-bold text-gray-800">
                            Klik atau Seret Berkas ke Sini untuk Memilih (Bisa Multiple)
                          </div>
                          <p className="text-[11px] text-gray-500">
                            Mendukung PDF, DOCX, XLSX, JPG, PNG, ZIP. Setiap berkas akan otomatis masuk antrean unggah paralel.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Upload Queue Section */}
                    {queue.length > 0 && (
                      <div className="space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-800">
                              Antrean Unggah Berkas ({queue.length}):
                            </span>
                            <span className="text-[11px] text-gray-500">
                              {queue.filter((q) => q.status === "success").length} selesai,{" "}
                              {queue.filter((q) => q.status === "uploading").length} berjalan
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={uploadAllParallel}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-2xs transition cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>Unggah Semua (Paralel)</span>
                            </button>
                            <button
                              type="button"
                              onClick={cancelAll}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer"
                            >
                              <Pause className="w-3.5 h-3.5" />
                              <span>Batal Semua</span>
                            </button>
                            <button
                              type="button"
                              onClick={clearCompletedQueue}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
                            >
                              <span>Bersihkan Selesai</span>
                            </button>
                          </div>
                        </div>

                        {/* Queue Items List */}
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {queue.map((item) => (
                            <div
                              key={item.id}
                              className="p-3 bg-white rounded-xl border border-gray-200 flex flex-col gap-2 shadow-2xs text-xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 truncate">
                                  <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                                  <span className="font-semibold text-gray-900 truncate">
                                    {item.file.name}
                                  </span>
                                  <span className="text-[10px] text-gray-400">
                                    ({formatBytes(item.file.size)})
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                    {item.jenisDokumen}
                                  </span>
                                </div>

                                {/* Status & Individual Actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                  {item.status === "waiting" && (
                                    <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                      Menunggu
                                    </span>
                                  )}
                                  {item.status === "uploading" && (
                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                                      {item.progress}% Mengunggah...
                                    </span>
                                  )}
                                  {item.status === "success" && (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      Tersimpan
                                    </span>
                                  )}
                                  {item.status === "canceled" && (
                                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                      Dibatalkan
                                    </span>
                                  )}
                                  {item.status === "error" && (
                                    <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full" title={item.error}>
                                      Gagal
                                    </span>
                                  )}

                                  {/* Action Buttons */}
                                  {item.status === "waiting" && (
                                    <button
                                      type="button"
                                      onClick={() => startUploadItem(item)}
                                      className="p-1 rounded-md text-purple-600 hover:bg-purple-50 transition"
                                      title="Mulai Unggah Berkas Ini"
                                    >
                                      <Play className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {item.status === "uploading" && (
                                    <button
                                      type="button"
                                      onClick={() => cancelUploadItem(item)}
                                      className="p-1 rounded-md text-rose-600 hover:bg-rose-50 transition"
                                      title="Batalkan Unggah"
                                    >
                                      <Pause className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {(item.status === "error" || item.status === "canceled") && (
                                    <button
                                      type="button"
                                      onClick={() => startUploadItem(item)}
                                      className="p-1 rounded-md text-blue-600 hover:bg-blue-50 transition"
                                      title="Lanjutkan / Coba Lagi"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => removeFromQueue(item.id)}
                                    className="p-1 rounded-md text-gray-400 hover:text-rose-600 transition"
                                    title="Hapus Dari Antrean"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Progress bar */}
                              {item.status === "uploading" && (
                                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-purple-600 h-full rounded-full transition-all duration-150"
                                    style={{ width: `${item.progress}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Table of Already Uploaded Documents */}
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-purple-600" />
                          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                            Daftar Dokumen Tersimpan ({documents.length})
                          </h4>
                        </div>

                        {/* Category filter tabs */}
                        <div className="flex items-center gap-1 overflow-x-auto text-xs">
                          <button
                            type="button"
                            onClick={() => setActiveTab("all")}
                            className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                              activeTab === "all"
                                ? "bg-purple-600 text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            Semua ({documents.length})
                          </button>
                          {JENIS_DOKUMEN_PROKER.map((j) => {
                            const count = documents.filter((d) => d.JenisDokumen === j.id).length;
                            return (
                              <button
                                key={j.id}
                                type="button"
                                onClick={() => setActiveTab(j.id)}
                                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
                                  activeTab === j.id
                                    ? "bg-purple-600 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                              >
                                <span>{j.id}</span>
                                <span className="text-[10px] opacity-75 font-mono">({count})</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Documents List */}
                      {loading ? (
                        <div className="py-8 text-center text-xs text-gray-500">
                          Memuat berkas dokumen proker...
                        </div>
                      ) : filteredDocuments.length === 0 ? (
                        <div className="py-8 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-gray-200">
                          Belum ada dokumen yang tersimpan untuk filter ini.
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                          {filteredDocuments.map((doc, idx) => {
                            const badgeInfo =
                              JENIS_DOKUMEN_PROKER.find((j) => j.id === doc.JenisDokumen) || {
                                badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
                              };

                            const fileUrl = doc.FileURL
                              ? `${API_BASE_URL}${doc.FileURL.startsWith("/") ? "" : "/"}${doc.FileURL}`
                              : null;

                            return (
                              <div
                                key={doc.UUID || idx}
                                className="p-3.5 hover:bg-gray-50/70 transition flex items-center justify-between gap-4 text-xs"
                              >
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${badgeInfo.badgeClass}`}
                                    >
                                      {doc.JenisDokumen}
                                    </span>
                                    <span className="font-bold text-gray-900 truncate">
                                      {doc.NamaFile}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-[11px] text-gray-500">
                                    <span>{formatBytes(doc.FileSize)}</span>
                                    {doc.CreatedAt && (
                                      <span>
                                        • Diunggah {new Date(doc.CreatedAt).toLocaleDateString("id-ID", {
                                          day: "numeric",
                                          month: "short",
                                          year: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                    )}
                                    {doc.Keterangan && (
                                      <span className="italic text-gray-600 truncate max-w-xs">
                                        • {doc.Keterangan}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {fileUrl && (
                                    <Tooltip title="Buka / Unduh Berkas">
                                      <a
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-purple-50 text-gray-700 hover:text-purple-700 border border-gray-200 transition"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span>Buka</span>
                                      </a>
                                    </Tooltip>
                                  )}
                                  <Tooltip title="Hapus Dokumen Dari Server">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDocToDelete(doc);
                                        setDeleteDialog(true);
                                      }}
                                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </Tooltip>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Total Dokumen Tersimpan: <b>{documents.length}</b>
                    </span>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-800 hover:bg-gray-900 text-white transition shadow-2xs cursor-pointer"
                    >
                      Selesai & Tutup
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        open={deleteDialog}
        loading={deleting}
        title="Hapus Dokumen Program Kerja"
        message={`Apakah Anda yakin ingin menghapus berkas "${docToDelete?.NamaFile}"? Berkas fisik di server juga akan dihapus secara permanen.`}
        onClose={() => setDeleteDialog(false)}
        onConfirm={handleDeleteDoc}
      />
    </>
  );
}
