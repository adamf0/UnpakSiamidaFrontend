import RemoteTable from "@/Components/RemoteTable";
import React, { useRef, useState, useEffect } from "react";
import StandarRenstraFormModal from "./StandarRenstraFormModal";
import ConfirmDeleteDialog from "@/Components/ConfirmDeleteDialog";
import { useToast } from "@/Providers/ToastProvider";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import { useContent } from "@/Providers/ContentProvider";
import { Plus, Pencil, Trash2, Award } from "lucide-react";
import Tooltip from "@/Components/Tooltip";
import { useAuth } from "@/Providers/AuthProvider";
import { isEmpty } from "@/Common/Utils";
import PageHeader from "@/Components/PageHeader";

const StandarRenstraPage = () => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const tableRef = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("new");
  const [selectedRow, setSelectedRow] = useState(null);
  const { addToast } = useToast();
  const {getValidToken} = useAuth()

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
    if(isEmpty(getValidToken())) return;

    const res = await fetch(`http://localhost:3000/standarrenstra/${selectedRow.UUID}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getValidToken()}`
      }
    });
    const data = await res.json();
    console.log(data)
    
    if (res.ok){
      addToast("success", "Data berhasil dihapus");
    } else{
      addToast("error", data?.message || "Data tidak ditemukan");
    }

    setConfirmDelete(false);
    tableRef.current?.reload?.({ resetPage: true });
  }

  const {
    level,
    listLevel,
    setLevel,
    openChangeLevel,
    setOpenChangeLevel,
  } = useContent();

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
          icon={Award}
          title="Standar Renstra"
          subtitle="Kelola standar renstra mutu universitas dan kriteria pengukuran"
        />

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <RemoteTable
            ref={tableRef}
            endpoint="http://localhost:3000/standarrenstras"
            mode="paging"
            token={getValidToken()}
            onError={(err) => {
              console.error("TABLE ERROR:", err);
            }}
            renderAddAction={
              <Tooltip content="Tambah Standar Renstra">
                <button 
                  type="button"
                  className="w-9 h-9 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center transition shadow-xs shrink-0" 
                  onClick={()=>openNew()}
                  aria-label="Tambah Standar Renstra"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </Tooltip>
            }
            listcolumns={[
              { key: "Nama", label: "Nama Standar", searchable: true },
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

        <StandarRenstraFormModal
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

export default StandarRenstraPage;
