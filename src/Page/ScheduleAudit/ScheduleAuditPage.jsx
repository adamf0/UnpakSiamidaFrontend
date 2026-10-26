import RemoteTable from "@/Components/RemoteTable";
import React, { useRef, useState, useEffect } from "react";
import ConfirmDeleteDialog from "@/Components/ConfirmDeleteDialog";
import { useToast } from "@/Providers/ToastProvider";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import { useContent } from "@/Providers/ContentProvider";
import {
  Plus,
  Filter,
  X,
  KeyRound,
  Mail,
  FileText,
  Pencil,
  Trash2,
  Copy,
  Check,
  CalendarClock,
} from "lucide-react";
import Tooltip from "@/Components/Tooltip";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/Providers/AuthProvider";
import { isEmpty, renderLabelFakultasUnit } from "@/Common/Utils";
import { apiClient } from "@/Common/api";
import PageHeader from "@/Components/PageHeader";
import ScheduleAuditFilterDrawer, {
  initialAuditFilters,
} from "./ScheduleAuditFilterDrawer";

const getAuditeeRenstraStatus = (row) => {
  if (!row?.Auditee || !row.Auditee.trim()) {
    return { text: "Belum Ditugaskan", color: "bg-gray-500" };
  }
  const tra = parseInt(row?.TotalRenstraAuditee || "0", 10);
  const tr = parseInt(row?.TotalRenstra || "0", 10);

  if (tra === 0) {
    return { text: "Belum Mengisi", color: "bg-red-500" };
  }
  if (tr > 0 && tra >= tr) {
    return { text: "Selesai", color: "bg-green-500" };
  }
  const countStr = tr > 0 ? ` (${tra}/${tr})` : ` (${tra})`;
  return { text: `Dalam Proses${countStr}`, color: "bg-orange-500" };
};

const getAuditeeDokumenStatus = (row) => {
  if (!row?.Auditee || !row.Auditee.trim()) {
    return { text: "Belum Ditugaskan", color: "bg-gray-500" };
  }
  const tda = parseInt(row?.TotalDokumenAuditee || "0", 10);
  const td = parseInt(row?.TotalDokumen || "0", 10);

  if (tda === 0) {
    return { text: "Belum Mengisi", color: "bg-red-500" };
  }
  if (td > 0 && tda >= td) {
    return { text: "Selesai", color: "bg-green-500" };
  }
  const countStr = td > 0 ? ` (${tda}/${td})` : ` (${tda})`;
  return { text: `Dalam Proses${countStr}`, color: "bg-orange-500" };
};

const getAuditorRenstraStatus = (auditorName, catatan, row) => {
  if (!auditorName || !auditorName.trim()) {
    return { text: "Belum Ditugaskan", color: "bg-gray-500" };
  }
  if (catatan && typeof catatan === "string" && catatan.trim().length > 0) {
    return { text: "Selesai", color: "bg-green-500" };
  }
  const traud = parseInt(row?.TotalRenstraAuditor || "0", 10);
  const tr = parseInt(row?.TotalRenstra || "0", 10);

  if (traud === 0) {
    return { text: "Belum Menilai", color: "bg-gray-500" };
  }
  if (tr > 0 && traud >= tr) {
    return { text: "Selesai", color: "bg-green-500" };
  }
  const countStr = tr > 0 ? ` (${traud}/${tr})` : ` (${traud})`;
  return { text: `Sedang Menilai${countStr}`, color: "bg-blue-500" };
};

const getAuditorDokumenStatus = (auditorName, catatan, row) => {
  if (!auditorName || !auditorName.trim()) {
    return { text: "Belum Ditugaskan", color: "bg-gray-500" };
  }
  if (catatan && typeof catatan === "string" && catatan.trim().length > 0) {
    return { text: "Selesai", color: "bg-green-500" };
  }
  const tdaud = parseInt(row?.TotalDokumenAuditor || "0", 10);
  const td = parseInt(row?.TotalDokumen || "0", 10);

  if (tdaud === 0) {
    return { text: "Belum Menilai", color: "bg-gray-500" };
  }
  if (td > 0 && tdaud >= td) {
    return { text: "Selesai", color: "bg-green-500" };
  }
  const countStr = td > 0 ? ` (${tdaud}/${td})` : ` (${tdaud})`;
  return { text: `Sedang Menilai${countStr}`, color: "bg-blue-500" };
};

const renderStatusAuditee = (row) => {
  if (!row?.Auditee || !row.Auditee.trim()) {
    return (
      <span className="bg-gray-500 px-2 py-1 text-xs text-white rounded-full inline-block whitespace-nowrap">
        Belum Ditugaskan
      </span>
    );
  }

  const renstra = getAuditeeRenstraStatus(row);
  const dokumen = getAuditeeDokumenStatus(row);

  return (
    <div className="flex flex-col gap-1 items-start py-0.5">
      <span
        className={`${renstra.color} px-2 py-0.5 text-xs text-white rounded-full whitespace-nowrap`}
      >
        Renstra: {renstra.text}
      </span>
      <span
        className={`${dokumen.color} px-2 py-0.5 text-xs text-white rounded-full whitespace-nowrap`}
      >
        Dokumen Tambahan: {dokumen.text}
      </span>
    </div>
  );
};

