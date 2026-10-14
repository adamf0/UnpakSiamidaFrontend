import React, { useRef, useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import RemoteTable from "@/Components/RemoteTable";
import ProkerV3FormModal from "./ProkerV3FormModal";
import ProkerV3AktivitasModal from "./ProkerV3AktivitasModal";
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
  Upload,
  FileText,
} from "lucide-react";

export default function ProkerV3Page() {
  const { getValidToken, user } = useAuth();
  const { addToast } = useToast();
  const { level, setLevel, listLevel } = useContent();

  const isAdmin = level === "admin" || user?.level === "admin";
  const tableRef = useRef(null);

  // Modal States
  const [openChangeLevel, setOpenChangeLevel] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState("create");
  const [selectedRow, setSelectedRow] = useState(null);

  const [aktivitasModalOpen, setAktivitasModalOpen] = useState(false);
  const [selectedProkerUuid, setSelectedProkerUuid] = useState(null);

  const [confirmDelete, setConfirmDelete] = useState(false);

  // Filters State
  const [selectedTahun, setSelectedTahun] = useState("all");
  const [selectedTahunObj, setSelectedTahunObj] = useState({
    id: "all",
    tahun: "all",
    label: "Semua Tahun",
    name: "Semua Tahun",
  });

  const [selectedUnit, setSelectedUnit] = useState("all");
  const [selectedUnitObj, setSelectedUnitObj] = useState(null);

  // Master Options
  const [unitOptions, setUnitOptions] = useState([]);
  const [tahunOptions, setTahunOptions] = useState([]);
  const [standarOptions, setStandarOptions] = useState([]);
  const [indikatorOptions, setIndikatorOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // User's matched unit info
  const userUnitData = useMemo(() => {
    if (isAdmin) return null;
    const userFU = user?.fakultas_unit || user?.id_fakultas_unit;
    if (!userFU) return null;
    return unitOptions.find(
      (u) =>
        String(u.id) === String(userFU) ||
        String(u.uuid) === String(userFU) ||
        String(u.nama).toLowerCase() === String(userFU).toLowerCase()
    );
  }, [isAdmin, user, unitOptions]);

  // Fetch Master Options
  const fetchOptions = async () => {
    setLoadingOptions(true);
    try {
      const res = await apiClient.get("/proker_v3_options");
      const data = res.data;
      const units = (data.units || []).map((u) => ({
        ...u,
        label: u.nama,
        name: u.nama,
      }));
      setUnitOptions(units);

      const tahuns = [
        { id: "all", tahun: "all", label: "Semua Tahun", name: "Semua Tahun" },
        ...(data.tahuns || []).map((t) => ({
          ...t,
          label: String(t.tahun),
          name: String(t.tahun),
        })),
      ];
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

    if (selectedTahun && selectedTahun !== "all") {
      params.append("filter_tahun", selectedTahun);
    }

    if (isAdmin) {
      if (selectedUnit && selectedUnit !== "all") {
        params.append("filter_fakultas_unit", selectedUnit);
      }
    } else {
      const unitVal = user?.id_fakultas_unit || user?.fakultas_unit;
      if (unitVal) {
        params.append("filter_fakultas_unit", String(unitVal));
      }
    }

    const qs = params.toString();
    return `/proker_v3s${qs ? `?${qs}` : ""}`;
  }, [selectedTahun, selectedUnit, isAdmin, user]);

  const openCreate = () => {
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
      key: "status",
      label: "Status Proker",
      width: "140px",
      renderKey: (r) => {
        const s = (r.Status || "draft").toLowerCase();

        // Admin: Dropdown changer
        if (isAdmin) {
          return (
            <select
              value={s}
              onChange={(e) => handleUpdateStatus(r, e.target.value)}
              className={`text-[11px] font-bold rounded-lg px-2 py-1 border cursor-pointer outline-none transition uppercase tracking-wider ${
                s === "disetujui"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : s === "diajukan"
                  ? "bg-blue-50 text-blue-800 border-blue-300"
                  : s === "selesai"
                  ? "bg-purple-50 text-purple-800 border-purple-300"
                  : "bg-gray-100 text-gray-700 border-gray-300"
              }`}
              title="Ubah status program kerja (Hak Admin)"
            >
              <option value="draft">DRAF</option>
              <option value="diajukan">DIAJUKAN</option>
              <option value="disetujui">DISETUJUI</option>
              <option value="selesai">SELESAI</option>
            </select>
          );
        }

        // Auditee: only draft <-> diajukan toggle button
        if (s === "diajukan") {
          return (
            <div className="flex flex-col gap-1 items-start">
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border border-blue-200 bg-blue-50 text-blue-700 uppercase tracking-wider">
                DIAJUKAN
              </span>
              <button
                type="button"
                onClick={() => handleUpdateStatus(r, "draft")}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 transition cursor-pointer"
                title="Batalkan pengajuan dan kembalikan ke Draf untuk diedit"
              >
                <RotateCcw className="w-2.5 h-2.5 text-gray-500" />
                <span>Batal Ajukan</span>
              </button>
            </div>
          );
        }

        if (s === "disetujui") {
          return (
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200 bg-emerald-50 text-emerald-700 uppercase tracking-wider">
              DISETUJUI
            </span>
          );
        }

        if (s === "selesai") {
          return (
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border border-purple-200 bg-purple-50 text-purple-700 uppercase tracking-wider">
              SELESAI
            </span>
          );
        }

        // Auditee Draf state
        return (
          <div className="flex flex-col gap-1 items-start">
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border border-gray-200 bg-gray-100 text-gray-700 uppercase tracking-wider">
              DRAF
            </span>
            <button
              type="button"
              onClick={() => handleUpdateStatus(r, "diajukan")}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition cursor-pointer"
              title="Ajukan program kerja ke pimpinan/admin"
            >
              <Send className="w-2.5 h-2.5" />
              <span>Ajukan</span>
            </button>
          </div>
        );
      },
    },
    {
      key: "aksi",
      label: "Aksi",
      width: "140px",
      renderKey: (r) => (
        <div className="flex items-center gap-1.5">
          <Tooltip title="Edit Matriks Program Kerja">
            <button
              type="button"
              onClick={() => openEdit(r)}
              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition cursor-pointer"
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
              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </Tooltip>
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
              setLevel(val);
              setOpenChangeLevel(false);
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
            <button
              type="button"
              onClick={openCreate}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Program Kerja</span>
            </button>
          }
        />

        {/* Status Role & Scoping Notification Banner */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider text-gray-500">
                  Lingkup Akses:
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    isAdmin
                      ? "bg-indigo-100 text-indigo-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {isAdmin ? "Admin (Semua Unit)" : "Auditee Unit Terbatas"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-700 font-medium mt-0.5">
                {isAdmin
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
            <div className="w-40 min-w-[130px]">
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

            {/* Filter Unit (Only Admin) */}
            {isAdmin && (
              <div className="w-64 min-w-[180px]">
                <SearchSelect
                  options={[
                    { id: "all", uuid: "all", label: "Semua Unit / Fakultas", nama: "Semua Unit / Fakultas" },
                    ...unitOptions,
                  ]}
                  value={selectedUnitObj}
                  onChange={(val) => {
                    setSelectedUnitObj(val);
                    setSelectedUnit(val ? String(val.id || val.uuid) : "all");
                  }}
                  placeholder="Semua Unit Kerja"
                  icon={Building2}
                />
              </div>
            )}
          </div>
        </div>

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
            emptyMessage="Belum ada program kerja yang tercatat untuk filter ini."
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
    </>
  );
}
