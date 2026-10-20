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

  const curRole = String(level || sessionStorage.getItem("activeLevel") || user?.level || "").toLowerCase().trim();
  const isVerifier = ["upml", "upmf", "upms", "evaluator"].includes(curRole);
  const isAnggaran = ["anggaran", "keuangan"].includes(curRole);
  const isAuditee = curRole === "auditee";

  const [selectedUnit, setSelectedUnit] = useState("all");
  const [selectedUnitObj, setSelectedUnitObj] = useState(null);

  const [selectedProdi, setSelectedProdi] = useState("all");
  const [selectedProdiObj, setSelectedProdiObj] = useState(null);

  // Tab filter verifikasi & persetujuan ("menunggu" | "terima" | "tolak")
  const [activeTab, setActiveTab] = useState("menunggu");

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    tableRef.current?.reload?.({ resetPage: true });
  };

  useEffect(() => {
    setActiveTab("menunggu");
  }, [level]);

  // Master Options
  const [unitOptions, setUnitOptions] = useState([]);
  const [tahunOptions, setTahunOptions] = useState([]);
  const [standarOptions, setStandarOptions] = useState([]);
  const [indikatorOptions, setIndikatorOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // User's matched unit info (mendukung penugasan role ABAC)
  const userUnitData = useMemo(() => {
    if (isAdmin) return null;
    let userFU = user?.fakultas_unit || user?.id_fakultas_unit;
    if (!userFU && Array.isArray(user?.extra_role)) {
      const match = user.extra_role.find(
        (r) =>
          String(r.role ?? r.Role).toLowerCase() === String(level).toLowerCase() &&
          (!positionYear || String(r.tahun ?? r.Tahun) === String(positionYear))
      );
      if (match?.id_fakultas_unit) {
        userFU = match.id_fakultas_unit;
      }
    }
    if (!userFU) return null;
    return unitOptions.find(
      (u) =>
        String(u.id) === String(userFU) ||
        String(u.uuid) === String(userFU) ||
        String(u.nama).toLowerCase() === String(userFU).toLowerCase()
    );
  }, [isAdmin, user, unitOptions, level, positionYear]);

  // Semua unit yang ditugaskan ke user ini via user_abac untuk role & tahun ini
  const userAssignedUnits = useMemo(() => {
    if (!Array.isArray(user?.extra_role)) return [];
    const matched = user.extra_role.filter(
      (r) =>
        String(r.role ?? r.Role).toLowerCase() === String(level).toLowerCase() &&
        (!positionYear || String(r.tahun ?? r.Tahun) === String(positionYear))
    );
    const unique = [];
    const seen = new Set();
    matched.forEach((m) => {
      const uId = String(m.id_fakultas_unit ?? m.IdFakultasUnit ?? "");
      if (uId && !seen.has(uId)) {
        seen.add(uId);
        const found = unitOptions.find(
          (u) => String(u.id) === uId || String(u.uuid) === uId
        );
        unique.push(
          found || {
            id: uId,
            uuid: uId,
            nama: m.nama_fakultas_unit || `Unit #${uId}`,
            label: m.nama_fakultas_unit || `Unit #${uId}`,
            name: m.nama_fakultas_unit || `Unit #${uId}`,
            type: "unit",
          }
        );
      }
    });
    return unique;
  }, [user?.extra_role, level, positionYear, unitOptions]);

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
    if (level === "upml") {
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
      return [
        {
          id: "all",
          uuid: "all",
          label: "Semua Unit Kerja",
          nama: "Semua Unit Kerja",
          display_name: "Semua Unit Kerja",
        },
        ...unitOptions
          .filter((u) => (u.type || "").toLowerCase() === "unit")
          .map(formatUnitOption),
      ];
    }

    if (level === "upmf") {
      if (userAssignedUnits.length > 0) {
        return userAssignedUnits.map(formatUnitOption);
      }
      const fakultasOnly = unitOptions
        .filter(
          (u) =>
            (u.type || "").toLowerCase() === "fakultas" ||
            (u.type || "").toLowerCase() === "sekolah"
        )
        .sort((a, b) => {
          if (a.kode_fakultas && b.kode_fakultas) {
            return a.kode_fakultas.localeCompare(b.kode_fakultas, undefined, { numeric: true });
          }
          return (a.raw_nama || a.nama || "").localeCompare(b.raw_nama || b.nama || "");
        });
      return fakultasOnly.map(formatUnitOption);
    }

    // upms, admin, verifikator, evaluator, anggaran
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
        return a.kode_fakultas.localeCompare(b.kode_fakultas, undefined, { numeric: true });
      }
      return (a.raw_nama || a.nama || "").localeCompare(b.raw_nama || b.nama || "");
    });

    // Urutkan unit secara alfabetis
    regularUnits.sort((a, b) =>
      (a.raw_nama || a.nama || "").localeCompare(b.raw_nama || b.nama || "")
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
  }, [level, userAssignedUnits, unitOptions]);

  // Cek apakah dropdown unit/fakultas memilih item bertipe fakultas
  const isFakultasSelected = useMemo(() => {
    if (!selectedUnit || selectedUnit === "all") return false;
    const curUnit =
      unitOptions.find(
        (u) =>
          String(u.id) === String(selectedUnit) ||
          String(u.uuid) === String(selectedUnit)
      ) ||
      userAssignedUnits.find(
        (u) =>
          String(u.id) === String(selectedUnit) ||
          String(u.uuid) === String(selectedUnit)
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
          String(u.uuid) === String(selectedUnit)
      ) ||
      userAssignedUnits.find(
        (u) =>
          String(u.id) === String(selectedUnit) ||
          String(u.uuid) === String(selectedUnit)
      ) ||
      selectedUnitObj;

    let prodis = unitOptions.filter((u) => (u.type || "").toLowerCase() === "prodi");

    if (curUnit) {
      // Filter prodi berdasarkan kode_fakultas dari fakultas yang dipilih
      prodis = prodis.filter((p) => {
        if (curUnit.kode_fakultas && p.kode_fakultas) {
          return String(p.kode_fakultas).trim() === String(curUnit.kode_fakultas).trim();
        }
        // Fallback ke pencocokan nama fakultas
        const fName = (curUnit.raw_nama || curUnit.nama || curUnit.fakultas || "")
          .toLowerCase()
          .trim();
        const pFak = (p.fakultas || "").toLowerCase().trim();
        return pFak === fName || (p.nama && p.nama.toLowerCase().includes(fName));
      });
    }

    // Urutkan prodi secara alfabetis
    prodis.sort((a, b) =>
      (a.raw_nama || a.nama || "").localeCompare(b.raw_nama || b.nama || "")
    );

    const mapped = prodis.map((p) => {
      const rawName = p.raw_nama || p.nama;
      const jenjangUpper = (p.jenjang || "").toUpperCase();
      const labelWithJenjang = jenjangUpper ? `${rawName} (${jenjangUpper})` : rawName;
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
  }, [unitOptions, selectedUnit, isFakultasSelected, userAssignedUnits, selectedUnitObj]);

  // Auto-select unit untuk upml dan upmf
  useEffect(() => {
    if ((level === "upml" || level === "upmf") && userAssignedUnits.length > 0) {
      const exists = userAssignedUnits.some(
        (u) => String(u.id) === String(selectedUnit) || String(u.uuid) === String(selectedUnit)
      );
      if (!exists || selectedUnit === "all") {
        const first = userAssignedUnits[0];
        setSelectedUnit(String(first.id || first.uuid));
        setSelectedUnitObj(first);
      }
    }
  }, [level, userAssignedUnits]);

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
      if (positionYear && !tahuns.some((t) => String(t.tahun) === String(positionYear))) {
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

    if (isVerifier || isAdmin || isAnggaran) {
      if (selectedUnit && selectedUnit !== "all") {
        params.append("filter_fakultas_unit", selectedUnit);
      }
      if (isFakultasSelected && selectedProdi && selectedProdi !== "all") {
        params.append("filter_prodi", selectedProdi);
      }
      if ((isVerifier || isAnggaran) && activeTab) {
        params.append("filter_tab", activeTab);
      }
    } else {
      let unitVal = user?.id_fakultas_unit || user?.fakultas_unit;
      if (unitVal) {
        params.append("filter_fakultas_unit", String(unitVal));
      }
    }

    const qs = params.toString();
    return `/proker_v3s${qs ? `?${qs}` : ""}`;
  }, [selectedTahun, selectedUnit, selectedProdi, isFakultasSelected, isAdmin, isVerifier, isAnggaran, user, level, positionYear, activeTab]);

  const openCreate = () => {
    if (!isAuditee) {
      addToast("warning", "Hanya level auditee yang dapat menambah program kerja");
      return;
    }
    setFormModalMode("create");
    setSelectedRow(null);
    setFormModalOpen(true);
  };

  const openEdit = (row) => {
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
    try {
      await apiClient.put(`/proker_v3/${row.UUID}/status`, { status: nextStatus });
      addToast(
        "success",
        `Status program kerja berhasil diubah menjadi: ${nextStatus.toUpperCase()}`
      );
      tableRef.current?.reload?.({ resetPage: false });
    } catch (err) {
      addToast("error", err?.message || "Gagal memperbarui status");
    }
  };

  // Verifikator (UPM / Evaluator) Verification Handler
  const handleVerifyVerifikator = async (row) => {
    try {
      await apiClient.put(`/proker_v3/${row.UUID}/status`, {
        status: "terima_verifikator",
      });
      addToast(
        "success",
        `Program kerja "${row.NamaProgram}" berhasil disetujui (Terima Verifikator)`
      );
      tableRef.current?.reload?.({ resetPage: false });
    } catch (err) {
      addToast(
        "error",
        err?.response?.data?.error || err?.message || "Gagal memverifikasi program kerja"
      );
    }
  };

  // Anggaran Verification Handlers
  const handleVerifyAnggaran = async (row) => {
    try {
      await apiClient.put(`/proker_v3/${row.UUID}/status`, {
        status: "terima_anggaran",
      });
      addToast(
        "success",
        `Program kerja "${row.NamaProgram}" berhasil disetujui (Terima Anggaran)`
      );
      tableRef.current?.reload?.({ resetPage: false });
    } catch (err) {
      addToast("error", err?.response?.data?.error || err?.message || "Gagal memverifikasi anggaran");
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
      await apiClient.put(`/proker_v3/${rejectingRow.UUID}/status`, {
        status: "ditolak",
        catatan_penolakan: alasanPenolakan.trim(),
      });
      addToast("success", `Program kerja "${rejectingRow.NamaProgram}" berhasil ditolak`);
      setRejectModalOpen(false);
      setRejectingRow(null);
      tableRef.current?.reload?.({ resetPage: false });
    } catch (err) {
      addToast("error", err?.response?.data?.error || err?.message || "Gagal menolak program kerja");
    } finally {
      setIsSubmittingReject(false);
    }
  };


  const deleteData = async () => {
    if (!selectedRow?.UUID) return;
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

  const listColumns = [
    {
      key: "no_proker",
      label: "No.",
      width: "60px",
      renderKey: (r) => (
        <span className="font-mono font-bold text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
          {r.NoProker || 1}
        </span>
      ),
    },
    {
      key: "Tahun",
      label: "Tahun",
      width: "70px",
      renderKey: (r) => (
        <span className="font-semibold text-xs text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded font-mono">
          {r.Tahun || "2026"}
        </span>
      ),
    },
    {
      key: "nama_program",
      label: "Program Kerja",
      minWidth: "240px",
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
            PIC: <span className="font-medium text-gray-700">{r.PIC || "-"}</span>
            {r.NamaFakultasUnit ? ` • ${r.NamaFakultasUnit}` : ""}
          </div>
        </div>
      ),
    },
    {
      key: "standar_sub_standar",
      label: "Standar & Indikator",
      minWidth: "220px",
      renderKey: (r) => (
        <div className="text-xs space-y-1">
          <div className="font-medium text-gray-800 line-clamp-2" title={r.StandarSubStandar}>
            {r.StandarSubStandar || "-"}
          </div>
          <div className="text-[11px] text-gray-500 line-clamp-1 italic" title={r.IndikatorKinerja}>
            {r.IndikatorKinerja || ""}
          </div>
        </div>
      ),
    },
    {
      key: "target",
      label: "Target (Unpak / Unit)",
      width: "160px",
      renderKey: (r) => (
        <div className="text-xs space-y-0.5">
          <div className="text-gray-700">
            Unpak: <b>{r.TargetUnpak || "-"}</b>
          </div>
          <div className="text-gray-500 text-[11px] line-clamp-1">
            Unit: {r.TargetUnit || "-"}
          </div>
        </div>
      ),
    },
    {
      key: "anggaran",
      label: "Anggaran Program",
      minWidth: "160px",
      renderKey: (r) => {
        const hasReal = Boolean(r.HasRealisasi && r.TotalRealisasi !== undefined && r.TotalRealisasi !== null);
        return (
          <div className="text-xs font-mono bg-emerald-50/60 px-2.5 py-1.5 rounded-lg border border-emerald-100 text-right whitespace-nowrap">
            {hasReal ? (
              <div>
                <span
                  className="line-through text-gray-400 text-[11px] block font-normal decoration-rose-500 decoration-1"
                  title="Total Anggaran Awal"
                >
                  {formatRupiah(r.TotalAnggaran || r.Anggaran || 0)}
                </span>
                <span
                  className="font-bold text-emerald-700 text-xs block"
                  title="Total Realisasi Anggaran Baru"
                >
                  {formatRupiah(r.TotalRealisasi)}
                </span>
              </div>
            ) : (
              <span className="font-bold text-emerald-700">
                {formatRupiah(r.TotalAnggaran || r.Anggaran || 0)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "timelines_count",
      label: "Aktivitas Proker",
      minWidth: "185px",
      renderKey: (r) => (
        <button
          type="button"
          onClick={() => openAktivitas(r)}
          className="inline-flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/90 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition cursor-pointer group shadow-2xs whitespace-nowrap w-full"
          title="Klik untuk membuka kelola aktivitas program kerja"
        >
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
            <Layers className="w-3.5 h-3.5 text-purple-600 group-hover:text-white shrink-0" />
            <span>
              <b className="font-bold">{r.TotalAktivitas || 0}</b> Aktivitas
            </span>
          </span>
          <span className="text-[10px] bg-purple-200/90 text-purple-900 group-hover:bg-white group-hover:text-purple-700 px-2 py-0.5 rounded-md font-bold whitespace-nowrap shrink-0 transition-colors">
            Kelola →
          </span>
        </button>
      ),
    },
    {
      key: "dokumen_count",
      label: "Dokumen Proker",
      minWidth: "185px",
      renderKey: (r) => (
        <button
          type="button"
          onClick={() => openDokumen(r)}
          className="inline-flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/90 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition cursor-pointer group shadow-2xs whitespace-nowrap w-full"
          title="Klik untuk membuka kelola dokumen program kerja"
        >
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
            <FileText className="w-3.5 h-3.5 text-indigo-600 group-hover:text-white shrink-0" />
            <span>
              <b className="font-bold">{r.TotalDokumen || 0}</b> Dokumen
            </span>
          </span>
          <span className="text-[10px] bg-indigo-200/90 text-indigo-900 group-hover:bg-white group-hover:text-indigo-700 px-2 py-0.5 rounded-md font-bold whitespace-nowrap shrink-0 transition-colors">
            Unggah →
          </span>
        </button>
      ),
    },
    {
      key: "status_verifikator",
      label: "Verifikasi UPM",
      width: "150px",
      minWidth: "150px",
      renderKey: (r) => {
        const sVerif = (r.StatusVerifikator || "").toLowerCase().trim();
        const sMain = (r.Status || "").toLowerCase().trim();
        const isProdi =
          (r.TypeFakultasUnit || "").toLowerCase() === "prodi" ||
          (r.NamaFakultasUnit || "").toLowerCase().includes("prodi");

        if (
          sVerif === "terima_verifikator" ||
          sVerif === "disetujui" ||
          sMain === "disetujui" ||
          sMain === "terima_anggaran" ||
          sMain === "terima anggaran"
        ) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-300 bg-emerald-50 text-emerald-800 uppercase tracking-wider">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>DITERIMA UPM</span>
            </span>
          );
        }

        if (sVerif === "diverifikasi_upmf" || sMain === "diverifikasi_upmf") {
          return (
            <div className="flex flex-col gap-0.5 items-start">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-indigo-300 bg-indigo-50 text-indigo-800 uppercase tracking-wider">
                VERIFIKASI UPMF
              </span>
              <span className="text-[9px] text-gray-500 font-medium">Menunggu UPMS</span>
            </div>
          );
        }

        if (sVerif === "diverifikasi_upml" || sMain === "diverifikasi_upml") {
          return (
            <div className="flex flex-col gap-0.5 items-start">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-cyan-300 bg-cyan-50 text-cyan-800 uppercase tracking-wider">
                VERIFIKASI UPML
              </span>
              <span className="text-[9px] text-gray-500 font-medium">
                {isProdi ? "Menunggu UPMF" : "Menunggu UPMS"}
              </span>
            </div>
          );
        }

        if (sVerif === "ditolak" || (sMain.includes("ditolak") && r.CatatanVerifikator)) {
          return (
            <div className="flex flex-col gap-1 items-start">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-rose-300 bg-rose-50 text-rose-800 uppercase tracking-wider">
                DITOLAK UPM
              </span>
            </div>
          );
        }

        if (sVerif === "diajukan" || sMain === "diajukan") {
          return (
            <div className="flex flex-col gap-0.5 items-start">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-blue-300 bg-blue-50 text-blue-800 uppercase tracking-wider">
                DIAJUKAN
              </span>
              <span className="text-[9px] text-gray-500 font-medium">Menunggu UPML</span>
            </div>
          );
        }

        return (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-gray-200 bg-gray-100 text-gray-600 uppercase tracking-wider">
            DRAF
          </span>
        );
      },
    },
    {
      key: "status_anggaran",
      label: "Verifikasi Anggaran",
      width: "160px",
      minWidth: "160px",
      renderKey: (r) => {
        const sAngg = (r.StatusAnggaran || "").toLowerCase().trim();
        const sMain = (r.Status || "").toLowerCase().trim();
        const sVerif = (r.StatusVerifikator || "").toLowerCase().trim();

        const isVerifierApproved =
          sVerif === "terima_verifikator" ||
          sVerif === "disetujui" ||
          sVerif.includes("diverifikasi") ||
          sMain === "disetujui" ||
          sMain === "terima_anggaran" ||
          sMain === "terima anggaran" ||
          sMain.includes("diverifikasi");

        if (sAngg === "terima_anggaran" || sAngg === "disetujui" || sMain === "terima_anggaran" || sMain === "terima anggaran") {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-300 bg-emerald-50 text-emerald-800 uppercase tracking-wider">
              <DollarSign className="w-3 h-3 text-emerald-600" />
              <span>TERIMA ANGGARAN</span>
            </span>
          );
        }

        if (sAngg === "ditolak" || (sMain.includes("ditolak") && r.CatatanAnggaran)) {
          return (
            <div className="flex flex-col gap-1 items-start">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-rose-300 bg-rose-50 text-rose-800 uppercase tracking-wider">
                DITOLAK ANGGARAN
              </span>
            </div>
          );
        }

        if (sAngg === "menunggu_anggaran" || isVerifierApproved) {
          return (
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-amber-300 bg-amber-50 text-amber-800 uppercase tracking-wider">
              MENUNGGU ANGGARAN
            </span>
          );
        }

        return (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider">
            MENUNGGU VERIFIKATOR
          </span>
        );
      },
    },
    {
      key: "aksi",
      label: "Aksi",
      width: isAnggaran || isVerifier ? "260px" : "160px",
      minWidth: isAnggaran || isVerifier ? "260px" : "160px",
      renderKey: (r) => {
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
              className="p-1.5 rounded-xl text-purple-600 bg-white hover:bg-purple-50 border border-purple-200 hover:border-purple-300 transition cursor-pointer shadow-2xs shrink-0 inline-flex items-center justify-center"
              title="Riwayat State & Validasi"
            >
              <Clock className="w-4 h-4" />
            </button>
          </Tooltip>
        );

        // 1. Role Anggaran / Keuangan
        if (isAnggaran) {
          if (!isVerifierApproved) {
            return (
              <div className="flex items-center gap-2 flex-nowrap">
                <span className="text-[11px] text-gray-400 italic font-medium">
                  Belum diverifikasi verifikator
                </span>
                {historyBtn}
              </div>
            );
          }

          if (isAnggaranApproved) {
            return (
              <div className="flex items-center gap-1.5 flex-nowrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Diterima Anggaran</span>
                </span>
                {historyBtn}
              </div>
            );
          }

          if (sAngg === "ditolak") {
            return (
              <div className="flex items-center gap-1.5 flex-nowrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                  <X className="w-3.5 h-3.5 text-rose-600" />
                  <span>Ditolak Anggaran</span>
                </span>
                {historyBtn}
              </div>
            );
          }

          return (
            <div className="flex items-center gap-1.5 flex-nowrap">
              <button
                type="button"
                onClick={() => handleVerifyAnggaran(r)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition cursor-pointer shrink-0"
                title="Verifikasi & Terima Anggaran Program Kerja"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Terima Anggaran</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenRejectModal(r)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs transition cursor-pointer shrink-0"
                title="Tolak Program Kerja ini"
              >
                <X className="w-3.5 h-3.5" />
                <span>Tolak Anggaran</span>
              </button>
              {historyBtn}
            </div>
          );
        }

        // 2. Role Verifier (upml, upmf, upms, evaluator)
        if (isVerifier) {
          if (isVerifierApproved) {
            return (
              <div className="flex items-center gap-1.5 flex-nowrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Diterima Verifikator</span>
                </span>
                {historyBtn}
              </div>
            );
          }

          if (sVerif === "ditolak") {
            return (
              <div className="flex items-center gap-1.5 flex-nowrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                  <X className="w-3.5 h-3.5 text-rose-600" />
                  <span>Ditolak Verifikator</span>
                </span>
                {historyBtn}
              </div>
            );
          }

          return (
            <div className="flex items-center gap-1.5 flex-nowrap">
              <button
                type="button"
                onClick={() => handleVerifyVerifikator(r)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition cursor-pointer shrink-0"
                title="Terima Verifikator Program Kerja"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Terima Verifikator</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenRejectModal(r)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs transition cursor-pointer shrink-0"
                title="Tolak Verifikator Program Kerja"
              >
                <X className="w-3.5 h-3.5" />
                <span>Tolak Verifikator</span>
              </button>
              {historyBtn}
            </div>
          );
        }

        // 3. Admin / Auditee
        return (
          <div className="flex items-center gap-1.5 flex-nowrap">
            {isAdmin && (
              <>
                <Tooltip title="Edit Matriks Program Kerja">
                  <button
                    type="button"
                    onClick={() => openEdit(r)}
                    className="p-1.5 rounded-xl text-amber-600 bg-white hover:bg-amber-50 border border-amber-200 hover:border-amber-300 transition cursor-pointer shadow-2xs shrink-0 inline-flex items-center justify-center"
                    title="Edit Matriks Program Kerja"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </Tooltip>
                <Tooltip title="Hapus Program Kerja">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRow(r);
                      setConfirmDelete(true);
                    }}
                    className="p-1.5 rounded-xl text-rose-600 bg-white hover:bg-rose-50 border border-rose-200 hover:border-rose-300 transition cursor-pointer shadow-2xs shrink-0 inline-flex items-center justify-center"
                    title="Hapus Program Kerja"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Tooltip>
              </>
            )}

            {!isAdmin && sMain === "draft" && (
              <>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(r, "diajukan")}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition cursor-pointer shrink-0"
                  title="Ajukan program kerja ke pimpinan/admin"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Ajukan</span>
                </button>
                <Tooltip title="Edit Program Kerja">
                  <button
                    type="button"
                    onClick={() => openEdit(r)}
                    className="p-1.5 rounded-xl text-amber-600 bg-white hover:bg-amber-50 border border-amber-200 hover:border-amber-300 transition cursor-pointer shadow-2xs shrink-0 inline-flex items-center justify-center"
                    title="Edit Program Kerja"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </Tooltip>
              </>
            )}

            {!isAdmin && sMain === "diajukan" && (
              <button
                type="button"
                onClick={() => handleUpdateStatus(r, "draft")}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 transition cursor-pointer shrink-0"
                title="Batalkan pengajuan dan kembalikan ke Draf"
              >
                <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                <span>Batal</span>
              </button>
            )}

            {historyBtn}
          </div>
        );
      },
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
                sessionStorage.setItem("activeLevel", val);
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
            isAuditee ? (
              <button
                type="button"
                onClick={openCreate}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition cursor-pointer"
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
              {level === "upms" ? (
                <School className="w-5 h-5 text-amber-600" />
              ) : level === "upmf" ? (
                <GraduationCap className="w-5 h-5 text-indigo-600" />
              ) : level === "upml" ? (
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
                    level === "upms"
                      ? "bg-amber-100 text-amber-900 border border-amber-200"
                      : level === "upmf"
                      ? "bg-indigo-100 text-indigo-900 border border-indigo-200"
                      : level === "upml"
                      ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                      : level === "evaluator"
                      ? "bg-purple-100 text-purple-900 border border-purple-200"
                      : isAnggaran
                      ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                      : isAdmin
                      ? "bg-purple-100 text-purple-900 border border-purple-200"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {level === "upms"
                    ? "UPMS (Unit Penjaminan Mutu Sekolah)"
                    : level === "upmf"
                    ? `UPMF (${selectedUnitObj?.nama || "Fakultas"})`
                    : level === "upml"
                    ? `UPML (${selectedUnitObj?.nama || "Unit Penugasan"})`
                    : level === "evaluator"
                    ? "Evaluator / Verifikator"
                    : isAnggaran
                    ? "Tim Anggaran & Keuangan"
                    : isAdmin
                    ? "Admin (Semua Unit)"
                    : "Auditee Unit Terbatas"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-700 font-medium mt-0.5">
                {level === "upms" || level === "evaluator"
                  ? "Lingkup verifikasi program kerja. Anda dapat menyetujui (Terima Verifikator) atau menolak (Tolak Verifikator) program kerja yang diajukan."
                  : isAnggaran
                  ? "Verifikasi dan persetujuan alokasi anggaran program kerja seluruh unit/fakultas setelah diverifikasi oleh verifikator UPM."
                  : level === "upmf"
                  ? `Menampilkan data program kerja ${selectedUnitObj?.nama || "Fakultas"} dan seluruh program studi di bawahnya untuk diverifikasi.`
                  : level === "upml"
                  ? `Menampilkan data program kerja khusus unit penugasan (${selectedUnitObj?.nama || "Unit Terpilih"}) untuk diverifikasi.`
                  : isAdmin
                  ? "Menampilkan seluruh data matriks proker universitas. Anda dapat memfilter unit dan mengubah status menjadi Disetujui/Selesai."
                  : `Tabel secara otomatis menampilkan data khusus unit Anda (${
                      userUnitData?.nama || user?.fakultas_unit || "Unit Terdaftar"
                    }). Status proker dapat diajukan (Draf / Diajukan) melalui tombol di tabel.`}
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

            {/* Filter Unit / Fakultas (Only for verifier, admin & anggaran) */}
            {(isVerifier || isAdmin || isAnggaran) && unitFilterOptions.length > 0 && (
              <div className="w-56 min-w-[170px]">
                <SearchSelect
                  options={unitFilterOptions}
                  value={selectedUnitObj}
                  onChange={handleSelectUnit}
                  placeholder={
                    level === "upml"
                      ? "Pilih Unit Penugasan"
                      : level === "upmf"
                      ? "Pilih Fakultas"
                      : "Semua Unit / Fakultas"
                  }
                  icon={Building2}
                />
              </div>
            )}

            {/* Filter Prodi (Hanya ditampilkan jika dropdown unit/fakultas memilih item bertipe fakultas) */}
            {(isVerifier || isAdmin || isAnggaran) && level !== "upml" && isFakultasSelected && (
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

        {/* Tab Verifikasi & Persetujuan (Khusus Role Anggaran & Verifikator) */}
        {(isVerifier || isAnggaran) && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 sm:px-5 sm:py-3.5 rounded-2xl border border-gray-200 shadow-xs">
            {/* Segmented Tab Controls */}
            <div className="inline-flex p-1 bg-gray-100/90 rounded-xl border border-gray-200/80 gap-1 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => handleTabChange("menunggu")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "menunggu"
                    ? "bg-white text-purple-700 shadow-xs border border-gray-200/80"
                    : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                }`}
              >
                <Clock className={`w-3.5 h-3.5 ${activeTab === "menunggu" ? "text-purple-600" : "text-gray-400"}`} />
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
                <CheckCircle2 className={`w-3.5 h-3.5 ${activeTab === "terima" ? "text-white" : "text-emerald-600"}`} />
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
                <XCircle className={`w-3.5 h-3.5 ${activeTab === "tolak" ? "text-white" : "text-rose-600"}`} />
                <span>Tolak</span>
              </button>
            </div>

            {/* Context Badge Description */}
            <div className="text-xs text-gray-500 font-medium flex items-center gap-1.5 flex-wrap">
              <span>Menampilkan:</span>
              <span
                className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                  activeTab === "menunggu"
                    ? "bg-purple-50 text-purple-700 border border-purple-200"
                    : activeTab === "terima"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                {activeTab === "menunggu"
                  ? isAnggaran
                    ? "Menunggu Persetujuan Anggaran"
                    : "Menunggu Verifikasi UPM"
                  : activeTab === "terima"
                  ? isAnggaran
                    ? "Diterima Anggaran"
                    : "Diterima Verifikator"
                  : isAnggaran
                  ? "Ditolak Anggaran"
                  : "Ditolak Verifikator"}
              </span>
            </div>
          </div>
        )}

        {/* Remote Table Program Kerja */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <RemoteTable
            ref={tableRef}
            endpoint={tableEndpoint}
            mode="paging"
            token={getValidToken()}
            listcolumns={listColumns}
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
        <Dialog as="div" className="relative z-50" onClose={() => setRejectModalOpen(false)}>
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
                  Silakan berikan catatan atau alasan penolakan untuk program kerja:
                </p>
                <div className="text-xs font-bold text-gray-900 bg-gray-50 border border-gray-200 p-2.5 rounded-lg line-clamp-2">
                  {rejectingRow?.NamaProgram}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  Catatan / Alasan Penolakan <span className="text-rose-500">*</span>
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
    </>
  );
}