const renderStatusAuditor = (auditorName, catatan, row) => {
  if (!auditorName || !auditorName.trim()) {
    return (
      <span className="bg-gray-500 px-2 py-1 text-xs text-white rounded-full inline-block whitespace-nowrap">
        Belum Ditugaskan
      </span>
    );
  }

  const renstra = getAuditorRenstraStatus(auditorName, catatan, row);
  const dokumen = getAuditorDokumenStatus(auditorName, catatan, row);

  return (
    <div className="flex flex-col gap-1 items-start py-0.5">
      <span
        className={`${renstra.color} px-2 py-0.5 text-xs text-white rounded-full whitespace-nowrap`}
      >
        Renstra: {renstra.text}
      </span>
      <span
        className={`${dokumen.color} px-2 py-0.5 text-xs text-white rounded-full whitespace-nowrap`}
      >
        Dokumen Tambahan: {dokumen.text}
      </span>
    </div>
  );
};

export const formatDateSchedule = (d) => {
  if (!d) return null;
  const str = String(d);
  const clean = str.includes("T") ? str.split("T")[0] : str.split(" ")[0];
  const parts = clean.split("-");
  if (parts.length === 3) {
    const parsed = new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10)
    );
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    }
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }
  return str;
};

const formatScheduleRange = (start, end) => {
  if (start && end) {
    return start === end ? start : `${start} - ${end}`;
  }
  if (start) return start;
  if (end) return end;
  return "-";
};

const renderStatusJadwal = (rowOrStatus) => {
  const isObj = typeof rowOrStatus === "object" && rowOrStatus !== null;
  if (!isObj) {
    return (
      <div className="flex flex-col items-start gap-1 py-0.5">
        <span className="bg-gray-500 px-2 py-0.5 text-xs text-white rounded-full whitespace-nowrap">
          {rowOrStatus || "belum mulai audit"}
        </span>
      </div>
    );
  }

  const status = (rowOrStatus.StatusJadwal || "").toLowerCase().trim();

  // 1. Jadwal Upload Dokumen
  const tglUploadMulai =
    rowOrStatus.PeriodeUploadMulaiFmt ||
    formatDateSchedule(rowOrStatus.PeriodeUploadMulai);
  const tglUploadAkhir =
    rowOrStatus.PeriodeUploadAkhirFmt ||
    formatDateSchedule(rowOrStatus.PeriodeUploadAkhir);
  const rangeUpload = formatScheduleRange(tglUploadMulai, tglUploadAkhir);

  // 2. Jadwal Assesment Dokumen
  const tglAssDokumenMulai =
    rowOrStatus.PeriodeAssesmentDokumenMulaiFmt ||
    formatDateSchedule(rowOrStatus.PeriodeAssesmentDokumenMulai);
  const tglAssDokumenAkhir =
    rowOrStatus.PeriodeAssesmentDokumenAkhirFmt ||
    formatDateSchedule(rowOrStatus.PeriodeAssesmentDokumenAkhir);
  const rangeAssDokumen = formatScheduleRange(tglAssDokumenMulai, tglAssDokumenAkhir);

  // 3. Jadwal Assesment Lapangan
  const tglAssLapanganMulai =
    rowOrStatus.PeriodeAssesmentLapanganMulaiFmt ||
    formatDateSchedule(rowOrStatus.PeriodeAssesmentLapanganMulai);
  const tglAssLapanganAkhir =
    rowOrStatus.PeriodeAssesmentLapanganAkhirFmt ||
    formatDateSchedule(rowOrStatus.PeriodeAssesmentLapanganAkhir);
  const rangeAssLapangan = formatScheduleRange(tglAssLapanganMulai, tglAssLapanganAkhir);

  const isSpecialStatus =
    status === "audit telah berakhir" ||
    status === "jadwal bentrok" ||
    status === "belum mulai audit";

  return (
    <div className="flex flex-col items-start gap-2.5 py-1 min-w-[240px]">
      {/* Status Utama jika berakhir, bentrok, atau belum mulai */}
      {isSpecialStatus && (
        <span
          className={`${
            status === "audit telah berakhir"
              ? "bg-red-500"
              : status === "jadwal bentrok"
              ? "bg-orange-500"
              : "bg-gray-500"
          } px-2.5 py-0.5 text-xs text-white rounded-full whitespace-nowrap font-medium`}
        >
          {status}
        </span>
      )}

      {/* 1. Upload Dokumen */}
      <div className="flex flex-col items-start gap-0.5">
        <span
          className={`px-2.5 py-0.5 text-xs text-white rounded-full whitespace-nowrap font-medium transition ${
            status === "upload dokumen"
              ? "bg-green-600 ring-2 ring-green-300 ring-offset-1"
              : "bg-green-500"
          }`}
        >
          upload dokumen
        </span>
        <span className="text-xs text-gray-500 whitespace-nowrap pl-0.5">
          {rangeUpload}
        </span>
      </div>

      {/* 2. Assesment Dokumen */}
      <div className="flex flex-col items-start gap-0.5">
        <span
          className={`px-2.5 py-0.5 text-xs text-white rounded-full whitespace-nowrap font-medium transition ${
            status === "assesment dokumen"
              ? "bg-blue-600 ring-2 ring-blue-300 ring-offset-1"
              : "bg-blue-500"
          }`}
        >
          assesment dokumen
        </span>
        <span className="text-xs text-gray-500 whitespace-nowrap pl-0.5">
          {rangeAssDokumen}
        </span>
      </div>

      {/* 3. Assesment Lapangan */}
      <div className="flex flex-col items-start gap-0.5">
        <span
          className={`px-2.5 py-0.5 text-xs text-white rounded-full whitespace-nowrap font-medium transition ${
            status === "assesment lapangan"
              ? "bg-purple-600 ring-2 ring-purple-300 ring-offset-1"
              : "bg-purple-500"
          }`}
        >
          assesment lapangan
        </span>
        <span className="text-xs text-gray-500 whitespace-nowrap pl-0.5">
          {rangeAssLapangan}
        </span>
      </div>
    </div>
  );
};

