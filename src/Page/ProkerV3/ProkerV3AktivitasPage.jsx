import React, { useState, useEffect, useMemo, Fragment } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Dialog, Transition } from "@headlessui/react";
import { useAuth } from "@/Providers/AuthProvider";
import { useToast } from "@/Providers/ToastProvider";
import { useContent } from "@/Providers/ContentProvider";
import { apiClient } from "@/Common/api";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import PageHeader from "@/Components/PageHeader";
import Tooltip from "@/Components/Tooltip";
import ConfirmDeleteDialog from "@/Components/ConfirmDeleteDialog";
import StateHistoryDrawer from "./StateHistoryDrawer";
import ProkerV3AktivitasEvaluatorRow from "./ProkerV3AktivitasEvaluatorRow";
import {
  BULAN_LIST,
  WEEKS,
  parseSlotArray,
  formatBytes,
  formatRupiah,
  hasRealisasiAnggaran,
  getRealisasiAnggaran,
  isAnggaranRevised,
  getTimelineRkSlots,
  getTimelineRSlots,
} from "./prokerConstants";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Layers,
  FileSpreadsheet,
  Target,
  User,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  Send,
  Check,
  Upload,
  FileText,
  DollarSign,
  Info,
  RefreshCw,
  FolderOpen,
  FileIcon,
  ExternalLink,
  X,
  Eye,
  AlertCircle,
  Save,
  Coins,
  PencilLine,
  Wallet,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function ProkerV3AktivitasPage() {
  const { uuid: prokerUuid } = useParams();
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
    positionYear,
  } = useContent();

  const isAdmin = level === "admin" || user?.level === "admin";
  const curRole = String(
    level || localStorage.getItem("activeLevel") || user?.level || ""
  )
    .toLowerCase()
    .trim();
  const isVerifier = ["upml", "upmf", "upms", "fakultas", "evaluator"].includes(curRole);
  const isAnggaran = ["anggaran", "keuangan"].includes(curRole);
  const isEvaluator = curRole === "evaluator" || curRole.includes("evaluator");
  const canRevisiAnggaran = isAnggaran || isAdmin;

  // Level evaluator dan anggaran untuk tampilan detail tabel khusus
  const isEvaluatorOrAnggaran = useMemo(() => {
    const normRole = curRole.toLowerCase().trim();
    const normLevel = String(level || localStorage.getItem("activeLevel") || "").toLowerCase().trim();
    const userLevel = String(user?.level || "").toLowerCase().trim();
    const userRole = String(user?.role || "").toLowerCase().trim();
    const targets = ["evaluator", "anggaran", "keuangan"];
    return (
      targets.some((t) => normRole.includes(t)) ||
      targets.some((t) => normLevel.includes(t)) ||
      targets.some((t) => userLevel.includes(t)) ||
      targets.some((t) => userRole.includes(t))
    );
  }, [curRole, level, user]);

  // Level verifikator dan role verifikator
  const isVerifikatorRoleOrLevel = useMemo(() => {
    if (isAdmin) return false;
    const normRole = curRole.toLowerCase().trim();
    const normLevel = String(level || localStorage.getItem("activeLevel") || "").toLowerCase().trim();
    const userLevel = String(user?.level || "").toLowerCase().trim();
    const verifierRoles = ["upml", "upmf", "upms", "fakultas", "evaluator", "verifikator"];
    return (
      verifierRoles.includes(normRole) ||
      normRole.includes("verifikator") ||
      verifierRoles.includes(normLevel) ||
      normLevel.includes("verifikator") ||
      userLevel === "verifikator" ||
      userLevel.includes("verifikator") ||
      isVerifier ||
      isEvaluator
    );
  }, [curRole, level, user?.level, isAdmin, isVerifier, isEvaluator]);

  // Tombol tambah aktivitas hanya boleh muncul jika role aktif adalah "user"
  const isLevelUser = curRole === "user";

  // Cek apakah akun ini merupakan akun verifikator UPM (upml, upmf, upms)
  const isUpmUser = useMemo(() => {
    if (["upml", "upmf", "upms"].includes(curRole)) return true;
    if (Array.isArray(user?.extra_role) && user.extra_role.length > 0) {
      return user.extra_role.some((r) =>
        ["upml", "upmf", "upms"].includes(
          String(r.role ?? r.Role ?? "").toLowerCase().trim(),
        ),
      );
    }
    return false;
  }, [curRole, user?.extra_role]);

  // Data state
  const [loading, setLoading] = useState(true);
  const [proker, setProker] = useState(null);
  const [activities, setActivities] = useState([]);

  // Pastikan tahun aktif di navbar (positionYear) cocok dengan tahun proker
  const isYearMatch = useMemo(() => {
    if (!positionYear || !proker?.Tahun) return true;
    return String(positionYear).trim() === String(proker.Tahun).trim();
  }, [positionYear, proker?.Tahun]);

  // Cek apakah proker ini sesuai target unit yang ditugaskan kepada user
  const hasAssignedTarget = useMemo(() => {
    if (!proker) return false;
    // Akun UPM (verifikator) tidak memiliki izin mengelola/edit/hapus aktivitas
    if (isUpmUser) return false;

    // Jika tahun di navbar tidak sama dengan tahun proker, tolak akses kelola
    const prokerYear = String(proker.Tahun || "").trim();
    const activeYearStr = String(positionYear || "").trim();
    if (prokerYear && activeYearStr && prokerYear !== activeYearStr) {
      return false;
    }

    const prokerFuId = proker.IdFakultasUnit ? String(proker.IdFakultasUnit) : "";
    const prokerFuUuid = proker.UuidFakultasUnit ? String(proker.UuidFakultasUnit).toLowerCase() : "";
    const prokerFuName = proker.NamaFakultasUnit ? String(proker.NamaFakultasUnit).trim().toLowerCase() : "";
    const effYear = prokerYear || activeYearStr;

    // 1. Cek dari user.extra_role (penugasan ABAC)
    if (Array.isArray(user?.extra_role) && user.extra_role.length > 0) {
      const match = user.extra_role.some((r) => {
        const rRole = String(r.role ?? r.Role ?? "").toLowerCase().trim();
        // Hanya role "user" / operator yang berhak mengelola aktivitas
        if (rRole && rRole !== "user") {
          return false;
        }

        const rYear = String(r.tahun ?? r.Tahun ?? "").trim();
        if (rYear && effYear && rYear !== effYear) {
          return false;
        }

        const rFuId = r.id_fakultas_unit ?? r.IdFakultasUnit;
        if (rFuId && prokerFuId && String(rFuId) === prokerFuId) return true;

        const rFuUuid = String(r.uuid_fakultas_unit ?? r.UuidFakultasUnit ?? "").toLowerCase();
        if (rFuUuid && prokerFuUuid && rFuUuid === prokerFuUuid) return true;

        const rFuName = String(r.nama_fakultas_unit ?? r.NamaFakultasUnit ?? "").trim().toLowerCase();
        if (rFuName && prokerFuName && (rFuName === prokerFuName || prokerFuName.includes(rFuName) || rFuName.includes(prokerFuName))) return true;

        return false;
      });

      if (match) return true;
    }

    // 2. Cek dari field user langsung (hanya untuk operator biasa, bukan akun UPM)
    if (!isUpmUser) {
      const directFu = String(user?.fakultas_unit || user?.id_fakultas_unit || user?.FakultasUnit || "");
      if (directFu) {
        if (prokerFuId && directFu === prokerFuId) return true;
        if (prokerFuUuid && directFu.toLowerCase() === prokerFuUuid) return true;
        if (prokerFuName && directFu.toLowerCase() === prokerFuName) return true;
      }

      const directFuUuid = String(user?.uuid_fakultas_unit || user?.UuidFakultasUnit || "").toLowerCase();
      if (directFuUuid && prokerFuUuid && directFuUuid === prokerFuUuid) return true;

      const directFuName = String(user?.nama_fakultas_unit || user?.NamaFakultasUnit || "").trim().toLowerCase();
      if (directFuName && prokerFuName && directFuName === prokerFuName) return true;
    }

    return false;
  }, [user, proker, positionYear, isUpmUser]);

  // Tombol tambah/edit/hapus aktivitas HANYA muncul di level user dengan target yang ditugaskan (bukan akun UPM dan tahun aktif harus cocok)
  const canAddAktivitas = isLevelUser && !isUpmUser && isYearMatch && hasAssignedTarget;

  // State History Drawer State
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);

  // Verifier States
  const [isVerifying, setIsVerifying] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [alasanPenolakan, setAlasanPenolakan] = useState("");
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // Batch & Row Selection & Errors
  const [selectedActUuids, setSelectedActUuids] = useState([]);
  const [rowErrors, setRowErrors] = useState({}); // { [actUuid]: "error message" }
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [singleRejectModalOpen, setSingleRejectModalOpen] = useState(false);
  const [actToReject, setActToReject] = useState(null);
  const [rejectRole, setRejectRole] = useState("");
  const [singleRejectReason, setSingleRejectReason] = useState("");
  const [isSubmittingSingleReject, setIsSubmittingSingleReject] =
    useState(false);
  const [batchRejectModalOpen, setBatchRejectModalOpen] = useState(false);
  const [batchRejectReason, setBatchRejectReason] = useState("");
  const [isSubmittingBatchReject, setIsSubmittingBatchReject] = useState(false);
  const [verifyingRowUuid, setVerifyingRowUuid] = useState(null);

  // Form Activity Modal State
  const [actModalOpen, setActModalOpen] = useState(false);
  const [actModalMode, setActModalMode] = useState("create");
  const [selectedAct, setSelectedAct] = useState(null);

  // Form Activity Inputs
  const [actNama, setActNama] = useState("");
  const [actPic, setActPic] = useState("");
  const [actAnggaran, setActAnggaran] = useState(0);
  const [actAnggaranStr, setActAnggaranStr] = useState("0");
  const [actCapaian, setActCapaian] = useState("");
  const [actMasalah, setActMasalah] = useState("");
  const [actPemecahan, setActPemecahan] = useState("");
  const [actStatus, setActStatus] = useState("draft");
  const [showEvaluasi, setShowEvaluasi] = useState(false);
  const [savingAct, setSavingAct] = useState(false);

  // Delete State
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actToDelete, setActToDelete] = useState(null);

  // Revisi Anggaran State (Tim Anggaran / Admin)
  const [revisiModalOpen, setRevisiModalOpen] = useState(false);
  const [actToRevisi, setActToRevisi] = useState(null);
  const [revisiAnggaran, setRevisiAnggaran] = useState(0);
  const [revisiAnggaranStr, setRevisiAnggaranStr] = useState("0");
  const [isSubmittingRevisi, setIsSubmittingRevisi] = useState(false);

  // Revisi Status Proker ke Draft (Tim Anggaran, Verifikator, Admin)
  const [revisiDraftModalOpen, setRevisiDraftModalOpen] = useState(false);
  const [alasanRevisiDraft, setAlasanRevisiDraft] = useState("");
  const [isSubmittingRevisiDraft, setIsSubmittingRevisiDraft] = useState(false);
  const [prokerDocuments, setProkerDocuments] = useState([]);

  // Fetch Data (Proker, Activities & Documents)
  const fetchData = async () => {
    if (!prokerUuid) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/proker_v3/${prokerUuid}/aktivitas`);
      const json = res.data;
      setProker(json.proker || null);
      setActivities(json.data || []);

      // Ambil dokumen proker untuk detail tampilan evaluator/anggaran
      try {
        const docRes = await apiClient.get(`/proker_v3/${prokerUuid}/dokumen`);
        setProkerDocuments(docRes.data?.data || []);
      } catch (docErr) {
        console.warn("Gagal memuat dokumen proker:", docErr);
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

  // Aggregate stats
  const { totalAnggaran, totalRealisasi, hasRealisasi } = useMemo(() => {
    let totAng = 0;
    let totReal = 0;
    let anyReal = false;
    (activities || []).forEach((curr) => {
      const ang = Number(curr.Anggaran) || 0;
      totAng += ang;
      if (hasRealisasiAnggaran(curr)) {
        anyReal = true;
        totReal += getRealisasiAnggaran(curr);
      } else {
        totReal += ang;
      }
    });
    return {
      totalAnggaran: totAng,
      totalRealisasi: totReal,
      hasRealisasi: anyReal,
    };
  }, [activities]);

  // ==========================================
  // ACTIVITY CRUD HANDLERS
  // ==========================================
  const handleAnggaranInputChange = (e) => {
    const rawValue = e.target.value;
    // Ambil hanya digit angka (0-9)
    const digitsOnly = rawValue.replace(/\D/g, "");
    if (!digitsOnly) {
      setActAnggaran(0);
      setActAnggaranStr("");
      return;
    }
    const numericValue = Number(digitsOnly);
    setActAnggaran(numericValue);
    setActAnggaranStr(new Intl.NumberFormat("id-ID").format(numericValue));
  };

  const openCreateActivity = () => {
    if (!canAddAktivitas) {
      addToast(
        "warning",
        "Akses ditolak: Tambah aktivitas hanya untuk level user pada unit yang ditugaskan"
      );
      return;
    }
    setActModalMode("create");
    setSelectedAct(null);
    setActNama("");
    setActPic(user?.nama || proker?.PIC || "");
    setActAnggaran(0);
    setActAnggaranStr("");
    setActCapaian("");
    setActMasalah("");
    setActPemecahan("");
    setActStatus("draft");
    setShowEvaluasi(false);
    setActModalOpen(true);
  };

  const openEditActivity = (act) => {
    if (!canAddAktivitas) {
      addToast(
        "warning",
        "Akses ditolak: Edit aktivitas hanya untuk level user pada unit yang ditugaskan"
      );
      return;
    }
    setActModalMode("edit");
    setSelectedAct(act);
    setActNama(act.Aktivitas || "");
    setActPic(act.PIC || "");
    const initialAnggaran = Number(act.Anggaran) || 0;
    setActAnggaran(initialAnggaran);
    setActAnggaranStr(
      initialAnggaran > 0
        ? new Intl.NumberFormat("id-ID").format(initialAnggaran)
        : "0",
    );
    setActCapaian(act.Capaian || "");
    setActMasalah(act.Masalah || "");
    setActPemecahan(act.PemecahanMasalah || "");
    setActStatus(act.Status || "draft");
    setShowEvaluasi(
      Boolean(act.Capaian || act.Masalah || act.PemecahanMasalah),
    );
    setActModalOpen(true);
  };

  const handleSaveActivity = async (e) => {
    e.preventDefault();
    if (!canAddAktivitas) {
      addToast(
        "warning",
        "Akses ditolak: Simpan aktivitas hanya untuk level user pada unit yang ditugaskan",
      );
      return;
    }
    if (!actNama.trim()) {
      addToast("warning", "Nama aktivitas / kegiatan wajib diisi");
      return;
    }

    setSavingAct(true);
    try {
      const fd = new FormData();
      fd.append("aktivitas", actNama.trim());
      fd.append("pic", actPic.trim());
      fd.append("anggaran", String(Number(actAnggaran) || 0));
      fd.append("status", actStatus);
      fd.append("capaian", actCapaian.trim());
      fd.append("masalah", actMasalah.trim());
      fd.append("pemecahan_masalah", actPemecahan.trim());

      const url =
        actModalMode === "edit"
          ? `/proker_v3/aktivitas/${selectedAct.UUID}`
          : `/proker_v3/${prokerUuid}/aktivitas`;

      const res =
        actModalMode === "edit"
          ? await apiClient.put(url, fd)
          : await apiClient.post(url, fd);

      const json = res.data;

      addToast(
        "success",
        actModalMode === "edit"
          ? "Aktivitas berhasil diperbarui"
          : "Aktivitas baru berhasil ditambahkan",
      );
      setActModalOpen(false);
      fetchData();
    } catch (err) {
      addToast("error", err?.message || "Terjadi kesalahan sistem");
    } finally {
      setSavingAct(false);
    }
  };

  const handleDeleteActivity = async () => {
    if (!canAddAktivitas) {
      addToast(
        "warning",
        "Akses ditolak: Hapus aktivitas hanya untuk level user pada unit yang ditugaskan",
      );
      setConfirmDelete(false);
      return;
    }
    if (!actToDelete?.UUID) return;
    try {
      const res = await apiClient.delete(
        `/proker_v3/aktivitas/${actToDelete.UUID}`,
      );
      const json = res.data;
      addToast("success", "Aktivitas berhasil dihapus");
      fetchData();
    } catch (err) {
      addToast("error", err?.message || "Gagal menghapus aktivitas");
    } finally {
      setConfirmDelete(false);
      setActToDelete(null);
    }
  };

  const handleUpdateStatusActivity = async (act, nextStatus) => {
    try {
      const fd = new FormData();
      fd.append("status", nextStatus);
      const res = await apiClient.put(
        `/proker_v3/aktivitas/${act.UUID}/status`,
        fd,
      );
      const json = res.data;
      addToast(
        "success",
        `Status aktivitas diubah menjadi: ${nextStatus.toUpperCase()}`,
      );
      fetchData();
    } catch (err) {
      addToast("error", err?.message || "Gagal memperbarui status");
    }
  };

  // Navigate to Timeline Page
  const openTimelinePage = (act) => {
    if (act?.UUID) {
      navigate(`/proker_v3/${prokerUuid}/aktivitas/${act.UUID}/timeline`);
    }
  };

  // Navigate to Dokumen Proker Page
  const openDokumenProker = () => {
    if (prokerUuid) {
      navigate(`/proker_v3/${prokerUuid}/dokumen`);
    }
  };

  // ==========================================
  // REVISI ANGGARAN HANDLERS (TIM ANGGARAN / ADMIN)
  // ==========================================
  const openRevisiAnggaranModal = (act) => {
    setActToRevisi(act);
    const currReal = getRealisasiAnggaran(act);
    const initialVal =
      currReal !== null && currReal !== undefined ? currReal : (Number(act.Anggaran) || 0);
    setRevisiAnggaran(initialVal);
    setRevisiAnggaranStr(
      initialVal > 0 ? new Intl.NumberFormat("id-ID").format(initialVal) : "0"
    );
    setRevisiModalOpen(true);
  };

  const handleRevisiInputChange = (e) => {
    const rawValue = e.target.value;
    const digitsOnly = rawValue.replace(/\D/g, "");
    if (!digitsOnly) {
      setRevisiAnggaran(0);
      setRevisiAnggaranStr("");
      return;
    }
    const numericValue = Number(digitsOnly);
    setRevisiAnggaran(numericValue);
    setRevisiAnggaranStr(new Intl.NumberFormat("id-ID").format(numericValue));
  };

  const handleSaveRevisiAnggaran = async (e) => {
    e.preventDefault();
    if (!actToRevisi?.UUID) return;

    setIsSubmittingRevisi(true);
    try {
      const fd = new FormData();
      fd.append("realisasi", String(revisiAnggaran));

      await apiClient.put(`/proker_v3/aktivitas/${actToRevisi.UUID}`, fd);
      addToast(
        "success",
        `Realisasi anggaran aktivitas "${actToRevisi.Aktivitas}" berhasil disimpan: ${formatRupiah(revisiAnggaran)}`
      );
      setRevisiModalOpen(false);
      setActToRevisi(null);
      fetchData();
    } catch (err) {
      addToast(
        "error",
        err?.message || "Gagal memperbarui realisasi anggaran aktivitas"
      );
    } finally {
      setIsSubmittingRevisi(false);
    }
  };

  const handleSubmitRevisiDraft = async () => {
    if (!prokerUuid) return;
    try {
      setIsSubmittingRevisiDraft(true);
      const fd = new FormData();
      fd.append("status", "draft");
      if (alasanRevisiDraft.trim()) {
        fd.append("catatan_penolakan", alasanRevisiDraft.trim());
      }
      await apiClient.put(`/proker_v3/${prokerUuid}/status`, fd);
      addToast(
        "success",
        `Program kerja "${proker?.NamaProgram || ""}" berhasil dikembalikan ke status Draft`,
      );
      setRevisiDraftModalOpen(false);
      setAlasanRevisiDraft("");
      await fetchData();
    } catch (err) {
      addToast(
        "error",
        err?.response?.data?.error || err?.message || "Gagal mengembalikan status ke Draft",
      );
    } finally {
      setIsSubmittingRevisiDraft(false);
    }
  };

  const handleRevisiActDraft = async (act) => {
    if (!act?.UUID) return;
    try {
      const fd = new FormData();
      fd.append("status", "draft");
      fd.append("role", isAnggaran ? "anggaran" : curRole);
      await apiClient.put(`/proker_v3/aktivitas/${act.UUID}/status`, fd);
      addToast(
        "success",
        `Aktivitas "${act.Aktivitas}" berhasil dikembalikan ke status Draft`,
      );
      await fetchData();
    } catch (err) {
      addToast("error", err?.message || "Gagal mengembalikan aktivitas ke Draft");
    }
  };

  // Verifier Handlers for Program Kerja
  const prokerStatusClean = String(proker?.Status || "draft")
    .toLowerCase()
    .replace(/_/g, " ")
    .trim();
  const prokerStatusVerif = String(proker?.StatusVerifikator || "")
    .toLowerCase()
    .trim();
  const prokerStatusAngg = String(proker?.StatusAnggaran || "")
    .toLowerCase()
    .trim();

  const isProdi =
    (proker?.TypeFakultasUnit || "").toLowerCase() === "prodi" ||
    (proker?.NamaFakultasUnit || "").toLowerCase().includes("prodi");

  const pVerif = (proker?.StatusVerifikator || "").toLowerCase().trim();
  const pAngg = (proker?.StatusAnggaran || "").toLowerCase().trim();
  const pMain = (proker?.Status || "").toLowerCase().trim();

  // Proker berhasil di acc verifikator
  const isProkerAccVerifikator =
    pVerif === "terima_verifikator" ||
    pVerif === "disetujui" ||
    pVerif.includes("diverifikasi") ||
    pMain === "disetujui" ||
    pMain === "terima_anggaran" ||
    pMain.includes("diverifikasi");

  // Proker berhasil di acc anggaran
  const isProkerAccAnggaran =
    pAngg === "terima_anggaran" ||
    pMain === "terima_anggaran" ||
    pMain === "disetujui";

  // Syarat mutlak: di mata proker berhasil di acc verifikator dan anggaran
  const isProkerFullyApproved =
    isProkerAccVerifikator &&
    isProkerAccAnggaran &&
    !pMain.includes("ditolak") &&
    !pAngg.includes("ditolak") &&
    !pVerif.includes("ditolak");

  const isVerifierApproved = isProkerAccVerifikator;
  const isTerimaAnggaranStage = isProkerAccAnggaran;

  // Tombol revisi ke draft hanya tampil ketika status Verifikasi UPM / Verifikasi Anggaran diterima/ditolak,
  // hanya muncul di level verifikator dan anggaran
  const canRevisiDraftProker = useMemo(() => {
    if (!isVerifier && !isAnggaran) return false;
    const isVerifierDone = isProkerAccVerifikator || pVerif === "ditolak" || pMain.includes("ditolak");
    const isAnggaranDone = isProkerAccAnggaran || pAngg === "ditolak";
    if (isVerifier) return isVerifierDone;
    if (isAnggaran) return isAnggaranDone;
    return false;
  }, [isVerifier, isAnggaran, isProkerAccVerifikator, isProkerAccAnggaran, pVerif, pAngg, pMain]);

  // Tombol revisi aktivitas ke draft di tabel: TIDAK ada pada role upml, upmf, upms
  const canRevisiActDraft = useMemo(() => {
    if (["upml", "upmf", "upms"].includes(curRole)) return false;
    return isAdmin || isAnggaran;
  }, [curRole, isAdmin, isAnggaran]);

  // Hanya verifikator (upml, upmf, upms, evaluator) dan admin yang memverifikasi aktivitas
  const canVerify = isVerifier || isAdmin;

  // Next verification status label and value
  let nextVerifyStatus = "disetujui";
  let nextVerifyStatusLabel = "Disetujui";
  if (isAnggaran) {
    nextVerifyStatus = "terima_anggaran";
    nextVerifyStatusLabel = "Terima Anggaran";
  } else if (curRole === "upml") {
    nextVerifyStatus = "diverifikasi_upml";
    nextVerifyStatusLabel = "Verifikasi UPML";
  } else if (curRole === "upmf") {
    nextVerifyStatus = "diverifikasi_upmf";
    nextVerifyStatusLabel = "Verifikasi UPMF";
  } else if (curRole === "upms" || isAdmin) {
    nextVerifyStatus = "disetujui";
    nextVerifyStatusLabel = "Disetujui";
  }

  const handleTerimaProker = async () => {
    try {
      setIsVerifying(true);
      const fd = new FormData();
      fd.append("status", nextVerifyStatus);
      await apiClient.put(`/proker_v3/${prokerUuid}/verifikasi`, fd);

      addToast(
        "success",
        `Program kerja berhasil diterima (${nextVerifyStatusLabel})`,
      );
      fetchData();
    } catch (err) {
      addToast("error", err?.message || "Gagal memverifikasi program kerja");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOpenTolakModal = () => {
    setAlasanPenolakan("");
    setRejectModalOpen(true);
  };

  const handleSubmitTolakProker = async () => {
    if (!alasanPenolakan.trim()) {
      addToast("error", "Alasan penolakan wajib diisi");
      return;
    }

    try {
      setIsSubmittingReject(true);
      const fd = new FormData();
      fd.append("status", "ditolak");
      fd.append("catatan_penolakan", alasanPenolakan.trim());
      await apiClient.put(`/proker_v3/${prokerUuid}/verifikasi`, fd);

      addToast("success", "Program kerja berhasil ditolak.");
      setRejectModalOpen(false);
      fetchData();
    } catch (err) {
      addToast("error", err?.message || "Gagal menolak program kerja");
    } finally {
      setIsSubmittingReject(false);
    }
  };

  // ==========================================
  // BATCH & SINGLE ROW VERIFICATION HANDLERS
  // ==========================================
  const handleToggleSelectAll = () => {
    if (selectedActUuids.length === activities.length) {
      setSelectedActUuids([]);
    } else {
      setSelectedActUuids(activities.map((a) => a.UUID));
    }
  };

  const handleToggleSelectRow = (uuid) => {
    setSelectedActUuids((prev) =>
      prev.includes(uuid) ? prev.filter((id) => id !== uuid) : [...prev, uuid],
    );
  };

  // Parallel Batch Accept (Terima Semua Proker)
  const handleBatchTerima = async () => {
    if (selectedActUuids.length === 0) return;
    setIsBatchProcessing(true);

    // Clear previous errors for selected items
    setRowErrors((prev) => {
      const next = { ...prev };
      selectedActUuids.forEach((id) => delete next[id]);
      return next;
    });

    const promises = selectedActUuids.map(async (uuid) => {
      try {
        let roleToUse = curRole;
        if (isAdmin) {
          const act = activities.find((a) => a.UUID === uuid);
          if (act) {
            if (isProdi) {
              const stUpms = (act.StatusUpms || "").toLowerCase().trim();
              const stUpmf = (act.StatusUpmf || "").toLowerCase().trim();
              if (stUpms !== "disetujui") roleToUse = "upms";
              else if (stUpmf !== "disetujui") roleToUse = "upmf";
              else roleToUse = "lpm";
            } else {
              const stUpml = (act.StatusUpml || "").toLowerCase().trim();
              if (stUpml !== "disetujui") roleToUse = "upml";
              else roleToUse = "lpm";
            }
          }
        }
        const fd = new FormData();
        fd.append("status", "disetujui");
        fd.append("role", roleToUse);
        await apiClient.put(`/proker_v3/aktivitas/${uuid}/status`, fd);
        return { uuid, success: true };
      } catch (err) {
        const msg =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Gagal memverifikasi aktivitas";
        return { uuid, success: false, error: msg };
      }
    });

    const results = await Promise.allSettled(promises);
    const newErrors = {};
    let successCount = 0;
    let failCount = 0;

    results.forEach((res) => {
      if (res.status === "fulfilled") {
        const val = res.value;
        if (!val.success) {
          newErrors[val.uuid] = val.error;
          failCount++;
        } else {
          successCount++;
        }
      } else {
        failCount++;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setRowErrors((prev) => ({ ...prev, ...newErrors }));
      setSelectedActUuids(Object.keys(newErrors)); // retain failed items
    } else {
      setSelectedActUuids([]);
    }

    if (failCount > 0) {
      addToast(
        "error",
        `${failCount} aktivitas gagal diperbarui. Periksa pesan error pada kolom status.`,
      );
    }
    if (successCount > 0) {
      addToast(
        "success",
        `${successCount} aktivitas berhasil diterima (${nextVerifyStatusLabel}).`,
      );
    }

    await fetchData();
    setIsBatchProcessing(false);
  };

  // Parallel Batch Reject Submit (Tolak Semua Proker)
  const handleSubmitBatchReject = async () => {
    if (!batchRejectReason.trim()) {
      addToast("error", "Alasan penolakan wajib diisi");
      return;
    }

    setIsSubmittingBatchReject(true);
    setIsBatchProcessing(true);

    // Clear previous errors for selected items
    setRowErrors((prev) => {
      const next = { ...prev };
      selectedActUuids.forEach((id) => delete next[id]);
      return next;
    });

    const reason = batchRejectReason.trim();
    const promises = selectedActUuids.map(async (uuid) => {
      try {
        let roleToUse = curRole;
        if (isAdmin) {
          const act = activities.find((a) => a.UUID === uuid);
          if (act) {
            if (isProdi) {
              const stUpms = (act.StatusUpms || "").toLowerCase().trim();
              const stUpmf = (act.StatusUpmf || "").toLowerCase().trim();
              if (stUpms !== "disetujui") roleToUse = "upms";
              else if (stUpmf !== "disetujui") roleToUse = "upmf";
              else roleToUse = "lpm";
            } else {
              const stUpml = (act.StatusUpml || "").toLowerCase().trim();
              if (stUpml !== "disetujui") roleToUse = "upml";
              else roleToUse = "lpm";
            }
          }
        }
        const fd = new FormData();
        fd.append("status", "ditolak");
        fd.append("role", roleToUse);
        fd.append("catatan_penolakan", reason);
        await apiClient.put(`/proker_v3/aktivitas/${uuid}/status`, fd);
        return { uuid, success: true };
      } catch (err) {
        const msg =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Gagal menolak aktivitas";
        return { uuid, success: false, error: msg };
      }
    });

    const results = await Promise.allSettled(promises);
    const newErrors = {};
    let successCount = 0;
    let failCount = 0;

    results.forEach((res) => {
      if (res.status === "fulfilled") {
        const val = res.value;
        if (!val.success) {
          newErrors[val.uuid] = val.error;
          failCount++;
        } else {
          successCount++;
        }
      } else {
        failCount++;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setRowErrors((prev) => ({ ...prev, ...newErrors }));
      setSelectedActUuids(Object.keys(newErrors));
    } else {
      setSelectedActUuids([]);
    }

    if (failCount > 0) {
      addToast(
        "error",
        `${failCount} aktivitas gagal ditolak. Periksa kolom status.`,
      );
    }
    if (successCount > 0) {
      addToast("success", `${successCount} aktivitas berhasil ditolak.`);
    }

    setBatchRejectModalOpen(false);
    setBatchRejectReason("");
    await fetchData();
    setIsSubmittingBatchReject(false);
    setIsBatchProcessing(false);
  };

  // Parallel Batch Revisi ke Draft
  const handleBatchRevisiDraft = async () => {
    if (selectedActUuids.length === 0) return;
    setIsBatchProcessing(true);
    setRowErrors((prev) => {
      const next = { ...prev };
      selectedActUuids.forEach((id) => delete next[id]);
      return next;
    });

    const roleToUse = isAnggaran ? "anggaran" : curRole;
    const promises = selectedActUuids.map(async (uuid) => {
      try {
        const fd = new FormData();
        fd.append("status", "draft");
        fd.append("role", roleToUse);
        await apiClient.put(`/proker_v3/aktivitas/${uuid}/status`, fd);
        return { uuid, success: true };
      } catch (err) {
        return {
          uuid,
          success: false,
          error:
            err?.response?.data?.error ||
            err?.message ||
            "Gagal mengubah ke Draft",
        };
      }
    });

    const results = await Promise.allSettled(promises);
    const newErrors = {};
    let successCount = 0;
    let failCount = 0;

    results.forEach((res) => {
      if (res.status === "fulfilled") {
        const val = res.value;
        if (!val.success) {
          newErrors[val.uuid] = val.error;
          failCount++;
        } else {
          successCount++;
        }
      } else {
        failCount++;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setRowErrors((prev) => ({ ...prev, ...newErrors }));
      setSelectedActUuids(Object.keys(newErrors));
    } else {
      setSelectedActUuids([]);
    }

    if (failCount > 0) {
      addToast("error", `${failCount} aktivitas gagal dikembalikan ke Draft.`);
    }
    if (successCount > 0) {
      addToast(
        "success",
        `${successCount} aktivitas berhasil dikembalikan ke status Draft.`,
      );
    }

    await fetchData();
    setIsBatchProcessing(false);
  };

  // Single Row Accept
  const handleVerifySingleRow = async (act, targetRole) => {
    if (!act?.UUID) return;
    const roleToUse = targetRole || (isAnggaran ? "anggaran" : curRole);
    setVerifyingRowUuid(act.UUID);
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[act.UUID];
      return next;
    });

    try {
      const fd = new FormData();
      fd.append("status", "disetujui");
      fd.append("role", roleToUse);
      await apiClient.put(`/proker_v3/aktivitas/${act.UUID}/status`, fd);
      addToast(
        "success",
        `Aktivitas berhasil disetujui (${roleToUse.toUpperCase()})`,
      );
      await fetchData();
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Gagal menerima aktivitas";
      setRowErrors((prev) => ({ ...prev, [act.UUID]: msg }));
      addToast("error", msg);
    } finally {
      setVerifyingRowUuid(null);
    }
  };

  // Single Row Reject
  const handleOpenSingleRejectModal = (act, targetRole) => {
    setActToReject(act);
    setRejectRole(targetRole || (isAnggaran ? "anggaran" : curRole));
    setSingleRejectReason("");
    setSingleRejectModalOpen(true);
  };

  const handleSubmitSingleReject = async () => {
    if (!singleRejectReason.trim()) {
      addToast("error", "Alasan penolakan wajib diisi");
      return;
    }
    if (!actToReject?.UUID) return;

    setIsSubmittingSingleReject(true);
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[actToReject.UUID];
      return next;
    });

    try {
      const fd = new FormData();
      fd.append("status", "ditolak");
      fd.append("role", rejectRole || curRole);
      fd.append("catatan_penolakan", singleRejectReason.trim());
      await apiClient.put(`/proker_v3/aktivitas/${actToReject.UUID}/status`, fd);
      addToast(
        "success",
        `Aktivitas "${actToReject.Aktivitas}" berhasil ditolak`,
      );
      setSingleRejectModalOpen(false);
      setActToReject(null);
      setRejectRole("");
      setSingleRejectReason("");
      await fetchData();
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Gagal menolak aktivitas";
      setRowErrors((prev) => ({ ...prev, [actToReject.UUID]: msg }));
      addToast("error", msg);
    } finally {
      setIsSubmittingSingleReject(false);
    }
  };

  const renderStatusBadge = (statusStr) => {
    const s = (statusStr || "draft").toLowerCase().replace(/_/g, " ").trim();
    if (s === "disetujui") {
      return (
        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-300 bg-emerald-50 text-emerald-800 uppercase tracking-wider">
          DISETUJUI
        </span>
      );
    }
    if (s === "menunggu upms" || s === "diverifikasi upmf") {
      return (
        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold border border-purple-300 bg-purple-50 text-purple-800 uppercase tracking-wider">
          MENUNGGU UPMS
        </span>
      );
    }
    if (s === "menunggu upmf" || s === "diverifikasi upml") {
      return (
        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold border border-indigo-300 bg-indigo-50 text-indigo-800 uppercase tracking-wider">
          MENUNGGU UPMF
        </span>
      );
    }
    if (s === "menunggu upml") {
      return (
        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold border border-cyan-300 bg-cyan-50 text-cyan-800 uppercase tracking-wider">
          MENUNGGU UPML
        </span>
      );
    }
    if (s === "terima anggaran") {
      return (
        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-300 bg-emerald-50 text-emerald-800 uppercase tracking-wider">
          TERIMA ANGGARAN
        </span>
      );
    }
    if (s === "diajukan") {
      return (
        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold border border-blue-300 bg-blue-50 text-blue-800 uppercase tracking-wider">
          DIAJUKAN
        </span>
      );
    }
    if (s.includes("ditolak")) {
      return (
        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold border border-rose-300 bg-rose-50 text-rose-800 uppercase tracking-wider">
          DITOLAK
        </span>
      );
    }
    if (s === "selesai") {
      return (
        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold border border-purple-300 bg-purple-50 text-purple-800 uppercase tracking-wider">
          SELESAI
        </span>
      );
    }
    return (
      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold border border-gray-200 bg-gray-100 text-gray-600 uppercase tracking-wider">
        DRAF
      </span>
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

      <div className="min-h-screen bg-slate-50/60 py-8 px-4 sm:px-6 lg:px-8 w-full mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/proker_v3")}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:text-purple-700 shadow-2xs transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Daftar Program Kerja</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-xl text-gray-500 bg-white border border-gray-200 hover:text-purple-600 hover:bg-purple-50 transition cursor-pointer shadow-2xs"
              title="Segarkan data"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* TOP CARD: RINGKASAN PROGRAM KERJA (MATRIX_PROKER) */}
        {loading && !proker ? (
          <div className="p-8 bg-white rounded-2xl border border-gray-100 shadow-xs flex items-center justify-center">
            <span className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mr-3" />
            <span className="text-xs text-gray-500 font-medium">
              Memuat rincian program kerja...
            </span>
          </div>
        ) : proker ? (
          <div className="bg-white rounded-2xl border border-purple-100/80 p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-linear-to-bl from-purple-100/40 via-indigo-50/20 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

            <div className="relative z-10 space-y-4">
              {/* Header Badges & Title */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-gray-100">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                    Tahun {proker.Tahun || "2026"}
                  </span>
                  {proker.NamaFakultasUnit && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      <Building2 className="w-3.5 h-3.5" />
                      {proker.NamaFakultasUnit}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setHistoryItem({
                        uuid: prokerUuid,
                        title: proker?.NamaProgram,
                      });
                      setHistoryDrawerOpen(true);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 transition cursor-pointer shadow-2xs ml-1"
                    title="Riwayat State & Verifikasi Program Kerja"
                  >
                    <Clock className="w-3.5 h-3.5 text-purple-600" />
                    <span>History</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-gray-500 font-semibold">
                    Status Program Kerja:
                  </span>
                  {renderStatusBadge(prokerStatusClean)}
                  {canRevisiDraftProker && (
                    <button
                      type="button"
                      onClick={() => {
                        setAlasanRevisiDraft("");
                        setRevisiDraftModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-2xs transition cursor-pointer ml-1"
                      title="Kembalikan status program kerja ke Draft untuk direvisi oleh pengaju"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Revisi ke Draft</span>
                    </button>
                  )}
                </div>
              </div>

              {prokerStatusClean.includes("ditolak") &&
                (proker.CatatanVerifikator ||
                  proker.CatatanAnggaran ||
                  proker.CatatanPenolakan) && (
                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs shadow-2xs">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-rose-800 text-[10px] uppercase tracking-wider">
                        Catatan Penolakan Program Kerja:
                      </span>
                      <p className="italic text-rose-700">
                        "
                        {proker.CatatanVerifikator ||
                          proker.CatatanAnggaran ||
                          proker.CatatanPenolakan}
                        "
                      </p>
                    </div>
                  </div>
                )}

              <div>
                <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-snug">
                  {proker.NamaProgram}
                </h1>
              </div>

              {/* Grid Metadata Matriks */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
                {/* Standar & Indikator */}
                <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-700">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Standar & Sub Standar</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-800 line-clamp-2">
                    {proker.StandarSubStandar || "-"}
                  </p>
                  <p className="text-[11px] text-gray-500 italic line-clamp-1">
                    Indikator: {proker.IndikatorKinerja || "-"}
                  </p>
                </div>

                {/* Target Unpak & Target Unit */}
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    <Target className="w-3.5 h-3.5" />
                    <span>Target Capaian</span>
                  </div>
                  <div className="text-xs text-gray-700">
                    Target Unpak:{" "}
                    <b className="text-emerald-700">
                      {proker.TargetUnpak || "-"}
                    </b>
                  </div>
                  <div className="text-xs text-gray-700">
                    Target Unit:{" "}
                    <b className="text-purple-700">
                      {proker.TargetUnit || "-"}
                    </b>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    Capaian Lalu: {proker.CapaianUnitLalu || "-"}
                  </p>
                </div>

                {/* Output & Outcome */}
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-800">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Luaran & Dampak</span>
                  </div>
                  <div className="text-xs text-gray-700 line-clamp-2">
                    <b>Output:</b> {proker.Output || "-"}
                  </div>
                  <div className="text-xs text-gray-600 line-clamp-2">
                    <b>Outcome:</b> {proker.Outcome || "-"}
                  </div>
                </div>

                {/* Total Stats */}
                <div className="p-3 bg-linear-to-br from-purple-500 to-indigo-600 rounded-xl text-white shadow-xs space-y-1">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-purple-200">
                    Total Anggaran Akumulatif
                  </div>
                  <div className="text-base font-extrabold font-mono">
                    {isVerifikatorRoleOrLevel ? (
                      <span className="tracking-widest text-white/90">***</span>
                    ) : hasRealisasi && totalAnggaran !== totalRealisasi ? (
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span
                          className="line-through text-purple-200/80 text-xs font-normal decoration-rose-300 decoration-1"
                          title="Total Anggaran Awal"
                        >
                          {formatRupiah(totalAnggaran)}
                        </span>
                        <span title="Total Realisasi Anggaran Baru">
                          {formatRupiah(totalRealisasi)}
                        </span>
                      </div>
                    ) : (
                      formatRupiah(hasRealisasi ? totalRealisasi : totalAnggaran)
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* MAIN SECTION: TABEL AKTIVITAS KEGIATAN (AKTIVITASV2) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Action Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-gray-100 bg-linear-to-r from-gray-50/80 via-white to-gray-50/80">
            <div>
              <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <span>Daftar Aktivitas Kegiatan</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Kelola aktivitas, penanggung jawab, rincian anggaran, jadwal
                [RK] & [R], serta unggah bukti dokumen
              </p>
            </div>

            <div className="flex items-center gap-2">
              {canAddAktivitas && (
                <button
                  type="button"
                  onClick={openCreateActivity}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-200 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Aktivitas Baru</span>
                </button>
              )}
            </div>
          </div>

          {/* Batch Action Banner if items selected */}
          {selectedActUuids.length > 0 && (
            <div className="bg-linear-to-r from-purple-50 via-indigo-50 to-blue-50 border-b border-purple-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse" />
                <span className="text-xs font-bold text-gray-800">
                  <span className="text-purple-700 font-extrabold">
                    {selectedActUuids.length}
                  </span>{" "}
                  aktivitas dipilih dari {activities.length} total
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedActUuids([])}
                  className="text-[11px] text-gray-500 hover:text-gray-800 underline ml-2 cursor-pointer"
                >
                  Batalkan pilihan
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleBatchTerima}
                  disabled={isBatchProcessing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow transition cursor-pointer disabled:opacity-50"
                  title="Terima semua aktivitas yang dipilih secara paralel"
                >
                  {isBatchProcessing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Terima Semua Proker</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBatchRejectReason("");
                    setBatchRejectModalOpen(true);
                  }}
                  disabled={isBatchProcessing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm hover:shadow transition cursor-pointer disabled:opacity-50"
                  title="Tolak semua aktivitas yang dipilih dengan alasan"
                >
                  <X className="w-4 h-4" />
                  <span>Tolak Semua Proker</span>
                </button>

                {canRevisiActDraft && (
                  <button
                    type="button"
                    onClick={handleBatchRevisiDraft}
                    disabled={isBatchProcessing}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm hover:shadow transition cursor-pointer disabled:opacity-50"
                    title="Kembalikan semua aktivitas yang dipilih ke status Draft"
                  >
                    {isBatchProcessing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <RotateCcw className="w-4 h-4" />
                    )}
                    <span>Revisi Semua ke Draft</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Table Body */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-600 font-bold border-b border-gray-100 uppercase tracking-wider text-[11px]">
                <tr>
                  {canVerify && (
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          activities.length > 0 &&
                          selectedActUuids.length === activities.length
                        }
                        ref={(el) => {
                          if (el) {
                            el.indeterminate =
                              selectedActUuids.length > 0 &&
                              selectedActUuids.length < activities.length;
                          }
                        }}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                        title="Pilih semua aktivitas"
                      />
                    </th>
                  )}
                  <th className="py-3 px-4 w-12 text-center">No.</th>
                  <th className="py-3 px-4 min-w-[240px]">
                    Aktivitas / Kegiatan
                  </th>
                  <th className="py-3 px-4 min-w-[130px]">PIC Kegiatan</th>
                  <th className="py-3 px-4 min-w-[170px] text-right">
                    Anggaran (Rp)
                  </th>
                  {!isEvaluatorOrAnggaran && (
                    <>
                      <th className="py-3 px-4 min-w-[170px]">Dokumen Referensi</th>
                      <th className="py-3 px-4 min-w-[210px]">Jadwal & Bukti</th>
                    </>
                  )}
                  <th className="py-3 px-4 min-w-[150px]">Status UPML/UPMS</th>
                  <th className="py-3 px-4 min-w-[150px]">Status UPMF</th>
                  <th className="py-3 px-4 min-w-[150px]">Status LPM</th>
                  <th className="py-3 px-4 min-w-[190px] text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activities.length === 0 ? (
                  <tr>
                    <td
                      colSpan={
                        canVerify
                          ? isEvaluatorOrAnggaran
                            ? 9
                            : 11
                          : isEvaluatorOrAnggaran
                          ? 8
                          : 10
                      }
                      className="py-12 text-center text-gray-400"
                    >
                      <FileSpreadsheet className="w-10 h-10 mx-auto text-gray-300 mb-2 stroke-1" />
                      <p className="text-xs font-semibold text-gray-600">
                        Belum ada aktivitas pada program kerja ini
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {canAddAktivitas
                          ? 'Klik tombol "+ Tambah Aktivitas Baru" di atas untuk mulai membuat kegiatan'
                          : "Aktivitas kegiatan belum dibuat oleh unit kerja"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  activities.map((act, idx) => {
                    const actStatusStr = (act.Status || "draft").toLowerCase();
                    const tlList = act.Timelines || [];
                    const rkSlotSet = new Set();
                    const rSlotSet = new Set();
                    let filesCount = 0;

                    tlList.forEach((tl) => {
                      getTimelineRkSlots(tl).forEach((s) => rkSlotSet.add(s));
                      getTimelineRSlots(tl).forEach((s) => rSlotSet.add(s));
                      filesCount += (tl.Files || []).length;
                    });

                    const rkCount = rkSlotSet.size;
                    const rCount = rSlotSet.size;
                    const isSelected = selectedActUuids.includes(act.UUID);
                    const rowError = rowErrors[act.UUID];

                    return (
                      <Fragment key={act.UUID}>
                        <tr
                          className={`transition ${
                            isSelected
                              ? "bg-purple-50/50"
                              : "hover:bg-purple-50/20"
                          }`}
                        >
                          {/* Checkbox column before No */}
                          {canVerify && (
                            <td className="py-3.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectRow(act.UUID)}
                                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                              />
                            </td>
                          )}

                          {/* No */}
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-gray-500">
                            {idx + 1}
                          </td>

                          {/* Aktivitas */}
                          <td className="py-3.5 px-4 font-semibold text-gray-900 leading-snug">
                            <div className="space-y-1">
                              <span className="line-clamp-2">
                                {act.Aktivitas}
                              </span>
                              {act.Capaian && (
                                <div className="text-[11px] text-emerald-700 font-normal">
                                  Capaian: {act.Capaian}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* PIC */}
                          <td className="py-3.5 px-4 text-gray-700 font-medium">
                            {act.PIC || "-"}
                          </td>

                          {/* Anggaran */}
                          <td className="py-3.5 px-4 text-right font-mono text-xs whitespace-nowrap">
                            {isVerifikatorRoleOrLevel ? (
                              <div className="text-center font-bold text-gray-400 tracking-widest">
                                ***
                              </div>
                            ) : isAnggaranRevised(act) ? (
                              <div>
                                <span
                                  className="line-through text-gray-400 text-[11px] block font-normal decoration-rose-500 decoration-1"
                                  title="Anggaran Awal"
                                >
                                  {formatRupiah(act.Anggaran)}
                                </span>
                                <span
                                  className="font-bold text-emerald-700 text-xs block"
                                  title="Realisasi Anggaran Baru"
                                >
                                  {formatRupiah(getRealisasiAnggaran(act))}
                                </span>
                              </div>
                            ) : (
                              <span className="font-bold text-emerald-700">
                                {formatRupiah(hasRealisasiAnggaran(act) ? getRealisasiAnggaran(act) : act.Anggaran)}
                              </span>
                            )}

                            {/* Action Revisi Anggaran untuk Tim Anggaran / Admin */}
                            {canRevisiAnggaran && (
                              <div className="mt-1.5 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => openRevisiAnggaranModal(act)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-700 border border-amber-200 transition cursor-pointer shadow-2xs whitespace-nowrap group"
                                  title="Revisi realisasi anggaran kegiatan ini"
                                >
                                  <PencilLine className="w-3 h-3 text-amber-600 group-hover:text-white shrink-0" />
                                  <span>Revisi Anggaran</span>
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Dokumen Referensi & Jadwal Timeline (hanya tampil jika BUKAN evaluator / anggaran) */}
                          {!isEvaluatorOrAnggaran && (
                            <>
                              {/* Dokumen Referensi */}
                              <td className="py-3.5 px-4">
                                <div className="space-y-1.5">
                                  <span className="text-[11px] font-semibold text-gray-700 block whitespace-nowrap">
                                    {(act.DokumenReferensiFiles || []).length > 0
                                      ? `${(act.DokumenReferensiFiles || []).length} Berkas Terunggah`
                                      : "Belum ada berkas"}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      navigate(
                                        `/proker_v3/${prokerUuid}/dokumen?act=${act.UUID}`,
                                        { state: { aktivitas: act } },
                                      )
                                    }
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-200 transition cursor-pointer group shadow-2xs whitespace-nowrap"
                                    title="Buka halaman dokumen program kerja untuk aktivitas ini"
                                  >
                                    <FileText className="w-3 h-3 text-indigo-600 group-hover:text-white shrink-0" />
                                    <span>Dokumen Proker →</span>
                                  </button>
                                </div>
                              </td>

                              {/* Jadwal Timeline & Bukti File */}
                              <td className="py-3.5 px-4">
                                <button
                                  type="button"
                                  onClick={() => openTimelinePage(act)}
                                  className="inline-flex flex-col gap-1.5 p-2.5 rounded-xl border border-purple-200/90 bg-purple-50/40 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition text-left cursor-pointer group w-full shadow-2xs"
                                  title="Klik untuk membuka kelola jadwal rencana [RK] & realisasi [R] serta berkas bukti kegiatan"
                                >
                                  <div className="flex items-center justify-between gap-2 text-xs font-bold text-gray-800 group-hover:text-white">
                                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
                                      <Clock className="w-3.5 h-3.5 text-purple-600 group-hover:text-white shrink-0" />
                                      <span>Jadwal RK/R</span>
                                    </span>
                                    <span className="text-[10px] bg-purple-100 group-hover:bg-white text-purple-800 group-hover:text-purple-700 px-2 py-0.5 rounded-full font-mono font-bold whitespace-nowrap shrink-0 transition-colors">
                                      RK: {rkCount} | R: {rCount}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] text-gray-500 group-hover:text-purple-100 pt-1 border-t border-purple-100/60 group-hover:border-purple-500">
                                    <span className="whitespace-nowrap">
                                      Bukti Kegiatan:
                                    </span>
                                    <span className="font-bold text-indigo-700 group-hover:text-white whitespace-nowrap">
                                      {filesCount} Berkas
                                    </span>
                                  </div>
                                </button>
                              </td>
                            </>
                          )}

                          {/* Status UPML/UPMS */}
                          <td className="py-3.5 px-4">
                            {(() => {
                              const curSt = (
                                isProdi ? act.StatusUpms : act.StatusUpml
                              )
                                ?.toLowerCase()
                                ?.trim() || "";
                              if (curSt === "disetujui") {
                                return (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-300 bg-emerald-50 text-emerald-800 uppercase tracking-wider">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>DISETUJUI</span>
                                  </span>
                                );
                              }
                              if (curSt === "ditolak") {
                                const note =
                                  (isProdi
                                    ? act.CatatanTolakUpms
                                    : act.CatatanTolakUpml) ||
                                  act.CatatanVerifikator ||
                                  act.CatatanPenolakan;
                                return (
                                  <div className="flex flex-col gap-1 items-start">
                                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-rose-300 bg-rose-50 text-rose-800 uppercase tracking-wider">
                                      DITOLAK
                                    </span>
                                    {note && (
                                      <span
                                        className="text-[10px] text-rose-700 italic bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 line-clamp-2 max-w-[160px]"
                                        title={`Catatan: ${note}`}
                                      >
                                        "{note}"
                                      </span>
                                    )}
                                  </div>
                                );
                              }
                              if (
                                curSt === "menunggu" ||
                                actStatusStr === "diajukan"
                              ) {
                                return (
                                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-cyan-300 bg-cyan-50 text-cyan-800 uppercase tracking-wider">
                                    MENUNGGU
                                  </span>
                                );
                              }
                              return (
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-gray-200 bg-gray-100 text-gray-600 uppercase tracking-wider">
                                  DRAF
                                </span>
                              );
                            })()}
                          </td>

                          {/* Status UPMF */}
                          <td className="py-3.5 px-4">
                            {(() => {
                              if (!isProdi) {
                                return (
                                  <span
                                    className="text-gray-400 font-mono text-xs italic"
                                    title="Tidak berlaku untuk unit non-prodi"
                                  >
                                    -
                                  </span>
                                );
                              }

                              const stUpms = (act.StatusUpms || "")
                                .toLowerCase()
                                .trim();
                              const stUpmf = (act.StatusUpmf || "")
                                .toLowerCase()
                                .trim();
                              const isUpmsApproved = stUpms === "disetujui";

                              if (stUpmf === "disetujui") {
                                return (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-300 bg-emerald-50 text-emerald-800 uppercase tracking-wider">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>DISETUJUI</span>
                                  </span>
                                );
                              }
                              if (stUpmf === "ditolak") {
                                const noteUpmf =
                                  act.CatatanTolakUpmf ||
                                  act.CatatanVerifikator ||
                                  act.CatatanPenolakan;
                                return (
                                  <div className="flex flex-col gap-1 items-start">
                                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-rose-300 bg-rose-50 text-rose-800 uppercase tracking-wider">
                                      DITOLAK
                                    </span>
                                    {noteUpmf && (
                                      <span
                                        className="text-[10px] text-rose-700 italic bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 line-clamp-2 max-w-[160px]"
                                        title={`Catatan UPMF: ${noteUpmf}`}
                                      >
                                        "{noteUpmf}"
                                      </span>
                                    )}
                                  </div>
                                );
                              }
                              if (!isUpmsApproved) {
                                return (
                                  <span
                                    className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-gray-200 bg-gray-100 text-gray-500 uppercase tracking-wider"
                                    title="Menunggu verifikasi UPMS disetujui"
                                  >
                                    MENUNGGU UPMS
                                  </span>
                                );
                              }
                              return (
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-indigo-300 bg-indigo-50 text-indigo-800 uppercase tracking-wider">
                                  MENUNGGU UPMF
                                </span>
                              );
                            })()}
                          </td>

                          {/* Status LPM */}
                          <td className="py-3.5 px-4">
                            {(() => {
                              const stUpml = (act.StatusUpml || "")
                                .toLowerCase()
                                .trim();
                              const stUpmf = (act.StatusUpmf || "")
                                .toLowerCase()
                                .trim();
                              const stUpms = (act.StatusUpms || "")
                                .toLowerCase()
                                .trim();
                              const stLpm = (act.StatusLpm || "")
                                .toLowerCase()
                                .trim();
                              const isLpmApproved =
                                stLpm === "disetujui" ||
                                (act.StatusVerifikator || "")
                                  .toLowerCase()
                                  .trim() === "terima_verifikator" ||
                                (act.Status || "")
                                  .toLowerCase()
                                  .trim() === "disetujui" ||
                                (act.Status || "")
                                  .toLowerCase()
                                  .trim() === "terima_anggaran";

                              if (isLpmApproved) {
                                return (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-300 bg-emerald-50 text-emerald-800 uppercase tracking-wider">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>DISETUJUI</span>
                                  </span>
                                );
                              }
                              if (stLpm === "ditolak") {
                                const noteLpm =
                                  act.CatatanTolakLpm ||
                                  act.CatatanVerifikator ||
                                  act.CatatanPenolakan;
                                return (
                                  <div className="flex flex-col gap-1 items-start">
                                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-rose-300 bg-rose-50 text-rose-800 uppercase tracking-wider">
                                      DITOLAK
                                    </span>
                                    {noteLpm && (
                                      <span
                                        className="text-[10px] text-rose-700 italic bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 line-clamp-2 max-w-[160px]"
                                        title={`Catatan LPM: ${noteLpm}`}
                                      >
                                        "{noteLpm}"
                                      </span>
                                    )}
                                  </div>
                                );
                              }
                              if (isProdi) {
                                if (stUpms !== "disetujui") {
                                  return (
                                    <span
                                      className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-gray-200 bg-gray-100 text-gray-500 uppercase tracking-wider"
                                      title="Menunggu verifikasi UPMS disetujui"
                                    >
                                      MENUNGGU UPMS
                                    </span>
                                  );
                                }
                                if (stUpmf !== "disetujui") {
                                  return (
                                    <span
                                      className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-gray-200 bg-gray-100 text-gray-500 uppercase tracking-wider"
                                      title="Menunggu verifikasi UPMF disetujui"
                                    >
                                      MENUNGGU UPMF
                                    </span>
                                  );
                                }
                              } else {
                                if (stUpml !== "disetujui") {
                                  return (
                                    <span
                                      className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-gray-200 bg-gray-100 text-gray-500 uppercase tracking-wider"
                                      title="Menunggu verifikasi UPML disetujui"
                                    >
                                      MENUNGGU UPML
                                    </span>
                                  );
                                }
                              }
                              return (
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-purple-300 bg-purple-50 text-purple-800 uppercase tracking-wider">
                                  MENUNGGU LPM
                                </span>
                              );
                            })()}
                          </td>

                          {/* Aksi */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              {/* 1. UPML VERIFY / REJECT ACTION */}
                              {curRole === "upml" && (
                                <>
                                  {isProdi ? (
                                    <span className="text-[11px] text-gray-400 italic">
                                      Khusus Non-Prodi
                                    </span>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleVerifySingleRow(act, "upml")
                                        }
                                        disabled={
                                          verifyingRowUuid === act.UUID ||
                                          isBatchProcessing
                                        }
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs hover:shadow transition cursor-pointer disabled:opacity-50"
                                        title="Setujui verifikasi UPML"
                                      >
                                        {verifyingRowUuid === act.UUID ? (
                                          <RefreshCw className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Check className="w-3 h-3" />
                                        )}
                                        <span>Verifikasi</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleOpenSingleRejectModal(
                                            act,
                                            "upml",
                                          )
                                        }
                                        disabled={
                                          verifyingRowUuid === act.UUID ||
                                          isBatchProcessing
                                        }
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs hover:shadow transition cursor-pointer disabled:opacity-50"
                                        title="Tolak verifikasi UPML"
                                      >
                                        <X className="w-3 h-3" />
                                        <span>Tolak</span>
                                      </button>
                                    </>
                                  )}
                                </>
                              )}

                              {/* 2. UPMF VERIFY / REJECT ACTION */}
                              {(curRole === "upmf" ||
                                curRole === "fakultas") && (
                                <>
                                  {!isProdi ? (
                                    <span className="text-[11px] text-gray-400 italic">
                                      Non-Prodi
                                    </span>
                                  ) : (
                                    (() => {
                                      const isUpmsApproved =
                                        (act.StatusUpms || "")
                                          .toLowerCase()
                                          .trim() === "disetujui";
                                      return (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleVerifySingleRow(act, "upmf")
                                            }
                                            disabled={
                                              !isUpmsApproved ||
                                              verifyingRowUuid === act.UUID ||
                                              isBatchProcessing
                                            }
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs hover:shadow transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                            title={
                                              !isUpmsApproved
                                                ? "Menunggu persetujuan UPMS terlebih dahulu"
                                                : "Setujui verifikasi Fakultas (UPMF)"
                                            }
                                          >
                                            {verifyingRowUuid === act.UUID ? (
                                              <RefreshCw className="w-3 h-3 animate-spin" />
                                            ) : (
                                              <Check className="w-3 h-3" />
                                            )}
                                            <span>Verifikasi</span>
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleOpenSingleRejectModal(
                                                act,
                                                "upmf",
                                              )
                                            }
                                            disabled={
                                              !isUpmsApproved ||
                                              verifyingRowUuid === act.UUID ||
                                              isBatchProcessing
                                            }
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs hover:shadow transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                            title={
                                              !isUpmsApproved
                                                ? "Menunggu persetujuan UPMS terlebih dahulu"
                                                : "Tolak verifikasi Fakultas (UPMF)"
                                            }
                                          >
                                            <X className="w-3 h-3" />
                                            <span>Tolak</span>
                                          </button>
                                        </>
                                      );
                                    })()
                                  )}
                                </>
                              )}

                              {/* 3. UPMS VERIFY / REJECT ACTION */}
                              {curRole === "upms" && (
                                <>
                                  {!isProdi ? (
                                    <span className="text-[11px] text-gray-400 italic">
                                      Khusus Prodi
                                    </span>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleVerifySingleRow(act, "upms")
                                        }
                                        disabled={
                                          verifyingRowUuid === act.UUID ||
                                          isBatchProcessing
                                        }
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs hover:shadow transition cursor-pointer disabled:opacity-50"
                                        title="Setujui verifikasi UPMS"
                                      >
                                        {verifyingRowUuid === act.UUID ? (
                                          <RefreshCw className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Check className="w-3 h-3" />
                                        )}
                                        <span>Verifikasi</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleOpenSingleRejectModal(
                                            act,
                                            "upms",
                                          )
                                        }
                                        disabled={
                                          verifyingRowUuid === act.UUID ||
                                          isBatchProcessing
                                        }
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs hover:shadow transition cursor-pointer disabled:opacity-50"
                                        title="Tolak verifikasi UPMS"
                                      >
                                        <X className="w-3 h-3" />
                                        <span>Tolak</span>
                                      </button>
                                    </>
                                  )}
                                </>
                              )}

                              {/* 4. ADMIN VERIFY / REJECT ACTION */}
                              {isAdmin &&
                                curRole !== "upml" &&
                                curRole !== "upmf" &&
                                curRole !== "fakultas" &&
                                curRole !== "upms" && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        let target = "lpm";
                                        if (isProdi) {
                                          const stUpms = (
                                            act.StatusUpms || ""
                                          )
                                            .toLowerCase()
                                            .trim();
                                          const stUpmf = (
                                            act.StatusUpmf || ""
                                          )
                                            .toLowerCase()
                                            .trim();
                                          if (stUpms !== "disetujui")
                                            target = "upms";
                                          else if (stUpmf !== "disetujui")
                                            target = "upmf";
                                          else target = "lpm";
                                        } else {
                                          const stUpml = (
                                            act.StatusUpml || ""
                                          )
                                            .toLowerCase()
                                            .trim();
                                          if (stUpml !== "disetujui")
                                            target = "upml";
                                          else target = "lpm";
                                        }
                                        handleVerifySingleRow(act, target);
                                      }}
                                      disabled={
                                        verifyingRowUuid === act.UUID ||
                                        isBatchProcessing
                                      }
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs hover:shadow transition cursor-pointer disabled:opacity-50"
                                      title="Admin: Setujui verifikasi aktivitas"
                                    >
                                      {verifyingRowUuid === act.UUID ? (
                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Check className="w-3 h-3" />
                                      )}
                                      <span>Verifikasi</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        let target = "lpm";
                                        if (isProdi) {
                                          const stUpms = (
                                            act.StatusUpms || ""
                                          )
                                            .toLowerCase()
                                            .trim();
                                          const stUpmf = (
                                            act.StatusUpmf || ""
                                          )
                                            .toLowerCase()
                                            .trim();
                                          if (stUpms !== "disetujui")
                                            target = "upms";
                                          else if (stUpmf !== "disetujui")
                                            target = "upmf";
                                          else target = "lpm";
                                        } else {
                                          const stUpml = (
                                            act.StatusUpml || ""
                                          )
                                            .toLowerCase()
                                            .trim();
                                          if (stUpml !== "disetujui")
                                            target = "upml";
                                          else target = "lpm";
                                        }
                                        handleOpenSingleRejectModal(
                                          act,
                                          target,
                                        );
                                      }}
                                      disabled={
                                        verifyingRowUuid === act.UUID ||
                                        isBatchProcessing
                                      }
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs hover:shadow transition cursor-pointer disabled:opacity-50"
                                      title="Admin: Tolak verifikasi aktivitas"
                                    >
                                      <X className="w-3 h-3" />
                                      <span>Tolak</span>
                                    </button>
                                  </>
                                )}

                              {/* Option to revert single activity to draft (bukan untuk upml, upmf, upms) */}
                              {canRevisiActDraft &&
                                (act.Status || "").toLowerCase() !== "draft" && (
                                  <button
                                    type="button"
                                    onClick={() => handleRevisiActDraft(act)}
                                    disabled={
                                      verifyingRowUuid === act.UUID ||
                                      isBatchProcessing
                                    }
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-2xs hover:shadow transition cursor-pointer disabled:opacity-50"
                                    title="Kembalikan aktivitas ini ke status Draft"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Draft</span>
                                  </button>
                                )}

                              {/* User with assigned target Actions: Edit, Delete */}
                              {canAddAktivitas && (
                                <>
                                  <Tooltip title="Edit Aktivitas">
                                    <button
                                      type="button"
                                      onClick={() => openEditActivity(act)}
                                      className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 border border-amber-200 hover:border-amber-300 transition cursor-pointer shadow-2xs"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                  </Tooltip>
                                  <Tooltip title="Hapus Aktivitas">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActToDelete(act);
                                        setConfirmDelete(true);
                                      }}
                                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 hover:border-rose-300 transition cursor-pointer shadow-2xs"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </Tooltip>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* DETAIL TABEL AKTIVITAS TIMELINE & DAFTAR DOKUMEN KHUSUS EVALUATOR & ANGGARAN */}
                        {isEvaluatorOrAnggaran && (
                          <ProkerV3AktivitasEvaluatorRow
                            activity={act}
                            colSpan={canVerify ? 9 : 8}
                            prokerDocuments={prokerDocuments}
                            isVerifierRoleOrLevel={isVerifikatorRoleOrLevel}
                          />
                        )}

                        {/* DEDICATED FULL-WIDTH ERROR SUB-ROW IF ACTION FAILED */}
                        {rowError && (
                          <tr className="bg-rose-50/95 border-b border-rose-200 transition animate-in fade-in duration-200">
                            <td
                              colSpan={
                                canVerify
                                  ? isEvaluatorOrAnggaran
                                    ? 9
                                    : 11
                                  : isEvaluatorOrAnggaran
                                  ? 8
                                  : 10
                              }
                              className="py-3 px-6"
                            >
                              <div className="flex items-start sm:items-center justify-between gap-4">
                                <div className="flex items-start sm:items-center gap-3 text-rose-950 text-xs">
                                  <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0 mt-0.5 sm:mt-0">
                                    <AlertCircle className="w-5 h-5 stroke-[2.2]" />
                                  </div>
                                  <div className="text-left space-y-0.5">
                                    <div className="font-extrabold text-rose-950 flex items-center gap-2">
                                      <span>Gagal Memproses Verifikasi</span>
                                      <span className="text-[11px] font-normal text-rose-700 font-mono">
                                        ({act.Aktivitas})
                                      </span>
                                    </div>
                                    <div className="text-rose-800 font-medium leading-relaxed">
                                      {rowError}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRowErrors((prev) => {
                                      const next = { ...prev };
                                      delete next[act.UUID];
                                      return next;
                                    });
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-100 text-rose-700 border border-rose-300 transition text-xs font-bold cursor-pointer shrink-0 shadow-2xs"
                                  title="Tutup notifikasi error ini"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Tutup</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: FORM TAMBAH / EDIT AKTIVITAS                    */}
      {/* ======================================================== */}
      <Transition appear show={actModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setActModalOpen(false)}
        >
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
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <Dialog.Panel className="relative transform overflow-hidden rounded-3xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-gray-100 flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-purple-50/80 via-indigo-50/30 to-white">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/25 shrink-0 ring-4 ring-purple-100">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Dialog.Title className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                          {actModalMode === "edit"
                            ? "Edit Aktivitas Kegiatan"
                            : "Tambah Aktivitas Kegiatan"}
                        </Dialog.Title>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            actModalMode === "edit"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-purple-50 text-purple-700 border-purple-200"
                          }`}
                        >
                          {actModalMode === "edit" ? "Mode Edit" : "Baru"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Kelola rincian nama kegiatan, penanggung jawab, dan
                        alokasi anggaran
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActModalOpen(false)}
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-white hover:shadow-xs border border-transparent hover:border-gray-200 transition cursor-pointer"
                    title="Tutup Modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form Body */}
                <form
                  onSubmit={handleSaveActivity}
                  className="p-6 overflow-y-auto space-y-5"
                >
                  {/* Nama Aktivitas */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <span>Nama Aktivitas / Kegiatan</span>
                        <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <span className="text-[10px] font-medium text-gray-400">
                        {actNama.length} karakter
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      required
                      placeholder="Contoh: Pengadaan Server Rack & Penggantian Switch Distribusi Gedung Rektorat"
                      value={actNama}
                      onChange={(e) => setActNama(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 bg-gray-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition leading-relaxed placeholder:text-gray-400 shadow-2xs"
                    />
                  </div>

                  {/* PIC & Anggaran Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* PIC Penanggung Jawab */}
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        PIC Penanggung Jawab
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                          <User className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          placeholder="Nama penanggung jawab kegiatan"
                          value={actPic}
                          onChange={(e) => setActPic(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-gray-200 bg-gray-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Alokasi Anggaran Program */}
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Alokasi Anggaran Program (Rp)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 font-bold text-xs font-mono">
                          Rp
                        </div>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={actAnggaranStr}
                          onChange={handleAnggaranInputChange}
                          className="w-full pl-11 pr-3.5 py-2.5 text-xs rounded-xl border border-gray-200 bg-gray-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition font-mono font-bold text-gray-900 shadow-2xs placeholder:text-gray-400"
                        />
                      </div>
                      {actAnggaran > 0 && (
                        <p className="text-[10px] text-gray-500 mt-1 font-mono">
                          Terbilang: {formatRupiah(actAnggaran)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Evaluasi & Pelaksanaan (Collapsible Card) */}
                  <div className="border border-gray-200/90 rounded-2xl bg-white overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setShowEvaluasi((prev) => !prev)}
                      className="w-full px-4 py-3 flex items-center justify-between bg-gray-50/70 hover:bg-gray-100/70 transition cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-bold text-gray-800">
                          Evaluasi & Catatan Pelaksanaan (Opsional)
                        </span>
                        {(actCapaian || actMasalah || actPemecahan) && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            Terisi
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <span className="text-[11px] font-medium text-gray-500">
                          {showEvaluasi ? "Sembunyikan" : "Tampilkan"}
                        </span>
                        {showEvaluasi ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </button>

                    {showEvaluasi && (
                      <div className="p-4 space-y-3.5 border-t border-gray-100 bg-white">
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                          Kolom evaluasi dapat diisi saat atau setelah kegiatan
                          berjalan untuk pelaporan capaian dan tindak lanjut.
                        </p>
                        <div className="space-y-3">
                          {/* Capaian */}
                          <div className="p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/20 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>Capaian / Realisasi</span>
                              </label>
                              <span className="text-[10px] text-emerald-600 font-medium">
                                {actCapaian
                                  ? `${actCapaian.length} karakter`
                                  : "Hasil capaian"}
                              </span>
                            </div>
                            <textarea
                              rows={2}
                              placeholder="Tuliskan rincian capaian kegiatan yang telah tercapai..."
                              value={actCapaian}
                              onChange={(e) => setActCapaian(e.target.value)}
                              className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-gray-800 leading-relaxed placeholder:text-gray-400 shadow-2xs"
                            />
                          </div>

                          {/* Kendala / Masalah */}
                          <div className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/20 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                                <AlertCircle className="w-4 h-4 text-amber-600" />
                                <span>Kendala / Masalah</span>
                              </label>
                              <span className="text-[10px] text-amber-600 font-medium">
                                {actMasalah
                                  ? `${actMasalah.length} karakter`
                                  : "Hambatan pelaksanaan"}
                              </span>
                            </div>
                            <textarea
                              rows={2}
                              placeholder="Tuliskan hambatan atau kendala yang dihadapi selama kegiatan..."
                              value={actMasalah}
                              onChange={(e) => setActMasalah(e.target.value)}
                              className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-gray-800 leading-relaxed placeholder:text-gray-400 shadow-2xs"
                            />
                          </div>

                          {/* Solusi Masalah */}
                          <div className="p-3.5 rounded-xl border border-indigo-200/80 bg-indigo-50/20 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-indigo-800 flex items-center gap-1.5">
                                <Lightbulb className="w-4 h-4 text-indigo-600" />
                                <span>Solusi & Tindak Lanjut</span>
                              </label>
                              <span className="text-[10px] text-indigo-600 font-medium">
                                {actPemecahan
                                  ? `${actPemecahan.length} karakter`
                                  : "Rekomendasi solusi"}
                              </span>
                            </div>
                            <textarea
                              rows={2}
                              placeholder="Tuliskan solusi, penyelesaian masalah, atau rekomendasi perbaikan..."
                              value={actPemecahan}
                              onChange={(e) => setActPemecahan(e.target.value)}
                              className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-gray-800 leading-relaxed placeholder:text-gray-400 shadow-2xs"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setActModalOpen(false)}
                      disabled={savingAct}
                      className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 transition cursor-pointer shadow-2xs"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={savingAct}
                      className="px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-500/25 transition active:scale-[0.99] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                      {savingAct ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>
                            {actModalMode === "edit"
                              ? "Perbarui Aktivitas"
                              : "Simpan Aktivitas"}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Modal Alasan Penolakan Program Kerja */}
      <Transition appear show={rejectModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setRejectModalOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all border border-gray-100">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                    <div className="flex items-center gap-2 text-rose-600">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-rose-600" />
                      </div>
                      <Dialog.Title className="text-sm sm:text-base font-bold text-gray-900">
                        Alasan Penolakan Program Kerja
                      </Dialog.Title>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRejectModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs space-y-1">
                      <div className="font-semibold text-gray-800 line-clamp-2">
                        {proker?.NamaProgram || "-"}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Target Unit:{" "}
                        <span className="font-medium text-gray-700">
                          {proker?.NamaFakultasUnit || "-"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Catatan / Alasan Penolakan{" "}
                        <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={4}
                        value={alasanPenolakan}
                        onChange={(e) => setAlasanPenolakan(e.target.value)}
                        placeholder="Tuliskan catatan perbaikan atau alasan penolakan program kerja ini agar unit terkait dapat memperbaikinya..."
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white"
                        autoFocus
                      />
                      <p className="text-[11px] text-gray-400 mt-1">
                        Catatan ini akan dikirimkan kepada unit pengusul sebagai
                        bahan revisi proker.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setRejectModalOpen(false)}
                      className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitTolakProker}
                      disabled={isSubmittingReject || !alasanPenolakan.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>
                        {isSubmittingReject
                          ? "Menyimpan..."
                          : "Tolak Program Kerja"}
                      </span>
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* ======================================================== */}
      {/* MODAL: TOLAK SINGLE AKTIVITAS                           */}
      {/* ======================================================== */}
      <Transition appear show={singleRejectModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setSingleRejectModalOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all border border-gray-100 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2 text-rose-600">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-rose-600" />
                      </div>
                      <Dialog.Title className="text-sm sm:text-base font-bold text-gray-900">
                        Alasan Penolakan Aktivitas{" "}
                        {rejectRole ? `(${rejectRole.toUpperCase()})` : ""}
                      </Dialog.Title>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSingleRejectModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs space-y-1">
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                        Aktivitas yang ditolak:
                      </div>
                      <div className="font-bold text-gray-900 line-clamp-2">
                        {actToReject?.Aktivitas || "-"}
                      </div>
                      {actToReject?.PIC && (
                        <div className="text-[11px] text-gray-600">
                          PIC:{" "}
                          <span className="font-medium text-gray-800">
                            {actToReject.PIC}
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Catatan / Alasan Penolakan{" "}
                        <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={4}
                        value={singleRejectReason}
                        onChange={(e) => setSingleRejectReason(e.target.value)}
                        placeholder="Tuliskan catatan perbaikan atau alasan penolakan aktivitas ini agar unit/PIC dapat memperbaikinya..."
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white"
                        autoFocus
                      />
                      <p className="text-[11px] text-gray-400 mt-1">
                        Catatan ini akan ditampilkan pada kolom status aktivitas
                        sebagai bahan revisi.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setSingleRejectModalOpen(false)}
                      className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitSingleReject}
                      disabled={
                        isSubmittingSingleReject || !singleRejectReason.trim()
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>
                        {isSubmittingSingleReject
                          ? "Menyimpan..."
                          : "Tolak Aktivitas"}
                      </span>
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* ======================================================== */}
      {/* MODAL: TOLAK BATCH SEMUA PROKER AKTIVITAS               */}
      {/* ======================================================== */}
      <Transition appear show={batchRejectModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setBatchRejectModalOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all border border-gray-100 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2 text-rose-600">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-rose-600" />
                      </div>
                      <Dialog.Title className="text-sm sm:text-base font-bold text-gray-900">
                        Tolak {selectedActUuids.length} Aktivitas Terpilih
                      </Dialog.Title>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBatchRejectModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-xs text-rose-800 space-y-1">
                      <span className="font-bold">
                        Anda akan menolak {selectedActUuids.length} aktivitas
                        sekaligus secara paralel.
                      </span>
                      <p className="text-[11px] text-rose-700 mt-0.5">
                        Alasan penolakan berikut akan disimpan pada seluruh
                        aktivitas yang dipilih. Jika terdapat kegagalan simpan
                        pada salah satu baris, error akan langsung ditampilkan
                        pada kolom status baris tersebut.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Catatan / Alasan Penolakan Serentak{" "}
                        <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={4}
                        value={batchRejectReason}
                        onChange={(e) => setBatchRejectReason(e.target.value)}
                        placeholder="Tuliskan catatan perbaikan atau alasan penolakan serentak untuk seluruh aktivitas yang dicentang..."
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setBatchRejectModalOpen(false)}
                      className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitBatchReject}
                      disabled={
                        isSubmittingBatchReject || !batchRejectReason.trim()
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>
                        {isSubmittingBatchReject
                          ? "Menyimpan Paralel..."
                          : "Tolak Semua Proker"}
                      </span>
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* =======================================================
          MODAL REVISI ANGGARAN (TIM ANGGARAN / KEUANGAN / ADMIN)
          ======================================================= */}
      <Transition appear show={revisiModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => !isSubmittingRevisi && setRevisiModalOpen(false)}
        >
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
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <Dialog.Panel className="relative transform overflow-hidden rounded-3xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-gray-100 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-amber-50/80 via-orange-50/30 to-white">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0 ring-4 ring-amber-100">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Dialog.Title className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                          Revisi Realisasi Anggaran
                        </Dialog.Title>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          Tim Anggaran
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Sesuaikan biaya realisasi anggaran yang disetujui
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRevisiModalOpen(false)}
                    disabled={isSubmittingRevisi}
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-white hover:shadow-xs border border-transparent hover:border-gray-200 transition cursor-pointer disabled:opacity-50"
                    title="Tutup Modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body Form */}
                <form onSubmit={handleSaveRevisiAnggaran} className="p-6 space-y-4">
                  {/* Card Info Aktivitas & Anggaran Awal */}
                  <div className="bg-linear-to-br from-gray-50 to-slate-50 border border-gray-200/80 rounded-2xl p-4 space-y-3">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block mb-1">
                        Aktivitas / Kegiatan
                      </span>
                      <p className="text-xs font-bold text-gray-900 leading-snug">
                        {actToRevisi?.Aktivitas || "-"}
                      </p>
                      {actToRevisi?.PIC && (
                        <span className="text-[11px] text-gray-500 mt-0.5 block">
                          PIC: {actToRevisi.PIC}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-gray-200/70">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block mb-0.5">
                          Anggaran Awal (Pagu)
                        </span>
                        <span className="text-xs font-mono font-bold text-gray-700">
                          {formatRupiah(actToRevisi?.Anggaran)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block mb-0.5">
                          Status Realisasi Saat Ini
                        </span>
                        {hasRealisasiAnggaran(actToRevisi) ? (
                          <span className="text-xs font-mono font-bold text-emerald-700">
                            {formatRupiah(getRealisasiAnggaran(actToRevisi))}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            Belum direvisi
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Input Biaya Realisasi */}
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1.5">
                      Biaya Realisasi Anggaran (Rp)
                      <span className="text-rose-500 font-bold ml-1">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 font-mono font-bold text-xs">
                        Rp
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        value={revisiAnggaranStr}
                        onChange={handleRevisiInputChange}
                        placeholder="0"
                        className="w-full pl-11 pr-4 py-2.5 text-sm font-mono font-bold text-emerald-700 rounded-xl border border-gray-200 bg-gray-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition shadow-2xs"
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-[11px] text-gray-500">
                        Terbilang:{" "}
                        <span className="font-semibold text-gray-700">
                          {formatRupiah(revisiAnggaran)}
                        </span>
                      </p>
                      {actToRevisi?.Anggaran &&
                        Number(actToRevisi.Anggaran) !== revisiAnggaran && (
                          <button
                            type="button"
                            onClick={() => {
                              const val = Number(actToRevisi.Anggaran) || 0;
                              setRevisiAnggaran(val);
                              setRevisiAnggaranStr(
                                new Intl.NumberFormat("id-ID").format(val)
                              );
                            }}
                            className="text-[10px] font-bold text-amber-600 hover:text-amber-800 hover:underline cursor-pointer"
                          >
                            Samakan dgn Anggaran Awal
                          </button>
                        )}
                    </div>
                  </div>

                  {/* Selisih Penyesuaian */}
                  {actToRevisi?.Anggaran && (
                    <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-3 text-xs flex items-center justify-between">
                      <span className="text-amber-900 font-medium">
                        Selisih Penyesuaian:
                      </span>
                      <span
                        className={`font-mono font-bold ${
                          revisiAnggaran > Number(actToRevisi.Anggaran)
                            ? "text-rose-600"
                            : revisiAnggaran < Number(actToRevisi.Anggaran)
                            ? "text-emerald-600"
                            : "text-gray-600"
                        }`}
                      >
                        {revisiAnggaran > Number(actToRevisi.Anggaran) ? "+" : ""}
                        {formatRupiah(
                          revisiAnggaran - Number(actToRevisi.Anggaran)
                        )}
                      </span>
                    </div>
                  )}

                  {/* Footer Buttons */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setRevisiModalOpen(false)}
                      disabled={isSubmittingRevisi}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingRevisi}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-200 transition cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingRevisi ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Simpan Realisasi</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* State History Right Drawer */}
      <StateHistoryDrawer
        isOpen={historyDrawerOpen}
        onClose={() => {
          setHistoryDrawerOpen(false);
          setHistoryItem(null);
        }}
        entityUuid={historyItem?.uuid}
        title={historyItem?.title}
        subtitle="Riwayat Transisi Status & Verifikasi"
      />

      {/* Delete Activity Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDeleteActivity}
        title="Hapus Aktivitas Kegiatan?"
        message={`Apakah Anda yakin ingin menghapus aktivitas "${actToDelete?.Aktivitas}"? Semua jadwal timeline dan berkas bukti terkait akan dihapus permanen.`}
      />

      {/* Revisi Status Program Kerja ke Draft Modal */}
      <Transition appear show={revisiDraftModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setRevisiDraftModalOpen(false)}
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-amber-600 font-bold text-base">
                  <RotateCcw className="w-5 h-5" />
                  <span>Revisi Status ke Draft</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRevisiDraftModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-600">
                  Program kerja dan seluruh aktivitas di dalamnya akan dikembalikan ke status <b>Draft</b> agar dapat diedit/disesuaikan kembali oleh pengaju:
                </p>
                <div className="text-xs font-bold text-gray-900 bg-amber-50 border border-amber-200 p-2.5 rounded-lg line-clamp-2">
                  {proker?.NamaProgram}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  Catatan / Alasan Revisi <span className="text-gray-400 font-normal">(opsional)</span>
                </label>
                <textarea
                  rows={4}
                  value={alasanRevisiDraft}
                  onChange={(e) => setAlasanRevisiDraft(e.target.value)}
                  placeholder="Tuliskan catatan perbaikan atau alasan pengembalian ke status Draft..."
                  className="w-full p-3 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setRevisiDraftModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmittingRevisiDraft}
                  onClick={handleSubmitRevisiDraft}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isSubmittingRevisiDraft ? "Memproses..." : "Kembalikan ke Draft"}</span>
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
