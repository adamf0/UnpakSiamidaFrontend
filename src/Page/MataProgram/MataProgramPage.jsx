import RemoteTable from "@/Components/RemoteTable";
import React, { useRef, useState } from "react";
import MataProgramFormModal from "./MataProgramFormModal";
import ConfirmDeleteDialog from "@/Components/ConfirmDeleteDialog";
import { useToast } from "@/Providers/ToastProvider";
import { useContent } from "@/Providers/ContentProvider";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import Tooltip from "@/Components/Tooltip";
import { useAuth } from "@/Providers/AuthProvider";
import { renderLabelFakultasUnit } from "@/Common/Utils";
import { apiClient } from "@/Common/api";
import PageHeader from "@/Components/PageHeader";

const MataProgramPage = () => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const tableRef = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("new");
  const [selectedRow, setSelectedRow] = useState(null);
  const { addToast } = useToast();

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
    if (!selectedRow?.UUID) return;

    try {
      await apiClient.delete(`/mataprogram/${selectedRow.UUID}`);
      addToast("success", "Berhasil hapus data");
    } catch (err) {
      addToast(
        "error",
        err?.message || "Layanan tidak dapat dihubungi"
      );
    } finally {
      setConfirmDelete(false);
      tableRef.current?.reload?.({ resetPage: true });
    }
  };

  const { user, getValidToken } = useAuth();
  const {
    level,
    listLevel,
    setLevel,
    openChangeLevel,
    setOpenChangeLevel,
    positionYear,
  } = useContent();

  const curRole = String(
    level || localStorage.getItem("activeLevel") || user?.level || ""
  ).toLowerCase().trim();

  const isAdmin =
    curRole === "admin" ||
    user?.level === "admin" ||
    user?.Level === "admin";

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

  const hasTarget = Boolean(activeUnit);
  const excludedAddRoles = [
    "anggaran",
    "keuangan",
    "evaluator",
    "admin",
    "auditee",
    "auditor1",
    "auditor2",
  ];
  const canAdd = hasTarget && !excludedAddRoles.includes(curRole);
  const canManage = canAdd || isAdmin;

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
      params.append("target", activeUnit);
      params.append("id_fakultas_unit", activeUnit);
      params.append("filter_fakultas_unit", activeUnit);
    }
    const qs = params.toString();
    return `/mataprograms${qs ? `?${qs}` : ""}`;
  }, [isUnrestrictedData, activeUnit, positionYear]);

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
          icon={BookOpen}
          title="Mata Program"
          subtitle="Kelola master mata program kerja dan pengelompokan program"
        />

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <RemoteTable
            key={`${level}-${activeUnit || "all"}-${positionYear || "all"}`}
            ref={tableRef}
            endpoint={endpoint}
            mode="paging"
            token={getValidToken()}
            onError={(err) => {
              console.error("TABLE ERROR:", err);
            }}
            renderAddAction={
              canAdd ? (
                <Tooltip content="Tambah Mata Program">
                  <button
                    type="button"
                    className="w-9 h-9 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center transition shadow-xs shrink-0 cursor-pointer"
                    onClick={() => openNew()}
                    aria-label="Tambah Mata Program"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </Tooltip>
              ) : null
            }
            listcolumns={[
              { key: "Tahun", label: "Tahun", searchable: true },
              {
                key: "FakultasUnit",
                label: "Fakultas / Prodi / Unit",
                searchable: true,
                renderKey: (row) => renderLabelFakultasUnit(row),
              },
              { key: "MataProgram", label: "Mata Program", searchable: true },
            ]}
            renderAction={
              canManage
                ? ({ row, close }) => (
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
                  )
                : undefined
            }
          />
        </div>

        <MataProgramFormModal
          open={modalOpen}
          mode={modalMode}
          data={selectedRow}
          onClose={() => setModalOpen(false)}
          onSuccess={() => tableRef.current?.reload?.({ resetPage: true })}
          defaultYear={positionYear}
          defaultUnit={activeUnit}
          isAdmin={isAdmin}
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

export default MataProgramPage;
