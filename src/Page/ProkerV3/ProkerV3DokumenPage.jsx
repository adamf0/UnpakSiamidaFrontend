import React, { useState, useEffect, useMemo, useRef, Fragment } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
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
  JENIS_DOKUMEN_PROKER,
  formatBytes,
  formatRupiah,
  hasRealisasiAnggaran,
  getRealisasiAnggaran,
  isAnggaranRevised,
} from "./prokerConstants";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Layers,
  FileSpreadsheet,
  FileText,
  Upload,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  RotateCcw,
  Play,
  Pause,
  FolderOpen,
  Info,
  Check,
  Sparkles,
  Eye,
  RefreshCw,
  X,
  Send,
  Zap,
  Target,
} from "lucide-react";

export default function ProkerV3DokumenPage() {
  const { uuid: prokerUuid } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const actParamUuid = searchParams.get("act") || searchParams.get("aktivitas");

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

  const curRole = String(level || localStorage.getItem("activeLevel") || user?.level || "").toLowerCase().trim();
  const isAdmin = curRole === "admin";
  const isVerifierRole = ["upml", "upmf", "upms", "evaluator", "anggaran", "keuangan"].includes(curRole);
  const isEvaluator = curRole === "evaluator" || curRole.includes("evaluator");

  // Cek apakah user memiliki fakultas_unit (langsung atau via penugasan extra_role)
  const hasFakultasUnit = Boolean(
    user?.fakultas_unit ||
    user?.id_fakultas_unit ||
    user?.FakultasUnit ||
    user?.uuid_fakultas_unit ||
    user?.nama_fakultas_unit ||
    user?.NamaFakultasUnit ||
    (Array.isArray(user?.extra_role) &&
      user.extra_role.some(
        (r) =>
          r &&
          (r.fakultas_unit ||
            r.id_fakultas_unit ||
            r.IdFakultasUnit ||
            r.nama_fakultas_unit ||
            r.NamaFakultasUnit)
      ))
  );

  // Data states
  const [loading, setLoading] = useState(true);
  const [proker, setProker] = useState(null);
  const [activities, setActivities] = useState([]);
  const [selectedActUuid, setSelectedActUuid] = useState(actParamUuid || "");
  const [documents, setDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState("all");

  // Izin unggah dokumen: user yang memiliki fakultas_unit (admin & verifikator tidak dapat mengunggah)
  const canUploadDokumen = useMemo(() => {
    if (isAdmin || isVerifierRole || !hasFakultasUnit) return false;

    if (proker) {
      const prokerFuId = String(proker.IdFakultasUnit || proker.id_fakultas_unit || "").trim();
      const prokerFuUuid = String(proker.UuidFakultasUnit || proker.uuid_fakultas_unit || "").trim().toLowerCase();
      const prokerFuName = String(proker.NamaFakultasUnit || proker.nama_fakultas_unit || "").trim().toLowerCase();

      // 1. Cek dari user.extra_role (ABAC)
      if (Array.isArray(user?.extra_role) && user.extra_role.length > 0) {
        const match = user.extra_role.some((r) => {
          const rRole = String(r.role ?? r.Role ?? "").toLowerCase().trim();
          if (rRole && rRole !== "user" && rRole !== "auditee") return false;

          const rFuId = String(r.id_fakultas_unit ?? r.IdFakultasUnit ?? "").trim();
          if (rFuId && prokerFuId && rFuId === prokerFuId) return true;

          const rFuUuid = String(r.uuid_fakultas_unit ?? r.UuidFakultasUnit ?? "").trim().toLowerCase();
          if (rFuUuid && prokerFuUuid && rFuUuid === prokerFuUuid) return true;

          const rFuName = String(r.nama_fakultas_unit ?? r.NamaFakultasUnit ?? "").trim().toLowerCase();
          if (rFuName && prokerFuName && (rFuName === prokerFuName || prokerFuName.includes(rFuName) || rFuName.includes(prokerFuName))) return true;

          return false;
        });
        if (match) return true;
      }

      // 2. Cek dari field user langsung
      const directFu = String(user?.fakultas_unit || user?.id_fakultas_unit || user?.FakultasUnit || "").trim();
      if (directFu) {
        if (prokerFuId && directFu === prokerFuId) return true;
        if (prokerFuUuid && directFu.toLowerCase() === prokerFuUuid) return true;
        if (prokerFuName && directFu.toLowerCase() === prokerFuName) return true;
      }

      const directFuUuid = String(user?.uuid_fakultas_unit || user?.UuidFakultasUnit || "").trim().toLowerCase();
      if (directFuUuid && prokerFuUuid && directFuUuid === prokerFuUuid) return true;

      const directFuName = String(user?.nama_fakultas_unit || user?.NamaFakultasUnit || "").trim().toLowerCase();
      if (directFuName && prokerFuName && (directFuName === prokerFuName || prokerFuName.includes(directFuName) || directFuName.includes(prokerFuName))) return true;

      if (prokerFuId || prokerFuUuid || prokerFuName) {
        return false;
      }
    }

    return true;
  }, [isAdmin, hasFakultasUnit, isVerifierRole, proker, user]);

  // Determine currently active activity
  const currentAktivitas = useMemo(() => {
    if (location.state?.aktivitas) return location.state.aktivitas;
    if (selectedActUuid) {
      const found = activities.find((a) => a.UUID === selectedActUuid);
      if (found) return found;
    }
    return activities[0] || null;
  }, [activities, selectedActUuid, location.state]);

  // Form rows for multi-data submission: Array of { id, jenisDokumen, file, keterangan }
  const [formRows, setFormRows] = useState([
    {
      id: "form-row-1",
      jenisDokumen: "SK",
      file: null,
      keterangan: "",
    },
  ]);

  // Upload Progress & Queue Control State: Array of {
  //   id,
  //   file,
  //   fileName,
  //   fileSize,
  //   jenisDokumen,
  //   keterangan,
  //   status: "waiting" | "progress" | "pause" | "canceled" | "success" | "error",
  //   progress: number (0-100),
  //   error: string | null,
  //   xhr: XMLHttpRequest | null,
  // }
  const [uploadQueue, setUploadQueue] = useState([]);

  // Confirm delete dialog state
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Verification states & handlers
  const [updatingVerifikasi, setUpdatingVerifikasi] = useState(false);
  const [tolakModalOpen, setTolakModalOpen] = useState(false);
  const [docToTolak, setDocToTolak] = useState(null);
  const [catatanTolak, setCatatanTolak] = useState("");

  const handleVerifikasiDoc = async (doc) => {
    if (!isAdmin) {
      addToast("warning", "Hanya level admin yang dapat memverifikasi dokumen");
      return;
    }
    if (!doc?.UUID) return;
    setUpdatingVerifikasi(true);
    try {
      const fd = new FormData();
      fd.append("status_verifikasi", "terverifikasi");
      fd.append("catatan", "");
      const res = await apiClient.put(`/proker_v3/dokumen/${doc.UUID}/verifikasi`, fd);
      const json = res.data;
      addToast("success", `Dokumen "${doc.NamaFile}" berhasil diverifikasi`);
      fetchData();
    } catch (err) {
      addToast("error", err?.message || "Layanan tidak dapat dihubungi");
    } finally {
      setUpdatingVerifikasi(false);
    }
  };

  const openTolakModal = (doc) => {
    if (!isAdmin) {
      addToast("warning", "Hanya level admin yang dapat menolak dokumen");
      return;
    }
    setDocToTolak(doc);
    setCatatanTolak(doc.CatatanPenolakan || "");
    setTolakModalOpen(true);
  };

  const handleConfirmTolak = async (e) => {
    if (e) e.preventDefault();
    if (!isAdmin) {
      addToast("warning", "Hanya level admin yang dapat menolak dokumen");
      return;
    }
    if (!docToTolak?.UUID) return;
    setUpdatingVerifikasi(true);
    try {
      const fd = new FormData();
      fd.append("status_verifikasi", "ditolak");
      fd.append("catatan_penolakan", catatanTolak.trim());
      fd.append("catatan", catatanTolak.trim());
      await apiClient.put(`/proker_v3/dokumen/${docToTolak.UUID}/verifikasi`, fd);
      addToast("warning", `Dokumen "${docToTolak.NamaFile}" ditolak`);
      setTolakModalOpen(false);
      setDocToTolak(null);
      setCatatanTolak("");
      fetchData();
    } catch (err) {
      addToast("error", err?.message || "Layanan tidak dapat dihubungi");
    } finally {
      setUpdatingVerifikasi(false);
    }
  };

  // Fetch Proker detail and documents from backend
  const fetchData = async () => {
    if (!prokerUuid) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/proker_v3/${prokerUuid}/dokumen`);
      const json = res.data;
      setProker(json.proker || null);
      setDocuments(json.data || []);
      const actList = json.activities || [];
      setActivities(actList);

      if (location.state?.aktivitas?.UUID) {
        setSelectedActUuid(location.state.aktivitas.UUID);
      } else if (actParamUuid) {
        setSelectedActUuid(actParamUuid);
      } else if (actList.length > 0 && !selectedActUuid) {
        setSelectedActUuid(actList[0].UUID);
      }
    } catch (err) {
      addToast("error", err?.message || "Layanan tidak dapat dihubungi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [prokerUuid]);

  // ========================================================
  // FORM ROWS MANAGEMENT (MULTIPLE DATA FORM)
  // ========================================================
  const addFormRow = (defaultJenis = "DOCUMENT PENDUKUNG") => {
    if (!canUploadDokumen) return;
    setFormRows((prev) => [
      ...prev,
      {
        id: `form-row-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        jenisDokumen: defaultJenis,
        file: null,
        keterangan: "",
      },
    ]);
  };

  const removeFormRow = (rowId) => {
    if (!canUploadDokumen) return;
    if (formRows.length <= 1) {
      setFormRows([
        {
          id: `form-row-${Date.now()}`,
          jenisDokumen: "SK",
          file: null,
          keterangan: "",
        },
      ]);
      return;
    }
    setFormRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const updateFormRow = (rowId, updates) => {
    if (!canUploadDokumen) return;
    setFormRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, ...updates } : r))
    );
  };

  // Shortcut to load all 4 mandatory document rows (SK, SOP, PROPOSAL/TOR, LAPORAN)
  const loadMandatoryTemplates = () => {
    if (!canUploadDokumen) return;
    setFormRows([
      { id: `form-sk-${Date.now()}`, jenisDokumen: "SK", file: null, keterangan: "" },
      { id: `form-sop-${Date.now() + 1}`, jenisDokumen: "SOP", file: null, keterangan: "" },
      { id: `form-tor-${Date.now() + 2}`, jenisDokumen: "PROPOSAL/TOR", file: null, keterangan: "" },
      { id: `form-lap-${Date.now() + 3}`, jenisDokumen: "LAPORAN", file: null, keterangan: "" },
    ]);
  };

  // ========================================================
  // REAL-TIME CHUNKED BINARY UPLOAD ENGINE & CONTROLS
  // (Slice per binary chunk 512KB, pause/resume, cancel, byte tracking & speed)
  // ========================================================
  const CHUNK_SIZE = 512 * 1024; // 512 KB per slice
  const uploadControlsRef = useRef({});

  const uploadChunkLoop = async (queueItem, startChunkIndex = 0) => {
    if (!prokerUuid || !queueItem.file) return;

    const token = getValidToken();
    const file = queueItem.file;
    const totalBytes = file.size;
    const totalChunks = Math.ceil(totalBytes / CHUNK_SIZE) || 1;
    const uploadId = queueItem.uploadId;

    // Inisialisasi kontrol upload untuk item ini
    uploadControlsRef.current[queueItem.id] = {
      isPaused: false,
      isCancelled: false,
      xhr: null,
    };

    setUploadQueue((prev) =>
      prev.map((q) =>
        q.id === queueItem.id
          ? {
              ...q,
              status: "progress",
              error: null,
              speed: "Memulai...",
            }
          : q
      )
    );

    let lastTime = performance.now();
    let lastLoaded = startChunkIndex * CHUNK_SIZE;

    for (let chunkIndex = startChunkIndex; chunkIndex < totalChunks; chunkIndex++) {
      const controls = uploadControlsRef.current[queueItem.id];
      if (!controls || controls.isPaused || controls.isCancelled) {
        return; // Loop berhenti karena dijeda atau dibatalkan
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
      formData.append("jenis_dokumen", queueItem.jenisDokumen);
      formData.append("catatan", queueItem.catatan || queueItem.keterangan || "");
      formData.append("keterangan", queueItem.keterangan || queueItem.catatan || "");
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

              setUploadQueue((prev) =>
                prev.map((q) =>
                  q.id === queueItem.id
                    ? {
                        ...q,
                        progress: percent,
                        loadedBytes: currentLoaded,
                        currentChunk: chunkIndex,
                        speed: currentSpeed || q.speed,
                        eta: currentEta || q.eta,
                      }
                    : q
                )
              );
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
                if (xhr.status === 413) errMsg = "Ukuran melebihi batas (413)";
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

          xhr.open("POST", `${API_BASE_URL}/proker_v3/${prokerUuid}/dokumen/chunk`);
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.send(formData);
        });

        if (chunkResult?.aborted) {
          return;
        }

        // Jika chunk terakhir telah diverifikasi oleh backend
        if (chunkIndex === totalChunks - 1 || chunkResult?.completed) {
          setUploadQueue((prev) =>
            prev.map((q) =>
              q.id === queueItem.id
                ? {
                    ...q,
                    status: "success",
                    progress: 100,
                    loadedBytes: totalBytes,
                    currentChunk: totalChunks,
                    speed: "Selesai",
                    eta: "",
                  }
                : q
            )
          );
          fetchData();
          addToast("success", `Dokumen "${queueItem.fileName}" berhasil diunggah dan disimpan.`);

          // Hapus otomatis dari panel unggah berkas setelah mencapai 100%
          setTimeout(() => {
            setUploadQueue((prev) => prev.filter((q) => q.id !== queueItem.id));
            if (uploadControlsRef.current) {
              delete uploadControlsRef.current[queueItem.id];
            }
          }, 800);

          return;
        }

        // Perbarui progress chunk
        setUploadQueue((prev) =>
          prev.map((q) =>
            q.id === queueItem.id
              ? {
                  ...q,
                  currentChunk: chunkIndex + 1,
                  loadedBytes: chunkEnd,
                  progress: Math.min(99, Math.round((chunkEnd / totalBytes) * 100)),
                }
              : q
          )
        );
      } catch (err) {
        if (controls.isPaused || controls.isCancelled) return;

        setUploadQueue((prev) =>
          prev.map((q) =>
            q.id === queueItem.id
              ? {
                  ...q,
                  status: "error",
                  error: err?.message || "Gagal mengunggah",
                  speed: "Gagal",
                  eta: "",
                  currentChunk: chunkIndex,
                }
              : q
          )
        );
        addToast("error", `Gagal mengunggah "${queueItem.fileName}": ${err?.message}`);
        return;
      }
    }
  };

  // Pause a running upload
  const pauseUpload = (item) => {
    const controls = uploadControlsRef.current[item.id];
    if (controls) {
      controls.isPaused = true;
      if (controls.xhr && typeof controls.xhr.abort === "function") {
        try {
          controls.xhr.abort();
        } catch {}
      }
    }
    setUploadQueue((prev) =>
      prev.map((q) =>
        q.id === item.id ? { ...q, status: "pause", speed: "Dijeda" } : q
      )
    );
  };

  // Cancel an upload
  const cancelUpload = async (item) => {
    const controls = uploadControlsRef.current[item.id];
    if (controls) {
      controls.isCancelled = true;
      if (controls.xhr && typeof controls.xhr.abort === "function") {
        try {
          controls.xhr.abort();
        } catch {}
      }
    }
    setUploadQueue((prev) =>
      prev.map((q) =>
        q.id === item.id ? { ...q, status: "canceled", speed: "Dibatalkan" } : q
      )
    );

    // Bersihkan file part temporary di backend
    if (item.uploadId && prokerUuid) {
      try {
        await apiClient.delete(
          `/proker_v3/${prokerUuid}/dokumen/chunk/${item.uploadId}`
        );
      } catch {}
    }
  };

  // Resume an upload from current chunk
  const resumeUpload = (item) => {
    const controls = uploadControlsRef.current[item.id];
    if (controls) {
      controls.isPaused = false;
      controls.isCancelled = false;
    }
    uploadChunkLoop(item, item.currentChunk || 0);
  };

  // Remove from queue
  const removeQueueItem = (itemId) => {
    const controls = uploadControlsRef.current[itemId];
    if (controls) {
      controls.isCancelled = true;
      if (controls.xhr && typeof controls.xhr.abort === "function") {
        try {
          controls.xhr.abort();
        } catch {}
      }
      delete uploadControlsRef.current[itemId];
    }
    setUploadQueue((prev) => prev.filter((q) => q.id !== itemId));
  };

  // Submit all valid rows from form to the upload queue and start chunked upload
  const handleSubmitAllForms = (e) => {
    if (e) e.preventDefault();
    if (!canUploadDokumen) {
      addToast("warning", "Pengunggahan dokumen program kerja hanya dapat dilakukan oleh user yang memiliki fakultas_unit");
      return;
    }

    const filledRows = formRows.filter((r) => Boolean(r.file));
    if (filledRows.length === 0) {
      addToast("warning", "Silakan pilih berkas file pada minimal satu baris form.");
      return;
    }

    const newQueueItems = filledRows.map((r) => {
      const uploadId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
              const rand = (Math.random() * 16) | 0;
              return (c === "x" ? rand : (rand & 0x3) | 0x8).toString(16);
            });

      const totalChunks = Math.ceil(r.file.size / CHUNK_SIZE) || 1;

      return {
        id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
        uploadId, // Document UUID di database matrix_proker_dokumen
        file: r.file,
        fileName: r.file.name,
        fileSize: r.file.size,
        jenisDokumen: r.jenisDokumen,
        catatan: r.keterangan?.trim() || "",
        keterangan: r.keterangan?.trim() || "",
        status: "waiting",
        progress: 0,
        loadedBytes: 0,
        totalBytes: r.file.size,
        currentChunk: 0,
        totalChunks,
        speed: "Menunggu",
        eta: "",
        error: null,
      };
    });

    setUploadQueue((prev) => [...prev, ...newQueueItems]);

    // Reset form rows
    setFormRows([
      {
        id: `form-row-${Date.now()}`,
        jenisDokumen: "DOCUMENT PENDUKUNG",
        file: null,
        keterangan: "",
      },
    ]);

    addToast("info", `${newQueueItems.length} berkas telah dimasukkan ke antrean unggah.`);

    // Mulai unggah chunk untuk setiap file secara berurutan/paralel
    newQueueItems.forEach((item) => {
      uploadChunkLoop(item, 0);
    });
  };

  // Global control actions
  const resumeAll = () => {
    const pausedOrWaiting = uploadQueue.filter(
      (q) => q.status === "pause" || q.status === "waiting" || q.status === "canceled" || q.status === "error"
    );
    pausedOrWaiting.forEach((item) => {
      resumeUpload(item);
    });
  };

  const pauseAll = () => {
    const progressing = uploadQueue.filter((q) => q.status === "progress");
    progressing.forEach((item) => {
      pauseUpload(item);
    });
  };

  const cancelAll = () => {
    const pending = uploadQueue.filter((q) => q.status !== "success");
    pending.forEach((item) => {
      cancelUpload(item);
    });
  };

  const clearFinishedQueue = () => {
    setUploadQueue((prev) => prev.filter((q) => q.status !== "success"));
  };

  // Computed state flags for global control buttons
  const hasActiveProgress = useMemo(() => {
    return uploadQueue.some((q) => q.status === "progress" || q.status === "waiting");
  }, [uploadQueue]);

  const hasIncomplete = useMemo(() => {
    return uploadQueue.some(
      (q) => q.status === "pause" || q.status === "canceled" || q.status === "error" || q.status === "waiting"
    );
  }, [uploadQueue]);

  const hasSuccess = useMemo(() => {
    return uploadQueue.some((q) => q.status === "success");
  }, [uploadQueue]);

  // ========================================================
  // DELETE DOCUMENT FROM GOLANG & DISK
  // ========================================================
  const handleDeleteDoc = async () => {
    if (!canUploadDokumen) {
      addToast("warning", "Hapus dokumen program kerja hanya dapat dilakukan oleh user yang memiliki fakultas_unit");
      setDeleteDialog(false);
      return;
    }
    if (!docToDelete?.UUID) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/proker_v3/dokumen/${docToDelete.UUID}`);
      addToast("success", "Dokumen berhasil dihapus dari sistem.");
      setDocuments((prev) => prev.filter((d) => d.UUID !== docToDelete.UUID));
    } catch (err) {
      addToast("error", err?.message || "Layanan tidak dapat dihubungi");
    } finally {
      setDeleting(false);
      setDeleteDialog(false);
      setDocToDelete(null);
    }
  };

  // Statistics & Checklist
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

  const filteredDocuments = useMemo(() => {
    if (activeTab === "all") return documents;
    return documents.filter((d) => d.JenisDokumen === activeTab);
  }, [documents, activeTab]);

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
                localStorage.setItem("activeLevel", val);
                setOpenChangeLevel(false);
              }
            }}
          />
        )}
      />

      <div className="p-4 sm:p-6 bg-gray-50 min-h-screen space-y-6">
        {/* Page Header */}
        <PageHeader
          icon={FileText}
          title="Dokumen Program Kerja"
          subtitle="Manajemen dan Unggah Berkas Matriks Program Kerja (SK, SOP, Proposal/TOR, Laporan, Dokumen Pendukung)"
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(`/proker_v3/${prokerUuid}/aktivitas`)}
                className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs flex items-center gap-1.5 border border-purple-200 transition cursor-pointer shadow-2xs"
                title="Pindah ke halaman kelola aktivitas program kerja"
              >
                <Layers className="w-3.5 h-3.5 text-purple-600" />
                <span>Kelola Aktivitas</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/proker_v3")}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-gray-100 text-gray-700 font-bold text-xs flex items-center gap-1.5 border border-gray-200 shadow-2xs transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-gray-600" />
                <span>Daftar Proker</span>
              </button>
            </div>
          }
        />

        {/* Proker Identity & 5 Metadata Highlights (Standar, Indikator, Target, Luaran Output, Outcome) */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs font-bold">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold tracking-wider text-indigo-600 uppercase">
                  Program Kerja Terpilih
                </span>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-snug">
                  {proker?.NamaProgram || (loading ? "Memuat data program..." : "-")}
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
            </div>
          </div>

          {/* 3 Highlights Grid: Standar Renstra, Indikator Kinerja, Aktivitas Yang Sedang Diakses */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
            {/* 1. Standar & Sub Standar */}
            <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-100 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-800">
                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                  <span>Standar Renstra</span>
                </div>
                <p className="font-semibold text-gray-900 mt-1.5 line-clamp-3" title={proker?.StandarSubStandar}>
                  {proker?.StandarSubStandar || "-"}
                </p>
              </div>
              <span className="text-[10px] text-purple-700/80 font-medium">Standar / Sub Standar</span>
            </div>

            {/* 2. Indikator Kinerja */}
            <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-800">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Indikator Kinerja</span>
                </div>
                <p className="font-semibold text-gray-900 mt-1.5 line-clamp-3" title={proker?.IndikatorKinerja}>
                  {proker?.IndikatorKinerja || "-"}
                </p>
              </div>
              <span className="text-[10px] text-blue-700/80 font-medium">Indikator Renstra</span>
            </div>

            {/* 3. Aktivitas Yang Sedang Diakses */}
            <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Aktivitas Yang Sedang Diakses</span>
                  </div>
                  {currentAktivitas?.Status && (
                    <span className="text-[9px] uppercase px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {currentAktivitas.Status}
                    </span>
                  )}
                </div>

                {activities.length > 1 ? (
                  <div className="mt-1.5">
                    <select
                      value={currentAktivitas?.UUID || ""}
                      onChange={(e) => {
                        const chosen = activities.find((a) => a.UUID === e.target.value);
                        if (chosen) setSelectedActUuid(chosen.UUID);
                      }}
                      className="w-full text-xs font-semibold text-gray-900 bg-white border border-emerald-200 rounded-lg p-1.5 outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                    >
                      {activities.map((act, idx) => (
                        <option key={act.UUID} value={act.UUID}>
                          {idx + 1}. {act.Aktivitas}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="font-semibold text-gray-900 mt-1.5 line-clamp-2" title={currentAktivitas?.Aktivitas}>
                    {currentAktivitas?.Aktivitas || "Belum ada aktivitas terdaftar"}
                  </p>
                )}

                {currentAktivitas && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-600">
                    <span>
                      PIC: <b className="text-gray-900 font-bold">{currentAktivitas.PIC || "-"}</b>
                    </span>
                    {currentAktivitas.Anggaran !== undefined && currentAktivitas.Anggaran !== null && (
                      <span className="inline-flex items-center gap-1">
                        <span>Anggaran:</span>{" "}
                        {isEvaluator ? (
                          <b className="text-emerald-700 font-bold font-mono">***</b>
                        ) : isAnggaranRevised(currentAktivitas) ? (
                          <span className="inline-flex items-center gap-1 font-mono">
                            <span
                              className="line-through text-gray-400 font-normal decoration-rose-500 decoration-1"
                              title="Anggaran Awal"
                            >
                              {formatRupiah(currentAktivitas.Anggaran)}
                            </span>
                            <b
                              className="text-emerald-700 font-bold"
                              title="Realisasi Anggaran Baru"
                            >
                              {formatRupiah(getRealisasiAnggaran(currentAktivitas))}
                            </b>
                          </span>
                        ) : (
                          <b className="text-emerald-700 font-bold font-mono">
                            {formatRupiah(hasRealisasiAnggaran(currentAktivitas) ? getRealisasiAnggaran(currentAktivitas) : currentAktivitas.Anggaran)}
                          </b>
                        )}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-emerald-100/70 text-[10px]">
                <span className="text-emerald-700/80 font-medium">Kegiatan Proker Terpilih</span>
                {currentAktivitas?.UUID && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/proker_v3/${prokerUuid}/aktivitas/${currentAktivitas.UUID}/timeline`, {
                        state: { aktivitas: currentAktivitas },
                      })
                    }
                    className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-900 transition hover:underline cursor-pointer"
                  >
                    <span>Timeline & Bukti Aktivitas</span>
                    <span>→</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>


        {/* ======================================================== */}
        {/* FORM INPUT DOKUMEN (MULTIPLE DATA FORM)                  */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Form Unggah Dokumen (Bisa Multiple Form Data)
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadMandatoryTemplates}
                disabled={!canUploadDokumen}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                  !canUploadDokumen
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200 cursor-pointer"
                }`}
                title="Otomatis siapkan 4 baris form untuk SK, SOP, Proposal/TOR, dan Laporan"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>+ Siapkan 4 Dokumen Wajib</span>
              </button>

              <button
                type="button"
                onClick={() => addFormRow()}
                disabled={!canUploadDokumen}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  !canUploadDokumen
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Baris Form</span>
              </button>
            </div>
          </div>

          {!canUploadDokumen && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                Form unggah dokumen dinonaktifkan. Pengunggahan dokumen program kerja hanya dapat dilakukan oleh <b>user yang memiliki fakultas_unit</b>.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmitAllForms} className="space-y-3">
            <div className="space-y-3">
              {formRows.map((row, index) => (
                <div
                  key={row.id}
                  className={`p-3.5 rounded-xl border grid grid-cols-1 md:grid-cols-12 gap-3 items-center ${
                    !canUploadDokumen
                      ? "bg-gray-100/60 border-gray-200 opacity-80"
                      : "bg-gray-50/70 border-gray-200/90"
                  }`}
                >
                  <div className="md:col-span-1 flex items-center gap-1 text-xs font-mono font-bold text-gray-500">
                    <span className="w-6 h-6 rounded-lg bg-gray-200 flex items-center justify-center text-gray-700 text-[11px]">
                      {index + 1}
                    </span>
                  </div>

                  {/* Dropdown Jenis Dokumen */}
                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Jenis Dokumen <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={row.jenisDokumen}
                      disabled={!canUploadDokumen}
                      onChange={(e) => updateFormRow(row.id, { jenisDokumen: e.target.value })}
                      className={`w-full px-3 py-2 text-xs rounded-xl border font-semibold ${
                        !canUploadDokumen
                          ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                          : "bg-white text-gray-800 border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      }`}
                    >
                      {JENIS_DOKUMEN_PROKER.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.text}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* File Input */}
                  <div className="md:col-span-4">
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Pilih Berkas Dokumen <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="file"
                      disabled={!canUploadDokumen}
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        updateFormRow(row.id, { file });
                      }}
                      className={`w-full text-xs border rounded-xl ${
                        !canUploadDokumen
                          ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed file:cursor-not-allowed file:bg-gray-200 file:text-gray-400"
                          : "bg-white text-gray-500 border-gray-300 cursor-pointer file:cursor-pointer file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      } file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold`}
                    />
                    {row.file && (
                      <span className="text-[10px] text-gray-400 mt-0.5 block truncate">
                        Ukuran: {formatBytes(row.file.size)} • {row.file.type || "file"}
                      </span>
                    )}
                  </div>

                  {/* Keterangan */}
                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Catatan / Keterangan (Opsional)
                    </label>
                    <input
                      type="text"
                      disabled={!canUploadDokumen}
                      placeholder="Contoh: SK Rektor penetapan..."
                      value={row.keterangan}
                      onChange={(e) => updateFormRow(row.id, { keterangan: e.target.value })}
                      className={`w-full px-3 py-2 text-xs rounded-xl border ${
                        !canUploadDokumen
                          ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                          : "bg-white text-gray-800 border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      }`}
                    />
                  </div>

                  {/* Remove row button */}
                  <div className="md:col-span-1 flex justify-end">
                    <button
                      type="button"
                      disabled={!canUploadDokumen}
                      onClick={() => removeFormRow(row.id)}
                      className={`p-2 rounded-xl transition ${
                        !canUploadDokumen
                          ? "text-gray-300 cursor-not-allowed"
                          : "text-gray-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      }`}
                      title={!canUploadDokumen ? "Hanya user yang memiliki fakultas_unit yang dapat menghapus baris" : "Hapus baris ini"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Form Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-xs text-gray-500">
                {formRows.filter((r) => Boolean(r.file)).length} dari {formRows.length} baris form telah memilih berkas.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!canUploadDokumen}
                  onClick={() => addFormRow()}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                    !canUploadDokumen
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
                  }`}
                >
                  + Tambah Baris Form
                </button>

                <button
                  type="submit"
                  disabled={!canUploadDokumen}
                  className={`px-5 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
                    !canUploadDokumen
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs cursor-pointer"
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>Submit & Unggah Dokumen</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* ======================================================== */}
        {/* PANEL KONTROL PROGRES UNGGAH (WAITING, PROGRESS, PAUSE, CANCEL) */}
        {/* ======================================================== */}
        {uploadQueue.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Panel Kontrol Status Unggah Berkas ({uploadQueue.length})
                </h3>
              </div>

              {/* Global Controls */}
              <div className="flex items-center gap-2">
                {/* 1. KETIKA SEDANG PROGRESS / WAITING: TAMPILKAN JEDA SEMUA & BATAL SEMUA (MULAI SEMUA HILANG) */}
                {hasActiveProgress && (
                  <>
                    <button
                      type="button"
                      onClick={pauseAll}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-2xs transition cursor-pointer"
                      title="Jeda / Pause semua proses unggah"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>Jeda Semua</span>
                    </button>

                    <button
                      type="button"
                      onClick={cancelAll}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer"
                      title="Batalkan semua proses unggah"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Batal Semua</span>
                    </button>
                  </>
                )}

                {/* 2. KETIKA TIDAK ADA PROGRESS AKTIF, TAPI ADA JEDA/BATAL/GAGAL/MENUNGGU: TAMPILKAN LANJUTKAN SEMUA & BATAL SEMUA (JEDA SEMUA HILANG) */}
                {!hasActiveProgress && hasIncomplete && (
                  <>
                    <button
                      type="button"
                      onClick={resumeAll}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-2xs transition cursor-pointer"
                      title="Lanjutkan / Mulai ulang semua berkas"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Lanjutkan Semua</span>
                    </button>

                    <button
                      type="button"
                      onClick={cancelAll}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer"
                      title="Batalkan semua berkas yang tersisa"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Batal Semua</span>
                    </button>
                  </>
                )}

                {/* 3. TOMBOL BERSIHKAN BERKAS SELESAI */}
                {hasSuccess && (
                  <button
                    type="button"
                    onClick={clearFinishedQueue}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
                    title="Hapus berkas yang telah selesai dari daftar panel"
                  >
                    <span>Bersihkan Selesai</span>
                  </button>
                )}
              </div>
            </div>

            {/* Queue Items List */}
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {uploadQueue.map((item) => {
                const isProgress = item.status === "progress";
                const isPause = item.status === "pause";
                const isSuccess = item.status === "success";
                const isError = item.status === "error";
                const isCanceled = item.status === "canceled";
                const isWaiting = item.status === "waiting";

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition-all text-xs shadow-2xs space-y-2.5 ${
                      isProgress
                        ? "bg-indigo-50/40 border-indigo-200"
                        : isPause
                        ? "bg-amber-50/40 border-amber-200"
                        : isSuccess
                        ? "bg-emerald-50/40 border-emerald-200"
                        : isError
                        ? "bg-rose-50/40 border-rose-200"
                        : isCanceled
                        ? "bg-gray-50 border-gray-200 opacity-75"
                        : "bg-gray-50/70 border-gray-200"
                    }`}
                  >
                    {/* Header item */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 truncate min-w-0">
                        <FileText
                          className={`w-4 h-4 shrink-0 ${
                            isProgress
                              ? "text-indigo-600 animate-pulse"
                              : isSuccess
                              ? "text-emerald-600"
                              : isError
                              ? "text-rose-600"
                              : isPause
                              ? "text-amber-600"
                              : "text-gray-500"
                          }`}
                        />
                        <span className="font-bold text-gray-900 truncate">
                          {item.fileName}
                        </span>
                        <span className="text-[11px] text-gray-500 shrink-0">
                          ({formatBytes(item.fileSize)})
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-700 shrink-0">
                          {item.jenisDokumen}
                        </span>
                      </div>

                      {/* Status Badge & Control Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* WAITING */}
                        {isWaiting && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                            Menunggu
                          </span>
                        )}

                        {/* PROGRESS */}
                        {isProgress && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1.5 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                            Mengunggah ({item.progress || 0}%)
                          </span>
                        )}

                        {/* PAUSE */}
                        {isPause && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Dijeda
                          </span>
                        )}

                        {/* CANCELED */}
                        {isCanceled && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-700 border border-gray-300">
                            Dibatalkan
                          </span>
                        )}

                        {/* SUCCESS */}
                        {isSuccess && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Selesai Tersimpan
                          </span>
                        )}

                        {/* ERROR */}
                        {isError && (
                          <span
                            className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200"
                            title={item.error || "Gagal mengunggah"}
                          >
                            Gagal
                          </span>
                        )}

                        {/* Individual Control Buttons */}
                        {isProgress && (
                          <button
                            type="button"
                            onClick={() => pauseUpload(item)}
                            className="p-1.5 rounded-lg text-amber-700 bg-amber-100/70 hover:bg-amber-200 transition cursor-pointer"
                            title="Jeda Unggahan"
                          >
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {(isPause || isWaiting) && (
                          <button
                            type="button"
                            onClick={() => resumeUpload(item)}
                            className="p-1.5 rounded-lg text-indigo-700 bg-indigo-100/70 hover:bg-indigo-200 transition cursor-pointer"
                            title="Lanjutkan Unggah"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {(isError || isCanceled) && (
                          <button
                            type="button"
                            onClick={() => resumeUpload(item)}
                            className="p-1.5 rounded-lg text-indigo-700 bg-indigo-100/70 hover:bg-indigo-200 transition cursor-pointer"
                            title="Coba Lagi / Mulai Ulang"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {(isProgress || isPause || isWaiting) && (
                          <button
                            type="button"
                            onClick={() => cancelUpload(item)}
                            className="p-1.5 rounded-lg text-rose-700 bg-rose-100/70 hover:bg-rose-200 transition cursor-pointer"
                            title="Batalkan Unggahan"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => removeQueueItem(item.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-gray-200/60 transition cursor-pointer"
                          title="Hapus Dari Panel"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar (Visualisasi Progress) */}
                    <div className="w-full bg-gray-200/90 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-200 ${
                          isSuccess
                            ? "bg-emerald-500"
                            : isError
                            ? "bg-rose-500"
                            : isPause
                            ? "bg-amber-500"
                            : isCanceled
                            ? "bg-gray-400"
                            : "bg-indigo-600"
                        }`}
                        style={{ width: `${Math.max(2, item.progress || 0)}%` }}
                      />
                    </div>

                    {/* Detail Statistik: Byte Transfer, Speed Upload, & Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-600 font-mono">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-semibold text-gray-800">
                          {formatBytes(item.loadedBytes || 0)} / {formatBytes(item.totalBytes || item.fileSize)} ({item.progress || 0}%)
                        </span>
                        {/* {item.totalChunks > 1 && (
                          <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-bold shrink-0">
                            Bagian {Math.min(item.totalChunks, (item.currentChunk || 0) + 1)} / {item.totalChunks}
                          </span>
                        )} */}
                        {item.keterangan && (
                          <span className="text-gray-400 font-sans italic truncate max-w-xs">
                            — {item.keterangan}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {isProgress && item.speed && (
                          <span className="text-indigo-700 font-bold flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                            <span>{item.speed}</span>
                          </span>
                        )}
                        {isProgress && item.eta && (
                          <span className="text-gray-500">
                            Sisa: {item.eta}
                          </span>
                        )}
                        {isPause && (
                          <span className="text-amber-700 font-semibold">
                            ⏸ Dijeda
                          </span>
                        )}
                        {isError && (
                          <span className="text-rose-600 font-semibold truncate max-w-sm" title={item.error}>
                            ⚠ {item.error || "Gagal mengunggah"}
                          </span>
                        )}
                        {isSuccess && (
                          <span className="text-emerald-700 font-semibold">
                            ✓ 100% Selesai
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TABEL DOKUMEN TERSIMPAN DI DATABASE (matrix_proker_dokumen) */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Daftar Dokumen Tersimpan ({documents.length})
              </h3>
            </div>

            {/* Filter Tabs by Jenis Dokumen */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  activeTab === "all"
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
                    className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      activeTab === j.id
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <span>{j.id}</span>
                    <span className="text-[10px] opacity-75 font-mono">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table / List */}
          {loading ? (
            <div className="py-12 text-center text-xs text-gray-500">
              Memuat berkas dokumen tersimpan...
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
              <p className="font-semibold text-gray-600">Belum ada dokumen yang tersimpan</p>
              <p className="text-[11px]">Silakan gunakan form di atas untuk mengunggah dokumen SK, SOP, Proposal, atau Laporan.</p>
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
                    className="p-4 hover:bg-gray-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-md font-bold text-[11px] border ${badgeInfo.badgeClass}`}
                        >
                          {doc.JenisDokumen}
                        </span>
                        <span className="font-bold text-gray-900 truncate text-sm" title={doc.NamaFile}>
                          {doc.NamaFile}
                        </span>

                        {/* Status Verifikasi Badge */}
                        {doc.StatusVerifikasi === "terverifikasi" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Terverifikasi</span>
                          </span>
                        ) : doc.StatusVerifikasi === "ditolak" || doc.StatusVerifikasi === "gagal_terverifikasi" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>Ditolak</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Belum Diverifikasi</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-gray-500">
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
                        {(doc.Catatan || doc.Keterangan) && (
                          <span className="italic text-gray-600 truncate max-w-md" title={doc.Catatan || doc.Keterangan}>
                            • Catatan: {doc.Catatan || doc.Keterangan}
                          </span>
                        )}
                        {(doc.StatusVerifikasi === "ditolak" || doc.StatusVerifikasi === "gagal_terverifikasi") && (doc.CatatanPenolakan || doc.Catatan) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 max-w-md truncate" title={doc.CatatanPenolakan || doc.Catatan}>
                            <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                            <span>Alasan Tolak: {doc.CatatanPenolakan || doc.Catatan}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto shrink-0">
                      {/* Tombol Verifikasi & Tolak Khusus Level Admin */}
                      {isAdmin && (
                        <>
                          {/* Tombol Verifikasi */}
                          <button
                            type="button"
                            onClick={() => handleVerifikasiDoc(doc)}
                            disabled={updatingVerifikasi || doc.StatusVerifikasi === "terverifikasi"}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs ${
                              doc.StatusVerifikasi === "terverifikasi"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-300 opacity-90 cursor-default"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200"
                            }`}
                            title={
                              doc.StatusVerifikasi === "terverifikasi"
                                ? "Dokumen ini sudah diverifikasi"
                                : "Verifikasi dokumen ini"
                            }
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{doc.StatusVerifikasi === "terverifikasi" ? "Terverifikasi" : "Verifikasi"}</span>
                          </button>

                          {/* Tombol Tolak */}
                          <button
                            type="button"
                            onClick={() => openTolakModal(doc)}
                            disabled={updatingVerifikasi}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                              doc.StatusVerifikasi === "ditolak" || doc.StatusVerifikasi === "gagal_terverifikasi"
                                ? "bg-rose-100 text-rose-800 border border-rose-300"
                                : "bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs"
                            }`}
                            title="Tolak dokumen ini dengan catatan alasan"
                          >
                            <X className="w-3.5 h-3.5 text-rose-600" />
                            <span>
                              {doc.StatusVerifikasi === "ditolak" || doc.StatusVerifikasi === "gagal_terverifikasi"
                                ? "Ditolak (Ubah)"
                                : "Tolak"}
                            </span>
                          </button>
                        </>
                      )}

                      {fileUrl && (
                        <Tooltip title="Buka / Unduh Berkas Dari Server">
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 border border-gray-200 transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Buka / Unduh</span>
                          </a>
                        </Tooltip>
                      )}

                      {canUploadDokumen && (
                        <Tooltip title="Hapus Dokumen Dari Server (Permanen)">
                          <button
                            type="button"
                            onClick={() => {
                              setDocToDelete(doc);
                              setDeleteDialog(true);
                            }}
                            className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Dialog Tolak Dokumen */}
      {tolakModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-rose-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <X className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Tolak Dokumen Program Kerja
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-1">
                    {docToTolak?.NamaFile}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTolakModalOpen(false);
                  setDocToTolak(null);
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmTolak} className="p-5 space-y-4">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Jenis Dokumen:</span>
                  <span className="font-bold text-gray-800">{docToTolak?.JenisDokumen}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Ukuran Berkas:</span>
                  <span className="font-mono text-gray-700">{formatBytes(docToTolak?.FileSize)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Catatan / Alasan Penolakan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows="3"
                  value={catatanTolak}
                  onChange={(e) => setCatatanTolak(e.target.value)}
                  placeholder="Tuliskan catatan alasan penolakan dokumen (contoh: berkas buram, tanda tangan belum lengkap, format salah)..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setTolakModalOpen(false);
                    setDocToTolak(null);
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={updatingVerifikasi || !catatanTolak.trim()}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-200 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  <span>{updatingVerifikasi ? "Menyimpan..." : "Konfirmasi Tolak"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
