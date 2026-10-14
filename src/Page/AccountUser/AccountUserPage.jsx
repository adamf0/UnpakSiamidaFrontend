import RemoteTable from "@/Components/RemoteTable";
import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AccountUserFormModal from "./AccountUserFormModal";
import ConfirmDeleteDialog from "@/Components/ConfirmDeleteDialog";
import { useToast } from "@/Providers/ToastProvider";
import { useContent } from "@/Providers/ContentProvider";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import { Plus, Users, Pencil, Trash2, GitMerge } from "lucide-react";
import Tooltip from "@/Components/Tooltip";
import { useAuth } from "@/Providers/AuthProvider";
import { isEmpty } from "@/Common/Utils";
import PageHeader from "@/Components/PageHeader";

const LEVEL_BADGES = {
  admin: "bg-purple-100 text-purple-800 border-purple-200",
  fakultas: "bg-blue-100 text-blue-800 border-blue-200",
  auditee: "bg-emerald-100 text-emerald-800 border-emerald-200",
  auditor1: "bg-amber-100 text-amber-800 border-amber-200",
  auditor2: "bg-orange-100 text-orange-800 border-orange-200",
  user: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function AccountUserPage() {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const tableRef = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("new");
  const [selectedRow, setSelectedRow] = useState(null);
  const { addToast } = useToast();
  const { getValidToken } = useAuth();

  const {
    level,
    listLevel,
    setLevel,
    openChangeLevel,
    setOpenChangeLevel,
  } = useContent();

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
    const token = await getValidToken();
    if (isEmpty(token) || !selectedRow?.UUID) return;

    try {
      const res = await fetch(
        `http://localhost:3000/user/${selectedRow.UUID}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );
      const data = await res.json().catch(() => null);

      if (res.ok) {
        addToast("success", "Akun user berhasil dihapus");
      } else {
        addToast(
          "error",
          data?.Message || data?.message || data?.error || "Gagal menghapus user"
        );
      }
    } catch (err) {
      console.error("Delete user error:", err);
      addToast("error", "Server tidak dapat dihubungi");
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

      <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Header Card */}
          <PageHeader
            icon={Users}
            title="Account User"
            subtitle="Kelola akun pengguna, hak akses level, dan unit kerja dalam sistem"
          />

          {/* Table Container */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <RemoteTable
              ref={tableRef}
              endpoint="http://localhost:3000/users"
              mode="paging"
              token={getValidToken()}
              onError={(err) => {
                console.error("USER TABLE ERROR:", err);
              }}
              renderAddAction={
                <div className="flex items-center gap-2">
                  <Tooltip content="Merging Data Pengguna">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 border border-indigo-200 rounded-lg text-xs font-semibold shadow-xs transition shrink-0 cursor-pointer"
                      onClick={() => navigate("/users/merge")}
                    >
                      <GitMerge className="w-4 h-4 text-indigo-600" />
                      <span>Merging Data</span>
                    </button>
                  </Tooltip>

                  <Tooltip content="Tambah Akun User">
                    <button
                      type="button"
                      className="w-9 h-9 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center transition shadow-xs shrink-0 cursor-pointer"
                      onClick={openNew}
                      aria-label="Tambah Akun User"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </Tooltip>
                </div>
              }
              listcolumns={[
                {
                  key: "Username",
                  label: "Username / NIDN",
                  searchable: true,
                  renderKey: (row) => (
                    <div className="font-semibold text-gray-900">
                      {row?.Username || row?.nidn_username || "-"}
                    </div>
                  ),
                },
                {
                  key: "Name",
                  label: "Nama Lengkap",
                  searchable: true,
                  renderKey: (row) => (
                    <div>
                      <span className="font-medium text-gray-800">
                        {row?.Name || row?.name || "-"}
                      </span>
                    </div>
                  ),
                },
                {
                  key: "Email",
                  label: "Email",
                  searchable: true,
                  renderKey: (row) => (
                    <span className="text-xs text-gray-600 font-mono">
                      {row?.Email || row?.email || "-"}
                    </span>
                  ),
                },
                {
                  key: "Level",
                  label: "Level Role",
                  searchable: true,
                  renderKey: (row) => {
                    const lvl = String(row?.Level || row?.level || "user").toLowerCase();
                    const badgeClass =
                      LEVEL_BADGES[lvl] || "bg-gray-100 text-gray-700 border-gray-200";
                    return (
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${badgeClass}`}
                      >
                        {lvl}
                      </span>
                    );
                  },
                },
                {
                  key: "NamaFakultasUnit",
                  label: "Fakultas / Unit",
                  searchable: true,
                  renderKey: (row) => {
                    const unitName = row?.NamaFakultasUnit || row?.nama_fak_prod_unit;
                    if (!unitName) {
                      return <span className="text-gray-400 text-xs">-</span>;
                    }
                    return (
                      <span className="inline-block max-w-xs truncate text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 px-2 py-1 rounded">
                        {unitName}
                      </span>
                    );
                  },
                },
                {
                  key: "IdUserMerge",
                  label: "Status Merge",
                  searchable: false,
                  renderKey: (row) => {
                    const mergeId = row?.IdUserMerge || row?.id_user_merge;
                    const mergeName = row?.NamaUserMerge || row?.nama_user_merge;
                    if (mergeId) {
                      return (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 w-fit">
                            <GitMerge className="w-3 h-3 text-indigo-600 shrink-0" />
                            <span>Merged</span>
                          </span>
                          <span
                            className="text-[11px] text-gray-500 truncate max-w-[170px]"
                            title={mergeName ? `Ke: ${mergeName} (#${mergeId})` : `Ke ID #${mergeId}`}
                          >
                            Ke: {mergeName ? mergeName : `#${mergeId}`}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        Primary
                      </span>
                    );
                  },
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
        </div>
      </div>

      {/* FORM MODAL */}
      <AccountUserFormModal
        open={modalOpen}
        mode={modalMode}
        data={selectedRow}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          tableRef.current?.reload?.({ resetPage: false });
        }}
      />

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDeleteDialog
        open={confirmDelete}
        title="Hapus Akun User"
        message={`Apakah Anda yakin ingin menghapus akun user "${
          selectedRow?.Name || selectedRow?.Username || "terpilih"
        }"? Data akun yang dihapus tidak dapat dipulihkan.`}
        onConfirm={deleteData}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}
