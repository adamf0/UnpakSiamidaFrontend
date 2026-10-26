import RemoteTable from "@/Components/RemoteTable";
import React, { useMemo, useRef, useState } from "react";
import PelaporanDokumenFormModal from "./PelaporanDokumenFormModal";
import PelaporanDokumenVerifikasiModal from "./PelaporanDokumenVerifikasiModal";
import ConfirmDeleteDialog from "@/Components/ConfirmDeleteDialog";
import { useToast } from "@/Providers/ToastProvider";
import { useContent } from "@/Providers/ContentProvider";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import { Plus, CheckSquare, FileCheck } from "lucide-react";
import Tooltip from "@/Components/Tooltip";
import { useAuth } from "@/Providers/AuthProvider";
import PageHeader from "@/Components/PageHeader";
import {
  isEmpty,
  renderLabelFakultasUnit,
} from "@/Common/Utils";
import { apiClient, API_BASE_URL } from "@/Common/api";

const PelaporanDokumenPage = () => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const tableRef = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("new");
  const [selectedRow, setSelectedRow] = useState(null);
  const [verifikasiOpen, setVerifikasiOpen] = useState(false);

  const { addToast } = useToast();
  const { user, getValidToken } = useAuth();
  const {
    level,
    listLevel,
    setLevel,
    openChangeLevel,
    setOpenChangeLevel,
    positionYear,
  } = useContent();

  const isAdmin = level === "admin" || user?.level === "admin" || user?.Level === "admin";
  const isFakultas = level === "fakultas" || user?.level === "fakultas" || user?.Level === "fakultas";
  const userFakultasUnit = user?.fakultas_unit || user?.FakultasUnit;

  const canManage = !isAdmin && !isFakultas;
  const canVerify = isAdmin || isFakultas;

  const isAuditee =
    level === "auditee" ||
    user?.level === "auditee" ||
    user?.Level === "auditee";

  const auditeeUnit = useMemo(() => {
    if (!isAuditee) return null;
    let userFU = user?.fakultas_unit || user?.id_fakultas_unit || user?.FakultasUnit;
    if (Array.isArray(user?.extra_role)) {
      const match =
        user.extra_role.find(
          (r) =>
            String(r.role ?? r.Role).toLowerCase() === "auditee" &&
            (!positionYear || String(r.tahun ?? r.Tahun) === String(positionYear))
        ) ||
        user.extra_role.find(
          (r) => String(r.role ?? r.Role).toLowerCase() === "auditee"
        );
      if (match?.id_fakultas_unit || match?.IdFakultasUnit) {
        userFU = match.id_fakultas_unit || match.IdFakultasUnit;
      }
    }
    return userFU ? String(userFU) : null;
  }, [isAuditee, user, positionYear]);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams();
    if (isAuditee && auditeeUnit) {
      params.append("target", auditeeUnit);
      params.append("id_fakultas_unit", auditeeUnit);
      params.append("filter_fakultas_unit", auditeeUnit);
    }
    const qs = params.toString();
    return `/pelaporandokumens${qs ? `?${qs}` : ""}`;
  }, [isAuditee, auditeeUnit]);

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

  const openVerifikasi = (row) => {
    setSelectedRow(row);
    setVerifikasiOpen(true);
  };

  const deleteData = async () => {
    if (!selectedRow?.UUID) return;

    try {
      await apiClient.delete(`/pelaporandokumen/${selectedRow.UUID}`);
      addToast("success", "Berhasil hapus data");
    } catch (err) {
      addToast("error", err?.message || "Layanan tidak dapat dihubungi");
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
          icon={FileCheck}
          title="Pelaporan Dokumen"
          subtitle="Kelola unggahan berkas bukti dukung dan dokumen evaluasi program kerja"
        />

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <RemoteTable
            key={`${level}-${auditeeUnit || userFakultasUnit || "all"}`}
            ref={tableRef}
            endpoint={endpoint}
            mode="paging"
            token={getValidToken()}
            onError={(err) => {
              console.error("TABLE ERROR:", err);
            }}
            renderAddAction={
              canManage ? (
                <Tooltip content="Tambah Pelaporan Dokumen">
                  <button
                    type="button"
                    className="w-9 h-9 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center transition shadow-xs shrink-0"
                    onClick={() => openNew()}
                    aria-label="Tambah Pelaporan Dokumen"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </Tooltip>
              ) : null
            }
            listcolumns={[
              {
                key: "Tahun",
                label: "Tahun",
                searchable: true,
                renderKey: (row) => row.Tahun || "-",
              },
              {
                key: "FakultasUnit",
                label: "Fakultas / Prodi / Unit",
                searchable: true,
                renderKey: (row) => renderLabelFakultasUnit(row),
              },
              {
                key: "MataProgram",
                label: "Mata Program",
                searchable: true,
                renderKey: (row) => row.MataProgram || "-",
              },
              {
                key: "JenisDokumen",
                label: "Jenis Dokumen",
                searchable: true,
                renderKey: (row) => row.JenisDokumen || "-",
              },
              {
                key: "File",
                label: "Dokumen",
                searchable: true,
                renderKey: (row) => {
                  if (!row.File) return <span className="text-gray-400">-</span>;
                  const fileUrl = `${API_BASE_URL}/upload/pelaporan_dokumen/${row.File}`;
                  return (
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-600 hover:text-purple-800 underline text-xs font-medium max-w-[200px] truncate block"
                      title={row.File}
                    >
                      {row.File}
                    </a>
                  );
                },
              },
              {
                key: "Status",
                label: "Status",
                searchable: true,
                renderKey: (row) => {
                  const s = (row.Status || "").trim().toLowerCase();
                  if (s === "terverifikasi") {
                    return (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Terverifikasi
                      </span>
                    );
                  }
                  if (s === "gagal_terverifikasi") {
                    return (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Gagal Terverifikasi
                      </span>
                    );
                  }
                  return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Belum Terverifikasi
                    </span>
                  );
                },
              },
              {
                key: "Catatan",
                label: "Catatan",
                searchable: true,
                renderKey: (row) => row.Catatan || "-",
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
                        Verifikasi
                      </button>
                    )}
                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded transition"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRow(row);
                            setConfirmDelete(true);
                          }}
                          className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition"
                        >
                          Hapus
                        </button>
                      </>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </div>

        {canManage && (
          <>
            <PelaporanDokumenFormModal
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
          </>
        )}

        {canVerify && (
          <PelaporanDokumenVerifikasiModal
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

export default PelaporanDokumenPage;
