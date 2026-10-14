import RemoteTable from "@/Components/RemoteTable";
import React, { useRef, useState } from "react";
import MasterTahunFormModal from "./MasterTahunFormModal";
import ConfirmDeleteDialog from "@/Components/ConfirmDeleteDialog";
import { useToast } from "@/Providers/ToastProvider";
import { useContent } from "@/Providers/ContentProvider";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import { Plus, Pencil, Trash2, Calendar } from "lucide-react";
import Tooltip from "@/Components/Tooltip";
import { useAuth } from "@/Providers/AuthProvider";
import { isEmpty } from "@/Common/Utils";
import { apiClient } from "@/Common/api";
import PageHeader from "@/Components/PageHeader";

const MasterTahunPage = () => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const tableRef = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("new");
  const [selectedRow, setSelectedRow] = useState(null);
  const { addToast } = useToast();
  const { getValidToken } = useAuth();

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
      await apiClient.delete(`/tahunproker/${selectedRow.UUID}`);
      addToast("success", "Berhasil hapus data");
    } catch (err) {
      addToast("error", err?.message || "Layanan tidak dapat dihubungi");
    } finally {
      setConfirmDelete(false);
      tableRef.current?.reload?.({ resetPage: true });
    }
  };

  const renderStatus = (row) => {
    const status = String(row.Status || "").toLowerCase();
    const isAktif = status === "aktif";

    return (
      <span
        className={`px-2 py-0.5 text-xs text-white rounded-full ${
          isAktif ? "bg-green-500" : "bg-red-500"
        }`}
      >
        {isAktif ? "Aktif" : row.Status || "Non-Aktif"}
      </span>
    );
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
      <div className="p-4 sm:p-6 bg-gray-50 min-h-screen space-y-4">
        <PageHeader
          icon={Calendar}
          title="Master Tahun"
          subtitle="Kelola data master tahun proker dan status keaktifan periode audit"
        />

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <RemoteTable
            ref={tableRef}
            endpoint="/tahunprokers"
            mode="paging"
            token={getValidToken()}
            onError={(err) => {
              console.error("TABLE ERROR:", err);
            }}
            renderAddAction={
              <Tooltip content="Tambah Master Tahun">
                <button
                  type="button"
                  className="w-9 h-9 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center transition shadow-xs shrink-0"
                  onClick={() => openNew()}
                  aria-label="Tambah Master Tahun"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </Tooltip>
            }
            listcolumns={[
              { key: "Tahun", label: "Tahun", searchable: true },
              {
                key: "Status",
                label: "Status",
                searchable: true,
                renderKey: renderStatus,
              },
            ]}
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

        <MasterTahunFormModal
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

export default MasterTahunPage;
