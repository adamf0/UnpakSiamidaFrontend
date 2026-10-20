import React, { useState, useEffect, useMemo, useRef, Fragment } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/Providers/AuthProvider";
import { useToast } from "@/Providers/ToastProvider";
import { useContent } from "@/Providers/ContentProvider";
import { apiClient, API_BASE_URL } from "@/Common/api";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import PageHeader from "@/Components/PageHeader";
import Tooltip from "@/Components/Tooltip";
import ConfirmDeleteDialog from "@/Components/ConfirmDeleteDialog";
import {
  BULAN_LIST,
  WEEKS,
  parseSlotArray,
  getSlotsFromDateRange,
  getTimelineRkSlots,
  getTimelineRSlots,
  formatBytes,
  formatRupiah,
  hasRealisasiAnggaran,
  getRealisasiAnggaran,
} from "./prokerConstants";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  Layers,
  FileSpreadsheet,
  FileText,
  Upload,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Info,
  Check,
  Sparkles,
  Save,
  RotateCcw,
  Target,
  Zap,
  Paperclip,
  GripVertical,
  TrendingUp,
  X,
  Play,
  Pause,
} from "lucide-react";

// Ukuran chunk binary 512 KB per slice untuk progress presisi & transfer speed lancar
const CHUNK_SIZE = 512 * 1024;

