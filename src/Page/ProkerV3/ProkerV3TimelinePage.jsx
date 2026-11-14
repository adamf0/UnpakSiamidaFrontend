import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  Fragment,
} from "react";
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
import CoaSearchSelect from "@/Components/CoaSearchSelect";
import ProkerAccessBlockCard from "@/Components/ProkerAccessBlockCard";
import {
  BULAN_LIST,
  WEEKS,
  parseSlotArray,
  getSlotsFromDateRange,
  getTimelineRkSlots,
  getTimelineRSlots,
  summarizeSlots,
  formatBytes,
  formatRupiah,
  hasRealisasiAnggaran,
  getRealisasiAnggaran,
  isAnggaranRevised,
  TIMELINE_MAX_FILE_SIZE_MB,
  TIMELINE_FILE_ACCEPT,
  TIMELINE_ALLOWED_FILE_TYPES_LABEL,
  validateTimelineUploadFile,
  validateTimelineLinkUrl,
  isTimelineLinkRecord,
  resolveProkerFileUrl,
} from "./prokerConstants";
import { formatTanggalBulanTahun } from "@/Common/Utils";
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
  AlertTriangle,
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
  Calculator,
  User,
  X,
  Play,
  Pause,
  Coins,
  Lock,
  Link2,
  ShieldAlert,
  RefreshCw,
} from "lucide-react";
import RubberStamp from "../Dashboard/MonitoringProker3D/RubberStamp";

// Ukuran chunk binary 512 KB per slice untuk progress presisi & transfer speed lancar
const CHUNK_SIZE = 512 * 1024;

