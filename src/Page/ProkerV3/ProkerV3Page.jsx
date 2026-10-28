import React, { useRef, useState, useEffect, useMemo, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useNavigate } from "react-router-dom";
import RemoteTable from "@/Components/RemoteTable";
import ProkerV3FormModal from "./ProkerV3FormModal";
import ProkerV3AktivitasModal from "./ProkerV3AktivitasModal";
import StateHistoryDrawer from "./StateHistoryDrawer";
import ConfirmDeleteDialog from "@/Components/ConfirmDeleteDialog";
import SearchSelect from "@/Components/SearchSelect";
import { useToast } from "@/Providers/ToastProvider";
import { useContent } from "@/Providers/ContentProvider";
import { useAuth } from "@/Providers/AuthProvider";
import { apiClient, API_BASE_URL } from "@/Common/api";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import PageHeader from "@/Components/PageHeader";
import Tooltip from "@/Components/Tooltip";
import { formatRupiah } from "./prokerConstants";
import { formatProdiWithJenjang, cleanDuplicateJenjang, formatTanggalBulanTahun } from "@/Common/Utils";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Calendar,
  Building2,
  DollarSign,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  Send,
  Check,
  X,
  AlertCircle,
  GraduationCap,
  School,
  Building,
  Upload,
  FileText,
  XCircle,
  RefreshCw,
} from "lucide-react";