const generateUUID = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export default function ProkerV3TimelinePage() {
  const { uuid: prokerUuid, actUuid } = useParams();
  const navigate = useNavigate();
  const { getValidToken, user } = useAuth();
  const { addToast } = useToast();
  const {
    level,
    setLevel,
    listLevel,
    openChangeLevel,
    setOpenChangeLevel,
    changeLevel,
  } = useContent();

  const isAdmin = level === "admin" || user?.level === "admin";

  // Data states
  const [loading, setLoading] = useState(true);
  const [aktivitas, setAktivitas] = useState(null);
  const [proker, setProker] = useState(null);
  const [timelines, setTimelines] = useState([]);

  // Form Timeline State (Create / Edit)
  const [editingTimelineUuid, setEditingTimelineUuid] = useState(null);
  const [submittingTimeline, setSubmittingTimeline] = useState(false);

  const initialFormState = {
    no_aktivitas: 1,
    nama_aktivitas: "",
    pic: "",
    titik_kontrol: "",
    tanggal_rk_awal: "2026-01-01",
    tanggal_rk_akhir: "2026-12-31",
    capaian: "",
    masalah: "",
    pemecahan_masalah: "",
  };

  const [formTimeline, setFormTimeline] = useState(initialFormState);

  // Perkembangan Realisasi Modal State (Modal 3 input: Tgl R Awal, Tgl R Akhir, Status Pelaksanaan)
  const [realisasiModalOpen, setRealisasiModalOpen] = useState(false);
  const [selectedTimelineForRealisasi, setSelectedTimelineForRealisasi] = useState(null);
  const [realisasiForm, setRealisasiForm] = useState({
    tanggal_r_awal: "",
    tanggal_r_akhir: "",
    status: "Belum Terlaksana",
  });
  const [savingRealisasi, setSavingRealisasi] = useState(false);

  // Drag and drop state for table ordering
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Per-Row Dynamic File & Keterangan Form State: Map of timelineUuid -> Array of { id, file, keterangan }
  const [rowFormRows, setRowFormRows] = useState({});

  // Per-Row Chunk Upload Queues & Progress: Map of timelineUuid -> Array of queue items
  const [rowUploadQueues, setRowUploadQueues] = useState({});
  const uploadControlsRef = useRef({});

  // Delete dialogs
  const [deleteTimelineDialog, setDeleteTimelineDialog] = useState(false);
  const [timelineToDelete, setTimelineToDelete] = useState(null);
  const [deletingTimeline, setDeletingTimeline] = useState(false);

  const [deleteFileDialog, setDeleteFileDialog] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [deletingFile, setDeletingFile] = useState(false);

  // Fetch detail aktivitas, proker, and timelines
  const fetchData = async () => {
    if (!actUuid) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/proker_v3/aktivitas/${actUuid}`);
      const json = res.data;

      setAktivitas(json.aktivitas || null);
      setProker(json.proker || null);
      setTimelines(json.data || json.timelines || []);

      // Set default form if pristine (tanpa set value nama aktivitas awal)
      if (!editingTimelineUuid) {
        setFormTimeline((prev) => ({
          ...prev,
          no_aktivitas: (json.data || json.timelines || []).length + 1,
          nama_aktivitas: prev.nama_aktivitas || "",
          pic: json.aktivitas?.PIC || "",
        }));
      }
    } catch (err) {
      addToast("error", err?.message || "Layanan tidak dapat dihubungi");
    } finally {
      setLoading(false);
    }
  };

  // Helper format tanggal Indonesia lengkap: Hari, Tanggal Bulan Tahun
  const formatDateIndoWithDay = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  };

  useEffect(() => {
    fetchData();
  }, [actUuid]);

  // Helper to map month to 0-indexed month
  const slotToMonthIndex = useMemo(
    () => ({
      JANUARI: 0,
      FEBRUARI: 1,
      MARET: 2,
      APRIL: 3,
      MEI: 4,
      JUNI: 5,
      JULI: 6,
      AGUSTUS: 7,
      SEPTEMBER: 8,
      OKTOBER: 9,
      NOVEMBER: 10,
      DESEMBER: 11,
    }),
    []
  );

  const weekToDayRange = useMemo(
    () => ({
      M1: [1, 7],
      M2: [8, 14],
      M3: [15, 21],
      M4: [22, 31],
    }),
    []
  );

  const isWeekInDateRange = (monthKey, week, startStr, endStr) => {
    if (!startStr || !endStr) return false;
    const s = new Date(startStr);
    const e = new Date(endStr);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return false;

    const year = s.getFullYear() || 2026;
    const mIdx = slotToMonthIndex[monthKey];
    if (mIdx === undefined) return false;

    const [dStart, dEnd] = weekToDayRange[week] || [1, 7];
    const weekStart = new Date(year, mIdx, dStart, 0, 0, 0);
    const weekEnd = new Date(year, mIdx, dEnd, 23, 59, 59);
    return weekEnd >= s && weekStart <= e;
  };

  // Activity Schedule information (Read-only data for the matrix viewer)
  const activitySchedule = useMemo(() => {
    const rkSlotSet = new Set();
    const rSlotSet = new Set();
    let rkAwal = null;
    let rkAkhir = null;
    let rAwal = null;
    let rAkhir = null;

    timelines.forEach((tl) => {
      getTimelineRkSlots(tl).forEach((s) => rkSlotSet.add(s));
      getTimelineRSlots(tl).forEach((s) => rSlotSet.add(s));

      if (tl.TanggalRkAwal) {
        if (!rkAwal || tl.TanggalRkAwal < rkAwal) rkAwal = tl.TanggalRkAwal;
      }
      if (tl.TanggalRkAkhir) {
        if (!rkAkhir || tl.TanggalRkAkhir > rkAkhir) rkAkhir = tl.TanggalRkAkhir;
      }
      if (tl.TanggalRAwal) {
        if (!rAwal || tl.TanggalRAwal < rAwal) rAwal = tl.TanggalRAwal;
      }
      if (tl.TanggalRAkhir) {
        if (!rAkhir || tl.TanggalRAkhir > rAkhir) rAkhir = tl.TanggalRAkhir;
      }
    });

    return {
      rkSlots: Array.from(rkSlotSet),
      rSlots: Array.from(rSlotSet),
      rkAwal: rkAwal ? rkAwal.slice(0, 10) : "",
      rkAkhir: rkAkhir ? rkAkhir.slice(0, 10) : "",
      rAwal: rAwal ? rAwal.slice(0, 10) : "",
      rAkhir: rAkhir ? rAkhir.slice(0, 10) : "",
    };
  }, [timelines]);

  // Open modal perkembangan realisasi
  const openRealisasiModal = (tl) => {
    setSelectedTimelineForRealisasi(tl);
    setRealisasiForm({
      tanggal_r_awal: tl.TanggalRAwal ? tl.TanggalRAwal.slice(0, 10) : "",
      tanggal_r_akhir: tl.TanggalRAkhir ? tl.TanggalRAkhir.slice(0, 10) : "",
      status: tl.Status || "Belum Terlaksana",
    });
    setRealisasiModalOpen(true);
  };

  // Save modal perkembangan realisasi
  const handleSaveRealisasi = async (e) => {
    if (e) e.preventDefault();
    if (!selectedTimelineForRealisasi?.UUID) return;

    setSavingRealisasi(true);
    try {
      const token = getValidToken();
      const rSlotsGen = getSlotsFromDateRange(
        realisasiForm.tanggal_r_awal,
        realisasiForm.tanggal_r_akhir
      );
      const payload = {
        tanggal_r_awal: realisasiForm.tanggal_r_awal || undefined,
        tanggal_r_akhir: realisasiForm.tanggal_r_akhir || undefined,
        jadwal_r: JSON.stringify(rSlotsGen),
        status: realisasiForm.status || "Belum Terlaksana",
      };

      const res = await apiClient.put(
        `/proker_v3/timeline/${selectedTimelineForRealisasi.UUID}`,
        payload
      );

      addToast("success", `Perkembangan realisasi "${selectedTimelineForRealisasi.NamaAktivitas}" berhasil disimpan`);
      setRealisasiModalOpen(false);
      setSelectedTimelineForRealisasi(null);
      fetchData();
    } catch (err) {
      addToast("error", err?.message || "Layanan tidak dapat dihubungi");
    } finally {
      setSavingRealisasi(false);
    }
  };

  // Drag and Drop reordering handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = async (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...timelines];
    const [movedItem] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, movedItem);

    // Re-index NoAktivitas
    const reordered = updated.map((item, idx) => ({
      ...item,
      NoAktivitas: idx + 1,
    }));

    setTimelines(reordered);
    setDraggedIndex(null);
    setDragOverIndex(null);

    // Persist new order to backend
    try {
      const payload = reordered.map((item) => ({
        uuid: item.UUID,
        no_aktivitas: item.NoAktivitas,
      }));

      await apiClient.put(`/proker_v3/aktivitas/${actUuid}/timeline/reorder`, payload);

      addToast("success", "Urutan nomor urut tahapan timeline berhasil diperbarui.");
    } catch (err) {
      addToast("warning", "Gagal menyimpan urutan nomor ke server.");
    }
  };

  // Reset form to create mode (nama_aktivitas tidak diset dari nama aktivitas induk)
  const resetForm = () => {
    setEditingTimelineUuid(null);
    setFormTimeline({
      ...initialFormState,
      no_aktivitas: timelines.length + 1,
      nama_aktivitas: "",
      pic: aktivitas?.PIC || "",
    });
  };

  // Start editing a timeline row
  const startEditTimeline = (tl) => {
    setEditingTimelineUuid(tl.UUID);
    setFormTimeline({
      no_aktivitas: tl.NoAktivitas || 1,
      nama_aktivitas: tl.NamaAktivitas || "",
      pic: tl.PIC || "",
      titik_kontrol: tl.TitikKontrol || "",
      tanggal_rk_awal: tl.TanggalRkAwal ? tl.TanggalRkAwal.slice(0, 10) : "2026-01-01",
      tanggal_rk_akhir: tl.TanggalRkAkhir ? tl.TanggalRkAkhir.slice(0, 10) : "2026-12-31",
      capaian: tl.Capaian || "",
      masalah: tl.Masalah || "",
      pemecahan_masalah: tl.PemecahanMasalah || "",
    });
    // Scroll to form smoothly
    const el = document.getElementById("form-timeline-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  // Submit Timeline Form (POST or PUT)
  const handleSubmitTimeline = async (e) => {
    e.preventDefault();
    if (!formTimeline.nama_aktivitas.trim()) {
      addToast("warning", "Nama aktivitas / tahapan wajib diisi");
      return;
    }

    setSubmittingTimeline(true);
    try {
      const token = getValidToken();
      const targetNo = editingTimelineUuid
        ? formTimeline.no_aktivitas || 1
        : timelines.length + 1;

      const rkSlotsGen = getSlotsFromDateRange(
        formTimeline.tanggal_rk_awal || "2026-01-01",
        formTimeline.tanggal_rk_akhir || "2026-12-31"
      );

      const payload = {
        no_aktivitas: targetNo,
        nama_aktivitas: formTimeline.nama_aktivitas.trim(),
        pic: formTimeline.pic.trim(),
        titik_kontrol: formTimeline.titik_kontrol.trim(),
        tanggal_rk_awal: formTimeline.tanggal_rk_awal || "2026-01-01",
        tanggal_rk_akhir: formTimeline.tanggal_rk_akhir || "2026-12-31",
        jadwal_rk: JSON.stringify(rkSlotsGen),
        capaian: formTimeline.capaian.trim(),
        masalah: formTimeline.masalah.trim(),
        pemecahan_masalah: formTimeline.pemecahan_masalah.trim(),
      };

      const url = editingTimelineUuid
        ? `/proker_v3/timeline/${editingTimelineUuid}`
        : `/proker_v3/aktivitas/${actUuid}/timeline`;

      const res = editingTimelineUuid
        ? await apiClient.put(url, payload)
        : await apiClient.post(url, payload);

      const json = res.data;

      addToast(
        "success",
        editingTimelineUuid
          ? "Tahapan timeline berhasil diperbarui"
          : "Tahapan timeline baru berhasil ditambahkan"
      );
      resetForm();
      fetchData();
    } catch (err) {
      addToast("error", err?.message || "Layanan tidak dapat dihubungi");
    } finally {
      setSubmittingTimeline(false);
    }
  };

  // Delete Timeline Handler
  const handleDeleteTimeline = async () => {
    if (!timelineToDelete?.UUID) return;
    setDeletingTimeline(true);
    try {
      const res = await apiClient.delete(
        `/proker_v3/timeline/${timelineToDelete.UUID}`
      );
      const json = res.data;

      addToast("success", "Tahapan timeline berhasil dihapus");
      setDeleteTimelineDialog(false);
      setTimelineToDelete(null);
      if (editingTimelineUuid === timelineToDelete.UUID) {
        resetForm();
      }
      fetchData();
    } catch (err) {
      addToast("error", err?.message || "Layanan tidak dapat dihubungi");
    } finally {
      setDeletingTimeline(false);
    }
  };

  // ========================================================
  // INLINE MULTIPLE FILE CHUNK UPLOAD PER BARIS
  // Slice binary 512 KB per chunk, speed monitor, pause/resume/cancel
  // ========================================================
  // Dynamic Form Rows Management per baris tahapan timeline
  const getRowFormRows = (timelineUuid) => {
    if (!rowFormRows[timelineUuid] || rowFormRows[timelineUuid].length === 0) {
      return [{ id: `init-${timelineUuid}`, file: null, keterangan: "" }];
    }
    return rowFormRows[timelineUuid];
  };

  const addRowFormRow = (timelineUuid) => {
    const current = getRowFormRows(timelineUuid);
    const newRow = {
      id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      file: null,
      keterangan: "",
    };
    setRowFormRows((prev) => ({
      ...prev,
      [timelineUuid]: [...current, newRow],
    }));
  };

  const removeRowFormRow = (timelineUuid, rowId) => {
    const current = getRowFormRows(timelineUuid);
    if (current.length <= 1) {
      setRowFormRows((prev) => ({
        ...prev,
        [timelineUuid]: [{ id: `init-${Date.now()}`, file: null, keterangan: "" }],
      }));
      return;
    }
    setRowFormRows((prev) => ({
      ...prev,
      [timelineUuid]: current.filter((r) => r.id !== rowId),
    }));
  };

  const updateRowFormField = (timelineUuid, rowId, field, value) => {
    const current = getRowFormRows(timelineUuid);
    setRowFormRows((prev) => ({
      ...prev,
      [timelineUuid]: current.map((r) =>
        r.id === rowId ? { ...r, [field]: value } : r
      ),
    }));
  };

  // Loop upload chunk binary untuk satu file
  const uploadRowFileChunkLoop = async (timeline, queueItem, startChunkIndex = 0) => {
    const token = getValidToken();
    const file = queueItem.file;
    const totalBytes = file.size;
    const totalChunks = Math.ceil(totalBytes / CHUNK_SIZE) || 1;
    const uploadId = queueItem.uploadId;
    const queueId = queueItem.id;
    const timelineUuid = timeline.UUID;

    // Inisialisasi kontrol upload untuk file ini
    uploadControlsRef.current[queueId] = {
      isPaused: false,
      isCancelled: false,
      xhr: null,
    };

    setRowUploadQueues((prev) => ({
      ...prev,
      [timelineUuid]: (prev[timelineUuid] || []).map((q) =>
        q.id === queueId
          ? {
              ...q,
              status: "uploading",
              error: null,
              speed: q.speed || "Memulai...",
            }
          : q
      ),
    }));

    let lastTime = performance.now();
    let lastLoaded = startChunkIndex * CHUNK_SIZE;

    for (let chunkIndex = startChunkIndex; chunkIndex < totalChunks; chunkIndex++) {
      const controls = uploadControlsRef.current[queueId];
      if (!controls || controls.isPaused || controls.isCancelled) {
        return; // Berhenti karena dijeda atau dibatalkan
      }

      const chunkOffset = chunkIndex * CHUNK_SIZE;
      const chunkEnd = Math.min(totalBytes, chunkOffset + CHUNK_SIZE);
      const chunkBlob = file.slice(chunkOffset, chunkEnd);

      const formData = new FormData();
      formData.append("upload_id", uploadId);
      formData.append("chunk_index", chunkIndex.toString());
      formData.append("total_chunks", totalChunks.toString());
      formData.append("chunk_offset", chunkOffset.toString());
      formData.append("total_size", totalBytes.toString());
      formData.append("file_name", queueItem.fileName);
      formData.append(
        "keterangan",
        queueItem.keterangan || `Bukti Kegiatan - ${timeline.NamaAktivitas || "Tahapan"}`
      );
      formData.append("chunk", chunkBlob, queueItem.fileName);

      try {
        const chunkResult = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          controls.xhr = xhr;

          xhr.upload.onprogress = (event) => {
            if (controls.isPaused || controls.isCancelled) return;

            if (event.lengthComputable) {
              const currentLoaded = chunkOffset + event.loaded;
              const percent = Math.min(99, Math.round((currentLoaded / totalBytes) * 100));

              const now = performance.now();
              const timeDelta = (now - lastTime) / 1000;

              let currentSpeed = "";
              let currentEta = "";

              if (timeDelta >= 0.15) {
                const bytesDelta = currentLoaded - lastLoaded;
                const bps = Math.max(0, bytesDelta / timeDelta);
                currentSpeed = formatBytes(bps) + "/s";

                if (bps > 0) {
                  const remaining = totalBytes - currentLoaded;
                  const sec = Math.round(remaining / bps);
                  if (sec > 60) {
                    currentEta = `~${Math.round(sec / 60)} mnt`;
                  } else if (sec > 0) {
                    currentEta = `~${sec} dtk`;
                  } else {
                    currentEta = "< 1 dtk";
                  }
                }
                lastTime = now;
                lastLoaded = currentLoaded;
              }

              setRowUploadQueues((prev) => ({
                ...prev,
                [timelineUuid]: (prev[timelineUuid] || []).map((q) =>
                  q.id === queueId
                    ? {
                        ...q,
                        progress: percent,
                        loadedBytes: currentLoaded,
                        currentChunk: chunkIndex,
                        speed: currentSpeed || q.speed,
                        eta: currentEta || q.eta,
                      }
                    : q
                ),
              }));
            }
          };

          xhr.onload = () => {
            controls.xhr = null;
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const resJson = JSON.parse(xhr.responseText);
                resolve(resJson);
              } catch {
                resolve({ completed: chunkIndex === totalChunks - 1 });
              }
            } else {
              let errMsg = "Gagal mengunggah chunk";
              try {
                const resJson = JSON.parse(xhr.responseText);
                errMsg = resJson?.error || resJson?.message || errMsg;
              } catch {
                if (xhr.status === 413) errMsg = "Ukuran berkas melebihi batas (413)";
              }
              reject(new Error(errMsg));
            }
          };

          xhr.onerror = () => {
            controls.xhr = null;
            reject(new Error("Koneksi jaringan terputus saat mengunggah"));
          };

          xhr.onabort = () => {
            controls.xhr = null;
            resolve({ aborted: true });
          };

          xhr.open("POST", `${API_BASE_URL}/proker_v3/timeline/${timelineUuid}/chunk`);
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.send(formData);
        });

        if (chunkResult?.aborted) {
          return;
        }

        // Chunk terakhir berhasil diverifikasi oleh server
        if (chunkIndex === totalChunks - 1 || chunkResult?.completed) {
          // Segera muat ulang data agar berkas bukti langsung muncul di card berkas
          fetchData();
          addToast("success", `Berkas bukti "${queueItem.fileName}" berhasil diunggah.`);

          // Drop seketika item 100% dari panel progress
          setRowUploadQueues((prev) => ({
            ...prev,
            [timelineUuid]: (prev[timelineUuid] || []).filter((q) => q.id !== queueId),
          }));
          if (uploadControlsRef.current) {
            delete uploadControlsRef.current[queueId];
          }

          return;
        }
      } catch (err) {
        if (controls.isPaused || controls.isCancelled) return;

        setRowUploadQueues((prev) => ({
          ...prev,
          [timelineUuid]: (prev[timelineUuid] || []).map((q) =>
            q.id === queueId
              ? {
                  ...q,
                  status: "error",
                  error: err?.message || "Gagal mengunggah berkas",
                  speed: "-",
                  eta: "",
                }
              : q
          ),
        }));
        addToast("error", `Gagal mengunggah "${queueItem.fileName}": ${err?.message}`);
        return;
      }
    }
  };

  // Mulai upload file-file dari baris dinamis per-chunk
  const handleUploadRowFiles = async (timeline) => {
    const rows = getRowFormRows(timeline.UUID);
    const filledRows = rows.filter((r) => Boolean(r.file));
    if (filledRows.length === 0) {
      addToast("warning", "Pilih minimal 1 berkas file untuk diunggah pada form ini");
      return;
    }

    // Reset pilihan form baris dinamis kembali ke 1 baris kosong awal
    setRowFormRows((prev) => ({
      ...prev,
      [timeline.UUID]: [{ id: `init-${Date.now()}`, file: null, keterangan: "" }],
    }));

    // Buat queue items untuk masing-masing baris file dengan keterangan dinamisnya
    const newItems = filledRows.map((r, idx) => {
      const qId = `${timeline.UUID}-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
      return {
        id: qId,
        uploadId: generateUUID(),
        file: r.file,
        fileName: r.file.name,
        totalBytes: r.file.size,
        loadedBytes: 0,
        progress: 0,
        speed: "Menyiapkan...",
        eta: "",
        currentChunk: 0,
        totalChunks: Math.ceil(r.file.size / CHUNK_SIZE) || 1,
        status: "uploading",
        keterangan: r.keterangan?.trim() || "",
        error: null,
      };
    });

    setRowUploadQueues((prev) => ({
      ...prev,
      [timeline.UUID]: [...(prev[timeline.UUID] || []), ...newItems],
    }));

    // Jalankan chunk loop untuk semua file yang dipilih secara bersamaan (multiple progress)
    newItems.forEach((item) => {
      uploadRowFileChunkLoop(timeline, item, 0);
    });
  };

  // Jeda (Pause) Upload Chunk
  const pauseRowUpload = (timelineUuid, item) => {
    const controls = uploadControlsRef.current[item.id];
    if (controls) {
      controls.isPaused = true;
      if (controls.xhr) {
        controls.xhr.abort();
      }
    }
    setRowUploadQueues((prev) => ({
      ...prev,
      [timelineUuid]: (prev[timelineUuid] || []).map((q) =>
        q.id === item.id ? { ...q, status: "paused", speed: "Dijeda" } : q
      ),
    }));
  };

  // Lanjutkan (Resume) Upload Chunk
  const resumeRowUpload = (timeline, item) => {
    const controls = uploadControlsRef.current[item.id] || {};
    controls.isPaused = false;
    controls.isCancelled = false;
    uploadControlsRef.current[item.id] = controls;

    uploadRowFileChunkLoop(timeline, item, item.currentChunk || 0);
  };

  // Batalkan (Cancel) Upload Chunk
  const cancelRowUpload = async (timelineUuid, item) => {
    const controls = uploadControlsRef.current[item.id];
    if (controls) {
      controls.isCancelled = true;
      if (controls.xhr) {
        controls.xhr.abort();
      }
    }

    setRowUploadQueues((prev) => ({
      ...prev,
      [timelineUuid]: (prev[timelineUuid] || []).filter((q) => q.id !== item.id),
    }));
    delete uploadControlsRef.current[item.id];

    try {
      await apiClient.delete(
        `/proker_v3/timeline/${timelineUuid}/chunk/${item.uploadId}`
      );
    } catch (err) {
      console.error("Gagal menghapus temporary chunk:", err);
    }
    addToast("info", `Upload berkas "${item.fileName}" dibatalkan`);
  };

  // Delete Individual Bukti File
  const handleDeleteFile = async () => {
    if (!fileToDelete?.UUID) return;
    setDeletingFile(true);
    try {
      const res = await apiClient.delete(`/proker_v3/file/${fileToDelete.UUID}`);
      const json = res.data;

      addToast("success", "Berkas bukti berhasil dihapus");
      setDeleteFileDialog(false);
      setFileToDelete(null);
      fetchData();
    } catch (err) {
      addToast("error", err?.message || "Layanan tidak dapat dihubungi");
    } finally {
      setDeletingFile(false);
    }
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
              if (typeof changeLevel === "function") {
                changeLevel(val);
              } else {
                setLevel(val);
                sessionStorage.setItem("activeLevel", val);
                setOpenChangeLevel(false);
              }
            }}
          />
        )}
      />

      <div className="p-4 sm:p-6 bg-gray-50 min-h-screen space-y-6">
        {/* Page Header */}
        <PageHeader
          icon={Clock}
          title="Jadwal Timeline & Bukti Kegiatan"
          subtitle="Form dan Tabel Pengelolaan Data Timeline Serta Berkas"
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    proker?.UUID
                      ? `/proker_v3/${proker.UUID}/aktivitas`
                      : prokerUuid
                      ? `/proker_v3/${prokerUuid}/aktivitas`
                      : "/proker_v3"
                  )
                }
                className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs flex items-center gap-1.5 border border-purple-200 transition cursor-pointer shadow-2xs"
                title="Kembali ke halaman daftar aktivitas program kerja"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-purple-600" />
                <span>Kembali ke Aktivitas</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/proker_v3")}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-gray-100 text-gray-700 font-bold text-xs flex items-center gap-1.5 border border-gray-200 shadow-2xs transition cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-gray-600" />
                <span>Daftar Proker</span>
              </button>
            </div>
          }
        />

        {/* Identity Banner Card: Proker & Aktivitas */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs font-bold">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-wider text-purple-600 uppercase">
                  Aktivitas Kegiatan Terpilih
                </span>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-snug">
                  {aktivitas?.Aktivitas || (loading ? "Memuat aktivitas..." : "-")}
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
              <span className="text-xs px-2.5 py-1 rounded-full font-mono font-bold bg-purple-100 text-purple-800">
                Tahun {proker?.Tahun || "2026"}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-gray-100 text-gray-800">
                {proker?.NamaFakultasUnit || "Unit Kerja"}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Anggaran:{" "}
                {hasRealisasiAnggaran(aktivitas) ? (
                  <>
                    <span
                      className="line-through text-emerald-800/60 font-normal mr-1.5 decoration-rose-500 decoration-1"
                      title="Anggaran Awal"
                    >
                      {formatRupiah(aktivitas.Anggaran)}
                    </span>
                    <span
                      className="text-emerald-950 font-extrabold"
                      title="Realisasi Anggaran Baru"
                    >
                      {formatRupiah(getRealisasiAnggaran(aktivitas))}
                    </span>
                  </>
                ) : (
                  formatRupiah(aktivitas?.Anggaran)
                )}
              </span>
            </div>
          </div>

          {/* Context Details Grid (Tanpa Target Capaian) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-purple-50/40 rounded-xl border border-purple-100 space-y-1">
              <span className="text-gray-400 text-[10px] block font-bold uppercase tracking-wider text-purple-700">
                Program Kerja Induk:
              </span>
              <p className="font-semibold text-gray-800 line-clamp-2">
                {proker?.NamaProgram || "-"}
              </p>
            </div>

            <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100 space-y-1">
              <span className="text-gray-400 text-[10px] block font-bold uppercase tracking-wider text-blue-700">
                Standar & Indikator:
              </span>
              <p className="font-semibold text-gray-800 line-clamp-1">
                {proker?.StandarSubStandar || "-"}
              </p>
              <p className="text-[11px] text-gray-500 italic line-clamp-1">
                {proker?.IndikatorKinerja || "-"}
              </p>
            </div>

            <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-100 space-y-1">
              <span className="text-gray-400 text-[10px] block font-bold uppercase tracking-wider text-amber-700">
                PIC & Status Aktivitas:
              </span>
              <p className="font-bold text-gray-800">
                PIC: {aktivitas?.PIC || "-"}
              </p>
              <p className="text-[11px] font-semibold text-purple-700 uppercase">
                Status: {aktivitas?.Status || "Draf"}
              </p>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* FORM INPUT TIMELINE AKTIVITAS                           */}
        {/* ======================================================== */}
        <div id="form-timeline-section" className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  {editingTimelineUuid
                    ? "Form Edit Tahapan Timeline"
                    : "Form Tambah Tahapan Timeline Baru"}
                </h3>
                <p className="text-xs text-gray-500">
                  Isi nama tahapan, titik kontrol, rentang tanggal rencana kerja [RK], serta capaian & kendala.
                </p>
              </div>
            </div>

            {editingTimelineUuid && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Batal Edit / Tambah Baru</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSubmitTimeline} className="space-y-4">
            {/* Grid 1: Kolom Inti Identitas Timeline (Nama Tahapan & Titik Kontrol Textarea) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              {/* Nama Tahapan / Aktivitas */}
              <div className="sm:col-span-7">
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Nama Tahapan / Aktivitas <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nama tahapan / kegiatan baru..."
                  value={formTimeline.nama_aktivitas}
                  onChange={(e) =>
                    setFormTimeline({ ...formTimeline, nama_aktivitas: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                  required
                />
              </div>

              {/* Titik Kontrol (Textarea) */}
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Titik Kontrol
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: RK / R / Persiapan / Evaluasi..."
                  value={formTimeline.titik_kontrol}
                  onChange={(e) =>
                    setFormTimeline({ ...formTimeline, titik_kontrol: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium resize-none"
                />
              </div>
            </div>

            {/* Grid 2: Tanggal Rencana Kegiatan (RK) */}
            <div className="p-3.5 bg-blue-50/40 rounded-xl border border-blue-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Jadwal Rencana Kerja [RK]:</span>
                </span>
                <span className="text-[10px] text-gray-500 italic">
                  * Realisasi & status dikelola melalui tombol Perkembangan Realisasi pada tabel
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Tanggal RK Awal */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Tgl RK Awal (Rencana) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formTimeline.tanggal_rk_awal}
                    onChange={(e) =>
                      setFormTimeline({ ...formTimeline, tanggal_rk_awal: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>

                {/* Tanggal RK Akhir */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Tgl RK Akhir (Rencana) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formTimeline.tanggal_rk_akhir}
                    onChange={(e) =>
                      setFormTimeline({ ...formTimeline, tanggal_rk_akhir: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Grid 3: Capaian, Masalah, Pemecahan Masalah */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Hasil Capaian Pelaksanaan
                </label>
                <textarea
                  rows="2"
                  placeholder="Deskripsi capaian hasil tahapan..."
                  value={formTimeline.capaian}
                  onChange={(e) =>
                    setFormTimeline({ ...formTimeline, capaian: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Kendala / Masalah yang Dihadapi
                </label>
                <textarea
                  rows="2"
                  placeholder="Deskripsi kendala atau hambatan..."
                  value={formTimeline.masalah}
                  onChange={(e) =>
                    setFormTimeline({ ...formTimeline, masalah: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Tindak Lanjut / Pemecahan Masalah
                </label>
                <textarea
                  rows="2"
                  placeholder="Upaya tindak lanjut atau solusi masalah..."
                  value={formTimeline.pemecahan_masalah}
                  onChange={(e) =>
                    setFormTimeline({ ...formTimeline, pemecahan_masalah: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              {editingTimelineUuid && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
                >
                  Batal
                </button>
              )}

              <button
                type="submit"
                disabled={submittingTimeline}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-200 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>
                  {submittingTimeline
                    ? "Menyimpan Data..."
                    : editingTimelineUuid
                    ? "Perbarui Tahapan Timeline"
                    : "+ Simpan Tahapan Timeline Baru"}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* ======================================================== */}
        {/* DISPLAY MATRIKS JADWAL MINGGUAN [RK] & [R] (READ-ONLY)    */}
        {/* Menampilkan: Aktivitas, Tgl Rencana Kegiatan, Tgl Realisasi */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold shadow-2xs">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Matriks Jadwal Mingguan Rencana & Realisasi
                </h3>
                <p className="text-xs text-gray-500">
                  Visualisasi jadwal mingguan rencana kerja [RK] dan perkembangan realisasi [R] dari aktivitas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <span className="w-2.5 h-2.5 rounded bg-blue-600 inline-block" />
                <span>[RK] Rencana</span>
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2.5 h-2.5 rounded bg-emerald-600 inline-block" />
                <span>[R] Realisasi</span>
              </span>
            </div>
          </div>

          {/* Banner Informasi Aktivitas & Tanggal Sesuai Permintaan User */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-gray-50/70 p-3.5 rounded-xl border border-gray-200/80">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                Aktivitas:
              </span>
              <p className="font-bold text-gray-900 text-sm">
                {aktivitas?.Aktivitas || (loading ? "Memuat aktivitas..." : "-")}
              </p>
              <p className="text-[11px] text-gray-500">
                PIC: <b className="text-gray-700">{aktivitas?.PIC || "-"}</b>
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                Tanggal Rencana Kegiatan [RK]:
              </span>
              <p className="font-semibold text-blue-900 text-xs">
                {activitySchedule.rkAwal ? (
                  `${formatDateIndoWithDay(activitySchedule.rkAwal)} s/d ${formatDateIndoWithDay(activitySchedule.rkAkhir)}`
                ) : (
                  <span className="text-gray-400 font-normal italic">Belum ada tanggal RK tahapan</span>
                )}
              </p>
              <p className="text-[11px] text-gray-500">
                Total Minggu RK: <b className="text-blue-700">
                  {BULAN_LIST.reduce((acc, b) => acc + WEEKS.filter((w) => activitySchedule.rkSlots.includes(`${b.key}_${w}`) || isWeekInDateRange(b.key, w, activitySchedule.rkAwal, activitySchedule.rkAkhir)).length, 0)} Minggu
                </b>
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                Tanggal Realisasi [R]:
              </span>
              <p className="font-semibold text-emerald-900 text-xs">
                {activitySchedule.rAwal ? (
                  `${formatDateIndoWithDay(activitySchedule.rAwal)} s/d ${formatDateIndoWithDay(activitySchedule.rAkhir)}`
                ) : (
                  <span className="text-gray-400 font-normal italic">Belum ada realisasi terlaksana</span>
                )}
              </p>
              <p className="text-[11px] text-gray-500">
                Total Minggu Realisasi: <b className="text-emerald-700">
                  {BULAN_LIST.reduce((acc, b) => acc + WEEKS.filter((w) => activitySchedule.rSlots.includes(`${b.key}_${w}`) || isWeekInDateRange(b.key, w, activitySchedule.rAwal, activitySchedule.rAkhir)).length, 0)} Minggu
                </b>
              </p>
            </div>
          </div>

          {/* Matriks Table 48 Slots Display */}
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-center text-[10px] border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                    <th className="py-2.5 px-3 text-left w-52 sticky left-0 bg-gray-100 z-10 border-r border-gray-200 uppercase tracking-wider text-[11px]">
                      Nama Kegiatan
                    </th>
                    {BULAN_LIST.map((b) => (
                      <th
                        key={b.key}
                        colSpan={4}
                        className="py-1.5 px-1 border-r border-gray-200 text-center font-extrabold text-[11px]"
                      >
                        {b.short}
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                    <th className="py-1 px-3 text-left sticky left-0 bg-gray-50 z-10 border-r border-gray-200 text-[10px]">
                      Minggu (M1 - M4)
                    </th>
                    {BULAN_LIST.map((b) =>
                      WEEKS.map((w) => (
                        <th
                          key={`${b.key}-${w}`}
                          className="w-5 py-0.5 border-r border-gray-200 text-[9px] font-mono"
                        >
                          {w}
                        </th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody>
                  {timelines.length === 0 ? (
                    <tr>
                      <td
                        colSpan={49}
                        className="py-8 text-center text-xs text-gray-400 bg-white"
                      >
                        Belum ada daftar aktivitas
                      </td>
                    </tr>
                  ) : (
                    timelines.map((tl, idx) => {
                      const tlRkSlots = parseSlotArray(tl.JadwalRk);
                      const tlRSlots = parseSlotArray(tl.JadwalR);
                      const tlRkAwal = tl.TanggalRkAwal ? tl.TanggalRkAwal.slice(0, 10) : "";
                      const tlRkAkhir = tl.TanggalRkAkhir ? tl.TanggalRkAkhir.slice(0, 10) : "";
                      const tlRAwal = tl.TanggalRAwal ? tl.TanggalRAwal.slice(0, 10) : "";
                      const tlRAkhir = tl.TanggalRAkhir ? tl.TanggalRAkhir.slice(0, 10) : "";

                      return (
                        <tr
                          key={tl.UUID || idx}
                          className="border-b border-gray-100 bg-white hover:bg-purple-50/20 transition"
                        >
                          {/* Nama Kegiatan (1 Row Gabungan) */}
                          <td className="py-2.5 px-3 text-left text-gray-800 sticky left-0 bg-white z-10 border-r border-gray-200 whitespace-nowrap text-[11px]">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-purple-700 font-mono text-xs">
                                #{tl.NoAktivitas || idx + 1}
                              </span>
                              <span
                                className="truncate max-w-[190px] inline-block font-bold text-gray-900"
                                title={tl.NamaAktivitas}
                              >
                                {tl.NamaAktivitas}
                              </span>
                            </div>
                          </td>

                          {/* 48 Slot Mingguan (Dual Baris Mini-Indicator RK [Biru Atas] & R [Hijau Bawah]) */}
                          {BULAN_LIST.map((b) =>
                            WEEKS.map((w) => {
                              const slotKey = `${b.key}_${w}`;
                              const isRk =
                                tlRkSlots.includes(slotKey) ||
                                isWeekInDateRange(b.key, w, tlRkAwal, tlRkAkhir);
                              const isR =
                                tlRSlots.includes(slotKey) ||
                                isWeekInDateRange(b.key, w, tlRAwal, tlRAkhir);

                              return (
                                <td
                                  key={slotKey}
                                  className="p-1 border-r border-gray-200 select-none align-middle"
                                  title={`#${tl.NoAktivitas || idx + 1} ${tl.NamaAktivitas} - ${b.label} ${w}: ${
                                    isRk && isR
                                      ? "Rencana [RK] & Realisasi [R]"
                                      : isRk
                                      ? "Rencana Kerja [RK]"
                                      : isR
                                      ? "Realisasi [R]"
                                      : "-"
                                  }`}
                                >
                                  <div className="flex flex-col gap-0.5 items-center justify-center min-w-[14px]">
                                    {/* Baris Rencana Kerja [RK] (Biru) */}
                                    <div
                                      className={`w-full h-2 rounded-2xs transition ${
                                        isRk ? "bg-blue-600 shadow-2xs" : "bg-gray-100"
                                      }`}
                                    />
                                    {/* Baris Realisasi [R] (Hijau) */}
                                    <div
                                      className={`w-full h-2 rounded-2xs transition ${
                                        isR ? "bg-emerald-500 shadow-2xs" : "bg-gray-100"
                                      }`}
                                    />
                                  </div>
                                </td>
                              );
                            })
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* TABEL DATA aktivtasv2_timeline BESERTA UPLOAD BUKTI FILE  */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-purple-600" />
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Daftar Tahapan Timeline Aktivitas
                </h3>
                <p className="text-xs text-gray-500">
                  Setiap baris dapat mengunggah multiple berkas bukti dukung.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Muat Ulang Data</span>
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-gray-500">
              Memuat data timeline aktivitas...
            </div>
          ) : timelines.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 space-y-1">
              <Calendar className="w-8 h-8 mx-auto text-gray-300 stroke-1" />
              <p className="font-semibold text-gray-600">Belum ada tahapan timeline pada aktivitas ini</p>
              <p className="text-[11px]">Silakan gunakan form di atas untuk membuat tahapan timeline dan jadwal kegiatan.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {timelines.map((tl, index) => {
                const rkSlots = getTimelineRkSlots(tl);
                const rSlots = getTimelineRSlots(tl);
                const files = tl.Files || [];

                return (
                  <div
                    key={tl.UUID || tl.ID || index}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`p-4.5 rounded-2xl border transition shadow-xs space-y-3.5 ${
                      dragOverIndex === index
                        ? "border-purple-500 bg-purple-50/40 ring-2 ring-purple-400"
                        : draggedIndex === index
                        ? "opacity-50 border-dashed border-purple-400 bg-purple-50/20"
                        : "border-gray-200/90 bg-white hover:border-purple-200"
                    }`}
                  >
                    {/* Header Baris Timeline */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-2.5">
                        {/* Drag and Drop Grip Handle */}
                        <div
                          className="p-1 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 cursor-grab active:cursor-grabbing transition shrink-0"
                          title="Tahan & geser untuk mengubah nomor urut tahapan"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>

                        <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 font-mono font-bold flex items-center justify-center text-xs shrink-0">
                          {tl.NoAktivitas || index + 1}
                        </span>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-900 text-sm">
                              {tl.NamaAktivitas}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Titik Kontrol: {tl.TitikKontrol || "RK"}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                tl.Status === "Selesai"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : tl.Status === "Sedang Berjalan"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : tl.Status === "Tertunda"
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-gray-100 text-gray-700 border border-gray-200"
                              }`}
                            >
                              {tl.Status || "Belum Terlaksana"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            PIC Tahapan: <b className="text-gray-700">{tl.PIC || "-"}</b> • Tanggal RK:{" "}
                            <span className="font-semibold text-gray-800">
                              {tl.TanggalRkAwal ? formatDateIndoWithDay(tl.TanggalRkAwal) : "-"} s/d{" "}
                              {tl.TanggalRkAkhir ? formatDateIndoWithDay(tl.TanggalRkAkhir) : "-"}
                            </span>
                            {tl.TanggalRAwal && (
                              <span>
                                {" "}• Realisasi:{" "}
                                <span className="font-semibold text-emerald-700">
                                  {formatDateIndoWithDay(tl.TanggalRAwal)} s/d {tl.TanggalRAkhir ? formatDateIndoWithDay(tl.TanggalRAkhir) : "-"}
                                </span>
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Tombol Aksi Perkembangan Realisasi, Edit & Hapus */}
                      <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => openRealisasiModal(tl)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition cursor-pointer shadow-2xs"
                          title="Buka modal perkembangan realisasi (Tanggal R & Status)"
                        >
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Perkembangan Realisasi</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => startEditTimeline(tl)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition cursor-pointer"
                          title="Edit data tahapan timeline ini"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Tahapan</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setTimelineToDelete(tl);
                            setDeleteTimelineDialog(true);
                          }}
                          className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
                          title="Hapus tahapan timeline ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Informasi Evaluasi & Jadwal Minggu */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                      {/* Rekap Slot Jadwal */}
                      <div className="md:col-span-6 p-3 bg-gray-50/70 rounded-xl border border-gray-100 space-y-2">
                        <span className="text-[11px] font-bold text-gray-700 block">
                          Jadwal Minggu Pelaksanaan (RK & R):
                        </span>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[10px] font-bold text-blue-700 w-12 shrink-0">[RK]:</span>
                            {rkSlots.length === 0 ? (
                              <span className="text-[10px] text-gray-400 italic">Belum ada minggu yang ditandai</span>
                            ) : (
                              rkSlots.map((s) => (
                                <span
                                  key={s}
                                  className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-100 text-blue-800"
                                >
                                  {s.replace("_", " ")}
                                </span>
                              ))
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[10px] font-bold text-emerald-700 w-12 shrink-0">[R]:</span>
                            {rSlots.length === 0 ? (
                              <span className="text-[10px] text-gray-400 italic">Belum ada realisasi yang ditandai</span>
                            ) : (
                              rSlots.map((s) => (
                                <span
                                  key={s}
                                  className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800"
                                >
                                  {s.replace("_", " ")}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Capaian, Masalah, Solusi */}
                      <div className="md:col-span-6 p-3 bg-gray-50/70 rounded-xl border border-gray-100 space-y-1">
                        <span className="text-[11px] font-bold text-gray-700 block">
                          Hasil Capaian & Evaluasi:
                        </span>
                        <p className="text-gray-700">
                          <b className="text-gray-900">Capaian:</b> {tl.Capaian || "-"}
                        </p>
                        {tl.Masalah && (
                          <p className="text-rose-700">
                            <b>Kendala:</b> {tl.Masalah}
                          </p>
                        )}
                        {tl.PemecahanMasalah && (
                          <p className="text-emerald-700">
                            <b>Solusi:</b> {tl.PemecahanMasalah}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* ======================================================== */}
                    {/* SEKSI BERKAS BUKTI KEGIATAN TAHAPAN                      */}
                    {/* Menampilkan file tersimpan & Form upload multiple inline */}
                    {/* ======================================================== */}
                    <div className="p-4 bg-purple-50/30 rounded-xl border border-purple-100/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Paperclip className="w-4 h-4 text-purple-600" />
                          <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                            Berkas Bukti Dukung Tahapan ({files.length})
                          </span>
                        </div>
                      </div>

                      {/* List Berkas Tersimpan */}
                      {files.length === 0 ? (
                        <div className="p-3 text-center text-xs text-gray-400 bg-white/70 rounded-xl border border-dashed border-gray-200">
                          Belum ada berkas bukti dukung yang tersimpan untuk tahapan ini. Gunakan form di bawah untuk mengunggah.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                          {files.map((file) => {
                            const fileUrl = file.FileURL
                              ? `${API_BASE_URL}${file.FileURL.startsWith("/") ? "" : "/"}${file.FileURL}`
                              : null;

                            return (
                              <div
                                key={file.UUID || file.ID}
                                className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 bg-white shadow-2xs hover:border-purple-300 transition text-xs"
                              >
                                <div className="truncate pr-2 space-y-0.5">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <FileText className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                    <span className="font-bold text-gray-900 truncate" title={file.NamaFile || file.File}>
                                      {file.NamaFile || file.File}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-gray-500 flex items-center gap-1.5">
                                    <span>{formatBytes(file.FileSize)}</span>
                                    {file.Keterangan && (
                                      <span className="italic truncate max-w-xs" title={file.Keterangan}>
                                        • {file.Keterangan}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {fileUrl && (
                                    <Tooltip title="Buka / Unduh Berkas Bukti">
                                      <a
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    </Tooltip>
                                  )}

                                  <Tooltip title="Hapus Berkas Ini">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFileToDelete(file);
                                        setDeleteFileDialog(true);
                                      }}
                                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </Tooltip>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Inline Upload Form (Dynamic Multi-Row Form Berkas & Keterangan) */}
                      <div className="p-3.5 bg-white rounded-xl border border-purple-200 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                            <Upload className="w-4 h-4 text-purple-600" />
                            <span>Unggah Berkas Bukti Baru (Multi File & Keterangan Dinamis):</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => addRowFormRow(tl.UUID)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambah Baris</span>
                          </button>
                        </div>

                        {/* Daftar Baris Input Dinamis */}
                        <div className="space-y-2.5">
                          {getRowFormRows(tl.UUID).map((rowItem, rIdx) => (
                            <div
                              key={rowItem.id}
                              className="p-2.5 bg-purple-50/20 rounded-xl border border-purple-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                            >
                              {/* Nomor Baris */}
                              <span className="w-5 h-5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                                {rIdx + 1}
                              </span>

                              {/* Input File */}
                              <div className="flex-1 min-w-0">
                                <input
                                  type="file"
                                  onChange={(e) =>
                                    updateRowFormField(
                                      tl.UUID,
                                      rowItem.id,
                                      "file",
                                      e.target.files?.[0] || null
                                    )
                                  }
                                  className="w-full text-xs text-gray-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer border border-gray-200 rounded-xl bg-white"
                                />
                                {rowItem.file && (
                                  <span
                                    className="text-[10px] text-purple-700 font-medium pl-1 truncate block mt-0.5"
                                    title={rowItem.file.name}
                                  >
                                    Terpilih: {rowItem.file.name} ({formatBytes(rowItem.file.size)})
                                  </span>
                                )}
                              </div>

                              {/* Input Keterangan Spesifik */}
                              <div className="flex-1 min-w-0">
                                <input
                                  type="text"
                                  placeholder="Keterangan berkas bukti (opsional)..."
                                  value={rowItem.keterangan || ""}
                                  onChange={(e) =>
                                    updateRowFormField(
                                      tl.UUID,
                                      rowItem.id,
                                      "keterangan",
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                              </div>

                              {/* Tombol Hapus Baris */}
                              <button
                                type="button"
                                onClick={() => removeRowFormRow(tl.UUID, rowItem.id)}
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer self-end sm:self-center shrink-0"
                                title="Hapus baris ini"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Footer Form & Tombol Submit */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-purple-100">
                          <span className="text-[11px] text-gray-500">
                            {getRowFormRows(tl.UUID).filter((r) => Boolean(r.file)).length} dari{" "}
                            {getRowFormRows(tl.UUID).length} baris telah memilih berkas.
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => addRowFormRow(tl.UUID)}
                              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Tambah Berkas</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUploadRowFiles(tl)}
                              disabled={
                                getRowFormRows(tl.UUID).filter((r) => Boolean(r.file)).length === 0
                              }
                              className="px-4 py-1.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>
                                Unggah Berkas (
                                {getRowFormRows(tl.UUID).filter((r) => Boolean(r.file)).length})
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* List Antrean Progres Upload Per Chunk (Multiple Progress) */}
                        {(() => {
                          const queue = rowUploadQueues[tl.UUID] || [];
                          if (queue.length === 0) return null;

                          return (
                            <div className="space-y-2 pt-2 border-t border-purple-100">
                              <div className="flex items-center justify-between text-[11px] font-bold text-gray-700">
                                <span>Proses Unggah Berkas Bukti ({queue.length}):</span>
                              </div>
                              <div className="space-y-2">
                                {queue.map((item) => (
                                  <div
                                    key={item.id}
                                    className="p-3 bg-purple-50/20 rounded-xl border border-purple-200/90 shadow-2xs space-y-2"
                                  >
                                    {/* Header Progress Card */}
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                                        <div className="min-w-0">
                                          <p
                                            className="text-xs font-bold text-gray-900 truncate"
                                            title={item.fileName}
                                          >
                                            {item.fileName}
                                          </p>
                                          {item.keterangan && (
                                            <p
                                              className="text-[10px] text-gray-600 truncate italic"
                                              title={item.keterangan}
                                            >
                                              Ket: {item.keterangan}
                                            </p>
                                          )}
                                          <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono mt-0.5">
                                            <span>
                                              {formatBytes(item.loadedBytes || 0)} / {formatBytes(item.totalBytes)}
                                            </span>
                                            {item.speed && (
                                              <span className="text-purple-600 font-semibold">
                                                • {item.speed}
                                              </span>
                                            )}
                                            {item.eta && (
                                              <span className="text-gray-400">• Sisa: {item.eta}</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Status Badge & Controls */}
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            item.status === "paused"
                                              ? "bg-amber-100 text-amber-800"
                                              : item.status === "error"
                                              ? "bg-rose-100 text-rose-800"
                                              : "bg-purple-100 text-purple-800 animate-pulse"
                                          }`}
                                        >
                                          {item.status === "paused"
                                            ? "Dijeda"
                                            : item.status === "error"
                                            ? "Gagal"
                                            : `${item.progress}%`}
                                        </span>

                                        {/* Kontrol Pause / Resume / Retry */}
                                        {item.status === "uploading" && (
                                          <button
                                            type="button"
                                            onClick={() => pauseRowUpload(tl.UUID, item)}
                                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-100 border border-amber-200 transition cursor-pointer"
                                            title="Jeda (Pause) Upload"
                                          >
                                            <Pause className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {item.status === "paused" && (
                                          <button
                                            type="button"
                                            onClick={() => resumeRowUpload(tl, item)}
                                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
                                            title="Lanjutkan (Resume) Upload"
                                          >
                                            <Play className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {item.status === "error" && (
                                          <button
                                            type="button"
                                            onClick={() => resumeRowUpload(tl, item)}
                                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 border border-blue-200 transition cursor-pointer"
                                            title="Coba Lagi Upload"
                                          >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                          </button>
                                        )}

                                        {/* Kontrol Batal (Cancel) */}
                                        <button
                                          type="button"
                                          onClick={() => cancelRowUpload(tl.UUID, item)}
                                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                                          title="Batalkan (Cancel) Upload"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Progress Bar Visual */}
                                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                      <div
                                        className={`h-full transition-all duration-200 rounded-full ${
                                          item.status === "paused"
                                            ? "bg-amber-500"
                                            : item.status === "error"
                                            ? "bg-rose-500"
                                            : "bg-purple-600"
                                        }`}
                                        style={{ width: `${item.progress}%` }}
                                      />
                                    </div>

                                    {item.error && (
                                      <p className="text-[10px] text-rose-600 font-medium">{item.error}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL PERKEMBANGAN REALISASI TAHAPAN (3 INPUT FORM)      */}
      {/* 1. Tgl R Awal, 2. Tgl R Akhir, 3. Status Pelaksanaan     */}
      {/* ======================================================== */}
      {realisasiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50/80 to-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Perkembangan Realisasi Tahapan
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-1">
                    {selectedTimelineForRealisasi?.NamaAktivitas}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRealisasiModalOpen(false);
                  setSelectedTimelineForRealisasi(null);
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRealisasi} className="p-5 space-y-4">
              {/* Info Ringkas Tahapan */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">No. Urut Tahapan:</span>
                  <span className="font-bold text-purple-700">
                    #{selectedTimelineForRealisasi?.NoAktivitas || 1}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Titik Kontrol:</span>
                  <span className="font-bold text-gray-800">
                    {selectedTimelineForRealisasi?.TitikKontrol || "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Rencana Jadwal [RK]:</span>
                  <span className="font-mono text-gray-700">
                    {selectedTimelineForRealisasi?.TanggalRkAwal ? selectedTimelineForRealisasi.TanggalRkAwal.slice(0, 10) : "-"} s/d{" "}
                    {selectedTimelineForRealisasi?.TanggalRkAkhir ? selectedTimelineForRealisasi.TanggalRkAkhir.slice(0, 10) : "-"}
                  </span>
                </div>
              </div>

              {/* Input 1: Tgl R Awal (Realisasi) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tgl R Awal (Realisasi)
                </label>
                <input
                  type="date"
                  value={realisasiForm.tanggal_r_awal}
                  onChange={(e) =>
                    setRealisasiForm({ ...realisasiForm, tanggal_r_awal: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              {/* Input 2: Tgl R Akhir (Realisasi) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tgl R Akhir (Realisasi)
                </label>
                <input
                  type="date"
                  value={realisasiForm.tanggal_r_akhir}
                  onChange={(e) =>
                    setRealisasiForm({ ...realisasiForm, tanggal_r_akhir: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              {/* Input 3: Status Pelaksanaan */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Status Pelaksanaan
                </label>
                <select
                  value={realisasiForm.status}
                  onChange={(e) =>
                    setRealisasiForm({ ...realisasiForm, status: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Belum Terlaksana">Belum Terlaksana</option>
                  <option value="Sedang Berjalan">Sedang Berjalan</option>
                  <option value="Selesai">Selesai</option>
                  <option value="Tertunda">Tertunda</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setRealisasiModalOpen(false);
                    setSelectedTimelineForRealisasi(null);
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingRealisasi}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingRealisasi ? "Menyimpan..." : "Simpan Perkembangan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Timeline Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={deleteTimelineDialog}
        onClose={() => setDeleteTimelineDialog(false)}
        onConfirm={handleDeleteTimeline}
        title="Hapus Tahapan Timeline?"
        message={`Apakah Anda yakin ingin menghapus tahapan "${timelineToDelete?.NamaAktivitas}"? Semua berkas bukti dukung pada tahapan ini akan dihapus permanen.`}
      />

      {/* Delete File Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={deleteFileDialog}
        onClose={() => setDeleteFileDialog(false)}
        onConfirm={handleDeleteFile}
        title="Hapus Berkas Bukti?"
        message={`Apakah Anda yakin ingin menghapus berkas "${fileToDelete?.NamaFile || fileToDelete?.File}"? File akan dihapus permanen dari server.`}
      />
    </>
  );
}
