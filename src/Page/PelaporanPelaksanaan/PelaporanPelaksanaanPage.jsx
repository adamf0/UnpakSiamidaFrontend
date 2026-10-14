import RemoteTable from "@/Components/RemoteTable";
import React, { useRef, useState } from "react";
import PelaporanPelaksanaanFormModal from "./PelaporanPelaksanaanFormModal";
import PelaporanPelaksanaanVerifikasiModal from "./PelaporanPelaksanaanVerifikasiModal";
import ConfirmDeleteDialog from "@/Components/ConfirmDeleteDialog";
import { useToast } from "@/Providers/ToastProvider";
import { useContent } from "@/Providers/ContentProvider";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import { CheckSquare, Edit3 } from "lucide-react";
import { useAuth } from "@/Providers/AuthProvider";
import PageHeader from "@/Components/PageHeader";
import {
  formatTanggalIndo,
  isEmpty,
  renderLabelFakultasUnit,
} from "@/Common/Utils";

const isValidDateVal = (val) => {
  if (!val) return false;
  const str = String(val);
  return !str.startsWith("0001-01-01");
};

const PelaporanPelaksanaanPage = () => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const tableRef = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("edit");
  const [selectedRow, setSelectedRow] = useState(null);
  const [verifikasiOpen, setVerifikasiOpen] = useState(false);

  const { addToast } = useToast();
  const { user, getValidToken } = useAuth();
  const { level, listLevel, setLevel, openChangeLevel, setOpenChangeLevel } =
    useContent();

  const isAdmin =
    level === "admin" || user?.level === "admin" || user?.Level === "admin";
  const isFakultas =
    level === "fakultas" || user?.level === "fakultas" || user?.Level === "fakultas";
  const userFakultasUnit = user?.fakultas_unit || user?.FakultasUnit;

  const canManage = !isAdmin && !isFakultas;
  const canVerify = isAdmin || isFakultas;

  const endpoint = "http://localhost:3000/pelaporanpelaksanaans";

  const openLaporkan = (row) => {
    setModalMode("edit");
    setSelectedRow(row);
    setModalOpen(true);
  };

  const openVerifikasi = (row) => {
    setSelectedRow(row);
    setVerifikasiOpen(true);
  };

  const deleteData = async () => {
    if (isEmpty(getValidToken()) || !selectedRow?.UUID) return;

    try {
      const res = await fetch(
        `http://localhost:3000/pelaporanpelaksanaan/${selectedRow.UUID}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${getValidToken()}`,
          },
        }
      );
      const data = await res.json();

      if (res.ok) {
        addToast("success", "Berhasil hapus data");
      } else {
        addToast(
          "error",
          data?.message || data?.Message || "Data tidak ditemukan"
        );
      }
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
          icon={CheckSquare}
          title="Pelaporan Pelaksanaan"
          subtitle="Kelola status dan evaluasi keterlaksanaan aktivitas program kerja"
        />

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <RemoteTable
            key={`${level}-${userFakultasUnit || "all"}`}
            ref={tableRef}
            endpoint={endpoint}
            mode="paging"
            token={getValidToken()}
            onError={(err) => {
              console.error("TABLE ERROR:", err);
            }}
            renderAddAction={null}
            listcolumns={[
              {
                key: "Tahun",
                label: "Tahun",
                searchable: true,
                renderKey: (row) => row.Tahun || "-",
              },
              {
                key: "MataProgram",
                label: "Mata Program",
                searchable: true,
              },
              ...(isAdmin || isFakultas
                ? [
                    {
                      key: "FakultasUnit",
                      label: "Fakultas / Unit",
                      searchable: true,
                      renderKey: (row) => renderLabelFakultasUnit(row),
                    },
                  ]
                : []),
              {
                key: "Aktivitas",
                label: "Aktivitas",
                searchable: true,
              },
              {
                key: "PIC",
                label: "PIC",
                searchable: true,
              },
              {
                key: "StatusRealisasi",
                label: "Status Realisasi",
                searchable: true,
                renderKey: (row) => {
                  const s = (row.StatusRealisasi || "").trim().toLowerCase();
                  if (s === "terlaksana") {
                    return (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Terlaksana
                      </span>
                    );
                  }
                  if (s === "belum_terlaksana") {
                    return (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Belum Terlaksana
                      </span>
                    );
                  }
                  return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Belum Dilaporkan
                    </span>
                  );
                },
              },
              {
                key: "TargetRK",
                label: "Target Rencana Kegiatan",
                searchable: false,
                renderKey: (row) => (
                  <div className="text-xs whitespace-nowrap">
                    <div>{formatTanggalIndo(row.TanggalRKAwal)}</div>
                    <div className="text-gray-400">s/d</div>
                    <div>{formatTanggalIndo(row.TanggalRKAkhir)}</div>
                  </div>
                ),
              },
              {
                key: "TargetRealisasi",
                label: "Target Realisasi",
                searchable: false,
                renderKey: (row) =>
                  isValidDateVal(row.TanggalRAwal) &&
                  isValidDateVal(row.TanggalRAkhir) ? (
                    <div className="text-xs whitespace-nowrap">
                      <div>{formatTanggalIndo(row.TanggalRAwal)}</div>
                      <div className="text-gray-400">s/d</div>
                      <div>{formatTanggalIndo(row.TanggalRAkhir)}</div>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  ),
              },
              {
                key: "Detail",
                label: "Detail Pelaporan",
                searchable: true,
                renderKey: (row) => row.Detail || "-",
              },
              {
                key: "Aksi",
                label: "Aksi",
                searchable: false,
                renderKey: (row) => (
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    {canVerify && (
                      <button
                        type="button"
                        onClick={() => openVerifikasi(row)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition shadow-xs"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        Verifikasi / Detail
                      </button>
                    )}
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => openLaporkan(row)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded transition shadow-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Laporkan Pelaksanaan
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </div>

        {canManage && (
          <>
            <PelaporanPelaksanaanFormModal
              open={modalOpen}
              mode={modalMode}
              data={selectedRow}
              onClose={() => setModalOpen(false)}
              onSuccess={() => tableRef.current?.reload?.({ resetPage: false })}
            />

            <ConfirmDeleteDialog
              open={confirmDelete}
              onClose={() => setConfirmDelete(false)}
              onConfirm={async () => deleteData()}
            />
          </>
        )}

        {canVerify && (
          <PelaporanPelaksanaanVerifikasiModal
            open={verifikasiOpen}
            data={selectedRow}
            onClose={() => setVerifikasiOpen(false)}
            onSuccess={() => tableRef.current?.reload?.({ resetPage: false })}
          />
        )}
      </div>
    </>
  );
};

export default PelaporanPelaksanaanPage;