export default function ProkerV3Page() {
  const { getValidToken, user } = useAuth();
  const { addToast } = useToast();
  const {
    level,
    setLevel,
    listLevel,
    positionYear,
    openChangeLevel,
    setOpenChangeLevel,
    changeLevel,
  } = useContent();

  const isAdmin = level === "admin" || user?.level === "admin";
  const tableRef = useRef(null);

  // Modal States
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState("create");
  const [selectedRow, setSelectedRow] = useState(null);

  const [aktivitasModalOpen, setAktivitasModalOpen] = useState(false);
  const [selectedProkerUuid, setSelectedProkerUuid] = useState(null);

  const [confirmDelete, setConfirmDelete] = useState(false);

  // State History Drawer State
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);

  // Rejection Modal State (for Anggaran & Verifikator)
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingRow, setRejectingRow] = useState(null);
  const [alasanPenolakan, setAlasanPenolakan] = useState("");
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // Revisi ke Draft Modal State (for Anggaran, Verifikator & Admin)
  const [revisiDraftModalOpen, setRevisiDraftModalOpen] = useState(false);
  const [rowToRevisiDraft, setRowToRevisiDraft] = useState(null);
  const [alasanRevisiDraft, setAlasanRevisiDraft] = useState("");
  const [isSubmittingRevisiDraft, setIsSubmittingRevisiDraft] = useState(false);

  // Batch Operations State
  const [selectedUuids, setSelectedUuids] = useState([]);
  const [currentPageRows, setCurrentPageRows] = useState([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchRejectModalOpen, setBatchRejectModalOpen] = useState(false);
  const [batchRejectReason, setBatchRejectReason] = useState("");
  const [isSubmittingBatchReject, setIsSubmittingBatchReject] = useState(false);
  const [batchRevisiModalOpen, setBatchRevisiModalOpen] = useState(false);
  const [batchRevisiReason, setBatchRevisiReason] = useState("");
  const [isSubmittingBatchRevisi, setIsSubmittingBatchRevisi] = useState(false);

  // Filters State
  const initialYear = positionYear || "all";
  const [selectedTahun, setSelectedTahun] = useState(initialYear);
  const [selectedTahunObj, setSelectedTahunObj] = useState({
    id: initialYear,
    tahun: initialYear,
    label: initialYear === "all" ? "Semua Tahun" : String(initialYear),
    name: initialYear === "all" ? "Semua Tahun" : String(initialYear),
  });

  useEffect(() => {
    if (positionYear && positionYear !== "all" && selectedTahun === "all") {
      setSelectedTahun(String(positionYear));
      setSelectedTahunObj({
        id: String(positionYear),
        tahun: String(positionYear),
        label: String(positionYear),
        name: String(positionYear),
      });
    }
  }, [positionYear]);

  const curRole = String(
    level || localStorage.getItem("activeLevel") || user?.level || "",
  )
    .toLowerCase()
    .trim();
  const isUpm = ["upml", "upmf", "upms"].includes(curRole);
  const isVerifier = ["fakultas", "evaluator"].includes(curRole);
  const isAnggaran = ["anggaran", "keuangan"].includes(curRole);
  const isAuditee = curRole === "auditee";
  const isLevelUser = curRole === "user";
  const isEvaluator = curRole === "evaluator" || curRole.includes("evaluator");

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
      isUpm ||
      isEvaluator
    );
  }, [curRole, level, user?.level, isAdmin, isVerifier, isUpm, isEvaluator]);

  const [selectedUnit, setSelectedUnit] = useState("all");
  const [selectedUnitObj, setSelectedUnitObj] = useState(null);

  const [selectedProdi, setSelectedProdi] = useState("all");
  const [selectedProdiObj, setSelectedProdiObj] = useState(null);

  // Tab filter verifikasi & persetujuan ("semua" | "menunggu" | "terima" | "tolak")
  const [activeTab, setActiveTab] = useState(isAdmin ? "semua" : "menunggu");

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    tableRef.current?.reload?.({ resetPage: true });
  };

  useEffect(() => {
    setActiveTab(isAdmin ? "semua" : "menunggu");
  }, [level, isAdmin]);

  // Jadwal Proker V3 Status Check
  const [jadwalStatus, setJadwalStatus] = useState(null);
  const [loadingJadwalStatus, setLoadingJadwalStatus] = useState(false);

  useEffect(() => {
    const fetchJadwalStatus = async () => {
      const targetYear =
        selectedTahun && selectedTahun !== "all"
          ? selectedTahun
          : positionYear || "2027";
      if (!targetYear || targetYear === "all") {
        setJadwalStatus(null);
        return;
      }
      setLoadingJadwalStatus(true);
      try {
        const res = await apiClient.get(
          `/proker_v3/jadwal_status?tahun=${targetYear}`,
        );
        setJadwalStatus(res?.data || null);
      } catch (err) {
        console.error("Gagal memeriksa jadwal proker:", err);
      } finally {
        setLoadingJadwalStatus(false);
      }
    };

    fetchJadwalStatus();
  }, [selectedTahun, positionYear]);

  // Master Options
  const [unitOptions, setUnitOptions] = useState([]);
  const [tahunOptions, setTahunOptions] = useState([]);
  const [standarOptions, setStandarOptions] = useState([]);
  const [indikatorOptions, setIndikatorOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // User's matched unit info (mendukung penugasan role ABAC)
  const userUnitData = useMemo(() => {
    let userFU =
      user?.fakultas_unit || user?.id_fakultas_unit || user?.FakultasUnit;
    if (Array.isArray(user?.extra_role)) {
      const match =
        user.extra_role.find(
          (r) =>
            String(r.role || "").toLowerCase() === "user" &&
            (!positionYear ||
              String(r.tahun ?? r.Tahun) === String(positionYear)) &&
            (r.id_fakultas_unit || r.IdFakultasUnit),
        ) ||
        user.extra_role.find(
          (r) =>
            String(r.role || "").toLowerCase() === "user" &&
            (r.id_fakultas_unit || r.IdFakultasUnit),
        );
      if (match?.id_fakultas_unit || match?.IdFakultasUnit) {
        userFU = match.id_fakultas_unit || match.IdFakultasUnit;
      }
    }
    const fuStr = String(userFU ?? "").trim();
    if (!fuStr || fuStr === "0" || fuStr === "null" || fuStr === "undefined")
      return null;

    return (
      unitOptions.find((u) => {
        const uid = String(u.id ?? u.Id ?? "").trim();
        const uuid = String(u.uuid ?? u.UUID ?? "")
          .trim()
          .toLowerCase();
        const uName = String(u.Nama ?? u.nama ?? u.nama_fak_prod_unit ?? "")
          .trim()
          .toLowerCase();
        return (
          (uid !== "" && uid === fuStr) ||
          (uuid !== "" && uuid === fuStr.toLowerCase()) ||
          (uName !== "" && uName === fuStr.toLowerCase())
        );
      }) || {
        id: userFU,
        uuid: userFU,
        nama:
          user?.nama_fakultas_unit ||
          user?.NamaFakultasUnit ||
          `Unit #${userFU}`,
        label:
          user?.nama_fakultas_unit ||
          user?.NamaFakultasUnit ||
          `Unit #${userFU}`,
        name:
          user?.nama_fakultas_unit ||
          user?.NamaFakultasUnit ||
          `Unit #${userFU}`,
      }
    );
  }, [user, unitOptions, positionYear]);

  const userTargetName =
    userUnitData?.raw_nama ||
    userUnitData?.nama ||
    user?.nama_fakultas_unit ||
    user?.NamaFakultasUnit ||
    "";

  // Semua unit yang ditugaskan ke user ini via user_abac untuk role & tahun ini
  const userAssignedUnits = useMemo(() => {
    if (!Array.isArray(user?.extra_role)) return [];
    const matched = user.extra_role.filter(
      (r) =>
        String(r.role ?? r.Role).toLowerCase() === curRole &&
        (!positionYear || String(r.tahun ?? r.Tahun) === String(positionYear)),
    );
    const unique = [];
    const seen = new Set();
    matched.forEach((m) => {
      const uId = String(m.id_fakultas_unit ?? m.IdFakultasUnit ?? "");
      if (uId && uId !== "0" && !seen.has(uId)) {
        seen.add(uId);
        const found = unitOptions.find(
          (u) => String(u.id) === uId || String(u.uuid) === uId,
        );
        unique.push(
          found || {
            id: uId,
            uuid: uId,
            nama: m.nama_fakultas_unit || `Unit #${uId}`,
            label: m.nama_fakultas_unit || `Unit #${uId}`,
            name: m.nama_fakultas_unit || `Unit #${uId}`,
            raw_nama: m.nama_fakultas_unit || `Unit #${uId}`,
            type: "unit",
          },
        );
      }
    });
    return unique;
  }, [user?.extra_role, curRole, positionYear, unitOptions]);

  // Cek apakah user memiliki penugasan aktif untuk role & tahun ini di user_abac
  const hasActiveRoleAssignment = useMemo(() => {
    if (!Array.isArray(user?.extra_role)) return false;
    return user.extra_role.some(
      (r) =>
        String(r.role ?? r.Role).toLowerCase() === curRole &&
        (!positionYear || String(r.tahun ?? r.Tahun) === String(positionYear)),
    );
  }, [user?.extra_role, curRole, positionYear]);

  // Helper to format unit/fakultas filter options
  const formatUnitOption = (u) => {
    const rawName = u.raw_nama || u.nama;
    const isFakultas =
      (u.type || "").toLowerCase() === "fakultas" ||
      (u.type || "").toLowerCase() === "sekolah";
    const typeLabel = isFakultas ? "FAKULTAS" : "UNIT";
    return {
      ...u,
      badge: typeLabel,
      badgeClass: isFakultas
        ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
        : "bg-emerald-50 text-emerald-700 border border-emerald-200",
      display_name: rawName,
      label: `${rawName} (${typeLabel})`,
      nama: `${rawName} (${typeLabel})`,
    };
  };

  // Options unit untuk dropdown filter
  const unitFilterOptions = useMemo(() => {
    if (curRole === "upml") {
      if (userAssignedUnits.length > 0) {
        const formattedAssigned = userAssignedUnits.map(formatUnitOption);
        if (formattedAssigned.length === 1) return formattedAssigned;
        return [
          {
            id: "all",
            uuid: "all",
            label: "Semua Unit Penugasan",
            nama: "Semua Unit Penugasan",
            display_name: "Semua Unit Penugasan",
          },
          ...formattedAssigned,
        ];
      }
      return [];
    }

    if (curRole === "upmf") {
      // Hanya penugasan dengan target bertipe fakultas / sekolah
      const assignedFakultas = userAssignedUnits.filter((u) => {
        const t = (u.type || "").toLowerCase();
        return t === "fakultas" || t === "sekolah";
      });
      if (assignedFakultas.length > 0) {
        const formattedAssigned = assignedFakultas.map(formatUnitOption);
        if (formattedAssigned.length === 1) return formattedAssigned;
        return [
          {
            id: "all",
            uuid: "all",
            label: "Semua Fakultas Penugasan",
            nama: "Semua Fakultas Penugasan",
            display_name: "Semua Fakultas Penugasan",
          },
          ...formattedAssigned,
        ];
      }
      return [];
    }

    if (curRole === "upms") {
      if (userAssignedUnits.length > 0) {
        const formattedAssigned = userAssignedUnits.map(formatUnitOption);
        if (formattedAssigned.length === 1) return formattedAssigned;
        return [
          {
            id: "all",
            uuid: "all",
            label: "Semua Unit Penugasan",
            nama: "Semua Unit Penugasan",
            display_name: "Semua Unit Penugasan",
          },
          ...formattedAssigned,
        ];
      }
      // Jika tidak ada unit spesifik tapi memiliki penugasan UPMS di tahun ini (universal / tingkat universitas / sekolah):
      // Lanjut ke bawah agar menampilkan semua fakultas & unit
      if (!hasActiveRoleAssignment) {
        return [];
      }
    }

    // admin, verifikator umum, evaluator, anggaran, upms (universal)
    // Exclude prodi - dropdown Unit/Fakultas khusus menampilkan fakultas dan unit
    // DATA FAKULTAS HARUS PALING ATAS
    const fakultasUnits = [];
    const regularUnits = [];

    unitOptions.forEach((u) => {
      const t = (u.type || "").toLowerCase();
      if (t === "fakultas" || t === "sekolah") {
        fakultasUnits.push(u);
      } else if (t === "unit") {
        regularUnits.push(u);
      }
    });

    // Urutkan fakultas berdasarkan kode_fakultas (01, 02, ...), fallback ke nama
    fakultasUnits.sort((a, b) => {
      if (a.kode_fakultas && b.kode_fakultas) {
        return a.kode_fakultas.localeCompare(b.kode_fakultas, undefined, {
          numeric: true,
        });
      }
      return (a.raw_nama || a.nama || "").localeCompare(
        b.raw_nama || b.nama || "",
      );
    });

    // Urutkan unit secara alfabetis
    regularUnits.sort((a, b) =>
      (a.raw_nama || a.nama || "").localeCompare(b.raw_nama || b.nama || ""),
    );

    const sortedUnits = [...fakultasUnits, ...regularUnits];

    return [
      {
        id: "all",
        uuid: "all",
        label: "Semua Unit / Fakultas",
        nama: "Semua Unit / Fakultas",
        display_name: "Semua Unit / Fakultas",
      },
      ...sortedUnits.map(formatUnitOption),
    ];
  }, [curRole, userAssignedUnits, unitOptions, hasActiveRoleAssignment]);

  // Cek apakah dropdown unit/fakultas memilih item bertipe fakultas
  const isFakultasSelected = useMemo(() => {
    if (!selectedUnit || selectedUnit === "all") return false;
    const curUnit =
      unitOptions.find(
        (u) =>
          String(u.id) === String(selectedUnit) ||
          String(u.uuid) === String(selectedUnit),
      ) ||
      userAssignedUnits.find(
        (u) =>
          String(u.id) === String(selectedUnit) ||
          String(u.uuid) === String(selectedUnit),
      ) ||
      selectedUnitObj;

    const t = curUnit ? (curUnit.type || "").toLowerCase() : "";
    return t === "fakultas" || t === "sekolah";
  }, [selectedUnit, unitOptions, userAssignedUnits, selectedUnitObj]);

  // Reset prodi jika fakultas tidak dipilih
  useEffect(() => {
    if (!isFakultasSelected) {
      if (selectedProdi !== "all") {
        setSelectedProdi("all");
      }
      if (selectedProdiObj !== null) {
        setSelectedProdiObj(null);
      }
    }
  }, [isFakultasSelected, selectedProdi, selectedProdiObj]);

  // Options prodi untuk dropdown filter
  const prodiOptionsForFilter = useMemo(() => {
    // Kalau belum pilih item tipe fakultas, item prodi jangan ditampilkan
    if (!isFakultasSelected) {
      return [];
    }

    const curUnit =
      unitOptions.find(
        (u) =>
          String(u.id) === String(selectedUnit) ||
          String(u.uuid) === String(selectedUnit),
      ) ||
      userAssignedUnits.find(
        (u) =>
          String(u.id) === String(selectedUnit) ||
          String(u.uuid) === String(selectedUnit),
      ) ||
      selectedUnitObj;

    let prodis = unitOptions.filter(
      (u) => (u.type || "").toLowerCase() === "prodi",
    );

    if (curUnit) {
      // Filter prodi berdasarkan kode_fakultas dari fakultas yang dipilih
      prodis = prodis.filter((p) => {
        if (curUnit.kode_fakultas && p.kode_fakultas) {
          return (
            String(p.kode_fakultas).trim() ===
            String(curUnit.kode_fakultas).trim()
          );
        }
        // Fallback ke pencocokan nama fakultas
        const fName = (
          curUnit.raw_nama ||
          curUnit.nama ||
          curUnit.fakultas ||
          ""
        )
          .toLowerCase()
          .trim();
        const pFak = (p.fakultas || "").toLowerCase().trim();
        return (
          pFak === fName || (p.nama && p.nama.toLowerCase().includes(fName))
        );
      });
    }

    // Urutkan prodi secara alfabetis
    prodis.sort((a, b) =>
      (a.raw_nama || a.nama || "").localeCompare(b.raw_nama || b.nama || ""),
    );

    const mapped = prodis.map((p) => {
      const rawName = cleanDuplicateJenjang(p.raw_nama || p.nama);
      const labelWithJenjang = formatProdiWithJenjang(rawName, p.jenjang);
      const jenjangUpper = (p.jenjang || "").toUpperCase();
      return {
        ...p,
        badge: jenjangUpper || null,
        badgeClass: "bg-purple-50 text-purple-700 border border-purple-200",
        display_name: rawName,
        label: labelWithJenjang,
        nama: labelWithJenjang,
      };
    });

    return [
      {
        id: "all",
        uuid: "all",
        label: "Semua Program Studi",
        nama: "Semua Program Studi",
        display_name: "Semua Program Studi",
      },
      ...mapped,
    ];
  }, [
    unitOptions,
    selectedUnit,
    isFakultasSelected,
    userAssignedUnits,
    selectedUnitObj,
  ]);

  // Auto-select unit untuk upml, upmf, dan upms
  useEffect(() => {
    if (curRole === "upms") {
      if (!hasActiveRoleAssignment) {
        if (selectedUnit !== "none") {
          setSelectedUnit("none");
          setSelectedUnitObj(null);
        }
        return;
      }

      if (userAssignedUnits.length > 0) {
        const exists = userAssignedUnits.some(
          (u) =>
            String(u.id) === String(selectedUnit) ||
            String(u.uuid) === String(selectedUnit),
        );
        if (!exists || selectedUnit === "none") {
          const first = userAssignedUnits[0];
          setSelectedUnit(String(first.id || first.uuid));
          setSelectedUnitObj(first);
        }
      } else {
        // Universal UPMS: default ke "all" (Semua Unit / Fakultas)
        if (selectedUnit === "none" || !selectedUnit) {
          setSelectedUnit("all");
          setSelectedUnitObj(null);
        }
      }
      return;
    }

    const isScoped = ["upml", "upmf"].includes(curRole);
    if (!isScoped) return;

    let available = userAssignedUnits;
    if (curRole === "upmf") {
      available = userAssignedUnits.filter((u) => {
        const t = (u.type || "").toLowerCase();
        return t === "fakultas" || t === "sekolah";
      });
    }

    if (available.length > 0) {
      const exists = available.some(
        (u) =>
          String(u.id) === String(selectedUnit) ||
          String(u.uuid) === String(selectedUnit),
      );
      if (!exists || selectedUnit === "all" || selectedUnit === "none") {
        const first = available[0];
        setSelectedUnit(String(first.id || first.uuid));
        setSelectedUnitObj(first);
      }
    } else {
      if (selectedUnit !== "none") {
        setSelectedUnit("none");
        setSelectedUnitObj(null);
      }
    }
  }, [curRole, userAssignedUnits, hasActiveRoleAssignment, selectedUnit]);

  // Handlers select filter
  const handleSelectUnit = (val) => {
    setSelectedUnitObj(val);
    setSelectedUnit(val ? String(val.id || val.uuid) : "all");
    setSelectedProdi("all");
    setSelectedProdiObj(null);
  };

  const handleSelectProdi = (val) => {
    setSelectedProdiObj(val);
    setSelectedProdi(val ? String(val.id || val.uuid) : "all");
  };

  // Fetch Master Options
  const fetchOptions = async () => {
    setLoadingOptions(true);
    try {
      const res = await apiClient.get("/proker_v3_options");
      const data = res.data;
      const units = (data.units || []).map((u) => ({
        ...u,
        raw_nama: u.nama,
        label: u.nama,
        name: u.nama,
        type: (u.type || "").toLowerCase(),
        fakultas: u.fakultas || "",
        jenjang: u.jenjang || "",
        kode_fakultas: u.kode_fakultas || "",
      }));
      setUnitOptions(units);

      const rawTahuns = data.tahuns || [];
      const tahuns = [
        { id: "all", tahun: "all", label: "Semua Tahun", name: "Semua Tahun" },
        ...rawTahuns.map((t) => ({
          ...t,
          label: String(t.tahun),
          name: String(t.tahun),
        })),
      ];

      // Sertakan positionYear jika belum ada di list
      if (
        positionYear &&
        !tahuns.some((t) => String(t.tahun) === String(positionYear))
      ) {
        tahuns.push({
          id: String(positionYear),
          tahun: String(positionYear),
          label: String(positionYear),
          name: String(positionYear),
        });
      }

      setTahunOptions(tahuns);
      setStandarOptions(data.standars || []);
      setIndikatorOptions(data.indikators || []);
    } catch (e) {
      console.error("Failed to load options", e);
    } finally {
      setLoadingOptions(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  const fuVal = String(
    user?.fakultas_unit || user?.id_fakultas_unit || user?.FakultasUnit || "",
  ).trim();
  const hasTarget = Boolean(
    userUnitData?.id ||
    userUnitData?.uuid ||
    (fuVal !== "" &&
      fuVal !== "0" &&
      fuVal !== "null" &&
      fuVal !== "undefined") ||
    (userAssignedUnits && userAssignedUnits.length > 0),
  );

  const excludedAddRoles = [
    "anggaran",
    "keuangan",
    "evaluator",
    "admin",
    "auditee",
    "auditor1",
    "auditor2",
    "upml",
    "upmf",
    "upms",
  ];

  // Cek apakah akun ini adalah akun UPM (upml, upmf, upms)
  const isUpmUser = useMemo(() => {
    if (isUpm) return true;
    if (Array.isArray(user?.extra_role)) {
      return user.extra_role.some((r) =>
        ["upml", "upmf", "upms"].includes(
          String(r.role ?? r.Role ?? "")
            .toLowerCase()
            .trim(),
        ),
      );
    }
    return false;
  }, [isUpm, user?.extra_role]);

  const canAddProker =
    isLevelUser &&
    !isUpmUser &&
    hasTarget &&
    !excludedAddRoles.includes(curRole);

  const isUnitUser = isLevelUser && !isUpmUser && hasTarget;
  const isVerifikatorUser = isVerifier || isUpm;
  const isAnggaranUser = isAnggaran;
  const isScheduleLocked =
    !isAdmin &&
    Boolean(jadwalStatus?.has_schedule && !jadwalStatus?.is_open);

  // Cek apakah user berhak mengelola (edit/hapus) proker tertentu:
  // HANYA muncul di level user yang memiliki target fakultas_unit (bukan akun UPM dan tahun aktif harus cocok)
  const canManageProker = (r) => {
    if (!isLevelUser || isUpmUser || !hasTarget) return false;
    if (!r) return false;

    // Pastikan tahun proker sesuai dengan positionYear yang sedang aktif di navbar
    if (positionYear && r.Tahun && String(positionYear) !== String(r.Tahun)) {
      return false;
    }

    const prokerFuId = String(r.IdFakultasUnit || r.id_fakultas_unit || "");
    const prokerFuUuid = String(
      r.UuidFakultasUnit || r.FakultasUnit || r.uuid_fakultas_unit || "",
    ).toLowerCase();
    const prokerFuName = String(
      r.NamaFakultasUnit || r.nama_fakultas_unit || "",
    )
      .trim()
      .toLowerCase();
    const effYear = String(r.Tahun || positionYear || "").trim();

    // 1. Cek dari penugasan ABAC (user.extra_role)
    if (Array.isArray(user?.extra_role) && user.extra_role.length > 0) {
      const match = user.extra_role.some((roleItem) => {
        const rYear = String(roleItem.tahun ?? roleItem.Tahun ?? "").trim();
        if (rYear && effYear && rYear !== effYear) return false;

        const rRole = String(roleItem.role ?? roleItem.Role ?? "")
          .toLowerCase()
          .trim();
        if (rRole && rRole !== "user") return false;

        const uId = roleItem.id_fakultas_unit ?? roleItem.IdFakultasUnit;
        if (uId && prokerFuId && String(uId) === prokerFuId) return true;

        const uUuid = String(
          roleItem.uuid_fakultas_unit ?? roleItem.UuidFakultasUnit ?? "",
        ).toLowerCase();
        if (uUuid && prokerFuUuid && uUuid === prokerFuUuid) return true;

        const uName = String(
          roleItem.nama_fakultas_unit ?? roleItem.NamaFakultasUnit ?? "",
        )
          .trim()
          .toLowerCase();
        if (
          uName &&
          prokerFuName &&
          (uName === prokerFuName ||
            prokerFuName.includes(uName) ||
            uName.includes(prokerFuName))
        )
          return true;

        return false;
      });
      if (match) return true;
    }

    // 2. Cek dari userAssignedUnits
    if (Array.isArray(userAssignedUnits) && userAssignedUnits.length > 0) {
      const match = userAssignedUnits.some((u) => {
        const uId = String(u.id || u.rawId || "");
        const uUuid = String(u.uuid || u.UUID || "").toLowerCase();
        const uName = String(u.raw_nama || u.nama || "")
          .trim()
          .toLowerCase();
        if (uId && prokerFuId && uId === prokerFuId) return true;
        if (uUuid && prokerFuUuid && uUuid === prokerFuUuid) return true;
        if (
          uName &&
          prokerFuName &&
          (uName === prokerFuName ||
            prokerFuName.includes(uName) ||
            uName.includes(prokerFuName))
        )
          return true;
        return false;
      });
      if (match) return true;
    }

    // 3. Cek dari field user langsung / userUnitData (hanya jika bukan akun UPM)
    if (!isUpmUser) {
      const directFu = String(
        user?.fakultas_unit ||
          user?.id_fakultas_unit ||
          user?.FakultasUnit ||
          userUnitData?.id ||
          userUnitData?.uuid ||
          "",
      ).trim();
      if (
        directFu &&
        directFu !== "0" &&
        directFu !== "null" &&
        directFu !== "undefined"
      ) {
        if (prokerFuId && directFu === prokerFuId) return true;
        if (prokerFuUuid && directFu.toLowerCase() === prokerFuUuid)
          return true;
        if (prokerFuName && directFu.toLowerCase() === prokerFuName)
          return true;
      }

      const directFuUuid = String(
        user?.uuid_fakultas_unit ||
          user?.UuidFakultasUnit ||
          userUnitData?.uuid ||
          "",
      ).toLowerCase();
      if (directFuUuid && prokerFuUuid && directFuUuid === prokerFuUuid)
        return true;

      const directFuName = String(
        user?.nama_fakultas_unit ||
          user?.NamaFakultasUnit ||
          userUnitData?.raw_nama ||
          userUnitData?.nama ||
          "",
      )
        .trim()
        .toLowerCase();
      if (
        directFuName &&
        prokerFuName &&
        (directFuName === prokerFuName ||
          prokerFuName.includes(directFuName) ||
          directFuName.includes(prokerFuName))
      )
        return true;
    }

    // Jika proker tidak memiliki ID/UUID unit, fallback cek apakah user memang memiliki target
    if (!prokerFuId && !prokerFuUuid && hasTarget) {
      return true;
    }

    return false;
  };

  // Table Endpoint query
  const tableEndpoint = useMemo(() => {
    const params = new URLSearchParams();

    const effTahun =
      selectedTahun && selectedTahun !== "all"
        ? selectedTahun
        : positionYear && positionYear !== "all"
          ? positionYear
          : null;
    if (effTahun) {
      params.append("filter_tahun", effTahun);
    }

    const isUnrestricted = isAnggaran || curRole === "evaluator" || isAdmin;
    const isScopedVerifier = ["upml", "upmf"].includes(curRole);

    if (isUnrestricted) {
      if (selectedUnit && selectedUnit !== "all" && selectedUnit !== "none") {
        params.append("filter_fakultas_unit", selectedUnit);
      }
      if (isFakultasSelected && selectedProdi && selectedProdi !== "all") {
        params.append("filter_prodi", selectedProdi);
      }
      if (
        (isVerifier || isAnggaran || isAdmin) &&
        activeTab &&
        activeTab !== "semua" &&
        activeTab !== "all"
      ) {
        params.append(
          "filter_tab",
          isAnggaran ? `anggaran:${activeTab}` : activeTab,
        );
      }
    } else if (curRole === "upms") {
      if (!hasActiveRoleAssignment) {
        params.append("filter_fakultas_unit", "-1");
      } else if (userAssignedUnits.length > 0) {
        if (selectedUnit === "none") {
          params.append("filter_fakultas_unit", "-1");
        } else if (selectedUnit && selectedUnit !== "all") {
          params.append("filter_fakultas_unit", selectedUnit);
        } else {
          const allIds = userAssignedUnits
            .map((u) => u.id)
            .filter(Boolean)
            .join(",");
          params.append("filter_fakultas_unit", allIds || "-1");
        }
      } else {
        // Universal UPMS (Tingkat Universitas / Sekolah):
        // Jika filter memilih unit/fakultas tertentu, kirimkan filter tersebut; jika "all", tampilkan semua tanpa dibatasi
        if (selectedUnit && selectedUnit !== "all" && selectedUnit !== "none") {
          params.append("filter_fakultas_unit", selectedUnit);
        }
      }

      if (isFakultasSelected && selectedProdi && selectedProdi !== "all") {
        params.append("filter_prodi", selectedProdi);
      }
      if (activeTab) {
        params.append("filter_tab", activeTab);
      }
    } else if (isScopedVerifier) {
      // UPML, UPMF: hanya tampilkan jika ada target penugasan di tahun ini
      let validAssigned = userAssignedUnits;
      if (curRole === "upmf") {
        validAssigned = userAssignedUnits.filter((u) => {
          const t = (u.type || "").toLowerCase();
          return t === "fakultas" || t === "sekolah";
        });
      }

      if (validAssigned.length === 0 || selectedUnit === "none") {
        params.append("filter_fakultas_unit", "-1");
      } else if (selectedUnit && selectedUnit !== "all") {
        params.append("filter_fakultas_unit", selectedUnit);
      } else {
        const allIds = validAssigned
          .map((u) => u.id)
          .filter(Boolean)
          .join(",");
        params.append("filter_fakultas_unit", allIds || "-1");
      }

      if (isFakultasSelected && selectedProdi && selectedProdi !== "all") {
        params.append("filter_prodi", selectedProdi);
      }
      if (activeTab) {
        params.append("filter_tab", activeTab);
      }
    } else {
      const targetUnitId =
        (selectedUnit && selectedUnit !== "all" && selectedUnit !== "none"
          ? selectedUnit
          : null) ||
        userUnitData?.id ||
        userUnitData?.uuid ||
        user?.fakultas_unit ||
        user?.id_fakultas_unit ||
        user?.FakultasUnit;
      if (targetUnitId) {
        params.append("filter_fakultas_unit", String(targetUnitId));
      } else {
        params.append("filter_fakultas_unit", "-1");
      }
      if (isFakultasSelected && selectedProdi && selectedProdi !== "all") {
        params.append("filter_prodi", selectedProdi);
      }
      if (isVerifier && activeTab) {
        params.append("filter_tab", activeTab);
      }
    }

    const qs = params.toString();
    return `/proker_v3s${qs ? `?${qs}` : ""}`;
  }, [
    selectedTahun,
    selectedUnit,
    selectedProdi,
    isFakultasSelected,
    isAdmin,
    isVerifier,
    isAnggaran,
    curRole,
    user,
    userUnitData,
    userAssignedUnits,
    hasActiveRoleAssignment,
    positionYear,
    activeTab,
  ]);

  const openCreate = () => {
    if (!canAddProker) {
      addToast(
        "warning",
        "Anda tidak memiliki hak akses untuk menambah program kerja",
      );
      return;
    }
    if (isScheduleLocked) {
      addToast(
        "error",
        jadwalStatus?.message ||
          "Penambahan program kerja saat ini ditutup sesuai jadwal.",
      );
      return;
    }
    setFormModalMode("create");
    setSelectedRow(null);
    setFormModalOpen(true);
  };

  const openEdit = (row) => {
    if (!canManageProker(row)) {
      addToast(
        "warning",
        "Akses ditolak: Edit program kerja hanya untuk level user pada unit yang ditugaskan",
      );
      return;
    }
    setFormModalMode("edit");
    setSelectedRow(row);
    setFormModalOpen(true);
  };

  const navigate = useNavigate();

  const openAktivitas = (row) => {
    if (row?.UUID) {
      navigate(`/proker_v3/${row.UUID}/aktivitas`);
    }
  };

  const openDokumen = (row) => {
    if (row?.UUID) {
      navigate(`/proker_v3/${row.UUID}/dokumen`);
    }
  };

  // Update Status Proker Handler (Button / Action in table)
  const handleUpdateStatus = async (row, nextStatus) => {
    if (nextStatus === "diajukan" && isScheduleLocked) {
      addToast(
        "error",
        formatTanggalBulanTahun(jadwalStatus?.message) ||
          `Pengajuan program kerja tahun ${row?.Tahun || selectedTahun} saat ini belum dibuka atau telah ditutup.`,
      );
      return;
    }
    try {
      const fd = new FormData();
      fd.append("status", nextStatus);
      await apiClient.put(`/proker_v3/${row.UUID}/status`, fd);
      addToast(
        "success",
        `Status program kerja berhasil diubah menjadi: ${nextStatus.toUpperCase()}`,
      );
      tableRef.current?.reload?.({ resetPage: false });
    } catch (err) {
      addToast(
        "error",
        err?.response?.data?.error || err?.message || "Gagal memperbarui status",
      );
    }
  };

  // Verifikator (UPM / Evaluator) Verification Handler
  const handleVerifyVerifikator = async (row) => {
    try {
      const fd = new FormData();
      fd.append("status", "terima_verifikator");
      await apiClient.put(`/proker_v3/${row.UUID}/status`, fd);
      addToast(
        "success",
        `Program kerja "${row.NamaProgram}" berhasil disetujui (Terima Verifikator)`,
      );
      tableRef.current?.reload?.({ resetPage: false });
    } catch (err) {
      addToast(
        "error",
        err?.response?.data?.error ||
          err?.message ||
          "Gagal memverifikasi program kerja",
      );
    }
  };

  // Anggaran Verification Handlers
  const handleVerifyAnggaran = async (row) => {
    try {
      const fd = new FormData();
      fd.append("status", "terima_anggaran");
      await apiClient.put(`/proker_v3/${row.UUID}/status`, fd);
      addToast(
        "success",
        `Program kerja "${row.NamaProgram}" berhasil disetujui (Terima Anggaran)`,
      );
      tableRef.current?.reload?.({ resetPage: false });
    } catch (err) {
      addToast(
        "error",
        err?.response?.data?.error ||
          err?.message ||
          "Gagal memverifikasi anggaran",
      );
    }
  };

  const handleOpenRejectModal = (row) => {
    setRejectingRow(row);
    setAlasanPenolakan("");
    setRejectModalOpen(true);
  };

  const handleSubmitRejectProker = async () => {
    if (!alasanPenolakan.trim()) {
      addToast("error", "Alasan penolakan wajib diisi");
      return;
    }
    try {
      setIsSubmittingReject(true);
      const fd = new FormData();
      fd.append("status", "ditolak");
      fd.append("catatan_penolakan", alasanPenolakan.trim());
      await apiClient.put(`/proker_v3/${rejectingRow.UUID}/status`, fd);
      addToast(
        "success",
        `Program kerja "${rejectingRow.NamaProgram}" berhasil ditolak`,
      );
      setRejectModalOpen(false);
      setRejectingRow(null);
      tableRef.current?.reload?.({ resetPage: false });
    } catch (err) {
      addToast(
        "error",
        err?.response?.data?.error ||
          err?.message ||
          "Gagal menolak program kerja",
      );
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const handleOpenRevisiDraft = (row) => {
    setRowToRevisiDraft(row);
    setAlasanRevisiDraft("");
    setRevisiDraftModalOpen(true);
  };

  const handleSubmitRevisiDraft = async () => {
    if (!rowToRevisiDraft?.UUID) return;
    try {
      setIsSubmittingRevisiDraft(true);
      const fd = new FormData();
      fd.append("status", "draft");
      if (alasanRevisiDraft.trim()) {
        fd.append("catatan_penolakan", alasanRevisiDraft.trim());
      }
      await apiClient.put(`/proker_v3/${rowToRevisiDraft.UUID}/status`, fd);
      addToast(
        "success",
        `Program kerja "${rowToRevisiDraft.NamaProgram}" berhasil dikembalikan ke status Draft`,
      );
      setRevisiDraftModalOpen(false);
      setRowToRevisiDraft(null);
      setAlasanRevisiDraft("");
      tableRef.current?.reload?.({ resetPage: false });
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

  const deleteData = async () => {
    if (!selectedRow?.UUID) return;
    if (!canManageProker(selectedRow)) {
      addToast(
        "warning",
        "Akses ditolak: Hapus program kerja hanya untuk level user pada unit yang ditugaskan",
      );
      setConfirmDelete(false);
      return;
    }
    try {
      await apiClient.delete(`/proker_v3/${selectedRow.UUID}`);
      addToast("success", "Program kerja berhasil dihapus");
    } catch (err) {
      addToast("error", err?.message || "Layanan tidak dapat dihubungi");
    } finally {
      setConfirmDelete(false);
      tableRef.current?.reload?.({ resetPage: true });
    }
  };

  const canUseBatch =
    isUnitUser || isVerifikatorUser || isAnggaranUser || isAdmin;

  // Clear selected prokers when filter or tab changes
  useEffect(() => {
    setSelectedUuids([]);
  }, [tableEndpoint, activeTab]);

  const isRowSelectable = (row) => {
    if (!row?.UUID) return false;
    const sMain = (row.Status || "").toLowerCase().trim();
    const sVerif = (row.StatusVerifikator || "").toLowerCase().trim();
    const sAngg = (row.StatusAnggaran || "").toLowerCase().trim();

    const isVerifierApproved =
      sVerif === "terima_verifikator" ||
      sVerif === "disetujui" ||
      sVerif.includes("diverifikasi") ||
      sMain === "disetujui" ||
      sMain === "terima_anggaran" ||
      sMain === "terima anggaran" ||
      sMain.includes("diverifikasi");

    const isAnggaranApproved =
      sAngg === "terima_anggaran" ||
      sAngg === "disetujui" ||
      sMain === "terima_anggaran" ||
      sMain === "terima anggaran";

    // 1. User yang memiliki fakultas_unit (Operator / Pengusul)
    if (isUnitUser) {
      if (!canManageProker(row)) return false;
      return (
        sMain === "draft" || sMain === "ditolak" || sMain.includes("ditolak")
      );
    }

    // 2. User level verifikator (UPM / Evaluator / Fakultas)
    if (isVerifikatorUser) {
      if (activeTab === "menunggu") {
        return !isVerifierApproved && sMain !== "draft";
      }
      if (activeTab === "terima") {
        return isVerifierApproved;
      }
      if (activeTab === "tolak") {
        return sVerif === "ditolak" || sMain.includes("ditolak");
      }
      return (
        sMain === "diajukan" || sVerif === "diajukan" || !isVerifierApproved
      );
    }

    // 3. User level anggaran
    if (isAnggaranUser) {
      if (!isVerifierApproved || sMain === "draft") return false;
      if (activeTab === "menunggu") {
        return !isAnggaranApproved && sAngg !== "ditolak";
      }
      if (activeTab === "terima") {
        return isAnggaranApproved;
      }
      if (activeTab === "tolak") {
        return sAngg === "ditolak";
      }
      return true;
    }

    // 4. Admin
    if (isAdmin) {
      if (activeTab === "menunggu") {
        return !isVerifierApproved && sMain !== "draft";
      }
      if (activeTab === "terima") {
        return isVerifierApproved;
      }
      if (activeTab === "tolak") {
        return sVerif === "ditolak" || sMain.includes("ditolak");
      }
      return true;
    }

    return false;
  };

  const selectableRowsOnPage = useMemo(() => {
    return (currentPageRows || []).filter(isRowSelectable);
  }, [
    currentPageRows,
    isUnitUser,
    isVerifikatorUser,
    isAnggaranUser,
    isAdmin,
    activeTab,
  ]);

  const selectableUuidsOnPage = useMemo(() => {
    return selectableRowsOnPage.map((r) => r.UUID);
  }, [selectableRowsOnPage]);

  const isAllSelected =
    selectableUuidsOnPage.length > 0 &&
    selectableUuidsOnPage.every((id) => selectedUuids.includes(id));

  const isIndeterminate =
    !isAllSelected &&
    selectableUuidsOnPage.some((id) => selectedUuids.includes(id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedUuids((prev) =>
        prev.filter((id) => !selectableUuidsOnPage.includes(id)),
      );
    } else {
      setSelectedUuids((prev) =>
        Array.from(new Set([...prev, ...selectableUuidsOnPage])),
      );
    }
  };

  const handleToggleSelectRow = (uuid) => {
    setSelectedUuids((prev) =>
      prev.includes(uuid) ? prev.filter((id) => id !== uuid) : [...prev, uuid],
    );
  };

  // Handler: Batch Ajukan Program Kerja (Khusus user yang memiliki fakultas_unit)
  const handleBatchAjukan = async () => {
    if (selectedUuids.length === 0) return;
    if (isScheduleLocked) {
      addToast(
        "error",
        formatTanggalBulanTahun(jadwalStatus?.message) ||
          `Pengajuan program kerja tahun ${selectedTahun} saat ini belum dibuka atau telah ditutup.`,
      );
      return;
    }
    setIsBatchProcessing(true);
    let successCount = 0;
    let failCount = 0;

    await Promise.allSettled(
      selectedUuids.map(async (uuid) => {
        try {
          const fd = new FormData();
          fd.append("status", "diajukan");
          await apiClient.put(`/proker_v3/${uuid}/status`, fd);
          successCount++;
        } catch (err) {
          failCount++;
        }
      }),
    );

    if (successCount > 0) {
      addToast(
        "success",
        `Berhasil mengajukan ${successCount} program kerja${failCount > 0 ? ` (${failCount} gagal)` : ""}.`,
      );
    } else {
      addToast("error", "Gagal mengajukan program kerja yang dipilih.");
    }

    setSelectedUuids([]);
    setIsBatchProcessing(false);
    tableRef.current?.reload?.({ resetPage: false });
  };

  // Handler: Batch Terima Verifikator
  const handleBatchTerimaVerifikator = async () => {
    if (selectedUuids.length === 0) return;
    setIsBatchProcessing(true);
    let successCount = 0;
    let failCount = 0;

    await Promise.allSettled(
      selectedUuids.map(async (uuid) => {
        try {
          const fd = new FormData();
          fd.append("status", "terima_verifikator");
          await apiClient.put(`/proker_v3/${uuid}/status`, fd);
          successCount++;
        } catch (err) {
          failCount++;
        }
      }),
    );

    if (successCount > 0) {
      addToast(
        "success",
        `Berhasil menyetujui (Terima Verifikator) ${successCount} program kerja${failCount > 0 ? ` (${failCount} gagal)` : ""}.`,
      );
    } else {
      addToast("error", "Gagal memverifikasi program kerja yang dipilih.");
    }

    setSelectedUuids([]);
    setIsBatchProcessing(false);
    tableRef.current?.reload?.({ resetPage: false });
  };

  // Handler: Batch Terima Anggaran
  const handleBatchTerimaAnggaran = async () => {
    if (selectedUuids.length === 0) return;
    setIsBatchProcessing(true);
    let successCount = 0;
    let failCount = 0;

    await Promise.allSettled(
      selectedUuids.map(async (uuid) => {
        try {
          const fd = new FormData();
          fd.append("status", "terima_anggaran");
          await apiClient.put(`/proker_v3/${uuid}/status`, fd);
          successCount++;
        } catch (err) {
          failCount++;
        }
      }),
    );

    if (successCount > 0) {
      addToast(
        "success",
        `Berhasil menyetujui (Terima Anggaran) ${successCount} program kerja${failCount > 0 ? ` (${failCount} gagal)` : ""}.`,
      );
    } else {
      addToast(
        "error",
        "Gagal memverifikasi anggaran program kerja yang dipilih.",
      );
    }

    setSelectedUuids([]);
    setIsBatchProcessing(false);
    tableRef.current?.reload?.({ resetPage: false });
  };

  // Handler: Batch Submit Tolak (Verifikator & Anggaran)
  const handleBatchSubmitReject = async () => {
    if (!batchRejectReason.trim()) {
      addToast("error", "Alasan penolakan wajib diisi");
      return;
    }
    if (selectedUuids.length === 0) return;

    setIsSubmittingBatchReject(true);
    let successCount = 0;
    let failCount = 0;

    await Promise.allSettled(
      selectedUuids.map(async (uuid) => {
        try {
          const fd = new FormData();
          fd.append("status", "ditolak");
          fd.append("catatan_penolakan", batchRejectReason.trim());
          await apiClient.put(`/proker_v3/${uuid}/status`, fd);
          successCount++;
        } catch (err) {
          failCount++;
        }
      }),
    );

    if (successCount > 0) {
      addToast(
        "success",
        `Berhasil menolak ${successCount} program kerja${failCount > 0 ? ` (${failCount} gagal)` : ""}.`,
      );
    } else {
      addToast("error", "Gagal menolak program kerja yang dipilih.");
    }

    setBatchRejectModalOpen(false);
    setBatchRejectReason("");
    setSelectedUuids([]);
    setIsSubmittingBatchReject(false);
    tableRef.current?.reload?.({ resetPage: false });
  };

  // Handler: Batch Submit Revisi ke Draft (Verifikator & Anggaran)
  const handleBatchSubmitRevisiDraft = async () => {
    if (selectedUuids.length === 0) return;
    setIsSubmittingBatchRevisi(true);
    let successCount = 0;
    let failCount = 0;

    await Promise.allSettled(
      selectedUuids.map(async (uuid) => {
        try {
          const fd = new FormData();
          fd.append("status", "draft");
          if (batchRevisiReason.trim()) {
            fd.append("catatan_penolakan", batchRevisiReason.trim());
          }
          await apiClient.put(`/proker_v3/${uuid}/status`, fd);
          successCount++;
        } catch (err) {
          failCount++;
        }
      }),
    );

    if (successCount > 0) {
      addToast(
        "success",
        `Berhasil mengembalikan ${successCount} program kerja ke status Draft${failCount > 0 ? ` (${failCount} gagal)` : ""}.`,
      );
    } else {
      addToast("error", "Gagal mengembalikan program kerja ke status Draft.");
    }

    setBatchRevisiModalOpen(false);
    setBatchRevisiReason("");
    setSelectedUuids([]);
    setIsSubmittingBatchRevisi(false);
    tableRef.current?.reload?.({ resetPage: false });
  };

  const listColumns = [
    ...(canUseBatch
      ? [
          {
            key: "checkbox_select",
            label: (
              <div className="flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isIndeterminate;
                  }}
                  onChange={handleToggleSelectAll}
                  disabled={selectableUuidsOnPage.length === 0}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300 cursor-pointer disabled:opacity-40"
                  title="Pilih Semua Program Kerja di Halaman Ini"
                />
              </div>
            ),
            width: "44px",
            minWidth: "44px",
            className: "text-center !px-2",
            renderKey: (r) => {
              const selectable = isRowSelectable(r);
              if (!selectable) {
                return (
                  <div className="flex items-center justify-center">
                    <span className="text-gray-300 font-mono text-xs">-</span>
                  </div>
                );
              }
              const checked = selectedUuids.includes(r.UUID);
              return (
                <div
                  className="flex items-center justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggleSelectRow(r.UUID)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300 cursor-pointer"
                  />
                </div>
              );
            },
          },
        ]
      : []),
    {
      key: "no_proker",
      label: "No.",
      width: "50px",
      minWidth: "50px",
      renderKey: (r) => (
        <span className="font-mono font-bold text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
          {r.NoProker || 1}
        </span>
      ),
    },
    ...(!isUpm
      ? [
          {
            key: "aksi",
            label: "Aksi",
            width: "170px",
            minWidth: "170px",
            renderKey: (r) => {
              if (isUpm) return null;
              const sVerif = (r.StatusVerifikator || "").toLowerCase().trim();
              const sMain = (r.Status || "").toLowerCase().trim();
              const sAngg = (r.StatusAnggaran || "").toLowerCase().trim();

              const isVerifierApproved =
                sVerif === "terima_verifikator" ||
                sVerif === "disetujui" ||
                sVerif.includes("diverifikasi") ||
                sMain === "disetujui" ||
                sMain === "terima_anggaran" ||
                sMain === "terima anggaran" ||
                sMain.includes("diverifikasi");

              const isAnggaranApproved =
                sAngg === "terima_anggaran" ||
                sAngg === "disetujui" ||
                sMain === "terima_anggaran" ||
                sMain === "terima anggaran";

              // Button State History (Always present)
              const historyBtn = (
                <Tooltip title="Riwayat State & Validasi">
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryItem({ uuid: r.UUID, title: r.NamaProgram });
                      setHistoryDrawerOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-purple-600 bg-white hover:bg-purple-50 border border-purple-200 hover:border-purple-300 transition cursor-pointer shadow-2xs shrink-0 inline-flex items-center justify-center"
                    title="Riwayat State & Validasi"
                  >
                    <Clock className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
              );

              // 1. Role Anggaran / Keuangan:
              // TOMBOL "TERIMA ANGGARAN" DAN "TOLAK ANGGARAN" HANYA MUNCUL DI LEVEL ANGGARAN
              if (isAnggaran) {
                if (!isVerifierApproved || sMain === "draft") {
                  return (
                    <div className="flex items-center gap-1.5 flex-nowrap">
                      <span className="text-[11px] text-gray-400 italic font-medium whitespace-nowrap">
                        {sMain === "draft"
                          ? "Draf (Belum diajukan)"
                          : "Menunggu Verifikator Anggaran"}
                      </span>
                      {historyBtn}
                    </div>
                  );
                }

                if (isAnggaranApproved) {
                  return (
                    <div className="flex items-center gap-1.5 flex-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Diterima Anggaran</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenRevisiDraft(r)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-2xs transition cursor-pointer shrink-0 whitespace-nowrap"
                        title="Kembalikan Status Program Kerja ke Draft untuk Direvisi Pengaju"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Revisi ke Draft</span>
                      </button>
                      {historyBtn}
                    </div>
                  );
                }

                if (sAngg === "ditolak") {
                  return (
                    <div className="flex items-center gap-1.5 flex-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200 whitespace-nowrap">
                        <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>Ditolak Anggaran</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenRevisiDraft(r)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-2xs transition cursor-pointer shrink-0 whitespace-nowrap"
                        title="Kembalikan Status Program Kerja ke Draft untuk Direvisi Pengaju"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Revisi ke Draft</span>
                      </button>
                      {historyBtn}
                    </div>
                  );
                }

                // Verifier sudah approve, anggaran belum verifikasi:
                return (
                  <div className="flex items-center gap-1.5 flex-nowrap">
                    <button
                      type="button"
                      onClick={() => handleVerifyAnggaran(r)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition cursor-pointer shrink-0 whitespace-nowrap"
                      title="Verifikasi & Terima Anggaran Program Kerja"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Terima Anggaran</span>
                    </button>
                    {/* Tombol Tolak Anggaran di-hide sesuai request (kode di-komentar & tidak dieksekusi)
                    <button
                      type="button"
                      onClick={() => handleOpenRejectModal(r)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs transition cursor-pointer shrink-0 whitespace-nowrap"
                      title="Tolak Program Kerja ini"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Tolak Anggaran</span>
                    </button>
                    */}
                    {historyBtn}
                  </div>
                );
              }

              // 2. Role Verifier (upml, upmf, upms, fakultas, evaluator) & Admin:
              // TOMBOL "TERIMA VERIFIKATOR" DAN "TOLAK VERIFIKATOR" HANYA MUNCUL DI LEVEL VERIFIKATOR / ADMIN
              if (isVerifier || isAdmin) {
                if (isVerifierApproved) {
                  return (
                    <div className="flex items-center gap-1.5 flex-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Diterima Verifikator</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenRevisiDraft(r)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-2xs transition cursor-pointer shrink-0 whitespace-nowrap"
                        title="Kembalikan Status Program Kerja ke Draft untuk Direvisi Pengaju"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Revisi ke Draft</span>
                      </button>
                      {historyBtn}
                    </div>
                  );
                }

                if (sVerif === "ditolak") {
                  return (
                    <div className="flex items-center gap-1.5 flex-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200 whitespace-nowrap">
                        <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>Ditolak Verifikator</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenRevisiDraft(r)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-2xs transition cursor-pointer shrink-0 whitespace-nowrap"
                        title="Kembalikan Status Program Kerja ke Draft untuk Direvisi Pengaju"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Revisi ke Draft</span>
                      </button>
                      {historyBtn}
                    </div>
                  );
                }

                // HANYA MUNCUL JIKA STATUS DIAJUKAN (bukan draft!)
                if (
                  (sMain === "diajukan" || sVerif === "diajukan") &&
                  sMain !== "draft"
                ) {
                  return (
                    <div className="flex items-center gap-1.5 flex-nowrap">
                      <button
                        type="button"
                        onClick={() => handleVerifyVerifikator(r)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition cursor-pointer shrink-0 whitespace-nowrap"
                        title="Terima Verifikator Program Kerja"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Terima Verifikator</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenRejectModal(r)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs transition cursor-pointer shrink-0 whitespace-nowrap"
                        title="Tolak Verifikator Program Kerja"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Tolak Verifikator</span>
                      </button>
                      {historyBtn}
                    </div>
                  );
                }

                // Jika masih draft / belum diajukan
                return (
                  <div className="flex items-center gap-1.5 flex-nowrap">
                    <span className="text-[11px] text-gray-400 italic font-medium whitespace-nowrap">
                      Draf (Belum diajukan)
                    </span>
                    {historyBtn}
                  </div>
                );
              }

              // 3. Level Pengelola Target Unit (User)
              const userCanManage = canManageProker(r);

              return (
                <div className="flex items-center gap-1.5 flex-nowrap">
                  {/* Tombol Ajukan, Edit, Hapus HANYA muncul di level user yg memiliki target fakultas_unit */}
                  {userCanManage &&
                    (sMain === "draft" || sMain === "ditolak") && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(r, "diajukan")}
                          disabled={isScheduleLocked}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-2xs transition shrink-0 whitespace-nowrap ${
                            isScheduleLocked
                              ? "bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed shadow-none"
                              : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                          }`}
                          title={
                            isScheduleLocked
                              ? jadwalStatus?.message || "Pengajuan ditutup sesuai jadwal"
                              : "Ajukan program kerja ke pimpinan/verifikator"
                          }
                        >
                          <Send className="w-3 h-3" />
                          <span>Ajukan</span>
                        </button>
                        <Tooltip title="Edit Program Kerja">
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className="p-1.5 rounded-lg text-amber-600 bg-white hover:bg-amber-50 border border-amber-200 hover:border-amber-300 transition cursor-pointer shadow-2xs shrink-0 inline-flex items-center justify-center"
                            title="Edit Program Kerja"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                        <Tooltip title="Hapus Program Kerja">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRow(r);
                              setConfirmDelete(true);
                            }}
                            className="p-1.5 rounded-lg text-rose-600 bg-white hover:bg-rose-50 border border-rose-200 hover:border-rose-300 transition cursor-pointer shadow-2xs shrink-0 inline-flex items-center justify-center"
                            title="Hapus Program Kerja"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                      </>
                    )}

                  {/* Level User: Batal Pengajuan (kembalikan ke Draft) */}
                  {userCanManage && sMain === "diajukan" && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(r, "draft")}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 transition cursor-pointer shrink-0 whitespace-nowrap"
                      title="Batalkan pengajuan dan kembalikan ke Draf"
                    >
                      <RotateCcw className="w-3 h-3 text-gray-500" />
                      <span>Batal</span>
                    </button>
                  )}

                  {historyBtn}
                </div>
              );
            },
          },
        ]
      : []),
    {
      key: "Tahun",
      label: "Tahun",
      width: "65px",
      minWidth: "65px",
      renderKey: (r) => (
        <span className="font-semibold text-xs text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded font-mono">
          {r.Tahun || "2026"}
        </span>
      ),
    },
    {
      key: "aktivitas_dokumen",
      label: "Aktivitas & Dokumen",
      minWidth: "155px",
      renderKey: (r) => {
        const sAngg = (r.StatusAnggaran || "").toLowerCase().trim();
        const sMain = (r.Status || "").toLowerCase().trim();
        const isDiterimaAnggaran =
          sAngg === "terima_anggaran" ||
          sAngg === "disetujui" ||
          sMain === "terima_anggaran" ||
          sMain === "terima anggaran";

        return (
          <div className="flex flex-col gap-1.5 w-full">
            <button
              type="button"
              onClick={() => openAktivitas(r)}
              className="inline-flex items-center justify-between gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/90 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition cursor-pointer group shadow-2xs whitespace-nowrap w-full"
              title="Klik untuk membuka kelola aktivitas program kerja"
            >
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
                <Layers className="w-3.5 h-3.5 text-purple-600 group-hover:text-white shrink-0" />
                <span>
                  <b className="font-bold">{r.TotalAktivitas || 0}</b> Aktivitas
                </span>
              </span>
              <span className="text-[10px] bg-purple-200/90 text-purple-900 group-hover:bg-white group-hover:text-purple-700 px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap shrink-0 transition-colors">
                Kelola →
              </span>
            </button>
            {isDiterimaAnggaran && (
              <button
                type="button"
                onClick={() => openDokumen(r)}
                className="inline-flex items-center justify-between gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/90 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition cursor-pointer group shadow-2xs whitespace-nowrap w-full"
                title="Klik untuk membuka kelola dokumen program kerja"
              >
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
                  <FileText className="w-3.5 h-3.5 text-indigo-600 group-hover:text-white shrink-0" />
                  <span>
                    <b className="font-bold">{r.TotalDokumen || 0}</b> Dokumen
                  </span>
                </span>
                <span className="text-[10px] bg-indigo-200/90 text-indigo-900 group-hover:bg-white group-hover:text-indigo-700 px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap shrink-0 transition-colors">
                  Unggah →
                </span>
              </button>
            )}
          </div>
        );
      },
    },
    {
      key: "status_verifikasi",
      label: "Status Verifikasi",
      width: "220px",
      minWidth: "200px",
      renderKey: (r) => {
        const sVerif = (r.StatusVerifikator || "").toLowerCase().trim();
        const sMain = (r.Status || "").toLowerCase().trim();
        const sAngg = (r.StatusAnggaran || "").toLowerCase().trim();
        const isProdi =
          (r.TypeFakultasUnit || "").toLowerCase() === "prodi" ||
          (r.NamaFakultasUnit || "").toLowerCase().includes("prodi");

        // Catatan penolakan verifikator (UPM)
        let catatanVerif = (
          r.CatatanVerifikator ||
          r.catatan_verifikator ||
          ""
        ).trim();
        if (
          !catatanVerif &&
          (sVerif === "ditolak" ||
            (sMain.includes("ditolak") && !sAngg.includes("ditolak")))
        ) {
          catatanVerif = (
            r.CatatanPenolakan ||
            r.catatan_penolakan ||
            ""
          ).trim();
        }

        // Catatan penolakan tim anggaran
        let catatanAngg = (
          r.CatatanAnggaran ||
          r.catatan_anggaran ||
          ""
        ).trim();
        if (!catatanAngg && sAngg === "ditolak") {
          catatanAngg = (
            r.CatatanPenolakan ||
            r.catatan_penolakan ||
            ""
          ).trim();
        }

        const historyBtnInline = (
          <Tooltip title="Riwayat State & Validasi">
            <button
              type="button"
              onClick={() => {
                setHistoryItem({ uuid: r.UUID, title: r.NamaProgram });
                setHistoryDrawerOpen(true);
              }}
              className="p-1 rounded-md text-purple-600 bg-white hover:bg-purple-50 border border-purple-200 hover:border-purple-300 transition cursor-pointer shadow-2xs shrink-0 inline-flex items-center justify-center"
              title="Riwayat State & Validasi"
            >
              <Clock className="w-3 h-3" />
            </button>
          </Tooltip>
        );

        let badgeUpm = null;
        if (
          sVerif === "terima_verifikator" ||
          sVerif === "disetujui" ||
          sMain === "disetujui" ||
          sMain === "terima_anggaran" ||
          sMain === "terima anggaran"
        ) {
          badgeUpm = (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-300 bg-emerald-50 text-emerald-800 uppercase tracking-wider">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>DITERIMA UPM</span>
            </span>
          );
        } else if (
          sVerif === "diverifikasi_upmf" ||
          sMain === "diverifikasi_upmf"
        ) {
          badgeUpm = (
            <div className="flex flex-col gap-0.5 items-start">
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border border-indigo-300 bg-indigo-50 text-indigo-800 uppercase tracking-wider">
                VERIFIKASI UPMF
              </span>
              <span className="text-[9px] text-gray-500 font-medium">
                Menunggu UPMS
              </span>
            </div>
          );
        } else if (
          sVerif === "diverifikasi_upml" ||
          sMain === "diverifikasi_upml"
        ) {
          badgeUpm = (
            <div className="flex flex-col gap-0.5 items-start">
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border border-cyan-300 bg-cyan-50 text-cyan-800 uppercase tracking-wider">
                VERIFIKASI UPML
              </span>
              <span className="text-[9px] text-gray-500 font-medium">
                {isProdi ? "Menunggu UPMF" : "Menunggu UPMS"}
              </span>
            </div>
          );
        } else if (
          sVerif === "ditolak" ||
          (sMain.includes("ditolak") &&
            (catatanVerif || !sAngg.includes("ditolak")))
        ) {
          badgeUpm = (
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border border-rose-300 bg-rose-50 text-rose-800 uppercase tracking-wider">
              DITOLAK EVALUATOR
            </span>
          );
        } else if (sVerif === "diajukan" || sMain === "diajukan") {
          badgeUpm = (
            <div className="flex flex-col gap-0.5 items-start">
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border border-blue-300 bg-blue-50 text-blue-800 uppercase tracking-wider">
                DIAJUKAN EVALUATOR
              </span>
              <span className="text-[9px] text-gray-500 font-medium">
                Menunggu UPML
              </span>
            </div>
          );
        } else {
          badgeUpm = (
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border border-gray-200 bg-gray-100 text-gray-600 uppercase tracking-wider">
              DRAF EVALUATOR
            </span>
          );
        }

        const isVerifierApproved =
          sVerif === "terima_verifikator" ||
          sVerif === "disetujui" ||
          sVerif.includes("diverifikasi") ||
          sMain === "disetujui" ||
          sMain === "terima_anggaran" ||
          sMain === "terima anggaran" ||
          sMain.includes("diverifikasi");

        let badgeAnggaran = null;
        if (
          sAngg === "terima_anggaran" ||
          sAngg === "disetujui" ||
          sMain === "terima_anggaran" ||
          sMain === "terima anggaran"
        ) {
          badgeAnggaran = (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-300 bg-emerald-50 text-emerald-800 uppercase tracking-wider">
              <DollarSign className="w-3 h-3 text-emerald-600" />
              <span>TERIMA ANGGARAN</span>
            </span>
          );
        } else if (
          sAngg === "ditolak" ||
          (sMain.includes("ditolak") && catatanAngg)
        ) {
          badgeAnggaran = (
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border border-rose-300 bg-rose-50 text-rose-800 uppercase tracking-wider">
              DITOLAK ANGGARAN
            </span>
          );
        } else if (sAngg === "menunggu_anggaran" || isVerifierApproved) {
          badgeAnggaran = (
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-300 bg-amber-50 text-amber-800 uppercase tracking-wider">
              MENUNGGU ANGGARAN
            </span>
          );
        } else {
          badgeAnggaran = (
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider">
              MENUNGGU VERIFIKATOR
            </span>
          );
        }

        const isUpmRejected =
          sVerif === "ditolak" ||
          (sMain.includes("ditolak") &&
            (catatanVerif || !sAngg.includes("ditolak")));
        const isAnggaranRejected =
          sAngg === "ditolak" ||
          (sMain.includes("ditolak") && Boolean(catatanAngg));

        return (
          <div className="flex flex-col gap-2 items-start w-full">
            <div className="flex flex-col gap-1 items-start w-full">
              <div className="flex items-center gap-1.5 flex-nowrap">
                {badgeUpm}
                {isUpm && historyBtnInline}
              </div>
              {isUpmRejected && catatanVerif && (
                <div
                  className="flex items-start gap-1.5 p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-[10px] leading-tight w-full max-w-[220px] shadow-2xs"
                  title={`Catatan Penolakan UPM: ${catatanVerif}`}
                >
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-bold text-rose-700 text-[9px] uppercase tracking-wider">
                      Catatan UPM:
                    </span>
                    <span className="italic line-clamp-3 break-words">
                      "{catatanVerif}"
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1 items-start w-full">
              {badgeAnggaran}
              {isAnggaranRejected && catatanAngg && (
                <div
                  className="flex items-start gap-1.5 p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-[10px] leading-tight w-full max-w-[220px] shadow-2xs"
                  title={`Catatan Penolakan Anggaran: ${catatanAngg}`}
                >
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-bold text-rose-700 text-[9px] uppercase tracking-wider">
                      Catatan Anggaran:
                    </span>
                    <span className="italic line-clamp-3 break-words">
                      "{catatanAngg}"
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "anggaran",
      label: "Anggaran Program",
      minWidth: "135px",
      renderKey: (r) => {
        if (isVerifikatorRoleOrLevel) {
          return (
            <div className="text-xs font-mono bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-200 text-center">
              <span className="font-bold text-gray-400 tracking-widest">***</span>
            </div>
          );
        }
        const totalAng = Number(r.TotalAnggaran || r.Anggaran || 0);
        const totalReal = Number(r.TotalRealisasi);
        const hasRealDiff = Boolean(
          r.HasRealisasi &&
          r.TotalRealisasi !== undefined &&
          r.TotalRealisasi !== null &&
          totalAng !== totalReal,
        );
        return (
          <div className="text-xs font-mono bg-emerald-50/60 px-2 py-1.5 rounded-lg border border-emerald-100 text-right whitespace-nowrap">
            {hasRealDiff ? (
              <div>
                <span
                  className="line-through text-gray-400 text-[11px] block font-normal decoration-rose-500 decoration-1"
                  title="Total Anggaran Awal"
                >
                  {formatRupiah(totalAng)}
                </span>
                <span
                  className="font-bold text-emerald-700 text-xs block"
                  title="Total Realisasi Anggaran Baru"
                >
                  {formatRupiah(totalReal)}
                </span>
              </div>
            ) : (
              <span className="font-bold text-emerald-700">
                {formatRupiah(
                  r.HasRealisasi &&
                    r.TotalRealisasi !== undefined &&
                    r.TotalRealisasi !== null
                    ? totalReal
                    : totalAng,
                )}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "fakultas_unit",
      label: "Target",
      minWidth: "140px",
      searchable: true,
      renderKey: (r) => {
        const type = (r.TypeFakultasUnit || "").toLowerCase();
        const isFak = type === "fakultas" || type === "sekolah";
        const isProdi = type === "prodi";
        const cleanName = cleanDuplicateJenjang(r.NamaFakultasUnit || "");
        const formatted = isProdi
          ? formatProdiWithJenjang(cleanName, r.JenjangFakultasUnit)
          : cleanName;
        const displayUnit = formatted || "-";
        return (
          <div className="space-y-1">
            <div
              className="font-semibold text-xs text-gray-800 line-clamp-2 leading-tight"
              title={displayUnit}
            >
              {displayUnit}
            </div>
            {displayUnit !== "-" && (
              <span
                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                  isFak
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                    : isProdi
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                {isFak ? "Fakultas" : isProdi ? "Prodi" : "Unit / Lembaga"}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "nama_program",
      label: "Program Kerja",
      minWidth: "180px",
      searchable: true,
      renderKey: (r) => (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => openAktivitas(r)}
            className="text-xs font-bold text-gray-900 hover:text-purple-600 text-left line-clamp-2 transition cursor-pointer"
          >
            {r.NamaProgram}
          </button>
          <div className="text-[11px] text-gray-500 line-clamp-1">
            PIC:{" "}
            <span className="font-medium text-gray-700">{r.PIC || "-"}</span>
          </div>
        </div>
      ),
    },
    {
      key: "standar_sub_standar",
      label: "Standar & Indikator",
      minWidth: "160px",
      renderKey: (r) => (
        <div className="text-xs space-y-1">
          <div
            className="font-medium text-gray-800 line-clamp-2"
            title={r.StandarSubStandar}
          >
            {r.StandarSubStandar || "-"}
          </div>
          <div
            className="text-[11px] text-gray-500 line-clamp-1 italic"
            title={r.IndikatorKinerja}
          >
            {r.IndikatorKinerja || ""}
          </div>
        </div>
      ),
    },
    {
      key: "target_capaian",
      label: "Target",
      minWidth: "150px",
      searchable: true,
      renderKey: (r) => (
        <div className="text-xs space-y-1">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[11px] text-gray-500 whitespace-nowrap">
              Unpak:
            </span>
            <span className="font-bold text-gray-900 text-right leading-tight">
              {r.TargetUnpak || "-"}
            </span>
          </div>
          <div className="flex items-start justify-between gap-2">
            <span className="text-[11px] text-purple-700 font-medium whitespace-nowrap">
              Unit:
            </span>
            <span className="font-semibold text-purple-900 text-right leading-tight">
              {r.TargetUnit || "-"}
            </span>
          </div>
          <div className="flex items-start justify-between gap-2 pt-1 border-t border-gray-100">
            <span className="text-[10px] text-gray-400 italic whitespace-nowrap">
              Lalu:
            </span>
            <span className="text-[11px] text-gray-600 text-right leading-tight">
              {r.CapaianUnitLalu || "-"}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "output",
      label: "Output",
      minWidth: "130px",
      searchable: true,
      renderKey: (r) => (
        <div
          className="text-xs text-gray-800 line-clamp-2 leading-relaxed"
          title={r.Output || "-"}
        >
          {r.Output || "-"}
        </div>
      ),
    },
    {
      key: "outcome",
      label: "Outcome",
      minWidth: "130px",
      searchable: true,
      renderKey: (r) => (
        <div
          className="text-xs text-gray-800 line-clamp-2 leading-relaxed"
          title={r.Outcome || "-"}
        >
          {r.Outcome || "-"}
        </div>
      ),
    },
  ];

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

      <div className="p-4 sm:p-6 bg-gray-50 min-h-screen space-y-4">
        {/* Page Header */}
        <PageHeader
          icon={FileSpreadsheet}
          title="Program Kerja (V3)"
          subtitle="Manajemen Matriks Program Kerja, Jadwal RK & Realisasi R, Anggaran Program & Dokumen Referensi (Tahun 2026/2027)"
          actions={
            canAddProker ? (
              <button
                type="button"
                onClick={openCreate}
                disabled={isScheduleLocked}
                className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition ${
                  isScheduleLocked
                    ? "bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed shadow-none"
                    : "bg-purple-600 hover:bg-purple-700 text-white shadow-xs cursor-pointer"
                }`}
                title={
                  isScheduleLocked
                    ? jadwalStatus?.message || "Penambahan program kerja ditutup sesuai jadwal"
                    : "Tambah Program Kerja"
                }
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Program Kerja</span>
              </button>
            ) : null
          }
        />

        {/* Status Role & Scoping Notification Banner */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              {curRole === "upms" ? (
                <School className="w-5 h-5 text-amber-600" />
              ) : curRole === "upmf" ? (
                <GraduationCap className="w-5 h-5 text-indigo-600" />
              ) : curRole === "upml" ? (
                <Building className="w-5 h-5 text-emerald-600" />
              ) : (
                <Building2 className="w-5 h-5 text-purple-600" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider text-gray-500">
                  Lingkup Akses:
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                    curRole === "upms"
                      ? "bg-amber-100 text-amber-900 border border-amber-200"
                      : curRole === "upmf"
                        ? "bg-indigo-100 text-indigo-900 border border-indigo-200"
                        : curRole === "upml"
                          ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                          : curRole === "evaluator"
                            ? "bg-purple-100 text-purple-900 border border-purple-200"
                            : isAnggaran
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                              : isAdmin
                                ? "bg-purple-100 text-purple-900 border border-purple-200"
                                : curRole === "user"
                                  ? "bg-purple-100 text-purple-900 border border-purple-200"
                                  : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {curRole === "upms"
                    ? "UPMS (Unit Penjaminan Mutu Sekolah)"
                    : curRole === "upmf"
                      ? `UPMF (${selectedUnitObj?.nama || "Fakultas"})`
                      : curRole === "upml"
                        ? `UPML (${selectedUnitObj?.nama || "Unit Penugasan"})`
                        : curRole === "evaluator"
                          ? "Evaluator / Verifikator"
                          : isAnggaran
                            ? "Tim Anggaran & Keuangan"
                            : isAdmin
                              ? "Admin (Semua Unit)"
                              : curRole === "user"
                                ? userTargetName
                                  ? `User (${userTargetName})`
                                  : "User"
                                : "Auditee Unit Terbatas"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-700 font-medium mt-0.5">
                {isUpm
                  ? curRole === "upms"
                    ? "Menampilkan seluruh data matriks program kerja universitas / sekolah."
                    : curRole === "upmf"
                      ? `Menampilkan data program kerja ${selectedUnitObj?.nama || "Fakultas"} dan seluruh program studi di bawahnya.`
                      : `Menampilkan data program kerja unit penugasan (${selectedUnitObj?.nama || "Unit Terpilih"}).`
                  : curRole === "evaluator" || curRole === "fakultas"
                    ? "Lingkup verifikasi program kerja. Anda dapat menyetujui (Terima Verifikator) atau menolak (Tolak Verifikator) program kerja yang diajukan."
                    : isAnggaran
                      ? "Verifikasi dan persetujuan alokasi anggaran program kerja seluruh unit/fakultas setelah diverifikasi oleh verifikator UPM."
                      : isAdmin
                        ? "Menampilkan seluruh data matriks proker universitas. Anda dapat memfilter unit dan mengubah status menjadi Disetujui/Selesai."
                        : curRole === "user"
                          ? userTargetName
                            ? `Tabel secara otomatis menampilkan data khusus unit Anda (${userTargetName}). Status proker dapat diajukan (Draf / Diajukan) melalui tombol di tabel.`
                            : "Menampilkan data program kerja untuk pengguna. Status proker dapat diajukan (Draf / Diajukan) melalui tombol di tabel."
                          : userTargetName
                            ? `Tabel secara otomatis menampilkan data khusus unit Anda (${userTargetName}). Status proker dapat diajukan (Draf / Diajukan) melalui tombol di tabel.`
                            : "Menampilkan data program kerja untuk unit kerja Anda. Status proker dapat diajukan (Draf / Diajukan) melalui tombol di tabel."}
              </p>
            </div>
          </div>

          {/* Filter Controls Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Tahun */}
            <div className="w-36 min-w-[120px]">
              <SearchSelect
                options={tahunOptions}
                value={selectedTahunObj}
                onChange={(val) => {
                  setSelectedTahunObj(val);
                  setSelectedTahun(val ? String(val.tahun || val.name) : "all");
                }}
                placeholder="Semua Tahun"
                icon={Calendar}
              />
            </div>

            {/* Filter Unit / Fakultas (Only for verifier, admin, anggaran, & upm) */}
            {(isVerifier || isAdmin || isAnggaran || isUpm) &&
              unitFilterOptions.length > 0 && (
                <div className="w-56 min-w-[170px]">
                  <SearchSelect
                    options={unitFilterOptions}
                    value={selectedUnitObj}
                    onChange={handleSelectUnit}
                    placeholder={
                      curRole === "upml"
                        ? "Pilih Unit Penugasan"
                        : curRole === "upmf"
                          ? "Pilih Fakultas"
                          : "Semua Unit / Fakultas"
                    }
                    icon={Building2}
                  />
                </div>
              )}

            {/* Filter Prodi (Hanya ditampilkan jika dropdown unit/fakultas memilih item bertipe fakultas) */}
            {(isVerifier || isAdmin || isAnggaran || isUpm) &&
              curRole !== "upml" &&
              isFakultasSelected && (
                <div className="w-56 min-w-[170px]">
                  <SearchSelect
                    options={prodiOptionsForFilter}
                    value={selectedProdiObj}
                    onChange={handleSelectProdi}
                    placeholder="Semua Program Studi"
                    icon={GraduationCap}
                  />
                </div>
              )}
          </div>
        </div>

        {/* Tab Verifikasi & Persetujuan (Khusus Role Anggaran, Verifikator, UPM, & Admin) */}
        {(isVerifier || isAnggaran || isUpm || isAdmin) && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 sm:px-5 sm:py-3.5 rounded-2xl border border-gray-200 shadow-xs">
            {/* Segmented Tab Controls */}
            <div className="inline-flex p-1 bg-gray-100/90 rounded-xl border border-gray-200/80 gap-1 shrink-0 self-start sm:self-auto">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleTabChange("semua")}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "semua"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-gray-600 hover:text-purple-700 hover:bg-purple-50"
                  }`}
                >
                  <Layers
                    className={`w-3.5 h-3.5 ${activeTab === "semua" ? "text-white" : "text-purple-600"}`}
                  />
                  <span>Semua Data</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleTabChange("menunggu")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "menunggu"
                    ? isAdmin
                      ? "bg-amber-500 text-white shadow-xs"
                      : "bg-white text-purple-700 shadow-xs border border-gray-200/80"
                    : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                }`}
              >
                <Clock
                  className={`w-3.5 h-3.5 ${
                    activeTab === "menunggu"
                      ? isAdmin
                        ? "text-white"
                        : "text-purple-600"
                      : "text-gray-400"
                  }`}
                />
                <span>Menunggu</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("terima")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "terima"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-gray-600 hover:text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${activeTab === "terima" ? "text-white" : "text-emerald-600"}`}
                />
                <span>Terima</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("tolak")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "tolak"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-gray-600 hover:text-rose-700 hover:bg-rose-50"
                }`}
              >
                <XCircle
                  className={`w-3.5 h-3.5 ${activeTab === "tolak" ? "text-white" : "text-rose-600"}`}
                />
                <span>Tolak</span>
              </button>
            </div>

            {/* Context Badge Description */}
            <div className="text-xs text-gray-500 font-medium flex items-center gap-1.5 flex-wrap">
              <span>Menampilkan:</span>
              <span
                className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                  activeTab === "semua"
                    ? "bg-purple-50 text-purple-700 border border-purple-200"
                    : activeTab === "menunggu"
                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                      : activeTab === "terima"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                {activeTab === "semua"
                  ? "Semua Program Kerja (Semua Status)"
                  : activeTab === "menunggu"
                    ? isAnggaran
                      ? "Menunggu Persetujuan Anggaran"
                      : isAdmin
                        ? "Menunggu Verifikasi"
                        : "Menunggu Verifikasi UPM"
                    : activeTab === "terima"
                      ? isAnggaran
                        ? "Diterima Anggaran"
                        : isAdmin
                          ? "Diterima / Disetujui"
                          : "Diterima Verifikator"
                      : isAnggaran
                        ? "Ditolak Anggaran"
                        : isAdmin
                          ? "Ditolak"
                          : "Ditolak Verifikator"}
              </span>
            </div>
          </div>
        )}

        {/* Jadwal Pengajuan Program Kerja Status Alert */}
        {jadwalStatus?.has_schedule && (
          <div
            className={`p-3.5 sm:px-4 sm:py-3 rounded-2xl border flex items-center justify-between gap-3 text-xs sm:text-sm font-medium ${
              jadwalStatus.is_open
                ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                : "bg-rose-50/80 border-rose-200 text-rose-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {jadwalStatus.is_open ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>
                <strong>Jadwal Pengajuan Proker {jadwalStatus.tahun}:</strong>{" "}
                {formatTanggalBulanTahun(jadwalStatus.message)}
              </span>
            </div>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 border ${
                jadwalStatus.is_open
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : "bg-rose-100 text-rose-800 border-rose-300"
              }`}
            >
              {jadwalStatus.status_label || (jadwalStatus.is_open ? "Sedang Dibuka" : "Ditutup")}
            </span>
          </div>
        )}

        {/* Remote Table Program Kerja */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          {/* BATCH ACTION BANNER */}
          {selectedUuids.length > 0 && (
            <div className="bg-linear-to-r from-purple-50 via-indigo-50 to-blue-50 border-b border-purple-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse" />
                <span className="text-xs font-bold text-gray-800">
                  <span className="text-purple-700 font-extrabold">
                    {selectedUuids.length}
                  </span>{" "}
                  program kerja dipilih
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedUuids([])}
                  className="text-[11px] text-gray-500 hover:text-gray-800 underline ml-2 cursor-pointer"
                >
                  Batalkan pilihan
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* 1. Khusus user yang memiliki fakultas_unit: Tombol Ajukan */}
                {isUnitUser && (
                  <button
                    type="button"
                    onClick={handleBatchAjukan}
                    disabled={isBatchProcessing || isScheduleLocked}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
                      isScheduleLocked
                        ? "bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed shadow-none"
                        : "bg-blue-600 hover:bg-blue-700 text-white hover:shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    }`}
                    title={
                      isScheduleLocked
                        ? jadwalStatus?.message || "Pengajuan ditutup sesuai jadwal"
                        : "Ajukan semua program kerja terpilih ke verifikator"
                    }
                  >
                    {isBatchProcessing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Ajukan Terpilih ({selectedUuids.length})</span>
                  </button>
                )}

                {/* 2. User level verifikator (UPM / Evaluator / Fakultas) & Admin: Tombol Terima & Tolak Verifikator */}
                {(isVerifikatorUser || isAdmin) &&
                  activeTab !== "terima" &&
                  activeTab !== "tolak" && (
                  <>
                    <button
                      type="button"
                      onClick={handleBatchTerimaVerifikator}
                      disabled={isBatchProcessing}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow transition cursor-pointer disabled:opacity-50"
                      title="Verifikasi dan terima seluruh program kerja terpilih"
                    >
                      {isBatchProcessing ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Terima Verifikator ({selectedUuids.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBatchRejectReason("");
                        setBatchRejectModalOpen(true);
                      }}
                      disabled={isBatchProcessing}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs hover:shadow transition cursor-pointer disabled:opacity-50"
                      title="Tolak seluruh program kerja terpilih dengan catatan"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Tolak Verifikator ({selectedUuids.length})</span>
                    </button>
                  </>
                )}

                {/* 3. User level anggaran: Tombol Terima & Tolak Anggaran */}
                {isAnggaranUser && (
                  <>
                    <button
                      type="button"
                      onClick={handleBatchTerimaAnggaran}
                      disabled={isBatchProcessing}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow transition cursor-pointer disabled:opacity-50"
                      title="Verifikasi dan terima anggaran seluruh program kerja terpilih"
                    >
                      {isBatchProcessing ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Terima Anggaran ({selectedUuids.length})</span>
                    </button>
                    {/* Tombol Tolak Anggaran (Batch) di-hide sesuai request (kode di-komentar & tidak dieksekusi)
                    <button
                      type="button"
                      onClick={() => {
                        setBatchRejectReason("");
                        setBatchRejectModalOpen(true);
                      }}
                      disabled={isBatchProcessing}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs hover:shadow transition cursor-pointer disabled:opacity-50"
                      title="Tolak anggaran seluruh program kerja terpilih dengan catatan"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Tolak Anggaran ({selectedUuids.length})</span>
                    </button>
                    */}
                  </>
                )}

                {/* Revisi ke Draft jika verifikator / anggaran di tab terima atau tolak */}
                {(isVerifikatorUser || isAnggaranUser || isAdmin) &&
                  (activeTab === "terima" || activeTab === "tolak") && (
                    <button
                      type="button"
                      onClick={() => {
                        setBatchRevisiReason("");
                        setBatchRevisiModalOpen(true);
                      }}
                      disabled={isBatchProcessing}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs hover:shadow transition cursor-pointer disabled:opacity-50"
                      title="Kembalikan semua program kerja terpilih ke status Draft"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Revisi ke Draft ({selectedUuids.length})</span>
                    </button>
                  )}
              </div>
            </div>
          )}

          <RemoteTable
            ref={tableRef}
            endpoint={tableEndpoint}
            mode="paging"
            token={getValidToken()}
            listcolumns={listColumns}
            onDataLoaded={(rows) => setCurrentPageRows(rows || [])}
            disableGlobalSearch={false}
            searchable={true}
            searchPlaceholder="Cari nama program kerja, PIC..."
            emptyMessage={
              activeTab === "menunggu"
                ? "Tidak ada program kerja yang sedang menunggu verifikasi."
                : activeTab === "terima"
                  ? "Belum ada program kerja yang berstatus diterima."
                  : activeTab === "tolak"
                    ? "Tidak ada program kerja yang berstatus ditolak."
                    : "Belum ada program kerja yang tercatat untuk filter ini."
            }
          />
        </div>
      </div>

      {/* Modal Form Matriks Proker */}
      <ProkerV3FormModal
        open={formModalOpen}
        mode={formModalMode}
        initialData={selectedRow}
        unitOptions={unitOptions}
        tahunOptions={tahunOptions}
        standarOptions={standarOptions}
        indikatorOptions={indikatorOptions}
        defaultYear={positionYear}
        defaultUnit={userUnitData || user?.fakultas_unit || user?.FakultasUnit}
        onClose={() => setFormModalOpen(false)}
        onSuccess={() => tableRef.current?.reload?.({ resetPage: false })}
      />

      {/* Modal Aktivitas, Anggaran & Upload Dokumen Referensi */}
      <ProkerV3AktivitasModal
        open={aktivitasModalOpen}
        prokerUuid={selectedProkerUuid}
        onClose={() => setAktivitasModalOpen(false)}
        onRefreshParent={() => tableRef.current?.reload?.({ resetPage: false })}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        open={confirmDelete}
        title="Hapus Program Kerja"
        message={`Apakah Anda yakin ingin menghapus program kerja "${selectedRow?.NamaProgram}" beserta seluruh aktivitas dan dokumen terkait?`}
        onClose={() => setConfirmDelete(false)}
        onConfirm={deleteData}
      />

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

      {/* Rejection Note Modal */}
      <Transition appear show={rejectModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setRejectModalOpen(false)}
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
                  <AlertCircle className="w-5 h-5" />
                  <span>Alasan Penolakan Program Kerja</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-600">
                  Silakan berikan catatan atau alasan penolakan untuk program
                  kerja:
                </p>
                <div className="text-xs font-bold text-gray-900 bg-gray-50 border border-gray-200 p-2.5 rounded-lg line-clamp-2">
                  {rejectingRow?.NamaProgram}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  Catatan / Alasan Penolakan{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={alasanPenolakan}
                  onChange={(e) => setAlasanPenolakan(e.target.value)}
                  placeholder="Tuliskan catatan perbaikan atau alasan mengapa program kerja ini ditolak..."
                  className="w-full p-3 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmittingReject || !alasanPenolakan.trim()}
                  onClick={handleSubmitRejectProker}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
                >
                  {isSubmittingReject ? "Menyimpan..." : "Tolak Program Kerja"}
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>

      {/* Revisi Status ke Draft Modal */}
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
                  {rowToRevisiDraft?.NamaProgram}
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

      {/* Batch Rejection Modal (Verifikator & Anggaran) */}
      <Transition appear show={batchRejectModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setBatchRejectModalOpen(false)}
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
                  <AlertCircle className="w-5 h-5" />
                  <span>
                    {isAnggaranUser
                      ? "Tolak Anggaran Program Kerja Terpilih"
                      : "Tolak Verifikator Program Kerja Terpilih"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setBatchRejectModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-600">
                  Anda akan menolak secara serentak{" "}
                  <b className="text-rose-600">{selectedUuids.length}</b>{" "}
                  program kerja yang dipilih. Silakan berikan catatan atau
                  alasan penolakan:
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  Catatan / Alasan Penolakan{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={batchRejectReason}
                  onChange={(e) => setBatchRejectReason(e.target.value)}
                  placeholder="Tuliskan catatan perbaikan atau alasan mengapa program-program kerja ini ditolak..."
                  className="w-full p-3 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setBatchRejectModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={
                    isSubmittingBatchReject || !batchRejectReason.trim()
                  }
                  onClick={handleBatchSubmitReject}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
                >
                  {isSubmittingBatchReject
                    ? "Menyimpan..."
                    : `Tolak ${selectedUuids.length} Proker`}
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>

      {/* Batch Revisi ke Draft Modal (Verifikator & Anggaran) */}
      <Transition appear show={batchRevisiModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setBatchRevisiModalOpen(false)}
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-amber-600 font-bold text-base">
                  <RotateCcw className="w-5 h-5" />
                  <span>Revisi Status ke Draft Serentak</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBatchRevisiModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-600">
                  <b className="text-amber-600">{selectedUuids.length}</b>{" "}
                  program kerja yang dipilih akan dikembalikan ke status{" "}
                  <b>Draft</b> agar dapat diperbaiki kembali oleh pengaju.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  Catatan / Alasan Revisi{" "}
                  <span className="text-gray-400 font-normal">(opsional)</span>
                </label>
                <textarea
                  rows={3}
                  value={batchRevisiReason}
                  onChange={(e) => setBatchRevisiReason(e.target.value)}
                  placeholder="Tuliskan catatan perbaikan atau alasan pengembalian ke status Draft..."
                  className="w-full p-3 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setBatchRevisiModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmittingBatchRevisi}
                  onClick={handleBatchSubmitRevisiDraft}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>
                    {isSubmittingBatchRevisi
                      ? "Menyimpan..."
                      : `Kembalikan ${selectedUuids.length} Proker ke Draft`}
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
