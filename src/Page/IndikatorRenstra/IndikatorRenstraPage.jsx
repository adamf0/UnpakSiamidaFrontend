import RemoteTable from "@/Components/RemoteTable";
import React, { useEffect, useMemo, useRef, useState } from "react";
import IndikatorRenstraFormModal from "./IndikatorRenstraFormModal";
import ConfirmDeleteDialog from "@/Components/ConfirmDeleteDialog";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import { useContent } from "@/Providers/ContentProvider";
import {
  Plus,
  Pencil,
  Trash2,
  Target,
  Building2,
  Calendar,
  Layers,
  RotateCcw,
} from "lucide-react";
import Tooltip from "@/Components/Tooltip";
import { useAuth } from "@/Providers/AuthProvider";
import { useToast } from "@/Providers/ToastProvider";
import { isEmpty } from "@/Common/Utils";
import { apiClient } from "@/Common/api";
import PageHeader from "@/Components/PageHeader";
import SearchSelect from "@/Components/SearchSelect";

const IndikatorRenstraPage = () => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const tableRef = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("new");
  const [selectedRow, setSelectedRow] = useState(null);
  const { getValidToken, user } = useAuth();
  const { addToast } = useToast();
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
  const [selectedStandar, setSelectedStandar] = useState("");
  const [selectedStandarObj, setSelectedStandarObj] = useState(null);

  // Options Lists
  const [tahunList, setTahunList] = useState([]);
  const [standarList, setStandarList] = useState([]);

  // Fetch filter metadata (Tahun & Standar)
  useEffect(() => {
    const fetchFilterMetadata = async () => {
      try {
        // 1. Fetch Tahun
        let years = [];
        try {
          const res = await apiClient.get("/tahunrenstras?mode=all");
          const data = res?.data ?? res;
          if (Array.isArray(data) && data.length > 0) {
            years = data;
          }
        } catch (e) {
          console.warn("Gagal fetch tahunrenstras:", e);
        }

        if (years.length === 0) {
          try {
            const res = await apiClient.get("/tahunprokers?mode=all");
            const data = res?.data ?? res;
            if (Array.isArray(data)) {
              years = data;
            }
          } catch (e) {
            console.warn("Gagal fetch tahunprokers:", e);
          }
        }

        // Deduplicate & sort descending
        const uniqueYears = [];
        const seen = new Set();
        for (const item of years) {
          const y = String(item.Tahun || item.tahun || "").trim();
          if (y && !seen.has(y)) {
            seen.add(y);
            uniqueYears.push({
              id: item.UUID || item.id || y,
              Tahun: y,
              nama: y,
              ...item,
            });
          }
        }
        uniqueYears.sort((a, b) => Number(b.Tahun) - Number(a.Tahun));
        setTahunList(uniqueYears);

        // 2. Fetch Standar Renstra
        const resStandar = await apiClient.get("/standarrenstras?mode=all");
        const dataStandar = resStandar?.data ?? resStandar;
        const list = Array.isArray(dataStandar) ? dataStandar : [];
        const mappedStandar = list.map((s) => ({
          id: s.UUID || s.Uuid || s.id,
          UUID: s.UUID || s.Uuid,
          nama: s.Nama || s.nama || "",
          ...s,
        }));
        setStandarList(mappedStandar);
      } catch (err) {
        console.error("Gagal mengambil metadata filter indikator renstra:", err);
      }
    };

    fetchFilterMetadata();
  }, []);

  // Dynamic RemoteTable Endpoint
  const tableEndpoint = useMemo(() => {
    const filterParts = [];
    if (selectedTahun && selectedTahun !== "all") {
      filterParts.push(`tahun:eq:${selectedTahun}`);
    }
    if (selectedStandar && selectedStandar !== "all") {
      filterParts.push(`standar:like:${selectedStandar}`);
    }

    if (filterParts.length > 0) {
      return `/indikatorrenstras?filters=${encodeURIComponent(
        filterParts.join(";")
      )}`;
    }
    return "/indikatorrenstras";
  }, [selectedTahun, selectedStandar]);

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

  const deleteData = async () => {
    if (!selectedRow?.Uuid) return;

    try {
      await apiClient.delete(`/indikatorrenstra/${selectedRow.Uuid}`);
      addToast("success", "Data berhasil dihapus");
    } catch (err) {
      addToast(
        "error",
        `Layanan tidak dapat dihubungi (${err?.message || "Network Error"})`
      );
    } finally {
      setConfirmDelete(false);
      tableRef.current?.reload?.({ resetPage: true });
    }
  };

  // Columns definition (Tahun dan Standar dihapus search-nya dari header tabel)
  const listcolumns = [
    { key: "Tahun", label: "Tahun", width: "90px" },
    { key: "Standar", label: "Nama Standar", width: "240px" },
    {
      key: "Indikator",
      label: "Nama Indikator",
      searchable: true,
    },
    {
      key: "TipeTarget",
      label: "Tipe Target",
      searchable: true,
      renderKey: (row) => {
        if (!row?.TipeTarget && !row?.Operator) {
          return <span className="text-gray-400">-</span>;
        }
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="capitalize font-medium text-gray-800">
              {row.TipeTarget || "-"}
            </span>
            {row.Operator && (
              <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-xs font-mono font-semibold">
                {row.Operator}
              </span>
            )}
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
              setLevel(val);
              setOpenChangeLevel(false);
            }}
          />
        )}
      />
      <div className="p-4 sm:p-6 bg-gray-50 min-h-screen space-y-4">
        <PageHeader
          icon={Target}
          title="Indikator Renstra"
          subtitle="Kelola indikator kinerja, target capaian, dan operator penilaian renstra"
        />

        {/* Status Role & Filter Scoping Notification Banner */}
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
                Menampilkan seluruh data indikator renstra universitas. Anda dapat memfilter per tahun dan nama standar.
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
                options={tahunList}
                value={selectedTahunObj}
                onChange={(item) => {
                  setSelectedTahunObj(item);
                  setSelectedTahun(
                    item ? String(item.Tahun || item.nama || item.id) : ""
                  );
                }}
                className="!py-1.5 !text-xs !rounded-xl !bg-gray-50/80 hover:!bg-white focus:!bg-white !border-gray-200"
              />
            </div>

            {/* Filter Nama Standar */}
            <div className="w-64 min-w-[200px]">
              <SearchSelect
                icon={Layers}
                placeholder="Semua Standar"
                options={standarList}
                value={selectedStandarObj}
                onChange={(item) => {
                  setSelectedStandarObj(item);
                  setSelectedStandar(
                    item ? String(item.nama || item.Nama || "") : ""
                  );
                }}
                className="!py-1.5 !text-xs !rounded-xl !bg-gray-50/80 hover:!bg-white focus:!bg-white !border-gray-200"
              />
            </div>

            {/* Tombol Reset Filter */}
            {(selectedTahun || selectedStandar) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTahun("");
                  setSelectedTahunObj(null);
                  setSelectedStandar("");
                  setSelectedStandarObj(null);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-semibold rounded-lg transition cursor-pointer"
                title="Reset filter"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <RemoteTable
            ref={tableRef}
            endpoint={tableEndpoint}
            mode="sse"
            token={getValidToken()}
            onError={(err) => {
              console.error("TABLE ERROR:", err);
            }}
            renderAddAction={
              <Tooltip content="Tambah Indikator Renstra">
                <button
                  type="button"
                  className="w-9 h-9 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center transition shadow-xs shrink-0 cursor-pointer"
                  onClick={() => openNew()}
                  aria-label="Tambah Indikator Renstra"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </Tooltip>
            }
            listcolumns={listcolumns}
            renderAction={({ row, close }) => (
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:text-amber-700 hover:bg-amber-50/80 rounded-xl transition-all cursor-pointer text-left group"
                  onClick={() => {
                    openEdit(row);
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

        <IndikatorRenstraFormModal
          open={modalOpen}
          mode={modalMode}
          data={selectedRow}
          onClose={() => setModalOpen(false)}
          onSuccess={() => tableRef.current?.reload?.({ resetPage: true })}
        />

        <ConfirmDeleteDialog
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => deleteData()}
        />
      </div>
    </>
  );
};

export default IndikatorRenstraPage;
