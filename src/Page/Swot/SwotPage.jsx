import React, { useRef, useState, useEffect, useMemo } from "react";
import RemoteTable from "@/Components/RemoteTable";
import SwotFormModal from "./SwotFormModal";
import ConfirmDeleteDialog from "@/Components/ConfirmDeleteDialog";
import SearchSelect from "@/Components/SearchSelect";
import { useToast } from "@/Providers/ToastProvider";
import { useContent } from "@/Providers/ContentProvider";
import { useAuth } from "@/Providers/AuthProvider";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import PageHeader from "@/Components/PageHeader";
import Tooltip from "@/Components/Tooltip";
import { isEmpty, throwIfResponseNotOk } from "@/Common/Utils";
import { apiClient } from "@/Common/api";
import {
  Plus,
  Pencil,
  Trash2,
  PieChart,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  AlertCircle,
  Building2,
  Calendar,
  Filter,
  CheckCircle2,
  Layers,
  RotateCcw,
} from "lucide-react";

const KATEGORI_CONFIG = {
  Kekuatan: {
    label: "Kekuatan (Strengths)",
    short: "S",
    bgBadge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cardBg: "bg-gradient-to-br from-emerald-500/10 via-emerald-50 to-white border-emerald-200 text-emerald-900",
    iconColor: "text-emerald-600",
    icon: ShieldCheck,
  },
  Kelemahan: {
    label: "Kelemahan (Weaknesses)",
    short: "W",
    bgBadge: "bg-rose-50 text-rose-700 border-rose-200",
    cardBg: "bg-gradient-to-br from-rose-500/10 via-rose-50 to-white border-rose-200 text-rose-900",
    iconColor: "text-rose-600",
    icon: AlertCircle,
  },
  Peluang: {
    label: "Peluang (Opportunities)",
    short: "O",
    bgBadge: "bg-blue-50 text-blue-700 border-blue-200",
    cardBg: "bg-gradient-to-br from-blue-500/10 via-blue-50 to-white border-blue-200 text-blue-900",
    iconColor: "text-blue-600",
    icon: TrendingUp,
  },
  Ancaman: {
    label: "Ancaman (Threats)",
    short: "T",
    bgBadge: "bg-amber-50 text-amber-700 border-amber-200",
    cardBg: "bg-gradient-to-br from-amber-500/10 via-amber-50 to-white border-amber-200 text-amber-900",
    iconColor: "text-amber-600",
    icon: AlertTriangle,
  },
};

