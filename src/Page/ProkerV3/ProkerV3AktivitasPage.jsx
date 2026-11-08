import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  Fragment,
} from "react";
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
import CoaSearchSelect from "@/Components/CoaSearchSelect";
import StateHistoryDrawer from "./StateHistoryDrawer";
import ProkerV3AktivitasEvaluatorRow from "./ProkerV3AktivitasEvaluatorRow";
import RubberStamp from "../Dashboard/MonitoringProker3D/RubberStamp";
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
import { formatTanggalBulanTahun } from "@/Common/Utils";
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
  AlertTriangle,
  Save,
  Coins,
  PencilLine,
  Wallet,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Lock,
  XCircle,
  Ban,
} from "lucide-react";

const parseIkuString = (rawIku) => {
  if (!rawIku) return [];
  if (Array.isArray(rawIku)) {
    return rawIku.map((item) => {
      if (typeof item === "object" && item !== null) return item;
      return { iku: String(item), jenis: "" };
    });
  }
  if (!String(rawIku).trim()) return [];
  const itemsMap = new Map();
  String(rawIku)
    .split("||")
    .forEach((str) => {
      const parts = str.split("::");
      const iku = (parts[1] || parts[0] || "").trim();
      if (iku && !itemsMap.has(iku)) {
        itemsMap.set(iku, {
          id: parts[0] || "",
          iku: iku,
          jenis: (parts[2] || "").trim(),
        });
      }
    });
  return Array.from(itemsMap.values());
};

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
    level || localStorage.getItem("activeLevel") || user?.level || "",
  )
    .toLowerCase()
    .trim();
  const isVerifier = ["upml", "upmf", "upms", "fakultas", "evaluator"].includes(
    curRole,
  );
  const isAnggaran = ["anggaran", "keuangan"].includes(curRole);
  const isEvaluator = curRole === "evaluator" || curRole.includes("evaluator");
  const canRevisiAnggaran = isAnggaran && !isAdmin;

  // Level evaluator dan anggaran untuk tampilan detail tabel khusus
  const isEvaluatorOrAnggaran = useMemo(() => {
    const normRole = curRole.toLowerCase().trim();
    const normLevel = String(level || localStorage.getItem("activeLevel") || "")
      .toLowerCase()
      .trim();
    const userLevel = String(user?.level || "")
      .toLowerCase()
      .trim();
    const userRole = String(user?.role || "")
      .toLowerCase()
      .trim();
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
    const normLevel = String(level || localStorage.getItem("activeLevel") || "")
      .toLowerCase()
      .trim();
    const userLevel = String(user?.level || "")
      .toLowerCase()
      .trim();
    const verifierRoles = [
      "upml",
      "upmf",
      "upms",
      "fakultas",
      "evaluator",
      "verifikator",
    ];
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
          String(r.role ?? r.Role ?? "")
            .toLowerCase()
            .trim(),
        ),
      );
    }
    return false;
  }, [curRole, user?.extra_role]);

  // Data state
  const [loading, setLoading] = useState(true);
  const [proker, setProker] = useState(null);
  const [activities, setActivities] = useState([]);

  // Multi-scope support for Standar, Target, and Luaran
  const scopesList = useMemo(() => {
    const scs = proker?.Scopes || proker?.scopes || [];
    if (Array.isArray(scs) && scs.length > 0) return scs;
    if (!proker) return [];
    return [
      {
        StandarSubStandar:
          proker.StandarSubStandar || proker.standar_sub_standar || "-",
        IndikatorKinerja:
          proker.IndikatorKinerja || proker.indikator_kinerja || "",
        TargetUnpak: proker.TargetUnpak || proker.target_unpak || "-",
        TargetUnit: proker.TargetUnit || proker.target_unit || "-",
        CapaianUnitLalu:
          proker.CapaianUnitLalu || proker.capaian_unit_lalu || "-",
        Output: proker.Output || proker.output || "-",
        Outcome: proker.Outcome || proker.outcome || "-",
        IkuList: proker.IkuList || proker.iku_list || "",
      },
    ];
  }, [proker]);

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

    const prokerFuId = proker.IdFakultasUnit
      ? String(proker.IdFakultasUnit)
      : "";
    const prokerFuUuid = proker.UuidFakultasUnit
      ? String(proker.UuidFakultasUnit).toLowerCase()
      : "";
    const prokerFuName = proker.NamaFakultasUnit
      ? String(proker.NamaFakultasUnit).trim().toLowerCase()
      : "";
    const effYear = prokerYear || activeYearStr;

    // 1. Cek dari user.extra_role (penugasan ABAC)
    if (Array.isArray(user?.extra_role) && user.extra_role.length > 0) {
      const match = user.extra_role.some((r) => {
        const rRole = String(r.role ?? r.Role ?? "")
          .toLowerCase()
          .trim();
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

        const rFuUuid = String(
          r.uuid_fakultas_unit ?? r.UuidFakultasUnit ?? "",
        ).toLowerCase();
        if (rFuUuid && prokerFuUuid && rFuUuid === prokerFuUuid) return true;

        const rFuName = String(r.nama_fakultas_unit ?? r.NamaFakultasUnit ?? "")
          .trim()
          .toLowerCase();
        if (
          rFuName &&
          prokerFuName &&
          (rFuName === prokerFuName ||
            prokerFuName.includes(rFuName) ||
            rFuName.includes(prokerFuName))
        )
          return true;

        return false;
      });

      if (match) return true;
    }

    // 2. Cek dari field user langsung (hanya untuk operator biasa, bukan akun UPM)
    if (!isUpmUser) {
      const directFu = String(
        user?.fakultas_unit ||
          user?.id_fakultas_unit ||
          user?.FakultasUnit ||
          "",
      );
      if (directFu) {
        if (prokerFuId && directFu === prokerFuId) return true;
        if (prokerFuUuid && directFu.toLowerCase() === prokerFuUuid)
          return true;
        if (prokerFuName && directFu.toLowerCase() === prokerFuName)
          return true;
      }

      const directFuUuid = String(
        user?.uuid_fakultas_unit || user?.UuidFakultasUnit || "",
      ).toLowerCase();
      if (directFuUuid && prokerFuUuid && directFuUuid === prokerFuUuid)
        return true;

      const directFuName = String(
        user?.nama_fakultas_unit || user?.NamaFakultasUnit || "",
      )
        .trim()
        .toLowerCase();
      if (directFuName && prokerFuName && directFuName === prokerFuName)
        return true;
    }

    return false;
  }, [user, proker, positionYear, isUpmUser]);

  // Tombol tambah/edit/hapus aktivitas HANYA muncul di level user dengan target yang ditugaskan (bukan akun UPM dan tahun aktif harus cocok) atau Admin
  const canAddAktivitas =
    (isLevelUser || isAdmin) &&
    !isUpmUser &&
    isYearMatch &&
    (hasAssignedTarget || isAdmin);

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
  const [actRabRows, setActRabRows] = useState([]);
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

  // Standalone RAB Detail Modal State (Triggered by clicking budget/SBU badge - Gambar 2 -> Gambar 1)
  const [rabDetailModalOpen, setRabDetailModalOpen] = useState(false);
  const [rabDetailAct, setRabDetailAct] = useState(null);
  const [rabDetailRows, setRabDetailRows] = useState([]);
  const [isSavingRabDetail, setIsSavingRabDetail] = useState(false);

  // Revisi Status Proker ke Draft (Tim Anggaran, Verifikator, Admin)
  const [revisiDraftModalOpen, setRevisiDraftModalOpen] = useState(false);
  const [alasanRevisiDraft, setAlasanRevisiDraft] = useState("");
  const [isSubmittingRevisiDraft, setIsSubmittingRevisiDraft] = useState(false);
  const [prokerDocuments, setProkerDocuments] = useState([]);

  // Jadwal Proker V3 Status Check
  const [jadwalProkerStatus, setJadwalProkerStatus] = useState(null);
  const [loadingJadwalProkerStatus, setLoadingJadwalProkerStatus] =
    useState(false);

  // Batal Aktivitas State
  const [batalActModalOpen, setBatalActModalOpen] = useState(false);
  const [batalTargetAct, setBatalTargetAct] = useState(null);
  const [catatanBatalActInput, setCatatanBatalActInput] = useState("");
  const [isSubmittingBatalAct, setIsSubmittingBatalAct] = useState(false);
  const [confirmUnbatalActOpen, setConfirmUnbatalActOpen] = useState(false);

  const fetchJadwalProkerStatus = useCallback(
    async (prokerData) => {
      const targetYear = prokerData?.Tahun || positionYear || "2027";
      const targetUnitId = prokerData?.IdFakultasUnit ?? "";
      const targetUnitName = prokerData?.NamaFakultasUnit ?? "";
      let params = `tahun=${encodeURIComponent(targetYear)}`;
      if (targetUnitId) {
        params += `&id_fakultas_unit=${encodeURIComponent(targetUnitId)}`;
      }
      if (targetUnitName) {
        params += `&nama_fakultas_unit=${encodeURIComponent(targetUnitName)}`;
      }
      setLoadingJadwalProkerStatus(true);
      try {
        const resProker = await apiClient
          .get(`/proker_v3/jadwal_status?${params}`)
          .catch(() => null);
        if (resProker?.data) setJadwalProkerStatus(resProker.data);
      } catch (err) {
        console.warn("Gagal memeriksa jadwal proker:", err);
      } finally {
        setLoadingJadwalProkerStatus(false);
      }
    },
    [positionYear],
  );

  // Jadwal proker terbuka jika status jadwal proker open
  const isJadwalProkerOpen = Boolean(jadwalProkerStatus?.is_open);

  // Tombol tambah aktivitas HANYA muncul dan open jika jadwal proker ada dan sedang dibuka
  const isAktivitasScheduleOpen = Boolean(
    jadwalProkerStatus?.has_schedule && jadwalProkerStatus?.is_open,
  );

  // Fetch Data (Proker, Activities & Documents)
  const fetchData = async () => {
    if (!prokerUuid) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/proker_v3/${prokerUuid}/aktivitas`);
      const json = res.data;
      setProker(json.proker || null);
      setActivities(json.data || []);
      if (json.proker) {
        fetchJadwalProkerStatus(json.proker);
      }

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

  useEffect(() => {
    if (!proker) {
      fetchJadwalProkerStatus({ Tahun: positionYear || "2027" });
    }
  }, [proker, fetchJadwalProkerStatus, positionYear]);

  // Aggregate stats
  const { totalAnggaran, totalRealisasi, hasRealisasi } = useMemo(() => {
    let totAng = 0;
    let totReal = 0;
    let anyReal = false;
    (activities || []).forEach((curr) => {
      if (Boolean(curr.IsBatal)) return;
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
  // RAB Dinamis & Total Anggaran Handlers
  const totalActRab = useMemo(() => {
    return actRabRows.reduce((acc, r) => acc + (Number(r.total) || 0), 0);
  }, [actRabRows]);

  const totalRabDetail = useMemo(() => {
    return rabDetailRows.reduce((acc, r) => acc + (Number(r.total) || 0), 0);
  }, [rabDetailRows]);

  const handleRabRowChange = (index, field, value) => {
    if (!canEditActModalRab) return;
    setActRabRows((prev) => {
      const updated = [...prev];
      const row = { ...updated[index] };
      if (field === "coa") {
        row.no_akun = value.no_akun || "";
        row.nama_akun = value.nama_akun || "";
        row.kategori =
          value.kategori ||
          (value.no_akun && value.nama_akun
            ? `${value.no_akun} - ${value.nama_akun}`
            : value.no_akun || value.nama_akun || "");
      } else {
        row[field] = value;
        const satuan = Number(row.qty_satuan) || 0;
        const paket = Number(row.qty_paket) || 0;
        const sbuVal = Number(row.sbu) || 0;
        row.total = satuan * paket * sbuVal;
        row.harga_satuan = sbuVal;
      }
      updated[index] = row;
      return updated;
    });
  };

  const handleAddRabRow = () => {
    if (!canEditActModalRab) return;
    setActRabRows((prev) => [
      ...prev,
      {
        id: `rab-${Date.now()}-${prev.length}`,
        no_akun: "",
        nama_akun: "",
        kategori: "",
        keterangan: "",
        qty_satuan: 1,
        qty_paket: 1,
        sbu: 0,
        harga_satuan: 0,
        total: 0,
      },
    ]);
  };

  const handleRemoveRabRow = (index) => {
    if (!canEditActModalRab) return;
    setActRabRows((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length === 0) {
        return [
          {
            id: `rab-${Date.now()}-0`,
            no_akun: "",
            nama_akun: "",
            kategori: "",
            keterangan: "",
            qty_satuan: 1,
            qty_paket: 1,
            sbu: 0,
            harga_satuan: 0,
            total: 0,
          },
        ];
      }
      return updated;
    });
  };

  const handleAnggaranInputChange = (e) => {
    const rawValue = e.target.value;
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
        "Akses ditolak: Tambah aktivitas hanya untuk level user pada unit yang ditugaskan",
      );
      return;
    }
    if (!isAktivitasScheduleOpen) {
      addToast(
        "error",
        formatTanggalBulanTahun(jadwalProkerStatus?.message) ||
          "Penambahan aktivitas kegiatan saat ini ditutup sesuai jadwal program kerja.",
      );
      return;
    }
    setActModalMode("create");
    setSelectedAct(null);
    setActNama("");
    setActPic(user?.nama || proker?.PIC || "");
    setActAnggaran(0);
    setActAnggaranStr("");
    setActRabRows([
      {
        id: `rab-${Date.now()}-0`,
        no_akun: "",
        nama_akun: "",
        kategori: "",
        keterangan: "",
        qty_satuan: 1,
        qty_paket: 1,
        sbu: 0,
        harga_satuan: 0,
        total: 0,
      },
    ]);
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
        "Akses ditolak: Edit aktivitas hanya untuk level user pada unit yang ditugaskan",
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

    let initialRabRows = [];
    const sourceRab = act.RabItems || act.RAB || act.rab;
    if (sourceRab) {
      try {
        const parsed =
          typeof sourceRab === "string" ? JSON.parse(sourceRab) : sourceRab;
        if (Array.isArray(parsed) && parsed.length > 0) {
          initialRabRows = parsed.map((r, idx) => {
            const qty_satuan = Number(
              r.qty_satuan !== undefined
                ? r.qty_satuan
                : r.QtySatuan !== undefined
                  ? r.QtySatuan
                  : 1,
            );
            const qty_paket = Number(
              r.qty_paket !== undefined
                ? r.qty_paket
                : r.QtyPaket !== undefined
                  ? r.QtyPaket
                  : 1,
            );
            const sbuVal = Number(
              r.sbu !== undefined
                ? r.sbu
                : r.SBU !== undefined
                  ? r.SBU
                  : r.harga_satuan !== undefined
                    ? r.harga_satuan
                    : 0,
            );
            const totalVal =
              r.total !== undefined
                ? Number(r.total)
                : r.Total !== undefined
                  ? Number(r.Total)
                  : qty_satuan * qty_paket * sbuVal;
            const noAkun = r.no_akun || r.NoAkun || "";
            const namaAkun = r.nama_akun || r.NamaAkun || "";
            return {
              id: r.id || r.uuid || `rab-${Date.now()}-${idx}`,
              no_akun: noAkun,
              nama_akun: namaAkun,
              kategori:
                r.kategori ||
                r.Kategori ||
                (noAkun && namaAkun
                  ? `${noAkun} - ${namaAkun}`
                  : noAkun || namaAkun || ""),
              keterangan:
                r.keterangan || r.Keterangan || r.rincian || r.Rincian || "",
              qty_satuan,
              qty_paket,
              sbu: sbuVal,
              harga_satuan: sbuVal,
              total: totalVal,
            };
          });
        }
      } catch (err) {
        console.warn("Gagal parse RAB aktivitas:", err);
      }
    }

    if (initialRabRows.length === 0) {
      initialRabRows = [
        {
          id: `rab-${Date.now()}-0`,
          no_akun: "",
          nama_akun: "",
          kategori: "",
          keterangan: initialAnggaran > 0 ? "Alokasi Anggaran Kegiatan" : "",
          qty_satuan: 1,
          qty_paket: 1,
          sbu: initialAnggaran,
          harga_satuan: initialAnggaran,
          total: initialAnggaran,
        },
      ];
    }
    setActRabRows(initialRabRows);

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
    if (actModalMode !== "edit" && !isAktivitasScheduleOpen) {
      addToast(
        "error",
        formatTanggalBulanTahun(jadwalProkerStatus?.message) ||
          "Penambahan aktivitas kegiatan saat ini ditutup sesuai jadwal program kerja.",
      );
      return;
    }
    if (!actNama.trim()) {
      addToast("warning", "Nama aktivitas / kegiatan wajib diisi");
      return;
    }

    const calculatedTotalAnggaran = actRabRows.reduce(
      (sum, r) => sum + (Number(r.total) || 0),
      0,
    );

    // Validasi pembatasan pagu unit (Case 2: jika pagu ada > 0 dan BUKAN beban yayasan)
    const isBebanYayasan = Boolean(
      proker?.BebanYayasan || proker?.beban_yayasan,
    );
    if (!isBebanYayasan && proker?.HasPagu && Number(proker?.PaguUnit) > 0) {
      const paguUnit = Number(proker.PaguUnit);
      const totalTerpakai = Number(proker.TotalAnggaranUnit) || 0;
      const oldActAnggaran =
        actModalMode === "edit" ? Number(selectedAct?.Anggaran) || 0 : 0;
      const delta = calculatedTotalAnggaran - oldActAnggaran;
      if (delta > 0 && totalTerpakai + delta > paguUnit) {
        const sisaAllowed = Math.max(
          0,
          paguUnit - (totalTerpakai - oldActAnggaran),
        );
        addToast(
          "error",
          `Total alokasi anggaran (${formatRupiah(calculatedTotalAnggaran)}) melebihi pagu unit tahun ${proker.Tahun || ""}. Maksimal alokasi untuk aktivitas ini: ${formatRupiah(sisaAllowed)} (Pagu: ${formatRupiah(paguUnit)}, Terpakai: ${formatRupiah(totalTerpakai)})`,
        );
        return;
      }
    }

    setSavingAct(true);
    try {
      const fd = new FormData();
      fd.append("aktivitas", actNama.trim());
      fd.append("pic", actPic.trim());
      fd.append("anggaran", String(calculatedTotalAnggaran));
      fd.append("rab", JSON.stringify(actRabRows));
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
      addToast(
        "error",
        err?.response?.data?.error ||
          err?.message ||
          "Terjadi kesalahan sistem",
      );
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
    if (isActApprovedByEvaluator(actToDelete)) {
      addToast(
        "warning",
        "Aktivitas tidak dapat dihapus karena sudah disetujui oleh evaluator",
      );
      setConfirmDelete(false);
      setActToDelete(null);
      return;
    }
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
      currReal !== null && currReal !== undefined
        ? currReal
        : Number(act.Anggaran) || 0;
    setRevisiAnggaran(initialVal);
    setRevisiAnggaranStr(
      initialVal > 0 ? new Intl.NumberFormat("id-ID").format(initialVal) : "0",
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
        `Realisasi anggaran aktivitas "${actToRevisi.Aktivitas}" berhasil disimpan: ${formatRupiah(revisiAnggaran)}`,
      );
      setRevisiModalOpen(false);
      setActToRevisi(null);
      fetchData();
    } catch (err) {
      addToast(
        "error",
        err?.message || "Gagal memperbarui realisasi anggaran aktivitas",
      );
    } finally {
      setIsSubmittingRevisi(false);
    }
  };

  // ==========================================
  // PENCAIRAN ANGGARAN HANDLERS & HELPERS
  // ==========================================
  const getSumAktivitasRab = (act) => {
    if (!act) return 0;
    if (Array.isArray(act.RabItems) && act.RabItems.length > 0) {
      return act.RabItems.reduce((acc, r) => {
        const t = Number(r.total || r.Total || 0);
        if (t > 0) return acc + t;
        const qs = Number(r.qty_satuan || r.QtySatuan || 0);
        const qp = Number(r.qty_paket || r.QtyPaket || 0);
        const sbu = Number(
          r.sbu || r.SBU || r.harga_satuan || r.HargaSatuan || 0,
        );
        return acc + qs * qp * sbu;
      }, 0);
    }
    return Number(act.Anggaran || 0);
  };

  const getPencairanStatus = (act) => {
    const sumRab = getSumAktivitasRab(act);
    const pengajuan =
      sumRab > 0 ? sumRab : Number(act?.Anggaran || act?.anggaran) || 0;

    // Cek data realisasi dari tim anggaran (hasil revisi)
    const hasReal = hasRealisasiAnggaran(act);
    const realisasiNominal = hasReal ? getRealisasiAnggaran(act) : null;

    // Angka pembanding: gunakan realisasi jika ada, fallback ke pengajuan (RAB) jika belum ada revisi realisasi
    const targetBanding =
      hasReal && realisasiNominal !== null && realisasiNominal !== undefined
        ? realisasiNominal
        : pengajuan;

    const rawPencairan =
      act?.Pencairan !== undefined &&
      act?.Pencairan !== null &&
      act?.Pencairan !== ""
        ? Number(act.Pencairan)
        : act?.pencairan !== undefined &&
            act?.pencairan !== null &&
            act?.pencairan !== ""
          ? Number(act.pencairan)
          : null;

    if (rawPencairan === null || rawPencairan === 0) {
      return {
        status: "belum_cair",
        label: "Belum Dicairkan",
        nominal: 0,
        targetBanding,
        pengajuan,
        realisasi: realisasiNominal,
        selisih: 0,
        persen: 0,
        className: "bg-slate-100 text-slate-600 border-slate-200",
        dotClass: "bg-slate-400",
      };
    }

    const selisih = rawPencairan - targetBanding;
    const persen =
      targetBanding > 0 ? Math.round((rawPencairan / targetBanding) * 100) : 0;

    if (rawPencairan === targetBanding) {
      return {
        status: "cair",
        label: "Cair Penuh",
        nominal: rawPencairan,
        targetBanding,
        pengajuan,
        realisasi: realisasiNominal,
        selisih: 0,
        persen: 100,
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dotClass: "bg-emerald-500",
      };
    }

    if (rawPencairan < targetBanding) {
      return {
        status: "tidak_penuh",
        label: "Cair Sebagian",
        nominal: rawPencairan,
        targetBanding,
        pengajuan,
        realisasi: realisasiNominal,
        selisih,
        persen,
        className: "bg-amber-50 text-amber-700 border-amber-200",
        dotClass: "bg-amber-500",
      };
    }

    return {
      status: "kelebihan",
      label: "Melebihi Anggaran",
      nominal: rawPencairan,
      targetBanding,
      pengajuan,
      realisasi: realisasiNominal,
      selisih,
      persen,
      className: "bg-rose-50 text-rose-700 border-rose-200",
      dotClass: "bg-rose-500",
    };
  };

  // ==========================================
  // DETAIL / EDIT RAB MODAL HANDLERS (GAMBAR 2 -> GAMBAR 1)
  // ==========================================
  const openRabDetailModal = (act) => {
    setRabDetailAct(act);
    const initialAnggaran = Number(act.Anggaran) || 0;
    let initialRabRows = [];
    const sourceRab = act.RabItems || act.RAB || act.rab;
    if (sourceRab) {
      try {
        const parsed =
          typeof sourceRab === "string" ? JSON.parse(sourceRab) : sourceRab;
        if (Array.isArray(parsed) && parsed.length > 0) {
          initialRabRows = parsed.map((r, idx) => {
            const qty_satuan = Number(
              r.qty_satuan !== undefined
                ? r.qty_satuan
                : r.QtySatuan !== undefined
                  ? r.QtySatuan
                  : 1,
            );
            const qty_paket = Number(
              r.qty_paket !== undefined
                ? r.qty_paket
                : r.QtyPaket !== undefined
                  ? r.QtyPaket
                  : 1,
            );
            const sbuVal = Number(
              r.sbu !== undefined
                ? r.sbu
                : r.SBU !== undefined
                  ? r.SBU
                  : r.harga_satuan !== undefined
                    ? r.harga_satuan
                    : 0,
            );
            const totalVal =
              r.total !== undefined
                ? Number(r.total)
                : r.Total !== undefined
                  ? Number(r.Total)
                  : qty_satuan * qty_paket * sbuVal;
            const noAkun = r.no_akun || r.NoAkun || "";
            const namaAkun = r.nama_akun || r.NamaAkun || "";
            return {
              id: r.id || r.uuid || `rab-${Date.now()}-${idx}`,
              no_akun: noAkun,
              nama_akun: namaAkun,
              kategori:
                r.kategori ||
                r.Kategori ||
                (noAkun && namaAkun
                  ? `${noAkun} - ${namaAkun}`
                  : noAkun || namaAkun || ""),
              keterangan:
                r.keterangan || r.Keterangan || r.rincian || r.Rincian || "",
              qty_satuan,
              qty_paket,
              sbu: sbuVal,
              harga_satuan: sbuVal,
              total: totalVal,
            };
          });
        }
      } catch (err) {
        console.warn("Gagal parse RAB aktivitas:", err);
      }
    }

    if (initialRabRows.length === 0) {
      initialRabRows = [
        {
          id: `rab-${Date.now()}-0`,
          no_akun: "",
          nama_akun: "",
          kategori: "",
          keterangan: initialAnggaran > 0 ? "Alokasi Anggaran Kegiatan" : "",
          qty_satuan: 1,
          qty_paket: 1,
          sbu: initialAnggaran,
          harga_satuan: initialAnggaran,
          total: initialAnggaran,
        },
      ];
    }
    setRabDetailRows(initialRabRows);
    setRabDetailModalOpen(true);
  };

  const handleRabDetailRowChange = (index, field, value) => {
    if (!canEditRabDetail) return;
    setRabDetailRows((prev) => {
      const next = [...prev];
      const row = { ...next[index] };

      if (field === "coa") {
        row.no_akun = value.no_akun || "";
        row.nama_akun = value.nama_akun || "";
        row.kategori =
          value.kategori ||
          (value.no_akun && value.nama_akun
            ? `${value.no_akun} - ${value.nama_akun}`
            : value.no_akun || value.nama_akun || "");
      } else if (
        field === "qty_satuan" ||
        field === "qty_paket" ||
        field === "sbu"
      ) {
        const numVal = Number(value) || 0;
        row[field] = numVal;
        if (field === "sbu") row.harga_satuan = numVal;
        const qs =
          field === "qty_satuan" ? numVal : Number(row.qty_satuan) || 0;
        const qp = field === "qty_paket" ? numVal : Number(row.qty_paket) || 0;
        const sbu = field === "sbu" ? numVal : Number(row.sbu) || 0;
        row.total = qs * qp * sbu;
      } else {
        row[field] = value;
      }

      next[index] = row;
      return next;
    });
  };

  const handleAddRabDetailRow = () => {
    if (!canEditRabDetail) return;
    setRabDetailRows((prev) => [
      ...prev,
      {
        id: `rab-${Date.now()}-${prev.length}`,
        no_akun: "",
        nama_akun: "",
        kategori: "",
        keterangan: "",
        qty_satuan: 1,
        qty_paket: 1,
        sbu: 0,
        harga_satuan: 0,
        total: 0,
      },
    ]);
  };

  const handleRemoveRabDetailRow = (index) => {
    if (!canEditRabDetail) return;
    if (rabDetailRows.length <= 1) {
      addToast("warning", "Minimal harus ada 1 baris rincian anggaran.");
      return;
    }
    setRabDetailRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveRabDetail = async () => {
    if (!rabDetailAct?.UUID) return;
    if (!canEditRabDetail) {
      addToast(
        "warning",
        "Akses ditolak: Hanya level user pemilik fakultas/unit yang dapat mengubah RAB.",
      );
      return;
    }

    const calculatedTotalAnggaran = rabDetailRows.reduce(
      (sum, r) => sum + (Number(r.total) || 0),
      0,
    );

    // Validasi pembatasan pagu unit (Case 2: jika pagu ada > 0 dan BUKAN beban yayasan)
    const isBebanYayasan = Boolean(
      proker?.BebanYayasan || proker?.beban_yayasan,
    );
    if (!isBebanYayasan && proker?.HasPagu && Number(proker?.PaguUnit) > 0) {
      const paguUnit = Number(proker.PaguUnit);
      const totalTerpakai = Number(proker.TotalAnggaranUnit) || 0;
      const oldActAnggaran = Number(rabDetailAct?.Anggaran) || 0;
      const delta = calculatedTotalAnggaran - oldActAnggaran;
      if (delta > 0 && totalTerpakai + delta > paguUnit) {
        const sisaAllowed = Math.max(
          0,
          paguUnit - (totalTerpakai - oldActAnggaran),
        );
        addToast(
          "error",
          `Total alokasi anggaran (${formatRupiah(calculatedTotalAnggaran)}) melebihi pagu unit tahun ${proker.Tahun || ""}. Maksimal alokasi untuk aktivitas ini: ${formatRupiah(sisaAllowed)} (Pagu: ${formatRupiah(paguUnit)}, Terpakai: ${formatRupiah(totalTerpakai)})`,
        );
        return;
      }
    }

    setIsSavingRabDetail(true);
    try {
      const fd = new FormData();
      fd.append("anggaran", String(calculatedTotalAnggaran));
      fd.append("rab", JSON.stringify(rabDetailRows));

      await apiClient.put(`/proker_v3/aktivitas/${rabDetailAct.UUID}`, fd);
      addToast(
        "success",
        `Rincian Anggaran Biaya aktivitas "${rabDetailAct.Aktivitas}" berhasil diperbarui: ${formatRupiah(calculatedTotalAnggaran)}`,
      );
      setRabDetailModalOpen(false);
      setRabDetailAct(null);
      await fetchData();
    } catch (err) {
      addToast(
        "error",
        err?.response?.data?.error || err?.message || "Gagal memperbarui RAB",
      );
    } finally {
      setIsSavingRabDetail(false);
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
        err?.response?.data?.error ||
          err?.message ||
          "Gagal mengembalikan status ke Draft",
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
      addToast(
        "error",
        err?.message || "Gagal mengembalikan aktivitas ke Draft",
      );
    }
  };

  const handleToggleBatalAktivitas = (act) => {
    if (Boolean(proker?.IsBatal)) {
      addToast(
        "warning",
        "Program kerja ini dalam status dibatalkan. Untuk mengaktifkan aktivitas, aktifkan kembali program kerja pada halaman daftar proker.",
      );
      return;
    }
    if (Boolean(act.IsBatal)) {
      setBatalTargetAct(act);
      setConfirmUnbatalActOpen(true);
    } else {
      setBatalTargetAct(act);
      setCatatanBatalActInput("");
      setBatalActModalOpen(true);
    }
  };

  const handleSubmitBatalAct = async () => {
    if (!batalTargetAct?.UUID) return;
    if (!catatanBatalActInput.trim()) {
      addToast("warning", "Catatan alasan pembatalan aktivitas wajib diisi");
      return;
    }
    setIsSubmittingBatalAct(true);
    try {
      const fd = new FormData();
      fd.append("is_batal", "1");
      fd.append("catatan_batal", catatanBatalActInput.trim());
      await apiClient.put(`/proker_v3/aktivitas/${batalTargetAct.UUID}/batal`, fd);
      addToast(
        "success",
        `Aktivitas "${batalTargetAct.Aktivitas}" berhasil dibatalkan`,
      );
      setBatalActModalOpen(false);
      setBatalTargetAct(null);
      setCatatanBatalActInput("");
      await fetchData();
    } catch (err) {
      addToast(
        "error",
        err?.response?.data?.error ||
          err?.message ||
          "Gagal membatalkan aktivitas",
      );
    } finally {
      setIsSubmittingBatalAct(false);
    }
  };

  const handleConfirmUnbatalAct = async () => {
    if (!batalTargetAct?.UUID) return;
    setIsSubmittingBatalAct(true);
    try {
      const fd = new FormData();
      fd.append("is_batal", "0");
      fd.append("catatan_batal", "");
      await apiClient.put(`/proker_v3/aktivitas/${batalTargetAct.UUID}/batal`, fd);
      addToast(
        "success",
        `Status pembatalan aktivitas "${batalTargetAct.Aktivitas}" berhasil dibatalkan (diaktifkan kembali)`,
      );
      setConfirmUnbatalActOpen(false);
      setBatalTargetAct(null);
      await fetchData();
    } catch (err) {
      addToast(
        "error",
        err?.response?.data?.error ||
          err?.message ||
          "Gagal mengaktifkan kembali aktivitas",
      );
    } finally {
      setIsSubmittingBatalAct(false);
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
    (
      proker?.TypeFakultasUnit ||
      proker?.type_fakultas_unit ||
      ""
    ).toLowerCase() === "prodi" ||
    (proker?.NamaFakultasUnit || proker?.nama_fakultas_unit || "")
      .toLowerCase()
      .includes("prodi");

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

  // Helper: periksa apakah aktivitas atau parent proker sudah di approve evaluator
  const isActApprovedByEvaluator = useCallback(
    (act) => {
      const pMainStr = (proker?.Status || "").toLowerCase().trim();
      const pVerifStr = (proker?.StatusVerifikator || "").toLowerCase().trim();
      const actMain = (act?.Status || "").toLowerCase().trim();
      const actVerif = (act?.StatusVerifikator || "").toLowerCase().trim();
      const actLpm = (act?.StatusLpm || "").toLowerCase().trim();
      const actAngg = (act?.StatusAnggaran || "").toLowerCase().trim();

      const isParentApproved =
        !["draft", "revisi", "ditolak"].includes(pMainStr) &&
        !["draft", "revisi", "ditolak"].includes(pVerifStr) &&
        (isProkerAccVerifikator ||
          pVerifStr === "terima_verifikator" ||
          pVerifStr === "disetujui" ||
          pMainStr === "disetujui" ||
          pMainStr === "terima_anggaran");

      const isRowApproved =
        !["draft", "revisi", "ditolak"].includes(actMain) &&
        !["draft", "revisi", "ditolak"].includes(actVerif) &&
        (actVerif === "terima_verifikator" ||
          actVerif === "disetujui" ||
          actVerif.includes("diverifikasi") ||
          actLpm === "disetujui" ||
          actMain === "disetujui" ||
          actMain === "terima_anggaran" ||
          actAngg === "terima_anggaran");

      return Boolean(isParentApproved || isRowApproved);
    },
    [proker, isProkerAccVerifikator],
  );

  // Periksa apakah RAB aktivitas dikunci karena status sudah diverifikasi verifikator atau anggaran
  const isActRabLocked = useCallback(
    (act) => {
      if (!act) return false;
      const normalize = (v) =>
        String(v || "")
          .toLowerCase()
          .trim();
      const isVerifApproved = (v) => {
        const val = normalize(v);
        return (
          val.includes("terima_verifikator") ||
          val.includes("disetujui") ||
          val.includes("approved") ||
          val.includes("diterima")
        );
      };

      const isAnggaranApproved = (v) => {
        const val = normalize(v);
        return (
          val.includes("terima_anggaran") ||
          val.includes("disetujui") ||
          val.includes("approved") ||
          val.includes("diterima")
        );
      };

      const actStatus = normalize(act.Status || act.status);
      const actVerif = normalize(
        act.StatusVerifikator || act.status_verifikator,
      );
      const actAngg = normalize(act.StatusAnggaran || act.status_anggaran);

      const pStatus = normalize(proker?.Status || proker?.status);
      const pVerif = normalize(
        proker?.StatusVerifikator || proker?.status_verifikator,
      );
      const pAngg = normalize(
        proker?.StatusAnggaran || proker?.status_anggaran,
      );

      const isProkerLocked =
        (isVerifApproved(pVerif) && isAnggaranApproved(pAngg)) ||
        pStatus.includes("terima_anggaran");

      const isActLocked =
        (isVerifApproved(actVerif) && isAnggaranApproved(actAngg)) ||
        actStatus.includes("terima_anggaran") ||
        isAnggaranApproved(actAngg);

      return isProkerLocked || isActLocked;
    },
    [proker],
  );

  const isRabDetailLocked = Boolean(isActRabLocked(rabDetailAct));
  const isActModalRabLocked =
    actModalMode === "edit" && Boolean(isActRabLocked(selectedAct));

  // Tombol tambah, simpan, dan hapus RAB hanya muncul di level user yang memiliki fakultas_unit tersebut
  const canUserManageRab =
    isLevelUser && !isUpmUser && isYearMatch && hasAssignedTarget;
  const canEditRabDetail = canUserManageRab && !isRabDetailLocked;
  const canEditActModalRab = canUserManageRab && !isActModalRabLocked;

  // Tombol revisi ke draft hanya tampil ketika status Verifikasi UPM / Verifikasi Anggaran diterima/ditolak,
  // hanya muncul di level verifikator dan anggaran
  const canRevisiDraftProker = useMemo(() => {
    if (!isVerifier && !isAnggaran) return false;
    const isVerifierDone =
      isProkerAccVerifikator ||
      pVerif === "ditolak" ||
      pMain.includes("ditolak");
    const isAnggaranDone = isProkerAccAnggaran || pAngg === "ditolak";
    if (isVerifier) return isVerifierDone;
    if (isAnggaran) return isAnggaranDone;
    return false;
  }, [
    isVerifier,
    isAnggaran,
    isProkerAccVerifikator,
    isProkerAccAnggaran,
    pVerif,
    pAngg,
    pMain,
  ]);

  // Tombol revisi aktivitas ke draft di tabel: TIDAK ada pada role upml, upmf, upms, dan level anggaran (Gambar 1)
  const canRevisiActDraft = useMemo(() => {
    if (isAnggaran) return false;
    if (["upml", "upmf", "upms"].includes(curRole)) return false;
    return isAdmin;
  }, [curRole, isAdmin, isAnggaran]);

  // Verifikator (upml, upmf, upms, evaluator) dan admin yang memverifikasi aktivitas
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
      await apiClient.put(
        `/proker_v3/aktivitas/${actToReject.UUID}/status`,
        fd,
      );
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

  const renderStatusStamp = (statusStr) => {
    const s = (statusStr || "draft").toLowerCase().replace(/_/g, " ").trim();
    let statusType = "kosong";
    let mainText = "DRAF";
    let headerText = "★ STATUS PROKER ★";
    let subText = "BELUM DIAJUKAN";

    if (s === "terima anggaran") {
      statusType = "terverifikasi";
      mainText = "TERIMA ANGGARAN";
      headerText = "★ LPMI UNPAK ★";
      subText = "SAH & DITERIMA";
    } else if (s === "disetujui") {
      statusType = "terverifikasi";
      mainText = "DISETUJUI";
      headerText = "★ LPMI UNPAK ★";
      subText = "SAH & MEMENUHI STANDAR";
    } else if (s === "selesai") {
      statusType = "terverifikasi";
      mainText = "SELESAI";
      headerText = "★ PROGRAM RESMI ★";
      subText = "TELAH TERLAKSANA";
    } else if (s.includes("ditolak")) {
      statusType = "gagal";
      mainText = "DITOLAK";
      headerText = "✖ TIM AUDITOR ✖";
      subText =
        proker?.CatatanPenolakan ||
        proker?.CatatanVerifikator ||
        proker?.CatatanAnggaran ||
        "PERLU PERBAIKAN";
    } else if (s === "menunggu upms" || s === "diverifikasi upmf") {
      statusType = "verifikasi";
      mainText = "MENUNGGU UPMS";
      headerText = "★ AUDIT PRODI ★";
      subText = "EVALUASI UPMS";
    } else if (s === "menunggu upmf" || s === "diverifikasi upml") {
      statusType = "verifikasi";
      mainText = "MENUNGGU UPMF";
      headerText = "★ AUDIT FAKULTAS ★";
      subText = "EVALUASI UPMF";
    } else if (s === "menunggu upml") {
      statusType = "verifikasi";
      mainText = "MENUNGGU UPML";
      headerText = "★ AUDIT LEMBAGA ★";
      subText = "EVALUASI UPML";
    } else if (s === "diajukan") {
      statusType = "verifikasi";
      mainText = "DIAJUKAN";
      headerText = "★ VERIFIKASI PROKER ★";
      subText = "MENUNGGU REVIEW";
    }

    return (
      <RubberStamp
        status={statusType}
        size="sm"
        customText={mainText}
        headerText={headerText}
        subText={subText}
        delay={0.1}
      />
    );
  };

  const renderTableRubberStamp = (
    rawStatus,
    roleCode,
    note,
    isApplicable = true,
    actStatusStr = "",
  ) => {
    if (!isApplicable) {
      return (
        <span
          className="text-gray-400 font-mono text-xs italic"
          title="Tidak berlaku untuk unit non-prodi"
        >
          -
        </span>
      );
    }

    const s = String(rawStatus || "")
      .toLowerCase()
      .trim();
    if (s === "-" || s === "strip") {
      return <span className="text-gray-400 font-mono text-xs italic">-</span>;
    }

    let statusType = "kosong";
    let mainText = "DRAF";
    let topHeader = `★ AUDIT ${roleCode} ★`;
    let bottomSub = "BELUM DIAJUKAN";

    if (s === "disetujui") {
      statusType = "terverifikasi";
      mainText = "DISETUJUI";
      topHeader = `★ VERIFIKATOR ${roleCode} ★`;
      bottomSub = "SAH & MEMENUHI STANDAR";
    } else if (s === "ditolak") {
      statusType = "gagal";
      mainText = "DITOLAK";
      topHeader = `✖ AUDITOR ${roleCode} ✖`;
      bottomSub = note
        ? note.length > 20
          ? note.slice(0, 18) + "..."
          : note
        : "PERLU PERBAIKAN";
    } else if (s === "revisi") {
      statusType = "gagal";
      mainText = "REVISI";
      topHeader = `✖ AUDITOR ${roleCode} ✖`;
      bottomSub = note
        ? note.length > 20
          ? note.slice(0, 18) + "..."
          : note
        : "PERLU PERBAIKAN";
    } else if (s === "menunggu" || actStatusStr === "diajukan") {
      statusType = "verifikasi";
      mainText = "MENUNGGU";
      topHeader = `VERIFIKASI ${roleCode}`;
      bottomSub = "MENUNGGU EVALUASI";
    }

    return (
      <div className="flex flex-col items-start gap-1 py-1">
        <RubberStamp
          status={statusType}
          size="sm"
          customText={mainText}
          headerText={topHeader}
          subText={bottomSub}
          delay={0.05}
        />
        {(s === "ditolak" || s === "revisi") && note && (
          <span
            className={`text-[9.5px] italic px-1.5 py-0.5 rounded border line-clamp-2 max-w-[150px] ${
              s === "ditolak"
                ? "text-rose-700 bg-rose-50 border-rose-200"
                : "text-amber-700 bg-amber-50 border-amber-200"
            }`}
            title={`Catatan ${roleCode}: ${note}`}
          >
            "{note}"
          </span>
        )}
      </div>
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

                <div className="flex flex-wrap items-center gap-3">
                  {renderStatusStamp(prokerStatusClean)}
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
                <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-2">
                  <div className="flex items-center justify-between gap-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-700">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Standar & Sub Standar</span>
                    </div>
                    {scopesList.length > 1 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[9px] font-mono font-bold">
                        {scopesList.length} Standar
                      </span>
                    )}
                  </div>
                  <div
                    className={`space-y-2.5 max-h-56 overflow-y-auto pr-1 ${
                      scopesList.length > 1 ? "divide-y divide-gray-200/70" : ""
                    }`}
                  >
                    {scopesList.map((sc, idx) => {
                      const ikus = parseIkuString(sc.IkuList || sc.iku_list);
                      return (
                        <div
                          key={idx}
                          className={idx > 0 ? "pt-2 space-y-1" : "space-y-1"}
                        >
                          <div className="flex items-start gap-1.5">
                            {scopesList.length > 1 && (
                              <span className="shrink-0 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md bg-purple-100/80 text-purple-800 border border-purple-200 mt-0.5">
                                #{idx + 1}
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <p
                                className="text-xs font-semibold text-gray-800 line-clamp-2"
                                title={
                                  sc.StandarSubStandar ||
                                  sc.standar_sub_standar
                                }
                              >
                                {sc.StandarSubStandar ||
                                  sc.standar_sub_standar ||
                                  "-"}
                              </p>
                              {(sc.IndikatorKinerja ||
                                sc.indikator_kinerja) && (
                                <p
                                  className="text-[11px] text-gray-500 italic line-clamp-2 mt-0.5"
                                  title={
                                    sc.IndikatorKinerja || sc.indikator_kinerja
                                  }
                                >
                                  Indikator:{" "}
                                  {sc.IndikatorKinerja || sc.indikator_kinerja}
                                </p>
                              )}
                            </div>
                          </div>
                          {ikus.length > 0 && (
                            <div
                              className={`flex flex-wrap items-center gap-1 ${
                                scopesList.length > 1 ? "pl-6" : ""
                              }`}
                            >
                              {ikus.map((it, iIdx) => (
                                <span
                                  key={iIdx}
                                  className="px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold font-mono border border-purple-200"
                                  title={
                                    it.iku + (it.jenis ? ` (${it.jenis})` : "")
                                  }
                                >
                                  {it.iku}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Target Unpak & Target Unit */}
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2">
                  <div className="flex items-center justify-between gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    <div className="flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" />
                      <span>Target Capaian</span>
                    </div>
                    {scopesList.length > 1 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-mono font-bold">
                        {scopesList.length} Target
                      </span>
                    )}
                  </div>
                  <div
                    className={`space-y-2.5 max-h-56 overflow-y-auto pr-1 ${
                      scopesList.length > 1
                        ? "divide-y divide-emerald-200/70"
                        : ""
                    }`}
                  >
                    {scopesList.map((sc, idx) => (
                      <div
                        key={idx}
                        className={idx > 0 ? "pt-2 space-y-1" : "space-y-1"}
                      >
                        {scopesList.length > 1 && (
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md bg-emerald-100/80 text-emerald-800 border border-emerald-200">
                              #{idx + 1}
                            </span>
                          </div>
                        )}
                        <div className="text-xs text-gray-700 flex items-start justify-between gap-1">
                          <span className="text-gray-500">Target Unpak:</span>
                          <b className="text-emerald-700 text-right">
                            {sc.TargetUnpak || sc.target_unpak || "-"}
                          </b>
                        </div>
                        <div className="text-xs text-gray-700 flex items-start justify-between gap-1">
                          <span className="text-purple-700 font-medium">
                            Target Unit:
                          </span>
                          <b className="text-purple-800 text-right">
                            {sc.TargetUnit || sc.target_unit || "-"}
                          </b>
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-start justify-between gap-1 pt-0.5 border-t border-emerald-100/60">
                          <span className="italic">Capaian Lalu:</span>
                          <span className="text-gray-600 text-right">
                            {sc.CapaianUnitLalu || sc.capaian_unit_lalu || "-"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Output & Outcome */}
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
                  <div className="flex items-center justify-between gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-800">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Luaran & Dampak</span>
                    </div>
                    {scopesList.length > 1 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[9px] font-mono font-bold">
                        {scopesList.length} Luaran
                      </span>
                    )}
                  </div>
                  <div
                    className={`space-y-2.5 max-h-56 overflow-y-auto pr-1 ${
                      scopesList.length > 1
                        ? "divide-y divide-indigo-200/70"
                        : ""
                    }`}
                  >
                    {scopesList.map((sc, idx) => (
                      <div
                        key={idx}
                        className={idx > 0 ? "pt-2 space-y-1" : "space-y-1"}
                      >
                        {scopesList.length > 1 && (
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md bg-indigo-100/80 text-indigo-800 border border-indigo-200">
                              #{idx + 1}
                            </span>
                          </div>
                        )}
                        <div className="text-xs text-gray-700">
                          <b className="text-indigo-900">Output:</b>{" "}
                          <span
                            className="line-clamp-2"
                            title={sc.Output || sc.output}
                          >
                            {sc.Output || sc.output || "-"}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          <b className="text-indigo-900">Outcome:</b>{" "}
                          <span
                            className="line-clamp-2"
                            title={sc.Outcome || sc.outcome}
                          >
                            {sc.Outcome || sc.outcome || "-"}
                          </span>
                        </div>
                      </div>
                    ))}
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
                      formatRupiah(
                        hasRealisasi ? totalRealisasi : totalAnggaran,
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Jadwal Pengajuan Proker Status Alert */}
        {jadwalProkerStatus && (
          <div
            className={`p-3.5 sm:px-4 sm:py-3 rounded-2xl border flex items-center justify-between gap-3 text-xs sm:text-sm font-medium ${
              jadwalProkerStatus.is_open
                ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                : "bg-rose-50/80 border-rose-200 text-rose-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {jadwalProkerStatus.is_open ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>
                <strong>
                  Jadwal Pengajuan Proker{" "}
                  {jadwalProkerStatus.tahun ||
                    proker?.Tahun ||
                    positionYear ||
                    "2027"}
                  :
                </strong>{" "}
                {formatTanggalBulanTahun(jadwalProkerStatus.message)}
              </span>
            </div>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 border ${
                jadwalProkerStatus.is_open
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : "bg-rose-100 text-rose-800 border-rose-300"
              }`}
            >
              {jadwalProkerStatus.status_label ||
                (jadwalProkerStatus.is_open ? "Sedang Dibuka" : "Ditutup")}
            </span>
          </div>
        )}

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
              {canAddAktivitas && isAktivitasScheduleOpen && (
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
                      <th className="py-3 px-4 min-w-[170px]">
                        Dokumen Proker
                      </th>
                      <th className="py-3 px-4 min-w-[210px]">
                        Jadwal & Bukti
                      </th>
                    </>
                  )}
                  <th className="py-3 px-4 min-w-[150px]">
                    {isProdi ? "Status UPMS" : "Status UPML"}
                  </th>
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
                        {canAddAktivitas && isAktivitasScheduleOpen
                          ? 'Klik tombol "+ Tambah Aktivitas Baru" di atas untuk mulai membuat kegiatan'
                          : !isAktivitasScheduleOpen
                            ? "Pembuatan aktivitas kegiatan saat ini ditutup sesuai jadwal program kerja."
                            : "Aktivitas kegiatan belum dibuat oleh unit kerja"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  activities.map((act, idx) => {
                    const actStatusStr = (act.Status || "draft").toLowerCase();
                    const isUnitProdi =
                      (
                        act.TypeFakultasUnit ||
                        proker?.TypeFakultasUnit ||
                        proker?.type_fakultas_unit ||
                        ""
                      ).toLowerCase() === "prodi" ||
                      (act.NamaFakultasUnit || proker?.NamaFakultasUnit || "")
                        .toLowerCase()
                        .includes("prodi") ||
                      isProdi;
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
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="line-clamp-2">
                                  {act.Aktivitas}
                                </span>
                                {Boolean(act.IsBatal || proker?.IsBatal) && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-rose-300 bg-rose-100 text-rose-800 uppercase tracking-wider">
                                    <XCircle className="w-3 h-3 text-rose-600" />
                                    <span>
                                      {proker?.IsBatal
                                        ? "PROKER BATAL"
                                        : "AKTIVITAS BATAL"}
                                    </span>
                                  </span>
                                )}
                              </div>
                              {Boolean(act.IsBatal || proker?.IsBatal) &&
                                (act.CatatanBatal || proker?.CatatanBatal) && (
                                  <div className="flex items-start gap-1.5 p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-[10px] leading-tight shadow-2xs max-w-sm">
                                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                                    <div className="flex flex-col gap-0.5 min-w-0">
                                      <span className="font-bold text-rose-700 text-[9px] uppercase tracking-wider">
                                        Alasan Pembatalan:
                                      </span>
                                      <span className="italic break-words">
                                        "
                                        {act.CatatanBatal ||
                                          proker?.CatatanBatal}
                                        "
                                      </span>
                                    </div>
                                  </div>
                                )}
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
                            ) : (
                              <div className="flex flex-col items-end">
                                <button
                                  type="button"
                                  onClick={() => openRabDetailModal(act)}
                                  className="group/rab text-right transition cursor-pointer p-1.5 -m-1.5 rounded-xl hover:bg-purple-50/80 focus:outline-none focus:ring-2 focus:ring-purple-400 block ml-auto"
                                  title="Klik untuk melihat / mengelola Rincian Anggaran Biaya (RAB) & SBU"
                                >
                                  {isAnggaranRevised(act) ? (
                                    <div>
                                      <span
                                        className="line-through text-gray-400 text-[11px] block font-normal decoration-rose-500 decoration-1"
                                        title="Anggaran Awal"
                                      >
                                        {formatRupiah(act.Anggaran)}
                                      </span>
                                      <span
                                        className="font-bold text-emerald-700 group-hover/rab:text-purple-700 text-xs block transition"
                                        title="Realisasi Anggaran Baru"
                                      >
                                        {formatRupiah(
                                          getRealisasiAnggaran(act),
                                        )}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="font-bold text-emerald-700 group-hover/rab:text-purple-700 transition">
                                      {formatRupiah(
                                        hasRealisasiAnggaran(act)
                                          ? getRealisasiAnggaran(act)
                                          : act.Anggaran,
                                      )}
                                    </span>
                                  )}

                                  {/* Jumlah item SBU jika ada */}
                                  {(() => {
                                    try {
                                      const source =
                                        act.RabItems || act.RAB || act.rab;
                                      if (source) {
                                        const p =
                                          typeof source === "string"
                                            ? JSON.parse(source)
                                            : source;
                                        if (Array.isArray(p) && p.length > 0) {
                                          return (
                                            <div className="text-[10px] text-gray-500 group-hover/rab:text-purple-700 font-sans font-medium flex items-center justify-end gap-1 mt-0.5">
                                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 group-hover/rab:scale-125 transition" />
                                              <span>{p.length} item SBU</span>
                                            </div>
                                          );
                                        }
                                      }
                                    } catch (e) {}
                                    return (
                                      <div className="text-[9px] text-gray-400 group-hover/rab:text-purple-600 font-sans flex items-center justify-end gap-1 mt-0.5 opacity-0 group-hover/rab:opacity-100 transition">
                                        <span>Lihat SBU</span>
                                      </div>
                                    );
                                  })()}
                                </button>

                                {/* Badge Status Pencairan Anggaran */}
                                {(() => {
                                  const pStatus = getPencairanStatus(act);
                                  return (
                                    <div className="mt-1 flex flex-col items-end gap-0.5">
                                      <div
                                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold border select-none cursor-default shadow-2xs ${pStatus.className}`}
                                        title={`Status Pencairan: ${pStatus.label}${
                                          pStatus.nominal > 0
                                            ? ` (${formatRupiah(pStatus.nominal)}${
                                                pStatus.selisih !== 0
                                                  ? ` | Selisih: ${pStatus.selisih > 0 ? "+" : ""}${formatRupiah(pStatus.selisih)}`
                                                  : ""
                                              })`
                                            : ""
                                        }`}
                                      >
                                        <span
                                          className={`w-1.5 h-1.5 rounded-full ${pStatus.dotClass}`}
                                        />
                                        <span>{pStatus.label}</span>
                                      </div>
                                      {pStatus.nominal > 0 && (
                                        <div className="text-[10px] text-gray-500 font-mono flex items-center justify-end gap-1 mt-0.5">
                                          <span>
                                            Cair:{" "}
                                            <span className="font-semibold text-gray-700">
                                              {formatRupiah(
                                                hasRealisasiAnggaran(act)
                                                  ? getRealisasiAnggaran(act)
                                                  : act.Anggaran,
                                              )}
                                            </span>
                                          </span>
                                          {pStatus.status === "kelebihan" && (
                                            <span
                                              className="text-rose-600 font-sans font-semibold text-[9px] bg-rose-50 px-1 py-0.2 rounded border border-rose-100"
                                              title={`Kelebihan ${formatRupiah(pStatus.selisih)} dari target anggaran`}
                                            >
                                              +{formatRupiah(pStatus.selisih)}
                                            </span>
                                          )}
                                          {pStatus.status === "tidak_penuh" && (
                                            <span
                                              className="text-amber-700 font-sans font-medium text-[9px] bg-amber-50 px-1 py-0.2 rounded border border-amber-100"
                                              title={`Sisa belum cair ${formatRupiah(Math.abs(pStatus.selisih))}`}
                                            >
                                              (Sisa{" "}
                                              {formatRupiah(
                                                Math.abs(pStatus.selisih),
                                              )}
                                              )
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
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
                                    {(act.DokumenReferensiFiles || []).length >
                                    0
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
                          <td className="py-3.5 px-4 align-middle">
                            {(() => {
                              const roleCode = isUnitProdi ? "UPMS" : "UPML";
                              const curSt = isUnitProdi
                                ? act.StatusUpms || act.status_upms || ""
                                : act.StatusUpml || act.status_upml || "";
                              const note =
                                (isUnitProdi
                                  ? act.CatatanTolakUpms ||
                                    act.catatan_tolak_upms
                                  : act.CatatanTolakUpml ||
                                    act.catatan_tolak_upml) ||
                                act.CatatanVerifikator ||
                                act.CatatanPenolakan;
                              return renderTableRubberStamp(
                                curSt,
                                roleCode,
                                note,
                                true,
                                actStatusStr,
                              );
                            })()}
                          </td>

                          {/* Status UPMF */}
                          <td className="py-3.5 px-4 align-middle">
                            {(() => {
                              const stUpmf =
                                act.StatusUpmf || act.status_upmf || "";
                              const noteUpmf =
                                act.CatatanTolakUpmf ||
                                act.catatan_tolak_upmf ||
                                act.CatatanVerifikator ||
                                act.CatatanPenolakan;
                              const isApplicable =
                                isUnitProdi &&
                                stUpmf !== "-" &&
                                Boolean(stUpmf);
                              return renderTableRubberStamp(
                                stUpmf,
                                "UPMF",
                                noteUpmf,
                                isApplicable,
                                actStatusStr,
                              );
                            })()}
                          </td>

                          {/* Status LPM */}
                          <td className="py-3.5 px-4 align-middle">
                            {(() => {
                              const stLpm =
                                act.StatusLpm || act.status_lpm || "";
                              const noteLpm =
                                act.CatatanTolakLpm ||
                                act.catatan_tolak_lpm ||
                                act.CatatanVerifikator ||
                                act.CatatanPenolakan;
                              return renderTableRubberStamp(
                                stLpm,
                                "LPM",
                                noteLpm,
                                true,
                                actStatusStr,
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

                              {/* 4. LPM / EVALUATOR VERIFY / REJECT ACTION */}
                              {(curRole === "evaluator" || curRole === "lpm") &&
                                (() => {
                                  const stUpms = (
                                    act.StatusUpms ||
                                    act.status_upms ||
                                    ""
                                  )
                                    .toLowerCase()
                                    .trim();
                                  const stUpmf = (
                                    act.StatusUpmf ||
                                    act.status_upmf ||
                                    ""
                                  )
                                    .toLowerCase()
                                    .trim();
                                  const stUpml = (
                                    act.StatusUpml ||
                                    act.status_upml ||
                                    ""
                                  )
                                    .toLowerCase()
                                    .trim();
                                  const canLpmAct = isProdi
                                    ? stUpms === "disetujui" &&
                                      stUpmf === "disetujui"
                                    : stUpml === "disetujui";
                                  const disabledReason = isProdi
                                    ? stUpms !== "disetujui"
                                      ? "Menunggu persetujuan UPMS terlebih dahulu"
                                      : "Menunggu persetujuan UPMF terlebih dahulu"
                                    : "Menunggu persetujuan UPML terlebih dahulu";

                                  return (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleVerifySingleRow(act, "lpm")
                                        }
                                        disabled={
                                          !canLpmAct ||
                                          verifyingRowUuid === act.UUID ||
                                          isBatchProcessing
                                        }
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs hover:shadow transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                        title={
                                          !canLpmAct
                                            ? disabledReason
                                            : "Setujui verifikasi LPM"
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
                                            "lpm",
                                          )
                                        }
                                        disabled={
                                          !canLpmAct ||
                                          verifyingRowUuid === act.UUID ||
                                          isBatchProcessing
                                        }
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs hover:shadow transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                        title={
                                          !canLpmAct
                                            ? disabledReason
                                            : "Tolak verifikasi LPM"
                                        }
                                      >
                                        <X className="w-3 h-3" />
                                        <span>Tolak</span>
                                      </button>
                                    </>
                                  );
                                })()}

                              {/* 5. ADMIN VERIFY / REJECT ACTION */}
                              {isAdmin &&
                                (() => {
                                  let roleToUse = "lpm";
                                  if (isProdi) {
                                    const stUpms = (
                                      act.StatusUpms ||
                                      act.status_upms ||
                                      ""
                                    )
                                      .toLowerCase()
                                      .trim();
                                    const stUpmf = (
                                      act.StatusUpmf ||
                                      act.status_upmf ||
                                      ""
                                    )
                                      .toLowerCase()
                                      .trim();
                                    if (stUpms !== "disetujui")
                                      roleToUse = "upms";
                                    else if (stUpmf !== "disetujui")
                                      roleToUse = "upmf";
                                    else roleToUse = "lpm";
                                  } else {
                                    const stUpml = (
                                      act.StatusUpml ||
                                      act.status_upml ||
                                      ""
                                    )
                                      .toLowerCase()
                                      .trim();
                                    if (stUpml !== "disetujui")
                                      roleToUse = "upml";
                                    else roleToUse = "lpm";
                                  }

                                  return (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleVerifySingleRow(act, roleToUse)
                                        }
                                        disabled={
                                          verifyingRowUuid === act.UUID ||
                                          isBatchProcessing
                                        }
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs hover:shadow transition cursor-pointer disabled:opacity-50"
                                        title={`Setujui tahap ${roleToUse.toUpperCase()} (Admin)`}
                                      >
                                        {verifyingRowUuid === act.UUID ? (
                                          <RefreshCw className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Check className="w-3 h-3" />
                                        )}
                                        <span>
                                          Verifikasi ({roleToUse.toUpperCase()})
                                        </span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleOpenSingleRejectModal(
                                            act,
                                            roleToUse,
                                          )
                                        }
                                        disabled={
                                          verifyingRowUuid === act.UUID ||
                                          isBatchProcessing
                                        }
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs hover:shadow transition cursor-pointer disabled:opacity-50"
                                        title={`Tolak tahap ${roleToUse.toUpperCase()} (Admin)`}
                                      >
                                        <X className="w-3 h-3" />
                                        <span>Tolak</span>
                                      </button>
                                    </>
                                  );
                                })()}

                              {/* Option to revert single activity to draft (bukan untuk upml, upmf, upms) */}
                              {canRevisiActDraft &&
                                (act.Status || "").toLowerCase() !==
                                  "draft" && (
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
                                  {!isActApprovedByEvaluator(act) && (
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
                                  )}
                                </>
                              )}

                              {/* Switch Proker / Aktivitas Batal untuk User Fakultas Unit */}
                              {(() => {
                                const isTerimaAnggaranAct =
                                  isProkerAccAnggaran ||
                                  (act.StatusAnggaran || "").toLowerCase() ===
                                    "terima_anggaran" ||
                                  (act.Status || "").toLowerCase() ===
                                    "terima_anggaran";

                                const canShowBatalActSwitch =
                                  !isAdmin &&
                                  isLevelUser &&
                                  !isUpmUser &&
                                  hasAssignedTarget &&
                                  isYearMatch &&
                                  isTerimaAnggaranAct &&
                                  isJadwalProkerOpen;

                                if (!canShowBatalActSwitch) return null;

                                return (
                                  <div className="flex items-center gap-1.5 pl-1 border-l border-gray-200">
                                    <label
                                      className="text-[11px] font-medium text-gray-700 select-none cursor-pointer flex items-center gap-1.5"
                                      title="Tandai pembatalan aktivitas ini"
                                    >
                                      <span className="text-[10px] text-gray-500 font-semibold whitespace-nowrap">
                                        Batal:
                                      </span>
                                      {(() => {
                                        const isActBatal = Boolean(
                                          act.IsBatal || proker?.IsBatal,
                                        );
                                        return (
                                          <>
                                            <button
                                              type="button"
                                              role="switch"
                                              aria-checked={isActBatal}
                                              onClick={() =>
                                                handleToggleBatalAktivitas(act)
                                              }
                                              className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-rose-500/20 ${
                                                isActBatal
                                                  ? "bg-rose-600"
                                                  : "bg-gray-300"
                                              }`}
                                            >
                                              <span
                                                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                                  isActBatal
                                                    ? "translate-x-3"
                                                    : "translate-x-0"
                                                }`}
                                              />
                                            </button>
                                            <span
                                              className={`text-[10px] font-bold ${
                                                isActBatal
                                                  ? "text-rose-600"
                                                  : "text-gray-500"
                                              }`}
                                            >
                                              {isActBatal ? "Ya" : "Tidak"}
                                            </span>
                                          </>
                                        );
                                      })()}
                                    </label>
                                  </div>
                                );
                              })()}
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-3xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-5xl border border-gray-100 flex flex-col max-h-[92vh]">
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

                  {/* Rincian Anggaran Biaya (RAB) & SBU Dinamis */}
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4 text-purple-600" />
                          <h4 className="text-xs font-bold text-gray-900">
                            Rincian Anggaran Biaya
                          </h4>
                        </div>
                      </div>

                      {isActModalRabLocked ? (
                        <div className="flex flex-col items-start sm:items-end">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs self-start sm:self-auto">
                            <Lock className="w-3.5 h-3.5 text-amber-600" />
                            <span>RAB Terkunci</span>
                          </span>
                          <span className="text-[10px] text-amber-700/90 text-left sm:text-right mt-1 font-medium">
                            Sudah disetujui Verifikator & Anggaran
                          </span>
                        </div>
                      ) : (
                        canEditActModalRab && (
                          <button
                            type="button"
                            onClick={handleAddRabRow}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs hover:shadow-md transition cursor-pointer self-start sm:self-auto"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambah Rincian SBU</span>
                          </button>
                        )
                      )}
                    </div>

                    {/* Lock Explanation Note */}
                    {isActModalRabLocked && (
                      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl px-4 py-3 flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs">
                        <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        <div className="space-y-1 text-xs">
                          <div className="font-bold text-amber-950">
                            Mengapa RAB ini terkunci?
                          </div>
                          <p className="text-amber-800 leading-relaxed text-[11px]">
                            RAB terkunci otomatis karena usulan
                            aktivitas/program kerja ini telah diverifikasi dan
                            disetujui oleh Verifikator & Tim Anggaran (status{" "}
                            <em>Diterima</em> / <em>Disetujui</em>), atau role
                            Anda memiliki hak akses baca saja (read-only).
                          </p>
                          <p className="text-amber-700 leading-relaxed text-[11px]">
                            <span className="font-semibold text-amber-900">
                              Aturan:{" "}
                            </span>
                            Penambahan rincian SBU, perubahan nominal, dan
                            penghapusan item dinonaktifkan agar alokasi pagu
                            anggaran yang sudah disahkan tetap valid dan
                            terjaga. Jika perlu penyesuaian rincian RAB, silakan
                            hubungi Verifikator atau Tim Anggaran untuk
                            mengembalikan status ke tahap{" "}
                            <em>Draft / Revisi</em>.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Pagu Anggaran Banner (Case 1 vs Case 2) */}
                    {proker?.HasPagu && Number(proker?.PaguUnit) > 0 ? (
                      (() => {
                        const isBebanYayasan = Boolean(
                          proker?.BebanYayasan || proker?.beban_yayasan,
                        );
                        const paguUnit = Number(proker.PaguUnit);
                        const totalTerpakai =
                          Number(proker.TotalAnggaranUnit) || 0;
                        const oldActAnggaran =
                          actModalMode === "edit"
                            ? Number(selectedAct?.Anggaran) || 0
                            : 0;
                        const projectedTotal = isBebanYayasan
                          ? totalTerpakai
                          : totalTerpakai - oldActAnggaran + totalActRab;
                        const isMelebihi =
                          !isBebanYayasan && projectedTotal > paguUnit;
                        const sisaUnit = paguUnit - projectedTotal;

                        return (
                          <div
                            className={`rounded-2xl px-4 py-3 flex items-start gap-2.5 text-xs shadow-2xs border ${
                              isBebanYayasan
                                ? "bg-purple-50/70 border-purple-200 text-purple-900"
                                : isMelebihi
                                ? "bg-rose-50/80 border-rose-200 text-rose-900"
                                : "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                            }`}
                          >
                            {isBebanYayasan ? (
                              <CheckCircle2 className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                            ) : isMelebihi ? (
                              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                            )}
                            <div className="space-y-0.5 text-xs w-full">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-bold flex items-center gap-2">
                                  <span>
                                    {isBebanYayasan
                                      ? "Program Kerja Beban Yayasan"
                                      : isMelebihi
                                      ? "Alokasi Melebihi Batas Pagu Anggaran Unit!"
                                      : "Batas Pagu Anggaran Unit Terpenuhi"}
                                  </span>
                                  {isBebanYayasan && (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                                      Tidak Memotong Pagu Unit
                                    </span>
                                  )}
                                </span>
                                <span className="font-mono text-[11px] font-semibold">
                                  Pagu Unit ({proker.Tahun}):{" "}
                                  {formatRupiah(paguUnit)}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] opacity-90 mt-1">
                                <span>
                                  Total Terpakai Unit Saat Ini:{" "}
                                  <strong>{formatRupiah(totalTerpakai)}</strong>
                                </span>
                                <span>
                                  Proyeksi Total Unit:{" "}
                                  <strong
                                    className={
                                      isMelebihi
                                        ? "text-rose-700 font-extrabold"
                                        : ""
                                    }
                                  >
                                    {formatRupiah(projectedTotal)}
                                  </strong>
                                </span>
                                <span>
                                  {isMelebihi
                                    ? `Melebihi Pagu Sebesar: ${formatRupiah(projectedTotal - paguUnit)}`
                                    : `Sisa Pagu Tersedia: ${formatRupiah(sisaUnit)}`}
                                </span>
                              </div>
                              {isMelebihi && (
                                <p className="text-[11px] text-rose-700 font-medium pt-1">
                                  ⚠️ Aktivitas tidak dapat disimpan karena
                                  alokasi anggaran melebihi batas pagu unit.
                                  Harap sesuaikan rincian anggaran.
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl px-4 py-2.5 flex items-center gap-2.5 text-xs text-amber-900 shadow-2xs">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                          <span className="font-bold">
                            Case 1: Pagu Belum Ditetapkan
                          </span>
                          <span className="text-[11px] text-amber-800 ml-1.5">
                            Pagu anggaran unit untuk tahun{" "}
                            {proker?.Tahun || "-"} belum ditentukan di sistem.
                            Pengisian form tidak dibatasi, namun proker ini akan
                            ditandai <strong>"Tidak Sesuai Pagu"</strong> pada
                            tabel.
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Tabel Dinamis RAB */}
                    <div className="border border-gray-200 rounded-2xl overflow-x-auto shadow-2xs bg-white">
                      <table className="w-full text-xs min-w-[700px] border-collapse">
                        <thead>
                          <tr className="bg-purple-50/80 text-gray-800 border-b border-gray-200">
                            <th
                              rowSpan={2}
                              className="px-2.5 py-2 text-center font-bold border-r border-gray-200 w-10 text-[11px] text-gray-600"
                            >
                              No
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-2 text-left font-bold border-r border-gray-200 w-60 min-w-[220px]"
                            >
                              Kategori (COA)
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-2 text-left font-bold border-r border-gray-200 min-w-[180px]"
                            >
                              Rincian / Uraian
                            </th>
                            <th
                              colSpan={2}
                              className="px-2 py-1.5 text-center font-bold border-r border-gray-200"
                            >
                              qty
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-2 text-right font-bold border-r border-gray-200 w-36"
                            >
                              Harga satuan (SBU)
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-2 text-right font-bold border-r border-gray-200 w-36"
                            >
                              Total (Rp)
                            </th>
                            {canEditActModalRab && (
                              <th
                                rowSpan={2}
                                className="px-2 py-2 text-center font-bold w-12"
                              >
                                Aksi
                              </th>
                            )}
                          </tr>
                          <tr className="bg-purple-100/50 text-gray-700 border-b border-gray-200">
                            <th className="px-2 py-1 text-center font-semibold border-r border-gray-200 w-20">
                              satuan
                            </th>
                            <th className="px-2 py-1 text-center font-semibold border-r border-gray-200 w-20">
                              paket
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {actRabRows.map((row, idx) => (
                            <tr
                              key={row.id || idx}
                              className="hover:bg-purple-50/20 transition"
                            >
                              {/* No */}
                              <td className="p-2 text-center border-r border-gray-100 text-gray-400 font-mono text-[11px] align-middle">
                                {idx + 1}
                              </td>

                              {/* Kategori */}
                              <td className="p-2 border-r border-gray-100 align-middle">
                                {!canEditActModalRab ? (
                                  <div
                                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 font-medium text-gray-800 truncate"
                                    title={
                                      row.no_akun
                                        ? `${row.no_akun} - ${row.nama_akun || row.kategori}`
                                        : row.kategori || "-"
                                    }
                                  >
                                    {row.no_akun
                                      ? `${row.no_akun} - ${row.nama_akun || row.kategori}`
                                      : row.kategori || "-"}
                                  </div>
                                ) : (
                                  <CoaSearchSelect
                                    valueNoAkun={row.no_akun}
                                    valueNamaAkun={row.nama_akun}
                                    valueKategori={row.kategori}
                                    onChange={(val) =>
                                      handleRabRowChange(idx, "coa", val)
                                    }
                                  />
                                )}
                              </td>

                              {/* Rincian / Uraian */}
                              <td className="p-2 border-r border-gray-100 align-middle">
                                {!canEditActModalRab ? (
                                  <div className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 font-medium text-gray-800">
                                    {row.keterangan || "-"}
                                  </div>
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Contoh: Honor narasumber / Konsumsi..."
                                    value={row.keterangan || ""}
                                    onChange={(e) =>
                                      handleRabRowChange(
                                        idx,
                                        "keterangan",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium placeholder:text-gray-400"
                                  />
                                )}
                              </td>

                              {/* qty: satuan */}
                              <td className="p-2 border-r border-gray-100 align-middle w-20">
                                {!canEditActModalRab ? (
                                  <div className="w-full px-2 py-1.5 text-xs text-center rounded-lg border border-gray-200 bg-gray-50/50 font-mono font-bold text-gray-800">
                                    {row.qty_satuan ?? 1}
                                  </div>
                                ) : (
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    placeholder="1"
                                    value={row.qty_satuan ?? ""}
                                    onChange={(e) =>
                                      handleRabRowChange(
                                        idx,
                                        "qty_satuan",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full px-2 py-1.5 text-xs text-center rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono font-semibold"
                                  />
                                )}
                              </td>

                              {/* qty: paket */}
                              <td className="p-2 border-r border-gray-100 align-middle w-20">
                                {!canEditActModalRab ? (
                                  <div className="w-full px-2 py-1.5 text-xs text-center rounded-lg border border-gray-200 bg-gray-50/50 font-mono font-bold text-gray-800">
                                    {row.qty_paket ?? 1}
                                  </div>
                                ) : (
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    placeholder="1"
                                    value={row.qty_paket ?? ""}
                                    onChange={(e) =>
                                      handleRabRowChange(
                                        idx,
                                        "qty_paket",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full px-2 py-1.5 text-xs text-center rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono font-semibold"
                                  />
                                )}
                              </td>

                              {/* SBU (Harga satuan) */}
                              <td className="p-2 border-r border-gray-100 align-middle w-36">
                                {!canEditActModalRab ? (
                                  <div className="w-full px-2.5 py-1.5 text-xs text-right rounded-lg border border-gray-200 bg-gray-50/50 font-mono font-bold text-gray-800">
                                    {new Intl.NumberFormat("id-ID").format(
                                      row.sbu || 0,
                                    )}
                                  </div>
                                ) : (
                                  <input
                                    type="number"
                                    min="0"
                                    step="1000"
                                    placeholder="0"
                                    value={row.sbu ?? ""}
                                    onChange={(e) =>
                                      handleRabRowChange(
                                        idx,
                                        "sbu",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full px-2.5 py-1.5 text-xs text-right rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono font-bold text-gray-800"
                                  />
                                )}
                              </td>

                              {/* Total per row */}
                              <td className="p-2 border-r border-gray-100 align-middle text-right font-mono font-bold text-purple-900 bg-purple-50/20 w-36">
                                {formatRupiah(row.total || 0)}
                              </td>

                              {/* Aksi Hapus */}
                              {canEditActModalRab && (
                                <td className="p-2 text-center align-middle w-12">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveRabRow(idx)}
                                    disabled={actRabRows.length <= 1}
                                    className={`p-1.5 rounded-lg transition ${
                                      actRabRows.length <= 1
                                        ? "text-gray-300 cursor-not-allowed"
                                        : "text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                                    }`}
                                    title={
                                      actRabRows.length <= 1
                                        ? "Minimal 1 baris rincian anggaran"
                                        : "Hapus baris ini"
                                    }
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-purple-50/50 border-t-2 border-purple-200">
                            <td
                              colSpan={6}
                              className="p-3 text-right font-bold text-gray-700"
                            >
                              Total Anggaran:
                            </td>
                            <td className="p-3 text-right font-mono text-sm text-purple-900 bg-purple-100/60 font-extrabold">
                              {formatRupiah(totalActRab)}
                            </td>
                            {canEditActModalRab && (
                              <td className="p-3 text-center text-[10px] text-gray-500 font-normal">
                                {actRabRows.length} item
                              </td>
                            )}
                          </tr>
                        </tfoot>
                      </table>
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
                  <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-end gap-3">
                    <div className="flex items-center justify-end gap-3">
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
      {/* MODAL: BATAL AKTIVITAS KEGIATAN                          */}
      {/* ======================================================== */}
      <Transition appear show={batalActModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setBatalActModalOpen(false)}
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
                  <XCircle className="w-5 h-5" />
                  <span>Batalkan Aktivitas Kegiatan</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBatalActModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-600">
                  Silakan berikan alasan mengapa aktivitas kegiatan ini
                  dibatalkan:
                </p>
                <div className="text-xs font-bold text-gray-900 bg-rose-50 border border-rose-200 p-2.5 rounded-lg line-clamp-2">
                  {batalTargetAct?.Aktivitas}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  Catatan Alasan Pembatalan{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={catatanBatalActInput}
                  onChange={(e) => setCatatanBatalActInput(e.target.value)}
                  placeholder="Tuliskan catatan detail alasan mengapa aktivitas ini dibatalkan..."
                  className="w-full p-3 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setBatalActModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={
                    isSubmittingBatalAct || !catatanBatalActInput.trim()
                  }
                  onClick={handleSubmitBatalAct}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer inline-flex items-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>
                    {isSubmittingBatalAct
                      ? "Menyimpan..."
                      : "Simpan Pembatalan"}
                  </span>
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>

      {/* Confirmation Dialog Unbatal Aktivitas */}
      <Transition appear show={confirmUnbatalActOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setConfirmUnbatalActOpen(false)}
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-base">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Aktifkan Kembali Aktivitas</span>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmUnbatalActOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-gray-600">
                Apakah Anda yakin ingin membatalkan status Batal dan
                mengaktifkan kembali aktivitas ini?
              </p>
              <div className="text-xs font-bold text-gray-900 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg line-clamp-2">
                {batalTargetAct?.Aktivitas}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setConfirmUnbatalActOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmittingBatalAct}
                  onClick={handleConfirmUnbatalAct}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer inline-flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {isSubmittingBatalAct
                      ? "Menyimpan..."
                      : "Ya, Aktifkan Kembali"}
                  </span>
                </button>
              </div>
            </Dialog.Panel>
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
                <form
                  onSubmit={handleSaveRevisiAnggaran}
                  className="p-6 space-y-4"
                >
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
                                new Intl.NumberFormat("id-ID").format(val),
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
                        {revisiAnggaran > Number(actToRevisi.Anggaran)
                          ? "+"
                          : ""}
                        {formatRupiah(
                          revisiAnggaran - Number(actToRevisi.Anggaran),
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

      {/* Modal Detail / Kelola RAB & SBU (Gambar 2 -> Gambar 1) */}
      <Transition appear show={rabDetailModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => {
            if (!isSavingRabDetail) {
              setRabDetailModalOpen(false);
              setRabDetailAct(null);
            }
          }}
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
            <div className="flex min-h-full items-center justify-center p-3 sm:p-5 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-3xl bg-white p-5 sm:p-6 text-left align-middle shadow-2xl transition-all border border-purple-100 space-y-4">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
                        <Coins className="w-5 h-5" />
                      </div>
                      <Dialog.Title className="text-base font-extrabold text-gray-900 leading-tight">
                        Rincian Anggaran Biaya
                      </Dialog.Title>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {isRabDetailLocked ? (
                        <div className="flex flex-col items-end">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                            <Lock className="w-3.5 h-3.5 text-amber-600" />
                            <span>RAB Terkunci</span>
                          </span>
                          <span className="text-[10px] text-amber-700/90 text-right mt-1 font-medium">
                            Sudah disetujui Verifikator & Anggaran
                          </span>
                        </div>
                      ) : (
                        canEditRabDetail && (
                          <button
                            type="button"
                            onClick={handleAddRabDetailRow}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs hover:shadow-md transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambah Rincian SBU</span>
                          </button>
                        )
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setRabDetailModalOpen(false);
                          setRabDetailAct(null);
                        }}
                        className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Lock Explanation Note */}
                  {isRabDetailLocked && (
                    <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl px-4 py-3 flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs">
                      <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-amber-950">
                          Mengapa RAB ini terkunci?
                        </div>
                        <p className="text-amber-800 leading-relaxed text-[11px]">
                          RAB terkunci otomatis karena usulan aktivitas/program
                          kerja ini telah diverifikasi dan disetujui oleh
                          Verifikator & Tim Anggaran (status <em>Diterima</em> /{" "}
                          <em>Disetujui</em>), atau role Anda memiliki hak akses
                          baca saja (read-only).
                        </p>
                        <p className="text-amber-700 leading-relaxed text-[11px]">
                          <span className="font-semibold text-amber-900">
                            Aturan:{" "}
                          </span>
                          Penambahan rincian SBU, perubahan nominal, dan
                          penghapusan item dinonaktifkan agar alokasi pagu
                          anggaran yang sudah disahkan tetap valid dan terjaga.
                          Jika perlu penyesuaian rincian RAB, silakan hubungi
                          Verifikator atau Tim Anggaran untuk mengembalikan
                          status ke tahap <em>Draft / Revisi</em>.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Activity Info Banner */}
                  {rabDetailAct && (
                    <div className="bg-purple-50/60 border border-purple-100 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 font-medium">
                          Aktivitas:
                        </span>
                        <span className="font-bold text-gray-900">
                          {rabDetailAct.Aktivitas}
                        </span>
                      </div>
                      {rabDetailAct.PIC && (
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <span className="text-gray-400">PIC:</span>
                          <span className="font-semibold text-gray-800">
                            {rabDetailAct.PIC}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pagu Anggaran Banner (Case 1 vs Case 2) */}
                  {proker?.HasPagu && Number(proker?.PaguUnit) > 0 ? (
                    (() => {
                      const isBebanYayasan = Boolean(
                        proker?.BebanYayasan || proker?.beban_yayasan,
                      );
                      const paguUnit = Number(proker.PaguUnit);
                      const totalTerpakai =
                        Number(proker.TotalAnggaranUnit) || 0;
                      const oldActAnggaran =
                        Number(rabDetailAct?.Anggaran) || 0;
                      const projectedTotal = isBebanYayasan
                        ? totalTerpakai
                        : totalTerpakai - oldActAnggaran + totalRabDetail;
                      const isMelebihi =
                        !isBebanYayasan && projectedTotal > paguUnit;
                      const sisaUnit = paguUnit - projectedTotal;

                      return (
                        <div
                          className={`rounded-2xl px-4 py-3 flex items-start gap-2.5 text-xs shadow-2xs border ${
                            isBebanYayasan
                              ? "bg-purple-50/70 border-purple-200 text-purple-900"
                              : isMelebihi
                              ? "bg-rose-50/80 border-rose-200 text-rose-900"
                              : "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                          }`}
                        >
                          {isBebanYayasan ? (
                            <CheckCircle2 className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                          ) : isMelebihi ? (
                            <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                          )}
                          <div className="space-y-0.5 text-xs w-full">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-bold flex items-center gap-2">
                                <span>
                                  {isBebanYayasan
                                    ? "Program Kerja Beban Yayasan"
                                    : isMelebihi
                                    ? "Alokasi Melebihi Batas Pagu Anggaran Unit!"
                                    : "Batas Pagu Anggaran Unit Terpenuhi"}
                                </span>
                                {isBebanYayasan && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                                    Tidak Memotong Pagu Unit
                                  </span>
                                )}
                              </span>
                              <span className="font-mono text-[11px] font-semibold">
                                Pagu Unit ({proker.Tahun}):{" "}
                                {formatRupiah(paguUnit)}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] opacity-90 mt-1">
                              <span>
                                Total Terpakai Unit Saat Ini:{" "}
                                <strong>{formatRupiah(totalTerpakai)}</strong>
                              </span>
                              <span>
                                Proyeksi Total Unit:{" "}
                                <strong
                                  className={
                                    isMelebihi
                                      ? "text-rose-700 font-extrabold"
                                      : ""
                                  }
                                >
                                  {formatRupiah(projectedTotal)}
                                </strong>
                              </span>
                              <span>
                                {isMelebihi
                                  ? `Melebihi Pagu Sebesar: ${formatRupiah(projectedTotal - paguUnit)}`
                                  : `Sisa Pagu Tersedia: ${formatRupiah(sisaUnit)}`}
                              </span>
                            </div>
                            {isMelebihi && (
                              <p className="text-[11px] text-rose-700 font-medium pt-1">
                                ⚠️ Pengisian RAB tidak dapat disimpan karena
                                melebihi pagu unit. Harap sesuaikan kuantitas
                                atau harga satuan.
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="bg-amber-50/70 border border-amber-200 rounded-2xl px-4 py-2.5 flex items-center gap-2.5 text-xs text-amber-900 shadow-2xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <span className="font-bold">
                          Case 1: Pagu Belum Ditetapkan
                        </span>
                        <span className="text-[11px] text-amber-800 ml-1.5">
                          Pagu anggaran unit untuk tahun {proker?.Tahun || "-"}{" "}
                          belum ditentukan di sistem. Pengisian RAB tidak
                          dibatasi, namun proker ini akan ditandai{" "}
                          <strong>"Tidak Sesuai Pagu"</strong> pada tabel.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Dynamic Table RAB */}
                  <div className="border border-gray-200 rounded-2xl overflow-x-auto shadow-2xs bg-white">
                    <table className="w-full text-xs min-w-[700px] border-collapse">
                      <thead>
                        <tr className="bg-purple-50/80 text-gray-800 border-b border-gray-200">
                          <th
                            rowSpan={2}
                            className="px-2.5 py-2 text-center font-bold border-r border-gray-200 w-10 text-[11px] text-gray-600"
                          >
                            No
                          </th>
                          <th
                            rowSpan={2}
                            className="px-3 py-2 text-left font-bold border-r border-gray-200 w-60 min-w-[220px]"
                          >
                            Kategori (COA)
                          </th>
                          <th
                            rowSpan={2}
                            className="px-3 py-2 text-left font-bold border-r border-gray-200"
                          >
                            Rincian / Uraian
                          </th>
                          <th
                            colSpan={2}
                            className="px-2 py-1.5 text-center font-bold border-r border-gray-200"
                          >
                            qty
                          </th>
                          <th
                            rowSpan={2}
                            className="px-3 py-2 text-right font-bold border-r border-gray-200 w-36"
                          >
                            Harga satuan (SBU)
                          </th>
                          <th
                            rowSpan={2}
                            className="px-3 py-2 text-right font-bold border-r border-gray-200 w-36"
                          >
                            Total (Rp)
                          </th>
                          {canEditRabDetail && (
                            <th
                              rowSpan={2}
                              className="px-2 py-2 text-center font-bold w-12"
                            >
                              Aksi
                            </th>
                          )}
                        </tr>
                        <tr className="bg-purple-100/50 text-gray-700 border-b border-gray-200">
                          <th className="px-2 py-1 text-center font-semibold border-r border-gray-200 w-20">
                            satuan
                          </th>
                          <th className="px-2 py-1 text-center font-semibold border-r border-gray-200 w-20">
                            paket
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {rabDetailRows.map((row, idx) => (
                          <tr
                            key={row.id || idx}
                            className="hover:bg-purple-50/20 transition"
                          >
                            {/* No */}
                            <td className="p-2 text-center border-r border-gray-100 text-gray-400 font-mono text-[11px] align-middle">
                              {idx + 1}
                            </td>

                            {/* Kategori */}
                            <td className="p-2 border-r border-gray-100 align-middle">
                              {!canEditRabDetail ? (
                                <div
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 font-medium text-gray-800 truncate"
                                  title={
                                    row.no_akun
                                      ? `${row.no_akun} - ${row.nama_akun || row.kategori}`
                                      : row.kategori || "-"
                                  }
                                >
                                  {row.no_akun
                                    ? `${row.no_akun} - ${row.nama_akun || row.kategori}`
                                    : row.kategori || "-"}
                                </div>
                              ) : (
                                <CoaSearchSelect
                                  valueNoAkun={row.no_akun}
                                  valueNamaAkun={row.nama_akun}
                                  valueKategori={row.kategori}
                                  onChange={(val) =>
                                    handleRabDetailRowChange(idx, "coa", val)
                                  }
                                />
                              )}
                            </td>

                            {/* Rincian / Uraian */}
                            <td className="p-2 border-r border-gray-100 align-middle">
                              {!canEditRabDetail ? (
                                <div className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 font-medium text-gray-800">
                                  {row.keterangan || "-"}
                                </div>
                              ) : (
                                <input
                                  type="text"
                                  placeholder="Contoh: Honor narasumber / Konsumsi..."
                                  value={row.keterangan || ""}
                                  onChange={(e) =>
                                    handleRabDetailRowChange(
                                      idx,
                                      "keterangan",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium placeholder:text-gray-400"
                                />
                              )}
                            </td>

                            {/* qty: satuan */}
                            <td className="p-2 border-r border-gray-100 align-middle w-20">
                              {!canEditRabDetail ? (
                                <div className="w-full px-2 py-1.5 text-xs text-center rounded-lg border border-gray-200 bg-gray-50/50 font-mono font-bold text-gray-800">
                                  {row.qty_satuan ?? 1}
                                </div>
                              ) : (
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  placeholder="1"
                                  value={row.qty_satuan ?? ""}
                                  onChange={(e) =>
                                    handleRabDetailRowChange(
                                      idx,
                                      "qty_satuan",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full px-2 py-1.5 text-xs text-center rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono font-semibold"
                                />
                              )}
                            </td>

                            {/* qty: paket */}
                            <td className="p-2 border-r border-gray-100 align-middle w-20">
                              {!canEditRabDetail ? (
                                <div className="w-full px-2 py-1.5 text-xs text-center rounded-lg border border-gray-200 bg-gray-50/50 font-mono font-bold text-gray-800">
                                  {row.qty_paket ?? 1}
                                </div>
                              ) : (
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  placeholder="1"
                                  value={row.qty_paket ?? ""}
                                  onChange={(e) =>
                                    handleRabDetailRowChange(
                                      idx,
                                      "qty_paket",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full px-2 py-1.5 text-xs text-center rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono font-semibold"
                                />
                              )}
                            </td>

                            {/* SBU (Harga satuan) */}
                            <td className="p-2 border-r border-gray-100 align-middle w-36">
                              {!canEditRabDetail ? (
                                <div className="w-full px-2.5 py-1.5 text-xs text-right rounded-lg border border-gray-200 bg-gray-50/50 font-mono font-bold text-gray-800">
                                  {new Intl.NumberFormat("id-ID").format(
                                    row.sbu || 0,
                                  )}
                                </div>
                              ) : (
                                <input
                                  type="number"
                                  min="0"
                                  step="1000"
                                  placeholder="0"
                                  value={row.sbu ?? ""}
                                  onChange={(e) =>
                                    handleRabDetailRowChange(
                                      idx,
                                      "sbu",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full px-2.5 py-1.5 text-xs text-right rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono font-bold text-gray-800"
                                />
                              )}
                            </td>

                            {/* Total per row */}
                            <td className="p-2 border-r border-gray-100 align-middle text-right font-mono font-bold text-purple-900 bg-purple-50/20 w-36">
                              {formatRupiah(row.total || 0)}
                            </td>

                            {/* Aksi Hapus */}
                            {canEditRabDetail && (
                              <td className="p-2 text-center align-middle w-12">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRabDetailRow(idx)}
                                  disabled={rabDetailRows.length <= 1}
                                  className={`p-1.5 rounded-lg transition ${
                                    rabDetailRows.length <= 1
                                      ? "text-gray-300 cursor-not-allowed"
                                      : "text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                                  }`}
                                  title={
                                    rabDetailRows.length <= 1
                                      ? "Minimal 1 baris rincian anggaran"
                                      : "Hapus baris ini"
                                  }
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-purple-50/50 border-t-2 border-purple-200">
                          <td
                            colSpan={6}
                            className="p-3 text-right font-bold text-gray-700"
                          >
                            Total Alokasi Anggaran (Akumulasi SBU):
                          </td>
                          <td className="p-3 text-right font-mono text-sm text-purple-900 bg-purple-100/60 font-extrabold">
                            {formatRupiah(totalRabDetail)}
                          </td>
                          {canEditRabDetail && (
                            <td className="p-3 text-center text-[10px] text-gray-500 font-normal">
                              {rabDetailRows.length} item
                            </td>
                          )}
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Summary Card below table */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-purple-50/80 to-indigo-50/50 border border-purple-200/80 rounded-2xl p-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                        <Coins className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider font-extrabold text-purple-700">
                          Total Alokasi Anggaran Program
                        </div>
                        <div className="text-sm font-extrabold font-mono text-gray-900">
                          {formatRupiah(totalRabDetail)}
                        </div>
                      </div>
                    </div>
                    <div className="text-[11px] text-gray-500 text-right font-mono">
                      Terbilang:{" "}
                      <span className="font-semibold text-gray-700">
                        {formatRupiah(totalRabDetail)}
                      </span>
                    </div>
                  </div>

                  {/* Modal Footer Buttons */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setRabDetailModalOpen(false);
                        setRabDetailAct(null);
                      }}
                      disabled={isSavingRabDetail}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                    >
                      Tutup
                    </button>
                    {canEditRabDetail && (
                      <button
                        type="button"
                        onClick={handleSaveRabDetail}
                        disabled={isSavingRabDetail}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-500/25 transition cursor-pointer disabled:opacity-50"
                      >
                        {isSavingRabDetail ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Menyimpan...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            <span>Simpan Perubahan RAB</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
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
                  Program kerja dan seluruh aktivitas di dalamnya akan
                  dikembalikan ke status <b>Draft</b> agar dapat
                  diedit/disesuaikan kembali oleh pengaju:
                </p>
                <div className="text-xs font-bold text-gray-900 bg-amber-50 border border-amber-200 p-2.5 rounded-lg line-clamp-2">
                  {proker?.NamaProgram}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  Catatan / Alasan Revisi{" "}
                  <span className="text-gray-400 font-normal">(opsional)</span>
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
                  <span>
                    {isSubmittingRevisiDraft
                      ? "Memproses..."
                      : "Kembalikan ke Draft"}
                  </span>
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