const generateUUID = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

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
    positionYear,
  } = useContent();

  const isAdmin = level === "admin" || user?.level === "admin";
  const curRole = String(
    level || localStorage.getItem("activeLevel") || user?.level || "",
  )
    .toLowerCase()
    .trim();
  const isLevelUser = curRole === "user";
  const isEvaluator = curRole === "evaluator" || curRole.includes("evaluator");

  const isVerifierRoleOrLevel = useMemo(() => {
    const activeRole = String(
      level || localStorage.getItem("activeLevel") || user?.level || ""
    )
      .toLowerCase()
      .trim();

    // UPML, Admin, Anggaran/Keuangan, dan User pengusul BOLEH melihat uang anggaran
    if (isAdmin || activeRole === "admin") return false;
    if (activeRole === "upml") return false;
    if (activeRole === "anggaran" || activeRole === "keuangan") return false;
    if (activeRole === "user") return false;

    // Selain itu (UPMF, UPMS, Evaluator, Fakultas, dll): SENSOR ***
    return true;
  }, [level, user, isAdmin]);

  const isUpmUser = useMemo(() => {
    if (isLevelUser) return false;
    return ["upml", "upmf", "upms"].includes(curRole);
  }, [isLevelUser, curRole]);

  // Unit penugasan aktif sesuai level/role dan tahun saat ini
  const activeRoleUnit = useMemo(() => {
    if (!Array.isArray(user?.extra_role) || user.extra_role.length === 0) {
      return {
        id: user?.id_fakultas_unit || user?.fakultas_unit || null,
        uuid: user?.uuid_fakultas_unit || user?.UuidFakultasUnit || "",
        name: user?.nama_fakultas_unit || user?.fakultas || "",
      };
    }
    const effYear = String(positionYear || "").trim();
    const match = user.extra_role.find((r) => {
      const rRole = String(r.role ?? r.Role ?? "").toLowerCase().trim();
      if (curRole && rRole && rRole !== curRole && curRole !== "user") {
        return false;
      }
      const rYear = String(r.tahun ?? r.Tahun ?? "").trim();
      if (rYear && effYear && rYear !== effYear) {
        return false;
      }
      return true;
    });
    if (match) {
      return {
        id: match.id_fakultas_unit ?? match.IdFakultasUnit,
        uuid: match.uuid_fakultas_unit ?? match.UuidFakultasUnit ?? "",
        name: match.nama_fakultas_unit ?? match.NamaFakultasUnit ?? "",
      };
    }
    return {
      id: user?.id_fakultas_unit || user?.fakultas_unit || null,
      uuid: user?.uuid_fakultas_unit || user?.UuidFakultasUnit || "",
      name: user?.nama_fakultas_unit || user?.fakultas || "",
    };
  }, [user, curRole, positionYear]);

  // Data states
  const [loading, setLoading] = useState(true);
  const [aktivitas, setAktivitas] = useState(null);
  const [proker, setProker] = useState(null);
  const [timelines, setTimelines] = useState([]);
  const [isAccessBlocked, setIsAccessBlocked] = useState(false);
  const [accessBlockInfo, setAccessBlockInfo] = useState(null);

  // Validasi izin akses proker di sisi klien
  const checkClientAccess = useCallback(
    (rawProker) => {
      if (!rawProker) return true;
      if (
        isAdmin ||
        curRole === "anggaran" ||
        curRole === "keuangan" ||
        curRole === "evaluator" ||
        curRole === "lpm"
      ) {
        return true;
      }

      const prokerUnitId =
        rawProker.IdFakultasUnit != null ? Number(rawProker.IdFakultasUnit) : null;
      const prokerUnitName = String(
        rawProker.NamaFakultasUnit || rawProker.nama_fakultas_unit || "",
      )
        .trim()
        .toLowerCase();
      const prokerParentFakultas = String(
        rawProker.ParentFakultas || rawProker.parent_fakultas || "",
      )
        .trim()
        .toLowerCase();

      const assignedId =
        activeRoleUnit.id != null ? Number(activeRoleUnit.id) : null;
      const assignedName = String(activeRoleUnit.name || "")
        .trim()
        .toLowerCase();

      // 1. Direct match dengan unit penugasan aktif
      if (assignedId && prokerUnitId && assignedId === prokerUnitId) {
        return true;
      }
      if (
        assignedName &&
        prokerUnitName &&
        (assignedName === prokerUnitName || prokerUnitName.includes(assignedName))
      ) {
        return true;
      }

      // 2. Strict scoping untuk UPML, UPMS, dan normal user
      if (curRole === "upml" || curRole === "upms" || curRole === "user") {
        return false;
      }

      // 3. UPMF: mencakup 1 fakultas dan prodi-prodi di bawahnya
      if (curRole === "upmf") {
        if (
          assignedName &&
          prokerParentFakultas &&
          (assignedName === prokerParentFakultas ||
            prokerParentFakultas.includes(assignedName))
        ) {
          return true;
        }
        return false;
      }

      return false;
    },
    [isAdmin, curRole, activeRoleUnit],
  );

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

  const isYearMatch = useMemo(() => {
    const pYear = proker?.Tahun || aktivitas?.Tahun;
    if (!positionYear || !pYear) return true;
    return String(positionYear).trim() === String(pYear).trim();
  }, [positionYear, proker?.Tahun, aktivitas?.Tahun]);

  const hasAssignedTarget = useMemo(() => {
    if (!proker && !aktivitas) return false;
    const targetFuId = String(
      proker?.id_fakultas_unit ||
        proker?.IdFakultasUnit ||
        aktivitas?.id_fakultas_unit ||
        aktivitas?.IdFakultasUnit ||
        "",
    );
    const targetFuUuid = String(
      proker?.uuid_fakultas_unit ||
        proker?.UuidFakultasUnit ||
        aktivitas?.uuid_fakultas_unit ||
        aktivitas?.UuidFakultasUnit ||
        "",
    ).toLowerCase();
    const targetFuName = String(
      proker?.fakultas_unit ||
        proker?.FakultasUnit ||
        proker?.NamaFakultasUnit ||
        aktivitas?.fakultas_unit ||
        aktivitas?.FakultasUnit ||
        aktivitas?.NamaFakultasUnit ||
        "",
    )
      .trim()
      .toLowerCase();

    // 1. Cek dari penugasan ABAC (user.extra_role) yang sesuai tahun aktif
    if (Array.isArray(user?.extra_role) && user.extra_role.length > 0) {
      const match = user.extra_role.some((r) => {
        const rYear = String(r.tahun ?? r.Tahun ?? "").trim();
        if (positionYear && rYear && rYear !== String(positionYear).trim())
          return false;
        const rFuId = String(r.id_fakultas_unit ?? r.IdFakultasUnit ?? "");
        const rFuUuid = String(
          r.uuid_fakultas_unit ?? r.UuidFakultasUnit ?? "",
        ).toLowerCase();
        const rFuName = String(
          r.fakultas_unit ??
            r.FakultasUnit ??
            r.nama_fakultas_unit ??
            r.NamaFakultasUnit ??
            "",
        )
          .trim()
          .toLowerCase();
        if (targetFuId && rFuId && targetFuId === rFuId) return true;
        if (targetFuUuid && rFuUuid && targetFuUuid === rFuUuid) return true;
        if (targetFuName && rFuName && targetFuName === rFuName) return true;
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
        if (targetFuId && directFu === targetFuId) return true;
        if (targetFuUuid && directFu.toLowerCase() === targetFuUuid)
          return true;
        if (targetFuName && directFu.toLowerCase() === targetFuName)
          return true;
      }

      const directFuUuid = String(
        user?.uuid_fakultas_unit || user?.UuidFakultasUnit || "",
      ).toLowerCase();
      if (directFuUuid && targetFuUuid && directFuUuid === targetFuUuid)
        return true;

      const directFuName = String(
        user?.nama_fakultas_unit || user?.NamaFakultasUnit || "",
      )
        .trim()
        .toLowerCase();
      if (directFuName && targetFuName && directFuName === targetFuName)
        return true;
    }

    return false;
  }, [user, proker, aktivitas, positionYear, isUpmUser]);

  const canManageTimeline =
    ((isLevelUser && hasAssignedTarget) || isAdmin) &&
    !isUpmUser &&
    isYearMatch;

  // Jadwal Proker V3 Status Check
  const [jadwalProkerStatus, setJadwalProkerStatus] = useState(null);
  const [loadingJadwalStatus, setLoadingJadwalStatus] = useState(false);

  const fetchJadwalStatus = useCallback(
    async (pData, aData) => {
      const targetYear = pData?.Tahun || aData?.Tahun || positionYear || "2027";
      const targetUnitId = pData?.IdFakultasUnit ?? aData?.IdFakultasUnit ?? "";
      const targetUnitName =
        pData?.NamaFakultasUnit ?? aData?.NamaFakultasUnit ?? "";
      let params = `tahun=${encodeURIComponent(targetYear)}`;
      if (targetUnitId) {
        params += `&id_fakultas_unit=${encodeURIComponent(targetUnitId)}`;
      }
      if (targetUnitName) {
        params += `&nama_fakultas_unit=${encodeURIComponent(targetUnitName)}`;
      }
      setLoadingJadwalStatus(true);
      try {
        const res = await apiClient
          .get(`/proker_v3/jadwal_status?${params}`)
          .catch(() => null);
        if (res?.data) {
          setJadwalProkerStatus(res.data);
        }
      } catch (err) {
        console.warn("Gagal memeriksa jadwal proker:", err);
      } finally {
        setLoadingJadwalStatus(false);
      }
    },
    [positionYear],
  );

  // Cek apakah status proker dan aktivitas masih draf atau diajukan
  const isStatusDraftOrDiajukan = useMemo(() => {
    const normalize = (val) =>
      String(val || "")
        .toLowerCase()
        .trim();
    const actStatus = normalize(aktivitas?.Status || aktivitas?.status);
    const prokerStatus = normalize(proker?.Status || proker?.status);

    const isDraftOrSubmitted = (s) =>
      s === "draft" || s === "draf" || s === "diajukan" || s === "";

    return isDraftOrSubmitted(actStatus) && isDraftOrSubmitted(prokerStatus);
  }, [aktivitas, proker]);

  // Tombol Edit dan Hapus tahapan timeline HANYA muncul ketika status masih draf dan diajukan
  const canEditOrDeleteTimeline = useMemo(() => {
    if (!canManageTimeline) return false;
    return isStatusDraftOrDiajukan;
  }, [canManageTimeline, isStatusDraftOrDiajukan]);

  const isDiterimaAnggaran = useMemo(() => {
    const sAnggAct = String(
      aktivitas?.StatusAnggaran || aktivitas?.status_anggaran || "",
    )
      .toLowerCase()
      .trim();
    const sMainAct = String(aktivitas?.Status || aktivitas?.status || "")
      .toLowerCase()
      .trim();
    const sAnggProker = String(
      proker?.StatusAnggaran || proker?.status_anggaran || "",
    )
      .toLowerCase()
      .trim();
    const sMainProker = String(proker?.Status || proker?.status || "")
      .toLowerCase()
      .trim();

    return (
      sAnggAct === "terima_anggaran" ||
      sAnggAct === "disetujui" ||
      sMainAct === "terima_anggaran" ||
      sMainAct === "terima anggaran" ||
      sAnggProker === "terima_anggaran" ||
      sAnggProker === "disetujui" ||
      sMainProker === "terima_anggaran" ||
      sMainProker === "terima anggaran"
    );
  }, [aktivitas, proker]);

  const isTimelineRabDisabled = isAdmin || !isDiterimaAnggaran;
  const timelineRabDisabledTitle = isAdmin
    ? "Level Admin tidak diizinkan mengelola atau mengedit rincian RAB tahapan"
    : "RAB hanya dapat dikelola ketika status anggaran sudah 'Diterima Anggaran'";

  const isUnitProdi = useMemo(() => {
    const t = String(
      aktivitas?.TypeFakultasUnit ||
        proker?.TypeFakultasUnit ||
        proker?.type_fakultas_unit ||
        "",
    )
      .toLowerCase()
      .trim();
    const name = String(
      aktivitas?.NamaFakultasUnit || proker?.NamaFakultasUnit || "",
    ).toLowerCase();
    return t === "prodi" || name.includes("prodi");
  }, [aktivitas, proker]);

  // Data Stempel Cap Audit Mutu Resmi (UPML/UPMS, UPMF, LPM)
  // Sumber data tepat seperti tabel di /proker_v3/:uuid/aktivitas
  const verificationStamps = useMemo(() => {
    if (!aktivitas) return [];
    const actStatusStr = String(
      aktivitas?.Status || aktivitas?.status || "draft",
    ).toLowerCase();

    const formatStampData = (rawStatus, roleCode, label, note) => {
      const s = String(rawStatus || "")
        .toLowerCase()
        .trim();
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

      return {
        roleCode,
        label,
        statusType,
        mainText,
        topHeader,
        bottomSub,
        note,
      };
    };

    if (isUnitProdi) {
      // Prodi: UPMS, UPMF, LPM
      const upmsSt = aktivitas.StatusUpms || aktivitas.status_upms || "";
      const upmsNote =
        aktivitas.CatatanTolakUpms ||
        aktivitas.catatan_tolak_upms ||
        aktivitas.CatatanVerifikator ||
        aktivitas.CatatanPenolakan;

      const upmfSt = aktivitas.StatusUpmf || aktivitas.status_upmf || "";
      const upmfNote =
        aktivitas.CatatanTolakUpmf ||
        aktivitas.catatan_tolak_upmf ||
        aktivitas.CatatanVerifikator ||
        aktivitas.CatatanPenolakan;

      const lpmSt = aktivitas.StatusLpm || aktivitas.status_lpm || "";
      const lpmNote =
        aktivitas.CatatanTolakLpm ||
        aktivitas.catatan_tolak_lpm ||
        aktivitas.CatatanVerifikator ||
        aktivitas.CatatanPenolakan;

      const list = [
        formatStampData(
          upmsSt,
          "UPMS",
          "Unit Penjaminan Mutu Prodi (UPMS)",
          upmsNote,
        ),
      ];

      if (upmfSt && upmfSt !== "-" && upmfSt !== "strip") {
        list.push(
          formatStampData(
            upmfSt,
            "UPMF",
            "Unit Penjaminan Mutu Fakultas (UPMF)",
            upmfNote,
          ),
        );
      }

      list.push(
        formatStampData(lpmSt, "LPM", "Lembaga Penjaminan Mutu (LPM)", lpmNote),
      );

      return list;
    } else {
      // Unit / Fakultas non-prodi: UPML & LPM
      const upmlSt = aktivitas.StatusUpml || aktivitas.status_upml || "";
      const upmlNote =
        aktivitas.CatatanTolakUpml ||
        aktivitas.catatan_tolak_upml ||
        aktivitas.CatatanVerifikator ||
        aktivitas.CatatanPenolakan;

      const lpmSt = aktivitas.StatusLpm || aktivitas.status_lpm || "";
      const lpmNote =
        aktivitas.CatatanTolakLpm ||
        aktivitas.catatan_tolak_lpm ||
        aktivitas.CatatanVerifikator ||
        aktivitas.CatatanPenolakan;

      return [
        formatStampData(
          upmlSt,
          "UPML",
          "Unit Penjaminan Mutu Lembaga (UPML)",
          upmlNote,
        ),
        formatStampData(lpmSt, "LPM", "Lembaga Penjaminan Mutu (LPM)", lpmNote),
      ];
    }
  }, [aktivitas, isUnitProdi]);

  // Periksa apakah RAB aktivitas dikunci karena status sudah diverifikasi verifikator DAN anggaran
  const isRabLocked = useMemo(() => {
    if (!aktivitas) return false;
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

    const actStatus = normalize(aktivitas.Status || aktivitas.status);
    const actVerif = normalize(
      aktivitas.StatusVerifikator || aktivitas.status_verifikator,
    );
    const actAngg = normalize(
      aktivitas.StatusAnggaran || aktivitas.status_anggaran,
    );

    const pStatus = normalize(proker?.Status || proker?.status);
    const pVerif = normalize(
      proker?.StatusVerifikator || proker?.status_verifikator,
    );
    const pAngg = normalize(proker?.StatusAnggaran || proker?.status_anggaran);

    const isProkerLocked =
      (isVerifApproved(pVerif) && isAnggaranApproved(pAngg)) ||
      pStatus.includes("terima_anggaran");

    const isActLocked =
      (isVerifApproved(actVerif) && isAnggaranApproved(actAngg)) ||
      actStatus.includes("terima_anggaran") ||
      isAnggaranApproved(actAngg);

    return isProkerLocked || isActLocked;
  }, [aktivitas, proker]);

  const canEditActRab =
    isLevelUser &&
    !isUpmUser &&
    isYearMatch &&
    hasAssignedTarget &&
    !isRabLocked;

  // Form Timeline State (Create / Edit)
  const [editingTimelineUuid, setEditingTimelineUuid] = useState(null);
  const [submittingTimeline, setSubmittingTimeline] = useState(false);

  const currentYear = (new Date().getFullYear() + 1);

  const initialFormState = {
    no_aktivitas: 1,
    nama_aktivitas: "",
    pic: "",
    titik_kontrol: "",
    anggaran: 0,
    tanggal_rk_awal: `${currentYear}-01-01`,
    tanggal_rk_akhir: `${currentYear}-12-31`,
    capaian: "",
    masalah: "",
    pemecahan_masalah: "",
  };

  const [formTimeline, setFormTimeline] = useState(initialFormState);
  const [anggaranInputStr, setAnggaranInputStr] = useState("");

  // Batas maksimal anggaran yang diizinkan untuk tahapan timeline (mengikuti anggaran realisasi)
  const maxAnggaran = useMemo(() => {
    if (!aktivitas) return 0;
    if (hasRealisasiAnggaran(aktivitas)) {
      return Number(getRealisasiAnggaran(aktivitas)) || 0;
    }
    return Number(aktivitas?.Anggaran ?? aktivitas?.anggaran ?? 0);
  }, [aktivitas]);

  const isAnggaranOverLimit =
    maxAnggaran > 0 && formTimeline.anggaran > maxAnggaran;

  const handleAnggaranChange = (e) => {
    const rawValue = e.target.value;
    const digitsOnly = rawValue.replace(/\D/g, "");
    if (!digitsOnly) {
      setFormTimeline((prev) => ({ ...prev, anggaran: 0 }));
      setAnggaranInputStr("");
      return;
    }
    const numericVal = Number(digitsOnly);
    setFormTimeline((prev) => ({ ...prev, anggaran: numericVal }));
    setAnggaranInputStr(new Intl.NumberFormat("id-ID").format(numericVal));
  };

  const handleSetMaxAnggaran = () => {
    if (maxAnggaran <= 0) return;
    setFormTimeline((prev) => ({ ...prev, anggaran: maxAnggaran }));
    setAnggaranInputStr(new Intl.NumberFormat("id-ID").format(maxAnggaran));
  };

  // Perkembangan Realisasi Modal State (Modal 3 input: Tgl R Awal, Tgl R Akhir, Status Pelaksanaan)
  const [realisasiModalOpen, setRealisasiModalOpen] = useState(false);
  const [selectedTimelineForRealisasi, setSelectedTimelineForRealisasi] =
    useState(null);
  const [realisasiForm, setRealisasiForm] = useState({
    tanggal_r_awal: "",
    tanggal_r_akhir: "",
    status: "Belum Terlaksana",
  });
  const [savingRealisasi, setSavingRealisasi] = useState(false);

  // RAB Modal State
  const [rabModalOpen, setRabModalOpen] = useState(false);
  const [selectedTimelineForRab, setSelectedTimelineForRab] = useState(null);
  const [rabRows, setRabRows] = useState([]);
  const [savingRab, setSavingRab] = useState(false);

  // Standalone RAB Aktivitas State (Gambar 1 sebelum Form Timeline)
  const [actRabRows, setActRabRows] = useState([]);
  const [isSavingActRab, setIsSavingActRab] = useState(false);

  // Drag and drop state for table ordering
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Per-Row Dynamic File / Link & Keterangan Form State: Map of timelineUuid -> Array of evidence rows
  const [rowFormRows, setRowFormRows] = useState({});
  const [rowSubmittingLinks, setRowSubmittingLinks] = useState({});

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

  // Parse RAB Aktivitas (Standar Biaya Umum / Gambar 1)
  const parseActRabRows = (act) => {
    if (!act) return [];
    const sourceRab = act.RabItems || act.RAB || act.rab;
    let initialRabRows = [];
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
              id: r.id || r.uuid || `act-rab-${Date.now()}-${idx}`,
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

    if (initialRabRows.length === 0 && act.Anggaran) {
      const ang = Number(act.Anggaran) || 0;
      if (ang > 0) {
        initialRabRows = [
          {
            id: `act-rab-${Date.now()}-0`,
            no_akun: "",
            nama_akun: "",
            kategori: "",
            keterangan: "Alokasi Anggaran Kegiatan",
            qty_satuan: 1,
            qty_paket: 1,
            sbu: ang,
            harga_satuan: ang,
            total: ang,
          },
        ];
      }
    }
    return initialRabRows;
  };

  // Fetch detail aktivitas, proker, and timelines
  const fetchData = async () => {
    if (!actUuid) return;
    setLoading(true);
    setIsAccessBlocked(false);
    setAccessBlockInfo(null);
    try {
      const res = await apiClient.get(`/proker_v3/aktivitas/${actUuid}`);
      const json = res.data;

      const rawProker = json.proker || null;
      if (rawProker) {
        rawProker.Tahun = rawProker.Tahun || rawProker.tahun;
        rawProker.NamaProgram = rawProker.NamaProgram || rawProker.nama_program;
        rawProker.NamaFakultasUnit =
          rawProker.NamaFakultasUnit || rawProker.nama_fakultas_unit;
        rawProker.IdFakultasUnit =
          rawProker.IdFakultasUnit ?? rawProker.id_fakultas_unit;
        rawProker.UuidFakultasUnit =
          rawProker.UuidFakultasUnit || rawProker.uuid_fakultas_unit;
        rawProker.ParentFakultas =
          rawProker.ParentFakultas || rawProker.parent_fakultas;
      }

      // Validasi hak akses klien jika data ter-load
      if (rawProker && !checkClientAccess(rawProker)) {
        setIsAccessBlocked(true);
        setAccessBlockInfo({
          title: "Akses Ditolak: Bukan Unit Penugasan Anda",
          message: `Anda sedang aktif dengan hak akses ${curRole.toUpperCase()}${activeRoleUnit?.name ? ` (${activeRoleUnit.name})` : ""}, sedangkan jadwal kegiatan "${rawProker.NamaProgram || "-"}" ini berada di bawah ${rawProker.NamaFakultasUnit || "unit lain"}. Anda tidak memiliki hak akses untuk melihat rincian jadwal kegiatan unit ini.`,
          proker: rawProker,
          targetUnit: rawProker.NamaFakultasUnit || "Unit Terkait",
        });
        setAktivitas(null);
        setProker(null);
        setTimelines([]);
        setLoading(false);
        return;
      }

      setAktivitas(json.aktivitas || null);
      setActRabRows(parseActRabRows(json.aktivitas));
      setProker(rawProker);
      fetchJadwalStatus(rawProker, json.aktivitas);

      const rawList = json.data || json.timelines || [];
      const mergedList = rawList.map((tl) => {
        const uid = tl.UUID || tl.uuid;
        let rabVal = tl.RAB || tl.rab;
        if (!rabVal && uid) {
          try {
            const cached = localStorage.getItem(`rab_${uid}`);
            if (cached) rabVal = cached;
          } catch (e) {
            // ignore
          }
        }
        return {
          ...tl,
          RAB: rabVal,
        };
      });
      setTimelines(mergedList);

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
      if (err?.response?.status === 403) {
        setIsAccessBlocked(true);
        setAccessBlockInfo({
          title: "Akses Ditolak: Bukan Unit Penugasan Anda",
          message:
            err?.response?.data?.error ||
            "Anda tidak memiliki hak akses untuk melihat jadwal kegiatan program kerja unit ini.",
          activeRole: curRole,
          activeRoleUnit: activeRoleUnit?.name,
          targetUnit: "Unit Lain (Di Luar Penugasan)",
        });
        setAktivitas(null);
        setProker(null);
        setTimelines([]);
      } else {
        addToast("error", err?.message || "Layanan tidak dapat dihubungi");
      }
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

  // Helper format tanggal ringkas: Tanggal BulanSingkat Tahun
  const formatDateIndoShort = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  };

  useEffect(() => {
    fetchData();
  }, [actUuid, curRole, positionYear]);

  useEffect(() => {
    if (proker || aktivitas) {
      fetchJadwalStatus(proker, aktivitas);
    }
  }, [positionYear, fetchJadwalStatus]);

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
    [],
  );

  const weekToDayRange = useMemo(
    () => ({
      M1: [1, 7],
      M2: [8, 14],
      M3: [15, 21],
      M4: [22, 31],
    }),
    [],
  );

  const isWeekInDateRange = (monthKey, week, startStr, endStr) => {
    if (!startStr || !endStr) return false;
    const s = new Date(startStr);
    const e = new Date(endStr);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return false;

    const year = s.getFullYear() || currentYear;
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
        if (!rkAkhir || tl.TanggalRkAkhir > rkAkhir)
          rkAkhir = tl.TanggalRkAkhir;
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
    if (!isDiterimaAnggaran) {
      addToast(
        "warning",
        "Perkembangan realisasi hanya dapat diisi ketika status anggaran sudah 'Diterima Anggaran'",
      );
      return;
    }
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
        realisasiForm.tanggal_r_akhir,
      );
      const fd = new FormData();
      if (realisasiForm.tanggal_r_awal)
        fd.append("tanggal_r_awal", realisasiForm.tanggal_r_awal);
      if (realisasiForm.tanggal_r_akhir)
        fd.append("tanggal_r_akhir", realisasiForm.tanggal_r_akhir);
      fd.append("jadwal_r", JSON.stringify(rSlotsGen));
      fd.append("status", realisasiForm.status || "Belum Terlaksana");

      const res = await apiClient.put(
        `/proker_v3/timeline/${selectedTimelineForRealisasi.UUID}`,
        fd,
      );

      addToast(
        "success",
        `Perkembangan realisasi "${selectedTimelineForRealisasi.NamaAktivitas}" berhasil disimpan`,
      );
      setRealisasiModalOpen(false);
      setSelectedTimelineForRealisasi(null);
      fetchData();
    } catch (err) {
      addToast("error", err?.message || "Layanan tidak dapat dihubungi");
    } finally {
      setSavingRealisasi(false);
    }
  };

  // Helper untuk parsing rincian RAB dari objek timeline
  const parseTimelineRab = (tl) => {
    if (!tl) return [];
    const uid = tl.UUID || tl.uuid;
    let raw = tl.RAB || tl.rab;
    if (!raw && uid) {
      try {
        raw = localStorage.getItem(`rab_${uid}`);
      } catch (e) {
        // ignore
      }
    }
    if (!raw) return [];
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item, idx) => {
          const qSatuan =
            Number(
              item.qty_satuan !== undefined
                ? item.qty_satuan
                : item.qtySatuan !== undefined
                  ? item.qtySatuan
                  : 1,
            ) || 0;
          const qPaket =
            Number(
              item.qty_paket !== undefined
                ? item.qty_paket
                : item.qtyPaket !== undefined
                  ? item.qtyPaket
                  : 1,
            ) || 0;
          const hSatuan =
            Number(
              item.harga_satuan !== undefined
                ? item.harga_satuan
                : item.hargaSatuan !== undefined
                  ? item.hargaSatuan
                  : 0,
            ) || 0;
          const rowTotal =
            item.total !== undefined
              ? Number(item.total)
              : qSatuan * qPaket * hSatuan;

          return {
            id: item.id || `rab-${idx}`,
            keterangan: item.keterangan || "",
            qty_satuan: qSatuan,
            qty_paket: qPaket,
            harga_satuan: hSatuan,
            total: rowTotal,
            bukti_url: item.bukti_url || item.buktiUrl || "",
            bukti_name: item.bukti_name || item.buktiName || "",
            file_obj: null,
          };
        });
      }
    } catch (e) {
      console.warn("Gagal parse RAB timeline:", e);
    }
    return [];
  };

  // Handlers untuk RAB Aktivitas (Gambar 1 sebelum Form Timeline)
  const handleActRabRowChange = (index, field, value) => {
    if (!canEditActRab) return;
    setActRabRows((prev) => {
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

  const handleAddActRabRow = () => {
    if (!canEditActRab) return;
    setActRabRows((prev) => [
      ...prev,
      {
        id: `act-rab-${Date.now()}-${prev.length}`,
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

  const handleRemoveActRabRow = (index) => {
    if (!canEditActRab) return;
    if (actRabRows.length <= 1) {
      addToast("warning", "Minimal harus ada 1 baris rincian anggaran.");
      return;
    }
    setActRabRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveActRab = async () => {
    if (!actUuid) return;
    if (!canEditActRab) {
      addToast(
        "warning",
        "Akses ditolak: Hanya level user pemilik fakultas/unit yang dapat mengubah RAB.",
      );
      return;
    }
    setIsSavingActRab(true);
    try {
      const calculatedTotalAnggaran = actRabRows.reduce(
        (sum, r) => sum + (Number(r.total) || 0),
        0,
      );

      const fd = new FormData();
      fd.append("anggaran", String(calculatedTotalAnggaran));
      fd.append("rab", JSON.stringify(actRabRows));

      await apiClient.put(`/proker_v3/aktivitas/${actUuid}`, fd);
      addToast(
        "success",
        `Rincian Anggaran Biaya aktivitas berhasil diperbarui: ${formatRupiah(calculatedTotalAnggaran)}`,
      );
      await fetchData();
    } catch (err) {
      addToast(
        "error",
        err?.response?.data?.error || err?.message || "Gagal memperbarui RAB",
      );
    } finally {
      setIsSavingActRab(false);
    }
  };

  const totalActRab = useMemo(() => {
    if (actRabRows.length > 0) {
      return actRabRows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
    }
    return Number(aktivitas?.Anggaran) || 0;
  }, [actRabRows, aktivitas?.Anggaran]);

  // Open modal RAB
  const openRabModal = (tl) => {
    if (isTimelineRabDisabled) {
      addToast("warning", timelineRabDisabledTitle);
      return;
    }
    setSelectedTimelineForRab(tl);
    let initialRows = parseTimelineRab(tl);

    if (initialRows.length === 0) {
      const currentAnggaran = Number(tl.Anggaran ?? tl.anggaran ?? 0);
      initialRows = [
        {
          id: `rab-${Date.now()}-0`,
          keterangan: tl.NamaAktivitas ? `Biaya ${tl.NamaAktivitas}` : "",
          qty_satuan: 1,
          qty_paket: 1,
          harga_satuan: currentAnggaran,
          total: currentAnggaran,
          bukti_url: "",
          bukti_name: "",
          file_obj: null,
        },
      ];
    }
    setRabRows(initialRows);
    setRabModalOpen(true);
  };

  const handleRabRowChange = (index, field, value) => {
    setRabRows((prev) => {
      const updated = [...prev];
      const row = { ...updated[index], [field]: value };
      const satuan = Number(row.qty_satuan) || 0;
      const paket = Number(row.qty_paket) || 0;
      const harga = Number(row.harga_satuan) || 0;
      row.total = satuan * paket * harga;
      updated[index] = row;
      return updated;
    });
  };

  const handleAddRabRow = () => {
    setRabRows((prev) => [
      ...prev,
      {
        id: `rab-${Date.now()}-${prev.length}`,
        keterangan: "",
        qty_satuan: 1,
        qty_paket: 1,
        harga_satuan: 0,
        total: 0,
        bukti_url: "",
        bukti_name: "",
        file_obj: null,
      },
    ]);
  };

  const handleRemoveRabRow = (index) => {
    setRabRows((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length === 0) {
        return [
          {
            id: `rab-${Date.now()}-0`,
            keterangan: "",
            qty_satuan: 1,
            qty_paket: 1,
            harga_satuan: 0,
            total: 0,
            bukti_url: "",
            bukti_name: "",
            file_obj: null,
          },
        ];
      }
      return updated;
    });
  };

  const handleRabFileChange = (index, file) => {
    if (!file) return;
    setRabRows((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        file_obj: file,
        bukti_name: file.name,
      };
      return updated;
    });
  };

  const totalRab = useMemo(() => {
    return rabRows.reduce((acc, r) => acc + (Number(r.total) || 0), 0);
  }, [rabRows]);

  const otherTimelinesAllocated = useMemo(() => {
    if (!selectedTimelineForRab) return 0;
    const curUuid = selectedTimelineForRab.UUID || selectedTimelineForRab.uuid;
    return timelines
      .filter((t) => (t.UUID || t.uuid) !== curUuid)
      .reduce((acc, t) => acc + (Number(t.Anggaran ?? t.anggaran) || 0), 0);
  }, [timelines, selectedTimelineForRab]);

  const totalAlokasiRabAktivitas = useMemo(() => {
    return otherTimelinesAllocated + totalRab;
  }, [otherTimelinesAllocated, totalRab]);

  const handleSaveRab = async (e) => {
    if (e) e.preventDefault();
    if (isTimelineRabDisabled) {
      addToast("warning", timelineRabDisabledTitle);
      return;
    }
    if (!selectedTimelineForRab) return;

    const maxPagu = maxAnggaran;
    if (maxPagu > 0 && totalAlokasiRabAktivitas > maxPagu) {
      addToast(
        "error",
        `Total Alokasi RAB seluruh tahapan (${formatRupiah(totalAlokasiRabAktivitas)}) melebihi batas pagu aktivitas (${formatRupiah(maxPagu)}). Alokasi tahapan lain: ${formatRupiah(otherTimelinesAllocated)}`,
      );
      return;
    }

    const tlUuid = selectedTimelineForRab.UUID || selectedTimelineForRab.uuid;
    if (!tlUuid) {
      addToast("error", "UUID tahapan tidak valid");
      return;
    }

    setSavingRab(true);
    try {
      // 1. Upload berkas bukti jika ada file baru yang dipilih
      const finalRows = [];
      for (const row of rabRows) {
        let fileUrl = row.bukti_url || "";
        let fileName = row.bukti_name || "";

        if (row.file_obj) {
          const fileFd = new FormData();
          fileFd.append("files", row.file_obj);
          fileFd.append(
            "keterangan",
            `Bukti RAB: ${row.keterangan || "Item RAB"}`,
          );
          try {
            const uploadRes = await apiClient.post(
              `/proker_v3/timeline/${tlUuid}/files`,
              fileFd,
              { headers: { "Content-Type": "multipart/form-data" } },
            );
            if (uploadRes.data?.data && uploadRes.data.data.length > 0) {
              const uploaded = uploadRes.data.data[0];
              fileUrl = uploaded.FileURL || uploaded.file_url || "";
              fileName =
                uploaded.NamaFile || uploaded.nama_file || row.file_obj.name;
            }
          } catch (uploadErr) {
            console.error("Gagal mengunggah berkas bukti RAB:", uploadErr);
          }
        }

        finalRows.push({
          id: row.id,
          keterangan: (row.keterangan || "").trim(),
          qty_satuan: Number(row.qty_satuan) || 0,
          qty_paket: Number(row.qty_paket) || 0,
          harga_satuan: Number(row.harga_satuan) || 0,
          total: Number(row.total) || 0,
          bukti_url: fileUrl,
          bukti_name: fileName,
        });
      }

      const rabJson = JSON.stringify(finalRows);

      // Simpan cadangan ke localStorage
      try {
        localStorage.setItem(`rab_${tlUuid}`, rabJson);
      } catch (lsErr) {
        console.warn("Gagal simpan ke localStorage:", lsErr);
      }

      // 2. Simpan ke timeline via PUT
      const updateFd = new FormData();
      updateFd.append("anggaran", String(totalRab));
      updateFd.append("rab", rabJson);

      await apiClient.put(`/proker_v3/timeline/${tlUuid}`, updateFd);

      // Optimistic update state timelines
      setTimelines((prev) =>
        prev.map((item) =>
          item.UUID === tlUuid || item.uuid === tlUuid
            ? {
                ...item,
                Anggaran: totalRab,
                anggaran: totalRab,
                RAB: rabJson,
                rab: rabJson,
              }
            : item,
        ),
      );

      addToast(
        "success",
        `RAB tahapan berhasil disimpan (Total: ${formatRupiah(totalRab)})`,
      );
      setRabModalOpen(false);
      setSelectedTimelineForRab(null);
      await fetchData();
    } catch (err) {
      console.error(err);
      addToast(
        "error",
        err?.response?.data?.message || err?.message || "Gagal menyimpan RAB",
      );
    } finally {
      setSavingRab(false);
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
      const fd = new FormData();
      fd.append(
        "items",
        JSON.stringify(
          reordered.map((item) => ({
            uuid: item.UUID,
            no_aktivitas: item.NoAktivitas,
          })),
        ),
      );

      await apiClient.put(
        `/proker_v3/aktivitas/${actUuid}/timeline/reorder`,
        fd,
      );

      addToast(
        "success",
        "Urutan nomor urut tahapan timeline berhasil diperbarui.",
      );
    } catch (err) {
      addToast("warning", "Gagal menyimpan urutan nomor ke server.");
    }
  };

  // Reset form to create mode (nama_aktivitas tidak diset dari nama aktivitas induk)
  const resetForm = () => {
    setEditingTimelineUuid(null);
    const yr = proker?.Tahun || aktivitas?.Tahun || currentYear;
    setFormTimeline({
      ...initialFormState,
      no_aktivitas: timelines.length + 1,
      nama_aktivitas: "",
      pic: aktivitas?.PIC || "",
      anggaran: 0,
      tanggal_rk_awal: `${yr}-01-01`,
      tanggal_rk_akhir: `${yr}-12-31`,
    });
    setAnggaranInputStr("");
  };

  // Start editing a timeline row
  const startEditTimeline = (tl) => {
    if (!isStatusDraftOrDiajukan) {
      addToast(
        "warning",
        "Tahapan timeline hanya dapat diedit ketika status program kerja / aktivitas masih Draf atau Diajukan.",
      );
      return;
    }
    if (!canManageTimeline) {
      addToast(
        "warning",
        "Akses ditolak: Anda tidak memiliki izin untuk mengelola tahapan timeline",
      );
      return;
    }

    setEditingTimelineUuid(tl.UUID);
    const tlAnggaran = Number(tl.Anggaran ?? tl.anggaran ?? 0);
    const yr = proker?.Tahun || aktivitas?.Tahun || currentYear;
    setFormTimeline({
      no_aktivitas: tl.NoAktivitas || 1,
      nama_aktivitas: tl.NamaAktivitas || "",
      pic: tl.PIC || "",
      titik_kontrol: tl.TitikKontrol || "",
      anggaran: tlAnggaran,
      tanggal_rk_awal: tl.TanggalRkAwal
        ? tl.TanggalRkAwal.slice(0, 10)
        : `${yr}-01-01`,
      tanggal_rk_akhir: tl.TanggalRkAkhir
        ? tl.TanggalRkAkhir.slice(0, 10)
        : `${yr}-12-31`,
      capaian: tl.Capaian || "",
      masalah: tl.Masalah || "",
      pemecahan_masalah: tl.PemecahanMasalah || "",
    });
    setAnggaranInputStr(
      tlAnggaran > 0 ? new Intl.NumberFormat("id-ID").format(tlAnggaran) : "",
    );
    // Scroll to form smoothly
    const el = document.getElementById("form-timeline-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  // Submit Timeline Form (POST or PUT)
  const handleSubmitTimeline = async (e) => {
    e.preventDefault();
    if (!canManageTimeline) {
      addToast(
        "warning",
        "Akses ditolak: Anda tidak memiliki izin untuk mengelola tahapan timeline",
      );
      return;
    }
    if (!formTimeline.nama_aktivitas.trim()) {
      addToast("warning", "Nama aktivitas / tahapan wajib diisi");
      return;
    }

    const nominalAnggaran = Number(formTimeline.anggaran) || 0;
    if (nominalAnggaran < 0) {
      addToast("warning", "Nominal anggaran tidak boleh bernilai negatif");
      return;
    }
    if (maxAnggaran > 0 && nominalAnggaran > maxAnggaran) {
      addToast(
        "warning",
        `Nominal anggaran (${formatRupiah(nominalAnggaran)}) tidak boleh melebihi batas anggaran realisasi kegiatan (${formatRupiah(maxAnggaran)})`,
      );
      return;
    }

    if (
      formTimeline.tanggal_rk_awal &&
      formTimeline.tanggal_rk_akhir &&
      formTimeline.tanggal_rk_akhir < formTimeline.tanggal_rk_awal
    ) {
      addToast(
        "warning",
        "Tanggal RK Akhir tidak boleh lebih awal dari Tanggal RK Awal",
      );
      return;
    }

    setSubmittingTimeline(true);
    try {
      const token = getValidToken();
      const targetNo = editingTimelineUuid
        ? formTimeline.no_aktivitas || 1
        : timelines.length + 1;

      const yr = proker?.Tahun || aktivitas?.Tahun || currentYear;
      const rkSlotsGen = getSlotsFromDateRange(
        formTimeline.tanggal_rk_awal || `${yr}-01-01`,
        formTimeline.tanggal_rk_akhir || `${yr}-12-31`,
      );

      const fd = new FormData();
      fd.append("no_aktivitas", String(targetNo));
      fd.append("nama_aktivitas", formTimeline.nama_aktivitas.trim());
      fd.append("pic", formTimeline.pic.trim());
      fd.append("titik_kontrol", formTimeline.titik_kontrol.trim());
      fd.append("anggaran", String(nominalAnggaran));
      fd.append(
        "tanggal_rk_awal",
        formTimeline.tanggal_rk_awal || `${yr}-01-01`,
      );
      fd.append(
        "tanggal_rk_akhir",
        formTimeline.tanggal_rk_akhir || `${yr}-12-31`,
      );
      fd.append("jadwal_rk", JSON.stringify(rkSlotsGen));
      fd.append("capaian", formTimeline.capaian.trim());
      fd.append("masalah", formTimeline.masalah.trim());
      fd.append("pemecahan_masalah", formTimeline.pemecahan_masalah.trim());

      const url = editingTimelineUuid
        ? `/proker_v3/timeline/${editingTimelineUuid}`
        : `/proker_v3/aktivitas/${actUuid}/timeline`;

      const res = editingTimelineUuid
        ? await apiClient.put(url, fd)
        : await apiClient.post(url, fd);

      const json = res.data;

      addToast(
        "success",
        editingTimelineUuid
          ? "Tahapan timeline berhasil diperbarui"
          : "Tahapan timeline baru berhasil ditambahkan",
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
    if (!isStatusDraftOrDiajukan) {
      addToast(
        "warning",
        "Tahapan timeline hanya dapat dihapus ketika status program kerja / aktivitas masih Draf atau Diajukan.",
      );
      setDeleteTimelineDialog(false);
      return;
    }
    if (!canManageTimeline) {
      addToast(
        "warning",
        "Akses ditolak: Anda tidak memiliki izin untuk menghapus tahapan timeline",
      );
      setDeleteTimelineDialog(false);
      return;
    }
    if (!timelineToDelete?.UUID) return;
    setDeletingTimeline(true);
    try {
      const res = await apiClient.delete(
        `/proker_v3/timeline/${timelineToDelete.UUID}`,
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
  const createEmptyEvidenceRow = (prefix = "row") => ({
    id: `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    mode: "file",
    file: null,
    url: "",
    nama_file: "",
    keterangan: "",
    error: "",
    touched: false,
  });

  const getRowFormRows = (timelineUuid) => {
    if (!rowFormRows[timelineUuid] || rowFormRows[timelineUuid].length === 0) {
      return [
        {
          id: `init-${timelineUuid}`,
          mode: "file",
          file: null,
          url: "",
          nama_file: "",
          keterangan: "",
          error: "",
          touched: false,
        },
      ];
    }
    return rowFormRows[timelineUuid];
  };

  const addRowFormRow = (timelineUuid) => {
    const current = getRowFormRows(timelineUuid);
    setRowFormRows((prev) => ({
      ...prev,
      [timelineUuid]: [...current, createEmptyEvidenceRow("row")],
    }));
  };

  const removeRowFormRow = (timelineUuid, rowId) => {
    const current = getRowFormRows(timelineUuid);
    if (current.length <= 1) {
      setRowFormRows((prev) => ({
        ...prev,
        [timelineUuid]: [createEmptyEvidenceRow("init")],
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
        r.id === rowId
          ? {
              ...r,
              [field]: value,
              ...(field === "url" || field === "file" ? { error: "" } : {}),
            }
          : r,
      ),
    }));
  };

  const switchRowFormMode = (timelineUuid, rowId, nextMode) => {
    const current = getRowFormRows(timelineUuid);
    setRowFormRows((prev) => ({
      ...prev,
      [timelineUuid]: current.map((r) => {
        if (r.id !== rowId || (r.mode || "file") === nextMode) return r;
        return {
          ...r,
          mode: nextMode,
          file: nextMode === "link" ? null : r.file,
          url: nextMode === "file" ? "" : r.url,
          nama_file: nextMode === "file" ? "" : r.nama_file,
          error: "",
          touched: false,
        };
      }),
    }));
  };

  const handleRowFileSelect = (timelineUuid, rowId, event) => {
    const selected = event.target.files?.[0] || null;
    const current = getRowFormRows(timelineUuid);
    if (!selected) {
      setRowFormRows((prev) => ({
        ...prev,
        [timelineUuid]: current.map((r) =>
          r.id === rowId ? { ...r, file: null, error: "", touched: true } : r,
        ),
      }));
      return;
    }

    const check = validateTimelineUploadFile(selected);
    if (!check.valid) {
      event.target.value = "";
      addToast("warning", check.error);
      setRowFormRows((prev) => ({
        ...prev,
        [timelineUuid]: current.map((r) =>
          r.id === rowId
            ? { ...r, file: null, error: check.error, touched: true }
            : r,
        ),
      }));
      return;
    }

    setRowFormRows((prev) => ({
      ...prev,
      [timelineUuid]: current.map((r) =>
        r.id === rowId
          ? { ...r, file: selected, error: "", touched: true }
          : r,
      ),
    }));
  };

  const handleRowUrlBlur = (timelineUuid, rowId) => {
    const current = getRowFormRows(timelineUuid);
    setRowFormRows((prev) => ({
      ...prev,
      [timelineUuid]: current.map((r) => {
        if (r.id !== rowId) return r;
        const trimmed = (r.url || "").trim();
        if (!trimmed) {
          return { ...r, touched: true, error: "" };
        }
        const check = validateTimelineLinkUrl(trimmed);
        return {
          ...r,
          touched: true,
          error: check.valid ? "" : check.error,
        };
      }),
    }));
  };

  const isRowFilled = (r) =>
    (r?.mode || "file") === "link"
      ? Boolean((r?.url || "").trim())
      : Boolean(r?.file);

  // Loop upload chunk binary untuk satu file
  const uploadRowFileChunkLoop = async (
    timeline,
    queueItem,
    startChunkIndex = 0,
  ) => {
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
          : q,
      ),
    }));

    let lastTime = performance.now();
    let lastLoaded = startChunkIndex * CHUNK_SIZE;

    for (
      let chunkIndex = startChunkIndex;
      chunkIndex < totalChunks;
      chunkIndex++
    ) {
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
        queueItem.keterangan ||
          `Bukti Kegiatan - ${timeline.NamaAktivitas || "Tahapan"}`,
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
              const percent = Math.min(
                99,
                Math.round((currentLoaded / totalBytes) * 100),
              );

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
                    : q,
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
                if (xhr.status === 413)
                  errMsg = "Ukuran berkas melebihi batas (413)";
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

          xhr.open(
            "POST",
            `${API_BASE_URL}/proker_v3/timeline/${timelineUuid}/chunk`,
          );
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
          addToast(
            "success",
            `Berkas bukti "${queueItem.fileName}" berhasil diunggah.`,
          );

          // Drop seketika item 100% dari panel progress
          setRowUploadQueues((prev) => ({
            ...prev,
            [timelineUuid]: (prev[timelineUuid] || []).filter(
              (q) => q.id !== queueId,
            ),
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
              : q,
          ),
        }));
        addToast(
          "error",
          `Gagal mengunggah "${queueItem.fileName}": ${err?.message}`,
        );
        return;
      }
    }
  };

  // Mulai upload file-file (per-chunk) & simpan tautan link dari baris dinamis
  const handleUploadRowFiles = async (timeline) => {
    if (!isDiterimaAnggaran) {
      addToast(
        "warning",
        "Unggah berkas bukti hanya dapat dilakukan ketika status anggaran sudah 'Diterima Anggaran'",
      );
      return;
    }
    if (rowSubmittingLinks[timeline.UUID]) {
      return;
    }

    const rows = getRowFormRows(timeline.UUID);
    const filledRows = rows.filter(isRowFilled);
    if (filledRows.length === 0) {
      addToast(
        "warning",
        "Pilih minimal 1 berkas file atau masukkan 1 tautan link bukti terlebih dahulu",
      );
      return;
    }

    let hasValidationError = false;
    const validatedEntries = [];
    const updatedRows = rows.map((r) => {
      if (!isRowFilled(r)) return r;
      const mode = r.mode || "file";
      if (mode === "file") {
        const check = validateTimelineUploadFile(r.file);
        if (!check.valid) {
          hasValidationError = true;
          return { ...r, file: null, touched: true, error: check.error };
        }
        validatedEntries.push({ mode: "file", row: r });
        return { ...r, error: "", touched: true };
      }

      const check = validateTimelineLinkUrl(r.url);
      if (!check.valid) {
        hasValidationError = true;
        return { ...r, touched: true, error: check.error };
      }
      validatedEntries.push({ mode: "link", row: r, linkCheck: check });
      return {
        ...r,
        url: check.normalizedUrl,
        error: "",
        touched: true,
      };
    });

    if (hasValidationError) {
      setRowFormRows((prev) => ({
        ...prev,
        [timeline.UUID]: updatedRows,
      }));
      addToast(
        "warning",
        "Periksa kembali baris bukti yang masih memiliki kesalahan.",
      );
      return;
    }

    const fileEntries = validatedEntries.filter((e) => e.mode === "file");
    const linkEntries = validatedEntries.filter((e) => e.mode === "link");
    const submittedRowIds = new Set();

    // 1. Jalankan chunk loop untuk semua file valid yang dipilih
    if (fileEntries.length > 0) {
      const newItems = fileEntries.map(({ row }, idx) => {
        submittedRowIds.add(row.id);
        const qId = `${timeline.UUID}-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
        return {
          id: qId,
          uploadId: generateUUID(),
          file: row.file,
          fileName: row.file.name,
          totalBytes: row.file.size,
          loadedBytes: 0,
          progress: 0,
          speed: "Menyiapkan...",
          eta: "",
          currentChunk: 0,
          totalChunks: Math.ceil(row.file.size / CHUNK_SIZE) || 1,
          status: "uploading",
          keterangan: row.keterangan?.trim() || "",
          error: null,
        };
      });

      setRowUploadQueues((prev) => ({
        ...prev,
        [timeline.UUID]: [...(prev[timeline.UUID] || []), ...newItems],
      }));

      newItems.forEach((item) => {
        uploadRowFileChunkLoop(timeline, item, 0);
      });
    }

    // 2. Simpan seluruh baris tautan link bukti
    let failedLinkError = "";
    const failedLinkIds = new Set();
    if (linkEntries.length > 0) {
      setRowSubmittingLinks((prev) => ({ ...prev, [timeline.UUID]: true }));
      try {
        const linksPayload = linkEntries.map(({ row, linkCheck }) => ({
          url: linkCheck.normalizedUrl,
          nama_file: (row.nama_file || "").trim() || linkCheck.fallbackName,
          keterangan:
            (row.keterangan || "").trim() ||
            `Bukti Kegiatan - ${timeline.NamaAktivitas || "Tahapan"}`,
        }));

        await apiClient.post(`/proker_v3/timeline/${timeline.UUID}/files`, {
          links: linksPayload,
        });
        linkEntries.forEach(({ row }) => submittedRowIds.add(row.id));
        await fetchData();
        addToast(
          "success",
          `${linkEntries.length} tautan bukti berhasil disimpan.`,
        );
      } catch (err) {
        failedLinkError = err?.message || "Gagal menyimpan tautan bukti";
        linkEntries.forEach(({ row }) => failedLinkIds.add(row.id));
        addToast("error", failedLinkError);
      } finally {
        setRowSubmittingLinks((prev) => ({ ...prev, [timeline.UUID]: false }));
      }
    }

    setRowFormRows((prev) => {
      const baseRows = prev[timeline.UUID] || updatedRows;
      const nextRows = baseRows
        .filter((r) => !submittedRowIds.has(r.id))
        .map((r) =>
          failedLinkIds.has(r.id) ? { ...r, error: failedLinkError } : r,
        );
      return {
        ...prev,
        [timeline.UUID]:
          nextRows.length > 0 ? nextRows : [createEmptyEvidenceRow("init")],
      };
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
        q.id === item.id ? { ...q, status: "paused", speed: "Dijeda" } : q,
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
      [timelineUuid]: (prev[timelineUuid] || []).filter(
        (q) => q.id !== item.id,
      ),
    }));
    delete uploadControlsRef.current[item.id];

    try {
      await apiClient.delete(
        `/proker_v3/timeline/${timelineUuid}/chunk/${item.uploadId}`,
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
      const res = await apiClient.delete(
        `/proker_v3/file/${fileToDelete.UUID}`,
      );
      const json = res.data;

      addToast(
        "success",
        isTimelineLinkRecord(fileToDelete)
          ? "Tautan bukti berhasil dihapus"
          : "Berkas bukti berhasil dihapus",
      );
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
                        : "/proker_v3",
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

        {isAccessBlocked ? (
          <ProkerAccessBlockCard
            curRole={curRole}
            activeRoleUnit={activeRoleUnit}
            accessBlockInfo={accessBlockInfo}
            onBack={() =>
              navigate(
                proker?.UUID
                  ? `/proker_v3/${proker.UUID}/aktivitas`
                  : prokerUuid
                    ? `/proker_v3/${prokerUuid}/aktivitas`
                    : "/proker_v3",
              )
            }
            backLabel={
              prokerUuid || proker?.UUID
                ? "Kembali ke aktivitas"
                : "Kembali ke daftar program kerja"
            }
            onChangeLevel={() => setOpenChangeLevel(true)}
            changeLevelLabel="Ganti level atau unit"
          />
        ) : (
          <>
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
                  {aktivitas?.Aktivitas ||
                    (loading ? "Memuat aktivitas..." : "-")}
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
                {isVerifierRoleOrLevel ? (
                  "***"
                ) : isAnggaranRevised(aktivitas) ? (
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
                  formatRupiah(
                    hasRealisasiAnggaran(aktivitas)
                      ? getRealisasiAnggaran(aktivitas)
                      : aktivitas?.Anggaran,
                  )
                )}
              </span>
            </div>
          </div>

          {/* Info Program Kerja Induk & PIC */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 bg-purple-50/50 rounded-xl border border-purple-100 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 whitespace-nowrap">
                Program Kerja Induk:
              </span>
              <p
                className="font-bold text-gray-800 truncate"
                title={proker?.NamaProgram}
              >
                {proker?.NamaProgram || "-"}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 text-emerald-800">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  PIC:
                </span>
                <span className="font-bold text-gray-900 text-xs">
                  {aktivitas?.PIC || "-"}
                </span>
              </div>
            </div>
          </div>

          {!isVerifierRoleOrLevel &&
            (aktivitas?.CatatanRevisiAnggaran ||
              aktivitas?.catatan_revisi_anggaran) && (
              <div className="flex items-start gap-2.5 px-3.5 py-2.5 bg-amber-50 rounded-xl border border-amber-300 text-xs">
                <Coins className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-amber-900 block">
                    Catatan Revisi Anggaran:
                  </span>
                  <p className="text-xs text-amber-950 leading-snug whitespace-pre-wrap break-words mt-0.5">
                    {aktivitas.CatatanRevisiAnggaran ||
                      aktivitas.catatan_revisi_anggaran}
                  </p>
                </div>
              </div>
            )}

          {/* Grid Metadata Matriks (Standar & Sub Standar, Target Capaian, Luaran & Dampak) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                              sc.StandarSubStandar || sc.standar_sub_standar
                            }
                          >
                            {sc.StandarSubStandar ||
                              sc.standar_sub_standar ||
                              "-"}
                          </p>
                          {(sc.IndikatorKinerja || sc.indikator_kinerja) && (
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

            {/* Target Capaian */}
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

            {/* Luaran & Dampak */}
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
          </div>

          {/* Baris Bawah: Rubber Stamp Verifikasi Mutu (UPML/UPMS, UPMF, LPM) */}
          {verificationStamps.length > 0 && (
            <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-center gap-6 sm:gap-8">
              {verificationStamps.map((stamp, idx) => (
                <div
                  key={stamp.roleCode}
                  className="flex flex-col items-center text-center"
                >
                  <span className="text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider mb-1">
                    {stamp.label}
                  </span>
                  <RubberStamp
                    status={stamp.statusType}
                    size="lg"
                    customText={stamp.mainText}
                    headerText={stamp.topHeader}
                    subText={stamp.bottomSub}
                    delay={0.05 + idx * 0.05}
                  />
                  {stamp.note && stamp.statusType === "gagal" && (
                    <span
                      className="text-[9.5px] italic text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 line-clamp-1 max-w-[140px] mt-1"
                      title={stamp.note}
                    >
                      "{stamp.note}"
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* RINCIAN ANGGARAN BIAYA (RAB) & SBU AKTIVITAS (GAMBAR 1) */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs font-bold">
                <Coins className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Rincian Anggaran Biaya
              </h3>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {isRabLocked ? (
                <div className="flex flex-col items-start sm:items-end">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>RAB Terkunci</span>
                  </span>
                  <span className="text-[10px] text-amber-700/90 text-left sm:text-right mt-1 font-medium">
                    Sudah disetujui Verifikator & Anggaran
                  </span>
                </div>
              ) : (
                canEditActRab && (
                  <>
                    <button
                      type="button"
                      onClick={handleAddActRabRow}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Rincian SBU</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveActRab}
                      disabled={isSavingActRab}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-xs hover:shadow-md transition cursor-pointer disabled:opacity-50"
                    >
                      {isSavingActRab ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Simpan Perubahan RAB</span>
                        </>
                      )}
                    </button>
                  </>
                )
              )}
            </div>
          </div>

          {/* Lock Explanation Note */}
          {isRabLocked && (
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl px-4 py-3 flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs">
              <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="space-y-1 text-xs">
                <div className="font-bold text-amber-950">
                  Mengapa RAB ini terkunci?
                </div>
                <p className="text-amber-800 leading-relaxed text-[11px]">
                  RAB terkunci otomatis karena usulan aktivitas/program kerja
                  ini telah diverifikasi dan disetujui oleh Verifikator & Tim
                  Anggaran (status <em>Diterima</em> / <em>Disetujui</em>), atau
                  role Anda memiliki hak akses baca saja (read-only).
                </p>
                <p className="text-amber-700 leading-relaxed text-[11px]">
                  <span className="font-semibold text-amber-900">Aturan: </span>
                  Penambahan rincian SBU, perubahan nominal, dan penghapusan
                  item dinonaktifkan agar alokasi pagu anggaran yang sudah
                  disahkan tetap valid dan terjaga. Jika perlu penyesuaian
                  rincian RAB, silakan hubungi Verifikator atau Tim Anggaran
                  untuk mengembalikan status ke tahap <em>Draft / Revisi</em>.
                </p>
              </div>
            </div>
          )}

          {/* Tabel Dinamis RAB (Gambar 1) */}
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
                  {canEditActRab && (
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
                      {canEditActRab ? (
                        <CoaSearchSelect
                          valueNoAkun={row.no_akun}
                          valueNamaAkun={row.nama_akun}
                          valueKategori={row.kategori}
                          onChange={(val) =>
                            handleActRabRowChange(idx, "coa", val)
                          }
                        />
                      ) : (
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
                      )}
                    </td>

                    {/* Rincian / Uraian */}
                    <td className="p-2 border-r border-gray-100 align-middle">
                      {canEditActRab ? (
                        <input
                          type="text"
                          placeholder="Contoh: Honor narasumber / Konsumsi..."
                          value={row.keterangan || ""}
                          onChange={(e) =>
                            handleActRabRowChange(
                              idx,
                              "keterangan",
                              e.target.value,
                            )
                          }
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium placeholder:text-gray-400"
                        />
                      ) : (
                        <div className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 font-medium text-gray-800">
                          {row.keterangan || "-"}
                        </div>
                      )}
                    </td>

                    {/* qty: satuan */}
                    <td className="p-2 border-r border-gray-100 align-middle w-20">
                      {canEditActRab ? (
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="1"
                          value={row.qty_satuan ?? ""}
                          onChange={(e) =>
                            handleActRabRowChange(
                              idx,
                              "qty_satuan",
                              e.target.value,
                            )
                          }
                          className="w-full px-2 py-1.5 text-xs text-center rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono font-semibold"
                        />
                      ) : (
                        <div className="w-full px-2 py-1.5 text-xs text-center rounded-lg border border-gray-200 bg-gray-50/50 font-mono font-bold text-gray-800">
                          {row.qty_satuan ?? 1}
                        </div>
                      )}
                    </td>

                    {/* qty: paket */}
                    <td className="p-2 border-r border-gray-100 align-middle w-20">
                      {canEditActRab ? (
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="1"
                          value={row.qty_paket ?? ""}
                          onChange={(e) =>
                            handleActRabRowChange(
                              idx,
                              "qty_paket",
                              e.target.value,
                            )
                          }
                          className="w-full px-2 py-1.5 text-xs text-center rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono font-semibold"
                        />
                      ) : (
                        <div className="w-full px-2 py-1.5 text-xs text-center rounded-lg border border-gray-200 bg-gray-50/50 font-mono font-bold text-gray-800">
                          {row.qty_paket ?? 1}
                        </div>
                      )}
                    </td>

                    {/* SBU (Harga satuan) */}
                    <td className="p-2 border-r border-gray-100 align-middle w-36">
                      {canEditActRab ? (
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          placeholder="0"
                          value={row.sbu ?? ""}
                          onChange={(e) =>
                            handleActRabRowChange(idx, "sbu", e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 text-xs text-right rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono font-bold text-gray-800"
                        />
                      ) : (
                        <div className="w-full px-2.5 py-1.5 text-xs text-right rounded-lg border border-gray-200 bg-gray-50/50 font-mono font-bold text-gray-800">
                          {new Intl.NumberFormat("id-ID").format(row.sbu || 0)}
                        </div>
                      )}
                    </td>

                    {/* Total per row */}
                    <td className="p-2 border-r border-gray-100 align-middle text-right font-mono font-bold text-purple-900 bg-purple-50/20 w-36">
                      {formatRupiah(row.total || 0)}
                    </td>

                    {/* Aksi Hapus */}
                    {canEditActRab && (
                      <td className="p-2 text-center align-middle w-12">
                        <button
                          type="button"
                          onClick={() => handleRemoveActRabRow(idx)}
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
                    Total Alokasi Anggaran:
                  </td>
                  <td className="p-3 text-right font-mono text-sm text-purple-900 bg-purple-100/60 font-extrabold">
                    {formatRupiah(totalActRab)}
                  </td>
                  {canEditActRab && (
                    <td className="p-3 text-center text-[10px] text-gray-500 font-normal">
                      {actRabRows.length} item
                    </td>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ======================================================== */}
        {/* FORM INPUT TIMELINE AKTIVITAS                           */}
        {/* ======================================================== */}
        {canManageTimeline && (
          <div
            id="form-timeline-section"
            className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-4"
          >
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
                    Isi nama tahapan serta rentang tanggal rencana kerja [RK].
                    Rencana Anggaran Biaya (RAB) dikelola pada tombol aksi "RAB"
                    di daftar tahapan bawah.
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
              {/* Nama Tahapan / Aktivitas */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Nama Tahapan / Aktivitas{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nama tahapan / kegiatan baru..."
                  value={formTimeline.nama_aktivitas}
                  onChange={(e) =>
                    setFormTimeline({
                      ...formTimeline,
                      nama_aktivitas: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                  required
                />
              </div>

              {/* Grid 2: Tanggal Rencana Kegiatan (RK) */}
              <div className="p-3.5 bg-blue-50/40 rounded-xl border border-blue-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Jadwal Rencana Kerja [RK]:</span>
                  </span>
                  <span className="text-[10px] text-gray-500 italic">
                    * Realisasi & status dikelola melalui tombol Perkembangan
                    Realisasi pada tabel
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Tanggal RK Awal */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Tgl RK Awal (Rencana){" "}
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formTimeline.tanggal_rk_awal}
                      onChange={(e) => {
                        const newAwal = e.target.value;
                        setFormTimeline((prev) => {
                          let newAkhir = prev.tanggal_rk_akhir;
                          if (newAwal && newAkhir && newAkhir < newAwal) {
                            newAkhir = newAwal;
                          }
                          return {
                            ...prev,
                            tanggal_rk_awal: newAwal,
                            tanggal_rk_akhir: newAkhir,
                          };
                        });
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      required
                    />
                  </div>

                  {/* Tanggal RK Akhir */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Tgl RK Akhir (Rencana){" "}
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      min={formTimeline.tanggal_rk_awal || undefined}
                      value={formTimeline.tanggal_rk_akhir}
                      onChange={(e) =>
                        setFormTimeline((prev) => ({
                          ...prev,
                          tanggal_rk_akhir: e.target.value,
                        }))
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
                      setFormTimeline({
                        ...formTimeline,
                        capaian: e.target.value,
                      })
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
                      setFormTimeline({
                        ...formTimeline,
                        masalah: e.target.value,
                      })
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
                      setFormTimeline({
                        ...formTimeline,
                        pemecahan_masalah: e.target.value,
                      })
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
                  disabled={
                    submittingTimeline ||
                    isAnggaranOverLimit ||
                    formTimeline.anggaran < 0
                  }
                  className="px-5 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
        )}

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
                  Visualisasi jadwal mingguan rencana kerja [RK] dan
                  perkembangan realisasi [R] dari aktivitas
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
                {aktivitas?.Aktivitas ||
                  (loading ? "Memuat aktivitas..." : "-")}
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
                  <span className="text-gray-400 font-normal italic">
                    Belum ada tanggal RK tahapan
                  </span>
                )}
              </p>
              <p className="text-[11px] text-gray-500">
                Total Minggu RK:{" "}
                <b className="text-blue-700">
                  {BULAN_LIST.reduce(
                    (acc, b) =>
                      acc +
                      WEEKS.filter(
                        (w) =>
                          activitySchedule.rkSlots.includes(`${b.key}_${w}`) ||
                          isWeekInDateRange(
                            b.key,
                            w,
                            activitySchedule.rkAwal,
                            activitySchedule.rkAkhir,
                          ),
                      ).length,
                    0,
                  )}{" "}
                  Minggu
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
                  <span className="text-gray-400 font-normal italic">
                    Belum ada realisasi terlaksana
                  </span>
                )}
              </p>
              <p className="text-[11px] text-gray-500">
                Total Minggu Realisasi:{" "}
                <b className="text-emerald-700">
                  {BULAN_LIST.reduce(
                    (acc, b) =>
                      acc +
                      WEEKS.filter(
                        (w) =>
                          activitySchedule.rSlots.includes(`${b.key}_${w}`) ||
                          isWeekInDateRange(
                            b.key,
                            w,
                            activitySchedule.rAwal,
                            activitySchedule.rAkhir,
                          ),
                      ).length,
                    0,
                  )}{" "}
                  Minggu
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
                      )),
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
                      const tlRkAwal = tl.TanggalRkAwal
                        ? tl.TanggalRkAwal.slice(0, 10)
                        : "";
                      const tlRkAkhir = tl.TanggalRkAkhir
                        ? tl.TanggalRkAkhir.slice(0, 10)
                        : "";
                      const tlRAwal = tl.TanggalRAwal
                        ? tl.TanggalRAwal.slice(0, 10)
                        : "";
                      const tlRAkhir = tl.TanggalRAkhir
                        ? tl.TanggalRAkhir.slice(0, 10)
                        : "";

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
                                isWeekInDateRange(
                                  b.key,
                                  w,
                                  tlRkAwal,
                                  tlRkAkhir,
                                );
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
                                        isRk
                                          ? "bg-blue-600 shadow-2xs"
                                          : "bg-gray-100"
                                      }`}
                                    />
                                    {/* Baris Realisasi [R] (Hijau) */}
                                    <div
                                      className={`w-full h-2 rounded-2xs transition ${
                                        isR
                                          ? "bg-emerald-500 shadow-2xs"
                                          : "bg-gray-100"
                                      }`}
                                    />
                                  </div>
                                </td>
                              );
                            }),
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
              <p className="font-semibold text-gray-600">
                Belum ada tahapan timeline pada aktivitas ini
              </p>
              <p className="text-[11px]">
                Silakan gunakan form di atas untuk membuat tahapan timeline dan
                jadwal kegiatan.
              </p>
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
                      <div className="flex items-start gap-2.5 min-w-0">
                        {/* Drag and Drop Grip Handle */}
                        <div
                          className="p-1 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 cursor-grab active:cursor-grabbing transition shrink-0 mt-0.5"
                          title="Tahan & geser untuk mengubah nomor urut tahapan"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>

                        <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 font-mono font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                          {tl.NoAktivitas || index + 1}
                        </span>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-gray-900 text-sm">
                              {tl.NamaAktivitas}
                            </h4>
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
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1"
                              title="Nominal Anggaran Tahapan Timeline"
                            >
                              <span>Anggaran:</span>
                              <span className="font-extrabold">
                                {formatRupiah(
                                  tl.Anggaran || tl.anggaran || 0,
                                  isVerifierRoleOrLevel,
                                )}
                              </span>
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
                            <div className="inline-flex items-center gap-1">
                              <span className="text-gray-400">
                                PIC Tahapan:
                              </span>
                              <span className="font-semibold text-gray-700">
                                {tl.PIC || "-"}
                              </span>
                            </div>

                            <span className="text-gray-300 hidden sm:inline">
                              •
                            </span>

                            <div className="inline-flex items-center gap-1">
                              <span className="text-gray-400">Tanggal RK:</span>
                              <span className="font-semibold text-gray-700 text-[11px]">
                                {tl.TanggalRkAwal
                                  ? formatTanggalBulanTahun(tl.TanggalRkAwal)
                                  : "-"}{" "}
                                s/d{" "}
                                {tl.TanggalRkAkhir
                                  ? formatTanggalBulanTahun(tl.TanggalRkAkhir)
                                  : "-"}
                              </span>
                            </div>

                            {tl.TanggalRAwal && (
                              <>
                                <span className="text-gray-300 hidden sm:inline">
                                  •
                                </span>
                                <div className="inline-flex items-center gap-1">
                                  <span className="text-emerald-600 font-medium">
                                    Realisasi:
                                  </span>
                                  <span className="font-semibold text-emerald-700 text-[11px]">
                                    {formatTanggalBulanTahun(tl.TanggalRAwal)}{" "}
                                    s/d{" "}
                                    {tl.TanggalRAkhir
                                      ? formatTanggalBulanTahun(
                                          tl.TanggalRAkhir,
                                        )
                                      : "-"}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Tombol Aksi RAB, Perkembangan Realisasi, Edit & Hapus */}
                      {canManageTimeline && (
                        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => openRabModal(tl)}
                            disabled={isTimelineRabDisabled}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs ${
                              isTimelineRabDisabled
                                ? "bg-gray-100 text-gray-500 border border-gray-200 cursor-not-allowed shadow-none"
                                : "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 cursor-pointer"
                            }`}
                            title={
                              isTimelineRabDisabled
                                ? timelineRabDisabledTitle
                                : "Kelola Rencana Anggaran Biaya (RAB) tahapan ini"
                            }
                          >
                            <Calculator
                              className={`w-3.5 h-3.5 ${isTimelineRabDisabled ? "text-gray-500" : "text-amber-700"}`}
                            />
                            <span>RAB</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openRealisasiModal(tl)}
                            disabled={!isDiterimaAnggaran}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs ${
                              !isDiterimaAnggaran
                                ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed shadow-none"
                                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer"
                            }`}
                            title={
                              !isDiterimaAnggaran
                                ? "Perkembangan realisasi hanya dapat diisi ketika status anggaran sudah 'Diterima Anggaran'"
                                : "Buka modal perkembangan realisasi (Tanggal R & Status)"
                            }
                          >
                            <TrendingUp
                              className={`w-3.5 h-3.5 ${!isDiterimaAnggaran ? "text-gray-400" : "text-emerald-600"}`}
                            />
                            <span>Perkembangan Realisasi</span>
                          </button>

                          {canEditOrDeleteTimeline && (
                            <>
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
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Informasi Evaluasi & Jadwal Minggu */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                      {/* Rekap Slot Jadwal */}
                      <div className="md:col-span-6 p-3 bg-gray-50/70 rounded-xl border border-gray-100 space-y-2">
                        <span className="text-[11px] font-bold text-gray-700 block">
                          Jadwal Minggu Pelaksanaan (RK & R):
                        </span>
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[10px] font-bold text-blue-700 w-10 shrink-0">
                              [RK]:
                            </span>
                            {rkSlots.length === 0 ? (
                              <span className="text-[10px] text-gray-400 italic">
                                Belum ada minggu yang ditandai
                              </span>
                            ) : (
                              summarizeSlots(rkSlots).map((item) => (
                                <span
                                  key={item.key}
                                  title={item.title}
                                  className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-100 text-blue-800"
                                >
                                  {item.text}
                                </span>
                              ))
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[10px] font-bold text-emerald-700 w-10 shrink-0">
                              [R]:
                            </span>
                            {rSlots.length === 0 ? (
                              <span className="text-[10px] text-gray-400 italic">
                                Belum ada realisasi yang ditandai
                              </span>
                            ) : (
                              summarizeSlots(rSlots).map((item) => (
                                <span
                                  key={item.key}
                                  title={item.title}
                                  className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800"
                                >
                                  {item.text}
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
                          <b className="text-gray-900">Capaian:</b>{" "}
                          {tl.Capaian || "-"}
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
                    {/* SEKSI RENCANA ANGGARAN BIAYA (RAB) TAHAPAN              */}
                    {/* ======================================================== */}
                    {(() => {
                      const rabItems = parseTimelineRab(tl);
                      const totalItemRab = rabItems.reduce(
                        (acc, r) => acc + (Number(r.total) || 0),
                        0,
                      );
                      const nominalTimeline = Number(
                        tl.Anggaran ?? tl.anggaran ?? 0,
                      );

                      return (
                        <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-200/80 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Calculator className="w-4 h-4 text-amber-700" />
                              <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                                Realisasi Anggaran
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                                {formatRupiah(
                                  totalItemRab > 0
                                    ? totalItemRab
                                    : nominalTimeline,
                                  isVerifierRoleOrLevel,
                                )}
                              </span>
                            </div>

                            {canManageTimeline && (
                              <button
                                type="button"
                                onClick={() => openRabModal(tl)}
                                disabled={isTimelineRabDisabled}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition shadow-2xs ${
                                  isTimelineRabDisabled
                                    ? "bg-gray-200 text-gray-500 cursor-not-allowed shadow-none"
                                    : "bg-amber-500 hover:bg-amber-600 text-white cursor-pointer"
                                }`}
                                title={
                                  isTimelineRabDisabled
                                    ? timelineRabDisabledTitle
                                    : "Edit kembali data RAB tahapan ini"
                                }
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>
                                  {rabItems.length > 0
                                    ? "Edit RAB"
                                    : "Kelola RAB"}
                                </span>
                              </button>
                            )}
                          </div>

                          {rabItems.length === 0 ? (
                            <div className="p-3 text-center text-xs text-amber-800/80 bg-white/80 rounded-xl border border-dashed border-amber-300 flex flex-col sm:flex-row items-center justify-between gap-2">
                              <span>
                                Belum ada rincian item RAB untuk tahapan ini.
                                Total anggaran saat ini:{" "}
                                <b className="font-mono text-amber-950">
                                  {formatRupiah(
                                    nominalTimeline,
                                    isVerifierRoleOrLevel,
                                  )}
                                </b>
                              </span>
                              {canManageTimeline && (
                                <button
                                  type="button"
                                  onClick={() => openRabModal(tl)}
                                  disabled={isTimelineRabDisabled}
                                  className={`font-bold text-xs ${
                                    isTimelineRabDisabled
                                      ? "text-gray-500 cursor-not-allowed no-underline"
                                      : "text-amber-800 hover:text-amber-950 underline cursor-pointer"
                                  }`}
                                  title={
                                    isTimelineRabDisabled
                                      ? timelineRabDisabledTitle
                                      : undefined
                                  }
                                >
                                  + Buat Rincian RAB Sekarang
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="overflow-x-auto rounded-xl border border-amber-200 bg-white shadow-2xs">
                              <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                  <tr className="bg-amber-100/70 border-b border-amber-200 text-amber-950 font-bold text-[11px]">
                                    <th className="p-2 text-center w-10 border-r border-amber-200">
                                      #
                                    </th>
                                    <th className="p-2 border-r border-amber-200">
                                      Keterangan
                                    </th>
                                    <th className="p-2 text-center w-24 border-r border-amber-200">
                                      Qty (Satuan)
                                    </th>
                                    <th className="p-2 text-center w-24 border-r border-amber-200">
                                      Qty (Paket)
                                    </th>
                                    <th className="p-2 text-right w-32 border-r border-amber-200">
                                      Harga Satuan
                                    </th>
                                    <th className="p-2 text-right w-36 border-r border-amber-200">
                                      Total
                                    </th>
                                    <th className="p-2 text-center w-36">
                                      Bukti
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {rabItems.map((item, rIdx) => {
                                    const proofUrl = item.bukti_url
                                      ? item.bukti_url.startsWith("http")
                                        ? item.bukti_url
                                        : `${API_BASE_URL}${item.bukti_url.startsWith("/") ? "" : "/"}${item.bukti_url}`
                                      : null;

                                    return (
                                      <tr
                                        key={item.id || rIdx}
                                        className="border-b border-amber-100 hover:bg-amber-50/40 transition text-gray-800"
                                      >
                                        <td className="p-2 text-center font-mono font-bold text-amber-900 border-r border-amber-100 bg-amber-50/20">
                                          {rIdx + 1}
                                        </td>
                                        <td className="p-2 font-medium border-r border-amber-100">
                                          {item.keterangan || "-"}
                                        </td>
                                        <td className="p-2 text-center font-mono border-r border-amber-100">
                                          {item.qty_satuan}
                                        </td>
                                        <td className="p-2 text-center font-mono border-r border-amber-100">
                                          {item.qty_paket}
                                        </td>
                                        <td className="p-2 text-right font-mono border-r border-amber-100">
                                          {formatRupiah(
                                            item.harga_satuan,
                                            isVerifierRoleOrLevel,
                                          )}
                                        </td>
                                        <td className="p-2 text-right font-mono font-bold text-amber-950 border-r border-amber-100 bg-amber-50/20">
                                          {formatRupiah(
                                            item.total,
                                            isVerifierRoleOrLevel,
                                          )}
                                        </td>
                                        <td className="p-2 text-center">
                                          {proofUrl ? (
                                            <a
                                              href={proofUrl}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:text-purple-900 hover:underline max-w-[130px] truncate"
                                              title={
                                                item.bukti_name ||
                                                "Buka Bukti RAB"
                                              }
                                            >
                                              <ExternalLink className="w-3 h-3 shrink-0" />
                                              <span className="truncate">
                                                {item.bukti_name ||
                                                  "Lihat Bukti"}
                                              </span>
                                            </a>
                                          ) : (
                                            <span className="text-gray-400 italic text-[11px]">
                                              -
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot>
                                  <tr className="bg-amber-50/90 font-bold text-gray-900 border-t border-amber-200">
                                    <td
                                      colSpan={5}
                                      className="p-2.5 text-right text-xs"
                                    >
                                      Total Keseluruhan RAB:
                                    </td>
                                    <td className="p-2.5 text-right font-mono font-extrabold text-amber-950 bg-amber-100/70 border-r border-amber-200 text-xs">
                                      {formatRupiah(
                                        totalItemRab,
                                        isVerifierRoleOrLevel,
                                      )}
                                    </td>
                                    <td className="p-2.5 text-center text-[10px] text-gray-500 font-normal">
                                      {rabItems.length} item
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* ======================================================== */}
                    {/* SEKSI BERKAS BUKTI KEGIATAN TAHAPAN                      */}
                    {/* Menampilkan file & link tersimpan + Form multi-baris     */}
                    {/* ======================================================== */}
                    <div className="p-4 bg-purple-50/30 rounded-xl border border-purple-100/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Paperclip className="w-4 h-4 text-purple-700" />
                          <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                            Berkas Bukti Dukung Tahapan ({files.length})
                          </span>
                        </div>
                      </div>

                      {/* List Berkas & Tautan Tersimpan */}
                      {files.length === 0 ? (
                        <div className="p-3 text-center text-xs text-gray-600 bg-white/80 rounded-xl border border-dashed border-gray-300">
                          Belum ada berkas atau tautan bukti dukung yang tersimpan untuk
                          tahapan ini. Gunakan form di bawah untuk mengunggah.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                          {files.map((file) => {
                            const isLink = isTimelineLinkRecord(file);
                            const fileUrl = resolveProkerFileUrl(
                              file,
                              API_BASE_URL,
                            );

                            return (
                              <div
                                key={file.UUID || file.ID || file.Id}
                                className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 bg-white shadow-2xs hover:border-purple-300 transition text-xs"
                              >
                                <div className="min-w-0 pr-2 space-y-1">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    {isLink ? (
                                      <Link2 className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                                    ) : (
                                      <FileText className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                                    )}
                                    <span
                                      className="font-bold text-gray-900 truncate"
                                      title={
                                        file.NamaFile ||
                                        file.FileURL ||
                                        file.File
                                      }
                                    >
                                      {file.NamaFile ||
                                        file.FileURL ||
                                        file.File}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-gray-600 flex items-center gap-1.5 min-w-0">
                                    {isLink ? (
                                      <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 font-semibold text-[10px] shrink-0">
                                        Tautan Link
                                      </span>
                                    ) : (
                                      <span className="shrink-0 font-medium">
                                        {formatBytes(file.FileSize)}
                                      </span>
                                    )}
                                    {file.Keterangan && (
                                      <span
                                        className="italic truncate"
                                        title={file.Keterangan}
                                      >
                                        • {file.Keterangan}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {fileUrl && (
                                    <Tooltip
                                      title={
                                        isLink
                                          ? "Buka Tautan Bukti"
                                          : "Buka / Unduh Berkas Bukti"
                                      }
                                    >
                                      <a
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={
                                          isLink
                                            ? `Buka tautan ${file.NamaFile || file.FileURL}`
                                            : `Buka berkas ${file.NamaFile || file.File}`
                                        }
                                        className="p-1.5 rounded-lg text-indigo-700 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    </Tooltip>
                                  )}

                                  <Tooltip
                                    title={
                                      isLink
                                        ? "Hapus Tautan Ini"
                                        : "Hapus Berkas Ini"
                                    }
                                  >
                                    <button
                                      type="button"
                                      aria-label={
                                        isLink
                                          ? `Hapus tautan ${file.NamaFile || file.FileURL}`
                                          : `Hapus berkas ${file.NamaFile || file.File}`
                                      }
                                      onClick={() => {
                                        setFileToDelete(file);
                                        setDeleteFileDialog(true);
                                      }}
                                      className="p-1.5 rounded-lg text-rose-700 hover:bg-rose-50 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
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

                      {/* Inline Upload Form (Dynamic Multi-Row Form File, Link & Keterangan) */}
                      <div className="p-3.5 bg-white rounded-xl border border-purple-200 shadow-2xs space-y-3">
                        {(() => {
                          const dynamicRows = getRowFormRows(tl.UUID);
                          const filledRows = dynamicRows.filter(isRowFilled);
                          const fileReadyCount = filledRows.filter(
                            (r) => (r.mode || "file") === "file",
                          ).length;
                          const linkReadyCount = filledRows.filter(
                            (r) => (r.mode || "file") === "link",
                          ).length;
                          const isSubmittingLinks = Boolean(
                            rowSubmittingLinks[tl.UUID],
                          );

                          return (
                            <>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                                    <Upload className="w-4 h-4 text-purple-700" />
                                    <span>
                                      Unggah Berkas Bukti Baru (Multi File, Tautan Link &
                                      Keterangan Dinamis):
                                    </span>
                                  </div>
                                  {!isDiterimaAnggaran && (
                                    <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-semibold">
                                      Terkunci (Menunggu Diterima Anggaran)
                                    </span>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => addRowFormRow(tl.UUID)}
                                  disabled={!isDiterimaAnggaran}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 ${
                                    !isDiterimaAnggaran
                                      ? "text-gray-500 bg-gray-100 border border-gray-200 cursor-not-allowed"
                                      : "text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 cursor-pointer"
                                  }`}
                                  title={
                                    !isDiterimaAnggaran
                                      ? "Unggah berkas bukti hanya dapat dilakukan ketika status anggaran sudah 'Diterima Anggaran'"
                                      : undefined
                                  }
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Tambah Baris</span>
                                </button>
                              </div>

                              {/* Keterangan Ketentuan Upload File & Link */}
                              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-gray-700 flex items-start gap-2">
                                <Info
                                  className="w-4 h-4 text-purple-700 shrink-0 mt-0.5"
                                  aria-hidden="true"
                                />
                                <div className="space-y-0.5 leading-relaxed">
                                  <p>
                                    <span className="font-semibold text-gray-900">
                                      Ketentuan Upload File:
                                    </span>{" "}
                                    Maksimal{" "}
                                    <span className="font-semibold text-purple-900">
                                      {TIMELINE_MAX_FILE_SIZE_MB} MB
                                    </span>{" "}
                                    per file. Tipe file yang didukung:{" "}
                                    <span className="font-medium text-gray-800">
                                      {TIMELINE_ALLOWED_FILE_TYPES_LABEL}
                                    </span>
                                    .
                                  </p>
                                  <p className="text-[11px] text-gray-600">
                                    Untuk melampirkan tautan Google Drive, video, atau dokumen online,
                                    ubah jenis baris ke{" "}
                                    <span className="font-semibold text-gray-800">
                                      Tautan Link
                                    </span>{" "}
                                    dan masukkan URL berawalan http:// atau https://.
                                  </p>
                                </div>
                              </div>

                              {/* Daftar Baris Input Dinamis */}
                              <div className="space-y-2.5">
                                {dynamicRows.map((rowItem, rIdx) => {
                                  const rowMode = rowItem.mode || "file";

                                  return (
                                    <div
                                      key={rowItem.id}
                                      className={`p-3 rounded-xl border space-y-2 ${
                                        rowItem.error
                                          ? "bg-rose-50/40 border-rose-300"
                                          : "bg-purple-50/25 border-purple-100"
                                      }`}
                                    >
                                      {/* Baris Header: Nomor, Switch File/Link, Hapus */}
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="w-6 h-6 rounded-md bg-purple-100 text-purple-900 text-xs font-bold flex items-center justify-center shrink-0">
                                            {rIdx + 1}
                                          </span>

                                          <div
                                            role="radiogroup"
                                            aria-label={`Jenis bukti baris ${rIdx + 1}`}
                                            className="inline-flex p-0.5 rounded-lg bg-gray-100 border border-gray-200"
                                          >
                                            <button
                                              type="button"
                                              role="radio"
                                              aria-checked={rowMode === "file"}
                                              disabled={!isDiterimaAnggaran}
                                              onClick={() =>
                                                switchRowFormMode(
                                                  tl.UUID,
                                                  rowItem.id,
                                                  "file",
                                                )
                                              }
                                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 ${
                                                rowMode === "file"
                                                  ? "bg-purple-700 text-white shadow-2xs"
                                                  : "text-gray-700 hover:text-gray-900 hover:bg-white/70"
                                              } ${
                                                !isDiterimaAnggaran
                                                  ? "opacity-60 cursor-not-allowed"
                                                  : "cursor-pointer"
                                              }`}
                                            >
                                              <Upload className="w-3.5 h-3.5" />
                                              <span>File</span>
                                            </button>
                                            <button
                                              type="button"
                                              role="radio"
                                              aria-checked={rowMode === "link"}
                                              disabled={!isDiterimaAnggaran}
                                              onClick={() =>
                                                switchRowFormMode(
                                                  tl.UUID,
                                                  rowItem.id,
                                                  "link",
                                                )
                                              }
                                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 ${
                                                rowMode === "link"
                                                  ? "bg-purple-700 text-white shadow-2xs"
                                                  : "text-gray-700 hover:text-gray-900 hover:bg-white/70"
                                              } ${
                                                !isDiterimaAnggaran
                                                  ? "opacity-60 cursor-not-allowed"
                                                  : "cursor-pointer"
                                              }`}
                                            >
                                              <Link2 className="w-3.5 h-3.5" />
                                              <span>Tautan Link</span>
                                            </button>
                                          </div>
                                        </div>

                                        <button
                                          type="button"
                                          disabled={!isDiterimaAnggaran}
                                          onClick={() =>
                                            removeRowFormRow(
                                              tl.UUID,
                                              rowItem.id,
                                            )
                                          }
                                          className={`p-2 rounded-lg transition shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 ${
                                            !isDiterimaAnggaran
                                              ? "text-gray-400 cursor-not-allowed"
                                              : "text-gray-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                                          }`}
                                          title="Hapus baris ini"
                                          aria-label={`Hapus baris ${rIdx + 1}`}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>

                                      {/* Input Utama & Keterangan */}
                                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-start">
                                        <div className="lg:col-span-7 min-w-0">
                                          {rowMode === "file" ? (
                                            <div>
                                              <label
                                                htmlFor={`evidence-file-${tl.UUID}-${rowItem.id}`}
                                                className="sr-only"
                                              >
                                                Pilih berkas bukti baris{" "}
                                                {rIdx + 1}
                                              </label>
                                              <input
                                                id={`evidence-file-${tl.UUID}-${rowItem.id}`}
                                                type="file"
                                                accept={TIMELINE_FILE_ACCEPT}
                                                disabled={!isDiterimaAnggaran}
                                                onChange={(e) =>
                                                  handleRowFileSelect(
                                                    tl.UUID,
                                                    rowItem.id,
                                                    e,
                                                  )
                                                }
                                                aria-invalid={Boolean(
                                                  rowItem.error,
                                                )}
                                                className={`w-full text-xs text-gray-700 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold border rounded-xl bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 ${
                                                  rowItem.error
                                                    ? "border-rose-400"
                                                    : "border-gray-300"
                                                } ${
                                                  !isDiterimaAnggaran
                                                    ? "file:bg-gray-300 file:text-gray-600 cursor-not-allowed opacity-70"
                                                    : "file:bg-purple-700 file:text-white hover:file:bg-purple-800 cursor-pointer"
                                                }`}
                                              />
                                              {rowItem.file && (
                                                <span
                                                  className="text-[11px] text-purple-800 font-medium pl-1 truncate block mt-1"
                                                  title={rowItem.file.name}
                                                >
                                                  Terpilih: {rowItem.file.name}{" "}
                                                  (
                                                  {formatBytes(
                                                    rowItem.file.size,
                                                  )}
                                                  )
                                                </span>
                                              )}
                                            </div>
                                          ) : (
                                            <div className="space-y-1.5">
                                              <label
                                                htmlFor={`evidence-url-${tl.UUID}-${rowItem.id}`}
                                                className="sr-only"
                                              >
                                                URL tautan bukti baris{" "}
                                                {rIdx + 1}
                                              </label>
                                              <div className="relative">
                                                <Link2
                                                  className="w-3.5 h-3.5 text-sky-700 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                                                  aria-hidden="true"
                                                />
                                                <input
                                                  id={`evidence-url-${tl.UUID}-${rowItem.id}`}
                                                  type="url"
                                                  inputMode="url"
                                                  autoCorrect="off"
                                                  autoCapitalize="off"
                                                  spellCheck={false}
                                                  disabled={!isDiterimaAnggaran}
                                                  placeholder="https://drive.google.com/... (awalan http:// atau https://)"
                                                  value={rowItem.url || ""}
                                                  onChange={(e) =>
                                                    updateRowFormField(
                                                      tl.UUID,
                                                      rowItem.id,
                                                      "url",
                                                      e.target.value,
                                                    )
                                                  }
                                                  onBlur={() =>
                                                    handleRowUrlBlur(
                                                      tl.UUID,
                                                      rowItem.id,
                                                    )
                                                  }
                                                  aria-invalid={Boolean(
                                                    rowItem.error,
                                                  )}
                                                  className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border bg-white focus:outline-none ${
                                                    rowItem.error
                                                      ? "border-rose-400"
                                                      : "border-gray-300"
                                                  } ${
                                                    !isDiterimaAnggaran
                                                      ? "cursor-not-allowed bg-gray-50 text-gray-500"
                                                      : "text-gray-800 focus:ring-2 focus:ring-purple-600"
                                                  }`}
                                                />
                                              </div>
                                              <label
                                                htmlFor={`evidence-link-title-${tl.UUID}-${rowItem.id}`}
                                                className="sr-only"
                                              >
                                                Judul tautan baris {rIdx + 1}{" "}
                                                (opsional)
                                              </label>
                                              <input
                                                id={`evidence-link-title-${tl.UUID}-${rowItem.id}`}
                                                type="text"
                                                maxLength={200}
                                                disabled={!isDiterimaAnggaran}
                                                placeholder="Judul tautan (opsional, mis. Folder Foto Kegiatan)"
                                                value={rowItem.nama_file || ""}
                                                onChange={(e) =>
                                                  updateRowFormField(
                                                    tl.UUID,
                                                    rowItem.id,
                                                    "nama_file",
                                                    e.target.value,
                                                  )
                                                }
                                                className={`w-full px-3 py-1.5 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none ${
                                                  !isDiterimaAnggaran
                                                    ? "cursor-not-allowed bg-gray-50 text-gray-500"
                                                    : "text-gray-800 focus:ring-2 focus:ring-purple-600"
                                                }`}
                                              />
                                            </div>
                                          )}
                                        </div>

                                        {/* Input Keterangan Spesifik */}
                                        <div className="lg:col-span-5 min-w-0">
                                          <label
                                            htmlFor={`evidence-ket-${tl.UUID}-${rowItem.id}`}
                                            className="sr-only"
                                          >
                                            Keterangan bukti baris {rIdx + 1}{" "}
                                            (opsional)
                                          </label>
                                          <input
                                            id={`evidence-ket-${tl.UUID}-${rowItem.id}`}
                                            type="text"
                                            disabled={!isDiterimaAnggaran}
                                            placeholder="Keterangan berkas / tautan (opsional)..."
                                            value={rowItem.keterangan || ""}
                                            onChange={(e) =>
                                              updateRowFormField(
                                                tl.UUID,
                                                rowItem.id,
                                                "keterangan",
                                                e.target.value,
                                              )
                                            }
                                            className={`w-full px-3 py-1.5 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none ${
                                              !isDiterimaAnggaran
                                                ? "cursor-not-allowed bg-gray-50 text-gray-500"
                                                : "text-gray-800 focus:ring-2 focus:ring-purple-600"
                                            }`}
                                          />
                                        </div>
                                      </div>

                                      {rowItem.error && (
                                        <div
                                          role="alert"
                                          className="flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium"
                                        >
                                          <AlertCircle
                                            className="w-4 h-4 shrink-0 mt-0.5"
                                            aria-hidden="true"
                                          />
                                          <span>{rowItem.error}</span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Footer Form & Tombol Submit */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-purple-100">
                                <span className="text-xs text-gray-600">
                                  {filledRows.length} dari {dynamicRows.length}{" "}
                                  baris siap disimpan
                                  {filledRows.length > 0 &&
                                    ` (${fileReadyCount} file, ${linkReadyCount} tautan)`}
                                  .
                                </span>

                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => addRowFormRow(tl.UUID)}
                                    disabled={!isDiterimaAnggaran}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 ${
                                      !isDiterimaAnggaran
                                        ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                        : "bg-gray-100 hover:bg-gray-200 text-gray-800 cursor-pointer"
                                    }`}
                                    title={
                                      !isDiterimaAnggaran
                                        ? "Unggah berkas bukti hanya dapat dilakukan ketika status anggaran sudah 'Diterima Anggaran'"
                                        : undefined
                                    }
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Tambah Baris</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleUploadRowFiles(tl)}
                                    disabled={
                                      !isDiterimaAnggaran ||
                                      isSubmittingLinks ||
                                      filledRows.length === 0
                                    }
                                    className={`px-4 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-1 ${
                                      !isDiterimaAnggaran
                                        ? "bg-gray-200 text-gray-500 border border-gray-300 cursor-not-allowed shadow-none"
                                        : "bg-purple-700 hover:bg-purple-800 text-white cursor-pointer disabled:opacity-50"
                                    }`}
                                    title={
                                      !isDiterimaAnggaran
                                        ? "Unggah berkas bukti hanya dapat dilakukan ketika status anggaran sudah 'Diterima Anggaran'"
                                        : undefined
                                    }
                                  >
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>
                                      {isSubmittingLinks
                                        ? "Menyimpan..."
                                        : `Unggah / Simpan Bukti (${filledRows.length})`}
                                    </span>
                                  </button>
                                </div>
                              </div>
                            </>
                          );
                        })()}

                        {/* List Antrean Progres Upload Per Chunk (Multiple Progress) */}
                        {(() => {
                          const queue = rowUploadQueues[tl.UUID] || [];
                          if (queue.length === 0) return null;

                          return (
                            <div className="space-y-2 pt-2 border-t border-purple-100">
                              <div className="flex items-center justify-between text-[11px] font-bold text-gray-700">
                                <span>
                                  Proses Unggah Berkas Bukti ({queue.length}):
                                </span>
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
                                              {formatBytes(
                                                item.loadedBytes || 0,
                                              )}{" "}
                                              / {formatBytes(item.totalBytes)}
                                            </span>
                                            {item.speed && (
                                              <span className="text-purple-600 font-semibold">
                                                • {item.speed}
                                              </span>
                                            )}
                                            {item.eta && (
                                              <span className="text-gray-400">
                                                • Sisa: {item.eta}
                                              </span>
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
                                            onClick={() =>
                                              pauseRowUpload(tl.UUID, item)
                                            }
                                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-100 border border-amber-200 transition cursor-pointer"
                                            title="Jeda (Pause) Upload"
                                          >
                                            <Pause className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {item.status === "paused" && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              resumeRowUpload(tl, item)
                                            }
                                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
                                            title="Lanjutkan (Resume) Upload"
                                          >
                                            <Play className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {item.status === "error" && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              resumeRowUpload(tl, item)
                                            }
                                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 border border-blue-200 transition cursor-pointer"
                                            title="Coba Lagi Upload"
                                          >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                          </button>
                                        )}

                                        {/* Kontrol Batal (Cancel) */}
                                        <button
                                          type="button"
                                          onClick={() =>
                                            cancelRowUpload(tl.UUID, item)
                                          }
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
                                      <p className="text-[10px] text-rose-600 font-medium">
                                        {item.error}
                                      </p>
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
          </>
        )}
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
                  <span className="text-gray-500">Rencana Jadwal [RK]:</span>
                  <span className="font-semibold text-gray-800">
                    {selectedTimelineForRealisasi?.TanggalRkAwal
                      ? formatTanggalBulanTahun(
                          selectedTimelineForRealisasi.TanggalRkAwal,
                        )
                      : "-"}{" "}
                    s/d{" "}
                    {selectedTimelineForRealisasi?.TanggalRkAkhir
                      ? formatTanggalBulanTahun(
                          selectedTimelineForRealisasi.TanggalRkAkhir,
                        )
                      : "-"}
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
                  onChange={(e) => {
                    const newAwal = e.target.value;
                    setRealisasiForm((prev) => {
                      let newAkhir = prev.tanggal_r_akhir;
                      if (newAwal && newAkhir && newAkhir < newAwal) {
                        newAkhir = newAwal;
                      }
                      return {
                        ...prev,
                        tanggal_r_awal: newAwal,
                        tanggal_r_akhir: newAkhir,
                      };
                    });
                  }}
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
                  min={realisasiForm.tanggal_r_awal || undefined}
                  value={realisasiForm.tanggal_r_akhir}
                  onChange={(e) =>
                    setRealisasiForm((prev) => ({
                      ...prev,
                      tanggal_r_akhir: e.target.value,
                    }))
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
                    setRealisasiForm({
                      ...realisasiForm,
                      status: e.target.value,
                    })
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
                  <span>
                    {savingRealisasi ? "Menyimpan..." : "Simpan Perkembangan"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL RENCANA ANGGARAN BIAYA (RAB) DINAMIS               */}
      {/* ======================================================== */}
      {rabModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                  <Calculator className="w-5 h-5 text-amber-700" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                    Realisasi Anggaran
                  </h3>
                  <p className="text-xs text-gray-500 truncate">
                    Tahapan #{selectedTimelineForRab?.NoAktivitas || 1}:{" "}
                    {selectedTimelineForRab?.NamaAktivitas}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setRabModalOpen(false);
                  setSelectedTimelineForRab(null);
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {/* Ringkasan Pagu & Total Realtime */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                <div>
                  <span className="text-gray-500 block">PIC Tahapan:</span>
                  <span
                    className="font-bold text-gray-800 text-xs truncate block"
                    title={selectedTimelineForRab?.PIC || aktivitas?.PIC || "-"}
                  >
                    {selectedTimelineForRab?.PIC || aktivitas?.PIC || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">
                    Batas Pagu Aktivitas:
                  </span>
                  <span className="font-bold text-gray-800 font-mono text-xs">
                    {maxAnggaran > 0
                      ? formatRupiah(maxAnggaran)
                      : "Tidak dibatasi"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">
                    Total Alokasi RAB:
                  </span>
                  <span
                    className={`font-mono text-xs ${
                      maxAnggaran > 0 && totalAlokasiRabAktivitas > maxAnggaran
                        ? "text-rose-600 font-extrabold"
                        : "text-emerald-700 font-bold"
                    }`}
                  >
                    {formatRupiah(totalAlokasiRabAktivitas)}
                  </span>
                  {otherTimelinesAllocated > 0 && (
                    <span
                      className="block text-[10px] text-gray-500 truncate"
                      title={`Tahapan lain: ${formatRupiah(otherTimelinesAllocated)}`}
                    >
                      Tahapan lain: {formatRupiah(otherTimelinesAllocated)}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-gray-500 block">
                    Total RAB Saat Ini:
                  </span>
                  <span
                    className={`font-mono text-xs font-extrabold ${
                      maxAnggaran > 0 && totalAlokasiRabAktivitas > maxAnggaran
                        ? "text-rose-600"
                        : "text-amber-700"
                    }`}
                  >
                    {formatRupiah(totalRab)}
                  </span>
                </div>
              </div>

              {maxAnggaran > 0 && totalAlokasiRabAktivitas > maxAnggaran && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>
                    <b>Peringatan:</b> Total Alokasi RAB seluruh tahapan (
                    {formatRupiah(totalAlokasiRabAktivitas)}) melebihi batas
                    anggaran realisasi kegiatan ({formatRupiah(maxAnggaran)}).
                    Alokasi tahapan lain:{" "}
                    {formatRupiah(otherTimelinesAllocated)}, tahapan saat ini:{" "}
                    {formatRupiah(totalRab)}. Mohon sesuaikan nominal item RAB.
                  </span>
                </div>
              )}

              {/* Tabel Dinamis RAB */}
              <div className="border border-gray-200 rounded-xl overflow-x-auto shadow-2xs">
                <table className="w-full text-xs min-w-[700px] border-collapse">
                  <thead>
                    <tr className="bg-amber-50/80 text-gray-800 border-b border-gray-200">
                      <th
                        rowSpan={2}
                        className="px-3 py-2 text-left font-bold border-r border-gray-200 w-2/5 min-w-[200px]"
                      >
                        Keterangan
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
                        Harga satuan
                      </th>
                      <th
                        rowSpan={2}
                        className="px-3 py-2 text-right font-bold border-r border-gray-200 w-36"
                      >
                        total
                      </th>
                      <th
                        rowSpan={2}
                        className="px-3 py-2 text-center font-bold border-r border-gray-200 w-44"
                      >
                        bukti
                      </th>
                      <th
                        rowSpan={2}
                        className="px-2 py-2 text-center font-bold w-12"
                      >
                        Aksi
                      </th>
                    </tr>
                    <tr className="bg-amber-100/60 text-gray-700 border-b border-gray-200">
                      <th className="px-2 py-1 text-center font-semibold border-r border-gray-200 w-20">
                        satuan
                      </th>
                      <th className="px-2 py-1 text-center font-semibold border-r border-gray-200 w-20">
                        paket
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {rabRows.map((row, idx) => (
                      <tr
                        key={row.id || idx}
                        className="hover:bg-amber-50/20 transition"
                      >
                        {/* Keterangan */}
                        <td className="p-2 border-r border-gray-100 align-middle">
                          <input
                            type="text"
                            placeholder="Contoh: Konsumsi pagi / Sewa gedung / Honor..."
                            value={row.keterangan}
                            onChange={(e) =>
                              handleRabRowChange(
                                idx,
                                "keterangan",
                                e.target.value,
                              )
                            }
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                          />
                        </td>

                        {/* qty: satuan */}
                        <td className="p-2 border-r border-gray-100 align-middle w-20">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="1"
                            value={row.qty_satuan}
                            onChange={(e) =>
                              handleRabRowChange(
                                idx,
                                "qty_satuan",
                                e.target.value,
                              )
                            }
                            className="w-full px-2 py-1.5 text-xs text-center rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-semibold"
                          />
                        </td>

                        {/* qty: paket */}
                        <td className="p-2 border-r border-gray-100 align-middle w-20">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="1"
                            value={row.qty_paket}
                            onChange={(e) =>
                              handleRabRowChange(
                                idx,
                                "qty_paket",
                                e.target.value,
                              )
                            }
                            className="w-full px-2 py-1.5 text-xs text-center rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-semibold"
                          />
                        </td>

                        {/* Harga satuan */}
                        <td className="p-2 border-r border-gray-100 align-middle w-36">
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            placeholder="0"
                            value={row.harga_satuan}
                            onChange={(e) =>
                              handleRabRowChange(
                                idx,
                                "harga_satuan",
                                e.target.value,
                              )
                            }
                            className="w-full px-2.5 py-1.5 text-xs text-right rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold text-gray-800"
                          />
                        </td>

                        {/* Total: Auto Calculate (qty.satuan * qty.paket * harga_satuan) */}
                        <td className="p-2 border-r border-gray-100 align-middle text-right font-mono font-bold text-amber-900 bg-amber-50/30 w-36">
                          {formatRupiah(row.total || 0)}
                        </td>

                        {/* Bukti Upload */}
                        <td className="p-2 border-r border-gray-100 align-middle w-44">
                          {row.bukti_url ? (
                            <div className="flex items-center justify-between text-[11px] bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
                              <a
                                href={resolveProkerFileUrl(
                                  { FileURL: row.bukti_url },
                                  API_BASE_URL,
                                )}
                                target="_blank"
                                rel="noreferrer"
                                className="text-purple-600 hover:underline truncate max-w-[100px] font-semibold"
                                title={row.bukti_name || "Buka Bukti Berkas"}
                              >
                                {row.bukti_name || "Lihat Bukti"}
                              </a>
                              <label className="text-[10px] text-amber-600 hover:text-amber-800 cursor-pointer underline ml-1 shrink-0">
                                Ganti
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) =>
                                    handleRabFileChange(
                                      idx,
                                      e.target.files?.[0],
                                    )
                                  }
                                />
                              </label>
                            </div>
                          ) : row.bukti_name ? (
                            <div className="flex items-center justify-between text-[11px] bg-emerald-50 text-emerald-800 px-2 py-1 rounded-lg border border-emerald-200">
                              <span
                                className="truncate max-w-[100px] font-medium"
                                title={row.bukti_name}
                              >
                                {row.bukti_name}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleRabRowChange(idx, "bukti_name", "")
                                }
                                className="text-rose-600 hover:text-rose-800 text-xs font-bold shrink-0 ml-1 cursor-pointer"
                                title="Batal pilih file"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <label className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium text-gray-600 bg-gray-50 hover:bg-amber-50 border border-dashed border-gray-300 hover:border-amber-300 rounded-lg cursor-pointer transition">
                              <Upload className="w-3 h-3 text-gray-400" />
                              <span>Pilih File</span>
                              <input
                                type="file"
                                className="hidden"
                                onChange={(e) =>
                                  handleRabFileChange(idx, e.target.files?.[0])
                                }
                              />
                            </label>
                          )}
                        </td>

                        {/* Aksi: Hapus Baris */}
                        <td className="p-2 text-center align-middle w-12">
                          <button
                            type="button"
                            onClick={() => handleRemoveRabRow(idx)}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
                            title="Hapus baris item RAB ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-amber-50/80 border-t-2 border-amber-200 font-bold text-gray-900">
                      <td colSpan={4} className="p-3 text-right">
                        Total Keseluruhan RAB:
                      </td>
                      <td className="p-3 text-right font-mono text-sm text-amber-900 bg-amber-100/60 font-extrabold">
                        {formatRupiah(totalRab)}
                      </td>
                      <td
                        colSpan={2}
                        className="p-3 text-xs text-gray-500 font-normal"
                      >
                        ({rabRows.length} item pengeluaran)
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Tombol Tambah Baris */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleAddRabRow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Baris RAB</span>
                </button>

                <p className="text-[11px] text-gray-500 italic">
                  * Rumus: total = qty.satuan × qty.paket × harga satuan
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
              <div className="text-xs font-bold text-gray-700">
                <span>Total Anggaran Baru: </span>
                <span className="font-mono text-amber-800 font-extrabold text-sm">
                  {formatRupiah(totalRab)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRabModalOpen(false);
                    setSelectedTimelineForRab(null);
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveRab}
                  disabled={
                    isTimelineRabDisabled ||
                    savingRab ||
                    (maxAnggaran > 0 && totalAlokasiRabAktivitas > maxAnggaran)
                  }
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-200 transition flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingRab ? "Menyimpan..." : "Simpan RAB"}</span>
                </button>
              </div>
            </div>
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
        title={
          isTimelineLinkRecord(fileToDelete)
            ? "Hapus Tautan Bukti?"
            : "Hapus Berkas Bukti?"
        }
        message={
          isTimelineLinkRecord(fileToDelete)
            ? `Apakah Anda yakin ingin menghapus tautan "${fileToDelete?.NamaFile || fileToDelete?.FileURL || fileToDelete?.File}"?`
            : `Apakah Anda yakin ingin menghapus berkas "${fileToDelete?.NamaFile || fileToDelete?.File}"? File akan dihapus permanen dari server.`
        }
      />
    </>
  );
}