const SwotPage = () => {
  const tableRef = useRef(null);
  const { addToast } = useToast();
  const { getValidToken, user } = useAuth();
  const {
    level,
    listLevel,
    setLevel,
    openChangeLevel,
    setOpenChangeLevel,
  } = useContent();

  const isAdmin = level === "admin" || user?.level === "admin";

  // Filter States
  const [selectedTahun, setSelectedTahun] = useState("");
  const [selectedTahunObj, setSelectedTahunObj] = useState(null);
  const [selectedFakultas, setSelectedFakultas] = useState("");
  const [selectedFakultasObj, setSelectedFakultasObj] = useState(null);
  const [selectedKategori, setSelectedKategori] = useState("");

  // Options Lists
  const [tahunList, setTahunList] = useState([]);
  const [fakultasList, setFakultasList] = useState([]);
  const [userUnitData, setUserUnitData] = useState(null);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("new");
  const [selectedRow, setSelectedRow] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Fetch Options
  useEffect(() => {
    const fetchMetadata = async () => {
      const token = getValidToken();
      if (isEmpty(token)) return;

      try {
        // Fetch Tahun
        const resTahun = await apiClient.get("/tahunprokers?mode=all");
        const jsonTahun = resTahun.data;
        setTahunList(Array.isArray(jsonTahun) ? jsonTahun : []);

        // Fetch Unit List (All for admin, or finding user's unit name for auditee)
        const resFu = await apiClient.get("/fakultasunits?mode=all");
        const jsonFu = resFu.data;
        const list = Array.isArray(jsonFu) ? jsonFu : [];
        setFakultasList(list);

          // Cari unit milik user auditee
          if (user?.fakultas_unit) {
            const myUnit = list.find(
              (u) =>
                u.UUID === user.fakultas_unit ||
                String(u.ID) === String(user.fakultas_unit)
            );
            if (myUnit) {
              setUserUnitData({
                id: myUnit.UUID,
                UUID: myUnit.UUID,
                rawId: myUnit.ID,
                nama: `${myUnit.Nama || ""}${
                  myUnit.Jenjang ? ` (${myUnit.Jenjang})` : ""
                }`.trim(),
              });
            }
          }
      } catch (err) {
        console.error("Gagal mengambil master data filter:", err);
      }
    };

    fetchMetadata();
  }, [getValidToken, user?.fakultas_unit]);

  // Mapped Options for SearchSelect Filters
  const tahunOptions = useMemo(() => {
    return (tahunList || []).map((t) => ({
      id: String(t.Tahun || t.UUID || t.id),
      UUID: t.UUID,
      nama: String(t.Tahun),
      ...t,
    }));
  }, [tahunList]);

  const fakultasOptions = useMemo(() => {
    return (fakultasList || []).map((fu) => ({
      id: fu.UUID,
      UUID: fu.UUID,
      rawId: fu.ID,
      nama: `${fu.Nama || ""}${fu.Jenjang ? ` (${fu.Jenjang})` : ""}`.trim(),
      ...fu,
    }));
  }, [fakultasList]);

  // Construct Dynamic RemoteTable Endpoint
  const tableEndpoint = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedTahun && selectedTahun !== "all") {
      params.append("filter_tahun", selectedTahun);
    }
    if (selectedKategori && selectedKategori !== "all") {
      params.append("filter_kategori", selectedKategori);
    }

    if (isAdmin) {
      if (selectedFakultas && selectedFakultas !== "all") {
        params.append("filter_fakultas_unit", selectedFakultas);
      }
    } else {
      // Non-admin (auditee): lock to own unit
      if (user?.fakultas_unit) {
        params.append("filter_fakultas_unit", String(user.fakultas_unit));
      }
    }

    const qs = params.toString();
    return `/swots${qs ? `?${qs}` : ""}`;
  }, [selectedTahun, selectedKategori, selectedFakultas, isAdmin, user?.fakultas_unit]);

  const openNew = () => {
    setModalMode("new");
    setSelectedRow(null);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setModalMode("edit");
    setSelectedRow(row);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedRow?.UUID) return;

    try {
      await apiClient.delete(`/swot/${selectedRow.UUID}`);
      addToast("success", "Berhasil menghapus analisis SWOT");
    } catch (err) {
      addToast(
        "error",
        err?.message || "Gagal menghapus data"
      );
    } finally {
      setConfirmDelete(false);
      tableRef.current?.reload?.({ resetPage: true });
    }
  };

  // Columns definition for RemoteTable
  const listColumns = [
    {
      key: "Tahun",
      label: "Tahun",
      width: "90px",
      renderKey: (r) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
          {r.Tahun || "-"}
        </span>
      ),
    },
    {
      key: "fakultas_unit",
      label: "Fakultas / Unit",
      width: "180px",
      renderKey: (r) => (
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-900">
          <Building2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
          <span className="line-clamp-2">{r.NamaFakultasUnit || "Unit Terdaftar"}</span>
        </div>
      ),
    },
    {
      key: "kategori",
      label: "Kategori",
      width: "180px",
      minWidth: "180px",
      searchable: true,
      renderKey: (r) => {
        const config = KATEGORI_CONFIG[r.Kategori] || {
          label: r.Kategori,
          short: "?",
          bgBadge: "bg-gray-100 text-gray-700 border-gray-200",
        };
        const Icon = config.icon || PieChart;
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bgBadge}`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span>{config.label}</span>
          </span>
        );
      },
    },
    {
      key: "faktor",
      label: "Faktor & Deskripsi",
      minWidth: "240px",
      searchable: true,
      renderKey: (r) => (
        <div className="space-y-1">
          <div className="text-sm font-semibold text-gray-900">
            {r.Faktor || "-"}
          </div>
          {r.Deskripsi && (
            <div className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
              {r.Deskripsi}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "strategi",
      label: "Strategi Tindak Lanjut",
      minWidth: "220px",
      searchable: true,
      renderKey: (r) => (
        <div className="text-xs text-gray-700 leading-relaxed line-clamp-3">
          {r.Strategi || (
            <span className="text-gray-400 italic">Belum ada strategi</span>
          )}
        </div>
      ),
    },
    {
      key: "penilaian",
      label: "Bobot / Rating / Skor",
      width: "160px",
      renderKey: (r) => (
        <div className="text-xs space-y-0.5">
          <div className="text-gray-600 flex items-center justify-between">
            <span>Bobot:</span>
            <span className="font-semibold text-gray-900">
              {r.Bobot !== null && r.Bobot !== undefined ? r.Bobot : "-"}
            </span>
          </div>
          <div className="text-gray-600 flex items-center justify-between">
            <span>Rating:</span>
            <span className="font-semibold text-gray-900">
              {r.Rating !== null && r.Rating !== undefined ? r.Rating : "-"}
            </span>
          </div>
          <div className="text-purple-700 flex items-center justify-between font-bold pt-0.5 border-t border-gray-150">
            <span>Skor:</span>
            <span>{r.Skor !== null && r.Skor !== undefined ? r.Skor : "-"}</span>
          </div>
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
          icon={PieChart}
          title="Analisis SWOT"
          subtitle="Manajemen analisis Strengths, Weaknesses, Opportunities, dan Threats untuk perencanaan strategis mutu unit"
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
                  ? "Menampilkan seluruh data analisis SWOT universitas. Anda dapat memfilter per fakultas/unit."
                  : `Tabel secara otomatis menampilkan data khusus unit Anda (${
                      userUnitData?.nama || user?.fakultas_unit || "Unit Terdaftar"
                    }).`}
              </p>
            </div>
          </div>

          {/* Filter Controls Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Tahun */}
            <div className="w-44 min-w-[140px]">
              <SearchSelect
                icon={Calendar}
                placeholder="Semua Tahun"
                options={tahunOptions}
                value={selectedTahunObj}
                onChange={(item) => {
                  setSelectedTahunObj(item);
                  setSelectedTahun(item ? String(item.Tahun || item.nama || item.id) : "");
                }}
                className="!py-1.5 !text-xs !rounded-xl !bg-gray-50/80 hover:!bg-white focus:!bg-white !border-gray-200"
              />
            </div>

            {/* Filter Fakultas / Unit (Hanya aktif untuk Admin) */}
            {isAdmin && (
              <div className="w-56 min-w-[180px]">
                <SearchSelect
                  icon={Building2}
                  placeholder="Semua Fakultas/Unit"
                  options={fakultasOptions}
                  value={selectedFakultasObj}
                  onChange={(item) => {
                    setSelectedFakultasObj(item);
                    setSelectedFakultas(item ? String(item.UUID || item.id) : "");
                  }}
                  className="!py-1.5 !text-xs !rounded-xl !bg-gray-50/80 hover:!bg-white focus:!bg-white !border-gray-200"
                />
              </div>
            )}

            {/* Tombol Reset Filter */}
            {(selectedTahun || selectedFakultas || selectedKategori) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTahun("");
                  setSelectedTahunObj(null);
                  setSelectedFakultas("");
                  setSelectedFakultasObj(null);
                  setSelectedKategori("");
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-semibold rounded-lg transition cursor-pointer"
                title="Reset semua filter"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Kuadran Matrix Quick Filter Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(KATEGORI_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            const isSelected = selectedKategori === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setSelectedKategori((prev) => (prev === key ? "" : key))
                }
                className={`p-4 rounded-xl border text-left transition relative cursor-pointer ${
                  isSelected
                    ? `${config.cardBg} ring-2 ring-purple-600 shadow-md`
                    : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      isSelected ? "bg-white/80 shadow-xs" : "bg-gray-100"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${config.iconColor}`} />
                  </div>
                  <span className="text-xl font-extrabold text-gray-300">
                    {config.short}
                  </span>
                </div>
                <div className="text-sm font-bold text-gray-900 leading-tight">
                  {config.label}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {isSelected ? "Filter aktif (klik untuk lepas)" : "Klik untuk filter"}
                </div>
              </button>
            );
          })}
        </div>

        {/* Remote Table Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <RemoteTable
            ref={tableRef}
            endpoint={tableEndpoint}
            mode="paging"
            token={getValidToken()}
            onError={(err) => {
              console.error("TABLE ERROR SWOT:", err);
            }}
            renderAddAction={
              <Tooltip content="Tambah Analisis SWOT">
                <button
                  type="button"
                  className="w-9 h-9 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center transition shadow-xs shrink-0 cursor-pointer"
                  onClick={openNew}
                  aria-label="Tambah Analisis SWOT"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </Tooltip>
            }
            listcolumns={listColumns}
            renderAction={({ row, close }) => (
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:text-amber-700 hover:bg-amber-50/80 rounded-xl transition cursor-pointer text-left group"
                  onClick={() => {
                    openEdit(row);
                    close();
                  }}
                >
                  <Pencil className="w-4 h-4 text-amber-600 shrink-0 group-hover:scale-110 transition-transform" />
                  <span>Edit SWOT</span>
                </button>

                <div className="my-1 border-t border-gray-150" />

                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50/80 rounded-xl transition cursor-pointer text-left group"
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

        {/* Modals */}
        <SwotFormModal
          open={modalOpen}
          mode={modalMode}
          data={selectedRow}
          isAdmin={isAdmin}
          userUnit={userUnitData}
          onClose={() => setModalOpen(false)}
          onSuccess={() => tableRef.current?.reload?.({ resetPage: true })}
        />

        <ConfirmDeleteDialog
          open={confirmDelete}
          title="Hapus Analisis SWOT"
          message={`Apakah Anda yakin ingin menghapus analisis SWOT "${selectedRow?.Faktor || ""}"? Data yang dihapus tidak dapat dikembalikan.`}
          onClose={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
        />
      </div>
    </>
  );
};

export default SwotPage;