const renderKtsColumn = (row, navigate) => {
  const tAud1Ren = parseInt(
    row?.TotalTemuanAuditor1Renstra || row?.TotalTemuanAuditor1 || 0,
    10,
  );
  const tAud1Dok = parseInt(row?.TotalTemuanAuditor1Dokumen || 0, 10);

  const tAud2Ren = parseInt(row?.TotalTemuanAuditor2Renstra || 0, 10);
  const tAud2Dok = parseInt(row?.TotalTemuanAuditor2Dokumen || 0, 10);

  const belum = parseInt(row?.TotalKtsBelumDibuat || 0, 10);
  const draf = parseInt(row?.TotalKtsDraf || 0, 10);
  const menungguVerif = parseInt(row?.TotalKtsMenungguVerif || 0, 10);
  const terimaAuditee = parseInt(row?.TotalKtsTerimaAuditee || 0, 10);
  const tolakAuditee = parseInt(row?.TotalKtsTolakAuditee || 0, 10);
  const menungguPenyelesaian = parseInt(
    row?.TotalKtsMenungguPenyelesaian || 0,
    10,
  );
  const tindakanPenyelesaian = parseInt(
    row?.TotalKtsTindakanPenyelesaian || 0,
    10,
  );
  const tutup = parseInt(row?.TotalKtsTutup || 0, 10);

  const ktsStatusBadges = [
    {
      key: "belum",
      label: "Belum Buat",
      count: belum,
      activeColor: "bg-rose-500 text-white",
    },
    {
      key: "draf",
      label: "Draf",
      count: draf,
      activeColor: "bg-gray-600 text-white",
    },
    {
      key: "menunggu_verif",
      label: "Menunggu Verifikasi",
      count: menungguVerif,
      activeColor: "bg-amber-500 text-white",
    },
    {
      key: "terima_auditee",
      label: "Terima Auditee",
      count: terimaAuditee,
      activeColor: "bg-emerald-600 text-white",
    },
    {
      key: "tolak_auditee",
      label: "Tolak Auditee",
      count: tolakAuditee,
      activeColor: "bg-rose-600 text-white",
    },
    {
      key: "menunggu_penyelesaian",
      label: "Tunggu Penyelesaian",
      count: menungguPenyelesaian,
      activeColor: "bg-emerald-800 text-white",
    },
    {
      key: "tindakan_penyelesaian",
      label: "Tindakan Penyelesaian",
      count: tindakanPenyelesaian,
      activeColor: "bg-teal-600 text-white",
    },
    {
      key: "tutup",
      label: "Tutup KTS",
      count: tutup,
      activeColor: "bg-blue-600 text-white",
    },
  ];

  return (
    <div
      className="flex flex-col gap-1.5 items-start py-1 cursor-pointer group w-[320px] max-w-[320px]"
      onClick={() => row?.UUID && navigate && navigate(`/pusat_kts/${row.UUID}`)}
      title="Klik untuk membuka Pusat KTS"
    >
      {/* Temuan Auditor 1 */}
      <div className="flex flex-col gap-1 items-start w-full">
        <span className="text-[11px] font-semibold text-gray-700">
          Auditor 1:
        </span>
        <div className="flex items-center gap-1 flex-wrap text-xs">
          <span
            className={`px-2 py-0.5 text-xs rounded-full whitespace-nowrap font-medium transition ${
              tAud1Ren > 0
                ? "bg-sky-600 text-white"
                : "bg-gray-100 text-gray-600 border border-gray-200"
            }`}
            title="Temuan Renstra Nilai Auditor 1"
          >
            Renstra: {tAud1Ren}
          </span>
          <span
            className={`px-2 py-0.5 text-xs rounded-full whitespace-nowrap font-medium transition ${
              tAud1Dok > 0
                ? "bg-sky-600 text-white"
                : "bg-gray-100 text-gray-600 border border-gray-200"
            }`}
            title="Temuan Dokumen Tambahan Auditor 1"
          >
            Dokumen Tambahan: {tAud1Dok}
          </span>
        </div>
      </div>

      {/* Temuan Auditor 2 */}
      <div className="flex flex-col gap-1 items-start w-full">
        <span className="text-[11px] font-semibold text-gray-700">
          Auditor 2:
        </span>
        <div className="flex items-center gap-1 flex-wrap text-xs">
          <span
            className={`px-2 py-0.5 text-xs rounded-full whitespace-nowrap font-medium transition ${
              tAud2Ren > 0
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 border border-gray-200"
            }`}
            title="Temuan Renstra Nilai Auditor 2"
          >
            Renstra: {tAud2Ren}
          </span>
          <span
            className={`px-2 py-0.5 text-xs rounded-full whitespace-nowrap font-medium transition ${
              tAud2Dok > 0
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 border border-gray-200"
            }`}
            title="Temuan Dokumen Tambahan Auditor 2"
          >
            Dokumen Tambahan: {tAud2Dok}
          </span>
        </div>
      </div>

      {/* Informasi KTS: Status yang tersedia pada KTS */}
      <div className="flex flex-col gap-1 items-start w-full pt-1 border-t border-gray-100">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          KTS:
        </span>
        <div className="flex items-center gap-1 flex-wrap text-xs w-full max-w-[320px]">
          {ktsStatusBadges.map((badge) => (
            <span
              key={badge.key}
              className={`px-2 py-0.5 text-xs rounded-full whitespace-nowrap font-medium transition ${
                badge.count > 0
                  ? badge.activeColor
                  : "bg-gray-100 text-gray-500 border border-gray-200"
              }`}
              title={`${badge.label}: ${badge.count}`}
            >
              {badge.label}: {badge.count}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const ScheduleAuditPage = () => {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const tableRef = useRef(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const { addToast } = useToast();
  const { getValidToken } = useAuth();

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [auditFilters, setAuditFilters] = useState(initialAuditFilters);

  const [kodeAksesModal, setKodeAksesModal] = useState({
    open: false,
    row: null,
    kode: "",
    loading: false,
  });
  const [emailModal, setEmailModal] = useState({
    open: false,
    row: null,
    loading: false,
  });

  const handleSaveKodeAkses = async () => {
    if (!kodeAksesModal.row) return;
    try {
      setKodeAksesModal((prev) => ({ ...prev, loading: true }));
      const formData = new FormData();
      formData.append("kodeAkses", kodeAksesModal.kode || "");

      await apiClient.put(
        `/renstra/${kodeAksesModal.row.UUID}/code_access`,
        formData
      );

      addToast("success", "Kode akses berhasil diperbarui");
      setKodeAksesModal({ open: false, row: null, kode: "", loading: false });
      tableRef.current?.reload?.();
    } catch (err) {
      console.error("Gagal update kode akses:", err);
      addToast("error", err?.message || "Gagal memperbarui kode akses");
      setKodeAksesModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const activeFilterCount = Object.values(auditFilters).filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0;

  const filterFn = React.useCallback(
    (row) => {
      if (!hasActiveFilters) return true;

      // 1. Status Auditor 1 terhadap Renstra
      if (auditFilters.statusAuditor1Renstra) {
        const s = getAuditorRenstraStatus(row.Auditor1, row.Catatan1, row).text;
        if (!s.startsWith(auditFilters.statusAuditor1Renstra)) {
          return false;
        }
      }

      // 2. Status Auditor 1 terhadap Dokumen Tambahan
      if (auditFilters.statusAuditor1Dokumen) {
        const s = getAuditorDokumenStatus(row.Auditor1, row.Catatan1, row).text;
        if (!s.startsWith(auditFilters.statusAuditor1Dokumen)) {
          return false;
        }
      }

      // 3. Status Auditor 2 terhadap Renstra
      if (auditFilters.statusAuditor2Renstra) {
        const s = getAuditorRenstraStatus(row.Auditor2, row.Catatan2, row).text;
        if (!s.startsWith(auditFilters.statusAuditor2Renstra)) {
          return false;
        }
      }

      // 4. Status Auditor 2 Dokumen Tambahan
      if (auditFilters.statusAuditor2Dokumen) {
        const s = getAuditorDokumenStatus(row.Auditor2, row.Catatan2, row).text;
        if (!s.startsWith(auditFilters.statusAuditor2Dokumen)) {
          return false;
        }
      }

      // 5. Status Jadwal
      if (auditFilters.statusJadwal) {
        const rowStatus = (row.StatusJadwal || "").toLowerCase().trim();
        const targetStatus = auditFilters.statusJadwal.toLowerCase().trim();
        if (rowStatus !== targetStatus) {
          return false;
        }
      }

      // 6. Temuan KTS (belum lengkap, lengkap, belum buat, status lainnya)
      if (auditFilters.temuanKts) {
        const tAud1Ren = parseInt(
          row?.TotalTemuanAuditor1Renstra || row?.TotalTemuanAuditor1 || 0,
          10,
        );
        const tAud1Dok = parseInt(row?.TotalTemuanAuditor1Dokumen || 0, 10);
        const tAud1 = tAud1Ren + tAud1Dok;

        const tAud2Ren = parseInt(row?.TotalTemuanAuditor2Renstra || 0, 10);
        const tAud2Dok = parseInt(row?.TotalTemuanAuditor2Dokumen || 0, 10);
        const tAud2 = parseInt(
          row?.TotalTemuanAuditor2 || tAud2Ren + tAud2Dok,
          10,
        );
        const totalTemuan = tAud1 + tAud2;

        const belum = parseInt(row?.TotalKtsBelumDibuat || 0, 10);
        const draf = parseInt(row?.TotalKtsDraf || 0, 10);
        const proses = parseInt(row?.TotalKtsProses || 0, 10);
        const tutup = parseInt(row?.TotalKtsTutup || 0, 10);
        const totalKts = parseInt(row?.TotalKts || draf + proses + tutup, 10);

        if (auditFilters.temuanKts === "belum_buat") {
          const isBelumBuat =
            (totalTemuan > 0 && totalKts === 0) || (belum > 0 && totalKts === 0);
          if (!isBelumBuat) return false;
        } else if (auditFilters.temuanKts === "belum_lengkap") {
          const isBelumLengkap = (belum > 0 && totalKts > 0) || draf > 0;
          if (!isBelumLengkap) return false;
        } else if (auditFilters.temuanKts === "lengkap") {
          const isLengkap = totalTemuan > 0 && belum === 0 && draf === 0;
          if (!isLengkap) return false;
        } else if (auditFilters.temuanKts === "status_lainnya") {
          const isStatusLainnya = proses > 0 || tutup > 0;
          if (!isStatusLainnya) return false;
        } else if (auditFilters.temuanKts === "draf") {
          if (draf === 0) return false;
        } else if (auditFilters.temuanKts === "menunggu_verif") {
          const mv = parseInt(row?.TotalKtsMenungguVerif || 0, 10);
          if (mv === 0) return false;
        } else if (auditFilters.temuanKts === "terima_auditee") {
          const ta = parseInt(row?.TotalKtsTerimaAuditee || 0, 10);
          if (ta === 0) return false;
        } else if (auditFilters.temuanKts === "tolak_auditee") {
          const tola = parseInt(row?.TotalKtsTolakAuditee || 0, 10);
          if (tola === 0) return false;
        } else if (auditFilters.temuanKts === "menunggu_penyelesaian") {
          const mp = parseInt(row?.TotalKtsMenungguPenyelesaian || 0, 10);
          if (mp === 0) return false;
        } else if (auditFilters.temuanKts === "tindakan_penyelesaian") {
          const tp = parseInt(row?.TotalKtsTindakanPenyelesaian || 0, 10);
          if (tp === 0) return false;
        } else if (auditFilters.temuanKts === "tutup_kts") {
          if (tutup === 0) return false;
        }
      }

      return true;
    },
    [hasActiveFilters, auditFilters],
  );

  const deleteData = async () => {
    if (!selectedRow?.UUID) return;

    try {
      await apiClient.delete(`/renstra/${selectedRow.UUID}`);
      addToast("success", "Data berhasil dihapus");
    } catch (err) {
      addToast("error", err?.message || "Data tidak ditemukan");
    } finally {
      setConfirmDelete(false);
      tableRef.current?.reload?.({ resetPage: true });
    }
  };

  const { level, listLevel, setLevel, openChangeLevel, setOpenChangeLevel } =
    useContent();

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
              setLevel(val);
              setOpenChangeLevel(false);
            }}
          />
        )}
      />
      <div className="p-4 sm:p-6 bg-gray-50 min-h-screen space-y-4 w-full min-w-0 max-w-full">
        <PageHeader
          icon={CalendarClock}
          title="Schedule Audit"
          subtitle="Kelola jadwal penugasan auditor, auditee, dan progres evaluasi audit mutu"
        />

        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap mb-3 px-3 py-2 bg-purple-50/70 border border-purple-200 rounded-lg text-xs text-gray-700">
            <span className="font-semibold text-purple-900 flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5" /> Filter Aktif:
            </span>
            {auditFilters.statusAuditor1Renstra && (
              <span className="inline-flex items-center gap-1 bg-white border border-purple-200 text-purple-800 px-2 py-0.5 rounded-full font-medium shadow-2xs">
                Auditor 1 (Renstra): {auditFilters.statusAuditor1Renstra}
                <button
                  type="button"
                  onClick={() =>
                    setAuditFilters((prev) => ({
                      ...prev,
                      statusAuditor1Renstra: "",
                    }))
                  }
                  className="text-gray-400 hover:text-purple-900"
                  aria-label="Hapus filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {auditFilters.statusAuditor1Dokumen && (
              <span className="inline-flex items-center gap-1 bg-white border border-purple-200 text-purple-800 px-2 py-0.5 rounded-full font-medium shadow-2xs">
                Auditor 1 (Dokumen): {auditFilters.statusAuditor1Dokumen}
                <button
                  type="button"
                  onClick={() =>
                    setAuditFilters((prev) => ({
                      ...prev,
                      statusAuditor1Dokumen: "",
                    }))
                  }
                  className="text-gray-400 hover:text-purple-900"
                  aria-label="Hapus filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {auditFilters.statusAuditor2Renstra && (
              <span className="inline-flex items-center gap-1 bg-white border border-purple-200 text-purple-800 px-2 py-0.5 rounded-full font-medium shadow-2xs">
                Auditor 2 (Renstra): {auditFilters.statusAuditor2Renstra}
                <button
                  type="button"
                  onClick={() =>
                    setAuditFilters((prev) => ({
                      ...prev,
                      statusAuditor2Renstra: "",
                    }))
                  }
                  className="text-gray-400 hover:text-purple-900"
                  aria-label="Hapus filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {auditFilters.statusAuditor2Dokumen && (
              <span className="inline-flex items-center gap-1 bg-white border border-purple-200 text-purple-800 px-2 py-0.5 rounded-full font-medium shadow-2xs">
                Auditor 2 (Dokumen): {auditFilters.statusAuditor2Dokumen}
                <button
                  type="button"
                  onClick={() =>
                    setAuditFilters((prev) => ({
                      ...prev,
                      statusAuditor2Dokumen: "",
                    }))
                  }
                  className="text-gray-400 hover:text-purple-900"
                  aria-label="Hapus filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {auditFilters.statusJadwal && (
              <span className="inline-flex items-center gap-1 bg-white border border-purple-200 text-purple-800 px-2 py-0.5 rounded-full font-medium shadow-2xs">
                Status Jadwal: {auditFilters.statusJadwal}
                <button
                  type="button"
                  onClick={() =>
                    setAuditFilters((prev) => ({ ...prev, statusJadwal: "" }))
                  }
                  className="text-gray-400 hover:text-purple-900"
                  aria-label="Hapus filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {auditFilters.temuanKts && (
              <span className="inline-flex items-center gap-1 bg-white border border-purple-200 text-purple-800 px-2 py-0.5 rounded-full font-medium shadow-2xs">
                Temuan KTS: {auditFilters.temuanKts.replace(/_/g, " ")}
                <button
                  type="button"
                  onClick={() =>
                    setAuditFilters((prev) => ({ ...prev, temuanKts: "" }))
                  }
                  className="text-gray-400 hover:text-purple-900"
                  aria-label="Hapus filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={() => setAuditFilters(initialAuditFilters)}
              className="text-xs text-red-600 hover:text-red-700 underline font-medium ml-auto"
            >
              Reset Semua
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs w-full min-w-0 max-w-full overflow-hidden">
          <RemoteTable
            ref={tableRef}
            endpoint="/renstras"
            mode="sse"
            token={getValidToken()}
            adapter={ScheduleAuditAdapter}
            filterFn={filterFn}
            onError={(err) => {
              console.error("TABLE ERROR:", err);
            }}
            renderAddAction={
              <div className="flex items-center gap-2 shrink-0">
                <Tooltip content="Filter Jadwal Audit">
                  <button
                    type="button"
                    className={`relative w-9 h-9 border rounded-lg flex items-center justify-center transition shadow-xs shrink-0 ${
                      hasActiveFilters
                        ? "bg-purple-50 border-purple-400 text-purple-700 font-semibold"
                        : "bg-white border-gray-300 hover:bg-gray-50 text-gray-700 hover:text-gray-900"
                    }`}
                    onClick={() => setIsFilterOpen(true)}
                    aria-label="Filter Jadwal Audit"
                  >
                    <Filter className="w-4 h-4" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-purple-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </Tooltip>

                <Tooltip content="Tambah Jadwal Audit">
                  <button
                    type="button"
                    className="w-9 h-9 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center transition shadow-xs shrink-0"
                    onClick={() => navigate("/schedule_audit/new")}
                    aria-label="Tambah Jadwal Audit"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </Tooltip>
              </div>
            }
            listcolumns={[
              { key: "Tahun", label: "Tahun", searchable: true },
              {
                key: "FakultasUnit",
                label: "Target Audit",
                searchable: true,
                renderKey: (row) => renderLabelFakultasUnit(row),
              },
              { key: "Type", label: "Tipe", searchable: true },
              { key: "Jenjang", label: "Jenjang", searchable: true },
              { key: "Auditee", label: "Auditee", searchable: true },
              {
                key: "StatusAuditee",
                label: "Status Auditee",
                searchable: false,
                renderKey: (row) => renderStatusAuditee(row),
              },
              { key: "Auditor1", label: "Auditor 1", searchable: true },
              {
                key: "StatusAuditor1",
                label: "Status Auditor 1",
                searchable: false,
                renderKey: (row) =>
                  renderStatusAuditor(row.Auditor1, row.Catatan1, row),
              },
              { key: "Auditor2", label: "Auditor 2", searchable: true },
              {
                key: "StatusAuditor2",
                label: "Status Auditor 2",
                searchable: false,
                renderKey: (row) =>
                  renderStatusAuditor(row.Auditor2, row.Catatan2, row),
              },
              {
                key: "Kts",
                label: "KTS",
                searchable: false,
                width: "320px",
                className: "w-[320px] max-w-[320px]",
                renderKey: (row) => renderKtsColumn(row, navigate),
              },
              { key: "KodeAkses", label: "Kode Akses", searchable: false },
              {
                key: "StatusJadwal",
                label: "Status Jadwal",
                searchable: false,
                width: "280px",
                minWidth: "260px",
                className: "min-w-[260px]",
                renderKey: (row) => renderStatusJadwal(row),
              },
            ]}
            renderAction={({ row, close }) => (
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:text-purple-700 hover:bg-purple-50/80 rounded-xl transition-all cursor-pointer text-left group"
                  onClick={() => {
                    setKodeAksesModal({
                      open: true,
                      row,
                      kode: row.KodeAkses || "",
                      loading: false,
                    });
                    close();
                  }}
                >
                  <KeyRound className="w-4 h-4 text-purple-600 shrink-0 group-hover:scale-110 transition-transform" />
                  <span>Atur Kode Akses</span>
                </button>

                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:text-sky-700 hover:bg-sky-50/80 rounded-xl transition-all cursor-pointer text-left group"
                  onClick={() => {
                    setEmailModal({
                      open: true,
                      row,
                      loading: false,
                    });
                    close();
                  }}
                >
                  <Mail className="w-4 h-4 text-sky-600 shrink-0 group-hover:scale-110 transition-transform" />
                  <span>Kirim Email</span>
                </button>

                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:text-emerald-700 hover:bg-emerald-50/80 rounded-xl transition-all cursor-pointer text-left group"
                  onClick={() => {
                    navigate(`/pusat_kts/${row.UUID}`);
                    close();
                  }}
                >
                  <FileText className="w-4 h-4 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
                  <span>KTS</span>
                </button>

                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:text-amber-700 hover:bg-amber-50/80 rounded-xl transition-all cursor-pointer text-left group"
                  onClick={() => {
                    navigate(`/schedule_audit/edit/${row.UUID}`);
                    close();
                  }}
                >
                  <Pencil className="w-4 h-4 text-amber-600 shrink-0 group-hover:scale-110 transition-transform" />
                  <span>Edit</span>
                </button>

                <div className="my-1 border-t border-gray-150" />

                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50/80 rounded-xl transition-all cursor-pointer text-left group"
                  onClick={() => {
                    setSelectedRow(row);
                    setConfirmDelete(true);
                    close();
                  }}
                >
                  <Trash2 className="w-4 h-4 text-rose-500 shrink-0 group-hover:scale-110 transition-transform" />
                  <span>Hapus</span>
                </button>
              </div>
            )}
          />
        </div>

        {/* MODAL ATUR KODE AKSES */}
        {kodeAksesModal.open && kodeAksesModal.row && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100">
              <div className="p-5 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Atur Kode Akses</h3>
                    <p className="text-xs text-gray-500">
                      {kodeAksesModal.row.FakultasUnit} ({kodeAksesModal.row.Tahun})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setKodeAksesModal({ open: false, row: null, kode: "", loading: false })}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Kode Akses Jadwal Audit
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={kodeAksesModal.kode}
                      onChange={(e) =>
                        setKodeAksesModal((prev) => ({ ...prev, kode: e.target.value }))
                      }
                      placeholder="Masukkan kode akses..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-600 font-mono tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                        setKodeAksesModal((prev) => ({ ...prev, kode: randomCode }));
                      }}
                      className="px-3 py-2 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition whitespace-nowrap cursor-pointer"
                      title="Generate kode unik otomatis"
                    >
                      Acak
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    Kode akses digunakan oleh Auditee/Auditor untuk validasi pengisian data.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setKodeAksesModal({ open: false, row: null, kode: "", loading: false })}
                  disabled={kodeAksesModal.loading}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveKodeAkses}
                  disabled={kodeAksesModal.loading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {kodeAksesModal.loading && (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>Simpan Kode Akses</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL KIRIM EMAIL */}
        {emailModal.open && emailModal.row && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100">
              <div className="p-5 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Kirim Notifikasi Email</h3>
                    <p className="text-xs text-gray-500">
                      {emailModal.row.FakultasUnit} ({emailModal.row.Tahun})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailModal({ open: false, row: null, loading: false })}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-3 text-xs text-gray-600">
                <p>Notifikasi email jadwal audit akan dikirimkan kepada pihak terkait:</p>
                <div className="space-y-2 p-3 bg-gray-50 rounded-xl border border-gray-150">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Auditee:</span>
                    <span className="font-semibold text-gray-800">{emailModal.row.Auditee || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Auditor 1:</span>
                    <span className="font-semibold text-gray-800">{emailModal.row.Auditor1 || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Auditor 2:</span>
                    <span className="font-semibold text-gray-800">{emailModal.row.Auditor2 || "-"}</span>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400">
                  Email berisi informasi rentang tanggal jadwal dan petunjuk pelaksanaan AMI.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEmailModal({ open: false, row: null, loading: false })}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setEmailModal((prev) => ({ ...prev, loading: true }));
                    await new Promise((r) => setTimeout(r, 600));
                    addToast("success", `Notifikasi email untuk ${emailModal.row.FakultasUnit} berhasil diproses`);
                    setEmailModal({ open: false, row: null, loading: false });
                  }}
                  disabled={emailModal.loading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 rounded-xl hover:bg-sky-700 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {emailModal.loading && (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>Kirim Sekarang</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmDeleteDialog
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => deleteData()}
        />

        <ScheduleAuditFilterDrawer
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          filters={auditFilters}
          onApply={(newFilters) => setAuditFilters(newFilters)}
          onReset={() => setAuditFilters(initialAuditFilters)}
        />
      </div>
    </>
  );
};

export default ScheduleAuditPage;

export const ScheduleAuditAdapter = (rows = []) => {
  const now = new Date();

  const parseStart = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  };

  const parseEnd = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(
      dateStr.includes("T") ? dateStr : `${dateStr}T23:59:59.999`,
    );
    return isNaN(d.getTime()) ? null : d;
  };

  const inRange = (startStr, endStr) => {
    const start = parseStart(startStr);
    const end = parseEnd(endStr);
    if (!start || !end) return false;
    return now >= start && now <= end;
  };

  const isPast = (dateStr) => {
    const end = parseEnd(dateStr);
    if (!end) return false;
    return now > end;
  };

  const overlap = (aStart, aEnd, bStart, bEnd) => {
    const aS = parseStart(aStart);
    const aE = parseEnd(aEnd);
    const bS = parseStart(bStart);
    const bE = parseEnd(bEnd);
    if (!aS || !aE || !bS || !bE) return false;
    return aS <= bE && bS <= aE;
  };

  const formatDate = (d) => {
    if (!d) return null;
    const clean = d.includes("T") ? d.split("T")[0] : d.split(" ")[0];
    const parts = clean.split("-");
    if (parts.length === 3) {
      const parsed = new Date(
        parseInt(parts[0], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[2], 10),
      );
      return parsed.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    }
    return new Date(d).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return rows.map((r) => {
    const uploadRange = inRange(r.PeriodeUploadMulai, r.PeriodeUploadAkhir);

    const dokumenRange = inRange(
      r.PeriodeAssesmentDokumenMulai,
      r.PeriodeAssesmentDokumenAkhir,
    );

    const lapanganRange = inRange(
      r.PeriodeAssesmentLapanganMulai,
      r.PeriodeAssesmentLapanganAkhir,
    );

    const isAuditEnded = isPast(r.PeriodeAssesmentLapanganAkhir);

    const bentrok =
      overlap(
        r.PeriodeUploadMulai,
        r.PeriodeUploadAkhir,
        r.PeriodeAssesmentDokumenMulai,
        r.PeriodeAssesmentDokumenAkhir,
      ) ||
      overlap(
        r.PeriodeUploadMulai,
        r.PeriodeUploadAkhir,
        r.PeriodeAssesmentLapanganMulai,
        r.PeriodeAssesmentLapanganAkhir,
      ) ||
      overlap(
        r.PeriodeAssesmentDokumenMulai,
        r.PeriodeAssesmentDokumenAkhir,
        r.PeriodeAssesmentLapanganMulai,
        r.PeriodeAssesmentLapanganAkhir,
      );

    let StatusJadwal = "belum mulai audit";
    let TanggalMulaiJadwal = r.PeriodeUploadMulai;
    let TanggalAkhirJadwal = r.PeriodeAssesmentLapanganAkhir;

    if (bentrok) {
      StatusJadwal = "jadwal bentrok";
      TanggalMulaiJadwal = r.PeriodeUploadMulai;
      TanggalAkhirJadwal = r.PeriodeAssesmentLapanganAkhir;
    } else if (isAuditEnded) {
      StatusJadwal = "audit telah berakhir";
      TanggalMulaiJadwal = r.PeriodeUploadMulai;
      TanggalAkhirJadwal = r.PeriodeAssesmentLapanganAkhir;
    } else if (lapanganRange) {
      StatusJadwal = "assesment lapangan";
      TanggalMulaiJadwal = r.PeriodeAssesmentLapanganMulai;
      TanggalAkhirJadwal = r.PeriodeAssesmentLapanganAkhir;
    } else if (dokumenRange) {
      StatusJadwal = "assesment dokumen";
      TanggalMulaiJadwal = r.PeriodeAssesmentDokumenMulai;
      TanggalAkhirJadwal = r.PeriodeAssesmentDokumenAkhir;
    } else if (uploadRange) {
      StatusJadwal = "upload dokumen";
      TanggalMulaiJadwal = r.PeriodeUploadMulai;
      TanggalAkhirJadwal = r.PeriodeUploadAkhir;
    } else if (
      isPast(r.PeriodeAssesmentDokumenAkhir) &&
      !isPast(r.PeriodeAssesmentLapanganMulai)
    ) {
      StatusJadwal = "assesment dokumen";
      TanggalMulaiJadwal = r.PeriodeAssesmentDokumenMulai;
      TanggalAkhirJadwal = r.PeriodeAssesmentDokumenAkhir;
    } else if (
      isPast(r.PeriodeUploadAkhir) &&
      !isPast(r.PeriodeAssesmentDokumenMulai)
    ) {
      StatusJadwal = "upload dokumen";
      TanggalMulaiJadwal = r.PeriodeUploadMulai;
      TanggalAkhirJadwal = r.PeriodeUploadAkhir;
    } else {
      StatusJadwal = "belum mulai audit";
      TanggalMulaiJadwal = r.PeriodeUploadMulai;
      TanggalAkhirJadwal = r.PeriodeAssesmentLapanganAkhir;
    }

    const tglMulaiFmt = formatDate(TanggalMulaiJadwal);
    const tglAkhirFmt = formatDate(TanggalAkhirJadwal);
    let RentangTanggalJadwal = "";
    if (tglMulaiFmt && tglAkhirFmt) {
      RentangTanggalJadwal =
        tglMulaiFmt === tglAkhirFmt ? tglMulaiFmt : `${tglMulaiFmt} - ${tglAkhirFmt}`;
    } else if (tglMulaiFmt) {
      RentangTanggalJadwal = tglMulaiFmt;
    } else if (tglAkhirFmt) {
      RentangTanggalJadwal = tglAkhirFmt;
    }

    return {
      ...r,
      StatusJadwal,
      RentangTanggalJadwal,
      TanggalMulaiJadwalFmt: tglMulaiFmt,
      TanggalAkhirJadwalFmt: tglAkhirFmt,

      // field tanggal terformat (field baru)
      PeriodeUploadMulaiFmt: formatDate(r.PeriodeUploadMulai),
      PeriodeUploadAkhirFmt: formatDate(r.PeriodeUploadAkhir),

      PeriodeAssesmentDokumenMulaiFmt: formatDate(
        r.PeriodeAssesmentDokumenMulai,
      ),
      PeriodeAssesmentDokumenAkhirFmt: formatDate(
        r.PeriodeAssesmentDokumenAkhir,
      ),

      PeriodeAssesmentLapanganMulaiFmt: formatDate(
        r.PeriodeAssesmentLapanganMulai,
      ),
      PeriodeAssesmentLapanganAkhirFmt: formatDate(
        r.PeriodeAssesmentLapanganAkhir,
      ),
    };
  });
};
