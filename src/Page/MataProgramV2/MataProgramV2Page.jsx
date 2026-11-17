import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import RemoteTable from "@/Components/RemoteTable";
import ConfirmDeleteDialog from "@/Components/ConfirmDeleteDialog";
import { useToast } from "@/Providers/ToastProvider";
import { useContent } from "@/Providers/ContentProvider";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import { Plus, Pencil, Trash2, Layers, X, RotateCcw, Archive } from "lucide-react";
import { useAuth } from "@/Providers/AuthProvider";
import { renderLabelFakultasUnit } from "@/Common/Utils";
import { apiClient } from "@/Common/api";
import PageHeader from "@/Components/PageHeader";
import MataProgramV2EditModal from "./MataProgramV2EditModal";

export default function MataProgramV2Page() {
  const navigate = useNavigate();
  const tableRef = useRef(null);
  const { addToast } = useToast();
  const { getValidToken, user } = useAuth();
  const {
    level,
    listLevel,
    setLevel,
    openChangeLevel,
    setOpenChangeLevel,
    positionYear,
  } = useContent();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeleteUnit, setConfirmDeleteUnit] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [showDeleted, setShowDeleted] = useState(false);

  const curRole = String(
    level || localStorage.getItem("activeLevel") || user?.level || ""
  ).toLowerCase().trim();

  const isAdmin =
    curRole === "admin" ||
    user?.level === "admin" ||
    user?.Level === "admin";

  React.useEffect(() => {
    if (!isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, navigate]);

  const activeUnit = React.useMemo(() => {
    let userFU = user?.fakultas_unit || user?.id_fakultas_unit || user?.FakultasUnit;
    if (Array.isArray(user?.extra_role)) {
      const match =
        user.extra_role.find(
          (r) =>
            String(r.role || "").toLowerCase() === "user" &&
            (!positionYear || String(r.tahun ?? r.Tahun) === String(positionYear)) &&
            (r.id_fakultas_unit || r.IdFakultasUnit)
        ) ||
        user.extra_role.find(
          (r) =>
            String(r.role || "").toLowerCase() === "user" &&
            (r.id_fakultas_unit || r.IdFakultasUnit)
        );
      if (match?.id_fakultas_unit || match?.IdFakultasUnit) {
        userFU = match.id_fakultas_unit || match.IdFakultasUnit;
      }
    }
    const fuStr = String(userFU ?? "").trim();
    if (!fuStr || fuStr === "0" || fuStr === "null" || fuStr === "undefined") return null;
    return fuStr;
  }, [user, positionYear]);

  const isUnrestrictedData =
    curRole === "anggaran" ||
    curRole === "keuangan" ||
    curRole === "evaluator" ||
    curRole === "admin";

  const endpoint = React.useMemo(() => {
    const params = new URLSearchParams();
    if (positionYear && positionYear !== "all") {
      params.append("filter_tahun", String(positionYear));
      params.append("tahun", String(positionYear));
    }
    if (!isUnrestrictedData && activeUnit) {
      params.append("id_fakultas_unit", activeUnit);
      params.append("filter_fakultas_unit", activeUnit);
    }
    if (showDeleted) {
      params.append("show_deleted", "true");
    }
    const qs = params.toString();
    return `/mataprogramv2s${qs ? `?${qs}` : ""}`;
  }, [positionYear, isUnrestrictedData, activeUnit, showDeleted]);

  // Soft delete all unit assignments in this group
  const handleDelete = async () => {
    if (!selectedRow?.UUID && !selectedRow?.uuid) return;
    try {
      await apiClient.delete(
        `/mataprogramv2/${selectedRow.UUID || selectedRow.uuid}?scope=group`
      );
      addToast("success", "Berhasil menghapus mata program v2 (soft delete)");
    } catch (err) {
      console.error("Hapus gagal:", err);
      addToast("error", err?.message || "Gagal menghapus data");
    } finally {
      setConfirmDelete(false);
      tableRef.current?.reload?.({ resetPage: true });
    }
  };

  // Soft delete a single unit from the badge
  const handleRemoveSingleUnit = (unit, row) => {
    setUnitToDelete({ unit, row });
    setConfirmDeleteUnit(true);
  };

  const handleConfirmRemoveUnit = async () => {
    if (!unitToDelete?.unit?.UUID) return;
    try {
      await apiClient.delete(
        `/mataprogramv2/${unitToDelete.unit.UUID}?scope=single`
      );
      addToast(
        "success",
        `Berhasil menghapus unit ${unitToDelete.unit.FakultasUnit || ""} dari program kerja`
      );
    } catch (err) {
      console.error("Hapus unit gagal:", err);
      addToast("error", err?.message || "Gagal menghapus unit");
    } finally {
      setConfirmDeleteUnit(false);
      setUnitToDelete(null);
      tableRef.current?.reload?.();
    }
  };

  // Restore a single unit badge (softdelete = null)
  const handleRestoreSingleUnit = async (unit, row) => {
    if (!unit?.UUID) return;
    try {
      await apiClient.post(`/mataprogramv2/${unit.UUID}/restore?scope=single`);
      addToast(
        "success",
        `Berhasil memulihkan unit ${unit.FakultasUnit || ""} ke daftar aktif`
      );
      tableRef.current?.reload?.();
    } catch (err) {
      console.error("Restore unit gagal:", err);
      addToast("error", err?.message || "Gagal memulihkan unit");
    }
  };

  // Restore all units in a group
  const handleRestoreGroup = async (row) => {
    const targetUuid = row?.UUID || row?.uuid;
    if (!targetUuid) return;
    try {
      await apiClient.post(`/mataprogramv2/${targetUuid}/restore?scope=group`);
      addToast(
        "success",
        `Berhasil memulihkan semua unit pada program "${row.MataProgram || ""}"`
      );
      tableRef.current?.reload?.({ resetPage: true });
    } catch (err) {
      console.error("Restore group gagal:", err);
      addToast("error", err?.message || "Gagal memulihkan mata program");
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
          icon={Layers}
          title="Mata Program"
          subtitle="Kelola master mata program kerja per fakultas / prodi / unit kerja"
        />

        {showDeleted && (
          <div className="px-4 py-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-800">
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                Menampilkan <strong>data mata program yang di-softdelete</strong>. Klik tombol pulihkan pada badge untuk restore per-unit, atau menu aksi untuk restore seluruh unit program.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleted(false)}
              className="text-rose-900 font-semibold underline hover:text-rose-950 cursor-pointer ml-3 shrink-0"
            >
              Kembali ke Data Aktif
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <RemoteTable
            key={`${level}-${activeUnit || "all"}-${positionYear || "all"}-${showDeleted ? "deleted" : "active"}`}
            ref={tableRef}
            endpoint={endpoint}
            mode="paging"
            forceShowActions={true}
            token={getValidToken()}
            onError={(err) => {
              console.error("MATA PROGRAM V2 TABLE ERROR:", err);
            }}
            renderAddAction={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-semibold shadow-2xs transition shrink-0 cursor-pointer border ${
                    showDeleted
                      ? "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                  onClick={() => setShowDeleted((prev) => !prev)}
                  title={showDeleted ? "Kembali ke data mata program aktif" : "Lihat data mata program yang terhapus"}
                >
                  {showDeleted ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                      <span>Kembali ke Data Aktif</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>Show Deleted</span>
                    </>
                  )}
                </button>

                {isAdmin && !showDeleted && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition shrink-0 cursor-pointer"
                    onClick={() => navigate("/mata_programv3/new")}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Mata Program</span>
                  </button>
                )}
              </div>
            }
            listcolumns={[
              { key: "Tahun", label: "Tahun", searchable: true, width: "w-24 text-center" },
              { key: "MataProgram", label: "Nama Program Kerja", searchable: true, width: "w-64" },
              {
                key: "FakultasUnit",
                label: "Fakultas / Prodi / Unit",
                searchable: true,
                renderKey: (row) => {
                  const units = Array.isArray(row.Units) ? row.Units : [];
                  if (units.length === 0) {
                    return renderLabelFakultasUnit(row);
                  }

                  return (
                    <div className="flex flex-wrap items-center gap-1.5 py-1">
                      {units.map((u) => {
                        const rawType = String(u.Type || "").toLowerCase().trim();
                        let badgeStyle = "bg-purple-50 text-purple-700 border-purple-200";
                        if (rawType === "fakultas") {
                          badgeStyle = "bg-indigo-50 text-indigo-700 border-indigo-200";
                        } else if (rawType === "unit" || rawType.includes("lembaga")) {
                          badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
                        }

                        if (showDeleted) {
                          badgeStyle = "bg-rose-50/60 text-gray-700 border-rose-200";
                        }

                        const hasProker = (u.ProkerCount || 0) > 0;

                        return (
                          <span
                            key={u.UUID || u.Id}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border shadow-2xs transition-all ${badgeStyle}`}
                            title={`${u.FakultasUnit} (${u.ProkerCount || 0} Matrix Proker)${showDeleted ? " - Terhapus" : ""}`}
                          >
                            <span>{u.FakultasUnit}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold border transition ${
                                showDeleted
                                  ? "bg-rose-100 text-rose-800 border-rose-200"
                                  : hasProker
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                  : "bg-gray-100 text-gray-500 border-gray-200"
                              }`}
                            >
                              {showDeleted ? "Terhapus" : `${u.ProkerCount || 0} proker`}
                            </span>

                            {isAdmin && (
                              showDeleted ? (
                                <button
                                  type="button"
                                  title={`Pulihkan ${u.FakultasUnit} (restore)`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRestoreSingleUnit(u, row);
                                  }}
                                  className="ml-1 p-0.5 rounded text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900 transition cursor-pointer"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={hasProker}
                                  title={
                                    hasProker
                                      ? `Tidak dapat dihapus karena sudah ada ${u.ProkerCount} matrix proker terhubung`
                                      : `Hapus ${u.FakultasUnit} dari program ini`
                                  }
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveSingleUnit(u, row);
                                  }}
                                  className={`ml-0.5 p-0.5 rounded transition ${
                                    hasProker
                                      ? "opacity-30 cursor-not-allowed text-gray-400"
                                      : "hover:bg-rose-100 hover:text-rose-700 text-gray-400 cursor-pointer"
                                  }`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )
                            )}
                          </span>
                        );
                      })}
                    </div>
                  );
                },
              },
            ]}
            renderAction={({ row, close }) => (
              <div className="flex flex-col gap-0.5">
                {showDeleted ? (
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl transition-all cursor-pointer text-left group"
                    onClick={() => {
                      handleRestoreGroup(row);
                      close();
                    }}
                  >
                    <RotateCcw className="w-4 h-4 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
                    <span>Pulihkan Semua Unit</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:text-amber-700 hover:bg-amber-50/80 rounded-xl transition-all cursor-pointer text-left group"
                      onClick={() => {
                        setSelectedRow(row);
                        setEditModalOpen(true);
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
                  </>
                )}
              </div>
            )}
          />
        </div>

        <MataProgramV2EditModal
          open={editModalOpen}
          data={selectedRow}
          onClose={() => setEditModalOpen(false)}
          onSuccess={() => tableRef.current?.reload?.({ resetPage: true })}
        />

        <ConfirmDeleteDialog
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
        />

        <ConfirmDeleteDialog
          open={confirmDeleteUnit}
          onClose={() => {
            setConfirmDeleteUnit(false);
            setUnitToDelete(null);
          }}
          onConfirm={handleConfirmRemoveUnit}
        />
      </div>
    </>
  );
}
